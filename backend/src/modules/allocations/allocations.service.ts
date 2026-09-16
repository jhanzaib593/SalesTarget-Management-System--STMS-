import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetStatus, RoleType, Prisma } from '@prisma/client';

export interface ChildAllocationInput {
  employeeId: string;
  quantity: number;
  brandBreakdown?: {
    brandId: string;
    quantity: number;
  }[];
}

@Injectable()
export class AllocationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const allocation = await this.prisma.targetAllocation.findUnique({
      where: { id },
      include: {
        plan: {
          include: {
            period: true,
            division: true,
          },
        },
        employee: {
          include: {
            role: true,
            parent: { include: { role: true } },
            region: true,
            territory: true,
          },
        },
        brand: true,
        product: true,
        children: {
          include: {
            employee: {
              include: {
                role: true,
                region: true,
                territory: true,
              },
            },
            brand: true,
            children: {
              include: {
                brand: true,
              },
            },
          },
        },
        parent: {
          include: {
            employee: { include: { role: true } },
            brand: true,
          },
        },
      },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation with ID ${id} not found`);
    }

    return allocation;
  }

  async getAllocationWorkbench(employeeId: string, targetPlanId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: true,
        children: {
          include: {
            role: true,
            region: true,
            territory: true,
          },
          orderBy: { employeeCode: 'asc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    // Find the latest active target plan if not specified
    let planId = targetPlanId;
    if (!planId) {
      const latestPlan = await this.prisma.targetPlan.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!latestPlan) {
        return {
          employee,
          allocation: null,
          directChildren: [],
          parentAllocation: null,
          brandBreakdown: [],
          message: 'No target plans found',
        };
      }
      planId = latestPlan.id;
    }

    // Find this employee's main allocation for the plan
    const myAllocation = await this.prisma.targetAllocation.findFirst({
      where: {
        targetPlanId: planId,
        employeeId: employee.id,
        brandId: null, // Volume allocation
      },
      include: {
        plan: {
          include: { period: true },
        },
        parent: {
          include: {
            employee: { include: { role: true } },
          },
        },
      },
    });

    if (!myAllocation) {
      return {
        employee,
        allocation: null,
        totalTarget: 0,
        allocatedToChildren: 0,
        remainingToAllocate: 0,
        completionPercentage: 0,
        myBrandBreakdown: [],
        childrenTable: employee.children.map((c) => ({
          childEmployee: c,
          allocationId: null,
          quantity: 0,
          status: TargetStatus.DRAFT,
          brandBreakdown: [],
        })),
        parentAllocation: null,
        message: 'No target allocated to this employee for this period yet',
      };
    }

    // Fetch this employee's brand breakdown (allocations where employeeId = employee.id and brandId != null and parentAllocationId = myAllocation.id)
    const myBrandAllocations = await this.prisma.targetAllocation.findMany({
      where: {
        targetPlanId: planId,
        employeeId: employee.id,
        parentAllocationId: myAllocation.id,
        brandId: { not: null },
      },
      include: {
        brand: true,
      },
    });

    // Fetch allocations made to direct children (where parentAllocationId = myAllocation.id and employeeId in children.id)
    const childrenAllocations = await this.prisma.targetAllocation.findMany({
      where: {
        targetPlanId: planId,
        parentAllocationId: myAllocation.id,
        brandId: null, // Main child volume allocation
        employeeId: {
          in: employee.children.map((c) => c.id),
        },
      },
      include: {
        employee: {
          include: { role: true, region: true, territory: true },
        },
        children: {
          where: { brandId: { not: null } },
          include: { brand: true },
        },
      },
      orderBy: { employee: { employeeCode: 'asc' } },
    });

    // Combine all direct subordinate employees with their current allocation state (or default 0)
    const childRows = employee.children.map((child) => {
      const existingAlloc = childrenAllocations.find((ca) => ca.employeeId === child.id);
      return {
        childEmployee: child,
        allocationId: existingAlloc?.id || null,
        quantity: existingAlloc ? Number(existingAlloc.quantity) : 0,
        status: existingAlloc?.status || TargetStatus.DRAFT,
        brandBreakdown: existingAlloc?.children.map((bc) => ({
          allocationId: bc.id,
          brandId: bc.brandId,
          brandCode: bc.brand?.code,
          brandName: bc.brand?.name,
          color: bc.brand?.color,
          quantity: Number(bc.quantity),
        })) || [],
      };
    });

    // Aggregations
    const myTargetQty = Number(myAllocation.quantity);
    const allocatedToChildren = childRows.reduce((sum, r) => sum + r.quantity, 0);
    const remainingToAllocate = Math.max(0, myTargetQty - allocatedToChildren);
    const completionPercentage = myTargetQty > 0 ? Math.min(100, Math.round((allocatedToChildren / myTargetQty) * 100)) : 0;

    return {
      employee,
      allocation: myAllocation,
      totalTarget: myTargetQty,
      allocatedToChildren,
      remainingToAllocate,
      completionPercentage,
      myBrandBreakdown: myBrandAllocations.map((b) => ({
        brandId: b.brandId,
        brandCode: b.brand?.code,
        brandName: b.brand?.name,
        color: b.brand?.color,
        quantity: Number(b.quantity),
      })),
      childrenTable: childRows,
    };
  }

  async allocateToChildren(
    parentAllocationId: string,
    childrenData: ChildAllocationInput[],
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock and fetch parent allocation
      const parentAlloc = await tx.targetAllocation.findUnique({
        where: { id: parentAllocationId },
        include: {
          employee: {
            include: {
              role: true,
              children: true,
            },
          },
          plan: true,
        },
      });

      if (!parentAlloc) {
        throw new NotFoundException(`Parent allocation ${parentAllocationId} not found`);
      }

      if (parentAlloc.status === TargetStatus.FINALIZED) {
        throw new BadRequestException('Target allocation is already finalized and cannot be modified directly.');
      }

      // 2. Fetch parent's brand breakdown
      const parentBrands = await tx.targetAllocation.findMany({
        where: {
          targetPlanId: parentAlloc.targetPlanId,
          employeeId: parentAlloc.employeeId,
          parentAllocationId: parentAlloc.id,
          brandId: { not: null },
        },
        include: { brand: true },
      });

      const parentTarget = Number(parentAlloc.quantity);
      const childTotalSum = childrenData.reduce((sum, c) => sum + Number(c.quantity || 0), 0);

      // 3. CRITICAL VALIDATION 1: Total Volume Conservation
      if (childTotalSum > parentTarget) {
        const excess = childTotalSum - parentTarget;
        throw new BadRequestException(
          `Allocation exceeds the available parent target by ${excess.toLocaleString()} ${parentAlloc.unit}. (Parent Target: ${parentTarget.toLocaleString()}, Children Total: ${childTotalSum.toLocaleString()})`,
        );
      }

      // 4. CRITICAL VALIDATION 2: Brand-Wise Conservation (if parent has brand quotas)
      if (parentBrands.length > 0) {
        const brandTotals = new Map<string, number>();

        for (const child of childrenData) {
          if (child.brandBreakdown && child.brandBreakdown.length > 0) {
            // Check individual child brand sum vs child total
            const childBrandSum = child.brandBreakdown.reduce((s, b) => s + Number(b.quantity || 0), 0);
            if (childBrandSum > child.quantity) {
              throw new BadRequestException(
                `Brand allocations for employee (${childBrandSum.toLocaleString()}) exceed employee total target (${child.quantity.toLocaleString()}).`,
              );
            }

            for (const b of child.brandBreakdown) {
              const current = brandTotals.get(b.brandId) || 0;
              brandTotals.set(b.brandId, current + Number(b.quantity || 0));
            }
          }
        }

        // Validate each brand against parent quota
        for (const pb of parentBrands) {
          if (!pb.brandId) continue;
          const assignedBrandSum = brandTotals.get(pb.brandId) || 0;
          const parentBrandQty = Number(pb.quantity);

          if (assignedBrandSum > parentBrandQty) {
            const excess = assignedBrandSum - parentBrandQty;
            const brandName = pb.brand?.name || 'Brand';
            throw new BadRequestException(
              `${brandName} allocation exceeds the parent target by ${excess.toLocaleString()} ${parentAlloc.unit}. (Parent Brand Target: ${parentBrandQty.toLocaleString()}, Child Allocations: ${assignedBrandSum.toLocaleString()})`,
            );
          }
        }
      }

      // 5. Verify all children are direct subordinates of parent
      const validChildIds = new Set(parentAlloc.employee.children.map((c) => c.id));
      for (const child of childrenData) {
        if (!validChildIds.has(child.employeeId)) {
          throw new ForbiddenException(
            `Employee ${child.employeeId} is not a direct subordinate of ${parentAlloc.employee.name}`,
          );
        }
      }

      // 6. Persist child allocations
      const savedAllocations: any[] = [];

      for (const child of childrenData) {
        // Upsert child main allocation
        let childAlloc = await tx.targetAllocation.findFirst({
          where: {
            targetPlanId: parentAlloc.targetPlanId,
            parentAllocationId: parentAlloc.id,
            employeeId: child.employeeId,
            brandId: null,
          },
        });

        if (childAlloc) {
          childAlloc = await tx.targetAllocation.update({
            where: { id: childAlloc.id },
            data: {
              quantity: new Prisma.Decimal(child.quantity),
              status: TargetStatus.IN_PROGRESS,
            },
          });
        } else {
          childAlloc = await tx.targetAllocation.create({
            data: {
              targetPlanId: parentAlloc.targetPlanId,
              parentAllocationId: parentAlloc.id,
              employeeId: child.employeeId,
              quantity: new Prisma.Decimal(child.quantity),
              unit: parentAlloc.unit,
              status: TargetStatus.IN_PROGRESS,
              createdBy: userId,
            },
          });
        }

        // Handle brand breakdown for this child
        if (child.brandBreakdown && child.brandBreakdown.length > 0) {
          // Delete existing brand breakdown for this child
          await tx.targetAllocation.deleteMany({
            where: {
              targetPlanId: parentAlloc.targetPlanId,
              parentAllocationId: childAlloc.id,
              employeeId: child.employeeId,
              brandId: { not: null },
            },
          });

          // Insert new brand rows
          for (const b of child.brandBreakdown) {
            await tx.targetAllocation.create({
              data: {
                targetPlanId: parentAlloc.targetPlanId,
                parentAllocationId: childAlloc.id,
                employeeId: child.employeeId,
                brandId: b.brandId,
                quantity: new Prisma.Decimal(b.quantity),
                unit: parentAlloc.unit,
                status: TargetStatus.IN_PROGRESS,
                createdBy: userId,
              },
            });
          }
        }

        savedAllocations.push(childAlloc);
      }

      // 7. Update parent allocation status to IN_PROGRESS
      await tx.targetAllocation.update({
        where: { id: parentAlloc.id },
        data: { status: TargetStatus.IN_PROGRESS },
      });

      // 8. Create Immutable Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TARGET_ALLOCATED_TO_CHILDREN',
          entityType: 'TargetAllocation',
          entityId: parentAlloc.id,
          newValues: {
            parentEmployee: parentAlloc.employee.name,
            totalAllocated: childTotalSum,
            childrenCount: childrenData.length,
          },
        },
      });

      return {
        message: 'Allocations updated successfully',
        parentTarget,
        allocatedSum: childTotalSum,
        remaining: parentTarget - childTotalSum,
        allocations: savedAllocations,
      };
    });
  }

  async submitAllocation(allocationId: string, userId: string, comments?: string) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.targetAllocation.findUnique({
        where: { id: allocationId },
        include: {
          employee: {
            include: {
              role: true,
              parent: true,
            },
          },
          children: true,
          plan: true,
        },
      });

      if (!allocation) {
        throw new NotFoundException(`Allocation ${allocationId} not found`);
      }

      // Check if user has allocated 100% of their target before submitting (or allow partial with warning)
      const childAllocations = await tx.targetAllocation.findMany({
        where: {
          parentAllocationId: allocation.id,
          brandId: null,
        },
      });

      const childSum = childAllocations.reduce((s, c) => s + Number(c.quantity), 0);
      const parentTarget = Number(allocation.quantity);

      if (childAllocations.length > 0 && childSum > parentTarget) {
        throw new BadRequestException(
          `Cannot submit: Child allocations (${childSum.toLocaleString()}) exceed target (${parentTarget.toLocaleString()})`,
        );
      }

      // Update status to SUBMITTED
      const updated = await tx.targetAllocation.update({
        where: { id: allocationId },
        data: { status: TargetStatus.SUBMITTED },
      });

      // Create Approval Request for managerial review
      let reviewerUserId: string | null = null;
      if (allocation.employee.parent) {
        const parentUser = await tx.user.findFirst({
          where: { employeeId: allocation.employee.parent.id },
        });
        reviewerUserId = parentUser?.id || null;
      }

      await tx.approvalRequest.create({
        data: {
          targetPlanId: allocation.targetPlanId,
          allocationId: allocation.id,
          submittedBy: userId,
          submittedTo: reviewerUserId,
          level: allocation.employee.role.name,
          status: 'PENDING',
          comments: comments || `Allocation submitted by ${allocation.employee.name}`,
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TARGET_SUBMITTED_FOR_APPROVAL',
          entityType: 'TargetAllocation',
          entityId: allocation.id,
          newValues: {
            employee: allocation.employee.name,
            role: allocation.employee.role.name,
            quantity: parentTarget,
          },
        },
      });

      return {
        message: 'Target allocation submitted successfully for approval',
        allocation: updated,
      };
    });
  }
}

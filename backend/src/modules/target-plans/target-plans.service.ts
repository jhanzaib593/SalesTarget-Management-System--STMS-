import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetStatus, RoleType, Prisma } from '@prisma/client';

@Injectable()
export class TargetPlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { targetPeriodId?: string; status?: TargetStatus }) {
    const where: any = {};
    if (params?.targetPeriodId) where.targetPeriodId = params.targetPeriodId;
    if (params?.status) where.status = params.status;

    const plans = await this.prisma.targetPlan.findMany({
      where,
      include: {
        period: true,
        division: true,
        region: true,
        _count: { select: { allocations: true, versions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate aggregated stats for each plan
    const plansWithStats = await Promise.all(
      plans.map(async (p) => {
        // Find top-level RSM allocations (parentAllocationId is null)
        const topAllocations = await this.prisma.targetAllocation.findMany({
          where: {
            targetPlanId: p.id,
            parentAllocationId: null,
            brandId: null, // Total volume allocation
          },
        });

        const allocatedSum = topAllocations.reduce((sum, a) => sum + Number(a.quantity), 0);
        const totalTarget = Number(p.totalTarget);
        const remaining = Math.max(0, totalTarget - allocatedSum);
        const completionPercentage = totalTarget > 0 ? Math.min(100, Math.round((allocatedSum / totalTarget) * 100)) : 0;

        return {
          ...p,
          allocatedSum,
          remaining,
          completionPercentage,
          rsmCount: topAllocations.length,
        };
      }),
    );

    return plansWithStats;
  }

  async findOne(id: string) {
    const plan = await this.prisma.targetPlan.findUnique({
      where: { id },
      include: {
        period: true,
        division: true,
        region: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        approvals: {
          include: {
            submitter: { select: { id: true, name: true, email: true } },
            reviewer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Target plan with ID ${id} not found`);
    }

    // Top-level RSM allocations
    const rsmAllocations = await this.prisma.targetAllocation.findMany({
      where: {
        targetPlanId: id,
        parentAllocationId: null,
        brandId: null,
      },
      include: {
        employee: {
          include: {
            role: true,
            region: true,
          },
        },
        children: {
          where: { brandId: { not: null } },
          include: { brand: true },
        },
      },
      orderBy: { employee: { employeeCode: 'asc' } },
    });

    const totalTarget = Number(plan.totalTarget);
    const allocatedSum = rsmAllocations.reduce((sum, a) => sum + Number(a.quantity), 0);
    const remaining = Math.max(0, totalTarget - allocatedSum);
    const completionPercentage = totalTarget > 0 ? Math.min(100, Math.round((allocatedSum / totalTarget) * 100)) : 0;

    return {
      ...plan,
      rsmAllocations,
      allocatedSum,
      remaining,
      completionPercentage,
    };
  }

  async createPlan(data: {
    targetPeriodId: string;
    divisionId?: string;
    regionId?: string;
    title: string;
    totalTarget: number;
    unit?: string;
    rsmAssignments?: {
      employeeId: string;
      quantity: number;
      brandBreakdown?: { brandId: string; quantity: number }[];
    }[];
    userId: string;
  }) {
    const { targetPeriodId, divisionId, regionId, title, totalTarget, unit = 'CTN', rsmAssignments, userId } = data;

    // Validate target sum
    if (rsmAssignments && rsmAssignments.length > 0) {
      const assignedSum = rsmAssignments.reduce((sum, a) => sum + Number(a.quantity), 0);
      if (assignedSum > totalTarget) {
        throw new BadRequestException(
          `Sum of assigned RSM targets (${assignedSum.toLocaleString()} ${unit}) exceeds total company target (${totalTarget.toLocaleString()} ${unit}) by ${(assignedSum - totalTarget).toLocaleString()} ${unit}.`,
        );
      }
    }

    // Execute in transaction
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.targetPlan.create({
        data: {
          targetPeriodId,
          divisionId,
          regionId,
          title,
          totalTarget: new Prisma.Decimal(totalTarget),
          unit,
          status: rsmAssignments && rsmAssignments.length > 0 ? TargetStatus.ASSIGNED : TargetStatus.DRAFT,
          createdBy: userId,
          version: 1,
        },
      });

      if (rsmAssignments && rsmAssignments.length > 0) {
        for (const rsm of rsmAssignments) {
          const rsmAlloc = await tx.targetAllocation.create({
            data: {
              targetPlanId: plan.id,
              employeeId: rsm.employeeId,
              quantity: new Prisma.Decimal(rsm.quantity),
              unit,
              status: TargetStatus.ASSIGNED,
              createdBy: userId,
            },
          });

          // Brand breakdown
          if (rsm.brandBreakdown && rsm.brandBreakdown.length > 0) {
            const brandSum = rsm.brandBreakdown.reduce((sum, b) => sum + Number(b.quantity), 0);
            if (brandSum > rsm.quantity) {
              throw new BadRequestException(
                `Brand allocations for employee (${brandSum.toLocaleString()}) exceed the total employee target (${rsm.quantity.toLocaleString()}).`,
              );
            }

            for (const b of rsm.brandBreakdown) {
              await tx.targetAllocation.create({
                data: {
                  targetPlanId: plan.id,
                  parentAllocationId: rsmAlloc.id,
                  employeeId: rsm.employeeId,
                  brandId: b.brandId,
                  quantity: new Prisma.Decimal(b.quantity),
                  unit,
                  status: TargetStatus.ASSIGNED,
                  createdBy: userId,
                },
              });
            }
          }
        }
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TARGET_PLAN_CREATED',
          entityType: 'TargetPlan',
          entityId: plan.id,
          newValues: {
            title,
            totalTarget,
            unit,
            rsmsAssigned: rsmAssignments?.length || 0,
          },
        },
      });

      return plan;
    });
  }

  async finalizePlan(id: string, userId: string) {
    const plan = await this.findOne(id);
    if (plan.status === TargetStatus.FINALIZED) {
      throw new BadRequestException('Target plan is already finalized.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update plan status
      const updated = await tx.targetPlan.update({
        where: { id },
        data: { status: TargetStatus.FINALIZED },
      });

      // 2. Update all allocations to FINALIZED
      await tx.targetAllocation.updateMany({
        where: { targetPlanId: id },
        data: { status: TargetStatus.FINALIZED },
      });

      // 3. Create initial version snapshot in target_versions
      await tx.targetVersion.create({
        data: {
          targetPlanId: id,
          versionNumber: plan.version || 1,
          totalTarget: plan.totalTarget,
          snapshotData: {
            planTitle: plan.title,
            finalizedAt: new Date().toISOString(),
            finalizedBy: userId,
            totalTarget: Number(plan.totalTarget),
          },
          reason: 'Initial Finalization',
          createdBy: userId,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TARGET_PLAN_FINALIZED',
          entityType: 'TargetPlan',
          entityId: id,
          oldValues: { status: plan.status },
          newValues: { status: TargetStatus.FINALIZED, version: plan.version },
        },
      });

      return updated;
    });
  }
}

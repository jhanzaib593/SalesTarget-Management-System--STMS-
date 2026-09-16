import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType, TargetStatus, ApprovalStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSalesOperationsDashboard() {
    // 1. Fetch active target plan
    const activePlan = await this.prisma.targetPlan.findFirst({
      include: {
        period: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activePlan) {
      return {
        hasPlan: false,
        totalTarget: 0,
        allocatedTarget: 0,
        remainingTarget: 0,
        completionPercentage: 0,
        pendingAllocations: 0,
        pendingApprovals: 0,
        finalizedTargets: 0,
        rsmBreakdown: [],
        brandBreakdown: [],
        regionBreakdown: [],
        hierarchyProgress: [],
      };
    }

    const totalTarget = Number(activePlan.totalTarget);

    // 2. Fetch RSM allocations
    const rsmAllocs = await this.prisma.targetAllocation.findMany({
      where: {
        targetPlanId: activePlan.id,
        parentAllocationId: null,
        brandId: null,
      },
      include: {
        employee: { include: { region: true } },
        children: { where: { brandId: null } },
      },
    });

    const allocatedTarget = rsmAllocs.reduce((s, a) => s + Number(a.quantity), 0);
    const remainingTarget = Math.max(0, totalTarget - allocatedTarget);
    const completionPercentage = totalTarget > 0 ? Math.min(100, Math.round((allocatedTarget / totalTarget) * 100)) : 0;

    // 3. Counts
    const [pendingAllocations, pendingApprovals, finalizedCount] = await Promise.all([
      this.prisma.targetAllocation.count({
        where: {
          targetPlanId: activePlan.id,
          status: { in: [TargetStatus.ASSIGNED, TargetStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.approvalRequest.count({
        where: {
          targetPlanId: activePlan.id,
          status: ApprovalStatus.PENDING,
        },
      }),
      this.prisma.targetPlan.count({
        where: { status: TargetStatus.FINALIZED },
      }),
    ]);

    // 4. RSM Breakdown Chart
    const rsmBreakdown = rsmAllocs.map((a) => {
      const target = Number(a.quantity);
      const allocatedToZsm = a.children.reduce((s, c) => s + Number(c.quantity), 0);
      return {
        rsmCode: a.employee.employeeCode,
        name: a.employee.name,
        target,
        allocated: allocatedToZsm,
        remaining: Math.max(0, target - allocatedToZsm),
        completion: target > 0 ? Math.round((allocatedToZsm / target) * 100) : 0,
      };
    });

    // 5. Brand Breakdown Chart
    const brands = await this.prisma.brand.findMany({ where: { status: 'ACTIVE' } });
    const brandAllocs = await this.prisma.targetAllocation.findMany({
      where: {
        targetPlanId: activePlan.id,
        brandId: { not: null },
      },
      include: { brand: true },
    });

    const brandBreakdown = brands.map((b) => {
      const items = brandAllocs.filter((a) => a.brandId === b.id);
      const total = items.reduce((s, a) => s + Number(a.quantity), 0);
      return {
        brandId: b.id,
        brandCode: b.code,
        name: b.name,
        color: b.color || '#3b82f6',
        quantity: total,
      };
    });

    // 6. Region Breakdown Chart
    const regions = await this.prisma.region.findMany({ where: { status: 'ACTIVE' } });
    const regionBreakdown = regions.map((reg) => {
      const regRsms = rsmAllocs.filter((a) => a.employee.regionId === reg.id);
      const regTarget = regRsms.reduce((s, a) => s + Number(a.quantity), 0);
      return {
        regionId: reg.id,
        regionName: reg.name,
        regionCode: reg.code,
        target: regTarget,
      };
    });

    // 7. Hierarchy Completion Rates
    const hierarchyLevels = [RoleType.RSM, RoleType.ZSM, RoleType.ASM, RoleType.TSM, RoleType.ORDER_BOOKER];
    const hierarchyProgress = await Promise.all(
      hierarchyLevels.map(async (role) => {
        const empCount = await this.prisma.employee.count({
          where: { role: { name: role }, status: 'ACTIVE' },
        });
        const allocCount = await this.prisma.targetAllocation.count({
          where: {
            targetPlanId: activePlan.id,
            employee: { role: { name: role } },
            brandId: null,
          },
        });
        return {
          level: role,
          totalEmployees: empCount,
          allocatedEmployees: allocCount,
          percentage: empCount > 0 ? Math.min(100, Math.round((allocCount / empCount) * 100)) : 0,
        };
      }),
    );

    return {
      hasPlan: true,
      activePlan: {
        id: activePlan.id,
        title: activePlan.title,
        period: `${activePlan.period.month}/${activePlan.period.year}`,
        unit: activePlan.unit,
        status: activePlan.status,
        version: activePlan.version,
      },
      totalTarget,
      allocatedTarget,
      remainingTarget,
      completionPercentage,
      pendingAllocations,
      pendingApprovals,
      finalizedTargets: finalizedCount,
      rsmBreakdown,
      brandBreakdown,
      regionBreakdown,
      hierarchyProgress,
    };
  }

  async getRoleDashboard(user: any) {
    if (user.role.name === RoleType.SUPER_ADMIN || user.role.name === RoleType.SALES_OPERATIONS) {
      return this.getSalesOperationsDashboard();
    }

    if (!user.employeeId) {
      return { message: 'No employee profile connected' };
    }

    // For Field Roles (RSM, ZSM, ASM, TSM, ORDER_BOOKER)
    const activePlan = await this.prisma.targetPlan.findFirst({
      include: { period: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activePlan) {
      return { hasPlan: false };
    }

    const myAllocation = await this.prisma.targetAllocation.findFirst({
      where: {
        targetPlanId: activePlan.id,
        employeeId: user.employeeId,
        brandId: null,
      },
      include: {
        children: {
          where: { brandId: null },
          include: { employee: true },
        },
      },
    });

    const myTarget = myAllocation ? Number(myAllocation.quantity) : 0;
    const allocatedToChildren = myAllocation?.children.reduce((s, c) => s + Number(c.quantity), 0) || 0;
    const remaining = Math.max(0, myTarget - allocatedToChildren);
    const completion = myTarget > 0 ? Math.min(100, Math.round((allocatedToChildren / myTarget) * 100)) : 0;

    // Brand breakdown for this employee
    const myBrands = myAllocation
      ? await this.prisma.targetAllocation.findMany({
          where: {
            targetPlanId: activePlan.id,
            parentAllocationId: myAllocation.id,
            employeeId: user.employeeId,
            brandId: { not: null },
          },
          include: { brand: true },
        })
      : [];

    return {
      hasPlan: true,
      activePlanTitle: activePlan.title,
      period: `${activePlan.period.month}/${activePlan.period.year}`,
      myTarget,
      allocatedToChildren,
      remaining,
      completion,
      status: myAllocation?.status || 'NOT_ASSIGNED',
      brandBreakdown: myBrands.map((b) => ({
        brandName: b.brand?.name,
        brandCode: b.brand?.code,
        color: b.brand?.color,
        quantity: Number(b.quantity),
      })),
      childrenBreakdown: myAllocation?.children.map((c) => ({
        employeeName: c.employee.name,
        employeeCode: c.employee.employeeCode,
        quantity: Number(c.quantity),
        status: c.status,
      })) || [],
    };
  }
}

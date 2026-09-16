import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType } from '@prisma/client';

export interface ConsolidatedFilterDto {
  targetPlanId?: string;
  year?: number;
  month?: number;
  regionId?: string;
  brandId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getConsolidatedReport(filters?: ConsolidatedFilterDto) {
    const { targetPlanId, year, month, regionId, brandId, status, search, page = 1, limit = 50 } = filters || {};
    const skip = (page - 1) * limit;

    // Build Prisma query condition for bottom-tier or brand allocations
    const where: any = {};

    if (targetPlanId) {
      where.targetPlanId = targetPlanId;
    }
    if (brandId) {
      where.brandId = brandId;
    }
    if (status) {
      where.status = status;
    }

    // Fetch allocations with complete hierarchy relations
    const allocations = await this.prisma.targetAllocation.findMany({
      where,
      include: {
        plan: {
          include: {
            period: true,
            division: true,
            region: true,
          },
        },
        employee: {
          include: {
            role: true,
            region: true,
            parent: {
              include: {
                role: true,
                parent: {
                  include: {
                    role: true,
                    parent: {
                      include: {
                        role: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        brand: true,
        product: true,
      },
      orderBy: [{ targetPlanId: 'desc' }, { employee: { employeeCode: 'asc' } }],
    });

    // Map each allocation into a clean consolidated row with hierarchy chain
    const compiledRows = allocations.map((alloc) => {
      const emp = alloc.employee;
      const chain: { [key: string]: string } = {};

      // Trace upward hierarchy chain
      let curr: any = emp;
      while (curr) {
        const roleName = curr.role?.name;
        if (roleName) {
          chain[roleName] = `${curr.name} (${curr.employeeCode})`;
        }
        curr = curr.parent;
      }

      return {
        id: alloc.id,
        planTitle: alloc.plan.title,
        period: `${alloc.plan.period.month}/${alloc.plan.period.year}`,
        year: alloc.plan.period.year,
        month: alloc.plan.period.month,
        division: alloc.plan.division?.name || 'All Divisions',
        region: emp.region?.name || alloc.plan.region?.name || 'National',
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        role: emp.role.name,
        rsm: chain[RoleType.RSM] || (emp.role.name === RoleType.RSM ? `${emp.name} (${emp.employeeCode})` : '—'),
        zsm: chain[RoleType.ZSM] || (emp.role.name === RoleType.ZSM ? `${emp.name} (${emp.employeeCode})` : '—'),
        asm: chain[RoleType.ASM] || (emp.role.name === RoleType.ASM ? `${emp.name} (${emp.employeeCode})` : '—'),
        tsm: chain[RoleType.TSM] || (emp.role.name === RoleType.TSM ? `${emp.name} (${emp.employeeCode})` : '—'),
        orderBooker: chain[RoleType.ORDER_BOOKER] || (emp.role.name === RoleType.ORDER_BOOKER ? `${emp.name} (${emp.employeeCode})` : '—'),
        brandCode: alloc.brand?.code || 'TOTAL_VOLUME',
        brandName: alloc.brand?.name || 'Total Volume',
        brandColor: alloc.brand?.color || '#6366f1',
        quantity: Number(alloc.quantity),
        unit: alloc.unit,
        status: alloc.status,
        version: alloc.version,
      };
    });

    // Filter in-memory by search or hierarchy if requested
    let filtered = compiledRows;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.rsm.toLowerCase().includes(q) ||
          r.brandName.toLowerCase().includes(q),
      );
    }
    if (year) {
      filtered = filtered.filter((r) => r.year === Number(year));
    }
    if (month) {
      filtered = filtered.filter((r) => r.month === Number(month));
    }

    const total = filtered.length;
    const paginatedItems = filtered.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      grandTotalQuantity: filtered.reduce((s, r) => s + r.quantity, 0),
    };
  }

  async getBrandWiseReport(targetPlanId?: string) {
    const brands = await this.prisma.brand.findMany({
      where: { status: 'ACTIVE' },
    });

    const where: any = { brandId: { not: null } };
    if (targetPlanId) where.targetPlanId = targetPlanId;

    const brandAllocations = await this.prisma.targetAllocation.findMany({
      where,
      include: { brand: true, plan: { include: { period: true } } },
    });

    const brandStats = brands.map((b) => {
      const matching = brandAllocations.filter((a) => a.brandId === b.id);
      const totalVolume = matching.reduce((s, a) => s + Number(a.quantity), 0);
      return {
        brandId: b.id,
        brandCode: b.code,
        brandName: b.name,
        color: b.color,
        allocationsCount: matching.length,
        totalQuantity: totalVolume,
      };
    });

    return brandStats;
  }

  async getRsmWiseReport(targetPlanId?: string) {
    const rsms = await this.prisma.employee.findMany({
      where: { role: { name: RoleType.RSM }, status: 'ACTIVE' },
      include: { region: true },
      orderBy: { employeeCode: 'asc' },
    });

    const where: any = {
      parentAllocationId: null,
      brandId: null,
    };
    if (targetPlanId) where.targetPlanId = targetPlanId;

    const rsmAllocs = await this.prisma.targetAllocation.findMany({
      where,
      include: {
        children: {
          where: { brandId: null },
        },
      },
    });

    return rsms.map((rsm) => {
      const alloc = rsmAllocs.find((a) => a.employeeId === rsm.id);
      const target = alloc ? Number(alloc.quantity) : 0;
      const allocatedToZsm = alloc?.children.reduce((s, c) => s + Number(c.quantity), 0) || 0;
      const remaining = Math.max(0, target - allocatedToZsm);
      const completionPercentage = target > 0 ? Math.min(100, Math.round((allocatedToZsm / target) * 100)) : 0;

      return {
        rsmId: rsm.id,
        employeeCode: rsm.employeeCode,
        name: rsm.name,
        region: rsm.region?.name || 'Unassigned',
        target,
        allocatedToZsm,
        remaining,
        completionPercentage,
        status: alloc?.status || 'NOT_ASSIGNED',
      };
    });
  }

  async getUnallocatedReport(targetPlanId?: string) {
    const plans = await this.prisma.targetPlan.findMany({
      where: targetPlanId ? { id: targetPlanId } : {},
      include: { period: true },
    });

    const results = [];
    for (const plan of plans) {
      const topAllocs = await this.prisma.targetAllocation.findMany({
        where: { targetPlanId: plan.id, parentAllocationId: null, brandId: null },
      });

      const totalPlanTarget = Number(plan.totalTarget);
      const allocatedToRsms = topAllocs.reduce((s, a) => s + Number(a.quantity), 0);
      const unallocated = Math.max(0, totalPlanTarget - allocatedToRsms);

      results.push({
        planId: plan.id,
        planTitle: plan.title,
        period: `${plan.period.month}/${plan.period.year}`,
        totalPlanTarget,
        allocatedToRsms,
        unallocated,
        completionPercentage: totalPlanTarget > 0 ? Math.round((allocatedToRsms / totalPlanTarget) * 100) : 0,
      });
    }

    return results;
  }
}

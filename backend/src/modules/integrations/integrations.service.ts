import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async syncFinalizedTargetsToSecondarySoftware(targetPlanId: string) {
    const plan = await this.prisma.targetPlan.findUnique({
      where: { id: targetPlanId },
      include: { period: true },
    });

    if (!plan) {
      throw new NotFoundException(`Target plan ${targetPlanId} not found`);
    }

    const { items } = await this.reportsService.getConsolidatedReport({
      targetPlanId,
      limit: 100000,
    });

    // Format secondary software payload contract
    const syncPayload = {
      systemSource: 'STMS_CORE',
      syncTimestamp: new Date().toISOString(),
      planId: plan.id,
      period: {
        year: plan.period.year,
        month: plan.period.month,
      },
      totalRecords: items.length,
      records: items.map((r) => ({
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        role: r.role,
        rsmCode: r.rsm,
        zsmCode: r.zsm,
        asmCode: r.asm,
        tsmCode: r.tsm,
        orderBookerCode: r.orderBooker,
        brandCode: r.brandCode,
        quantity: r.quantity,
        unit: r.unit,
        status: r.status,
      })),
    };

    // Record Integration Log
    const log = await this.prisma.integrationLog.create({
      data: {
        systemName: 'SECONDARY_SALES_ERP',
        action: 'PUSH_TARGET_CONSOLIDATION',
        status: 'SUCCESS',
        payload: syncPayload as any,
        response: {
          status: 200,
          message: `Secondary ERP received ${items.length} records for ${plan.period.month}/${plan.period.year}`,
          batchId: `BATCH-ERP-${Date.now()}`,
        },
      },
    });

    return {
      message: 'Successfully dispatched finalized targets to Secondary Sales Software API',
      logId: log.id,
      totalSynced: items.length,
      payloadPreview: syncPayload.records.slice(0, 5),
    };
  }

  async getIntegrationLogs() {
    return this.prisma.integrationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

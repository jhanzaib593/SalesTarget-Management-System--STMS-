import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetStatus, Prisma } from '@prisma/client';

@Injectable()
export class RevisionsService {
  constructor(private prisma: PrismaService) {}

  async getVersions(targetPlanId: string) {
    return this.prisma.targetVersion.findMany({
      where: { targetPlanId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async createRevision(
    targetPlanId: string,
    data: {
      newTotalTarget: number;
      reason: string;
      notes?: string;
    },
    userId: string,
  ) {
    const { newTotalTarget, reason } = data;

    if (!reason) {
      throw new BadRequestException('A reason is mandatory when creating a target revision.');
    }

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.targetPlan.findUnique({
        where: { id: targetPlanId },
        include: {
          allocations: {
            include: { employee: true, brand: true },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException(`Target plan ${targetPlanId} not found`);
      }

      // 1. Snapshot previous state before modifying
      const currentVersion = plan.version || 1;
      const previousTarget = Number(plan.totalTarget);

      await tx.targetVersion.create({
        data: {
          targetPlanId: plan.id,
          versionNumber: currentVersion,
          totalTarget: plan.totalTarget,
          snapshotData: {
            version: currentVersion,
            totalTarget: previousTarget,
            allocationsCount: plan.allocations.length,
            archivedAt: new Date().toISOString(),
            archivedBy: userId,
          },
          reason: `Archived version ${currentVersion} prior to revision`,
          createdBy: userId,
        },
      });

      // 2. Increment version and update target plan
      const nextVersion = currentVersion + 1;
      const updatedPlan = await tx.targetPlan.update({
        where: { id: targetPlanId },
        data: {
          version: nextVersion,
          totalTarget: new Prisma.Decimal(newTotalTarget),
          status: TargetStatus.REVISION_REQUIRED,
        },
      });

      // 3. Mark all allocations as REVISION_REQUIRED for re-alignment
      await tx.targetAllocation.updateMany({
        where: { targetPlanId },
        data: {
          version: nextVersion,
          status: TargetStatus.REVISION_REQUIRED,
        },
      });

      // 4. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TARGET_REVISED_NEW_VERSION',
          entityType: 'TargetPlan',
          entityId: targetPlanId,
          oldValues: {
            version: currentVersion,
            totalTarget: previousTarget,
          },
          newValues: {
            version: nextVersion,
            totalTarget: newTotalTarget,
            difference: newTotalTarget - previousTarget,
            reason,
          },
        },
      });

      return {
        message: `Target plan revised to Version ${nextVersion}`,
        previousVersion: currentVersion,
        newVersion: nextVersion,
        previousTarget,
        revisedTarget: newTotalTarget,
        difference: newTotalTarget - previousTarget,
        plan: updatedPlan,
      };
    });
  }
}

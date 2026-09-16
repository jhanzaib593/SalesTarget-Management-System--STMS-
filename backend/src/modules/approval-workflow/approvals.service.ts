import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalStatus, TargetStatus, RoleType } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async getPendingApprovals(userId: string, role: RoleType) {
    const where: any = { status: ApprovalStatus.PENDING };

    // Super Admin & Sales Operations can see all pending approvals
    if (role !== RoleType.SUPER_ADMIN && role !== RoleType.SALES_OPERATIONS) {
      where.submittedTo = userId;
    }

    return this.prisma.approvalRequest.findMany({
      where,
      include: {
        plan: {
          include: { period: true },
        },
        allocation: {
          include: {
            employee: {
              include: {
                role: true,
                region: true,
              },
            },
            brand: true,
          },
        },
        submitter: {
          select: { id: true, name: true, email: true, employee: { select: { employeeCode: true } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getAllApprovals(params?: { targetPlanId?: string; status?: ApprovalStatus }) {
    const where: any = {};
    if (params?.targetPlanId) where.targetPlanId = params.targetPlanId;
    if (params?.status) where.status = params.status;

    return this.prisma.approvalRequest.findMany({
      where,
      include: {
        plan: { include: { period: true } },
        allocation: {
          include: {
            employee: { include: { role: true, region: true } },
          },
        },
        submitter: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approve(requestId: string, reviewerId: string, comments?: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        include: { allocation: true },
      });

      if (!request) {
        throw new NotFoundException(`Approval request ${requestId} not found`);
      }

      if (request.status !== ApprovalStatus.PENDING) {
        throw new BadRequestException(`Request is already ${request.status}`);
      }

      const updatedRequest = await tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.APPROVED,
          submittedTo: reviewerId,
          reviewedAt: new Date(),
          comments: comments || request.comments,
        },
      });

      if (request.allocationId) {
        await tx.targetAllocation.update({
          where: { id: request.allocationId },
          data: { status: TargetStatus.APPROVED },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'TARGET_ALLOCATION_APPROVED',
          entityType: 'ApprovalRequest',
          entityId: requestId,
          newValues: {
            status: ApprovalStatus.APPROVED,
            comments,
            allocationId: request.allocationId,
          },
        },
      });

      return updatedRequest;
    });
  }

  async reject(requestId: string, reviewerId: string, comments: string) {
    if (!comments) {
      throw new BadRequestException('A reason/comment is required when rejecting an allocation.');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        include: { allocation: true },
      });

      if (!request) {
        throw new NotFoundException(`Approval request ${requestId} not found`);
      }

      const updatedRequest = await tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.REJECTED,
          submittedTo: reviewerId,
          reviewedAt: new Date(),
          comments,
        },
      });

      if (request.allocationId) {
        await tx.targetAllocation.update({
          where: { id: request.allocationId },
          data: { status: TargetStatus.REJECTED },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'TARGET_ALLOCATION_REJECTED',
          entityType: 'ApprovalRequest',
          entityId: requestId,
          newValues: {
            status: ApprovalStatus.REJECTED,
            comments,
            allocationId: request.allocationId,
          },
        },
      });

      return updatedRequest;
    });
  }

  async requestRevision(requestId: string, reviewerId: string, comments: string) {
    if (!comments) {
      throw new BadRequestException('Specific comments explaining the revision required are mandatory.');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        include: { allocation: true },
      });

      if (!request) {
        throw new NotFoundException(`Approval request ${requestId} not found`);
      }

      const updatedRequest = await tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.REVISION_REQUESTED,
          submittedTo: reviewerId,
          reviewedAt: new Date(),
          comments,
        },
      });

      if (request.allocationId) {
        await tx.targetAllocation.update({
          where: { id: request.allocationId },
          data: { status: TargetStatus.REVISION_REQUIRED },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'TARGET_REVISION_REQUESTED',
          entityType: 'ApprovalRequest',
          entityId: requestId,
          newValues: {
            status: ApprovalStatus.REVISION_REQUESTED,
            comments,
            allocationId: request.allocationId,
          },
        },
      });

      return updatedRequest;
    });
  }
}

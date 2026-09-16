import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovalStatus } from '@prisma/client';

@ApiTags('Approvals & Workflow')
@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending approval requests for current user or Sales Ops' })
  async getPending(@CurrentUser() user: any) {
    return this.approvalsService.getPendingApprovals(user.id, user.role.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get approval history with filters' })
  @ApiQuery({ name: 'targetPlanId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  async getAll(
    @Query('targetPlanId') targetPlanId?: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.approvalsService.getAllApprovals({ targetPlanId, status });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve submitted target allocation' })
  async approve(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.approvalsService.approve(id, reviewerId, comments);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject target allocation back to in-progress state' })
  async reject(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.approvalsService.reject(id, reviewerId, comments);
  }

  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request target revision with specific remarks' })
  async requestRevision(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.approvalsService.requestRevision(id, reviewerId, comments);
  }
}

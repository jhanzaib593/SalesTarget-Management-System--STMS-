import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TargetPlansService } from './target-plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, TargetStatus } from '@prisma/client';

@ApiTags('Target Plans & Company Targets')
@Controller('target-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TargetPlansController {
  constructor(private readonly plansService: TargetPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all target plans with allocation statistics' })
  @ApiQuery({ name: 'targetPeriodId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TargetStatus })
  async findAll(
    @Query('targetPeriodId') targetPeriodId?: string,
    @Query('status') status?: TargetStatus,
  ) {
    return this.plansService.findAll({ targetPeriodId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single target plan with RSM allocations and brand breakdowns' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create company target plan and assign to RSMs (Wizard Step 1-4)' })
  async createPlan(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.plansService.createPlan({ ...body, userId });
  }

  @Post(':id/finalize')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Finalize target plan and freeze allocations (creates Version 1 snapshot)' })
  async finalizePlan(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.plansService.finalizePlan(id, userId);
  }
}

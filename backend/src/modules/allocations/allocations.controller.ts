import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AllocationsService, ChildAllocationInput } from './allocations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Target Allocations & Workbench')
@Controller('allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Get('workbench')
  @ApiOperation({ summary: 'Get employee allocation workbench with direct subordinates and brand breakdown' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Target employee ID (defaults to current user employee)' })
  @ApiQuery({ name: 'targetPlanId', required: false, description: 'Target plan ID (defaults to active plan)' })
  async getWorkbench(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('targetPlanId') targetPlanId?: string,
  ) {
    // If sales ops or super admin, can view any employee workbench.
    // If field employee, can view self or direct subtree.
    const targetEmpId = employeeId || user.employeeId;
    if (!targetEmpId) {
      throw new ForbiddenException('No employee record associated with current session');
    }

    return this.allocationsService.getAllocationWorkbench(targetEmpId, targetPlanId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single allocation details with brand and hierarchy linkages' })
  async findOne(@Param('id') id: string) {
    return this.allocationsService.findOne(id);
  }

  @Post(':id/children')
  @ApiOperation({ summary: 'Allocate target quantities and brand quotas to direct subordinates' })
  async allocateToChildren(
    @Param('id') parentAllocationId: string,
    @Body('children') childrenData: ChildAllocationInput[],
    @CurrentUser('id') userId: string,
  ) {
    return this.allocationsService.allocateToChildren(parentAllocationId, childrenData, userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit allocated targets for managerial / sales ops approval' })
  async submitAllocation(
    @Param('id') allocationId: string,
    @Body('comments') comments: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.allocationsService.submitAllocation(allocationId, userId, comments);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService, ConsolidatedFilterDto } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reports & Analytics')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('consolidated')
  @ApiOperation({ summary: 'Get complete compiled multi-tier target table with filters' })
  @ApiQuery({ name: 'targetPlanId', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getConsolidated(@Query() query: ConsolidatedFilterDto) {
    return this.reportsService.getConsolidatedReport(query);
  }

  @Get('brand-wise')
  @ApiOperation({ summary: 'Get brand-wise target breakdown' })
  @ApiQuery({ name: 'targetPlanId', required: false })
  async getBrandWise(@Query('targetPlanId') targetPlanId?: string) {
    return this.reportsService.getBrandWiseReport(targetPlanId);
  }

  @Get('rsm-wise')
  @ApiOperation({ summary: 'Get RSM-wise allocation and completion progress' })
  @ApiQuery({ name: 'targetPlanId', required: false })
  async getRsmWise(@Query('targetPlanId') targetPlanId?: string) {
    return this.reportsService.getRsmWiseReport(targetPlanId);
  }

  @Get('unallocated')
  @ApiOperation({ summary: 'Get unallocated target gaps across target plans' })
  @ApiQuery({ name: 'targetPlanId', required: false })
  async getUnallocated(@Query('targetPlanId') targetPlanId?: string) {
    return this.reportsService.getUnallocatedReport(targetPlanId);
  }
}

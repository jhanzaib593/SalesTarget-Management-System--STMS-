import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard Metrics & KPIs')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales-operations')
  @ApiOperation({ summary: 'Get aggregated executive dashboard metrics for Sales Operations' })
  async getSalesOperations() {
    return this.dashboardService.getSalesOperationsDashboard();
  }

  @Get('my-view')
  @ApiOperation({ summary: 'Get personalized dashboard metrics based on active user role and hierarchy' })
  async getMyView(@CurrentUser() user: any) {
    return this.dashboardService.getRoleDashboard(user);
  }
}

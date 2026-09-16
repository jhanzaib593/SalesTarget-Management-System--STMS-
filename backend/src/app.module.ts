import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { BrandsModule } from './modules/brands/brands.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { TargetPeriodsModule } from './modules/target-periods/target-periods.module';
import { TargetPlansModule } from './modules/target-plans/target-plans.module';
import { AllocationsModule } from './modules/allocations/allocations.module';
import { ApprovalWorkflowModule } from './modules/approval-workflow/approvals.module';
import { TargetRevisionsModule } from './modules/target-revisions/revisions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ImportsModule } from './modules/imports/imports.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    BrandsModule,
    OrganizationModule,
    TargetPeriodsModule,
    TargetPlansModule,
    AllocationsModule,
    ApprovalWorkflowModule,
    TargetRevisionsModule,
    ReportsModule,
    DashboardModule,
    ExportsModule,
    ImportsModule,
    AuditLogsModule,
    NotificationsModule,
    IntegrationsModule,
  ],
})
export class AppModule {}

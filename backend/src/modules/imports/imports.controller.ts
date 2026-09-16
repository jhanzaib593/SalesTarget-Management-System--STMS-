import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService, ImportRowData } from './imports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Excel Imports & Validation Wizard')
@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('validate')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Validate parsed Excel rows before committing import' })
  async validate(
    @Body('targetPlanId') targetPlanId: string,
    @Body('rows') rows: ImportRowData[],
  ) {
    return this.importsService.validateAndPreviewTargetImport(targetPlanId, rows);
  }

  @Post('execute')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Execute transactional import of validated Excel records' })
  async execute(
    @Body('targetPlanId') targetPlanId: string,
    @Body('rows') rows: ImportRowData[],
    @CurrentUser('id') userId: string,
  ) {
    return this.importsService.executeTargetImport(targetPlanId, rows, userId);
  }
}

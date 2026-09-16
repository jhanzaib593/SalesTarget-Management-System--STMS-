import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Excel Exports')
@Controller('exports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('target/:targetPlanId')
  @ApiOperation({ summary: 'Generate and stream styled corporate Consolidated Target Excel Workbook' })
  async exportTarget(@Param('targetPlanId') targetPlanId: string, @Res() res: Response) {
    return this.exportsService.exportConsolidatedExcel(targetPlanId, res);
  }
}

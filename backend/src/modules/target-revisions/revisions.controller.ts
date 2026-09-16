import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RevisionsService } from './revisions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Target Revisions & Versioning')
@Controller('revisions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Get(':targetPlanId/versions')
  @ApiOperation({ summary: 'Get all historical versions and snapshots for a target plan' })
  async getVersions(@Param('targetPlanId') targetPlanId: string) {
    return this.revisionsService.getVersions(targetPlanId);
  }

  @Post(':targetPlanId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create new version revision of a target plan without overwriting history' })
  async createRevision(
    @Param('targetPlanId') targetPlanId: string,
    @Body() body: { newTotalTarget: number; reason: string; notes?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.revisionsService.createRevision(targetPlanId, body, userId);
  }
}

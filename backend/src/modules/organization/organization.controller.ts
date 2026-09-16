import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Organization & Territories')
@Controller('organization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('divisions')
  @ApiOperation({ summary: 'Get all company divisions and their nested regions' })
  async getDivisions() {
    return this.orgService.getDivisions();
  }

  @Get('regions')
  @ApiOperation({ summary: 'Get active sales regions' })
  @ApiQuery({ name: 'divisionId', required: false })
  async getRegions(@Query('divisionId') divisionId?: string) {
    return this.orgService.getRegions(divisionId);
  }

  @Get('territories')
  @ApiOperation({ summary: 'Get active territories' })
  @ApiQuery({ name: 'regionId', required: false })
  async getTerritories(@Query('regionId') regionId?: string) {
    return this.orgService.getTerritories(regionId);
  }
}

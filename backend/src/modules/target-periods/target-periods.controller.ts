import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TargetPeriodsService } from './target-periods.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Target Periods')
@Controller('target-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TargetPeriodsController {
  constructor(private readonly periodsService: TargetPeriodsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all target periods with plan counts' })
  async findAll() {
    return this.periodsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get target period details' })
  async findOne(@Param('id') id: string) {
    return this.periodsService.findOne(id);
  }

  @Post()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create a new monthly target period' })
  async create(@Body() data: any) {
    return this.periodsService.create(data);
  }

  @Put(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Update target period status or dates' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.periodsService.update(id, data);
  }
}

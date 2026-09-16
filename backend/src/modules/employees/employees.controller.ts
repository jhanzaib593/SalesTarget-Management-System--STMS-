import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleType } from '@prisma/client';

@ApiTags('Employees & Organizational Hierarchy')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all employees with pagination and filters' })
  @ApiQuery({ name: 'role', required: false, enum: RoleType })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'parentEmployeeId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('role') role?: RoleType,
    @Query('regionId') regionId?: string,
    @Query('parentEmployeeId') parentEmployeeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employeesService.findAll({
      role,
      regionId,
      parentEmployeeId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get complete recursive employee hierarchy tree' })
  @ApiQuery({ name: 'rootId', required: false, description: 'Optional root employee ID' })
  async getHierarchyTree(@Query('rootId') rootId?: string) {
    return this.employeesService.getHierarchyTree(rootId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single employee details with parent and children' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct child subordinates for an employee' })
  async getChildren(@Param('id') id: string) {
    return this.employeesService.getChildren(id);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get chain of upward managerial ancestors (OB -> TSM -> ASM -> ZSM -> RSM)' })
  async getAncestors(@Param('id') id: string) {
    return this.employeesService.getAncestors(id);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all system roles' })
  async getRoles() {
    return this.employeesService.getRoles();
  }

  @Post()
  @ApiOperation({ summary: 'Create new employee' })
  async create(@Body() data: any) {
    return this.employeesService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee information' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.employeesService.update(id, data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update employee status (ACTIVE/INACTIVE)' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.employeesService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete employee (set INACTIVE)' })
  async delete(@Param('id') id: string) {
    return this.employeesService.delete(id);
  }
}

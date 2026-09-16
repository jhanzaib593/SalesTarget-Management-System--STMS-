import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Brands & Categories')
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active brands with categories and products' })
  async findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  async findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create a new brand' })
  async create(@Body() data: any) {
    return this.brandsService.create(data);
  }

  @Put(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Update brand details' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.update(id, data);
  }

  @Delete(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Soft-delete brand (set INACTIVE)' })
  async delete(@Param('id') id: string) {
    return this.brandsService.delete(id);
  }

  // Categories
  @Post(':brandId/categories')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create category under a brand' })
  async createCategory(@Param('brandId') brandId: string, @Body() data: any) {
    return this.brandsService.createCategory(brandId, data);
  }

  @Put('categories/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Update category details' })
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Soft delete category' })
  async deleteCategory(@Param('id') id: string) {
    return this.brandsService.deleteCategory(id);
  }

  // Products / SKUs
  @Post('categories/:categoryId/products')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Create SKU / product under a category' })
  async createProduct(@Param('categoryId') categoryId: string, @Body() data: any) {
    return this.brandsService.createProduct(categoryId, data);
  }

  @Put('products/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Update product details' })
  async updateProduct(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.updateProduct(id, data);
  }

  @Delete('products/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALES_OPERATIONS)
  @ApiOperation({ summary: 'Soft delete product' })
  async deleteProduct(@Param('id') id: string) {
    return this.brandsService.deleteProduct(id);
  }
}

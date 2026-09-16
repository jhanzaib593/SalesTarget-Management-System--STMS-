import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.brand.findMany({
      where: { status: 'ACTIVE' },
      include: {
        categories: {
          include: {
            products: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async create(data: { code: string; name: string; description?: string; color?: string }) {
    return this.prisma.brand.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; color?: string; status?: string }) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  // Category Management
  async createCategory(brandId: string, data: { code: string; name: string }) {
    await this.findOne(brandId);
    return this.prisma.category.create({
      data: {
        brandId,
        code: data.code,
        name: data.name,
      },
      include: { products: true },
    });
  }

  async updateCategory(id: string, data: { name?: string; status?: string }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  // SKU / Product Management
  async createProduct(categoryId: string, data: { code: string; name: string; sku?: string; unit?: string }) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    return this.prisma.product.create({
      data: {
        categoryId,
        code: data.code,
        name: data.name,
        sku: data.sku || data.code,
        unit: data.unit || 'CTN',
      },
    });
  }

  async updateProduct(id: string, data: { name?: string; sku?: string; unit?: string; status?: string }) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}

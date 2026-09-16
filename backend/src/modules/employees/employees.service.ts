import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    role?: RoleType;
    regionId?: string;
    parentEmployeeId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, regionId, parentEmployeeId, search, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = { name: role };
    }
    if (regionId) {
      where.regionId = regionId;
    }
    if (parentEmployeeId !== undefined) {
      where.parentEmployeeId = parentEmployeeId === 'null' || parentEmployeeId === '' ? null : parentEmployeeId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          parent: { select: { id: true, name: true, employeeCode: true } },
          region: true,
          territory: true,
          _count: {
            select: { children: true },
          },
        },
        orderBy: { employeeCode: 'asc' },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: true,
        parent: {
          include: {
            role: true,
          },
        },
        children: {
          include: {
            role: true,
            region: true,
            territory: true,
          },
        },
        region: true,
        territory: true,
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async getChildren(id: string) {
    await this.findOne(id); // Ensure employee exists
    return this.prisma.employee.findMany({
      where: { parentEmployeeId: id },
      include: {
        role: true,
        region: true,
        territory: true,
        _count: { select: { children: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async getHierarchyTree(rootId?: string) {
    if (rootId) {
      const root = await this.findOne(rootId);
      const buildTree = async (emp: any): Promise<any> => {
        const children = await this.prisma.employee.findMany({
          where: { parentEmployeeId: emp.id },
          include: { role: true, region: true, territory: true },
        });

        const resolvedChildren = await Promise.all(children.map((c) => buildTree(c)));
        return {
          ...emp,
          children: resolvedChildren,
        };
      };

      return buildTree(root);
    }

    // Return all top-level RSMs with complete recursive branches
    const rsms = await this.prisma.employee.findMany({
      where: {
        role: { name: RoleType.RSM },
      },
      include: {
        role: true,
        region: true,
        territory: true,
      },
      orderBy: { employeeCode: 'asc' },
    });

    const buildFullTree = async (emp: any): Promise<any> => {
      const children = await this.prisma.employee.findMany({
        where: { parentEmployeeId: emp.id },
        include: { role: true, region: true, territory: true },
      });

      const resolvedChildren = await Promise.all(children.map((c) => buildFullTree(c)));
      return {
        ...emp,
        children: resolvedChildren,
      };
    };

    return Promise.all(rsms.map((rsm) => buildFullTree(rsm)));
  }

  async getAncestors(id: string) {
    const ancestors: any[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const emp: any = await this.prisma.employee.findUnique({
        where: { id: currentId },
        include: { role: true, region: true },
      });

      if (!emp) break;
      if (emp.id !== id) {
        ancestors.unshift(emp); // Push to front so RSM is at index 0
      }
      currentId = emp.parentEmployeeId;
    }

    return ancestors;
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    employeeCode: string;
    name: string;
    email: string;
    mobile?: string;
    roleId?: string;
    roleName?: RoleType;
    parentEmployeeId?: string;
    regionId?: string;
    territoryId?: string;
    password?: string;
  }) {
    // Resolve role ID
    let roleId = data.roleId;
    if (!roleId && data.roleName) {
      const r = await this.prisma.role.findUnique({ where: { name: data.roleName } });
      if (r) roleId = r.id;
    }

    if (!roleId) {
      throw new BadRequestException('Valid role or roleId is required');
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        roleId,
        parentEmployeeId: data.parentEmployeeId || null,
        regionId: data.regionId || null,
        territoryId: data.territoryId || null,
      },
      include: { role: true, parent: true, region: true, territory: true },
    });

    // Create user login account for this employee if not exists
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!existingUser) {
      const defaultPass = data.password || 'Password@123';
      const passwordHash = await bcrypt.hash(defaultPass, 10);
      await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          roleId,
          employeeId: employee.id,
        },
      });
    }

    return employee;
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      mobile?: string;
      roleId?: string;
      roleName?: RoleType;
      parentEmployeeId?: string;
      regionId?: string;
      territoryId?: string;
      status?: string;
    },
  ) {
    await this.findOne(id);
    let roleId = data.roleId;
    if (!roleId && data.roleName) {
      const r = await this.prisma.role.findUnique({ where: { name: data.roleName } });
      if (r) roleId = r.id;
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(roleId && { roleId }),
        ...(data.parentEmployeeId !== undefined && { parentEmployeeId: data.parentEmployeeId || null }),
        ...(data.regionId !== undefined && { regionId: data.regionId || null }),
        ...(data.territoryId !== undefined && { territoryId: data.territoryId || null }),
        ...(data.status && { status: data.status }),
      },
      include: { role: true, parent: true, region: true, territory: true },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}

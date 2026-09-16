import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodStatus } from '@prisma/client';

@Injectable()
export class TargetPeriodsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.targetPeriod.findMany({
      include: {
        _count: { select: { plans: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: string) {
    const period = await this.prisma.targetPeriod.findUnique({
      where: { id },
      include: {
        plans: {
          include: {
            division: true,
            region: true,
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Target period with ID ${id} not found`);
    }

    return period;
  }

  async create(data: { year: number; month: number; startDate: Date; endDate: Date; status?: PeriodStatus }) {
    const existing = await this.prisma.targetPeriod.findUnique({
      where: { year_month: { year: data.year, month: data.month } },
    });

    if (existing) {
      throw new ConflictException(`Target period for ${data.month}/${data.year} already exists`);
    }

    return this.prisma.targetPeriod.create({
      data: {
        year: data.year,
        month: data.month,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || PeriodStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: { status?: PeriodStatus; startDate?: Date; endDate?: Date }) {
    await this.findOne(id);
    return this.prisma.targetPeriod.update({
      where: { id },
      data: {
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }
}

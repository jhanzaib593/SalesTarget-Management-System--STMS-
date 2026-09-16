import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async getDivisions() {
    return this.prisma.division.findMany({
      include: {
        regions: {
          include: {
            territories: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getRegions(divisionId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (divisionId) where.divisionId = divisionId;
    return this.prisma.region.findMany({
      where,
      include: {
        division: true,
        territories: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async getTerritories(regionId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (regionId) where.regionId = regionId;
    return this.prisma.territory.findMany({
      where,
      include: {
        region: true,
      },
      orderBy: { code: 'asc' },
    });
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetStatus, Prisma } from '@prisma/client';

export interface ImportRowData {
  rowNumber: number;
  employeeCode: string;
  parentEmployeeCode?: string;
  brandCode?: string;
  quantity: number;
  unit?: string;
}

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  async validateAndPreviewTargetImport(
    targetPlanId: string,
    rows: ImportRowData[],
  ) {
    const plan = await this.prisma.targetPlan.findUnique({
      where: { id: targetPlanId },
    });

    if (!plan) {
      throw new BadRequestException(`Target plan ${targetPlanId} not found`);
    }

    const errors: { rowNumber: number; employeeCode?: string; message: string }[] = [];
    const validRows: any[] = [];

    // Pre-fetch all employees and brands for instant in-memory lookup
    const allEmployees = await this.prisma.employee.findMany({
      include: { role: true, parent: true },
    });
    const employeeMap = new Map<string, any>(allEmployees.map((e) => [e.employeeCode.toUpperCase(), e]));

    const allBrands = await this.prisma.brand.findMany();
    const brandMap = new Map<string, any>(allBrands.map((b) => [b.code.toUpperCase(), b]));

    for (const r of rows) {
      const code = (r.employeeCode || '').trim().toUpperCase();
      const emp = employeeMap.get(code);

      if (!emp) {
        errors.push({
          rowNumber: r.rowNumber,
          employeeCode: r.employeeCode,
          message: `Employee with code "${r.employeeCode}" does not exist in master records.`,
        });
        continue;
      }

      let brand = null;
      if (r.brandCode) {
        const bCode = r.brandCode.trim().toUpperCase();
        brand = brandMap.get(bCode);
        if (!brand) {
          errors.push({
            rowNumber: r.rowNumber,
            employeeCode: r.employeeCode,
            message: `Brand with code "${r.brandCode}" does not exist.`,
          });
          continue;
        }
      }

      if (isNaN(r.quantity) || r.quantity < 0) {
        errors.push({
          rowNumber: r.rowNumber,
          employeeCode: r.employeeCode,
          message: `Invalid target quantity: "${r.quantity}". Must be a non-negative number.`,
        });
        continue;
      }

      validRows.push({
        rowNumber: r.rowNumber,
        employee: {
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employeeCode,
          role: emp.role.name,
        },
        brand: brand ? { id: brand.id, code: brand.code, name: brand.name } : null,
        quantity: r.quantity,
        unit: r.unit || 'CTN',
      });
    }

    return {
      targetPlanId,
      totalRows: rows.length,
      validRowCount: validRows.length,
      errorRowCount: errors.length,
      isValid: errors.length === 0,
      errors,
      preview: validRows.slice(0, 20),
    };
  }

  async executeTargetImport(
    targetPlanId: string,
    rows: ImportRowData[],
    userId: string,
  ) {
    const validation = await this.validateAndPreviewTargetImport(targetPlanId, rows);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Import validation failed. Please resolve all row errors before importing.',
        errors: validation.errors,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const allEmployees = await tx.employee.findMany();
      const employeeMap = new Map<string, any>(allEmployees.map((e) => [e.employeeCode.toUpperCase(), e]));

      const allBrands = await tx.brand.findMany();
      const brandMap = new Map<string, any>(allBrands.map((b) => [b.code.toUpperCase(), b]));

      let importedCount = 0;
      for (const r of rows) {
        const emp = employeeMap.get(r.employeeCode.trim().toUpperCase())!;
        const brand = r.brandCode ? brandMap.get(r.brandCode.trim().toUpperCase()) : null;

        await tx.targetAllocation.create({
          data: {
            targetPlanId,
            employeeId: emp.id,
            brandId: brand ? brand.id : null,
            quantity: new Prisma.Decimal(r.quantity),
            unit: r.unit || 'CTN',
            status: TargetStatus.ASSIGNED,
            createdBy: userId,
          },
        });
        importedCount++;
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXCEL_TARGETS_IMPORTED',
          entityType: 'TargetPlan',
          entityId: targetPlanId,
          newValues: {
            rowsCount: importedCount,
            importedAt: new Date().toISOString(),
          },
        },
      });

      return {
        message: `Successfully imported ${importedCount} target records.`,
        importedCount,
      };
    });
  }
}

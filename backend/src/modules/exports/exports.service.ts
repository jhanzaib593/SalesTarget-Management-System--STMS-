import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async exportConsolidatedExcel(targetPlanId: string, res: Response) {
    const plan = await this.prisma.targetPlan.findUnique({
      where: { id: targetPlanId },
      include: { period: true, division: true },
    });

    if (!plan) {
      throw new NotFoundException(`Target plan ${targetPlanId} not found`);
    }

    const { items } = await this.reportsService.getConsolidatedReport({
      targetPlanId,
      limit: 100000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FMCG Sales Target Management System (STMS)';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // SHEET 1: Consolidated Target Dataset
    // -------------------------------------------------------------
    const sheet1 = workbook.addWorksheet('Consolidated Targets', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    // Title Block
    sheet1.mergeCells('A1:L1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = `FMCG SALES TARGET ALLOCATION - ${plan.title.toUpperCase()} (VERSION ${plan.version})`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet1.getRow(1).height = 28;

    // Subtitle Block
    sheet1.mergeCells('A2:L2');
    const subCell = sheet1.getCell('A2');
    subCell.value = `Generated on: ${new Date().toLocaleString()} | Period: ${plan.period.month}/${plan.period.year} | Unit: ${plan.unit} | Status: ${plan.status}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet1.getRow(2).height = 20;

    sheet1.addRow([]); // Blank line at row 3

    // Header Row at row 4
    const headers = [
      'Period',
      'Division',
      'Region',
      'RSM',
      'ZSM',
      'ASM',
      'TSM',
      'Order Booker',
      'Brand Code',
      'Brand Name',
      'Target Quantity',
      'Status',
    ];
    const headerRow = sheet1.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    // Populate Rows
    items.forEach((item, index) => {
      const row = sheet1.addRow([
        item.period,
        item.division,
        item.region,
        item.rsm,
        item.zsm,
        item.asm,
        item.tsm,
        item.orderBooker,
        item.brandCode,
        item.brandName,
        item.quantity,
        item.status,
      ]);

      // Alternating row background
      const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (colNumber === 11) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    // Summary Total Row
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalRow = sheet1.addRow(['TOTAL', '', '', '', '', '', '', '', '', '', totalQty, '']);
    totalRow.height = 22;
    totalRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4F46E5' } },
        bottom: { style: 'double', color: { argb: 'FF4F46E5' } },
      };
      if (colNum === 11) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
    });

    // Auto-fit column widths
    sheet1.columns.forEach((col) => {
      col.width = 18;
    });
    sheet1.getColumn(1).width = 12;
    sheet1.getColumn(4).width = 24;
    sheet1.getColumn(5).width = 24;
    sheet1.getColumn(6).width = 24;
    sheet1.getColumn(7).width = 24;
    sheet1.getColumn(8).width = 24;
    sheet1.getColumn(10).width = 22;

    // -------------------------------------------------------------
    // SHEET 2: Brand Summary
    // -------------------------------------------------------------
    const sheet2 = workbook.addWorksheet('Brand Summary');
    const brandData = await this.reportsService.getBrandWiseReport(targetPlanId);

    sheet2.addRow(['Brand Code', 'Brand Name', 'Allocations Count', 'Total Volume (CTN)']);
    sheet2.getRow(1).height = 22;
    sheet2.getRow(1).eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    });

    brandData.forEach((b) => {
      const r = sheet2.addRow([b.brandCode, b.brandName, b.allocationsCount, b.totalQuantity]);
      r.getCell(4).numFmt = '#,##0';
    });
    sheet2.columns.forEach((c) => (c.width = 25));

    // Stream buffer to response
    const filename = `STMS_Consolidated_Target_${plan.period.month}_${plan.period.year}_v${plan.version}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AllocationsService } from './allocations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { TargetStatus, RoleType } from '@prisma/client';

describe('AllocationsService - Target Conservation & Brand Engine Tests', () => {
  let service: AllocationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    targetAllocation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AllocationsService>(AllocationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule 1: Overall Target Conservation', () => {
    it('PASS: should accept when children total exactly equals parent target (100,000 == 40k + 40k + 20k)', async () => {
      // Mock parent allocation with 100,000 target
      mockPrismaService.targetAllocation.findUnique.mockResolvedValue({
        id: 'parent-alloc-1',
        targetPlanId: 'plan-1',
        quantity: 100000,
        unit: 'CTN',
        status: TargetStatus.ASSIGNED,
        employee: {
          id: 'rsm-1',
          name: 'RSM 001',
          children: [{ id: 'zsm-1' }, { id: 'zsm-2' }, { id: 'zsm-3' }],
        },
      });

      mockPrismaService.targetAllocation.findMany.mockResolvedValue([]); // No brand constraints
      mockPrismaService.targetAllocation.findFirst.mockResolvedValue(null);
      mockPrismaService.targetAllocation.create.mockResolvedValue({ id: 'child-alloc-created' });
      mockPrismaService.targetAllocation.update.mockResolvedValue({ id: 'parent-alloc-1' });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const childrenInput = [
        { employeeId: 'zsm-1', quantity: 40000 },
        { employeeId: 'zsm-2', quantity: 40000 },
        { employeeId: 'zsm-3', quantity: 20000 },
      ];

      const result = await service.allocateToChildren('parent-alloc-1', childrenInput, 'user-1');
      expect(result.allocatedSum).toBe(100000);
      expect(result.remaining).toBe(0);
    });

    it('FAIL: should reject when children total exceeds parent target (110,000 > 100,000)', async () => {
      mockPrismaService.targetAllocation.findUnique.mockResolvedValue({
        id: 'parent-alloc-1',
        targetPlanId: 'plan-1',
        quantity: 100000,
        unit: 'CTN',
        status: TargetStatus.ASSIGNED,
        employee: {
          id: 'rsm-1',
          name: 'RSM 001',
          children: [{ id: 'zsm-1' }, { id: 'zsm-2' }, { id: 'zsm-3' }],
        },
      });

      mockPrismaService.targetAllocation.findMany.mockResolvedValue([]);

      const childrenInput = [
        { employeeId: 'zsm-1', quantity: 50000 },
        { employeeId: 'zsm-2', quantity: 40000 },
        { employeeId: 'zsm-3', quantity: 20000 },
      ];

      await expect(
        service.allocateToChildren('parent-alloc-1', childrenInput, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Rule 2: Brand-Wise Target Validation', () => {
    it('PASS: should accept when children Brand A allocations match parent Brand A quota (40,000 == 20k + 15k + 5k)', async () => {
      mockPrismaService.targetAllocation.findUnique.mockResolvedValue({
        id: 'parent-alloc-1',
        targetPlanId: 'plan-1',
        quantity: 100000,
        unit: 'CTN',
        status: TargetStatus.ASSIGNED,
        employee: {
          id: 'rsm-1',
          name: 'RSM 001',
          children: [{ id: 'zsm-1' }, { id: 'zsm-2' }, { id: 'zsm-3' }],
        },
      });

      // Mock parent brand A target = 40,000
      mockPrismaService.targetAllocation.findMany.mockResolvedValue([
        { brandId: 'brand-a', quantity: 40000, brand: { name: 'Brand A' } },
      ]);

      mockPrismaService.targetAllocation.findFirst.mockResolvedValue(null);
      mockPrismaService.targetAllocation.create.mockResolvedValue({ id: 'child-alloc' });
      mockPrismaService.targetAllocation.update.mockResolvedValue({ id: 'parent-alloc' });
      mockPrismaService.targetAllocation.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const childrenInput = [
        {
          employeeId: 'zsm-1',
          quantity: 20000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 20000 }],
        },
        {
          employeeId: 'zsm-2',
          quantity: 15000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 15000 }],
        },
        {
          employeeId: 'zsm-3',
          quantity: 5000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 5000 }],
        },
      ];

      const result = await service.allocateToChildren('parent-alloc-1', childrenInput, 'user-1');
      expect(result.allocatedSum).toBe(40000);
    });

    it('FAIL: should reject when children Brand A allocations exceed parent quota (45,000 > 40,000)', async () => {
      mockPrismaService.targetAllocation.findUnique.mockResolvedValue({
        id: 'parent-alloc-1',
        targetPlanId: 'plan-1',
        quantity: 100000,
        unit: 'CTN',
        status: TargetStatus.ASSIGNED,
        employee: {
          id: 'rsm-1',
          name: 'RSM 001',
          children: [{ id: 'zsm-1' }, { id: 'zsm-2' }, { id: 'zsm-3' }],
        },
      });

      mockPrismaService.targetAllocation.findMany.mockResolvedValue([
        { brandId: 'brand-a', quantity: 40000, brand: { name: 'Brand A' } },
      ]);

      const childrenInput = [
        {
          employeeId: 'zsm-1',
          quantity: 20000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 20000 }],
        },
        {
          employeeId: 'zsm-2',
          quantity: 15000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 15000 }],
        },
        {
          employeeId: 'zsm-3',
          quantity: 10000,
          brandBreakdown: [{ brandId: 'brand-a', quantity: 10000 }],
        },
      ];

      await expect(
        service.allocateToChildren('parent-alloc-1', childrenInput, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

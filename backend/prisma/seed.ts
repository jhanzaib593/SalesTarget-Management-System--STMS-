import { PrismaClient, RoleType, TargetStatus, PeriodStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FMCG STMS database...');

  // 1. Roles
  const rolesData: { name: RoleType; description: string }[] = [
    { name: RoleType.SUPER_ADMIN, description: 'Super Administrator with full system control' },
    { name: RoleType.SALES_OPERATIONS, description: 'Sales Operations Manager - sets and finalizes targets' },
    { name: RoleType.RSM, description: 'Regional Sales Manager - allocates to ZSMs' },
    { name: RoleType.ZSM, description: 'Zonal Sales Manager - allocates to ASMs' },
    { name: RoleType.ASM, description: 'Area Sales Manager - allocates to TSMs' },
    { name: RoleType.TSM, description: 'Territory Sales Manager - allocates to Order Bookers' },
    { name: RoleType.ORDER_BOOKER, description: 'Order Booker - front-line sales execution' },
    { name: RoleType.VIEWER, description: 'Read-only access to authorized reports' },
  ];

  const roleMap = new Map<RoleType, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap.set(r.name, role.id);
  }

  // 2. Division & Regions
  const division = await prisma.division.upsert({
    where: { code: 'DIV-FOODS' },
    update: {},
    create: {
      code: 'DIV-FOODS',
      name: 'FMCG Foods & Refreshments Division',
    },
  });

  const regionsData = [
    { code: 'REG-NORTH', name: 'North Region' },
    { code: 'REG-SOUTH', name: 'South Region' },
    { code: 'REG-CENTRAL', name: 'Central Region' },
    { code: 'REG-WEST', name: 'West Region' },
  ];

  const regionMap = new Map<string, string>();
  for (const reg of regionsData) {
    const r = await prisma.region.upsert({
      where: { code: reg.code },
      update: {},
      create: {
        code: reg.code,
        name: reg.name,
        divisionId: division.id,
      },
    });
    regionMap.set(reg.code, r.id);
  }

  // 3. Brands & Categories & Products
  const brandsData = [
    { code: 'BRD-A', name: 'Brand A - Sparkling Cola', description: 'Carbonated beverages line', color: '#ef4444' },
    { code: 'BRD-B', name: 'Brand B - Crispy Snacks', description: 'Potato chips & extruded snacks', color: '#f59e0b' },
    { code: 'BRD-C', name: 'Brand C - Valley Dairy', description: 'UHT milk & dairy juices', color: '#3b82f6' },
    { code: 'BRD-D', name: 'Brand D - Sweet Delights', description: 'Chocolates & biscuits', color: '#8b5cf6' },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { code: b.code },
      update: { color: b.color, name: b.name },
      create: b,
    });
    brandMap.set(b.code, brand.id);

    // Create Category & Product for each brand
    const cat = await prisma.category.upsert({
      where: { code: `CAT-${b.code}` },
      update: {},
      create: {
        code: `CAT-${b.code}`,
        name: `${b.name} Standard Pack`,
        brandId: brand.id,
      },
    });

    await prisma.product.upsert({
      where: { code: `SKU-${b.code}-01` },
      update: {},
      create: {
        code: `SKU-${b.code}-01`,
        name: `${b.name} 500ml/Pack 24x`,
        sku: `SKU-${b.code}-01`,
        unit: 'CTN',
        categoryId: cat.id,
      },
    });
  }

  // 4. Default Password Hash
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 5. System Users
  // Super Admin
  const superAdminRole = roleMap.get(RoleType.SUPER_ADMIN)!;
  await prisma.user.upsert({
    where: { email: 'admin@fmcg-stms.com' },
    update: {},
    create: {
      email: 'admin@fmcg-stms.com',
      name: 'System Super Admin',
      passwordHash,
      roleId: superAdminRole,
    },
  });

  // Sales Operations
  const salesOpsRole = roleMap.get(RoleType.SALES_OPERATIONS)!;
  const salesOpsEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-SO-001' },
    update: {},
    create: {
      employeeCode: 'EMP-SO-001',
      name: 'Sarah Jenkins (Sales Ops Lead)',
      email: 'sales.ops@fmcg-stms.com',
      mobile: '+1-555-0100',
      roleId: salesOpsRole,
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales.ops@fmcg-stms.com' },
    update: { employeeId: salesOpsEmployee.id },
    create: {
      email: 'sales.ops@fmcg-stms.com',
      name: 'Sarah Jenkins (Sales Ops Lead)',
      passwordHash,
      roleId: salesOpsRole,
      employeeId: salesOpsEmployee.id,
    },
  });

  // 6. Hierarchy Setup: RSM -> ZSM -> ASM -> TSM -> Order Booker
  const rsmRole = roleMap.get(RoleType.RSM)!;
  const zsmRole = roleMap.get(RoleType.ZSM)!;
  const asmRole = roleMap.get(RoleType.ASM)!;
  const tsmRole = roleMap.get(RoleType.TSM)!;
  const obRole = roleMap.get(RoleType.ORDER_BOOKER)!;

  // RSM 001 - North Region
  const rsm001 = await prisma.employee.upsert({
    where: { employeeCode: 'RSM-001' },
    update: {},
    create: {
      employeeCode: 'RSM-001',
      name: 'Robert Stark (RSM North)',
      email: 'rsm001@fmcg-stms.com',
      mobile: '+1-555-0101',
      roleId: rsmRole,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'rsm001@fmcg-stms.com' },
    update: { employeeId: rsm001.id },
    create: {
      email: 'rsm001@fmcg-stms.com',
      name: 'Robert Stark (RSM North)',
      passwordHash,
      roleId: rsmRole,
      employeeId: rsm001.id,
    },
  });

  // RSM 002, 003, 004
  const otherRsms = [
    { code: 'RSM-002', name: 'Elena Vance (RSM South)', email: 'rsm002@fmcg-stms.com', reg: 'REG-SOUTH' },
    { code: 'RSM-003', name: 'Marcus Brody (RSM Central)', email: 'rsm003@fmcg-stms.com', reg: 'REG-CENTRAL' },
    { code: 'RSM-004', name: 'Sophia Chen (RSM West)', email: 'rsm004@fmcg-stms.com', reg: 'REG-WEST' },
  ];
  for (const r of otherRsms) {
    const emp = await prisma.employee.upsert({
      where: { employeeCode: r.code },
      update: {},
      create: {
        employeeCode: r.code,
        name: r.name,
        email: r.email,
        mobile: '+1-555-0102',
        roleId: rsmRole,
        regionId: regionMap.get(r.reg),
      },
    });
    await prisma.user.upsert({
      where: { email: r.email },
      update: { employeeId: emp.id },
      create: {
        email: r.email,
        name: r.name,
        passwordHash,
        roleId: rsmRole,
        employeeId: emp.id,
      },
    });
  }

  // ZSMs under RSM-001
  const zsm001 = await prisma.employee.upsert({
    where: { employeeCode: 'ZSM-001' },
    update: {},
    create: {
      employeeCode: 'ZSM-001',
      name: 'Tariq Mehmood (ZSM Metro)',
      email: 'zsm001@fmcg-stms.com',
      mobile: '+1-555-0201',
      roleId: zsmRole,
      parentEmployeeId: rsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'zsm001@fmcg-stms.com' },
    update: { employeeId: zsm001.id },
    create: {
      email: 'zsm001@fmcg-stms.com',
      name: 'Tariq Mehmood (ZSM Metro)',
      passwordHash,
      roleId: zsmRole,
      employeeId: zsm001.id,
    },
  });

  const zsm002 = await prisma.employee.upsert({
    where: { employeeCode: 'ZSM-002' },
    update: {},
    create: {
      employeeCode: 'ZSM-002',
      name: 'Zainab Qureshi (ZSM Hills)',
      email: 'zsm002@fmcg-stms.com',
      mobile: '+1-555-0202',
      roleId: zsmRole,
      parentEmployeeId: rsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'zsm002@fmcg-stms.com' },
    update: { employeeId: zsm002.id },
    create: {
      email: 'zsm002@fmcg-stms.com',
      name: 'Zainab Qureshi (ZSM Hills)',
      passwordHash,
      roleId: zsmRole,
      employeeId: zsm002.id,
    },
  });

  const zsm003 = await prisma.employee.upsert({
    where: { employeeCode: 'ZSM-003' },
    update: {},
    create: {
      employeeCode: 'ZSM-003',
      name: 'Imran Farooq (ZSM Plains)',
      email: 'zsm003@fmcg-stms.com',
      mobile: '+1-555-0203',
      roleId: zsmRole,
      parentEmployeeId: rsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'zsm003@fmcg-stms.com' },
    update: { employeeId: zsm003.id },
    create: {
      email: 'zsm003@fmcg-stms.com',
      name: 'Imran Farooq (ZSM Plains)',
      passwordHash,
      roleId: zsmRole,
      employeeId: zsm003.id,
    },
  });

  // ASMs under ZSM-001
  const asm001 = await prisma.employee.upsert({
    where: { employeeCode: 'ASM-001' },
    update: {},
    create: {
      employeeCode: 'ASM-001',
      name: 'Ali Raza (ASM North-A)',
      email: 'asm001@fmcg-stms.com',
      mobile: '+1-555-0301',
      roleId: asmRole,
      parentEmployeeId: zsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'asm001@fmcg-stms.com' },
    update: { employeeId: asm001.id },
    create: {
      email: 'asm001@fmcg-stms.com',
      name: 'Ali Raza (ASM North-A)',
      passwordHash,
      roleId: asmRole,
      employeeId: asm001.id,
    },
  });

  const asm002 = await prisma.employee.upsert({
    where: { employeeCode: 'ASM-002' },
    update: {},
    create: {
      employeeCode: 'ASM-002',
      name: 'Hamza Malik (ASM North-B)',
      email: 'asm002@fmcg-stms.com',
      mobile: '+1-555-0302',
      roleId: asmRole,
      parentEmployeeId: zsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'asm002@fmcg-stms.com' },
    update: { employeeId: asm002.id },
    create: {
      email: 'asm002@fmcg-stms.com',
      name: 'Hamza Malik (ASM North-B)',
      passwordHash,
      roleId: asmRole,
      employeeId: asm002.id,
    },
  });

  // TSMs under ASM-001
  const tsm001 = await prisma.employee.upsert({
    where: { employeeCode: 'TSM-001' },
    update: {},
    create: {
      employeeCode: 'TSM-001',
      name: 'Kashif Mehmood (TSM Downtown)',
      email: 'tsm001@fmcg-stms.com',
      mobile: '+1-555-0401',
      roleId: tsmRole,
      parentEmployeeId: asm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'tsm001@fmcg-stms.com' },
    update: { employeeId: tsm001.id },
    create: {
      email: 'tsm001@fmcg-stms.com',
      name: 'Kashif Mehmood (TSM Downtown)',
      passwordHash,
      roleId: tsmRole,
      employeeId: tsm001.id,
    },
  });

  const tsm002 = await prisma.employee.upsert({
    where: { employeeCode: 'TSM-002' },
    update: {},
    create: {
      employeeCode: 'TSM-002',
      name: 'Bilal Ahmed (TSM Midtown)',
      email: 'tsm002@fmcg-stms.com',
      mobile: '+1-555-0402',
      roleId: tsmRole,
      parentEmployeeId: asm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'tsm002@fmcg-stms.com' },
    update: { employeeId: tsm002.id },
    create: {
      email: 'tsm002@fmcg-stms.com',
      name: 'Bilal Ahmed (TSM Midtown)',
      passwordHash,
      roleId: tsmRole,
      employeeId: tsm002.id,
    },
  });

  // Order Bookers under TSM-001
  const ob001 = await prisma.employee.upsert({
    where: { employeeCode: 'OB-001' },
    update: {},
    create: {
      employeeCode: 'OB-001',
      name: 'Usman Ali (OB Route 1)',
      email: 'ob001@fmcg-stms.com',
      mobile: '+1-555-0501',
      roleId: obRole,
      parentEmployeeId: tsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'ob001@fmcg-stms.com' },
    update: { employeeId: ob001.id },
    create: {
      email: 'ob001@fmcg-stms.com',
      name: 'Usman Ali (OB Route 1)',
      passwordHash,
      roleId: obRole,
      employeeId: ob001.id,
    },
  });

  const ob002 = await prisma.employee.upsert({
    where: { employeeCode: 'OB-002' },
    update: {},
    create: {
      employeeCode: 'OB-002',
      name: 'Danish Khan (OB Route 2)',
      email: 'ob002@fmcg-stms.com',
      mobile: '+1-555-0502',
      roleId: obRole,
      parentEmployeeId: tsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'ob002@fmcg-stms.com' },
    update: { employeeId: ob002.id },
    create: {
      email: 'ob002@fmcg-stms.com',
      name: 'Danish Khan (OB Route 2)',
      passwordHash,
      roleId: obRole,
      employeeId: ob002.id,
    },
  });

  const ob003 = await prisma.employee.upsert({
    where: { employeeCode: 'OB-003' },
    update: {},
    create: {
      employeeCode: 'OB-003',
      name: 'Fahad Siddiqui (OB Route 3)',
      email: 'ob003@fmcg-stms.com',
      mobile: '+1-555-0503',
      roleId: obRole,
      parentEmployeeId: tsm001.id,
      regionId: regionMap.get('REG-NORTH'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'ob003@fmcg-stms.com' },
    update: { employeeId: ob003.id },
    create: {
      email: 'ob003@fmcg-stms.com',
      name: 'Fahad Siddiqui (OB Route 3)',
      passwordHash,
      roleId: obRole,
      employeeId: ob003.id,
    },
  });

  // 7. Target Period: January 2027
  const janPeriod = await prisma.targetPeriod.upsert({
    where: {
      year_month: {
        year: 2027,
        month: 1,
      },
    },
    update: {},
    create: {
      year: 2027,
      month: 1,
      startDate: new Date('2027-01-01T00:00:00Z'),
      endDate: new Date('2027-01-31T23:59:59Z'),
      status: PeriodStatus.ACTIVE,
    },
  });

  // 8. Target Plan for Jan 2027: 1,000,000 CTNs
  const plan = await prisma.targetPlan.create({
    data: {
      targetPeriodId: janPeriod.id,
      divisionId: division.id,
      title: 'January 2027 National FMCG Target',
      totalTarget: 1000000,
      unit: 'CTN',
      status: TargetStatus.ASSIGNED,
      version: 1,
      createdBy: salesOpsEmployee.id,
    },
  });

  // 9. Assign Target to 4 RSMs
  // RSM-001 = 100,000 CTNs (with brand breakdown: A=40k, B=30k, C=20k, D=10k)
  // RSM-002 = 200,000 CTNs
  // RSM-003 = 300,000 CTNs
  // RSM-004 = 400,000 CTNs
  const rsm1Alloc = await prisma.targetAllocation.create({
    data: {
      targetPlanId: plan.id,
      employeeId: rsm001.id,
      quantity: 100000,
      unit: 'CTN',
      status: TargetStatus.ASSIGNED,
      createdBy: salesOpsEmployee.id,
    },
  });

  // Create brand allocations for RSM 001
  const brandAId = brandMap.get('BRD-A')!;
  const brandBId = brandMap.get('BRD-B')!;
  const brandCId = brandMap.get('BRD-C')!;
  const brandDId = brandMap.get('BRD-D')!;

  await prisma.targetAllocation.createMany({
    data: [
      { targetPlanId: plan.id, parentAllocationId: rsm1Alloc.id, employeeId: rsm001.id, brandId: brandAId, quantity: 40000, status: TargetStatus.ASSIGNED },
      { targetPlanId: plan.id, parentAllocationId: rsm1Alloc.id, employeeId: rsm001.id, brandId: brandBId, quantity: 30000, status: TargetStatus.ASSIGNED },
      { targetPlanId: plan.id, parentAllocationId: rsm1Alloc.id, employeeId: rsm001.id, brandId: brandCId, quantity: 20000, status: TargetStatus.ASSIGNED },
      { targetPlanId: plan.id, parentAllocationId: rsm1Alloc.id, employeeId: rsm001.id, brandId: brandDId, quantity: 10000, status: TargetStatus.ASSIGNED },
    ],
  });

  // Other RSM Allocations
  const rsm2Emp = await prisma.employee.findUnique({ where: { employeeCode: 'RSM-002' } });
  const rsm3Emp = await prisma.employee.findUnique({ where: { employeeCode: 'RSM-003' } });
  const rsm4Emp = await prisma.employee.findUnique({ where: { employeeCode: 'RSM-004' } });

  if (rsm2Emp) {
    await prisma.targetAllocation.create({
      data: { targetPlanId: plan.id, employeeId: rsm2Emp.id, quantity: 200000, unit: 'CTN', status: TargetStatus.ASSIGNED, createdBy: salesOpsEmployee.id },
    });
  }
  if (rsm3Emp) {
    await prisma.targetAllocation.create({
      data: { targetPlanId: plan.id, employeeId: rsm3Emp.id, quantity: 300000, unit: 'CTN', status: TargetStatus.ASSIGNED, createdBy: salesOpsEmployee.id },
    });
  }
  if (rsm4Emp) {
    await prisma.targetAllocation.create({
      data: { targetPlanId: plan.id, employeeId: rsm4Emp.id, quantity: 400000, unit: 'CTN', status: TargetStatus.ASSIGNED, createdBy: salesOpsEmployee.id },
    });
  }

  // Create initial audit log
  const salesOpsUser = await prisma.user.findUnique({ where: { email: 'sales.ops@fmcg-stms.com' } });
  if (salesOpsUser) {
    await prisma.auditLog.create({
      data: {
        userId: salesOpsUser.id,
        action: 'TARGET_PLAN_CREATED',
        entityType: 'TargetPlan',
        entityId: plan.id,
        newValues: {
          title: plan.title,
          totalTarget: 1000000,
          period: 'January 2027',
        },
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export type RoleType =
  | 'SUPER_ADMIN'
  | 'SALES_OPERATIONS'
  | 'RSM'
  | 'ZSM'
  | 'ASM'
  | 'TSM'
  | 'ORDER_BOOKER'
  | 'VIEWER';

export type TargetStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUIRED'
  | 'FINALIZED'
  | 'EXPORTED'
  | 'UPLOADED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export interface User {
  id: string;
  email: string;
  name: string;
  employeeId?: string;
  roleId: string;
  role: {
    id: string;
    name: RoleType;
    description?: string;
  };
  employee?: Employee;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  mobile?: string;
  roleId: string;
  parentEmployeeId?: string;
  regionId?: string;
  territoryId?: string;
  status: string;
  role: {
    id: string;
    name: RoleType;
  };
  parent?: {
    id: string;
    name: string;
    employeeCode: string;
  };
  region?: {
    id: string;
    code: string;
    name: string;
  };
  territory?: {
    id: string;
    code: string;
    name: string;
  };
  children?: Employee[];
}

export interface Brand {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  status: string;
}

export interface TargetPeriod {
  id: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

export interface TargetPlan {
  id: string;
  targetPeriodId: string;
  divisionId?: string;
  regionId?: string;
  title: string;
  totalTarget: number;
  unit: string;
  status: TargetStatus;
  version: number;
  allocatedSum?: number;
  remaining?: number;
  completionPercentage?: number;
  period: TargetPeriod;
  division?: { id: string; name: string; code: string };
  region?: { id: string; name: string; code: string };
  rsmAllocations?: any[];
}

export interface ConsolidatedTargetRow {
  id: string;
  planTitle: string;
  period: string;
  year: number;
  month: number;
  division: string;
  region: string;
  employeeCode: string;
  employeeName: string;
  role: RoleType;
  rsm: string;
  zsm: string;
  asm: string;
  tsm: string;
  orderBooker: string;
  brandCode: string;
  brandName: string;
  brandColor?: string;
  quantity: number;
  unit: string;
  status: TargetStatus;
  version: number;
}

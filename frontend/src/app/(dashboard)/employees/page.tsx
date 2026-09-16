'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Users2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Network,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  Shield,
  MapPin,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';

interface EmployeeForm {
  id?: string;
  employeeCode: string;
  name: string;
  email: string;
  mobile: string;
  roleName: string;
  parentEmployeeId: string;
  regionId: string;
  status: string;
}

const initialForm: EmployeeForm = {
  employeeCode: '',
  name: '',
  email: '',
  mobile: '',
  roleName: 'RSM',
  parentEmployeeId: '',
  regionId: '',
  status: 'ACTIVE',
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSalesOps = user?.role?.name === 'SALES_OPERATIONS' || user?.role?.name === 'SUPER_ADMIN';

  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeForm | null>(null);
  const [formData, setFormData] = useState<EmployeeForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Queries
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', roleFilter, search, page],
    queryFn: () => ApiClient.getEmployees({ role: roleFilter, search, page, limit: 50 }),
  });

  const { data: allEmployeesRes } = useQuery({
    queryKey: ['allEmployeesList'],
    queryFn: () => ApiClient.getEmployees({ limit: 200 }),
  });

  const { data: hierarchyTree = [] } = useQuery({
    queryKey: ['hierarchyTree'],
    queryFn: () => ApiClient.getHierarchyTree(),
    enabled: viewMode === 'tree',
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => ApiClient.getRegions(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => ApiClient.getRoles(),
  });

  const employees = employeesData?.items || [];
  const allEmployeesList = allEmployeesRes?.items || [];

  // Helper to suggest appropriate managers for the selected role
  const getCandidateManagers = (currentRole: string, currentEmpId?: string) => {
    let targetRoles: string[] = [];
    if (currentRole === 'ZSM') targetRoles = ['RSM'];
    else if (currentRole === 'ASM') targetRoles = ['ZSM'];
    else if (currentRole === 'TSM') targetRoles = ['ASM', 'ZSM'];
    else if (currentRole === 'ORDER_BOOKER') targetRoles = ['TSM', 'ASM'];
    else if (currentRole === 'RSM') targetRoles = ['SALES_OPERATIONS', 'SUPER_ADMIN'];

    return allEmployeesList.filter((emp: any) => {
      if (currentEmpId && emp.id === currentEmpId) return false;
      if (targetRoles.length === 0) return true;
      return targetRoles.includes(emp.role?.name);
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormData({
      employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      email: '',
      mobile: '',
      roleName: 'RSM',
      parentEmployeeId: '',
      regionId: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({
      id: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      mobile: emp.mobile || '',
      roleName: emp.role?.name || 'RSM',
      parentEmployeeId: emp.parent?.id || emp.parentEmployeeId || '',
      regionId: emp.region?.id || emp.regionId || '',
      status: emp.status || 'ACTIVE',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) throw new Error('Employee name is required');
      if (!formData.employeeCode.trim()) throw new Error('Employee code is required');
      if (!formData.email.trim()) throw new Error('Email address is required');

      if (editingEmployee && formData.id) {
        return ApiClient.updateEmployee(formData.id, {
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          roleName: formData.roleName,
          parentEmployeeId: formData.parentEmployeeId || null,
          regionId: formData.regionId || null,
          status: formData.status,
        });
      } else {
        return ApiClient.createEmployee({
          employeeCode: formData.employeeCode,
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          roleName: formData.roleName,
          parentEmployeeId: formData.parentEmployeeId || null,
          regionId: formData.regionId || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['allEmployeesList'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchyTree'] });
      setIsModalOpen(false);
      setSuccessToast(editingEmployee ? 'Employee updated successfully!' : 'New employee created & login activated!');
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save employee');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => ApiClient.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['allEmployeesList'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchyTree'] });
      setSuccessToast('Employee marked as INACTIVE');
      setTimeout(() => setSuccessToast(null), 4000);
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Organizational Hierarchy
            </span>
            <span className="text-xs text-slate-400">• {employeesData?.total || 0} Total Records</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Employees & Hierarchy</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tier field hierarchy: Sales Ops → RSM → ZSM → ASM → TSM → Order Booker.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'tree' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
          </div>

          {/* Add Employee Button */}
          {isSalesOps && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Filter Bar (Table View) */}
      {viewMode === 'table' && (
        <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, employee code, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Hierarchy Tiers</option>
              <option value="SALES_OPERATIONS">Sales Operations</option>
              <option value="RSM">RSM (Regional Sales Manager)</option>
              <option value="ZSM">ZSM (Zonal Sales Manager)</option>
              <option value="ASM">ASM (Area Sales Manager)</option>
              <option value="TSM">TSM (Territory Sales Manager)</option>
              <option value="ORDER_BOOKER">Order Booker</option>
            </select>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="glass-card rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading employee hierarchy...
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No employees match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="p-3.5 font-semibold">Code</th>
                    <th className="p-3.5 font-semibold">Employee Name</th>
                    <th className="p-3.5 font-semibold">Role Tier</th>
                    <th className="p-3.5 font-semibold">Reporting Manager</th>
                    <th className="p-3.5 font-semibold">Region / Territory</th>
                    <th className="p-3.5 font-semibold text-center">Subordinates</th>
                    <th className="p-3.5 font-semibold text-center">Status</th>
                    {isSalesOps && <th className="p-3.5 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-indigo-400">{emp.employeeCode}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-white">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-bold">
                          {emp.role?.name}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {emp.parent ? (
                          <div>
                            <p className="font-medium text-white">{emp.parent.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{emp.parent.employeeCode}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None (Root / Top-Tier)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {emp.region?.name || 'National'} {emp.territory?.name ? `• ${emp.territory.name}` : ''}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-cyan-400">
                        {emp._count?.children || 0}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={emp.status} />
                      </td>
                      {isSalesOps && (
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {emp.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Deactivate ${emp.name}?`)) {
                                    deleteMutation.mutate(emp.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition-colors"
                                title="Deactivate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tree View */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            Click on any branch to inspect subordinates. Hierarchical reporting structure cascades from Regional Sales Managers (RSM) down to Order Bookers.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hierarchyTree.map((rsm: any) => (
              <TreeNode key={rsm.id} node={rsm} onEdit={handleOpenEdit} isSalesOps={isSalesOps} />
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingEmployee ? 'Edit Sales Employee' : 'Add New Sales Employee'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure hierarchy reporting line, credentials, and regional placement.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    disabled={!!editingEmployee}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. RSM-005, ZSM-004"
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 disabled:opacity-50 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hierarchy Role Tier *</label>
                  <select
                    value={formData.roleName}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({ ...formData, roleName: newRole, parentEmployeeId: '' });
                    }}
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="RSM">RSM (Regional Sales Manager)</option>
                    <option value="ZSM">ZSM (Zonal Sales Manager)</option>
                    <option value="ASM">ASM (Area Sales Manager)</option>
                    <option value="TSM">TSM (Territory Sales Manager)</option>
                    <option value="ORDER_BOOKER">Order Booker</option>
                    <option value="SALES_OPERATIONS">Sales Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Henderson"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="alex@fmcg-stms.com"
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+1-555-0199"
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reporting Line Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reporting Manager (Parent in Hierarchy)
                </label>
                <select
                  value={formData.parentEmployeeId}
                  onChange={(e) => setFormData({ ...formData, parentEmployeeId: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">None (Top-Level Executive)</option>
                  {getCandidateManagers(formData.roleName, formData.id).map((mgr: any) => (
                    <option key={mgr.id} value={mgr.id}>
                      [{mgr.role?.name}] {mgr.name} ({mgr.employeeCode})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Target cascading flows directly from this manager to the employee.
                </p>
              </div>

              {/* Region Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Region</label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">National / Head Office</option>
                  {regions.map((reg: any) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code})
                    </option>
                  ))}
                </select>
              </div>

              {editingEmployee && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              {!editingEmployee && (
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                  <UserCheck className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  <span>
                    A login account will be automatically created with default password <strong className="text-white">Password@123</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-glow transition-all"
              >
                {saveMutation.isPending ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive Tree Node Card
function TreeNode({ node, onEdit, isSalesOps }: { node: any; onEdit: (node: any) => void; isSalesOps: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="glass-card rounded-xl p-4 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {hasChildren && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {node.role?.name}
              </span>
              <span className="font-semibold text-white text-xs">{node.name}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {node.employeeCode} • {node.region?.name || 'National'}
            </p>
          </div>
        </div>

        {isSalesOps && (
          <button
            onClick={() => onEdit(node)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="pl-4 border-l border-indigo-500/20 space-y-2 pt-1">
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} onEdit={onEdit} isSalesOps={isSalesOps} />
          ))}
        </div>
      )}
    </div>
  );
}

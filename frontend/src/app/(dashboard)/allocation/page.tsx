'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Target,
  CheckCircle2,
  AlertCircle,
  Layers,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Info,
  Building,
  ArrowRight,
  UserCheck,
  Package,
} from 'lucide-react';

export default function AllocationWorkbenchPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSalesOps = user?.role?.name === 'SALES_OPERATIONS' || user?.role?.name === 'SUPER_ADMIN';

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [childrenInputs, setChildrenInputs] = useState<Record<string, number>>({});
  const [brandInputs, setBrandInputs] = useState<Record<string, Record<string, number>>>({});
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [comments, setComments] = useState('');

  // Fetch all RSMs & employees for Sales Ops switcher
  const { data: allEmployeesRes } = useQuery({
    queryKey: ['allEmployeesList'],
    queryFn: () => ApiClient.getEmployees({ limit: 100 }),
    enabled: isSalesOps,
  });
  const allEmployees = allEmployeesRes?.items || [];

  // Fetch active brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => ApiClient.getBrands(),
  });

  // Effective employee ID for workbench
  const effectiveEmployeeId = (isSalesOps && selectedEmployeeId) ? selectedEmployeeId : user?.employeeId;

  // Fetch workbench data
  const { data: workbench, isLoading } = useQuery({
    queryKey: ['workbench', effectiveEmployeeId, user?.id],
    queryFn: async () => {
      return ApiClient.getAllocationWorkbench(effectiveEmployeeId);
    },
    enabled: !!effectiveEmployeeId || !isSalesOps,
  });

  // Set default selected employee for Sales Ops if none selected
  useEffect(() => {
    if (isSalesOps && !selectedEmployeeId && allEmployees.length > 0) {
      const firstRsm = allEmployees.find((e: any) => e.role?.name === 'RSM');
      if (firstRsm) {
        setSelectedEmployeeId(firstRsm.id);
      }
    }
  }, [isSalesOps, selectedEmployeeId, allEmployees]);

  // Hydrate local state when workbench data loads
  useEffect(() => {
    if (workbench && workbench.childrenTable) {
      const initQtys: Record<string, number> = {};
      const initBrands: Record<string, Record<string, number>> = {};

      workbench.childrenTable.forEach((row: any) => {
        initQtys[row.childEmployee.id] = row.quantity || 0;

        initBrands[row.childEmployee.id] = {};
        if (row.brandBreakdown && row.brandBreakdown.length > 0) {
          row.brandBreakdown.forEach((b: any) => {
            initBrands[row.childEmployee.id][b.brandId] = b.quantity || 0;
          });
        }
      });

      setChildrenInputs(initQtys);
      setBrandInputs(initBrands);
      setClientError(null);
    }
  }, [workbench]);

  // Derived Calculations
  const parentTarget = workbench?.totalTarget || 0;
  const currentTotalAllocated = Object.values(childrenInputs).reduce((s, v) => s + (Number(v) || 0), 0);
  const remainingTarget = parentTarget - currentTotalAllocated;
  const completionPercentage = parentTarget > 0 ? Math.min(100, Math.round((currentTotalAllocated / parentTarget) * 100)) : 0;
  const isOverAllocated = currentTotalAllocated > parentTarget;

  // Validation Check
  const validateAllocations = () => {
    if (isOverAllocated) {
      const excess = currentTotalAllocated - parentTarget;
      return `Allocation exceeds the available parent target by ${excess.toLocaleString()} CTNs.`;
    }

    // Validate brand limits if parent has brand quotas
    if (workbench?.myBrandBreakdown && workbench.myBrandBreakdown.length > 0) {
      for (const pb of workbench.myBrandBreakdown) {
        let brandSum = 0;
        Object.values(brandInputs).forEach((childB) => {
          brandSum += Number(childB[pb.brandId] || 0);
        });

        if (brandSum > pb.quantity) {
          const excess = brandSum - pb.quantity;
          return `${pb.brandName} allocation exceeds the parent target by ${excess.toLocaleString()} CTNs. (Parent: ${pb.quantity.toLocaleString()}, Children: ${brandSum.toLocaleString()})`;
        }
      }
    }

    return null;
  };

  // Save Allocation Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const error = validateAllocations();
      if (error) throw new Error(error);

      if (!workbench?.allocation?.id) {
        throw new Error('No target allocation record found for this employee level.');
      }

      const payload = Object.entries(childrenInputs).map(([childEmpId, qty]) => {
        const childBrandMap = brandInputs[childEmpId] || {};
        const breakdown = Object.entries(childBrandMap)
          .filter(([_, bQty]) => Number(bQty) > 0)
          .map(([brandId, bQty]) => ({
            brandId,
            quantity: Number(bQty),
          }));

        return {
          employeeId: childEmpId,
          quantity: Number(qty),
          brandBreakdown: breakdown.length > 0 ? breakdown : undefined,
        };
      });

      return ApiClient.allocateToChildren(workbench.allocation.id, payload);
    },
    onSuccess: () => {
      setSuccessMessage('Allocations saved successfully!');
      setClientError(null);
      queryClient.invalidateQueries({ queryKey: ['workbench'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setClientError(err.message || 'Failed to save allocations');
      setSuccessMessage(null);
    },
  });

  // Submit Allocation Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const error = validateAllocations();
      if (error) throw new Error(error);

      if (!workbench?.allocation?.id) {
        throw new Error('No target allocation record found.');
      }

      // First save current inputs
      await saveMutation.mutateAsync();
      // Then submit for approval
      return ApiClient.submitAllocation(workbench.allocation.id, comments);
    },
    onSuccess: () => {
      setSuccessMessage('Target allocation submitted for managerial review!');
      setClientError(null);
      queryClient.invalidateQueries({ queryKey: ['workbench'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (err: any) => {
      setClientError(err.message || 'Failed to submit allocation');
    },
  });

  const handleChildQtyChange = (childId: string, val: number) => {
    setChildrenInputs((prev) => ({ ...prev, [childId]: val }));
    setClientError(null);
  };

  const handleChildBrandChange = (childId: string, brandId: string, val: number) => {
    setBrandInputs((prev) => {
      const childObj = { ...(prev[childId] || {}) };
      childObj[brandId] = val;

      // Auto-update total child quantity to sum of brands if user is allocating brand-wise
      const brandSum = Object.values(childObj).reduce((s, v) => s + (Number(v) || 0), 0);
      setChildrenInputs((prevQ) => ({ ...prevQ, [childId]: brandSum }));

      return {
        ...prev,
        [childId]: childObj,
      };
    });
    setClientError(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-32 bg-slate-800/60 rounded-xl" />
        <div className="h-64 bg-slate-800/40 rounded-xl" />
      </div>
    );
  }

  const emp = workbench?.employee;
  const alloc = workbench?.allocation;
  const children = workbench?.childrenTable || [];
  const roleName = emp?.role?.name || user?.role?.name;
  const isOrderBooker = roleName === 'ORDER_BOOKER';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Sales Ops Inspector Switcher */}
      {isSalesOps && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/20">
          <div className="flex items-center gap-2 text-xs text-indigo-300">
            <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-white">Sales Ops Control:</strong> Inspecting allocation workbench for:
            </span>
          </div>

          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {allEmployees.map((e: any) => (
              <option key={e.id} value={e.id}>
                [{e.role?.name}] {e.name} ({e.employeeCode})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {roleName} Tier Allocation Workbench
            </span>
            <StatusBadge status={alloc?.status || 'ASSIGNED'} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {emp?.name} <span className="text-slate-400 font-mono text-lg">({emp?.employeeCode})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Period: <strong className="text-white">January 2027</strong> | Target Unit: <strong className="text-white">CTN</strong> | Region: <strong className="text-white">{emp?.region?.name || 'National'}</strong>
          </p>
        </div>

        {/* Action Buttons (for non-Order-Booker roles with children) */}
        {!isOrderBooker && children.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isOverAllocated || !alloc}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Save className="w-4 h-4 text-cyan-400" />
              <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || isOverAllocated || !alloc}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{submitMutation.isPending ? 'Submitting...' : 'Submit Allocation'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Hierarchy Cascading Path Breadcrumb */}
      <div className="glass-card rounded-xl p-3 border border-slate-800 text-xs flex items-center gap-2 overflow-x-auto text-slate-400">
        <span className="font-semibold text-slate-300">Cascading Flow:</span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Sales Ops</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className={`px-2 py-0.5 rounded ${roleName === 'RSM' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}>RSM</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className={`px-2 py-0.5 rounded ${roleName === 'ZSM' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}>ZSM</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className={`px-2 py-0.5 rounded ${roleName === 'ASM' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}>ASM</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className={`px-2 py-0.5 rounded ${roleName === 'TSM' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}>TSM</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className={`px-2 py-0.5 rounded ${roleName === 'ORDER_BOOKER' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}>Order Booker</span>
      </div>

      {/* No Allocation Warning */}
      {!alloc && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold">No Target Allocated to This Employee Yet</p>
            <p className="mt-0.5 text-amber-200/80">
              Targets cascade down the hierarchy. Please ensure the upper-tier manager (or Sales Ops) has assigned and approved targets for this role.
            </p>
          </div>
        </div>
      )}

      {/* Live Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border-l-4 border-indigo-500">
          <p className="text-xs text-slate-400 font-medium">Available Target</p>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {parentTarget.toLocaleString()} <span className="text-xs text-slate-400 font-normal">CTN</span>
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-slate-400 font-medium">
            {isOrderBooker ? 'Execution Progress' : 'Allocated to Subordinates'}
          </p>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {currentTotalAllocated.toLocaleString()} <span className="text-xs text-slate-400 font-normal">CTN</span>
          </p>
        </div>

        <div
          className={`glass-card rounded-xl p-4 border-l-4 ${
            isOverAllocated
              ? 'border-rose-500 bg-rose-500/10'
              : remainingTarget === 0
              ? 'border-emerald-500'
              : 'border-amber-500'
          }`}
        >
          <p className="text-xs text-slate-400 font-medium">Remaining Buffer</p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              isOverAllocated
                ? 'text-rose-400'
                : remainingTarget === 0
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {remainingTarget.toLocaleString()} <span className="text-xs text-slate-400 font-normal">CTN</span>
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Allocation Completion</span>
            <span className="text-white font-bold">{completionPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAllocated ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, completionPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation Banners */}
      {clientError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-shake">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="font-medium">{clientError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Parent Brand Quotas (if applicable) */}
      {workbench?.myBrandBreakdown && workbench.myBrandBreakdown.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Your Assigned Brand Quotas (CTN)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {workbench.myBrandBreakdown.map((b: any) => {
              let assignedBrandTotal = 0;
              Object.values(brandInputs).forEach((childB) => {
                assignedBrandTotal += Number(childB[b.brandId] || 0);
              });
              const remBrand = b.quantity - assignedBrandTotal;
              const isBrandOver = assignedBrandTotal > b.quantity;

              return (
                <div
                  key={b.brandId}
                  className={`p-3 rounded-lg border text-xs ${
                    isBrandOver
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : remBrand === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white truncate">{b.brandName}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                  </div>
                  <div className="flex items-baseline justify-between font-mono mt-2">
                    <span className="text-slate-400 text-[10px]">Quota: {b.quantity.toLocaleString()}</span>
                    <span className="font-bold text-white">{assignedBrandTotal.toLocaleString()}</span>
                  </div>
                  {isBrandOver && (
                    <span className="text-[10px] text-rose-400 font-bold block mt-1">
                      +{(assignedBrandTotal - b.quantity).toLocaleString()} CTN over quota!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Booker Terminal View */}
      {isOrderBooker ? (
        <div className="glass-card rounded-xl p-6 border border-slate-800 text-center space-y-4">
          <Package className="w-12 h-12 text-cyan-400 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-white">Order Booker Execution Terminal</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              You are the front-line sales executor. Your assigned monthly target is {parentTarget.toLocaleString()} CTNs across your designated route and retail accounts.
            </p>
          </div>
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 inline-block text-xs font-mono text-emerald-400">
            Assigned Territory Route: {emp?.region?.name || 'North Sector'} Route 1 (Active)
          </div>
        </div>
      ) : (
        /* Direct Subordinates Allocation Table */
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">
                Direct Subordinates ({children.length}) — {roleName === 'RSM' ? 'ZSM Tier' : roleName === 'ZSM' ? 'ASM Tier' : roleName === 'ASM' ? 'TSM Tier' : 'Order Booker Tier'}
              </h2>
              <p className="text-xs text-slate-400">
                Only direct subordinates in your reporting line are shown. Enter volume target or expand row for brand quotas.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {children.filter((c: any) => (childrenInputs[c.childEmployee.id] || 0) > 0).length} of {children.length} Allocated
            </span>
          </div>

          {children.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No direct child subordinates found in organizational hierarchy for this employee.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {children.map((row: any) => {
                const child = row.childEmployee;
                const isExpanded = expandedChildId === child.id;
                const childQty = childrenInputs[child.id] || 0;
                const childBrands = brandInputs[child.id] || {};

                return (
                  <div key={child.id} className="transition-colors hover:bg-slate-800/20">
                    {/* Row Header */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedChildId(isExpanded ? null : child.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-indigo-400">{child.employeeCode}</span>
                            <span className="text-xs font-bold text-white">{child.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-bold">
                              {child.role.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {child.region?.name || 'National'} {child.territory?.name ? `• ${child.territory.name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <StatusBadge status={row.status} />

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-400 font-medium">Target:</label>
                          <input
                            type="number"
                            value={childQty || ''}
                            onChange={(e) => handleChildQtyChange(child.id, Number(e.target.value))}
                            placeholder="0"
                            className="w-32 h-8 px-3 text-right bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-400 font-mono">CTN</span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Brand-Wise Drawer */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-[#090d16]/80 border-t border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            Brand Allocation for {child.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Sum of brands automatically updates total target.
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {brands.map((b: any) => {
                            const val = childBrands[b.id] || 0;
                            return (
                              <div key={b.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium text-slate-300 truncate">{b.name}</span>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                                </div>
                                <input
                                  type="number"
                                  value={val || ''}
                                  onChange={(e) => handleChildBrandChange(child.id, b.id, Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full h-8 px-3 text-right bg-slate-950 border border-slate-800 rounded text-xs font-mono font-semibold text-white focus:border-indigo-500 focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Submission Comments Dialog */}
      {!isOrderBooker && children.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Submission Notes & Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments for managerial reviewer or Sales Operations..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

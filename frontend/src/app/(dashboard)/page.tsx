'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { TargetCharts } from '../../components/dashboard/TargetCharts';
import { StatusBadge } from '../../components/ui/StatusBadge';
import Link from 'next/link';
import {
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  GitFork,
  CheckSquare,
  TrendingUp,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSalesOps = user?.role?.name === 'SALES_OPERATIONS' || user?.role?.name === 'SUPER_ADMIN';

  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', user?.id, user?.role?.name],
    queryFn: async () => {
      if (isSalesOps) {
        return ApiClient.getSalesOpsDashboard();
      } else {
        return ApiClient.getMyDashboardView();
      }
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-800/40 rounded-xl" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // SALES OPERATIONS EXECUTIVE VIEW
  // -------------------------------------------------------------
  if (isSalesOps) {
    const d = data || {};
    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Sales Operations Executive
              </span>
              <span className="text-xs text-slate-400">• Period: January 2027</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              FMCG Target Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              National sales target allocation, multi-tier validation, and real-time completion tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/planning"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Target Planning Wizard</span>
            </Link>
            <Link
              href="/consolidated"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Consolidated Dataset</span>
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            title="Total Company Target"
            value={d.totalTarget || 0}
            unit="CTNs"
            icon={Target}
            color="indigo"
            change="100% Volume Baseline"
          />
          <KpiCard
            title="Allocated to RSMs"
            value={d.allocatedTarget || 0}
            unit="CTNs"
            icon={CheckCircle2}
            color="emerald"
            progress={d.completionPercentage || 0}
          />
          <KpiCard
            title="Remaining Unallocated"
            value={d.remainingTarget || 0}
            unit="CTNs"
            icon={AlertCircle}
            color={d.remainingTarget > 0 ? 'amber' : 'emerald'}
            change={d.remainingTarget === 0 ? 'Fully Allocated ✓' : `${d.remainingTarget?.toLocaleString()} CTNs buffer remaining`}
            changeType={d.remainingTarget === 0 ? 'positive' : 'neutral'}
          />
          <KpiCard
            title="Pending Approvals"
            value={d.pendingApprovals || 0}
            unit="Requests"
            icon={Clock}
            color="purple"
            change="Awaiting Managerial Review"
          />
        </div>

        {/* Visual Charts */}
        <TargetCharts
          rsmData={d.rsmBreakdown || []}
          brandData={d.brandBreakdown || []}
          hierarchyData={d.hierarchyProgress || []}
        />

        {/* Hierarchy Tier Progress */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Hierarchical Allocation Progress</h3>
              <p className="text-xs text-slate-400">Completion rate of target assignments down the reporting chain</p>
            </div>
            <Link href="/drilldown" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              <span>View Interactive Tree</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {(d.hierarchyProgress || []).map((h: any, idx: number) => (
              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{h.level}</span>
                  <span className="text-xs font-mono text-indigo-400">{h.percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                    style={{ width: `${h.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {h.allocatedEmployees} of {h.totalEmployees} assigned
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FIELD ROLE PERSONA VIEW (RSM, ZSM, ASM, TSM, ORDER BOOKER)
  // -------------------------------------------------------------
  const f = data || {};
  return (
    <div className="space-y-8">
      {/* Field Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {user?.role?.name} Workspace
            </span>
            <StatusBadge status={f.status || 'ASSIGNED'} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Target allocation period: <strong className="text-slate-200">{f.period || 'January 2027'}</strong>. Review target quotas and distribute to direct subordinates.
          </p>
        </div>

        {user?.role?.name !== 'ORDER_BOOKER' && (
          <Link
            href="/allocation"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
          >
            <GitFork className="w-4 h-4" />
            <span>Open Allocation Workbench</span>
          </Link>
        )}
      </div>

      {/* Field KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard
          title="Received Target"
          value={f.myTarget || 0}
          unit="CTNs"
          icon={Target}
          color="indigo"
          change="Assigned by Manager"
        />
        <KpiCard
          title="Allocated to Subordinates"
          value={f.allocatedToChildren || 0}
          unit="CTNs"
          icon={CheckCircle2}
          color="emerald"
          progress={f.completion || 0}
        />
        <KpiCard
          title="Remaining to Allocate"
          value={f.remaining || 0}
          unit="CTNs"
          icon={AlertCircle}
          color={f.remaining > 0 ? 'amber' : 'emerald'}
          change={f.remaining === 0 ? 'All Target Allocated ✓' : `${f.remaining?.toLocaleString()} CTNs remaining`}
          changeType={f.remaining === 0 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Brand Breakdown Pills */}
      {f.brandBreakdown && f.brandBreakdown.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Brand Quotas for Your Territory</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {f.brandBreakdown.map((b: any, idx: number) => (
              <div key={idx} className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-medium">{b.brandName}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                </div>
                <p className="text-lg font-bold text-white font-mono">{b.quantity?.toLocaleString()} <span className="text-xs font-normal text-slate-400">CTN</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subordinates Table (if not Order Booker) */}
      {user?.role?.name !== 'ORDER_BOOKER' && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Direct Subordinate Target Summary</h3>
            <Link href="/allocation" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>Allocate in Workbench</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Employee Code</th>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold text-right">Allocated Target (CTN)</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(f.childrenBreakdown || []).map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono font-medium text-slate-300">{c.employeeCode}</td>
                    <td className="py-3 text-white font-medium">{c.employeeName}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-100">
                      {c.quantity?.toLocaleString()}
                    </td>
                    <td className="py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

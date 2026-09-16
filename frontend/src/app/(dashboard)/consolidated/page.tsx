'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function ConsolidatedTargetPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSalesOps = user?.role?.name === 'SALES_OPERATIONS' || user?.role?.name === 'SUPER_ADMIN';

  // Filter States
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch active plans
  const { data: plans = [] } = useQuery({
    queryKey: ['target-plans'],
    queryFn: () => ApiClient.getTargetPlans(),
  });

  const activePlan = plans[0] || null;

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => ApiClient.getBrands(),
  });

  // Fetch consolidated dataset
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['report', 'consolidated', activePlan?.id, search, brandId, status, page],
    queryFn: () =>
      ApiClient.getConsolidatedReport({
        targetPlanId: activePlan?.id,
        search,
        brandId,
        status,
        page,
        limit: 50,
      }),
    enabled: !!activePlan?.id,
  });

  // Finalize Plan Mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) return;
      return ApiClient.finalizeTargetPlan(activePlan.id);
    },
    onSuccess: () => {
      setFeedback('Target plan successfully finalized and frozen! Version snapshot created.');
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  const handleExportExcel = () => {
    if (!activePlan?.id) return;
    const url = ApiClient.getExportUrl(activePlan.id);
    window.open(url, '_blank');
  };

  const rows = reportData?.items || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Automatically Consolidated
            </span>
            <span className="text-xs text-slate-400">
              • {activePlan?.title || 'January 2027'} (v{activePlan?.version || 1})
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Consolidated Sales Target Dataset
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Central compiled table unifying targets from RSM down to Order Bookers with brand breakdown.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isSalesOps && activePlan?.status !== 'FINALIZED' && (
            <button
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg"
            >
              <Lock className="w-4 h-4" />
              <span>{finalizeMutation.isPending ? 'Finalizing...' : 'Finalize Target Plan'}</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow-emerald transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Generate Final Excel</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, RSM, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="FINALIZED">Finalized</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <strong className="text-white">{rows.length}</strong> of{' '}
          <strong className="text-white">{reportData?.total || 0}</strong> compiled rows
        </div>
      </div>

      {/* Main Consolidated Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Compiling multi-tier target rows...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No consolidated records matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400">
                  <th className="p-3 font-semibold">Period</th>
                  <th className="p-3 font-semibold">Region</th>
                  <th className="p-3 font-semibold">RSM</th>
                  <th className="p-3 font-semibold">ZSM</th>
                  <th className="p-3 font-semibold">ASM</th>
                  <th className="p-3 font-semibold">TSM</th>
                  <th className="p-3 font-semibold">Order Booker</th>
                  <th className="p-3 font-semibold">Brand</th>
                  <th className="p-3 font-semibold text-right">Target Volume</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{r.period}</td>
                    <td className="p-3 text-slate-300">{r.region}</td>
                    <td className="p-3 font-medium text-slate-200">{r.rsm}</td>
                    <td className="p-3 text-slate-300">{r.zsm}</td>
                    <td className="p-3 text-slate-300">{r.asm}</td>
                    <td className="p-3 text-slate-300">{r.tsm}</td>
                    <td className="p-3 font-medium text-white">{r.orderBooker}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.brandColor || '#3b82f6' }} />
                        <span className="text-slate-300 font-medium">{r.brandName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {r.quantity?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{r.unit}</span>
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {reportData && reportData.totalPages > 1 && (
          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Page {reportData.page} of {reportData.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-medium"
              >
                Previous
              </button>
              <button
                disabled={page >= reportData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

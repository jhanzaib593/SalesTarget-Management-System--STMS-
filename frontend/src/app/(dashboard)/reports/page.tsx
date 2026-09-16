'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  BarChart3,
  Layers,
  Users,
  AlertCircle,
  TrendingUp,
  Download,
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'brand' | 'rsm' | 'unallocated'>('rsm');

  const { data: rsmData = [], isLoading: rsmLoading } = useQuery({
    queryKey: ['reports', 'rsm'],
    queryFn: () => ApiClient.getRsmWiseReport(),
  });

  const { data: brandData = [], isLoading: brandLoading } = useQuery({
    queryKey: ['reports', 'brand'],
    queryFn: () => ApiClient.getBrandWiseReport(),
  });

  const { data: unallocatedData = [], isLoading: unallocatedLoading } = useQuery({
    queryKey: ['reports', 'unallocated'],
    queryFn: () => ApiClient.getUnallocatedReport(),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            FMCG Business Analytics
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Roll-Ups</h1>
        <p className="text-xs text-slate-400 mt-1">
          Aggregated target reports by Regional Sales Manager, brand category, and unallocated volume gaps.
        </p>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('rsm')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'rsm'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>RSM Regional Report</span>
        </button>

        <button
          onClick={() => setActiveTab('brand')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'brand'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Brand Performance Report</span>
        </button>

        <button
          onClick={() => setActiveTab('unallocated')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'unallocated'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Unallocated Target Gap Report</span>
        </button>
      </div>

      {/* Tab 1: RSM Wise Report */}
      {activeTab === 'rsm' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">RSM Regional Target & Allocation Progress</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3.5 font-semibold">RSM Code</th>
                  <th className="p-3.5 font-semibold">Manager Name</th>
                  <th className="p-3.5 font-semibold">Region</th>
                  <th className="p-3.5 font-semibold text-right">Target (CTN)</th>
                  <th className="p-3.5 font-semibold text-right">Allocated to ZSM</th>
                  <th className="p-3.5 font-semibold text-right">Remaining Buffer</th>
                  <th className="p-3.5 font-semibold text-center">Completion</th>
                  <th className="p-3.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rsmData.map((r: any) => (
                  <tr key={r.rsmId} className="hover:bg-slate-800/30">
                    <td className="p-3.5 text-indigo-400 font-bold">{r.employeeCode}</td>
                    <td className="p-3.5 text-white font-sans font-medium">{r.name}</td>
                    <td className="p-3.5 text-slate-300 font-sans">{r.region}</td>
                    <td className="p-3.5 text-right text-white font-bold">{r.target.toLocaleString()}</td>
                    <td className="p-3.5 text-right text-emerald-400">{r.allocatedToZsm.toLocaleString()}</td>
                    <td className="p-3.5 text-right text-amber-400">{r.remaining.toLocaleString()}</td>
                    <td className="p-3.5 text-center font-bold text-indigo-300">{r.completionPercentage}%</td>
                    <td className="p-3.5 text-center font-sans">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Brand Wise Report */}
      {activeTab === 'brand' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Brand Target Roll-up</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3.5 font-semibold">Brand Code</th>
                  <th className="p-3.5 font-semibold">Brand Name</th>
                  <th className="p-3.5 font-semibold text-center">Allocations Count</th>
                  <th className="p-3.5 font-semibold text-right">Total Allocated Volume (CTN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {brandData.map((b: any) => (
                  <tr key={b.brandId} className="hover:bg-slate-800/30">
                    <td className="p-3.5 text-indigo-400 font-bold">{b.brandCode}</td>
                    <td className="p-3.5 font-sans font-medium text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                      <span>{b.brandName}</span>
                    </td>
                    <td className="p-3.5 text-center text-slate-300">{b.allocationsCount}</td>
                    <td className="p-3.5 text-right text-white font-bold text-sm">
                      {b.totalQuantity.toLocaleString()} <span className="text-xs text-slate-400 font-normal">CTN</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Unallocated Target Gaps */}
      {activeTab === 'unallocated' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Unallocated Company Target Gaps</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3.5 font-semibold">Target Plan</th>
                  <th className="p-3.5 font-semibold">Period</th>
                  <th className="p-3.5 font-semibold text-right">Total Goal (CTN)</th>
                  <th className="p-3.5 font-semibold text-right">Assigned to RSMs</th>
                  <th className="p-3.5 font-semibold text-right">Unassigned Gap</th>
                  <th className="p-3.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {unallocatedData.map((u: any) => (
                  <tr key={u.planId} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-sans font-semibold text-white">{u.planTitle}</td>
                    <td className="p-3.5 text-slate-300">{u.period}</td>
                    <td className="p-3.5 text-right text-white font-bold">{u.totalPlanTarget.toLocaleString()}</td>
                    <td className="p-3.5 text-right text-emerald-400">{u.allocatedToRsms.toLocaleString()}</td>
                    <td className="p-3.5 text-right text-amber-400 font-bold">{u.unallocated.toLocaleString()}</td>
                    <td className="p-3.5 text-center font-sans">
                      {u.unallocated === 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Fully Distributed
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {u.unallocated.toLocaleString()} CTN Pending
                        </span>
                      )}
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

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { DownloadCloud, FileSpreadsheet, Download, CheckCircle2, Calendar } from 'lucide-react';

export default function ExportsPage() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['target-plans'],
    queryFn: () => ApiClient.getTargetPlans(),
  });

  const handleDownload = (planId: string) => {
    const url = ApiClient.getExportUrl(planId);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Export Center
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Consolidated Excel Workbooks</h1>
        <p className="text-xs text-slate-400 mt-1">
          Download formatted corporate spreadsheets with frozen headers, alternating row colors, and multi-sheet summaries.
        </p>
      </div>

      {/* Plans List */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Available Target Plan Workbooks</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading available export files...</div>
        ) : (
          <div className="divide-y divide-slate-800 font-sans">
            {plans.map((p: any) => (
              <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{p.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        v{p.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Period: {p.period.month}/{p.period.year} • Total Volume: <strong className="text-slate-200">{Number(p.totalTarget).toLocaleString()} {p.unit}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <StatusBadge status={p.status} />

                  <button
                    onClick={() => handleDownload(p.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow-emerald transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

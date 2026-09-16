'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { ShieldCheck, Search, Filter, Clock, ArrowRight, User } from 'lucide-react';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs', search, entityType, page],
    queryFn: () => ApiClient.getAuditLogs({ search, entityType, page, limit: 50 }),
  });

  const logs = logsData?.items || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Immutable Audit Trail
          </span>
          <span className="text-xs text-slate-400">• {logsData?.total || 0} Events Recorded</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs & Compliance</h1>
        <p className="text-xs text-slate-400 mt-1">
          Every critical target modification, allocation change, and approval decision is permanently recorded with timestamps.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Entities</option>
          <option value="TargetPlan">Target Plan</option>
          <option value="TargetAllocation">Target Allocation</option>
          <option value="ApprovalRequest">Approval Request</option>
          <option value="User">User</option>
        </select>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : (
          <div className="divide-y divide-slate-800 font-sans">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {log.user?.name || 'System'} ({log.user?.employee?.employeeCode || 'SYS'})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">• {log.entityType}</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Values Diff */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-[11px] font-mono grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Previous Values:</span>
                    <pre className="text-rose-400/90 whitespace-pre-wrap">
                      {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'None (Created)'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-1">New Values:</span>
                    <pre className="text-emerald-400/90 whitespace-pre-wrap">
                      {log.newValues ? JSON.stringify(log.newValues, null, 2) : 'None'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

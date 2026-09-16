'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Settings, RefreshCw, CheckCircle2, Server, Database, Activity, Send } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [feedback, setFeedback] = useState<any>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['target-plans'],
    queryFn: () => ApiClient.getTargetPlans(),
  });

  const activePlanId = selectedPlanId || plans[0]?.id || '';

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['integration-logs'],
    queryFn: () => ApiClient.getIntegrationLogs(),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!activePlanId) return;
      return ApiClient.syncToSecondaryErp(activePlanId);
    },
    onSuccess: (data) => {
      setFeedback(data);
      queryClient.invalidateQueries({ queryKey: ['integration-logs'] });
    },
    onError: (err: any) => {
      alert(err.message || 'ERP sync failed');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            System & ERP Integrations
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Secondary Sales Software Integration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Direct REST API synchronization module exporting compiled targets to downstream secondary sales ERP software.
        </p>
      </div>

      {/* Sync Action Card */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Secondary ERP API Connector</h3>
              <p className="text-xs text-slate-400">Endpoint: POST /api/v1/secondary-erp/targets/bulk</p>
            </div>
          </div>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{syncMutation.isPending ? 'Syncing to ERP...' : 'Dispatch Live Target Sync'}</span>
          </button>
        </div>

        {feedback && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 space-y-1">
            <p className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedback.message}</span>
            </p>
            <p className="text-slate-400 font-mono">Dispatched {feedback.totalSynced} records to ERP gateway.</p>
          </div>
        )}
      </div>

      {/* Integration Transaction Logs */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">API Sync Audit Logs</h2>
          <span className="text-xs text-slate-400 font-mono">Channel: REST JSON Gateway</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading sync logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No integration sync logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{log.systemName}</span>
                    <span className="text-slate-400">• {log.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 font-mono text-[11px] text-emerald-400">
                  {JSON.stringify(log.response || {}, null, 2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

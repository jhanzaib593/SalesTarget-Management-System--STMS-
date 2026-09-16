'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { History, Plus, CheckCircle2, AlertTriangle, Sparkles, Layers } from 'lucide-react';

export default function RevisionsPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newTarget, setNewTarget] = useState<number>(1200000);
  const [reason, setReason] = useState('Mid-month national target increase due to seasonal promotional campaign.');
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['target-plans'],
    queryFn: () => ApiClient.getTargetPlans(),
  });

  const activePlanId = selectedPlanId || plans[0]?.id || '';
  const currentPlan = plans.find((p: any) => p.id === activePlanId);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['versions', activePlanId],
    queryFn: () => ApiClient.getPlanVersions(activePlanId),
    enabled: !!activePlanId,
  });

  const revisionMutation = useMutation({
    mutationFn: async () => {
      return ApiClient.createRevision(activePlanId, {
        newTotalTarget: newTarget,
        reason,
      });
    },
    onSuccess: (data) => {
      setFeedback(`Target revised to Version ${data.newVersion}! Previous target snapshot preserved.`);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Revision failed');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Audit & Version Integrity
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Target Plan Revisions & Versioning</h1>
          <p className="text-xs text-slate-400 mt-1">
            Revising a finalized target automatically creates a new immutable version snapshot without overwriting historical records.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request Target Revision</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plan Selector */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Target Plan:</label>
          <select
            value={activePlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {plans.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title} (Active: v{p.version} • {Number(p.totalTarget).toLocaleString()} {p.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Current Live Version: <strong className="text-white">v{currentPlan?.version || 1}</strong>
        </div>
      </div>

      {/* Version History Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Immutable Version Snapshots ({versions.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading version snapshots...</div>
        ) : versions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No previous revised versions for this plan. Operating on initial baseline Version 1.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 font-sans">
            {versions.map((v: any) => (
              <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                      Version {v.versionNumber}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {Number(v.totalTarget).toLocaleString()} CTN
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{v.reason || 'Standard Revision'}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-mono">
                  Archived on: {new Date(v.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revision Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <span>Create Target Revision (v{(currentPlan?.version || 1) + 1})</span>
            </h3>

            <p className="text-xs text-slate-300">
              Current Target: <strong className="text-white font-mono">{Number(currentPlan?.totalTarget || 0).toLocaleString()} CTN</strong> (v{currentPlan?.version || 1})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Target Volume (CTN)</label>
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value))}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mandatory Revision Justification</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the business rationale for revising this target..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => revisionMutation.mutate()}
                disabled={revisionMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-lg"
              >
                {revisionMutation.isPending ? 'Publishing Revision...' : 'Publish Version Revision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

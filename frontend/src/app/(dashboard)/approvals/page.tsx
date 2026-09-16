'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  CheckCircle2,
  XCircle,
  History,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  CheckSquare,
  Clock,
} from 'lucide-react';

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | 'REVISION' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => ApiClient.getPendingApprovals(),
  });

  const { data: allHistory = [] } = useQuery({
    queryKey: ['approvals', 'all'],
    queryFn: () => ApiClient.request('/approvals'),
  });

  // Action Mutation
  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) return;

      if (modalAction === 'APPROVE') {
        return ApiClient.approveRequest(selectedRequest.id, commentText);
      } else if (modalAction === 'REJECT') {
        if (!commentText.trim()) throw new Error('A rejection reason is required.');
        return ApiClient.rejectRequest(selectedRequest.id, commentText);
      } else if (modalAction === 'REVISION') {
        if (!commentText.trim()) throw new Error('Please specify what revisions are required.');
        return ApiClient.requestRevision(selectedRequest.id, commentText);
      }
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: `Request successfully ${modalAction?.toLowerCase()}d!` });
      setModalAction(null);
      setSelectedRequest(null);
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Action failed' });
    },
  });

  const openActionModal = (req: any, action: 'APPROVE' | 'REJECT' | 'REVISION') => {
    setSelectedRequest(req);
    setModalAction(action);
    setCommentText('');
    setFeedback(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Workflow Governance
          </span>
          <span className="text-xs text-slate-400">• {pendingRequests.length} Pending Actions</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Sales Operations Approval Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, approve, reject, or request revisions on target allocations submitted down the hierarchy.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Pending Approvals Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Pending Approval Queue ({pendingRequests.length})</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading pending requests...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
            All target allocations are reviewed and up to date!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3.5 font-semibold">Hierarchy Level</th>
                  <th className="p-3.5 font-semibold">Submitted By</th>
                  <th className="p-3.5 font-semibold">Plan Period</th>
                  <th className="p-3.5 font-semibold text-right">Target Volume</th>
                  <th className="p-3.5 font-semibold">Notes</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-slate-800/30">
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                        {req.level}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-white">{req.allocation?.employee?.name || req.submitter?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{req.allocation?.employee?.employeeCode}</p>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {req.plan?.period?.month}/{req.plan?.period?.year}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-white">
                      {req.allocation ? Number(req.allocation.quantity).toLocaleString() : '—'} CTN
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate">{req.comments || 'No comments'}</td>
                    <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openActionModal(req, 'APPROVE')}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-[11px] font-semibold border border-emerald-500/30 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'REVISION')}
                        className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded text-[11px] font-semibold border border-purple-500/30 transition-colors"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'REJECT')}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-[11px] font-semibold border border-rose-500/30 transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Log */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Recent Approval History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Tier</th>
                <th className="p-3 font-semibold">Submitter</th>
                <th className="p-3 font-semibold">Reviewer</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allHistory.slice(0, 10).map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-800/20">
                  <td className="p-3">
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="p-3 font-mono text-slate-400">{h.level}</td>
                  <td className="p-3 text-white font-medium">{h.submitter?.name}</td>
                  <td className="p-3 text-slate-300">{h.reviewer?.name || '—'}</td>
                  <td className="p-3 text-slate-400 font-mono">{new Date(h.submittedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-slate-400 truncate max-w-xs">{h.comments || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {modalAction && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {modalAction === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {modalAction === 'REJECT' && <XCircle className="w-5 h-5 text-rose-400" />}
              {modalAction === 'REVISION' && <History className="w-5 h-5 text-purple-400" />}
              <span>{modalAction.replace('_', ' ')} Target Allocation</span>
            </h3>

            <p className="text-xs text-slate-300">
              Target Employee: <strong className="text-white">{selectedRequest.allocation?.employee?.name}</strong> (
              {selectedRequest.allocation?.employee?.employeeCode}) —{' '}
              <strong className="text-indigo-400 font-mono">
                {Number(selectedRequest.allocation?.quantity).toLocaleString()} CTN
              </strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {modalAction === 'APPROVE' ? 'Approval Comments (Optional)' : 'Reason / Remarks (Required)'}
              </label>
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  modalAction === 'APPROVE'
                    ? 'Target approved for field deployment.'
                    : 'Explain why this target needs adjustments...'
                }
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setModalAction(null);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => actionMutation.mutate()}
                disabled={actionMutation.isPending}
                className={`px-5 py-2 text-white rounded-lg text-xs font-semibold shadow-lg transition-all ${
                  modalAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald'
                    : modalAction === 'REVISION'
                    ? 'bg-purple-600 hover:bg-purple-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionMutation.isPending ? 'Processing...' : `Confirm ${modalAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

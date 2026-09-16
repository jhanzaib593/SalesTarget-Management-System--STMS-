import React from 'react';
import { TargetStatus, ApprovalStatus } from '../../lib/types';

interface StatusBadgeProps {
  status: TargetStatus | ApprovalStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'FINALIZED':
      case 'APPROVED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
      case 'PENDING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ASSIGNED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'DRAFT':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'REVISION_REQUIRED':
      case 'REVISION_REQUESTED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'EXPORTED':
      case 'UPLOADED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${getStyles()} transition-colors`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
    </span>
  );
}

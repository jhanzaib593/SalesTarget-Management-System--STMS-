import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: string;
  progress?: number;
}

export function KpiCard({
  title,
  value,
  unit,
  change,
  changeType = 'neutral',
  icon: Icon,
  color = 'indigo',
  progress,
}: KpiCardProps) {
  const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', bar: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'bg-cyan-500' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'bg-rose-500' },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:border-slate-600">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
          </div>
          {change && (
            <p
              className={`mt-1.5 text-xs font-medium ${
                changeType === 'positive'
                  ? 'text-emerald-400'
                  : changeType === 'negative'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${scheme.bg} ${scheme.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
            <span>Allocation Progress</span>
            <span className="text-white font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${scheme.bar} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

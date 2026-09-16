'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Network,
  ChevronRight,
  ChevronDown,
  User,
  Building,
  Target,
  Layers,
  Sparkles,
} from 'lucide-react';

function TreeNode({ node, level = 0 }: { node: any; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const roleColors: Record<string, string> = {
    RSM: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    ZSM: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    ASM: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    TSM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    ORDER_BOOKER: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  };

  const badgeClass = roleColors[node.role?.name] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="space-y-2">
      <div
        style={{ marginLeft: `${level * 24}px` }}
        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          isOpen ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            </div>
          )}

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${badgeClass}`}>
            {node.role?.name || 'EMP'}
          </span>

          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{node.name}</span>
              <span className="text-slate-400 font-normal font-mono">({node.employeeCode})</span>
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {node.region?.name || 'National'} {node.territory?.name ? `• ${node.territory.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-bold text-indigo-300">
            {hasChildren ? `${node.children.length} Subordinates` : 'Field Front-line'}
          </span>
          <StatusBadge status={node.status || 'ACTIVE'} />
        </div>
      </div>

      {/* Render Child Branches */}
      {isOpen && hasChildren && (
        <div className="space-y-2 border-l border-slate-800 ml-3 pl-1">
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DrillDownPage() {
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['hierarchy', 'tree'],
    queryFn: () => ApiClient.getHierarchyTree(),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Target Lineage & Traceability
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Hierarchical Target Drill-Down</h1>
        <p className="text-xs text-slate-400 mt-1">
          Trace any sales target through the full organizational chain: RSM → ZSM → ASM → TSM → Order Booker.
        </p>
      </div>

      {/* Tree View Container */}
      <div className="glass-card rounded-xl p-6">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Building recursive organizational tree...</div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No hierarchy tree nodes found.</div>
        ) : (
          <div className="space-y-3">
            {tree.map((rootNode: any) => (
              <TreeNode key={rootNode.id} node={rootNode} level={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

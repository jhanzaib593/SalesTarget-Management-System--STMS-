'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarPlus,
  GitFork,
  CheckSquare,
  FileSpreadsheet,
  Network,
  BarChart3,
  Users2,
  Tags,
  UploadCloud,
  DownloadCloud,
  History,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role?.name;

  const navigation: { section: string; items: NavItem[] }[] = [
    {
      section: 'Core Target Engine',
      items: [
        { label: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
        {
          label: 'Target Planning',
          href: '/planning',
          icon: CalendarPlus,
          roles: ['SUPER_ADMIN', 'SALES_OPERATIONS'],
        },
        { label: 'Target Allocation', href: '/allocation', icon: GitFork },
        { label: 'Approval Center', href: '/approvals', icon: CheckSquare },
        { label: 'Consolidated Target', href: '/consolidated', icon: FileSpreadsheet },
        { label: 'Hierarchical Drill-Down', href: '/drilldown', icon: Network },
      ],
    },
    {
      section: 'Analytics & Master Data',
      items: [
        { label: 'Reports & Roll-ups', href: '/reports', icon: BarChart3 },
        { label: 'Employees & Hierarchy', href: '/employees', icon: Users2 },
        { label: 'Brands & SKUs', href: '/brands', icon: Tags },
        {
          label: 'Excel Import Wizard',
          href: '/imports',
          icon: UploadCloud,
          roles: ['SUPER_ADMIN', 'SALES_OPERATIONS'],
        },
        { label: 'Excel Export Center', href: '/exports', icon: DownloadCloud },
      ],
    },
    {
      section: 'Governance & Sync',
      items: [
        { label: 'Target Revisions', href: '/revisions', icon: History },
        {
          label: 'Audit & Compliance',
          href: '/audit-logs',
          icon: ShieldCheck,
          roles: ['SUPER_ADMIN', 'SALES_OPERATIONS'],
        },
        { label: 'System & ERP Sync', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0d131f] border-r border-[#1a2333] flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#1a2333] gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
            STMS <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">FMCG</span>
          </span>
          <p className="text-[11px] text-slate-400 font-medium leading-none">Target Management System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) return true;
            return role ? item.roles.includes(role) : true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.section}
              </p>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Current User Session Bar */}
      <div className="p-3 border-t border-[#1a2333] bg-[#090d16]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SO'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Sales Operations'}</p>
            <p className="text-[10px] text-indigo-400 font-mono truncate">{user?.role?.name || 'SALES_OPERATIONS'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

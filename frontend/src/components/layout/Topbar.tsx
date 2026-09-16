'use client';

import React, { useState } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const { user, logout, switchDemoRole } = useAuthStore();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const router = useRouter();

  const demoAccounts = [
    { label: 'Sales Operations Lead', email: 'sales.ops@fmcg-stms.com', role: 'SALES_OPERATIONS', badge: 'Admin' },
    { label: 'Robert Stark (RSM North)', email: 'rsm001@fmcg-stms.com', role: 'RSM', badge: 'Tier 1' },
    { label: 'Tariq Mehmood (ZSM Metro)', email: 'zsm001@fmcg-stms.com', role: 'ZSM', badge: 'Tier 2' },
    { label: 'Ali Raza (ASM North-A)', email: 'asm001@fmcg-stms.com', role: 'ASM', badge: 'Tier 3' },
    { label: 'Kashif Mehmood (TSM Downtown)', email: 'tsm001@fmcg-stms.com', role: 'TSM', badge: 'Tier 4' },
    { label: 'Usman Ali (Order Booker 1)', email: 'ob001@fmcg-stms.com', role: 'ORDER_BOOKER', badge: 'Field' },
  ];

  const handleRoleSwitch = async (email: string) => {
    await switchDemoRole(email);
    setShowRoleMenu(false);
    router.refresh();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-[#1a2333] bg-[#0d131f]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search & Active Period Indicator */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search targets, employees, brands, regions..."
            className="w-full h-9 pl-9 pr-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Period: <strong className="text-white">January 2027</strong></span>
        </div>
      </div>

      {/* Right Controls: Role Switcher, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Role:</span>
            <span className="text-indigo-300 font-semibold">{user?.role?.name || 'Switch Role'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> Switch Hierarchy Persona
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Test allocation & view permissions at each tier</p>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleRoleSwitch(acc.email)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 transition-colors flex items-center justify-between ${
                      user?.email === acc.email ? 'bg-indigo-600/15 text-indigo-300 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">{acc.label}</p>
                      <p className="text-[10px] text-slate-400">{acc.email}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0d131f]" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

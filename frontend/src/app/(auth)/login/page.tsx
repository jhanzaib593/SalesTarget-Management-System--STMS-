'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('sales.ops@fmcg-stms.com');
  const [password, setPassword] = useState('Password@123');
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      // Handled in store
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    try {
      await login(demoEmail, 'Password@123');
      router.push('/');
    } catch (err) {}
  };

  const demoAccounts = [
    { label: 'Sales Operations Lead', email: 'sales.ops@fmcg-stms.com', role: 'SALES_OPERATIONS', desc: 'Plans & finalizes targets' },
    { label: 'Robert Stark (RSM North)', email: 'rsm001@fmcg-stms.com', role: 'RSM', desc: 'Allocates to ZSMs' },
    { label: 'Tariq Mehmood (ZSM Metro)', email: 'zsm001@fmcg-stms.com', role: 'ZSM', desc: 'Allocates to ASMs' },
    { label: 'Ali Raza (ASM North-A)', email: 'asm001@fmcg-stms.com', role: 'ASM', desc: 'Allocates to TSMs' },
    { label: 'Kashif Mehmood (TSM Downtown)', email: 'tsm001@fmcg-stms.com', role: 'TSM', desc: 'Allocates to Order Bookers' },
    { label: 'Usman Ali (Order Booker 1)', email: 'ob001@fmcg-stms.com', role: 'ORDER_BOOKER', desc: 'Front-line target view' },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-glow mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">STMS FMCG Enterprise</h1>
          <p className="text-xs text-slate-400">
            Sales Target Allocation & Management System
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-glow transition-all"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Header */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              1-Click Demo Personas
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickDemo(acc.email)}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left transition-colors"
                >
                  <p className="text-xs font-bold text-white truncate">{acc.label}</p>
                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">{acc.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

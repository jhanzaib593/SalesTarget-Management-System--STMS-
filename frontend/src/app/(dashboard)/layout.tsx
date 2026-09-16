'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { QueryLoadingBar } from '../../components/layout/QueryLoadingBar';
import { useAuthStore } from '../../store/useAuthStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, fetchProfile, login, setFallbackUser } = useAuthStore();
  const [checking, setChecking] = useState(!user);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        if (!token) {
          // Attempt auto-login with default credentials
          await login('sales.ops@fmcg-stms.com', 'Password@123');
        } else if (!user) {
          await fetchProfile();
        }
      } catch (err) {
        // If backend connection fails, set the fallback session so user is never stuck
        if (isMounted) {
          setFallbackUser();
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    };

    // Safety timeout to prevent any infinite spinner if server takes time to respond
    const timeout = setTimeout(() => {
      if (isMounted) {
        setChecking(false);
      }
    }, 1500);

    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  if (checking && !user) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <p className="text-xs text-slate-300 font-medium">Connecting to STMS Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <QueryLoadingBar />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

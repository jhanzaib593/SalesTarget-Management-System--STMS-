'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';

export function QueryLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  const [isNavigating, setIsNavigating] = useState(false);
  const isBusy = isFetching > 0 || isMutating > 0 || isNavigating;

  // Track route changes
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isBusy) return null;

  return (
    <>
      {/* Top Gradient Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 animate-[loadingProgress_1.2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
      </div>

      {/* Floating Query Execution Status Badge */}
      <div className="fixed bottom-5 right-5 z-40 bg-[#0d131f]/95 border border-indigo-500/40 text-indigo-300 text-xs px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        <span className="font-medium text-slate-200">
          {isNavigating
            ? 'Loading view...'
            : isMutating > 0
            ? 'Saving updates...'
            : 'Executing query...'}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
          {isFetching > 0 ? `${isFetching} active` : 'syncing'}
        </span>
      </div>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Calendar,
  Layers,
  Target,
  Users2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export default function PlanningPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form State
  const [year, setYear] = useState(2027);
  const [month, setMonth] = useState(1);
  const [divisionId, setDivisionId] = useState('');
  const [title, setTitle] = useState('January 2027 FMCG National Target');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [totalTarget, setTotalTarget] = useState<number>(1000000);
  const [rsmAssignments, setRsmAssignments] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Master Data
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => ApiClient.getDivisions(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => ApiClient.getBrands(),
  });

  const { data: rsms = [] } = useQuery({
    queryKey: ['rsms'],
    queryFn: async () => {
      const res = await ApiClient.getEmployees({ role: 'RSM' });
      return res.items || [];
    },
  });

  // Calculate live assignment totals
  const totalAssigned = Object.values(rsmAssignments).reduce((s, v) => s + (Number(v) || 0), 0);
  const remainingTarget = totalTarget - totalAssigned;
  const isOverAllocated = totalAssigned > totalTarget;

  // Create Plan Mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (isOverAllocated) {
        throw new Error(`RSM allocations exceed company target by ${(totalAssigned - totalTarget).toLocaleString()} CTNs`);
      }

      // Check target period or create
      const periods = await ApiClient.getTargetPeriods();
      let period = periods.find((p: any) => p.year === year && p.month === month);
      if (!period) {
        // Create period
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));
        period = await ApiClient.request('/target-periods', {
          method: 'POST',
          body: JSON.stringify({ year, month, startDate, endDate }),
        });
      }

      const assignmentsPayload = Object.entries(rsmAssignments)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([empId, qty]) => ({
          employeeId: empId,
          quantity: Number(qty),
        }));

      return ApiClient.createTargetPlan({
        targetPeriodId: period.id,
        divisionId: divisionId || undefined,
        title,
        totalTarget,
        unit: 'CTN',
        rsmAssignments: assignmentsPayload,
      });
    },
    onSuccess: (data) => {
      router.push(`/consolidated`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to create target plan');
    },
  });

  const handleBrandToggle = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brandId));
    } else {
      setSelectedBrands([...selectedBrands, brandId]);
    }
  };

  const handleRsmChange = (empId: string, value: number) => {
    setRsmAssignments((prev) => ({
      ...prev,
      [empId]: value,
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Target Planning Wizard
          </span>
          <span className="text-xs text-slate-400">• Step {step} of 4</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create FMCG Sales Target Plan</h1>
        <p className="text-xs text-slate-400 mt-1">
          Establish monthly volume goals and distribute regional quotas to Regional Sales Managers.
        </p>
      </div>

      {/* Wizard Progress Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: 'Period & Division', icon: Calendar },
          { num: 2, label: 'Select Brands', icon: Layers },
          { num: 3, label: 'Company Volume', icon: Target },
          { num: 4, label: 'RSM Assignment', icon: Users2 },
        ].map((s) => {
          const Icon = s.icon;
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div
              key={s.num}
              className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                isCurrent
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                  : isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="hidden sm:inline truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="glass-card rounded-xl p-6">
        {/* STEP 1: Period & Division */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 1: Target Period & Division</h2>
            <p className="text-xs text-slate-400">Define the fiscal target period and scope.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Plan Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Division</label>
                <select
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">National / All Divisions</option>
                  {divisions.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Select Brands */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 2: Select Participating Brands</h2>
            <p className="text-xs text-slate-400">Choose the brand categories included in this target cycle.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {brands.map((b: any) => {
                const isSelected = selectedBrands.includes(b.id) || selectedBrands.length === 0;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleBrandToggle(b.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                        <span className="text-xs font-bold text-white">{b.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{b.description || 'Standard FMCG SKU Line'}</p>
                      <span className="text-[10px] font-mono text-indigo-400 mt-2 block">{b.code}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Company Target Volume */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 3: Company Target Volume</h2>
            <p className="text-xs text-slate-400">Enter overall national volume to be distributed across regions.</p>

            <div className="pt-2 max-w-md">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Total Company Target (Cartons / CTNs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalTarget}
                  onChange={(e) => setTotalTarget(Number(e.target.value))}
                  placeholder="1000000"
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-700 rounded-lg text-lg font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-400">
                  CTNs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Example: 1,000,000 CTNs for January 2027.</p>
            </div>
          </div>
        )}

        {/* STEP 4: RSM Assignment & Live Validation Counter */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Step 4: Assign Target to RSMs</h2>
                <p className="text-xs text-slate-400">Distribute the company target among Regional Sales Managers.</p>
              </div>

              {/* Live Target Counter Pill */}
              <div
                className={`px-3.5 py-2 rounded-lg border text-xs font-mono flex items-center gap-4 ${
                  isOverAllocated
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : remainingTarget === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                }`}
              >
                <div>
                  <span className="text-[10px] text-slate-400 block">Company Goal</span>
                  <strong className="text-white">{totalTarget.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Assigned</span>
                  <strong>{totalAssigned.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Remaining</span>
                  <strong>{remainingTarget.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {isOverAllocated && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                ⚠️ Allocation exceeds the total company target by {(totalAssigned - totalTarget).toLocaleString()} CTNs.
              </div>
            )}

            {/* RSM Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">RSM Code</th>
                    <th className="pb-3 font-semibold">Manager Name</th>
                    <th className="pb-3 font-semibold">Region</th>
                    <th className="pb-3 font-semibold text-right w-44">Target Volume (CTN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rsms.map((rsm: any) => (
                    <tr key={rsm.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-mono font-medium text-slate-300">{rsm.employeeCode}</td>
                      <td className="py-3 text-white font-medium">{rsm.name}</td>
                      <td className="py-3 text-slate-400">{rsm.region?.name || 'Unassigned'}</td>
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          value={rsmAssignments[rsm.id] || ''}
                          onChange={(e) => handleRsmChange(rsm.id, Number(e.target.value))}
                          placeholder="0"
                          className="w-36 h-8 px-3 text-right bg-slate-900 border border-slate-700 rounded-md font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStep((s) => Math.min(4, s + 1));
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => createPlanMutation.mutate()}
              disabled={createPlanMutation.isPending || isOverAllocated}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow-emerald transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{createPlanMutation.isPending ? 'Generating Plan...' : 'Create & Assign Targets'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

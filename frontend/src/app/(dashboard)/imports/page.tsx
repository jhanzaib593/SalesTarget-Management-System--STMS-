'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  Download,
} from 'lucide-react';

export default function ImportsPage() {
  const [targetPlanId, setTargetPlanId] = useState('');
  const [rawJson, setRawJson] = useState(`[
  { "rowNumber": 1, "employeeCode": "RSM-001", "brandCode": "BRD-A", "quantity": 40000, "unit": "CTN" },
  { "rowNumber": 2, "employeeCode": "RSM-001", "brandCode": "BRD-B", "quantity": 30000, "unit": "CTN" },
  { "rowNumber": 3, "employeeCode": "ZSM-001", "brandCode": "BRD-A", "quantity": 20000, "unit": "CTN" },
  { "rowNumber": 4, "employeeCode": "ASM-001", "brandCode": "BRD-A", "quantity": 10000, "unit": "CTN" },
  { "rowNumber": 5, "employeeCode": "INVALID-CODE-999", "brandCode": "BRD-A", "quantity": 5000, "unit": "CTN" }
]`);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch active plans
  const { data: plans = [] } = useQuery({
    queryKey: ['target-plans'],
    queryFn: () => ApiClient.getTargetPlans(),
  });

  const activePlanId = targetPlanId || plans[0]?.id || '';

  const handleValidate = async () => {
    try {
      setIsProcessing(true);
      const parsedRows = JSON.parse(rawJson);
      const res = await ApiClient.validateImport(activePlanId, parsedRows);
      setValidationResult(res);
      setImportResult(null);
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    try {
      setIsProcessing(true);
      const parsedRows = JSON.parse(rawJson).filter((r: any) => !validationResult?.errors?.some((e: any) => e.rowNumber === r.rowNumber));
      const res = await ApiClient.executeImport(activePlanId, parsedRows);
      setImportResult(res);
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Bulk Operations
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Excel Target Import Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Validate Excel spreadsheet records against master employee hierarchy and brand catalogs before committing.
        </p>
      </div>

      {/* Select Plan */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Target Plan:</label>
          <select
            value={activePlanId}
            onChange={(e) => setTargetPlanId(e.target.value)}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {plans.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title} (Period: {p.period.month}/{p.period.year})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            const template = `[
  { "rowNumber": 1, "employeeCode": "RSM-001", "brandCode": "BRD-A", "quantity": 40000, "unit": "CTN" },
  { "rowNumber": 2, "employeeCode": "RSM-001", "brandCode": "BRD-B", "quantity": 30000, "unit": "CTN" },
  { "rowNumber": 3, "employeeCode": "ZSM-001", "brandCode": "BRD-A", "quantity": 20000, "unit": "CTN" }
]`;
            setRawJson(template);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Standard Template</span>
        </button>
      </div>

      {/* Editor / Payload Box */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Excel / JSON Input Rows</span>
          </label>
          <span className="text-[11px] text-slate-400">Columns: rowNumber, employeeCode, brandCode, quantity, unit</span>
        </div>

        <textarea
          rows={7}
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleValidate}
            disabled={isProcessing}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Validating...' : 'Validate Dataset'}</span>
          </button>
        </div>
      </div>

      {/* Validation Results Preview */}
      {validationResult && (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <h3 className="text-sm font-bold text-white">
                Validation Summary: {validationResult.validRowCount} Valid, {validationResult.errorRowCount} Errors
              </h3>
            </div>

            {validationResult.validRowCount > 0 && (
              <button
                onClick={handleExecute}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow-emerald transition-all"
              >
                <span>Commit Valid Rows ({validationResult.validRowCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Errors Table */}
          {validationResult.errors?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Row-Level Verification Errors
              </span>
              <div className="divide-y divide-slate-800 rounded-lg border border-rose-500/20 bg-rose-500/5 overflow-hidden">
                {validationResult.errors.map((err: any, idx: number) => (
                  <div key={idx} className="p-3 text-xs flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono font-bold text-rose-300">Row {err.rowNumber}: </span>
                      <span className="text-slate-300">{err.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {importResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold">{importResult.message}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface TargetChartsProps {
  rsmData?: any[];
  brandData?: any[];
  hierarchyData?: any[];
}

export function TargetCharts({ rsmData = [], brandData = [], hierarchyData = [] }: TargetChartsProps) {
  const brandColors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: RSM Target vs Allocated */}
      <div className="glass-card rounded-xl p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Target Allocation by RSM</h3>
            <p className="text-xs text-slate-400">Total assigned target vs allocated volume to ZSMs (CTNs)</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
            Regional Breakdown
          </span>
        </div>

        <div className="h-72 w-full">
          {rsmData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rsmData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis dataKey="rsmCode" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} CTNs`, '']}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="target" name="Assigned Target" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="allocated" name="Allocated to ZSM" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No RSM allocation data available
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Brand Share Donut */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Brand Target Share</h3>
            <p className="text-xs text-slate-400">Volume distribution across active brands</p>
          </div>
        </div>

        <div className="h-72 w-full">
          {brandData.length > 0 && brandData.some((b) => b.quantity > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData.filter((b) => b.quantity > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="quantity"
                  nameKey="name"
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || brandColors[index % brandColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} CTNs`, 'Quantity']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-slate-300 mr-2">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No brand allocation breakdown
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

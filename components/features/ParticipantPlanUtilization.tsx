'use client';

import React, { useState, useMemo } from 'react';
import { Client } from '@/types';
import {
  DollarSign,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  ChevronRight,
  Info
} from 'lucide-react';

interface ParticipantPlanUtilizationProps {
  participant: Client;
  onOpenScanReceipt?: () => void;
}

export const ParticipantPlanUtilization: React.FC<ParticipantPlanUtilizationProps> = ({
  participant,
  onOpenScanReceipt
}) => {
  const [chartMode, setChartMode] = useState<'utilization' | 'categories'>('utilization');
  const [statementToast, setStatementToast] = useState<string | null>(null);

  const totalBudget = participant.totalBudget || 48500;
  const spentBudget = participant.spentBudget || 12200;
  const remainingBudget = Math.max(0, totalBudget - spentBudget);
  const spentPercent = Math.min(100, Math.round((spentBudget / totalBudget) * 100));
  const remainingPercent = 100 - spentPercent;

  const planStart = useMemo(() => new Date(participant.planStartDate || '2025-07-01'), [participant.planStartDate]);
  const planEnd = useMemo(() => new Date(participant.planEndDate || '2026-06-30'), [participant.planEndDate]);
  const today = useMemo(() => new Date('2026-10-09'), []);

  const totalPlanDays = useMemo(() => {
    const diff = Math.max(1, planEnd.getTime() - planStart.getTime());
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }, [planStart, planEnd]);

  const elapsedPlanDays = useMemo(() => {
    const diff = Math.max(0, today.getTime() - planStart.getTime());
    return Math.min(totalPlanDays, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [today, planStart, totalPlanDays]);

  const timePercent = Math.min(100, Math.round((elapsedPlanDays / totalPlanDays) * 100));
  const remainingDays = Math.max(0, totalPlanDays - elapsedPlanDays);
  const remainingMonths = (remainingDays / 30.4).toFixed(1);

  const paceVariance = spentPercent - timePercent;
  let paceLabel = 'Optimal Pacing';
  let paceColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (paceVariance > 8) {
    paceLabel = 'High Burn Rate Alert';
    paceColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (paceVariance < -15) {
    paceLabel = 'Potential Underutilization';
    paceColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  const monthlyRunwayAllowance = remainingDays > 0 ? (remainingBudget / (remainingDays / 30.4)).toFixed(0) : '0';
  const averageMonthlySpend = elapsedPlanDays > 0 ? ((spentBudget / (elapsedPlanDays / 30.4))).toFixed(0) : '0';

  const categories = useMemo(() => {
    return [
      {
        name: 'Core Supports',
        description: 'Assistance with daily living, consumables, and community transport',
        total: 18000,
        spent: 4850,
        remaining: 13150,
        color: '#14b8a6', // teal-500
        icon: 'Core'
      },
      {
        name: 'Capacity Building',
        description: 'Improved daily living, Allied Health therapy & Behaviour Support',
        total: 24500,
        spent: 6720,
        remaining: 17780,
        color: '#10b981', // emerald-500
        icon: 'Therapy'
      },
      {
        name: 'Capital & Assistive Tech',
        description: 'Specialized sensory equipment and communication aids',
        total: 6000,
        spent: 630,
        remaining: 5370,
        color: '#8b5cf6', // purple-500
        icon: 'Capital'
      }
    ];
  }, []);

  const handleExportSummary = () => {
    setStatementToast(`Generated NDIS Plan Utilization Statement (PDF) for ${participant.name}.`);
    setTimeout(() => setStatementToast(null), 3500);
  };

  // SVG Donut calculation constants
  const size = 220;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Donut arc lengths
  const remainingStrokeDash = (remainingPercent / 100) * circumference;
  const spentStrokeDash = (spentPercent / 100) * circumference;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
      {statementToast && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{statementToast}</span>
          </div>
          <button onClick={() => setStatementToast(null)} className="text-teal-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-teal-400" /> NDIS Plan Budget Utilization Tracker
            </h2>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${paceColor}`}>
              {paceLabel}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {participant.planManagementType || 'Plan-Managed'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of remaining funds, category allocations, and burn rate pacing for the 2025–2026 plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setChartMode('utilization')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartMode === 'utilization'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remaining vs Spent
            </button>
            <button
              onClick={() => setChartMode('categories')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartMode === 'categories'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Categories
            </button>
          </div>

          <button
            onClick={handleExportSummary}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Download Plan Statement"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Statement</span>
          </button>
        </div>
      </div>

      {/* Donut Chart & Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Interactive Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950/60 border border-slate-800 relative">
          <div className="relative w-56 h-56 flex items-center justify-center">
            {chartMode === 'utilization' ? (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth={strokeWidth}
                />
                {/* Spent Segment */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#334155"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${spentStrokeDash} ${circumference}`}
                  strokeDashoffset={0}
                  className="transition-all duration-700"
                />
                {/* Remaining Segment (Teal) */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#14b8a6"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${remainingStrokeDash} ${circumference}`}
                  strokeDashoffset={-spentStrokeDash}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
            ) : (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth={strokeWidth}
                />
                {/* Categories segments */}
                {(() => {
                  let accumulatedOffset = 0;
                  return categories.map((cat) => {
                    const arc = (cat.spent / spentBudget) * circumference;
                    const offset = accumulatedOffset;
                    accumulatedOffset += arc;
                    return (
                      <circle
                        key={cat.name}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${arc} ${circumference}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500"
                      />
                    );
                  });
                })()}
              </svg>
            )}

            {/* Center Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                {chartMode === 'utilization' ? 'Remaining Budget' : 'Total Spent'}
              </span>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ${(chartMode === 'utilization' ? remainingBudget : spentBudget).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400 font-semibold">
                {chartMode === 'utilization'
                  ? `${remainingPercent}% Available`
                  : `${spentPercent}% Utilized`}
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs">
            {chartMode === 'utilization' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-teal-500" />
                  <span className="text-slate-300 font-medium">Remaining (${remainingBudget.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-600" />
                  <span className="text-slate-400 font-medium">Spent (${spentBudget.toLocaleString()})</span>
                </div>
              </>
            ) : (
              categories.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-300 text-[11px] font-medium">
                    {c.name} (${c.spent.toLocaleString()})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Progress Bar & Financial Metrics */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Overall Plan Budget Progress</span>
                <span className="text-[11px] text-slate-400">
                  Total Allocated: <strong className="text-slate-200">${totalBudget.toLocaleString()} AUD</strong>
                </span>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-teal-400 font-mono">{spentPercent}%</span>
                <span className="text-[10px] text-slate-400 block font-medium">Spent of Total</span>
              </div>
            </div>

            {/* High-Contrast Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-2xl h-4 overflow-hidden p-0.5 border border-slate-700/60 relative">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-xl transition-all duration-500 shadow-sm shadow-teal-500/50"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 px-0.5 font-mono">
                <span>$0</span>
                <span>$12,125 (25%)</span>
                <span>$24,250 (50%)</span>
                <span>$36,375 (75%)</span>
                <span>${totalBudget.toLocaleString()}</span>
              </div>
            </div>

            {/* Pacing vs Time Benchmark */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Plan Time Elapsed</span>
                  <span className="font-bold text-slate-200">{timePercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${timePercent}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Day {elapsedPlanDays} of {totalPlanDays} days
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Funds Utilized</span>
                  <span className="font-bold text-teal-400">{spentPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${spentPercent}%` }} />
                </div>
                <span className="text-[10px] text-teal-400/90 font-medium block">
                  {Math.abs(paceVariance)}% {paceVariance <= 0 ? 'under plan burn pace' : 'above plan pace'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Remaining Runway
              </span>
              <p className="text-base sm:text-lg font-black text-white">{remainingMonths} Months</p>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-400" /> {remainingDays} days left
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Monthly Spend Cap
              </span>
              <p className="text-base sm:text-lg font-black text-teal-300">${monthlyRunwayAllowance}</p>
              <span className="text-[10px] text-slate-400">Sustainable pace</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Avg Monthly Spend
              </span>
              <p className="text-base sm:text-lg font-black text-amber-300">${averageMonthlySpend}</p>
              <span className="text-[10px] text-slate-400">Actual burn to date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Category Budgets with Progress Bars */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Category Breakdown & Sub-Budget Limits
          </span>
          <span>3 NDIS Support Budgets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catSpentPct = Math.round((cat.spent / cat.total) * 100);
            const catRemainingPct = 100 - catSpentPct;

            return (
              <div
                key={cat.name}
                className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-teal-300 border border-slate-700 font-mono font-bold">
                      {catRemainingPct}% Left
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${catSpentPct}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Spent: <strong className="text-slate-200">${cat.spent.toLocaleString()}</strong>
                    </span>
                    <span className="text-teal-300 font-bold">
                      ${cat.remaining.toLocaleString()} Available
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start sm:items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span>
            Have out-of-pocket receipts to claim under Core Consumables or Transport?
          </span>
        </div>

        {onOpenScanReceipt && (
          <button
            onClick={onOpenScanReceipt}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <span>Scan Receipt for Claim</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

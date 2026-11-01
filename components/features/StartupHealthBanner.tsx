'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  CheckCircle2,
  Key,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { SystemHealthReport, runClientStartupHealthCheck } from '@/lib/startupHealthCheck';

export const StartupHealthBanner: React.FC = () => {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        // Fall back to client-side check
        setReport(runClientStartupHealthCheck());
      }
    } catch {
      setReport(runClientStartupHealthCheck());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (!report) return null;

  const isHealthy = report.overallStatus === 'healthy';
  const isCritical = report.overallStatus === 'critical';

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isCritical
          ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          : isHealthy
          ? 'bg-slate-900/60 border-slate-800 text-slate-300'
          : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
      } p-3 sm:p-4 text-xs`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isCritical ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : isHealthy ? (
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">Startup Health & Credentials</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                  isHealthy
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : isCritical
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {report.overallStatus}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                DB: {report.metadata?.databaseId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{report.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh startup health check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {report.checks.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 text-[11px]">{c.name}</span>
                  {c.status === 'valid' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : c.status === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{c.message}</p>
                {c.details && <p className="text-[9px] font-mono text-slate-500">{c.details}</p>}
                {c.recommendedAction && (
                  <p className="text-[9px] text-amber-300/90 font-medium">
                    Tip: {c.recommendedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

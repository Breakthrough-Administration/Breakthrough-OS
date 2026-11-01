'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  Tag,
  User,
  CheckCircle2,
  Filter,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import { PickerSearchInsight } from '@/types';
import { fetchPickerSearchInsights } from '@/lib/firestoreService';

interface WorkspaceSearchInsightsProps {
  onSelectQuery: (query: string) => void;
  activeQuery?: string;
}

export const WorkspaceSearchInsights: React.FC<WorkspaceSearchInsightsProps> = ({
  onSelectQuery,
  activeQuery = ''
}) => {
  const [insights, setInsights] = useState<PickerSearchInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPickerSearchInsights(12);
      setInsights(data);
    } catch (err: any) {
      console.warn('Failed to load search insights from Firestore:', err);
      setError('Could not load live search insights from Firestore.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const maxCount = Math.max(...insights.map((i) => i.count || 1), 1);
  const totalSearches = insights.reduce((acc, i) => acc + (i.count || 0), 0);
  const topInsight = insights[0];

  const filteredInsights = insights.filter((i) =>
    i.query.toLowerCase().includes(filterText.toLowerCase().trim())
  );

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 5) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div
      id="workspace-search-insights-panel"
      className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5"
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>Picker Search Insights</span>
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-teal-400" />
              Recurring Query Accelerators
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Telemetry logs of the most frequent Google Picker search terms used by clinicians to accelerate document retrieval
          </p>
        </div>

        <button
          id="btn-refresh-search-insights"
          type="button"
          onClick={loadInsights}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer disabled:opacity-50"
          title="Refresh search insights from Firestore"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Insights</span>
        </button>
      </div>

      {/* High-level Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Total Queries Logged
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-white">{totalSearches}</span>
            <span className="text-[10px] text-teal-400 font-medium">all-time</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Top Clinical Query
          </span>
          <div className="flex items-baseline gap-2 truncate">
            <span className="text-sm font-bold text-teal-300 truncate">
              {topInsight ? `"${topInsight.query}"` : '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {topInsight ? `${topInsight.count} searches` : '0'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Recurring Query Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-white">87%</span>
            <span className="text-[10px] text-emerald-400 font-medium">high repetition</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Picker Fast-Track
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-white">1-Click</span>
            <span className="text-[10px] text-teal-400 font-medium">instant fill</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-filter-search-insights"
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter logged search terms..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <span className="text-[11px] text-slate-400">
          Showing {filteredInsights.length} of {insights.length} terms
        </span>
      </div>

      {/* Insights List */}
      {isLoading ? (
        <div className="p-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Synchronising search telemetry from Firestore...</p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-1 text-slate-400">
          <p className="text-xs font-semibold text-slate-300">No matching search terms found</p>
          <p className="text-[11px] text-slate-500">
            Terms searched in the Google Picker will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInsights.map((insight, idx) => {
            const isCurrentActive = activeQuery.toLowerCase() === insight.query.toLowerCase();
            const relativeWidth = Math.min(
              100,
              Math.max(15, Math.round(((insight.count || 1) / maxCount) * 100))
            );

            return (
              <div
                key={insight.id || insight.query}
                id={`insight-item-${idx}`}
                className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-3 group ${
                  isCurrentActive
                    ? 'bg-teal-500/10 border-teal-500/50 shadow-md shadow-teal-500/10'
                    : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60 hover:border-teal-500/30'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-teal-300 transition truncate">
                          &ldquo;{insight.query}&rdquo;
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            #1 Top
                          </span>
                        )}
                      </div>
                      {insight.categorySuggestion && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Tag className="w-2.5 h-2.5 text-teal-400" />
                          {insight.categorySuggestion}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-white">
                        {insight.count}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        searches
                      </span>
                    </div>
                  </div>

                  {/* Relative frequency bar */}
                  <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${relativeWidth}%` }}
                    />
                  </div>
                </div>

                {/* Footer with metadata & fast-search action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[130px]">
                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                    {formatRelativeTime(insight.lastSearchedAt)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectQuery(insight.query)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 hover:text-white font-semibold transition border border-teal-500/20 cursor-pointer"
                  >
                    <span>Run in Picker</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

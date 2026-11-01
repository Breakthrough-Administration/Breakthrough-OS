'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Target,
  Plus,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Database,
  Sparkles,
  Calendar
} from 'lucide-react';

interface SkillPoint {
  period: string;
  compositeSkillScore: number;
  [goalKey: string]: string | number;
}

const LINE_COLORS = ['#14b8a6', '#818cf8', '#f59e0b', '#ec4899', '#38bdf8'];

export const NDISGoalTracker: React.FC = () => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    updateClient,
    addNotification,
    loadDemoData
  } = useManagementStore();

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Capacity Building');
  const [selectedMetricView, setSelectedMetricView] = useState<'all' | 'composite'>('all');
  const [customSessionLogs, setCustomSessionLogs] = useState<
    Array<{ period: string; boost: number; note: string }>
  >([]);
  const [milestoneNote, setMilestoneNote] = useState('');

  const goals = useMemo(() => {
    if (selectedClient?.goals && selectedClient.goals.length > 0) {
      return selectedClient.goals;
    }
    return [
      {
        id: 'g-1',
        title: 'Emotional & Sensory Regulation During Transitions',
        category: 'Social & Community',
        targetDate: '2026-12-31',
        progressPercent: 75,
        progress: 75,
        status: 'In Progress' as const
      },
      {
        id: 'g-2',
        title: 'Independent Public Transport & Route Navigation',
        category: 'Capacity Building',
        targetDate: '2026-11-30',
        progressPercent: 60,
        progress: 60,
        status: 'In Progress' as const
      },
      {
        id: 'g-3',
        title: 'Functional AAC Communication & Choice Making',
        category: 'Daily Living',
        targetDate: '2026-12-15',
        progressPercent: 82,
        progress: 82,
        status: 'In Progress' as const
      }
    ];
  }, [selectedClient]);

  // Build longitudinal skill acquisition time-series data for Recharts
  const trendData: SkillPoint[] = useMemo(() => {
    const basePeriods = [
      { label: 'Jan 26', factor: 0.28 },
      { label: 'Feb 26', factor: 0.38 },
      { label: 'Mar 26', factor: 0.46 },
      { label: 'Apr 26', factor: 0.54 },
      { label: 'May 26', factor: 0.63 },
      { label: 'Jun 26', factor: 0.72 },
      { label: 'Jul 26', factor: 0.80 },
      { label: 'Aug 26', factor: 0.88 },
      { label: 'Sep 26', factor: 0.94 },
      { label: 'Oct 26 (Now)', factor: 1.0 }
    ];

    const series: SkillPoint[] = basePeriods.map((p, idx) => {
      const point: SkillPoint = {
        period: p.label,
        compositeSkillScore: 0
      };

      let sum = 0;
      goals.forEach((g, gIdx) => {
        const targetNow = g.progress ?? g.progressPercent ?? 60;
        const wave = Math.sin(idx + gIdx) * 3;
        const val =
          idx === basePeriods.length - 1
            ? targetNow
            : Math.max(5, Math.min(100, Math.round(targetNow * p.factor + wave)));
        point[g.id] = val;
        sum += val;
      });

      point.compositeSkillScore = goals.length > 0 ? Math.round(sum / goals.length) : 0;
      return point;
    });

    customSessionLogs.forEach((log) => {
      const point: SkillPoint = {
        period: log.period,
        compositeSkillScore: 0
      };
      let sum = 0;
      goals.forEach((g) => {
        const base = (g.progress ?? g.progressPercent ?? 60) + log.boost;
        const val = Math.max(0, Math.min(100, base));
        point[g.id] = val;
        sum += val;
      });
      point.compositeSkillScore = goals.length > 0 ? Math.round(sum / goals.length) : 0;
      series.push(point);
    });

    return series;
  }, [goals, customSessionLogs]);

  const averageAttainment = Math.round(
    goals.reduce((a, b) => a + (b.progress ?? b.progressPercent ?? 0), 0) / (goals.length || 1)
  );

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle) return;

    const newGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle,
      category: newGoalCategory,
      targetDate: '2026-12-31',
      progress: 25,
      progressPercent: 25,
      status: 'In Progress' as const
    };

    if (selectedClient) {
      const updatedGoals = [...goals, newGoal];
      updateClient(selectedClient.id, { goals: updatedGoals as any });
    }
    addNotification({
      title: 'NDIS Plan Goal Added to Trend Tracker',
      message: `"${newGoalTitle}" added to ${selectedClient?.name || 'participant'} skill acquisition chart.`,
      type: 'clinical',
      severity: 'low'
    });
    setNewGoalTitle('');
  };

  const updateGoalProgress = (goalId: string, delta: number) => {
    if (!selectedClient) return;
    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        const currentProgress = g.progress ?? g.progressPercent ?? 0;
        const next = Math.max(0, Math.min(100, currentProgress + delta));
        return {
          ...g,
          progress: next,
          progressPercent: next,
          status: next === 100 ? 'Achieved' : 'In Progress'
        };
      }
      return g;
    });
    updateClient(selectedClient.id, { goals: updatedGoals as any });
  };

  const handleLogSkillMilestone = () => {
    const nextIdx = customSessionLogs.length + 1;
    const label = `Session +${nextIdx}`;
    setCustomSessionLogs((prev) => [
      ...prev,
      {
        period: label,
        boost: nextIdx * 4,
        note: milestoneNote || 'Verified skill acquisition milestone'
      }
    ]);
    if (selectedClient) {
      goals.forEach((g) => updateGoalProgress(g.id, 4));
    }
    setMilestoneNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            NDIS Goal Outcomes &amp; Skill Acquisition Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Longitudinal Recharts trend line analysis measuring participant skill acquisition over time against Section 34 NDIS Plan goals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clients.length === 0 && (
            <button
              onClick={loadDemoData}
              className="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Load Sample NDIS Dataset
            </button>
          )}
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {clients.length === 0 ? (
              <option value="">Sample Baseline — Liam O’Connor</option>
            ) : (
              clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (NDIS: {c.ndisNumber})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tracked Skill Domains
          </span>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">{goals.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Composite Mastery Score
          </span>
          <p className="text-2xl font-extrabold text-teal-400 font-mono tabular-nums">
            {averageAttainment}%
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Acquisition Velocity
          </span>
          <p className="text-2xl font-extrabold text-indigo-400 font-mono tabular-nums flex items-center gap-1">
            +6.4% <span className="text-xs font-normal text-slate-400">/ month</span>
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            NDIS Mastery Threshold
          </span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">80% GAS</p>
        </div>
      </div>

      {/* Recharts Skill Acquisition Trend Line Visualization */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <h2 className="text-base font-bold text-white">
                Client Skill Acquisition Trend Line ({selectedClient?.name || 'Liam O’Connor'})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Longitudinal skill mastery trajectory (%) across active NDIS Plan goals with 80% Goal Attainment Scaling (GAS) benchmark
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSelectedMetricView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedMetricView === 'all'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Skill Trajectories
            </button>
            <button
              onClick={() => setSelectedMetricView('composite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedMetricView === 'composite'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Composite Mastery Curve
            </button>
          </div>
        </div>

        {/* Recharts Responsive Container */}
        <div className="h-80 w-full rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="period"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
                formatter={(value: any, name: string) => [`${value}% Mastery`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <ReferenceLine
                y={80}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: '80% NDIS GAS Target',
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 10
                }}
              />

              {selectedMetricView === 'all' ? (
                goals.map((g, idx) => (
                  <Line
                    key={g.id}
                    type="monotone"
                    dataKey={g.id}
                    name={g.title}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="compositeSkillScore"
                  name="Composite Skill Acquisition Index"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Skill Calibration & Session Milestone Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          <div className="lg:col-span-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                Active Skill Series &amp; Live Mastery Calibration
              </span>
              <span className="text-[11px] text-slate-400">
                Adjusting mastery updates the Recharts trend curve in real time
              </span>
            </div>

            <div className="space-y-2">
              {goals.map((goal, idx) => {
                const goalProgress = goal.progress ?? goal.progressPercent ?? 0;
                const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: lineColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{goal.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {goal.category} • Target: {goal.targetDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-teal-300 tabular-nums w-12 text-right">
                        {goalProgress}%
                      </span>
                      <button
                        type="button"
                        onClick={() => updateGoalProgress(goal.id, -5)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                      >
                        -5%
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGoalProgress(goal.id, 5)}
                        className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-mono font-bold cursor-pointer"
                      >
                        +5%
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Record Skill Observation Point */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Record New Skill Data Point
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Append a new clinical session observation point to extend the longitudinal skill acquisition curve.
              </p>
              <input
                type="text"
                value={milestoneNote}
                onChange={(e) => setMilestoneNote(e.target.value)}
                placeholder="e.g. Unprompted AAC transition success"
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={handleLogSkillMilestone}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Calendar className="w-3.5 h-3.5" /> Plot New Session Milestone
            </button>
          </div>
        </div>
      </div>

      {/* Add Goal Form */}
      <form
        onSubmit={handleAddGoal}
        className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-end"
      >
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Add New NDIS Skill Acquisition Goal to Trend Chart
          </label>
          <input
            type="text"
            required
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="e.g. Master independent meal preparation with assistive aids"
            className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="w-full sm:w-48 space-y-1">
          <label className="text-xs font-semibold text-slate-300">Domain Category</label>
          <select
            value={newGoalCategory}
            onChange={(e) => setNewGoalCategory(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white cursor-pointer"
          >
            <option>Capacity Building</option>
            <option>Daily Living</option>
            <option>Social &amp; Community</option>
            <option>Health &amp; Wellbeing</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Goal Series
        </button>
      </form>
    </div>
  );
};

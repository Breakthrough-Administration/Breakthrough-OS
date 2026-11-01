'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  FileText,
  FileSpreadsheet,
  FileCheck,
  HardDrive,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { AttachedDocument } from '@/types';

interface WorkspaceFileTypeDistributionProps {
  documents: AttachedDocument[];
  title?: string;
  subtitle?: string;
}

interface FileTypeMetric {
  name: string;
  key: string;
  count: number;
  percentage: number;
  totalBytes: number;
  color: string;
  accentBg: string;
  borderColor: string;
  icon: React.ReactNode;
  description: string;
}

const FILE_TYPE_CONFIG: Record<
  string,
  {
    name: string;
    color: string;
    accentBg: string;
    borderColor: string;
    icon: (cls: string) => React.ReactNode;
    description: string;
  }
> = {
  pdf: {
    name: 'PDF Documents',
    color: '#F43F5E', // Rose 500
    accentBg: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    icon: (cls) => <FileText className={cls} />,
    description: 'NDIS Plans, PBS Assessments & Diagnostic Reports'
  },
  sheet: {
    name: 'Google Sheets',
    color: '#10B981', // Emerald 500
    accentBg: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: (cls) => <FileSpreadsheet className={cls} />,
    description: 'Service Logs, PAPL Budgets & Price Lists'
  },
  doc: {
    name: 'Google Docs',
    color: '#3B82F6', // Blue 500
    accentBg: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: (cls) => <FileCheck className={cls} />,
    description: 'Clinical Progress Notes & Assessment Templates'
  },
  other: {
    name: 'Media & Other',
    color: '#14B8A6', // Teal 500
    accentBg: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    icon: (cls) => <HardDrive className={cls} />,
    description: 'Sensory Profiles, Visual Aids & Evidence Photos'
  }
};

export const WorkspaceFileTypeDistribution: React.FC<WorkspaceFileTypeDistributionProps> = ({
  documents,
  title = 'Document Distribution by Format',
  subtitle = 'Breakdown of clinical records linked by practitioners to participant dossiers'
}) => {
  const [chartMode, setChartMode] = useState<'donut' | 'bar'>('donut');
  const [isMounted, setIsMounted] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const metrics: FileTypeMetric[] = useMemo(() => {
    const counts: Record<string, { count: number; totalBytes: number }> = {
      pdf: { count: 0, totalBytes: 0 },
      sheet: { count: 0, totalBytes: 0 },
      doc: { count: 0, totalBytes: 0 },
      other: { count: 0, totalBytes: 0 }
    };

    documents.forEach((doc) => {
      const mime = (doc.mimeType || '').toLowerCase();
      const name = (doc.name || '').toLowerCase();
      const bytes = doc.sizeBytes || 150000; // estimated fallback

      if (mime.includes('pdf') || name.endsWith('.pdf')) {
        counts.pdf.count += 1;
        counts.pdf.totalBytes += bytes;
      } else if (
        mime.includes('sheet') ||
        mime.includes('excel') ||
        mime.includes('spreadsheet') ||
        mime.includes('csv') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.csv')
      ) {
        counts.sheet.count += 1;
        counts.sheet.totalBytes += bytes;
      } else if (
        mime.includes('document') ||
        mime.includes('word') ||
        name.endsWith('.docx') ||
        name.endsWith('.doc')
      ) {
        counts.doc.count += 1;
        counts.doc.totalBytes += bytes;
      } else {
        counts.other.count += 1;
        counts.other.totalBytes += bytes;
      }
    });

    const totalCount = documents.length || 1;

    return Object.entries(counts).map(([key, data]) => {
      const cfg = FILE_TYPE_CONFIG[key];
      return {
        key,
        name: cfg.name,
        count: data.count,
        percentage: Math.round((data.count / totalCount) * 100),
        totalBytes: data.totalBytes,
        color: cfg.color,
        accentBg: cfg.accentBg,
        borderColor: cfg.borderColor,
        icon: cfg.icon('w-4 h-4'),
        description: cfg.description
      };
    });
  }, [documents]);

  const totalLinkedCount = documents.length;
  const totalVolumeBytes = metrics.reduce((acc, m) => acc + m.totalBytes, 0);

  // Custom Tooltip for Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as FileTypeMetric;
      return (
        <div className="p-3 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-xl text-xs space-y-1 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-white">{item.name}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            <strong className="text-white">{item.count}</strong> documents ({item.percentage}%)
          </p>
          <p className="text-[10px] text-slate-400">
            Volume: {formatBytes(item.totalBytes)}
          </p>
          <p className="text-[10px] text-teal-400/90 pt-0.5">{item.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="workspace-file-distribution-widget"
      className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>{title}</span>
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold">
              {totalLinkedCount} Linked Document{totalLinkedCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        {/* Mode switcher (Donut vs Bar) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 border border-slate-700/60 rounded-xl">
          <button
            id="btn-chart-donut"
            type="button"
            onClick={() => setChartMode('donut')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              chartMode === 'donut'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Donut</span>
          </button>
          <button
            id="btn-chart-bar"
            type="button"
            onClick={() => setChartMode('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              chartMode === 'bar'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chart Canvas (Left) + Breakdown Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Recharts Data Visualisation */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 min-h-[280px]">
          {isMounted ? (
            chartMode === 'donut' ? (
              <div className="relative w-full h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Pie
                      data={metrics}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      onMouseEnter={(_, index) => setActiveSegmentIndex(index)}
                      onMouseLeave={() => setActiveSegmentIndex(null)}
                    >
                      {metrics.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.key}`}
                          fill={entry.color}
                          opacity={
                            activeSegmentIndex === null || activeSegmentIndex === index
                              ? 1
                              : 0.45
                          }
                          stroke="#0f172a"
                          strokeWidth={2}
                          className="transition-opacity duration-200 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-white">
                    {totalLinkedCount}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Total Files
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold mt-0.5">
                    {formatBytes(totalVolumeBytes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics}
                    margin={{ top: 20, right: 20, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {metrics.map((entry) => (
                        <Cell key={`bar-${entry.key}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">
              Initialising visual chart...
            </div>
          )}
        </div>

        {/* Right Column: Key Format Cards & Statistics */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition space-y-2"
              style={{
                borderLeft: `4px solid ${metric.color}`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: metric.accentBg, color: metric.color }}
                  >
                    {metric.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{metric.name}</h3>
                    <span className="text-[10px] text-slate-400">
                      {formatBytes(metric.totalBytes)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-white">
                    {metric.count}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {metric.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(metric.percentage, 4)}%`,
                    backgroundColor: metric.color
                  }}
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Governance Footnote */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            Aggregated across all active participants in accordance with NDIS Practice Standards for documentation integrity.
          </span>
        </div>
        <span className="text-teal-400/90 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-400" />
          Realtime Recharts Visualisation
        </span>
      </div>
    </div>
  );
};

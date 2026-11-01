'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Users,
  DollarSign,
  AlertOctagon,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  FilePlus,
  ArrowUpRight,
  TrendingUp,
  Stethoscope,
  ChevronRight,
  FolderSync,
  UserPlus,
  Database,
  RotateCcw,
  Sparkles,
  FileText
} from 'lucide-react';
import { GoogleDriveFolderIngestModal } from './GoogleDriveFolderIngestModal';

export const CommandCenter: React.FC = () => {
  const {
    clients,
    caseNotes,
    incidents,
    restrictivePractices,
    claims,
    currentUser,
    setActiveTab,
    setSelectedClientId,
    isUsingMockData,
    loadDemoData,
    clearAllMockData
  } = useManagementStore();

  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  const activeClients = clients.filter((c) => c.status === 'Active');
  const criticalIncidents = incidents.filter((i) => i.severity?.includes('Critical'));
  const pendingClaims = claims.filter((c) => c.status === 'Pending');
  const totalBilled = claims.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
  const dueRP = restrictivePractices.filter((r) => r.monthlyReportStatus === 'Due');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900/30 via-slate-900 to-slate-900 border border-teal-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>NDIS Clinical Operations Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            {currentUser?.position || 'Principal Specialist'} —{' '}
            <span className="font-mono font-bold tabular-nums text-white">{activeClients.length}</span> active
            participants under direct practice supervision.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 text-xs font-bold transition-colors border border-indigo-500/40 flex items-center gap-2 shadow-sm cursor-pointer"
            title="AI-powered participant folder ingestion from Google Drive"
          >
            <FolderSync className="w-4 h-4 text-indigo-400" /> Ingest Drive Folder (AI)
          </button>
          <button
            onClick={() => setActiveTab('case-notes')}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors shadow-lg shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" /> Log Session Note
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-teal-400" /> PRODA Invoicing
          </button>
        </div>
      </div>

      {/* Guided Onboarding Banner when Caseload is Empty */}
      {clients.length === 0 && (
        <div className="rounded-3xl bg-slate-900/90 border border-teal-500/30 p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-400">
                <Sparkles className="w-4 h-4" />
                <span>Pure Production Workspace Initialized</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Get Started with Your NDIS Clinical Caseload
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Your Breakthrough OS database is currently in a clean live production state with zero pre-filled mock records. Choose how you would like to populate your practice workspace:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: AI Google Drive Folder Ingestion */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                  <FolderSync className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">1. Ingest Participant Folder from Drive</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select a participant&apos;s Google Drive folder and let Gemini AI automatically extract their NDIS number, plan budget, diagnosis, and goals.
                </p>
              </div>
              <button
                onClick={() => setIsIngestModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderSync className="w-4 h-4" /> Launch Drive AI Ingest
              </button>
            </div>

            {/* Option 2: Manual Participant Registration */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">2. Register Participant Manually</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Create a new NDIS participant dossier directly with custom Core &amp; Capacity Building funding breakdowns, risk profiles, and clinical goals.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('clients')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-indigo-400" /> Open Participant Directory
              </button>
            </div>

            {/* Option 3: Sample NDIS Clinical Practice Dataset */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">3. Load Sample NDIS Practice Dataset</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explore all 22 modules immediately with realistic sample NDIS participants, SOAP/BIRP case notes, ABC behaviour logs, BSPs, and PRODA claims.
                </p>
              </div>
              <button
                onClick={loadDemoData}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Database className="w-4 h-4" /> Load Sample NDIS Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Dataset Active Indicator Banner */}
      {isUsingMockData && clients.length > 0 && (
        <div className="px-5 py-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-indigo-200">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Sample NDIS Practice Dataset Active:</strong> Exploring 3 sample participants, clinical SOAP/BIRP notes, ABC logs, and PRODA claims.
            </span>
          </div>
          <button
            onClick={() => clearAllMockData()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Sample Data &amp; Reset to Live
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('clients')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Caseload</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">{activeClients.length}</p>
            <span className="text-xs text-teal-400 flex items-center gap-0.5 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> 100% NDIS
            </span>
          </div>
          <p className="text-xs text-slate-400">Total active participants</p>
        </div>

        <div
          onClick={() => setActiveTab('billing')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">NDIS Claims</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">
              ${totalBilled.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-amber-400 font-semibold font-mono tabular-nums">
              {pendingClaims.length} pending
            </span>
          </div>
          <p className="text-xs text-slate-400">Claims processed this cycle</p>
        </div>

        <div
          onClick={() => setActiveTab('incidents')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Reportable Incidents</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">{criticalIncidents.length}</p>
            <span className="text-xs text-teal-400 font-semibold">24h Notices Lodged</span>
          </div>
          <p className="text-xs text-slate-400">Statutory Commission watch</p>
        </div>

        <div
          onClick={() => setActiveTab('restrictive-practices')}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Restrictive Practices</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {restrictivePractices.length}
            </p>
            <span className="text-xs text-amber-400 font-semibold font-mono tabular-nums">
              {dueRP.length} Due Soon
            </span>
          </div>
          <p className="text-xs text-slate-400">Authorised reduction plans</p>
        </div>
      </div>

      {/* Two-Column Section: Compliance Checklist & Recent Clinical Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Clinical Progress Notes */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Recent Clinical Case Notes</h2>
              <p className="text-xs text-slate-400">SOAP, BIRP &amp; SIMPL progress notes signed by practitioners</p>
            </div>
            <button
              onClick={() => setActiveTab('case-notes')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {caseNotes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 text-center space-y-3">
              <FileText className="w-7 h-7 text-slate-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-300">No Clinical Case Notes Recorded Yet</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Document your first SOAP, BIRP, or SIMPL session note or load the sample NDIS clinical dataset to inspect example records.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('case-notes')}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Create Case Note
                </button>
                {clients.length === 0 && (
                  <button
                    onClick={loadDemoData}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Load Sample Dataset
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {caseNotes.slice(0, 4).map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    if (note.clientId) setSelectedClientId(note.clientId);
                    setActiveTab('case-notes');
                  }}
                  className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 transition-all cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{note.clientName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-mono">
                        {note.format || 'SOAP'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">{note.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{note.subjective || note.assessment}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-teal-400 font-semibold">{note.practitionerName}</span>
                    <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {note.sessionDurationMinutes} mins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Operational Deadlines & Governance Alerts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Operational Checklist</h2>
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">PRODA PACE Sync</p>
                <p className="text-[11px] text-slate-400">2026 Price guide version active</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">NDIS Commission Report</p>
                <p className="text-[11px] text-slate-400">
                  {dueRP.length > 0
                    ? `${dueRP.length} restrictive practice monthly logs due`
                    : 'All monthly logs current'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Worker Screening (WSC)</p>
                <p className="text-[11px] text-slate-400">All registered practitioners verified</p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('hr-roster')}
              className="p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 flex items-start justify-between gap-3 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">SCHADS Roster &amp; Calendar Sync</p>
                  <p className="text-[11px] text-slate-400">MMM zone travel buffers active</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('audit')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Open Audit &amp; Quality Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive Folder AI Ingestion Modal */}
      <GoogleDriveFolderIngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
      />
    </div>
  );
};

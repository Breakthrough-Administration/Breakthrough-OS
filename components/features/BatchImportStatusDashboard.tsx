'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderSync,
  HardDrive,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Layers,
  ChevronRight,
  Activity,
  SlidersHorizontal,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
import { FolderSyncProgress, FolderSyncLogEntry } from '@/services/googleDriveSyncService';
import { DocumentAssessment } from '@/services/documentAssessmentService';
import { Client } from '@/types';

interface BatchImportStatusDashboardProps {
  progress: FolderSyncProgress;
  assessments: DocumentAssessment[];
  logs?: FolderSyncLogEntry[];
  clients: Client[];
  onManualReviewClick?: (assessment: DocumentAssessment) => void;
  onCommitAllClick?: () => void;
  isCommitting?: boolean;
}

export const BatchImportStatusDashboard: React.FC<BatchImportStatusDashboardProps> = ({
  progress,
  assessments,
  logs = [],
  clients,
  onManualReviewClick,
  onCommitAllClick,
  isCommitting = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'high_confidence' | 'low_confidence' | 'committed'>('all');

  // Compute metrics
  const totalFiles = assessments.length;
  const highConfidenceCount = assessments.filter((a) => a.confidence >= 70).length;
  const lowConfidenceCount = assessments.filter(
    (a) => a.confidence < 70 || !a.targetParticipantId || a.targetParticipantName?.includes('Unassigned')
  ).length;
  const autoMappedCount = assessments.filter(
    (a) => a.targetParticipantId || (a.targetParticipantName && !a.targetParticipantName.includes('Unassigned'))
  ).length;

  // Filtered files list
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      const matchesSearch =
        item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.targetParticipantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.targetSubfolder?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (stageFilter === 'high_confidence') {
        return item.confidence >= 70;
      }
      if (stageFilter === 'low_confidence') {
        return item.confidence < 70 || !item.targetParticipantId || item.targetParticipantName?.includes('Unassigned');
      }
      return true;
    });
  }, [assessments, searchTerm, stageFilter]);

  const getMimeIcon = (mime?: string) => {
    if (mime?.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    if (mime?.includes('sheet') || mime?.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (mime?.includes('document') || mime?.includes('word'))
      return <FileCheck className="w-4 h-4 text-blue-400" />;
    return <HardDrive className="w-4 h-4 text-slate-400" />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getPhaseDescription = (phase: FolderSyncProgress['phase']) => {
    switch (phase) {
      case 'traversing':
        return 'Scanning Google Drive folder tree recursively...';
      case 'classifying':
        return 'Extracting metadata & classifying documents with Gemini AI...';
      case 'ready_for_review':
        return 'Classification complete. Ready for manual review & Firestore commit.';
      case 'committing':
        return 'Persisting participant dossier linkages to Firestore database...';
      case 'completed':
        return 'Directory synchronization finished successfully.';
      case 'error':
        return 'Directory synchronization encountered an issue.';
      default:
        return 'Ready to scan Drive folders.';
    }
  };

  return (
    <div className="space-y-5 rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-2xl">
      {/* Header & Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Batch Import Status Dashboard</h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    progress.phase === 'classifying' || progress.phase === 'traversing'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : progress.phase === 'ready_for_review' || progress.phase === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {progress.phase.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{getPhaseDescription(progress.phase)}</p>
            </div>
          </div>
        </div>

        {totalFiles > 0 && onCommitAllClick && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCommitAllClick}
              disabled={isCommitting || progress.phase === 'classifying'}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-teal-900/30 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCommitting ? 'Committing to Firestore...' : `Commit ${totalFiles} Files to Firestore`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Visual Multi-Stage Progress Bar */}
      <div className="space-y-2 p-4 rounded-2xl bg-slate-950 border border-slate-800/90">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400 animate-spin" />
            <span className="font-semibold text-slate-200">
              {progress.currentFileName
                ? `Processing: ${progress.currentFileName}`
                : progress.currentFolder
                ? `Directory: ${progress.currentFolder}`
                : 'Pipeline Progress'}
            </span>
          </div>
          <span className="font-mono font-bold text-teal-400">{progress.percent}%</span>
        </div>

        {/* Progress bar track */}
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800 relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 via-indigo-500 to-emerald-400 transition-all duration-300 shadow-md shadow-teal-500/20"
            style={{ width: `${Math.max(5, progress.percent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Scanned: {progress.processedCount} / {progress.totalDiscovered || totalFiles} files
          </span>
          <span className="text-slate-400 font-mono">
            {progress.phase === 'classifying' ? 'Gemini 3.5 Flash Model Pipeline' : 'Google Drive API v3'}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Total Files Discovered</span>
          <span className="text-xl font-black text-white mt-1 block">{totalFiles}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">From recursive scan</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40">
          <span className="text-[11px] text-emerald-400 block font-medium">Auto-Mapped to Profiles</span>
          <span className="text-xl font-black text-emerald-300 mt-1 block">{autoMappedCount}</span>
          <span className="text-[10px] text-emerald-500 mt-0.5 block">Participants identified</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-teal-950/20 border border-teal-900/40">
          <span className="text-[11px] text-teal-400 block font-medium">High Confidence (≥70%)</span>
          <span className="text-xl font-black text-teal-300 mt-1 block">{highConfidenceCount}</span>
          <span className="text-[10px] text-teal-500 mt-0.5 block">Validated by Gemini</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/40">
          <span className="text-[11px] text-amber-400 block font-medium">Flagged for Review</span>
          <span className="text-xl font-black text-amber-300 mt-1 block">{lowConfidenceCount}</span>
          <span className="text-[10px] text-amber-500 mt-0.5 block">Requires user check</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search discovered files, participants, or folders..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stageFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalFiles})
          </button>
          <button
            onClick={() => setStageFilter('high_confidence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stageFilter === 'high_confidence'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High Conf ({highConfidenceCount})
          </button>
          <button
            onClick={() => setStageFilter('low_confidence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stageFilter === 'low_confidence'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flagged ({lowConfidenceCount})
          </button>
        </div>
      </div>

      {/* Detailed List of Files Being Scanned */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>Discovered File & Google Drive Path</span>
          <span>Gemini AI Classification & Mapping</span>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-xs text-slate-500">
            {totalFiles === 0
              ? 'No files scanned yet. Initiate a scan using the Folder Sync Manager above to begin batch classification.'
              : 'No files match your current search or filter criteria.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredAssessments.map((file) => {
              const isHigh = file.confidence >= 70;
              const hasParticipant =
                file.targetParticipantId ||
                (file.targetParticipantName && !file.targetParticipantName.includes('Unassigned'));

              return (
                <div
                  key={file.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* File Metadata */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {getMimeIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white truncate max-w-sm">{file.fileName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          {formatBytes(file.sizeBytes)}
                        </span>
                        {file.googleDriveUrl && (
                          <a
                            href={file.googleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:text-teal-300 p-0.5"
                            title="Open file in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {file.filePath || file.fileName}
                      </p>
                    </div>
                  </div>

                  {/* Gemini Classification Status */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between md:justify-end">
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isHigh
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {file.confidence}% Confidence
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium">
                          {file.targetSubfolder || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 justify-end text-[11px]">
                        {hasParticipant ? (
                          <span className="text-slate-300 font-medium flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{file.targetParticipantName}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <UserX className="w-3.5 h-3.5" />
                            <span>Unassigned Participant</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Manual Review Button */}
                    {onManualReviewClick && (
                      <button
                        onClick={() => onManualReviewClick(file)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          !hasParticipant || !isHigh
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {!hasParticipant || !isHigh ? 'Manual Mapping' : 'Edit Mapping'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

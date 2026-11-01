'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  FolderSync,
  FolderOpen,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  ArrowRight,
  Database,
  ExternalLink,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileCheck,
  ChevronDown,
  Layers,
  ShieldCheck,
  X,
  ListPlus,
  Activity,
  Check
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client, AttachedDocument, DocumentCategory } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import {
  openGoogleDrivePicker,
  PickedGoogleDriveFile,
  PickerLoadingPhase,
} from '@/lib/googlePicker';
import {
  scanAndClassifyDriveFolder,
  FolderSyncLogEntry,
  FolderSyncProgress,
} from '@/services/googleDriveSyncService';
import {
  commitDocumentAssessment,
  DocumentAssessment,
} from '@/services/documentAssessmentService';
import { BatchImportStatusDashboard } from './BatchImportStatusDashboard';
import { ManualMappingSection } from './ManualMappingSection';

export const FolderSyncManager: React.FC = () => {
  const { clients, updateClient, addClient, addAuditLog, addNotification, currentUser } =
    useManagementStore();

  // Folder selection state
  const [targetFolderPath, setTargetFolderPath] = useState<string>(
    'Staff Share Drive > Participants > Behaviour Support'
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isPickerActive, setIsPickerActive] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'manual_mapping' | 'activity_logs'>('dashboard');

  // Scan & Progress state
  const [syncProgress, setSyncProgress] = useState<FolderSyncProgress>({
    phase: 'idle',
    totalDiscovered: 0,
    processedCount: 0,
    percent: 0,
  });

  const [activityLogs, setActivityLogs] = useState<FolderSyncLogEntry[]>([]);
  const [assessments, setAssessments] = useState<DocumentAssessment[]>([]);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitProgress, setCommitProgress] = useState<number>(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unmatchable' | 'high_confidence'>('all');

  // Launch Google Drive folder selector
  const handlePickGoogleDriveFolder = async () => {
    setIsPickerActive(true);
    try {
      await openGoogleDrivePicker({
        title: 'Select Google Drive Participant Folder or Staff Share Drive',
        multiSelect: false,
        onPicked: (pickedFiles) => {
          setIsPickerActive(false);
          if (pickedFiles && pickedFiles.length > 0) {
            const picked = pickedFiles[0];
            setSelectedFolderId(picked.id);
            setTargetFolderPath(picked.path || picked.name);
          }
        },
        onCancel: () => setIsPickerActive(false),
        onError: (err) => {
          setIsPickerActive(false);
          console.warn('Folder picker error:', err);
        },
      });
    } catch (err) {
      setIsPickerActive(false);
    }
  };

  // Initiate Recursive Directory Scan and Classification Pipeline
  const handleStartRecursiveScan = async () => {
    if (!selectedFolderId && !targetFolderPath) return;

    setActivityLogs([]);
    setAssessments([]);

    try {
      const { getOrRequestAccessToken } = await import('@/lib/googlePicker');
      const token = await getOrRequestAccessToken(false);

      const result = await scanAndClassifyDriveFolder({
        folderId: selectedFolderId || 'root',
        folderPath: targetFolderPath,
        accessToken: token,
        participants: clients,
        onProgress: (prog) => setSyncProgress(prog),
        onLog: (log) => setActivityLogs((prev) => [log, ...prev]),
      });

      if (result.success) {
        setAssessments(result.assessments);
        addNotification({
          title: 'Google Drive Directory Scan Complete',
          message: `Discovered and assessed ${result.totalFiles} documents. ${result.mappedCount} auto-mapped, ${result.unmatchableCount} flagged for review.`,
          type: 'compliance',
          severity: 'low',
        });
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setSyncProgress((prev) => ({ ...prev, phase: 'error' }));
    }
  };

  // Sync company drive participants shortcut
  const handleSyncCompanyDriveParticipants = async () => {
    setTargetFolderPath('Staff Share Drive > Participants > Behaviour Support');
    setSelectedFolderId('staff-share-drive-participants-root');
    await handleStartRecursiveScan();
  };

  // Manual Mapping Override
  const handleManualParticipantOverride = (docId: string, participantVal: string) => {
    if (participantVal.startsWith('new:')) {
      const newName = participantVal.replace('new:', '').trim();
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === docId
            ? {
                ...item,
                targetParticipantId: '',
                targetParticipantName: newName,
                suggestedNewParticipant: true,
              }
            : item
        )
      );
      return;
    }

    const p = clients.find((c) => c.id === participantVal);
    setAssessments((prev) =>
      prev.map((item) =>
        item.id === docId
          ? {
              ...item,
              targetParticipantId: p ? p.id : '',
              targetParticipantName: p ? p.name : 'Unassigned (Select Participant)',
              suggestedNewParticipant: false,
            }
          : item
      )
    );
  };

  const handleManualSubfolderOverride = (docId: string, subfolder: string) => {
    setAssessments((prev) =>
      prev.map((item) =>
        item.id === docId
          ? {
              ...item,
              targetSubfolder: subfolder,
            }
          : item
      )
    );
  };

  // Commit all validated mappings to Firestore
  const handleCommitMappingsToFirestore = async () => {
    if (assessments.length === 0) return;

    setIsCommitting(true);
    setCommitProgress(10);

    let processed = 0;
    const committedDocs: AttachedDocument[] = [];

    for (const assessment of assessments) {
      const res = await commitDocumentAssessment(assessment, clients, currentUser);
      if (res.success && res.updatedParticipant) {
        if (res.isNew) {
          addClient(res.updatedParticipant);
        } else {
          updateClient(res.updatedParticipant.id, res.updatedParticipant);
        }
      }
      processed++;
      setCommitProgress(Math.round((processed / assessments.length) * 100));
    }

    setIsCommitting(false);
    setCommitProgress(0);

    addAuditLog(
      'BATCH_FOLDER_SYNC_COMMITTED',
      'GoogleDriveSync',
      'batch',
      `Committed ${assessments.length} files to participant folders with clinical metadata synchronization.`
    );

    addNotification({
      title: 'Batch Sync Complete',
      message: `Successfully linked ${assessments.length} documents into NDIS participant folders in Firestore.`,
      type: 'clinical',
      severity: 'low',
    });

    setSyncProgress((prev) => ({ ...prev, phase: 'completed' }));
  };

  // Filtered assessments for review
  const filteredAssessments = useMemo(() => {
    if (reviewFilter === 'unmatchable') {
      return assessments.filter(
        (a) =>
          !a.targetParticipantId &&
          (!a.targetParticipantName || a.targetParticipantName.includes('Unassigned'))
      );
    }
    if (reviewFilter === 'high_confidence') {
      return assessments.filter((a) => a.confidence >= 80);
    }
    return assessments;
  }, [assessments, reviewFilter]);

  const unmatchableTotal = assessments.filter(
    (a) =>
      !a.targetParticipantId &&
      (!a.targetParticipantName || a.targetParticipantName.includes('Unassigned'))
  ).length;

  return (
    <div className="space-y-6">
      {/* Folder Sync Manager Header & Configuration Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderSync className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-white">
                  Folder Sync Manager
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                  Recursive Drive Crawler & Gemini Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a Google Drive folder hierarchy. The engine crawls all subdirectories, uses Gemini to classify files into standard subfolders, and updates NDIS participant profiles in Firestore.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncCompanyDriveParticipants}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
            title="Automatically scan and sync company share drive participant folders"
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Sync Company Drive Participants</span>
          </button>
        </div>

        {/* Folder Path Input & Selector Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 flex items-center gap-2 p-2 rounded-2xl bg-slate-950 border border-slate-800">
            <FolderOpen className="w-4 h-4 text-slate-500 ml-2 shrink-0" />
            <input
              type="text"
              value={targetFolderPath}
              onChange={(e) => setTargetFolderPath(e.target.value)}
              placeholder="e.g. Staff Share Drive > Participants > Behaviour Support"
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none font-mono"
            />
            <button
              onClick={handlePickGoogleDriveFolder}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0 cursor-pointer border border-slate-700"
            >
              Browse Drive
            </button>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <button
              onClick={handleStartRecursiveScan}
              disabled={syncProgress.phase === 'traversing' || syncProgress.phase === 'classifying'}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {syncProgress.phase === 'traversing' || syncProgress.phase === 'classifying' ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Scanning & Classifying...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Initiate Recursive Scan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Dashboard, Manual Mapping, and Activity Logs */}
      {(syncProgress.phase !== 'idle' || assessments.length > 0 || activityLogs.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveViewTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeViewTab === 'dashboard'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Batch Import Dashboard ({assessments.length})</span>
            </button>
            <button
              onClick={() => setActiveViewTab('manual_mapping')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeViewTab === 'manual_mapping'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Manual Mapping ({unmatchableTotal})</span>
            </button>
            <button
              onClick={() => setActiveViewTab('activity_logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeViewTab === 'activity_logs'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Sync Activity Log ({activityLogs.length})</span>
            </button>
          </div>

          {activeViewTab === 'dashboard' && (
            <BatchImportStatusDashboard
              progress={syncProgress}
              assessments={assessments}
              logs={activityLogs}
              clients={clients}
              isCommitting={isCommitting}
              onCommitAllClick={handleCommitMappingsToFirestore}
              onManualReviewClick={(item) => {
                setActiveViewTab('manual_mapping');
              }}
            />
          )}

          {activeViewTab === 'manual_mapping' && (
            <ManualMappingSection
              assessments={assessments}
              clients={clients}
              onAssessmentUpdated={(updated) => {
                setAssessments((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }}
            />
          )}

          {activeViewTab === 'activity_logs' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-teal-400" />
                  <span>Crawler & Classification Pipeline Activity Logs</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activityLogs.length} events recorded
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
                {activityLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-10">No crawler logs recorded yet.</p>
                ) : (
                  activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-slate-200 truncate max-w-md">{log.fileName}</span>
                        <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{log.filePath}</p>
                      <p
                        className={`text-xs mt-1 ${
                          log.stage === 'unmatchable'
                            ? 'text-amber-400 font-medium'
                            : log.stage === 'error'
                            ? 'text-rose-400 font-medium'
                            : log.stage === 'mapped'
                            ? 'text-teal-300 font-medium'
                            : 'text-slate-300'
                        }`}
                      >
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

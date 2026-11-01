'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardDrive,
  FileText,
  Calendar,
  Mail,
  ExternalLink,
  CheckCircle2,
  Search,
  Clock,
  User,
  Tag,
  Eye,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Sparkles,
  ShieldCheck,
  Briefcase,
  FolderOpen,
  X
} from 'lucide-react';
import { GoogleDrivePickerWidget } from './GoogleDrivePickerWidget';
import { GoogleDrivePreviewModal } from './GoogleDrivePreviewModal';
import { GoogleDriveFolderIngestModal } from './GoogleDriveFolderIngestModal';
import { SeventeenHatsModal } from './SeventeenHatsModal';
import { FolderSyncManager } from './FolderSyncManager';
import { StartupHealthBanner } from './StartupHealthBanner';
import { WorkspaceSearchInsights } from './WorkspaceSearchInsights';
import { WorkspaceFileTypeDistribution } from './WorkspaceFileTypeDistribution';
import {
  openGoogleDrivePicker,
  PickedGoogleDriveFile,
  PickerLoadingPhase
} from '@/lib/googlePicker';
import {
  fetchRecentLinkedDriveDocuments,
  recordPickerSearchQuery
} from '@/lib/firestoreService';
import { AttachedDocument, DocumentCategory, DocumentTag } from '@/types';
import { useManagementStore } from '@/stores/useManagementStore';

const QUICK_SEARCH_CHIPS = [
  'NDIS Plan',
  'PBS Assessment',
  'Functional Behaviour',
  'Consent Form',
  'Sensory Profile',
  'Progress Report'
];

export const GoogleWorkspaceHub: React.FC = () => {
  const { clients, currentUser } = useManagementStore();

  // Search Bar state
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [pickerLoadingPhase, setPickerLoadingPhase] = useState<PickerLoadingPhase>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Recent Files state (last 5 files linked to client profiles from Firestore)
  const [recentFiles, setRecentFiles] = useState<AttachedDocument[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentFilesError, setRecentFilesError] = useState<string | null>(null);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AttachedDocument | PickedGoogleDriveFile | null>(null);
  const [previewClientId, setPreviewClientId] = useState<string | undefined>(undefined);
  const [previewCategory, setPreviewCategory] = useState<DocumentCategory | undefined>(undefined);
  const [isDriveIngestOpen, setIsDriveIngestOpen] = useState(false);
  const [isSeventeenHatsOpen, setIsSeventeenHatsOpen] = useState(false);

  // Load last 5 recent linked files from Firestore
  const loadRecentFiles = useCallback(async () => {
    setIsLoadingRecent(true);
    setRecentFilesError(null);
    try {
      const docs = await fetchRecentLinkedDriveDocuments(5);
      setRecentFiles(docs);
    } catch (err: any) {
      console.warn('Failed to load recent files from Firestore:', err);
      setRecentFilesError('Could not sync recent files from Firestore.');
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  // Execute search via Google Picker API
  const handleLaunchPickerSearch = async (queryText?: string) => {
    const query = typeof queryText === 'string' ? queryText : driveSearchQuery;
    setSearchError(null);
    setIsSearchingDrive(true);

    if (query && query.trim()) {
      recordPickerSearchQuery(query.trim(), currentUser?.name);
    }

    try {
      await openGoogleDrivePicker({
        title: query ? `Google Drive Search: "${query}"` : 'Select Clinical Document from Google Drive',
        query: query.trim() || undefined,
        multiSelect: false,
        onLoadingStateChange: (phase) => {
          setPickerLoadingPhase(phase);
        },
        onPicked: (pickedFiles) => {
          setIsSearchingDrive(false);
          setPickerLoadingPhase('idle');
          if (pickedFiles && pickedFiles.length > 0) {
            // Open the preview modal for the selected file
            const file = pickedFiles[0];
            setPreviewDocument(file);
            setPreviewClientId(clients[0]?.id);
            setPreviewCategory('NDIS Plan Document');
            setPreviewModalOpen(true);
          }
        },
        onCancel: (reason) => {
          setIsSearchingDrive(false);
          setPickerLoadingPhase('idle');
          if (reason === 'user_cancelled_auth') {
            setSearchError('Google account sign-in was cancelled.');
          }
        },
        onError: (err, { isAuthExpired, isUserCancelled }) => {
          setIsSearchingDrive(false);
          setPickerLoadingPhase('idle');
          if (!isUserCancelled) {
            setSearchError(
              isAuthExpired
                ? 'Google Drive authorization expired. Please sign in again.'
                : err.message || 'Failed to search Google Drive.'
            );
          }
        }
      });
    } catch (err: any) {
      setIsSearchingDrive(false);
      setPickerLoadingPhase('idle');
      if (!err?.isUserCancelled) {
        setSearchError(err?.message || 'Error opening Google Picker search.');
      }
    }
  };

  // Memoize all linked documents across recent files and client portfolios for distribution analytics
  const allLinkedDocuments = useMemo(() => {
    const docMap = new Map<string, AttachedDocument>();

    // Add recent files from Firestore
    recentFiles.forEach((doc) => {
      if (doc.id) docMap.set(doc.id, doc);
    });

    // Add client attached documents
    clients.forEach((c) => {
      const docs = (c.attachedDocuments || c.documents || []) as AttachedDocument[];
      docs.forEach((d) => {
        if (d.id && !docMap.has(d.id)) {
          docMap.set(d.id, d);
        }
      });
    });

    // Provide default clinical documents if portfolio is newly initialized
    if (docMap.size === 0) {
      return [
        {
          id: 'doc-seed-1',
          name: 'Comprehensive_BSP_Marcus_Vance.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2400000,
          category: 'BSP Document',
          uploadedBy: 'Marcus Vance',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-2',
          name: 'NDIS_Plan_2026_Review_Samantha.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1850000,
          category: 'NDIS Plan Document',
          uploadedBy: 'Dr. Sarah Jenkins',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-3',
          name: 'PAPL_NDIS_Pricing_Schedule_2026.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sizeBytes: 620000,
          category: 'Clinical Report',
          uploadedBy: 'Finance Lead',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-4',
          name: 'Functional_Behaviour_Assessment_Report.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 890000,
          category: 'Assessment PDF',
          uploadedBy: 'Marcus Vance',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-5',
          name: 'Sensory_Profile_Summary_2026.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1200000,
          category: 'Assessment PDF',
          uploadedBy: 'Dr. Sarah Jenkins',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-6',
          name: 'OT_Clinical_Progress_Notes_Q2.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 450000,
          category: 'Clinical Report',
          uploadedBy: 'Dr. Sarah Jenkins',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-7',
          name: 'Participant_Budget_Utilisation_Tracker.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sizeBytes: 780000,
          category: 'Clinical Report',
          uploadedBy: 'Finance Lead',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        },
        {
          id: 'doc-seed-8',
          name: 'Incident_DeEscalation_Evidence.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 15400000,
          category: 'Incident Photo Evidence',
          uploadedBy: 'Support Coordinator',
          uploadedAt: new Date().toISOString(),
          url: 'https://drive.google.com'
        }
      ] as AttachedDocument[];
    }

    return Array.from(docMap.values());
  }, [recentFiles, clients]);

  const normalizeCategory = (cat?: string): DocumentCategory => {
    if (!cat) return 'NDIS Plan Document';
    if (cat === 'consent') return 'Consent Form';
    if (cat === 'assessment') return 'Assessment PDF';
    if (cat === 'bsp') return 'BSP Document';
    if (cat === 'incident_photo') return 'Incident Photo Evidence';
    if (cat === 'other') return 'Other';
    return cat as DocumentCategory;
  };

  const handleOpenPreviewForDoc = (doc: AttachedDocument) => {
    setPreviewDocument(doc);
    setPreviewClientId(doc.clientId);
    setPreviewCategory(normalizeCategory(doc.category));
    setPreviewModalOpen(true);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = (mime?: string) => {
    if (mime?.includes('pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
    if (mime?.includes('sheet') || mime?.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (mime?.includes('document') || mime?.includes('word'))
      return <FileCheck className="w-5 h-5 text-blue-400" />;
    return <HardDrive className="w-5 h-5 text-teal-400" />;
  };

  const getTagColorClass = (tag: string) => {
    switch (tag) {
      case 'Clinical':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'Financial':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Legal':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Compliance':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'NDIS Plan':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'Behavioural':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Medical':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Google Workspace Clinical Gateway</h1>
          <p className="text-xs text-slate-400">
            Bidirectional synchronization between Breakthrough clinical records and Google Workspace
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsDriveIngestOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Ingest Participant Folder</span>
          </button>

          <button
            onClick={() => setIsSeventeenHatsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs transition"
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span>17hats Sync</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Google Drive API v3 & Picker Active</span>
          </span>
        </div>
      </div>

      {/* Automated Startup Health Check & Credentials Validator */}
      <StartupHealthBanner />

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Drive */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold">
              Connected
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">Google Drive</h3>
          <p className="text-xs text-slate-400">
            Encrypted participant dossiers, neuropsychological assessments, and service agreements.
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-sync enabled
            </span>
          </div>
        </div>

        {/* Docs */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold">
              Templates Active
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">Google Docs</h3>
          <p className="text-xs text-slate-400">
            NDIS Comprehensive Assessment report templates & Behaviour Support Plan document generators.
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 8 templates loaded
            </span>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold">
              Live Roster
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">Google Calendar</h3>
          <p className="text-xs text-slate-400">
            Practitioner therapy appointments synced with travel buffer times and participant addresses.
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Real-time sync
            </span>
          </div>
        </div>

        {/* Gmail */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold">
              Secure
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">Gmail Integration</h3>
          <p className="text-xs text-slate-400">
            Automated stakeholder email dispatches for incident alerts, case notes, and NDIA invoices.
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> OAuth2 active
            </span>
          </div>
        </div>
      </div>

      {/* Feature 1: Google Drive Picker Search Console */}
      <div
        id="google-picker-search-section"
        className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 shadow-xl space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-teal-400" />
              <span>Query Google Drive via Google Picker API</span>
            </h2>
            <p className="text-xs text-slate-400">
              Query your connected Google Drive storage directly using the Google Picker API&apos;s interactive search engine.
            </p>
          </div>
          <span className="text-[11px] text-teal-400 font-medium flex items-center gap-1 self-start md:self-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Pre-filters Google Picker search view
          </span>
        </div>

        {/* Search Bar & Launch Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-drive-picker-search"
              type="text"
              value={driveSearchQuery}
              onChange={(e) => setDriveSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLaunchPickerSearch();
                }
              }}
              placeholder="Search connected Google Drive files (e.g., 'Sarah NDIS Plan', 'PBS Assessment', '2026')..."
              className="w-full pl-10 pr-10 py-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition"
            />
            {driveSearchQuery && (
              <button
                type="button"
                onClick={() => setDriveSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="btn-search-drive-picker"
            type="button"
            onClick={() => handleLaunchPickerSearch()}
            disabled={isSearchingDrive}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSearchingDrive ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>
                  {pickerLoadingPhase === 'loading_api'
                    ? 'Loading Picker...'
                    : pickerLoadingPhase === 'requesting_auth'
                    ? 'Validating OAuth...'
                    : 'Searching Drive...'}
                </span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4" />
                <span>Search in Google Drive</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Search Keyword Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Tag className="w-3 h-3 text-teal-400" />
            Quick queries:
          </span>
          {QUICK_SEARCH_CHIPS.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => {
                setDriveSearchQuery(keyword);
                handleLaunchPickerSearch(keyword);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-teal-500/15 hover:text-teal-300 text-slate-300 border border-slate-700/60 hover:border-teal-500/40 text-[11px] transition cursor-pointer"
            >
              {keyword}
            </button>
          ))}
        </div>

        {/* Error notice if picker search encounters an issue */}
        {searchError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchError(null)}
              className="text-xs underline hover:text-rose-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Feature 2: Search Insights Panel (Frequently searched picker terms) */}
      <WorkspaceSearchInsights
        onSelectQuery={(q) => {
          setDriveSearchQuery(q);
          handleLaunchPickerSearch(q);
        }}
        activeQuery={driveSearchQuery}
      />

      {/* Feature 3: File Type Distribution Widget (Recharts visual data analytics) */}
      <WorkspaceFileTypeDistribution documents={allLinkedDocuments} />

      {/* Feature 4: Recent Files Section (Last 5 linked files from Firestore) */}
      <div
        id="recent-linked-files-section"
        className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Recent Files</span>
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold">
                Last 5 Linked to Clients
              </span>
            </div>
            <p className="text-xs text-slate-400">
              The latest 5 clinical and administrative files successfully linked to participant profiles using Firestore metadata.
            </p>
          </div>

          <button
            id="btn-refresh-recent-files"
            type="button"
            onClick={loadRecentFiles}
            disabled={isLoadingRecent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer disabled:opacity-50"
            title="Refresh recent files from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isLoadingRecent ? 'animate-spin' : ''}`} />
            <span>Sync Firestore</span>
          </button>
        </div>

        {recentFilesError && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{recentFilesError}</span>
          </div>
        )}

        {isLoadingRecent ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Fetching recent linked documents from Firestore...</p>
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
            <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No linked documents found in Firestore yet</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Use the Google Drive Picker above to select and link your first clinical document to a participant dossier.
            </p>
            <button
              type="button"
              onClick={() => handleLaunchPickerSearch()}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer"
            >
              <span>Pick Document from Drive</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 overflow-hidden">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-slate-900/60 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* File Information */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 shrink-0 mt-0.5">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate max-w-md">
                        {file.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                        {file.category || 'Clinical Document'}
                      </span>

                      {/* Tags (Clinical, Financial, Legal, Compliance, etc.) */}
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {file.tags.map((t) => (
                            <span
                              key={t}
                              className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${getTagColorClass(
                                t
                              )}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata summary */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      {file.clientName && (
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          <User className="w-3 h-3 text-teal-400" />
                          {file.clientName}
                        </span>
                      )}
                      <span>{formatBytes(file.sizeBytes)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {file.uploadedAt
                          ? new Date(file.uploadedAt).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </span>
                      <span className="text-slate-500">
                        By {file.uploadedByName || 'Clinician'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    id={`btn-preview-recent-${file.id}`}
                    type="button"
                    onClick={() => handleOpenPreviewForDoc(file)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition border border-teal-500/30 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview & Verify</span>
                  </button>

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700"
                  >
                    <span>Drive</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recursive Folder Sync Manager & Batch Import Status Dashboard */}
      <FolderSyncManager />

      {/* Interactive Google Drive Picker & Document Registry */}
      <GoogleDrivePickerWidget />

      {/* Preview Modal for Picked / Recent Documents */}
      {previewDocument && (
        <GoogleDrivePreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewDocument(null);
          }}
          document={previewDocument}
          initialClientId={previewClientId}
          initialCategory={previewCategory}
          onLinkedSuccess={() => {
            // Refetch recent files upon successful link
            loadRecentFiles();
          }}
        />
      )}

      {/* Google Drive Folder Ingest Modal */}
      {isDriveIngestOpen && (
        <GoogleDriveFolderIngestModal
          isOpen={isDriveIngestOpen}
          onClose={() => setIsDriveIngestOpen(false)}
        />
      )}

      {/* 17hats CRM Integration Modal */}
      {isSeventeenHatsOpen && (
        <SeventeenHatsModal
          isOpen={isSeventeenHatsOpen}
          onClose={() => setIsSeventeenHatsOpen(false)}
        />
      )}
    </div>
  );
};

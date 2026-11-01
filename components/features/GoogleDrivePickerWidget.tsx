'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HardDrive,
  FileText,
  FileSpreadsheet,
  FileCheck,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Trash2,
  Search,
  Filter,
  Eye,
  Link as LinkIcon,
  ShieldAlert,
  RotateCw,
  X,
  Database,
  FolderUp,
  Files,
  FolderOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  Layers,
  Check
} from 'lucide-react';
import {
  openGoogleDrivePicker,
  PickedGoogleDriveFile,
  PickerLoadingPhase,
  clearCachedGoogleToken
} from '@/lib/googlePicker';
import { useManagementStore } from '@/stores/useManagementStore';
import { AttachedDocument, DocumentCategory, Client } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import { GoogleDrivePreviewModal } from './GoogleDrivePreviewModal';
import {
  storePickedDriveFileMetadata,
  unlinkDocumentFromClient,
  fetchDocuments
} from '@/lib/firestoreService';
import {
  readDroppedItemsRecursively,
  assessDocumentLocally,
  assessDocumentWithAI,
  commitDocumentAssessment,
  DocumentAssessment,
  DroppedDocumentItem
} from '@/services/documentAssessmentService';

interface LinkedDriveDocument extends AttachedDocument {
  clientId?: string;
  clientName?: string;
  driveFileId: string;
  category: DocumentCategory;
  subfolder?: string;
}

const getFileIcon = (mimeType: string, fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return <FileText className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />;
  }
  if (mimeType.includes('sheet') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />;
  }
  if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'tiff'].includes(ext)) {
    return <FileCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />;
  }
  return <FileText className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />;
};

export const GoogleDrivePickerWidget: React.FC = () => {
  const { clients, caseNotes, updateClient, addClient, addAuditLog, addNotification, currentUser } =
    useManagementStore();

  // No mock data: start with empty list and populate exclusively from real Firestore documents
  const [linkedDocs, setLinkedDocs] = useState<LinkedDriveDocument[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<PickerLoadingPhase>('idle');
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [authExpiredNotice, setAuthExpiredNotice] = useState<string | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [documentCategory, setDocumentCategory] = useState<DocumentCategory>('NDIS Plan Document');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterParticipant, setFilterParticipant] = useState('ALL');

  // Multi-File & Folder Drop Assessment Queue
  const [assessmentQueue, setAssessmentQueue] = useState<DocumentAssessment[]>([]);
  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [isCommittingQueue, setIsCommittingQueue] = useState<boolean>(false);
  const [commitProgress, setCommitProgress] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Hidden Inputs for Folder and Files
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AttachedDocument | PickedGoogleDriveFile | null>(null);
  const [previewClientId, setPreviewClientId] = useState<string>(selectedClientId);

  // Sync real documents from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    fetchDocuments()
      .then((firestoreDocs) => {
        if (!isMounted || !firestoreDocs || firestoreDocs.length === 0) return;
        setLinkedDocs((prev) => {
          const map = new Map<string, LinkedDriveDocument>();
          prev.forEach((d) => map.set(d.id, d));
          firestoreDocs.forEach((fd) => {
            map.set(fd.id, {
              ...fd,
              driveFileId: fd.driveFileId || (fd.metadata?.driveFileId as string) || fd.id,
              category: (fd.category as DocumentCategory) || 'NDIS Plan Document',
              subfolder: fd.tags?.[0] || 'Assessments/ Reports'
            });
          });
          return Array.from(map.values());
        });
      })
      .catch((err) => {
        console.warn('Could not fetch documents from Firestore:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update selectedClientId default if clients change
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Process dropped/selected items into the assessment queue
  const processItemsIntoQueue = async (droppedItems: DroppedDocumentItem[]) => {
    if (droppedItems.length === 0) return;

    setIsAssessing(true);
    const defaultClient = clients.find((c) => c.id === selectedClientId) || null;

    const newAssessments: DocumentAssessment[] = [];
    for (const item of droppedItems) {
      // Assess locally and with AI
      const assessed = await assessDocumentWithAI(item, clients, defaultClient);
      newAssessments.push(assessed);
    }

    setAssessmentQueue((prev) => [...prev, ...newAssessments]);
    setIsAssessing(false);

    addNotification({
      title: 'Documents Assessed by Intelligent Router',
      message: `${newAssessments.length} document(s) categorized into participant folders with extracted NDIS updates.`,
      type: 'compliance',
      severity: 'low'
    });
  };

  // Drag and Drop Event Handlers supporting Entire Folders Recursively
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    try {
      const items = await readDroppedItemsRecursively(e.dataTransfer);
      if (items.length > 0) {
        await processItemsIntoQueue(items);
      }
    } catch (err) {
      console.error('Failed to read dropped directory structure:', err);
      setPickerError('Failed to read folder contents. Please try selecting the folder via Browse Folder.');
    }
  };

  // Handle native folder browse input
  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const items: DroppedDocumentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      items.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        path: (f as any).webkitRelativePath || f.name,
        mimeType: f.type || 'application/octet-stream',
        sizeBytes: f.size
      });
    }

    await processItemsIntoQueue(items);
    e.target.value = '';
  };

  // Handle multiple files browse input
  const handleFilesInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const items: DroppedDocumentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      items.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        path: f.name,
        mimeType: f.type || 'application/octet-stream',
        sizeBytes: f.size
      });
    }

    await processItemsIntoQueue(items);
    e.target.value = '';
  };

  // Google Drive Picker trigger
  const handleOpenPicker = async (forceFreshAuth = false) => {
    setLoadingPhase('loading_api');
    setPickerError(null);
    setAuthExpiredNotice(null);
    setCancellationNotice(null);

    const targetClient = clients.find((c) => c.id === selectedClientId);

    try {
      await openGoogleDrivePicker({
        title: `Select Clinical Documents${targetClient ? ` for ${targetClient.name}` : ''}`,
        multiSelect: true,
        forceFreshAuth,
        onLoadingStateChange: (phase) => {
          setLoadingPhase(phase);
        },
        onPicked: async (pickedFiles: PickedGoogleDriveFile[]) => {
          setLoadingPhase('idle');
          if (!pickedFiles || pickedFiles.length === 0) return;

          // Convert picked Drive files into assessment items
          const items: DroppedDocumentItem[] = pickedFiles.map((pf) => ({
            id: pf.id,
            name: pf.name,
            path: pf.name,
            mimeType: pf.mimeType,
            sizeBytes: pf.sizeBytes || 102400,
            googleDriveId: pf.id,
            googleDriveUrl: pf.url
          }));

          await processItemsIntoQueue(items);
        },
        onCancel: () => {
          setLoadingPhase('idle');
          setCancellationNotice('Drive file selection was cancelled.');
        },
        onError: (err: Error) => {
          setLoadingPhase('idle');
          setPickerError(err.message || 'Google Drive Picker error');
        }
      });
    } catch (err: any) {
      setLoadingPhase('idle');
      setPickerError(err?.message || 'Failed to initialize Google Drive Picker');
    }
  };

  // Commit all assessed documents in the queue to their respective participant folders & Firestore
  const handleCommitAssessmentQueue = async () => {
    if (assessmentQueue.length === 0) return;

    setIsCommittingQueue(true);
    setCommitProgress(10);

    const newlyCreatedDocs: LinkedDriveDocument[] = [];
    let processed = 0;

    for (const assessment of assessmentQueue) {
      const res = await commitDocumentAssessment(assessment, clients, currentUser);
      if (res.success && res.updatedParticipant) {
        if (res.isNew) {
          addClient(res.updatedParticipant);
        } else {
          updateClient(res.updatedParticipant.id, res.updatedParticipant);
        }

        // Record for linked documents table
        const docEntry: LinkedDriveDocument = {
          id: assessment.id,
          driveFileId: assessment.googleDriveId || assessment.id,
          name: assessment.fileName,
          url: assessment.googleDriveUrl || `https://drive.google.com/file/d/${assessment.id}/view`,
          mimeType: assessment.mimeType,
          sizeBytes: assessment.sizeBytes,
          uploadedBy: currentUser?.id || 'staff-system',
          uploadedByName: currentUser?.name || 'Practitioner',
          uploadedAt: new Date().toISOString(),
          clientId: res.updatedParticipant.id,
          clientName: res.updatedParticipant.name,
          category: assessment.category,
          subfolder: assessment.targetSubfolder,
          tags: [assessment.targetSubfolder, 'Drive Sync', 'AI Assessed']
        };
        newlyCreatedDocs.push(docEntry);
      }

      processed++;
      setCommitProgress(Math.round((processed / assessmentQueue.length) * 100));
    }

    setLinkedDocs((prev) => [...newlyCreatedDocs, ...prev]);
    setAssessmentQueue([]);
    setIsCommittingQueue(false);
    setCommitProgress(0);

    addAuditLog(
      'FOLDER_BATCH_ASSESSED_AND_ROUTED',
      'GoogleDriveService',
      'batch-docs',
      `Assessed and routed ${newlyCreatedDocs.length} files into participant folders with clinical metadata synchronization.`
    );

    addNotification({
      title: 'Documents Routed to Participant Folders',
      message: `Successfully routed ${newlyCreatedDocs.length} documents into NDIS participant folders and updated records in Firestore.`,
      type: 'clinical',
      severity: 'low'
    });
  };

  // Remove single item from assessment queue
  const handleRemoveQueueItem = (id: string) => {
    setAssessmentQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Modify target participant for item in queue
  const handleUpdateQueueParticipant = (id: string, participantVal: string) => {
    if (participantVal.startsWith('new:')) {
      const newName = participantVal.replace('new:', '').trim();
      setAssessmentQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                targetParticipantId: '',
                targetParticipantName: newName,
                suggestedNewParticipant: true
              }
            : item
        )
      );
      return;
    }

    const p = clients.find((c) => c.id === participantVal);
    if (!p) {
      setAssessmentQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                targetParticipantId: '',
                targetParticipantName: 'Unassigned (Select Participant)',
                suggestedNewParticipant: false
              }
            : item
        )
      );
      return;
    }

    setAssessmentQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              targetParticipantId: p.id,
              targetParticipantName: p.name,
              suggestedNewParticipant: false
            }
          : item
      )
    );
  };

  // Modify target subfolder for item in queue
  const handleUpdateQueueSubfolder = (id: string, subfolder: string) => {
    setAssessmentQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              targetSubfolder: subfolder
            }
          : item
      )
    );
  };

  // Unlink document from participant
  const handleUnlinkDocument = async (docId: string, clientId?: string) => {
    try {
      if (clientId) {
        await unlinkDocumentFromClient(docId, clientId);
        const targetClient = clients.find((c) => c.id === clientId);
        if (targetClient) {
          const updated = (targetClient.documents || targetClient.attachedDocuments || []).filter(
            (d) => d.id !== docId
          );
          updateClient(clientId, { documents: updated, attachedDocuments: updated });
        }
      }
      setLinkedDocs((prev) => prev.filter((d) => d.id !== docId));
      addNotification({
        title: 'Document Unlinked',
        message: 'The file reference was removed from the participant folder.',
        type: 'clinical',
        severity: 'low'
      });
    } catch (err) {
      console.error('Failed to unlink document:', err);
    }
  };

  // Filtered linked documents
  const filteredLinkedDocs = useMemo(() => {
    return linkedDocs.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.subfolder || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory === 'ALL' || doc.category === filterCategory;
      const matchesParticipant =
        filterParticipant === 'ALL' || doc.clientId === filterParticipant;

      return matchesSearch && matchesCategory && matchesParticipant;
    });
  }, [linkedDocs, searchQuery, filterCategory, filterParticipant]);

  const targetClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Hidden Inputs for Folder and Files Selection */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={filesInputRef}
        onChange={handleFilesInputChange}
        multiple
        className="hidden"
      />

      {/* Main Header & Workspace Connection Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <HardDrive className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-white">
                Google Drive & Folder Drop Hub
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                Smart Document Classifier Active
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
                12 NDIS Standard Subfolders
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Drop entire directories with nested folders, multiple documents, or connect to Google Drive. The clinical engine evaluates each file, routes it into the participant&apos;s folder, and automatically synchronizes NDIS metadata into Firestore.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30"
            title="Upload and recursively traverse an entire folder of files"
          >
            <FolderUp className="w-4 h-4" />
            <span>Drop / Browse Folder</span>
          </button>

          <button
            onClick={() => filesInputRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
            title="Browse and select multiple files"
          >
            <Files className="w-4 h-4 text-teal-400" />
            <span>Select Multiple Files</span>
          </button>

          <button
            onClick={() => handleOpenPicker(false)}
            disabled={loadingPhase !== 'idle'}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/30"
          >
            <HardDrive className="w-4 h-4" />
            <span>Connect Google Drive</span>
          </button>
        </div>
      </div>

      {/* Expanding Folders Active Notification */}
      {loadingPhase === 'expanding_folders' && (
        <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
          <RotateCw className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Traversing Google Drive Folder Structure...</p>
            <p className="text-[11px] text-indigo-300">Recursively scanning subfolders and extracting all clinical documents for assessment.</p>
          </div>
        </div>
      )}

      {/* Interactive Recursive Folder & Multiple Files Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDraggingOver
            ? 'border-teal-400 bg-teal-950/30 shadow-2xl shadow-teal-950/60 scale-[1.01]'
            : 'border-slate-700/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-teal-500/60'
        }`}
        onClick={() => folderInputRef.current?.click()}
      >
        <div className="p-4 rounded-3xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform mb-3">
          <UploadCloud className="w-10 h-10" />
        </div>
        <h3 className="text-base font-extrabold text-white">
          Drop Entire Participant Folders or Multiple Files Here
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-lg">
          Drag and drop nested client folders containing PDFs, Word documents, Excel sheets, and images. Each document is assessed to identify the participant, mapped to the correct subfolder (e.g., <em>BSP</em>, <em>NDIS Plan</em>, <em>Invoices</em>), and extracted clinical updates are saved to Firestore.
        </p>
        <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Recursive Directory Traversal
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> PDF, DOCX, XLSX, Images & Scans
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Automatic Firestore Schema Sync
          </span>
        </div>
      </div>

      {/* Real-Time Document Assessment Queue */}
      {assessmentQueue.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-teal-500/50 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Document Assessment & Clinical Router Queue</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold">
                    {assessmentQueue.length} Ready to Route
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review the evaluated participant assignments and target subfolders below before confirming the batch update to Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setAssessmentQueue([])}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Clear Queue
              </button>
              <button
                onClick={handleCommitAssessmentQueue}
                disabled={isCommittingQueue}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all"
              >
                {isCommittingQueue ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Routing to Firestore ({commitProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Route & Update All {assessmentQueue.length} Documents</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Assessment Queue Table */}
          <div className="overflow-x-auto max-h-[400px] border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] uppercase font-bold tracking-wider text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-3">File & Original Path</th>
                  <th className="p-3">Assessed Participant</th>
                  <th className="p-3">Target Subfolder</th>
                  <th className="p-3">Confidence & Rationale</th>
                  <th className="p-3">Extracted Client Updates</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                {assessmentQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* File & Path */}
                    <td className="p-3">
                      <div className="flex items-start gap-2.5">
                        {getFileIcon(item.mimeType, item.fileName)}
                        <div>
                          <p className="font-bold text-white max-w-[200px] truncate" title={item.fileName}>
                            {item.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={item.filePath}>
                            {item.filePath}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Target Participant with Selector */}
                    <td className="p-3">
                      <select
                        value={
                          item.targetParticipantId
                            ? item.targetParticipantId
                            : item.suggestedNewParticipant && item.targetParticipantName
                            ? `new:${item.targetParticipantName}`
                            : ''
                        }
                        onChange={(e) => handleUpdateQueueParticipant(item.id, e.target.value)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-teal-300 font-bold focus:outline-none focus:border-teal-500 max-w-[190px]"
                      >
                        {item.suggestedNewParticipant && item.targetParticipantName && (
                          <option value={`new:${item.targetParticipantName}`}>
                            ✨ Auto-Create: {item.targetParticipantName}
                          </option>
                        )}
                        <option value="">-- Unassigned --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.ndisNumber})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Target Subfolder with Selector */}
                    <td className="p-3">
                      <select
                        value={item.targetSubfolder}
                        onChange={(e) => handleUpdateQueueSubfolder(item.id, e.target.value)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500 max-w-[180px]"
                      >
                        {STANDARD_DRIVE_SUBFOLDERS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Confidence & Rationale */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-400 rounded-full"
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-teal-400">
                            {item.confidence}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 max-w-[220px] truncate" title={item.rationale}>
                          {item.rationale}
                        </p>
                      </div>
                    </td>

                    {/* Extracted Updates */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-[240px]">
                        {item.extractedUpdates.ndisNumber && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                            NDIS: {item.extractedUpdates.ndisNumber}
                          </span>
                        )}
                        {item.extractedUpdates.totalBudget && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                            ${item.extractedUpdates.totalBudget.toLocaleString()}
                          </span>
                        )}
                        {item.extractedUpdates.bspExpiryDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            BSP Expiry: {item.extractedUpdates.bspExpiryDate}
                          </span>
                        )}
                        {item.extractedUpdates.restrictivePracticesActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                            Restrictive Practices Active
                          </span>
                        )}
                        {Object.keys(item.extractedUpdates).length === 0 && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            Document filing only
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemoveQueueItem(item.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Linked Documents Library Filter & Search */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-teal-400" />
              <span>Participant Folders & Synchronized Documents</span>
            </h3>
            <p className="text-xs text-slate-400">
              Official documents stored across participant subfolders with real-time Firestore persistence
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file, participant, folder..."
                className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-56"
              />
            </div>

            <select
              value={filterParticipant}
              onChange={(e) => setFilterParticipant(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-semibold"
            >
              <option value="ALL">All Participants ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-semibold"
            >
              <option value="ALL">All Categories</option>
              {STANDARD_DRIVE_SUBFOLDERS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linked Documents Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="p-3">Document Title</th>
                <th className="p-3">Participant</th>
                <th className="p-3">Participant Subfolder</th>
                <th className="p-3">Category</th>
                <th className="p-3">Uploaded / Synced</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {filteredLinkedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HardDrive className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-sm text-slate-400">No mock documents present.</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Drop a participant folder above, select multiple files, or connect Google Drive to assess and route documents into the participant repository.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLinkedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Document Title */}
                    <td className="p-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span className="truncate max-w-[240px]" title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                    </td>

                    {/* Participant */}
                    <td className="p-3 font-bold text-teal-300">
                      {doc.clientName || 'General Participant File'}
                    </td>

                    {/* Subfolder */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                        <FolderOpen className="w-3 h-3 text-indigo-400" />
                        <span>{doc.subfolder || 'Assessments/ Reports'}</span>
                      </span>
                    </td>

                    {/* Category */}
                    <td className="p-3 text-slate-400">
                      {doc.category}
                    </td>

                    {/* Upload Date */}
                    <td className="p-3 font-mono text-slate-500">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setPreviewDocument(doc);
                            setPreviewClientId(doc.clientId || '');
                            setPreviewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Preview document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 transition-colors"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={() => handleUnlinkDocument(doc.id, doc.clientId)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove document reference"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Preview Modal */}
      {previewModalOpen && previewDocument && (
        <GoogleDrivePreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewDocument(null);
          }}
          document={previewDocument}
          initialClientId={previewClientId}
        />
      )}
    </div>
  );
};

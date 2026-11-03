'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import { getCachedGoogleAccessToken } from '@/lib/firebase';
import {
  openGoogleDrivePicker,
  PickedGoogleDriveFile,
  scanDriveParentFolderForSubfolders,
  ScannedParticipantSubfolder,
  fetchDriveSpreadsheetCsv
} from '@/lib/googlePicker';
import {
  Folder,
  FolderOpen,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Loader2,
  Database,
  FileUp,
  RefreshCw,
  Layers,
  Check,
  HardDrive
} from 'lucide-react';

interface GoogleDriveFolderIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSpreadsheetInBulkImporter?: (csvText: string, fileName: string) => void;
}

type IngestMode = 'batch' | 'single' | 'sheets';

export const GoogleDriveFolderIngestModal: React.FC<GoogleDriveFolderIngestModalProps> = ({
  isOpen,
  onClose,
  onOpenSpreadsheetInBulkImporter
}) => {
  const {
    clients,
    addClient,
    batchImportValidatedClients,
    addNotification,
    setSelectedClientId,
    setActiveTab
  } = useManagementStore();

  const [mode, setMode] = useState<IngestMode>('batch');

  // Single-folder state
  const [folderName, setFolderName] = useState('');
  const [folderLink, setFolderLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<PickedGoogleDriveFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedClient, setExtractedClient] = useState<Partial<Client> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Batch parent folder scan state
  const [parentFolderUrl, setParentFolderUrl] = useState('');
  const [isScanningParent, setIsScanningParent] = useState(false);
  const [scannedSubfolders, setScannedSubfolders] = useState<ScannedParticipantSubfolder[]>([]);
  const [extractedBatchClients, setExtractedBatchClients] = useState<Client[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Record<string, boolean>>({});

  // Google Sheets roster state
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper to check if a participant matches an existing record by NDIS number or Name
  const findExistingMatch = (name?: string, ndisNumber?: string): Client | undefined => {
    const cleanNdis = (ndisNumber || '').replace(/[^0-9]/g, '');
    const cleanName = (name || '').trim().toLowerCase();
    return clients.find((c) => {
      const cNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
      const cName = (c.name || '').trim().toLowerCase();
      if (cleanNdis && cleanNdis.length === 9 && cleanNdis !== '430000000' && cNdis === cleanNdis) {
        return true;
      }
      if (cleanName && cleanName.length > 2 && cName === cleanName) {
        return true;
      }
      return false;
    });
  };

  // ==========================================
  // MODE 1: PARENT FOLDER BATCH SCANNER
  // ==========================================

  const handleScanParentFolderByUrl = async () => {
    const match = parentFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const parentId = match ? match[1] : parentFolderUrl.trim();
    if (!parentId) {
      setError('Please paste a valid Google Drive parent folder URL or select folders with the Drive Picker.');
      return;
    }

    try {
      setIsScanningParent(true);
      setError(null);
      setSuccessMessage(null);

      const { subfolders, rootFiles } = await scanDriveParentFolderForSubfolders(parentId);

      // If the parent folder has participant subfolders, use them; otherwise group root files by inferred participant name
      let discovered: ScannedParticipantSubfolder[] = [...subfolders];
      if (discovered.length === 0 && rootFiles.length > 0) {
        discovered = rootFiles.map((f) => {
          const cleanName = f.name
            .replace(/\.[^/.]+$/, '')
            .replace(/(NDIS|Plan|BSP|Assessment|FBA|Clinical|Report|202[4-7])/gi, '')
            .replace(/[-_]/g, ' ')
            .trim();
          return {
            folderId: f.id,
            folderName: cleanName || f.name,
            folderUrl: f.url,
            subfolders: STANDARD_DRIVE_SUBFOLDERS,
            files: [f]
          };
        });
      }

      if (discovered.length === 0) {
        setError('No participant subfolders or clinical files were found inside that Google Drive folder.');
        return;
      }

      setScannedSubfolders(discovered);
      await runBatchAiExtraction(discovered);
    } catch (err: any) {
      console.error('Parent folder scan error:', err);
      setError(err?.message || 'Failed to scan parent Google Drive folder.');
    } finally {
      setIsScanningParent(false);
    }
  };

  const handlePickMultipleFoldersFromDrive = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      await openGoogleDrivePicker({
        title: 'Select Parent Folder or Multiple Participant Folders in Google Drive',
        multiSelect: true,
        includeFolderEntries: true,
        onPicked: async (pickedItems) => {
          if (!pickedItems || pickedItems.length === 0) return;

          setIsScanningParent(true);
          try {
            const folderEntries = pickedItems.filter((item) => item.isFolder);
            const fileEntries = pickedItems.filter((item) => !item.isFolder);

            let discovered: ScannedParticipantSubfolder[] = [];

            // If user picked a single parent folder, scan its subfolders via Drive API
            if (folderEntries.length === 1 && fileEntries.length === 0) {
              try {
                const scanRes = await scanDriveParentFolderForSubfolders(folderEntries[0].id);
                if (scanRes.subfolders.length > 0) {
                  discovered = scanRes.subfolders;
                }
              } catch {
                // Fallback to treating the picked folder itself as a participant folder
              }
            }

            if (discovered.length === 0 && folderEntries.length > 0) {
              discovered = folderEntries.map((folder) => {
                const childFiles = fileEntries.filter(
                  (f) => f.path?.startsWith(`${folder.name}/`) || f.path === folder.name
                );
                return {
                  folderId: folder.id,
                  folderName: folder.name,
                  folderUrl: folder.url,
                  subfolders: STANDARD_DRIVE_SUBFOLDERS,
                  files: childFiles
                };
              });
            }

            if (discovered.length === 0 && fileEntries.length > 0) {
              // Group picked files by top-level folder path or filename
              const groups = new Map<string, PickedGoogleDriveFile[]>();
              fileEntries.forEach((f) => {
                const parts = (f.path || f.name).split('/');
                const key =
                  parts.length > 1
                    ? parts[0]
                    : f.name
                        .replace(/\.[^/.]+$/, '')
                        .replace(/(NDIS|Plan|BSP|Assessment|FBA|Clinical|Report|202[4-7])/gi, '')
                        .replace(/[-_]/g, ' ')
                        .trim() || f.name;
                const list = groups.get(key) || [];
                list.push(f);
                groups.set(key, list);
              });

              discovered = Array.from(groups.entries()).map(([name, groupFiles], idx) => ({
                folderId: groupFiles[0]?.id || `folder-${idx + 1}`,
                folderName: name,
                folderUrl: groupFiles[0]?.url || '',
                subfolders: STANDARD_DRIVE_SUBFOLDERS,
                files: groupFiles
              }));
            }

            setScannedSubfolders(discovered);
            await runBatchAiExtraction(discovered);
          } finally {
            setIsScanningParent(false);
          }
        },
        onError: (pickerErr, details) => {
          if (!details?.isUserCancelled) {
            setError(pickerErr?.message || 'Google Drive Picker error occurred.');
          }
        }
      });
    } catch (err: any) {
      if (!err?.isUserCancelled) {
        setError('Google Drive Picker requires sign-in with your Google account.');
      }
    }
  };

  const runBatchAiExtraction = async (subfoldersToProcess: ScannedParticipantSubfolder[]) => {
    try {
      setIsExtracting(true);
      setError(null);
      const accessToken = getCachedGoogleAccessToken() || undefined;

      const res = await fetch('/api/drive/ingest-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch',
          accessToken,
          subfolders: subfoldersToProcess.map((sf) => ({
            folderId: sf.folderId,
            folderName: sf.folderName,
            folderUrl: sf.folderUrl,
            subfolders: sf.subfolders,
            files: sf.files.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              webViewLink: f.url,
              path: f.path
            }))
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Batch extraction failed');
      }

      const extracted: Client[] = data.participants || [];
      setExtractedBatchClients(extracted);
      const initialSel: Record<string, boolean> = {};
      extracted.forEach((c) => {
        initialSel[c.id] = true;
      });
      setSelectedBatchIds(initialSel);
    } catch (err: any) {
      console.error('Batch extraction error:', err);
      setError(err?.message || 'Failed to extract participant profiles from subfolders.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommitBatchToDatabase = async () => {
    const selectedList = extractedBatchClients.filter((c) => selectedBatchIds[c.id]);
    if (selectedList.length === 0) {
      setError('Please select at least one participant from the scanned Drive folders.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const result = await batchImportValidatedClients(selectedList);
      if (!result.success) {
        throw new Error(result.error || 'Failed to commit batch to Firestore');
      }

      setSuccessMessage(
        `Committed ${result.count} participants to Firestore (${result.createdCount ?? result.count} new, ${
          result.updatedCount ?? 0
        } merged/updated with linked NDIS subfolders)!`
      );
      setTimeout(() => {
        setActiveTab('clients');
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || 'Failed to save participant batch to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // MODE 2: SINGLE PARTICIPANT FOLDER / DOCS
  // ==========================================

  const handlePickFromDrive = async () => {
    try {
      setError(null);
      await openGoogleDrivePicker({
        title: 'Select Participant Documents or Clinical Folder',
        multiSelect: true,
        includeFolderEntries: true,
        onPicked: (files) => {
          if (files && files.length > 0) {
            setSelectedFiles(files);
            if (!folderName) {
              const first = files[0];
              const inferredName = first.name
                .replace(/\.[^/.]+$/, '')
                .replace(/(NDIS|Plan|BSP|Assessment|FBA|Clinical|Report|202[4-7])/gi, '')
                .replace(/[-_]/g, ' ')
                .trim();
              if (inferredName.length > 2) {
                setFolderName(inferredName);
              }
            }
          }
        },
        onError: (pickerErr, details) => {
          if (!details?.isUserCancelled) {
            setError(pickerErr?.message || 'Google Drive Picker error occurred.');
          }
        }
      });
    } catch (err: any) {
      if (!err?.isUserCancelled) {
        setError('Google Drive Picker requires sign-in with your Google account.');
      }
    }
  };

  const handleExtractWithAI = async () => {
    if (!folderName.trim() && selectedFiles.length === 0 && !folderLink.trim()) {
      setError('Please provide a participant folder name, link, or select files from Google Drive.');
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      setExtractedClient(null);

      let folderId = '';
      const match = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        folderId = match[1];
      } else {
        const pickedFolder = selectedFiles.find((f) => f.isFolder);
        if (pickedFolder) folderId = pickedFolder.id;
      }

      const accessToken = getCachedGoogleAccessToken() || undefined;

      const res = await fetch('/api/drive/ingest-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          folderId: folderId || undefined,
          folderName: folderName.trim(),
          folderUrl: folderLink.trim() || undefined,
          accessToken,
          files: selectedFiles
            .filter((f) => !f.isFolder)
            .map((f) => ({
              id: f.id,
              name: f.name,
              path: f.path,
              mimeType: f.mimeType,
              webViewLink: f.url
            }))
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract participant information');
      }

      setExtractedClient(data.participant);
    } catch (err: any) {
      console.error('Ingest error:', err);
      setError(err?.message || 'Error occurred while analyzing Google Drive documents with Gemini AI.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommitToDatabase = async () => {
    if (!extractedClient || !extractedClient.name) return;

    try {
      setIsSaving(true);
      setError(null);

      const safeSlug = extractedClient.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);

      const clientToSave: Client = {
        id:
          extractedClient.id && !extractedClient.id.startsWith('cli-')
            ? extractedClient.id
            : `participant-${safeSlug}-${Date.now().toString().slice(-6)}`,
        name: extractedClient.name,
        preferredName: extractedClient.preferredName || '',
        ndisNumber: extractedClient.ndisNumber || '430000000',
        dateOfBirth: extractedClient.dateOfBirth || '2000-01-01',
        gender: extractedClient.gender || 'Not specified',
        phone: extractedClient.phone || '0400 000 000',
        email: extractedClient.email || '',
        address: extractedClient.address || 'Melbourne, VIC',
        suburb: extractedClient.suburb || 'Melbourne',
        status: (extractedClient.status as any) || 'Active',
        primaryDisability: extractedClient.primaryDisability || 'Autism Spectrum Disorder',
        secondaryDisabilities: extractedClient.secondaryDisabilities || [],
        goals: (extractedClient.goals || []).map((g, idx) => ({
          id: g.id || `goal-${idx + 1}`,
          title: g.title || `Clinical Goal ${idx + 1}`,
          description: g.description || '',
          category: g.category || 'Capacity Building',
          targetDate: g.targetDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
          progressPercent: (g as any).progressPercent ?? 15,
          status: (g.status as any) || 'In Progress'
        })),
        planStartDate: extractedClient.planStartDate || new Date().toISOString().split('T')[0],
        planEndDate:
          extractedClient.planEndDate ||
          new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        planManagementType: extractedClient.planManagementType || 'Plan-Managed',
        planManager: extractedClient.planManager,
        supportCoordinator: extractedClient.supportCoordinator,
        budgetBreakdown: extractedClient.budgetBreakdown,
        totalBudget: extractedClient.totalBudget || 65000,
        allocatedBudget: extractedClient.allocatedBudget || 55000,
        spentBudget: extractedClient.spentBudget || 0,
        primaryPractitionerId: 'prac-1',
        primaryPractitionerName: 'Senior Behaviour Practitioner',
        riskLevel: extractedClient.riskLevel || 'Medium',
        emergencyContact: extractedClient.emergencyContact || {
          name: 'Primary Contact',
          phone: '0400 000 000'
        },
        highIntensityNeeds: extractedClient.highIntensityNeeds || [],
        communicationMethod: extractedClient.communicationMethod || 'Verbal',
        mobilityNeeds: extractedClient.mobilityNeeds || 'Independent',
        triggers: extractedClient.triggers || [],
        restrictivePracticesActive: Boolean(extractedClient.restrictivePracticesActive ?? false),
        isCustomUserParticipant: true,
        driveFolderId: extractedClient.driveFolderId,
        driveFolderUrl: extractedClient.driveFolderUrl,
        driveFolderPath:
          extractedClient.driveFolderPath ||
          `Staff Share Drive > Participants > Behaviour Support > ${extractedClient.name}`,
        driveSubfolders: extractedClient.driveSubfolders || STANDARD_DRIVE_SUBFOLDERS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: extractedClient.documents || [],
        attachedDocuments: extractedClient.attachedDocuments || extractedClient.documents || []
      };

      await batchImportValidatedClients([clientToSave]);

      setSuccessMessage(`Participant ${clientToSave.name} committed & synchronized to Firestore!`);
      setTimeout(() => {
        setSelectedClientId(clientToSave.id);
        setActiveTab('clients');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save participant to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // MODE 3: IMPORT ROSTER FROM GOOGLE SHEETS
  // ==========================================

  const handlePickSpreadsheetFromDrive = async () => {
    try {
      setError(null);
      await openGoogleDrivePicker({
        title: 'Select Participant Roster (Google Sheets or CSV) in Google Drive',
        multiSelect: false,
        mimeFilter:
          'application/vnd.google-apps.spreadsheet,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        onPicked: async (files) => {
          if (!files || files.length === 0) return;
          const picked = files[0];
          await loadDriveSpreadsheetById(picked.id, picked.name, picked.mimeType);
        },
        onError: (pickerErr, details) => {
          if (!details?.isUserCancelled) {
            setError(pickerErr?.message || 'Google Drive Picker error.');
          }
        }
      });
    } catch (err: any) {
      if (!err?.isUserCancelled) {
        setError('Please sign in with Google to select a Google Sheet from Drive.');
      }
    }
  };

  const handleImportSheetFromUrl = async () => {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : sheetUrl.trim();
    if (!fileId) {
      setError('Please paste a valid Google Sheets URL or pick a spreadsheet from Google Drive.');
      return;
    }
    await loadDriveSpreadsheetById(
      fileId,
      'Google_Sheets_Participant_Roster.csv',
      'application/vnd.google-apps.spreadsheet'
    );
  };

  const loadDriveSpreadsheetById = async (fileId: string, name: string, mimeType?: string) => {
    try {
      setIsLoadingSheet(true);
      setError(null);
      const csvText = await fetchDriveSpreadsheetCsv(fileId, mimeType);
      if (!csvText || !csvText.trim()) {
        throw new Error('The selected Google Sheet appears to be empty.');
      }

      if (onOpenSpreadsheetInBulkImporter) {
        onOpenSpreadsheetInBulkImporter(csvText, name);
        onClose();
      } else {
        const count = useManagementStore.getState().importClientsFromCSV(csvText);
        setSuccessMessage(`Imported and merged ${count} participants from "${name}"!`);
        setTimeout(() => {
          onClose();
        }, 1400);
      }
    } catch (err: any) {
      console.error('Failed loading spreadsheet from Drive:', err);
      setError(err?.message || 'Failed to read Google Sheet from Drive.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const singleExistingMatch = extractedClient
    ? findExistingMatch(extractedClient.name, extractedClient.ndisNumber)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 my-8 text-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Google Drive Participant & Clinical Vault Ingestion
              </h2>
              <p className="text-xs text-slate-400">
                Scan parent business folders, parse clinical NDIS documents with Gemini, or import rosters from Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('batch');
              setError(null);
            }}
            className={`px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
              mode === 'batch'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Scan Parent Drive Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('single');
              setError(null);
            }}
            className={`px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
              mode === 'single'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>2. Parse Clinical Docs & Plan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('sheets');
              setError(null);
            }}
            className={`px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
              mode === 'sheets'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Google Sheets Roster</span>
          </button>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: PARENT FOLDER BATCH SCAN                              */}
        {/* ============================================================ */}
        {mode === 'batch' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Scan Business Parent Folder for Participant Subfolders
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Point to your parent &quot;Participants&quot; folder in Google Drive or select multiple participant folders. Standard NDIS subfolders are automatically linked to every participant profile.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Paste Parent Google Drive Folder URL (https://drive.google.com/drive/folders/...)"
                  value={parentFolderUrl}
                  onChange={(e) => setParentFolderUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  disabled={isScanningParent || isExtracting}
                  onClick={handleScanParentFolderByUrl}
                  className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isScanningParent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning Drive...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Scan Folder URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isScanningParent || isExtracting}
                  onClick={handlePickMultipleFoldersFromDrive}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-teal-400" />
                  <span>Browse & Select Participant Folders via Drive Picker</span>
                </button>
              </div>
            </div>

            {isExtracting && (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Loader2 className="w-7 h-7 text-teal-400 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-200">
                  Analyzing {scannedSubfolders.length} participant folder(s) & clinical files with Gemini...
                </p>
                <p className="text-[11px] text-slate-500">
                  Extracting NDIS numbers, diagnoses, budget allocations, and linking 12 standard NDIS subfolders
                </p>
              </div>
            )}

            {extractedBatchClients.length > 0 && !isExtracting && (
              <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-teal-400">
                      Discovered {extractedBatchClients.length} Participant Profiles from Google Drive
                    </h4>
                    <p className="text-xs text-slate-400">
                      Existing participants matching by NDIS number or name will be updated and merged automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        extractedBatchClients.forEach((c) => (all[c.id] = true));
                        setSelectedBatchIds(all);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBatchIds({})}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-900 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 w-8"></th>
                        <th className="p-2.5">Participant</th>
                        <th className="p-2.5">NDIS Number</th>
                        <th className="p-2.5">Primary Diagnosis</th>
                        <th className="p-2.5">Total Budget</th>
                        <th className="p-2.5">Drive Vault</th>
                        <th className="p-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {extractedBatchClients.map((c) => {
                        const existing = findExistingMatch(c.name, c.ndisNumber);
                        const isChecked = !!selectedBatchIds[c.id];
                        return (
                          <tr key={c.id} className="hover:bg-slate-900/60">
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setSelectedBatchIds((prev) => ({
                                    ...prev,
                                    [c.id]: !prev[c.id]
                                  }))
                                }
                                className="rounded text-teal-500"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-white">{c.name}</td>
                            <td className="p-2.5 font-mono text-teal-400">{c.ndisNumber}</td>
                            <td className="p-2.5 text-slate-300 truncate max-w-[180px]">
                              {c.primaryDisability}
                            </td>
                            <td className="p-2.5 font-mono">
                              ${(c.totalBudget || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-[11px] text-indigo-300">
                              {(c.documents?.length || 0)} files · 12 folders
                            </td>
                            <td className="p-2.5">
                              {existing ? (
                                <span className="text-[11px] text-amber-300 font-medium">
                                  Merge & Update
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-400 font-medium">
                                  Create New
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCommitBatchToDatabase}
                    className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Committing to Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>
                          Commit & Merge Selected ({Object.values(selectedBatchIds).filter(Boolean).length}) to Firestore
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SINGLE PARTICIPANT CLINICAL DOCS & PLAN               */}
        {/* ============================================================ */}
        {mode === 'single' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Participant Name or Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Miller - NDIS 430891245"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Participant Google Drive Folder Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={folderLink}
                  onChange={(e) => setFolderLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handlePickFromDrive}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <FileUp className="w-4 h-4 text-teal-400" />
                <span>Select Clinical Docs or Folder via Drive Picker</span>
              </button>

              <button
                type="button"
                disabled={isExtracting || (!folderName.trim() && selectedFiles.length === 0 && !folderLink.trim())}
                onClick={handleExtractWithAI}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50 shadow-lg shadow-teal-500/20"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Clinical & NDIS Plan Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Parse Docs & NDIS Plan with Gemini</span>
                  </>
                )}
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Selected Google Drive Items ({selectedFiles.length}):</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {selectedFiles.map((file) => (
                    <span
                      key={file.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      {file.isFolder ? (
                        <Folder className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-teal-400" />
                      )}
                      <span className="truncate max-w-[220px]">{file.path || file.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extractedClient && (
              <div className="p-5 rounded-xl bg-slate-950 border border-teal-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Extracted Participant Profile & NDIS Funding</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {singleExistingMatch
                      ? `Matches existing participant "${singleExistingMatch.name}" — will merge & update`
                      : 'New participant profile — ready to save'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400">Full Name</label>
                    <input
                      type="text"
                      value={extractedClient.name || ''}
                      onChange={(e) => setExtractedClient({ ...extractedClient, name: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">NDIS Number (9 digits)</label>
                    <input
                      type="text"
                      value={extractedClient.ndisNumber || ''}
                      onChange={(e) =>
                        setExtractedClient({ ...extractedClient, ndisNumber: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Date of Birth</label>
                    <input
                      type="date"
                      value={extractedClient.dateOfBirth || ''}
                      onChange={(e) =>
                        setExtractedClient({ ...extractedClient, dateOfBirth: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Primary Disability</label>
                    <input
                      type="text"
                      value={extractedClient.primaryDisability || ''}
                      onChange={(e) =>
                        setExtractedClient({ ...extractedClient, primaryDisability: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Total NDIS Budget ($)</label>
                    <input
                      type="number"
                      value={extractedClient.totalBudget || 0}
                      onChange={(e) =>
                        setExtractedClient({
                          ...extractedClient,
                          totalBudget: Number(e.target.value)
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Plan Management Type</label>
                    <select
                      value={extractedClient.planManagementType || 'Plan-Managed'}
                      onChange={(e) =>
                        setExtractedClient({
                          ...extractedClient,
                          planManagementType: e.target.value as any
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    >
                      <option value="Agency-Managed (NDIA)">Agency-Managed (NDIA)</option>
                      <option value="Plan-Managed">Plan-Managed</option>
                      <option value="Self-Managed">Self-Managed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400">Support Coordinator Name</label>
                    <input
                      type="text"
                      value={extractedClient.supportCoordinator?.name || ''}
                      onChange={(e) =>
                        setExtractedClient({
                          ...extractedClient,
                          supportCoordinator: {
                            ...(extractedClient.supportCoordinator || {}),
                            name: e.target.value
                          }
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Plan Manager Agency</label>
                    <input
                      type="text"
                      value={extractedClient.planManager?.agency || ''}
                      onChange={(e) =>
                        setExtractedClient({
                          ...extractedClient,
                          planManager: {
                            ...(extractedClient.planManager || {}),
                            agency: e.target.value
                          }
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Contact Phone</label>
                    <input
                      type="text"
                      value={extractedClient.phone || ''}
                      onChange={(e) => setExtractedClient({ ...extractedClient, phone: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                {/* Standard NDIS Subfolders Linked */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5" />
                    <span>Auto-Linked Standard NDIS Subfolders ({STANDARD_DRIVE_SUBFOLDERS.length})</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {STANDARD_DRIVE_SUBFOLDERS.slice(0, 6).join(' · ')} ...
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCommitToDatabase}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-teal-500/25"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>
                          {singleExistingMatch
                            ? 'Merge & Update Participant in Firestore'
                            : 'Commit Participant to Live Database'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: IMPORT ROSTER FROM GOOGLE SHEETS IN DRIVE             */}
        {/* ============================================================ */}
        {mode === 'sheets' && (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Import Participant Roster Directly from Google Sheets in Drive
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a master participant spreadsheet or CSV stored in your Google Drive. Its rows will open directly in the Bulk Validation & Field Mapping engine to create or merge participant records.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Paste Google Sheets URL (https://docs.google.com/spreadsheets/d/...)"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                disabled={isLoadingSheet || !sheetUrl.trim()}
                onClick={handleImportSheetFromUrl}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingSheet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reading Sheet...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Load Google Sheet URL</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                disabled={isLoadingSheet}
                onClick={handlePickSpreadsheetFromDrive}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>Pick Google Sheet or CSV via Google Drive Picker</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client } from '@/types';
import { openGoogleDrivePicker, PickedGoogleDriveFile } from '@/lib/googlePicker';
import {
  Folder,
  FolderOpen,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Shield,
  DollarSign,
  Calendar,
  ExternalLink,
  Loader2,
  ArrowRight,
  Database,
  FileUp,
  RefreshCw,
  Plus
} from 'lucide-react';

interface GoogleDriveFolderIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveFolderIngestModal: React.FC<GoogleDriveFolderIngestModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addClient, addNotification, setSelectedClientId, setActiveTab } = useManagementStore();

  const [folderName, setFolderName] = useState('');
  const [folderLink, setFolderLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<PickedGoogleDriveFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedClient, setExtractedClient] = useState<Partial<Client> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Open Google Picker to select folder or clinical documents
  const handlePickFromDrive = async () => {
    try {
      setError(null);
      await openGoogleDrivePicker({
        title: 'Select Participant Documents or Clinical Folder',
        multiSelect: true,
        onPicked: (files) => {
          if (files && files.length > 0) {
            setSelectedFiles(files);
            // If folder was picked or file is in folder, infer name
            if (!folderName) {
              const first = files[0];
              const inferredName = first.name
                .replace(/\.[^/.]+$/, '')
                .replace(/(NDIS|Plan|BSP|Assessment|FBA|Clinical|Report|202[4-6])/gi, '')
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
        console.warn('Google Picker notice:', err);
        setError('Google Drive Picker requires sign-in with your Google account.');
      }
    }
  };

  // Run Gemini extraction on the folder
  const handleExtractWithAI = async () => {
    if (!folderName.trim() && selectedFiles.length === 0) {
      setError('Please provide a participant folder name or select files from Google Drive.');
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      setExtractedClient(null);

      // Extract folder ID from Google Drive URL if pasted
      let folderId = '';
      const match = folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        folderId = match[1];
      }

      const res = await fetch('/api/drive/ingest-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folderId || undefined,
          folderName: folderName.trim(),
          files: selectedFiles.map((f) => ({
            id: f.id,
            name: f.name,
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

  // Commit extracted participant to live database
  const handleCommitToDatabase = async () => {
    if (!extractedClient || !extractedClient.name) return;

    try {
      setIsSaving(true);
      setError(null);

      const clientToSave: Client = {
        id: extractedClient.id || `cli-live-${Date.now().toString().slice(-6)}`,
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
          progressPercent: (g as any).progressPercent ?? 0,
          status: (g.status as any) || 'In Progress'
        })),
        planStartDate: extractedClient.planStartDate || new Date().toISOString().split('T')[0],
        planEndDate: extractedClient.planEndDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: (extractedClient as any).sourceDriveFiles?.map((f: any) => ({
          id: f.id,
          name: f.name,
          category: 'Clinical Plans',
          dateUploaded: new Date().toISOString().split('T')[0],
          fileType: f.mimeType,
          fileSize: 'Cloud File',
          url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`
        })) || []
      };

      await addClient(clientToSave);

      addNotification({
        title: 'Participant Ingested from Google Drive',
        message: `Successfully created active participant record for ${clientToSave.name} (NDIS: ${clientToSave.ndisNumber}) with attached Drive files.`,
        type: 'client',
        severity: 'low'
      });

      setSuccessMessage(`Participant ${clientToSave.name} successfully committed to database!`);
      setTimeout(() => {
        setSelectedClientId(clientToSave.id);
        setActiveTab('clients');
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save participant to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 my-8 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Google Drive Participant Ingestion</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Gemini 2.5 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extract participant profile, clinical diagnoses, NDIS budgets, and goals directly from your Google Drive folder.
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

        {/* Error / Success messages */}
        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Step 1: Input folder or pick files */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Participant Folder Name or Participant Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe - NDIS 430123456"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Google Drive Folder Link (Optional)
              </label>
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderLink}
                onChange={(e) => setFolderLink(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handlePickFromDrive}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition-colors"
            >
              <FileUp className="w-4 h-4 text-teal-400" />
              <span>Select Files via Google Drive Picker</span>
            </button>

            <button
              type="button"
              disabled={isExtracting || (!folderName.trim() && selectedFiles.length === 0)}
              onClick={handleExtractWithAI}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-teal-500/20"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Clinical Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract with Gemini AI</span>
                </>
              )}
            </button>
          </div>

          {/* Selected Files Badge List */}
          {selectedFiles.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Selected Google Drive Documents ({selectedFiles.length}):</span>
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
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Extracted Data Preview & Confirmation */}
        {extractedClient && (
          <div className="p-5 rounded-xl bg-slate-950 border border-teal-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Extracted Participant Profile</span>
              </div>
              <span className="text-xs text-slate-400">Review and verify before saving to Firestore</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={extractedClient.name || ''}
                  onChange={(e) => setExtractedClient({ ...extractedClient, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">NDIS Number</label>
                <input
                  type="text"
                  value={extractedClient.ndisNumber || ''}
                  onChange={(e) => setExtractedClient({ ...extractedClient, ndisNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Date of Birth</label>
                <input
                  type="date"
                  value={extractedClient.dateOfBirth || ''}
                  onChange={(e) => setExtractedClient({ ...extractedClient, dateOfBirth: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Primary Disability</label>
                <input
                  type="text"
                  value={extractedClient.primaryDisability || ''}
                  onChange={(e) => setExtractedClient({ ...extractedClient, primaryDisability: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Total NDIS Budget ($)</label>
                <input
                  type="number"
                  value={extractedClient.totalBudget || 0}
                  onChange={(e) => setExtractedClient({ ...extractedClient, totalBudget: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Plan Management Type</label>
                <select
                  value={extractedClient.planManagementType || 'Plan-Managed'}
                  onChange={(e) => setExtractedClient({ ...extractedClient, planManagementType: e.target.value as any })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
                >
                  <option value="Agency-Managed (NDIA)">Agency-Managed (NDIA)</option>
                  <option value="Plan-Managed">Plan-Managed</option>
                  <option value="Self-Managed">Self-Managed</option>
                </select>
              </div>
            </div>

            {/* Extracted Goals */}
            {extractedClient.goals && extractedClient.goals.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Extracted NDIS Goals</label>
                <div className="space-y-1.5">
                  {extractedClient.goals.map((goal, idx) => (
                    <div
                      key={goal.id || idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      <span className="font-semibold text-teal-400 shrink-0">Goal {idx + 1}:</span>
                      <span>{goal.title} — {goal.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCommitToDatabase}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-teal-500/25"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Commit Participant to Live Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

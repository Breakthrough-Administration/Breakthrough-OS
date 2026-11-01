'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileCheck,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Clock,
  Link as LinkIcon,
  Tag,
  Plus,
  ShieldAlert,
  Trash2,
  Copy,
  Check,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AttachedDocument, DocumentCategory, DocumentTag, CaseNote } from '@/types';
import { PickedGoogleDriveFile } from '@/lib/googlePicker';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  storePickedDriveFileMetadata,
  linkDocumentToCaseNote,
  unlinkDocumentFromClient,
  recordDriveSyncLog
} from '@/lib/firestoreService';

interface GoogleDrivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AttachedDocument | PickedGoogleDriveFile | null;
  initialClientId?: string;
  initialCategory?: DocumentCategory;
  onLinkedSuccess?: (document: AttachedDocument, linkedCaseNoteId?: string) => void;
}

const AVAILABLE_TAGS = [
  { name: 'Clinical', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { name: 'Financial', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { name: 'Legal', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { name: 'Compliance', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { name: 'NDIS Plan', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { name: 'Behavioural', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { name: 'Medical', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { name: 'Governance', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' }
];

export const GoogleDrivePreviewModal: React.FC<GoogleDrivePreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  initialClientId,
  initialCategory = 'NDIS Plan Document',
  onLinkedSuccess
}) => {
  const { clients, caseNotes, currentUser, addCaseNote, updateCaseNote, addAuditLog, addNotification } =
    useManagementStore();

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(initialCategory);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Clinical']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [showCustomTagInput, setShowCustomTagInput] = useState<boolean>(false);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // 3-step Verification Checklist
  const [verifiedParticipant, setVerifiedParticipant] = useState(false);
  const [verifiedClinicalRelevance, setVerifiedClinicalRelevance] = useState(false);
  const [verifiedPrivacyConsent, setVerifiedPrivacyConsent] = useState(false);

  // Link to case note options
  const [linkMode, setLinkMode] = useState<'existing' | 'new' | 'dossier_only'>('existing');
  const [selectedCaseNoteId, setSelectedCaseNoteId] = useState<string>('');

  // New Case Note form on the fly
  const [newNoteFormat, setNewNoteFormat] = useState<'SOAP' | 'BIRP' | 'SIMPL'>('SOAP');
  const [newNoteSubjective, setNewNoteSubjective] = useState('');
  const [newNoteAssessment, setNewNoteAssessment] = useState('');
  const [newNoteDuration, setNewNoteDuration] = useState(60);

  // Operation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // AI Auto-Categorization state
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[] | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<string | null>(null);

  // Quick Actions state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDeletingLink, setIsDeletingLink] = useState(false);
  const [confirmDeletePrompt, setConfirmDeletePrompt] = useState(false);

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    } else if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [initialClientId, clients, selectedClientId]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      // Auto-populate relevant default tags
      if (initialCategory === 'NDIS Plan Document') {
        setSelectedTags(['Clinical', 'Financial']);
      } else if (initialCategory === 'Consent Form') {
        setSelectedTags(['Legal', 'Compliance']);
      } else if (initialCategory === 'BSP Document') {
        setSelectedTags(['Clinical', 'Behavioural']);
      } else if (initialCategory === 'Incident Photo Evidence') {
        setSelectedTags(['Legal', 'Compliance']);
      } else {
        setSelectedTags(['Clinical']);
      }
    }
  }, [initialCategory]);

  useEffect(() => {
    if (document && (document as AttachedDocument).tags && (document as AttachedDocument).tags!.length > 0) {
      setSelectedTags((document as AttachedDocument).tags as string[]);
    }
  }, [document]);

  // If a document was passed, prefill verification and find matching case notes
  const targetClient = clients.find((c) => c.id === selectedClientId);

  useEffect(() => {
    const notes = caseNotes.filter((n) => n.clientId === selectedClientId);
    if (notes.length > 0) {
      setSelectedCaseNoteId(notes[0].id);
    } else {
      setSelectedCaseNoteId('');
    }
  }, [selectedClientId, caseNotes]);

  // Auto-run AI categorization when document is selected/opened
  useEffect(() => {
    if (isOpen && document?.name) {
      let isMounted = true;
      setIsAnalyzingAI(true);
      fetch('/api/documents/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: document.name,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          category: selectedCategory,
          clientName: targetClient?.name
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
            setAiSuggestedTags(data.suggestedTags);
            setAiConfidence(data.confidence || 0.92);
            setAiReasoning(data.reasoning || '');
            if (data.suggestedCategory) {
              setAiSuggestedCategory(data.suggestedCategory);
            }
            // Add suggested tags to active selection
            setSelectedTags((prev) => Array.from(new Set([...prev, ...data.suggestedTags])));
          }
        })
        .catch((err) => {
          console.warn('AI categorization request error:', err);
        })
        .finally(() => {
          if (isMounted) setIsAnalyzingAI(false);
        });

      return () => {
        isMounted = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, document?.id, document?.name]);

  if (!isOpen || !document) return null;

  const driveFileId = (document as any).driveFileId || document.id || '';
  const previewUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
  const fullDriveUrl = document.url || `https://drive.google.com/file/d/${driveFileId}/view`;

  // Check if file is already linked to the currently selected participant
  const alreadyLinkedDoc =
    targetClient?.attachedDocuments?.find(
      (d) =>
        (d.driveFileId && d.driveFileId === driveFileId) ||
        d.id === document.id ||
        (d.url && d.url === document.url)
    ) ||
    ((targetClient?.documents as any[]) || []).find(
      (d: any) =>
        (d.driveFileId && d.driveFileId === driveFileId) ||
        d.id === document.id ||
        (d.url && d.url === document.url)
    );

  const isAlreadyLinked = Boolean(alreadyLinkedDoc);

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
    if (mime?.includes('sheet') || mime?.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (mime?.includes('document') || mime?.includes('word'))
      return <FileCheck className="w-5 h-5 text-blue-400" />;
    return <HardDrive className="w-5 h-5 text-teal-400" />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
      setShowCustomTagInput(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullDriveUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch (e) {
      console.warn('Failed to copy URL to clipboard:', e);
    }
  };

  const handleUnlinkDocument = async () => {
    if (!alreadyLinkedDoc || !targetClient) return;
    setIsDeletingLink(true);
    try {
      await unlinkDocumentFromClient(alreadyLinkedDoc.id, targetClient.id);

      await recordDriveSyncLog({
        fileId: driveFileId,
        fileName: document.name,
        action: 'UNLINK_DOCUMENT',
        clientName: targetClient.name,
        clientId: targetClient.id,
        status: 'SUCCESS',
        details: `Document "${document.name}" unlinked from participant dossier`
      });

      addAuditLog(
        'UNLINK_DRIVE_DOC_FROM_CLIENT',
        'GoogleDriveFile',
        alreadyLinkedDoc.id,
        `Unlinked "${document.name}" from ${targetClient.name}`
      );

      addNotification({
        title: 'Document Unlinked',
        message: `Successfully unlinked "${document.name}" from ${targetClient.name}'s dossier.`,
        type: 'clinical',
        severity: 'low'
      });

      if (onLinkedSuccess) {
        onLinkedSuccess(alreadyLinkedDoc);
      }
      setIsDeletingLink(false);
      setConfirmDeletePrompt(false);
      onClose();
    } catch (err: any) {
      console.error('Error unlinking document:', err);
      setSubmitError(err?.message || 'Failed to unlink document from participant dossier.');
      setIsDeletingLink(false);
    }
  };

  const allVerified = verifiedParticipant && verifiedClinicalRelevance && verifiedPrivacyConsent;

  const handleConfirmAndLink = async () => {
    if (!targetClient) {
      setSubmitError('Please select a valid participant profile to associate this document.');
      return;
    }

    if (isAlreadyLinked) {
      setSubmitError(
        `This Google Drive document has already been linked to ${targetClient.name}. Duplicate link attempts are prevented.`
      );
      return;
    }

    if (!allVerified) {
      setSubmitError('Please complete all 3 verification checklist items before linking.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let finalCaseNoteId: string | undefined = undefined;

      // If creating a new case note
      if (linkMode === 'new') {
        const newNoteId = `note-${Date.now().toString().slice(-6)}`;
        const createdNote: Partial<CaseNote> = {
          id: newNoteId,
          clientId: targetClient.id,
          clientName: targetClient.name,
          ndisNumber: targetClient.ndisNumber,
          practitionerId: currentUser?.id || 'practitioner-1',
          practitionerName: currentUser?.name || 'Allied Health Practitioner',
          date: new Date().toISOString().split('T')[0],
          sessionDurationMinutes: newNoteDuration,
          format: newNoteFormat,
          category: 'Document Review & Consultation',
          subjective:
            newNoteSubjective ||
            `Reviewed Google Drive clinical document "${document.name}" for ${targetClient.name}.`,
          objective: `Verified document integrity in Google Workspace Clinical Gateway. File size: ${formatBytes(
            document.sizeBytes
          )}. Tags: ${selectedTags.join(', ')}.`,
          assessment:
            newNoteAssessment ||
            clinicalNotes ||
            `Document verified and aligned with active NDIS therapeutic goals.`,
          plan: 'Incorporate findings into upcoming functional assessment and stakeholder review.',
          linkedGoalIds: targetClient.goals?.map((g) => g.id) || [],
          status: 'Approved',
          flaggedForReview: false
        };

        addCaseNote(createdNote);
        finalCaseNoteId = newNoteId;
      } else if (linkMode === 'existing' && selectedCaseNoteId) {
        finalCaseNoteId = selectedCaseNoteId;
      }

      // 1. Securely store in Firestore via service layer function with tags
      const storedDoc = await storePickedDriveFileMetadata({
        file: {
          id: driveFileId,
          name: document.name,
          mimeType: document.mimeType || 'application/octet-stream',
          url: fullDriveUrl,
          sizeBytes: document.sizeBytes,
          description: (document as any).description
        },
        clientId: targetClient.id,
        clientName: targetClient.name,
        category: selectedCategory,
        tags: selectedTags as DocumentTag[],
        caseNoteId: finalCaseNoteId,
        uploadedBy: currentUser?.id || 'practitioner-current',
        uploadedByName: currentUser?.name || 'Practitioner',
        clinicalNotes
      });

      // 2. Link to existing case note if mode is existing
      if (linkMode === 'existing' && finalCaseNoteId) {
        await linkDocumentToCaseNote(
          storedDoc.id,
          finalCaseNoteId,
          targetClient.id,
          clinicalNotes
        );

        // Update local zustand store for caseNotes
        updateCaseNote(finalCaseNoteId, {
          linkedDocumentIds: [
            ...(caseNotes.find((n) => n.id === finalCaseNoteId)?.linkedDocumentIds || []),
            storedDoc.id
          ],
          linkedDriveFiles: [
            ...((caseNotes.find((n) => n.id === finalCaseNoteId)?.linkedDriveFiles as any[]) || []).filter(
              (f: any) => f.id !== storedDoc.id
            ),
            {
              id: storedDoc.id,
              driveFileId: driveFileId,
              name: storedDoc.name,
              mimeType: storedDoc.mimeType,
              url: storedDoc.url,
              sizeBytes: storedDoc.sizeBytes,
              category: storedDoc.category,
              tags: selectedTags,
              uploadedAt: storedDoc.uploadedAt
            }
          ]
        });
      }

      // 3. Audit trail and user notification
      addAuditLog(
        'LINK_DRIVE_DOC_TO_CLIENT',
        'GoogleDriveFile',
        storedDoc.id,
        `Verified and linked "${storedDoc.name}" to ${targetClient.name}${
          finalCaseNoteId ? ` (Case Note #${finalCaseNoteId})` : ''
        } with tags [${selectedTags.join(', ')}]`
      );

      addNotification({
        title: 'Google Drive Document Verified & Linked',
        message: `Successfully linked "${storedDoc.name}" to ${targetClient.name}'s clinical profile in Firestore.`,
        type: 'clinical',
        severity: 'low'
      });

      if (onLinkedSuccess) {
        onLinkedSuccess(storedDoc, finalCaseNoteId);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error('Error linking Google Drive file to client:', err);
      setSubmitError(err?.message || 'Failed to complete document linking.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
              {getFileIcon(document.mimeType || '')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white truncate max-w-md">
                  {document.name}
                </h2>
                {isAlreadyLinked ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Already Linked
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                    Clinical Preview & Verification
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>{formatBytes(document.sizeBytes)}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                  {document.mimeType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fullDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Open full document in Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body (2 Columns on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Embedded Google Drive Preview */}
          <div className="lg:col-span-7 p-5 flex flex-col space-y-3 bg-slate-950/40">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-400" />
                Live Document Preview
              </span>
              <span className="text-[11px] text-slate-500">Google Drive Embedded Frame</span>
            </div>

            {/* Embedded Iframe */}
            <div className="relative flex-1 min-h-[380px] w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-center">
              {!iframeError ? (
                <iframe
                  src={previewUrl}
                  title="Google Drive Document Preview"
                  className="w-full h-full min-h-[420px] border-0"
                  allow="autoplay"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  onError={() => setIframeError(true)}
                />
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center my-auto space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs text-slate-300 font-semibold">
                    Interactive iframe preview unavailable for this file format or restricted by browser cookie settings.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    You can still securely inspect and verify the full document in a Google Drive tab before linking.
                  </p>
                  <a
                    href={fullDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition"
                  >
                    <span>View in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-xs font-mono text-[10px]">
                Drive ID: {driveFileId}
              </span>
              <span className="text-teal-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SSL Encrypted Gateway
              </span>
            </div>
          </div>

          {/* Right Column: Verification & Linking Controls */}
          <div className="lg:col-span-5 p-5 flex flex-col space-y-4 justify-between bg-slate-900/60">
            <div className="space-y-4">
              {/* Participant Profile Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  Target Participant Profile
                </label>
                <select
                  aria-label="Select Target Participant"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (NDIS: {c.ndisNumber})
                    </option>
                  ))}
                </select>
                {targetClient && (
                  <p className="text-[10px] text-teal-400">
                    Active Plan: {targetClient.planStartDate} to {targetClient.planEndDate} • Risk: {targetClient.riskLevel}
                  </p>
                )}
              </div>

              {/* Duplicate Link Prevention Alert Banner & Quick Actions */}
              {isAlreadyLinked && (
                <div
                  id="duplicate-link-warning"
                  className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2.5 animate-fadeIn"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>File Already Linked to {targetClient?.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Synchronised
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    This Google Drive document has already been linked to this participant&apos;s dossier
                    {alreadyLinkedDoc?.category ? ` under Category: "${alreadyLinkedDoc.category}"` : ''}
                    {alreadyLinkedDoc?.uploadedAt ? ` on ${new Date(alreadyLinkedDoc.uploadedAt).toLocaleDateString('en-AU')}` : ''}.
                  </p>

                  {/* Quick Actions Bar */}
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <button
                      id="btn-copy-drive-link"
                      type="button"
                      onClick={handleCopyUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 cursor-pointer"
                      title="Copy Google Drive document link"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-teal-300">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Drive URL</span>
                        </>
                      )}
                    </button>

                    {!confirmDeletePrompt ? (
                      <button
                        id="btn-unlink-document"
                        type="button"
                        onClick={() => setConfirmDeletePrompt(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition border border-rose-500/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Unlink Document</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 p-1 bg-rose-950/80 border border-rose-500/40 rounded-xl text-[11px]">
                        <span className="text-rose-200 font-medium px-1">Confirm unlink?</span>
                        <button
                          type="button"
                          disabled={isDeletingLink}
                          onClick={handleUnlinkDocument}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingLink ? 'Unlinking...' : 'Yes, Unlink'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePrompt(false)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Document Category
                  </label>
                  {aiSuggestedCategory && (
                    <span className="text-[10px] text-teal-400 flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3 text-teal-400" />
                      AI Match: {aiSuggestedCategory}
                    </span>
                  )}
                </div>
                <select
                  aria-label="Document Category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="NDIS Plan Document">NDIS Plan Document</option>
                  <option value="Assessment PDF">Assessment Report (PBS / OT / Psych)</option>
                  <option value="BSP Document">Behaviour Support Plan (PBS)</option>
                  <option value="Clinical Report">Allied Health Clinical Report</option>
                  <option value="Consent Form">Consent & Service Agreement</option>
                  <option value="Incident Photo Evidence">Incident Evidence / Photo</option>
                </select>
              </div>

              {/* Firestore Metadata Tags (e.g. Clinical, Financial, Legal) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-teal-400" />
                    <span>Firestore Metadata Tags</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {isAnalyzingAI && (
                      <span className="text-[10px] text-teal-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> AI categorising...
                      </span>
                    )}
                    {aiSuggestedTags && aiSuggestedTags.length > 0 && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold flex items-center gap-1"
                        title={aiReasoning || 'AI inferred tags based on clinical keywords'}
                      >
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        AI Confidence: {Math.round((aiConfidence || 0.92) * 100)}%
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {selectedTags.length} active tag(s)
                    </span>
                  </div>
                </div>

                {/* Available & Selected Tag Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? `${tag.color} ring-1 ring-teal-400/50 shadow-sm`
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-teal-400" />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}

                  {/* Custom Tag Chips */}
                  {selectedTags
                    .filter((t) => !AVAILABLE_TAGS.some((at) => at.name === t))
                    .map((customTag) => (
                      <button
                        key={customTag}
                        type="button"
                        onClick={() => toggleTag(customTag)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        <span>{customTag}</span>
                      </button>
                    ))}

                  {/* Add Tag Button */}
                  {!showCustomTagInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomTagInput(true)}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-teal-300 border border-dashed border-slate-700 hover:border-teal-500/50 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Custom Tag</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Tag name..."
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                        className="w-24 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[11px] text-white focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTag}
                        className="px-2 py-0.5 bg-teal-600 text-white rounded-md text-[10px] font-bold hover:bg-teal-500 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomTagInput(false)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Linking Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
                  Link to Clinical Case Note
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLinkMode('existing')}
                    className={`py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      linkMode === 'existing'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Existing Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkMode('new')}
                    className={`py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      linkMode === 'new'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    New Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkMode('dossier_only')}
                    className={`py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      linkMode === 'dossier_only'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dossier Only
                  </button>
                </div>

                {/* Sub-view: Link to existing note */}
                {linkMode === 'existing' && (
                  <div className="space-y-1 pt-1">
                    {caseNotes.filter((n) => n.clientId === selectedClientId).length > 0 ? (
                      <select
                        aria-label="Select Clinical Case Note"
                        value={selectedCaseNoteId}
                        onChange={(e) => setSelectedCaseNoteId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        {caseNotes
                          .filter((n) => n.clientId === selectedClientId)
                          .map((note) => (
                            <option key={note.id} value={note.id}>
                              {note.format} Note ({note.date}) - {note.category || 'Therapy'}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        No case notes found for this participant yet. Switch to &ldquo;New Note&rdquo; to create and link one automatically.
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-view: Create new note on the fly */}
                {linkMode === 'new' && (
                  <div className="space-y-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Format:</span>
                      <div className="flex gap-1">
                        {(['SOAP', 'BIRP', 'SIMPL'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setNewNoteFormat(fmt)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              newNoteFormat === fmt
                                ? 'bg-teal-500 text-slate-950'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Observation / Subjective statement..."
                      value={newNoteSubjective}
                      onChange={(e) => setNewNoteSubjective(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Clinical synthesis / assessment..."
                      value={newNoteAssessment}
                      onChange={(e) => setNewNoteAssessment(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Clinical Notes / Rationale */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Verification Rationale & Clinical Annotation
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Document verified by clinician; supports active NDIS capacity building targets..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* 3-Step Clinical Verification Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    Clinical Verification Checklist
                  </span>
                  <span className="text-[10px] text-slate-400">
                    AHPRA / NDIS Compliance
                  </span>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedParticipant}
                    onChange={(e) => setVerifiedParticipant(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 bg-slate-700 border-slate-600 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    Participant Alignment: Document verified to belong to{' '}
                    <strong className="text-white">{targetClient?.name || 'Participant'}</strong>{' '}
                    (NDIS: {targetClient?.ndisNumber || '—'})
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedClinicalRelevance}
                    onChange={(e) => setVerifiedClinicalRelevance(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 bg-slate-700 border-slate-600 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    Clinical Relevance: Document supports active therapeutic goals and NDIS plan requirements
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedPrivacyConsent}
                    onChange={(e) => setVerifiedPrivacyConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 bg-slate-700 border-slate-600 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    Privacy & Consent: Participant consent verified for cloud storage & practitioner access
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="btn-confirm-verify-link"
                type="button"
                onClick={handleConfirmAndLink}
                disabled={!allVerified || isSubmitting || isAlreadyLinked}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Committing to Firestore...</span>
                  </>
                ) : isAlreadyLinked ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-slate-950" />
                    <span>Already Linked to {targetClient?.name || 'Client'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {linkMode === 'dossier_only'
                        ? 'Verify & Save to Dossier'
                        : 'Verify & Link to Case Note'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

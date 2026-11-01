'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Search,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Sparkles,
  UserPlus,
  Tag,
  Check,
  X,
  ChevronDown,
  Layers,
  Database
} from 'lucide-react';
import { DocumentAssessment, commitDocumentAssessment } from '@/services/documentAssessmentService';
import { Client, AttachedDocument } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import { useManagementStore } from '@/stores/useManagementStore';

interface ManualMappingSectionProps {
  assessments: DocumentAssessment[];
  clients: Client[];
  onAssessmentUpdated: (updated: DocumentAssessment) => void;
  onParticipantCommitted?: (participantId: string, updatedDoc: AttachedDocument) => void;
}

export const ManualMappingSection: React.FC<ManualMappingSectionProps> = ({
  assessments,
  clients,
  onAssessmentUpdated,
  onParticipantCommitted,
}) => {
  const { updateClient, addClient, addAuditLog, addNotification, currentUser } = useManagementStore();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState<string>('');
  const [targetSubfolder, setTargetSubfolder] = useState<string>('NDIS Plan');
  const [isCommittingId, setIsCommittingId] = useState<string | null>(null);
  const [commitSuccessId, setCommitSuccessId] = useState<string | null>(null);

  // Filter only documents flagged with low confidence (< 70%) or unassigned
  const flaggedDocuments = useMemo(() => {
    return assessments.filter(
      (a) =>
        a.confidence < 70 ||
        !a.targetParticipantId ||
        a.targetParticipantName?.includes('Unassigned') ||
        a.suggestedNewParticipant
    );
  }, [assessments]);

  // Selected document
  const activeDoc = useMemo(() => {
    if (!selectedDocId && flaggedDocuments.length > 0) {
      return flaggedDocuments[0];
    }
    return flaggedDocuments.find((d) => d.id === selectedDocId) || flaggedDocuments[0] || null;
  }, [selectedDocId, flaggedDocuments]);

  // Filtered clients for interactive search
  const filteredClients = useMemo(() => {
    if (!participantSearch.trim()) return clients.slice(0, 8);
    const query = participantSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.ndisNumber?.toLowerCase().includes(query) ||
          c.preferredName?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [clients, participantSearch]);

  const handleSelectClient = (client: Client) => {
    if (!activeDoc) return;
    const updated: DocumentAssessment = {
      ...activeDoc,
      targetParticipantId: client.id,
      targetParticipantName: client.name,
      suggestedNewParticipant: false,
      confidence: 100, // Manually verified
    };
    onAssessmentUpdated(updated);
  };

  const handleCreateNewParticipantPrompt = () => {
    if (!activeDoc) return;
    const proposedName =
      participantSearch.trim() || activeDoc.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    const updated: DocumentAssessment = {
      ...activeDoc,
      targetParticipantId: '',
      targetParticipantName: proposedName,
      suggestedNewParticipant: true,
      confidence: 90,
    };
    onAssessmentUpdated(updated);
  };

  const handleCommitSingleMapping = async (docToCommit: DocumentAssessment) => {
    setIsCommittingId(docToCommit.id);
    try {
      const res = await commitDocumentAssessment(docToCommit, clients, currentUser);
      if (res.success && res.updatedParticipant) {
        if (res.isNew) {
          addClient(res.updatedParticipant);
        } else {
          updateClient(res.updatedParticipant.id, res.updatedParticipant);
        }

        setCommitSuccessId(docToCommit.id);
        setTimeout(() => setCommitSuccessId(null), 3000);

        addAuditLog(
          'MANUAL_DOCUMENT_MAPPING_COMMITTED',
          'GoogleWorkspaceGateway',
          res.updatedParticipant.id,
          `Manually mapped document "${docToCommit.fileName}" to participant "${res.updatedParticipant.name}" under [${docToCommit.targetSubfolder}].`
        );

        addNotification({
          title: 'Manual Mapping Saved',
          message: `Linked "${docToCommit.fileName}" to ${res.updatedParticipant.name} in Firestore.`,
          type: 'compliance',
          severity: 'low',
        });
      }
    } catch (err: any) {
      console.error('Commit mapping error:', err);
    } finally {
      setIsCommittingId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">Manual Mapping Section</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {flaggedDocuments.length} Flagged by Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Documents where Gemini confidence fell below threshold or lacked matching participant names. Search and link to Firestore profiles.
            </p>
          </div>
        </div>
      </div>

      {flaggedDocuments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Flagged Documents</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All scanned documents were successfully classified and mapped with high confidence to existing NDIS participant profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Flagged Documents List */}
          <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Flagged Documents ({flaggedDocuments.length})
            </span>
            {flaggedDocuments.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-white truncate max-w-[220px]">{doc.fileName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                      {doc.confidence}% Conf
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono truncate">{doc.filePath || doc.fileName}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="truncate max-w-[180px]">
                      Target: {doc.targetParticipantName || 'Unassigned'}
                    </span>
                    <span className="text-indigo-400 font-medium">[{doc.targetSubfolder}]</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Participant Search & Override Panel */}
          {activeDoc && (
            <div className="lg:col-span-7 rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                    Reviewing Document
                  </span>
                  <h4 className="text-sm font-extrabold text-white truncate">{activeDoc.fileName}</h4>
                </div>
                {activeDoc.googleDriveUrl && (
                  <a
                    href={activeDoc.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-slate-800 text-teal-400 hover:text-white transition flex items-center gap-1 text-xs shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View in Drive</span>
                  </a>
                )}
              </div>

              {/* Target Folder Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                  <span>Target Clinical Subfolder</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STANDARD_DRIVE_SUBFOLDERS.map((subfolder) => {
                    const isSubSelected = activeDoc.targetSubfolder === subfolder;
                    return (
                      <button
                        key={subfolder}
                        type="button"
                        onClick={() => {
                          onAssessmentUpdated({
                            ...activeDoc,
                            targetSubfolder: subfolder,
                          });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-left truncate transition cursor-pointer border ${
                          isSubSelected
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {subfolder}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Participant Profile Search */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assign to Firestore Participant Profile</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Currently: {activeDoc.targetParticipantName || 'None'}
                  </span>
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Search participants by name, NDIS number, or preferred name..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Participant Results List */}
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl bg-slate-900/60 p-1.5 border border-slate-800/80">
                  {filteredClients.map((c) => {
                    const isAssigned = activeDoc.targetParticipantId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                          isAssigned
                            ? 'bg-teal-500/20 text-teal-200 border border-teal-500/30'
                            : 'hover:bg-slate-800/70 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold truncate">{c.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">NDIS: {c.ndisNumber}</span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                      </div>
                    );
                  })}

                  {filteredClients.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      <span>No matching participants found. </span>
                      <button
                        onClick={handleCreateNewParticipantPrompt}
                        className="text-teal-400 hover:underline font-bold ml-1 cursor-pointer"
                      >
                        Create as New Participant
                      </button>
                    </div>
                  )}
                </div>

                {/* Option to create new participant */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    onClick={handleCreateNewParticipantPrompt}
                    className="text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Create & Onboard New Participant Profile</span>
                  </button>
                </div>
              </div>

              {/* Commit Action Button */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  Status: {commitSuccessId === activeDoc.id ? 'Committed!' : 'Pending Commit'}
                </span>

                <button
                  onClick={() => handleCommitSingleMapping(activeDoc)}
                  disabled={isCommittingId === activeDoc.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
                    commitSuccessId === activeDoc.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {isCommittingId === activeDoc.id
                      ? 'Saving to Firestore...'
                      : commitSuccessId === activeDoc.id
                      ? 'Linked in Firestore'
                      : 'Assign & Commit to Firestore'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

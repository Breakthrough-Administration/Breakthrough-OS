'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CaseNote } from '@/types';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Trash2,
  X,
  HardDrive,
  ExternalLink,
  Eye,
  Database
} from 'lucide-react';
import { GoogleDrivePreviewModal } from './GoogleDrivePreviewModal';
import { openGoogleDrivePicker, PickedGoogleDriveFile } from '@/lib/googlePicker';
import { storePickedDriveFileMetadata } from '@/lib/firestoreService';

const FORMAT_LABELS: Record<
  'SOAP' | 'BIRP' | 'SIMPL',
  {
    field1: string;
    field1Hint: string;
    field2: string;
    field2Hint: string;
    field3: string;
    field3Hint: string;
    field4: string;
    field4Hint: string;
  }
> = {
  SOAP: {
    field1: 'Subjective (Participant / Carer Report)',
    field1Hint: 'Participant direct statements, mood, sleep/sensory baseline, and presenting affect...',
    field2: 'Objective (Clinical Observations & Interventions)',
    field2Hint: 'Objective measures, therapy interventions delivered, functional tasks performed...',
    field3: 'Assessment (Clinical Synthesis & Goal Progression)',
    field3Hint: 'Clinical evaluation of NDIS goal progression and functional capacity...',
    field4: 'Plan (Next Steps & Stakeholder Follow-up)',
    field4Hint: 'Upcoming therapy targets, home practice, and support worker recommendations...'
  },
  BIRP: {
    field1: 'Behaviour (Presenting Topography & Baseline)',
    field1Hint: 'Observable participant behaviours, antecedents, regulation level, and communication...',
    field2: 'Intervention (PBS & Clinical Strategies Applied)',
    field2Hint: 'Proactive accommodations, visual supports, de-escalation, or skill-building delivered...',
    field3: 'Response (Participant Response to Intervention)',
    field3Hint: 'How the participant responded to the clinical intervention and co-regulation...',
    field4: 'Plan (Ongoing PBS & Support Team Actions)',
    field4Hint: 'Next session targets, ABC data collection focus, and BSP adjustments...'
  },
  SIMPL: {
    field1: 'Situation (Context & Community Setting)',
    field1Hint: 'Environment, community setting, activity context, and participant readiness...',
    field2: 'Intervention (Support & Skill Coaching Provided)',
    field2Hint: 'Prompting hierarchy, travel/daily living coaching, and environmental modifications...',
    field3: 'Monitoring (Progress & Risk Observations)',
    field3Hint: 'Progress toward autonomy, sensory load monitoring, and safety checks...',
    field4: 'Plan (Next Community Session & Handover)',
    field4Hint: 'Next community access milestone and handover notes for support team...'
  }
};

export const CaseNotesModule: React.FC = () => {
  const {
    caseNotes,
    clients,
    currentUser,
    addCaseNote,
    deleteCaseNote,
    addBillingClaim,
    selectedClientId,
    setSelectedClientId,
    addNotification,
    loadDemoData
  } = useManagementStore();

  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'SOAP' | 'BIRP' | 'SIMPL'>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [autoGenerateClaim, setAutoGenerateClaim] = useState(true);
  const [isPolishingAI, setIsPolishingAI] = useState(false);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<any | null>(null);
  const [activePreviewClientId, setActivePreviewClientId] = useState<string>('');

  // New Note Form
  const [formData, setFormData] = useState<Partial<CaseNote>>({
    clientId: selectedClientId || clients[0]?.id || 'cli-001',
    clientName: clients.find((c) => c.id === selectedClientId)?.name || clients[0]?.name || '',
    format: 'SOAP',
    category: 'Therapy Session',
    date: new Date().toISOString().split('T')[0],
    sessionDurationMinutes: 60,
    nonFaceToFaceMinutes: 15,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    practitionerName: currentUser?.name || 'Principal Clinician',
    supportItemCode: '15_056_0128_1_3',
    linkedDriveFiles: []
  });

  const [isAttachingDrive, setIsAttachingDrive] = useState(false);

  const filteredNotes = caseNotes.filter((n) => {
    const matchesSearch =
      n.clientName.toLowerCase().includes(search.toLowerCase()) ||
      n.subjective?.toLowerCase().includes(search.toLowerCase()) ||
      n.objective?.toLowerCase().includes(search.toLowerCase()) ||
      n.assessment?.toLowerCase().includes(search.toLowerCase()) ||
      n.linkedDriveFiles?.some((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    const matchesClient = !selectedClientId || n.clientId === selectedClientId;
    const matchesFormat = formatFilter === 'ALL' || (n.format || 'SOAP') === formatFilter;
    return matchesSearch && matchesClient && matchesFormat;
  });

  const handleOpenNewModal = () => {
    const defaultClient = clients.find((c) => c.id === selectedClientId) || clients[0];
    setFormData((prev) => ({
      ...prev,
      clientId: defaultClient?.id || 'cli-001',
      clientName: defaultClient?.name || 'Participant',
      date: new Date().toISOString().split('T')[0]
    }));
    setIsAddOpen(true);
  };

  const handlePolishWithAI = async () => {
    if (!formData.subjective && !formData.objective && !formData.assessment) return;
    setIsPolishingAI(true);
    try {
      const targetClient = clients.find((c) => c.id === formData.clientId);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rewrite and clinically refine the following draft ${formData.format || 'SOAP'} session note for NDIS participant "${
            targetClient?.name || 'Participant'
          }" (${targetClient?.primaryDisability || 'Allied Health'}). Return ONLY valid JSON with keys "subjective", "objective", "assessment", "plan" using NDIS Section 34 Reasonable & Necessary terminology.\n\nDraft Field 1: ${
            formData.subjective || ''
          }\nDraft Field 2: ${formData.objective || ''}\nDraft Field 3: ${
            formData.assessment || ''
          }\nDraft Field 4: ${formData.plan || ''}`,
          systemInstruction:
            'You are a Principal NDIS Behaviour Support & Allied Health Auditor. Return only valid JSON with keys subjective, objective, assessment, plan.'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const raw = (data.text || '').replace(/^```json\s*/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(raw);
        setFormData((prev) => ({
          ...prev,
          subjective: parsed.subjective || prev.subjective,
          objective: parsed.objective || prev.objective,
          assessment: parsed.assessment || prev.assessment,
          plan: parsed.plan || prev.plan
        }));
        addNotification({
          title: 'AI Clinical Synthesis Complete',
          message: 'Draft case note refined with NDIS Practice Standards terminology.',
          type: 'clinical',
          severity: 'low'
        });
      }
    } catch (err) {
      console.warn('AI polish fallback:', err);
    } finally {
      setIsPolishingAI(false);
    }
  };

  const handleAttachDriveFile = async () => {
    const targetClient = clients.find((c) => c.id === formData.clientId);
    setIsAttachingDrive(true);

    try {
      await openGoogleDrivePicker({
        title: `Attach Clinical File for ${targetClient?.name || 'Participant'}`,
        multiSelect: false,
        onPicked: async (pickedFiles: PickedGoogleDriveFile[]) => {
          setIsAttachingDrive(false);
          if (!pickedFiles || pickedFiles.length === 0) return;
          const file = pickedFiles[0];

          const storedDoc = await storePickedDriveFileMetadata({
            file,
            clientId: targetClient?.id || '',
            clientName: targetClient?.name,
            category: 'Clinical Report',
            uploadedBy: currentUser?.id || 'practitioner-current',
            uploadedByName: currentUser?.name || 'Clinician'
          });

          const driveEntry = {
            id: storedDoc.id,
            driveFileId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            url: file.url,
            sizeBytes: file.sizeBytes,
            category: 'Clinical Report',
            uploadedAt: new Date().toISOString()
          };

          setFormData((prev) => ({
            ...prev,
            linkedDriveFiles: [...(prev.linkedDriveFiles || []), driveEntry],
            linkedDocumentIds: [...(prev.linkedDocumentIds || []), storedDoc.id]
          }));

          addNotification({
            title: 'Drive File Attached to Draft',
            message: `"${file.name}" attached. Click "Preview" to verify document contents.`,
            type: 'clinical',
            severity: 'low'
          });
        },
        onCancel: () => {
          setIsAttachingDrive(false);
        }
      });
    } catch (err) {
      console.warn('Error attaching file from Google Drive:', err);
      setIsAttachingDrive(false);
    }
  };

  const createClaimFromNote = (note: Partial<CaseNote>, clientName: string) => {
    const totalMinutes = (Number(note.sessionDurationMinutes) || 60) + (Number(note.nonFaceToFaceMinutes) || 0);
    const hours = Number((totalMinutes / 60).toFixed(2));
    const unitPrice = note.supportItemCode === '15_054_0128_1_3' ? 232.74 : 193.99;
    const totalAmount = Number((hours * unitPrice).toFixed(2));

    addBillingClaim({
      clientId: note.clientId || 'cli-001',
      clientName,
      dateOfService: note.date || new Date().toISOString().split('T')[0],
      supportItemNumber: note.supportItemCode || '15_056_0128_1_3',
      supportItemName:
        note.supportItemCode === '15_054_0128_1_3'
          ? 'Specialist Behaviour Intervention Support'
          : 'Assessment, Recommendation, Therapy or Training - Other Professional',
      hours,
      rate: unitPrice,
      unitPrice,
      totalAmount,
      status: 'Pending',
      isPaceCompliant: true,
      claimReference: `PRODA-${Date.now().toString().slice(-6)}`
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formData.clientId);
    const clientName = client?.name || formData.clientName || 'Participant';

    addCaseNote({
      ...formData,
      clientName,
      practitionerName: currentUser?.name || 'Clinician'
    });

    if (autoGenerateClaim) {
      createClaimFromNote(formData, clientName);
    }

    setIsAddOpen(false);
    setFormData({
      clientId: clients[0]?.id || 'cli-001',
      clientName: clients[0]?.name || '',
      format: 'SOAP',
      category: 'Therapy Session',
      date: new Date().toISOString().split('T')[0],
      sessionDurationMinutes: 60,
      nonFaceToFaceMinutes: 15,
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      practitionerName: currentUser?.name || 'Principal Clinician',
      supportItemCode: '15_056_0128_1_3',
      linkedDriveFiles: []
    });
  };

  const activeFormatLabels = FORMAT_LABELS[(formData.format as 'SOAP' | 'BIRP' | 'SIMPL') || 'SOAP'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Clinical Case Notes</h1>
          <p className="text-xs text-slate-400">
            SOAP, BIRP &amp; SIMPL documentation meeting NDIS Practice Standards &amp; AHPRA clinical requirements
          </p>
        </div>

        <button
          id="btn-new-case-note"
          onClick={handleOpenNewModal}
          className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" /> New Case Note
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by keywords, clinical observations, or participant..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['ALL', 'SOAP', 'BIRP', 'SIMPL'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                formatFilter === fmt
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        <select
          value={selectedClientId || ''}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white cursor-pointer"
        >
          <option value="">All Participants</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Clinical Case Notes Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create a new SOAP, BIRP, or SIMPL progress note with automatic NDIS billing claim calculation, or load the sample clinical dataset.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Progress Note
            </button>
            {clients.length === 0 && (
              <button
                onClick={loadDemoData}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-4 h-4 text-indigo-400" /> Load Sample NDIS Dataset
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Notes List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const fmt = (note.format as 'SOAP' | 'BIRP' | 'SIMPL') || 'SOAP';
            const labels = FORMAT_LABELS[fmt] || FORMAT_LABELS.SOAP;

            return (
              <div
                key={note.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{note.clientName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-mono font-bold">
                          {fmt}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium font-mono tabular-nums">
                        {note.category} • {note.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono tabular-nums">
                        {note.sessionDurationMinutes}m face / {note.nonFaceToFaceMinutes || 0}m NF2F
                      </span>
                      <button
                        onClick={() => deleteCaseNote(note.id)}
                        aria-label="Delete note"
                        className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Note Clinical Content */}
                  <div className="space-y-2 text-xs">
                    {note.subjective && (
                      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block mb-1">
                          {labels.field1}
                        </span>
                        <p className="text-slate-200 leading-relaxed">{note.subjective}</p>
                      </div>
                    )}

                    {note.objective && (
                      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block mb-1">
                          {labels.field2}
                        </span>
                        <p className="text-slate-200 leading-relaxed">{note.objective}</p>
                      </div>
                    )}

                    {note.assessment && (
                      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block mb-1">
                          {labels.field3}
                        </span>
                        <p className="text-slate-200 leading-relaxed">{note.assessment}</p>
                      </div>
                    )}

                    {note.plan && (
                      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block mb-1">
                          {labels.field4}
                        </span>
                        <p className="text-slate-200 leading-relaxed">{note.plan}</p>
                      </div>
                    )}
                  </div>

                  {/* Linked Google Drive Documents Section */}
                  {note.linkedDriveFiles && note.linkedDriveFiles.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                          Linked Google Drive Documents ({note.linkedDriveFiles.length})
                        </span>
                        <span className="text-[10px] text-slate-400">Verified Clinical Evidence</span>
                      </div>

                      <div className="space-y-1.5">
                        {note.linkedDriveFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                              <span className="truncate font-medium text-slate-200">{file.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePreviewDoc({
                                    ...file,
                                    driveFileId: file.driveFileId || file.id
                                  });
                                  setActivePreviewClientId(note.clientId);
                                  setPreviewModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-semibold border border-teal-500/30 transition cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>

                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Note Footer: Sign-off & Billing Action */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 mt-2 gap-2">
                  <span className="flex items-center gap-1.5 text-teal-400 font-semibold truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Signed: {note.practitionerName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-slate-500">
                      {note.supportItemCode || '15_056_0128_1_3'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        createClaimFromNote(note, note.clientName);
                        addNotification({
                          title: 'NDIS Claim Queued',
                          message: `Billable session claim created for ${note.clientName} (${note.supportItemCode || '15_056_0128_1_3'}).`,
                          type: 'billing',
                          severity: 'low',
                          linkTab: 'billing'
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Generate PRODA billing claim from this clinical note"
                    >
                      <DollarSign className="w-3 h-3 text-teal-400" /> Queue Claim
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Note Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Create Clinical Progress Note</h3>
                <p className="text-[11px] text-slate-400">
                  Structured {formData.format} documentation with optional PRODA claim generation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePolishWithAI}
                  disabled={isPolishingAI}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Refine draft text into NDIS Section 34 compliant clinical terminology"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isPolishingAI ? 'Refining...' : 'AI Clinical Polish'}</span>
                </button>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Participant</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const found = clients.find((c) => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        clientId: e.target.value,
                        clientName: found?.name || formData.clientName
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer"
                  >
                    {clients.length === 0 ? (
                      <option value="cli-001">New Participant</option>
                    ) : (
                      clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Note Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer"
                  >
                    <option value="SOAP">SOAP (Standard Allied Health)</option>
                    <option value="BIRP">BIRP (Positive Behaviour Support)</option>
                    <option value="SIMPL">SIMPL (Community Access)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">NDIS Support Item</label>
                  <select
                    value={formData.supportItemCode}
                    onChange={(e) => setFormData({ ...formData, supportItemCode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-[11px] cursor-pointer"
                  >
                    <option value="15_056_0128_1_3">15_056_0128_1_3 ($193.99/h Therapy)</option>
                    <option value="15_054_0128_1_3">15_054_0128_1_3 ($232.74/h PBS Specialist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Session Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Face-to-Face (Mins)</label>
                  <input
                    type="number"
                    value={formData.sessionDurationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, sessionDurationMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Non-Face-to-Face (Mins)</label>
                  <input
                    type="number"
                    value={formData.nonFaceToFaceMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, nonFaceToFaceMinutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">{activeFormatLabels.field1}</label>
                <textarea
                  rows={2}
                  value={formData.subjective}
                  onChange={(e) => setFormData({ ...formData, subjective: e.target.value })}
                  placeholder={activeFormatLabels.field1Hint}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">{activeFormatLabels.field2}</label>
                <textarea
                  rows={2}
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder={activeFormatLabels.field2Hint}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">{activeFormatLabels.field3}</label>
                <textarea
                  rows={2}
                  value={formData.assessment}
                  onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                  placeholder={activeFormatLabels.field3Hint}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">{activeFormatLabels.field4}</label>
                <textarea
                  rows={2}
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  placeholder={activeFormatLabels.field4Hint}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              {/* Attach Google Drive Files to Draft */}
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                      Attached Google Drive Documents
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Link NDIS assessments, behavioural logs, or medical reports directly from Google Drive
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAttachDriveFile}
                    disabled={isAttachingDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30 transition cursor-pointer"
                  >
                    {isAttachingDrive ? (
                      <>
                        <div className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                        <span>Opening Picker...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select from Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {formData.linkedDriveFiles && formData.linkedDriveFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formData.linkedDriveFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                          <span className="truncate font-medium text-slate-200">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreviewDoc(f);
                              setActivePreviewClientId(formData.clientId || '');
                              setPreviewModalOpen(true);
                            }}
                            className="text-teal-400 hover:text-teal-300 text-[11px] font-semibold underline"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                linkedDriveFiles: prev.linkedDriveFiles?.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-queue PRODA Billing Claim */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={autoGenerateClaim}
                    onChange={(e) => setAutoGenerateClaim(e.target.checked)}
                    className="rounded text-teal-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-teal-300 block">
                      Auto-queue NDIS PRODA Billing Claim on Sign-Off
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Calculates face-to-face + non-face-to-face minutes against {formData.supportItemCode}
                    </span>
                  </div>
                </div>
                <DollarSign className="w-4 h-4 text-teal-400" />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white transition cursor-pointer shadow-lg shadow-teal-600/20"
                >
                  Sign &amp; Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Preview Modal */}
      <GoogleDrivePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        document={activePreviewDoc}
        initialClientId={activePreviewClientId}
        onLinkedSuccess={(doc, linkedNoteId) => {
          addNotification({
            title: 'Note Link Confirmed',
            message: `Document "${doc.name}" successfully linked to case note #${linkedNoteId}.`,
            type: 'clinical',
            severity: 'low'
          });
        }}
      />
    </div>
  );
};

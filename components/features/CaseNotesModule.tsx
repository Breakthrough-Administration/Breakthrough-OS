'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CaseNote, IncidentCategory } from '@/types';
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
  Database,
  Target,
  AlertOctagon,
  Lock,
  TrendingUp,
  Copy,
  Check,
  FileCheck2
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
    addIncident,
    updateClient,
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

  // Incident Escalation Flag State
  const [incidentFlag, setIncidentFlag] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory>('Behaviour of Concern');
  const [incidentSeverity, setIncidentSeverity] = useState<'Medium' | 'High - 5-Day Notice' | 'Critical - 24h Reportable'>('High - 5-Day Notice');
  const [incidentSummary, setIncidentSummary] = useState('');
  const [incidentImmediateAction, setIncidentImmediateAction] = useState('');

  // AI Section 34 Progress Report Drafter Modal State
  const [isReportDrafterOpen, setIsReportDrafterOpen] = useState(false);
  const [reportClientId, setReportClientId] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState(false);

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
    linkedGoalIds: [],
    linkedDriveFiles: []
  });

  const [isAttachingDrive, setIsAttachingDrive] = useState(false);

  const selectedFormClient = clients.find((c) => c.id === formData.clientId) || clients[0];
  const availableClientGoals = selectedFormClient?.goals || [];

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
      date: new Date().toISOString().split('T')[0],
      linkedGoalIds: defaultClient?.goals?.[0]?.id ? [defaultClient.goals[0].id] : []
    }));
    setIncidentFlag(false);
    setIncidentSummary('');
    setIncidentImmediateAction('');
    setIsAddOpen(true);
  };

  const toggleGoalSelection = (goalId: string) => {
    setFormData((prev) => {
      const current = prev.linkedGoalIds || [];
      const exists = current.includes(goalId);
      return {
        ...prev,
        linkedGoalIds: exists ? current.filter((id) => id !== goalId) : [...current, goalId]
      };
    });
  };

  const handlePolishWithAI = async () => {
    if (!formData.subjective && !formData.objective && !formData.assessment) return;
    setIsPolishingAI(true);
    try {
      const targetClient = clients.find((c) => c.id === formData.clientId);
      const selectedGoalsText = (targetClient?.goals || [])
        .filter((g) => (formData.linkedGoalIds || []).includes(g.id))
        .map((g) => g.title)
        .join('; ');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'polish-note',
          prompt: `Rewrite and clinically refine the following draft ${formData.format || 'SOAP'} session note for NDIS participant "${
            targetClient?.name || 'Participant'
          }" (${targetClient?.primaryDisability || 'Allied Health'}). Linked NDIS Plan Goals: ${
            selectedGoalsText || 'Capacity Building & Functional Independence'
          }. Return ONLY valid JSON with keys "subjective", "objective", "assessment", "plan" using NDIS Section 34 Reasonable & Necessary terminology.\n\nDraft Field 1: ${
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
        const raw = (data.text || data.reply || '').replace(/^```json\s*/, '').replace(/```$/, '').trim();
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
          message: 'Draft case note refined with NDIS Section 34 Practice Standards terminology.',
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

  const handleGenerateSection34Report = async () => {
    const targetClient = clients.find((c) => c.id === (reportClientId || selectedClientId)) || clients[0];
    if (!targetClient) return;

    setIsGeneratingReport(true);
    try {
      const participantNotes = caseNotes.filter((n) => n.clientId === targetClient.id).slice(0, 6);
      const notesSummary = participantNotes
        .map(
          (n) =>
            `[${n.date} - ${n.format || 'SOAP'} - ${n.supportItemCode}]: Assessment: ${n.assessment || n.objective}`
        )
        .join('\n');
      const goalsSummary = (targetClient.goals || [])
        .map((g) => `• ${g.title} (${g.category}) — Progress: ${g.progressPercent || g.progress || 0}%`)
        .join('\n');

      const prompt = `Draft a formal NDIS Plan Review & Section 34 Reasonable and Necessary Clinical Progress Report for participant "${targetClient.name}" (NDIS #${targetClient.ndisNumber}, Primary Diagnosis: ${targetClient.primaryDisability}).

Include the following structured clinical sections:
1. Executive Clinical Summary & Baseline Profile
2. NDIS Plan Goal Attainment & Functional Outcomes
3. Summary of Evidence-Based Interventions Delivered
4. Budget Utilization & Linear Burn-Rate Analysis (Allocated: $${(targetClient.allocatedBudget || targetClient.totalBudget || 0).toLocaleString()}, Spent: $${(targetClient.spentBudget || 0).toLocaleString()})
5. NDIS Act 2013 Section 34 Reasonable & Necessary Recommendations for Next Plan Cycle

Participant Goals:
${goalsSummary || 'Core & Capacity Building Functional Independence'}

Recent Session Evidence:
${notesSummary || 'Structured allied health and positive behaviour support sessions delivered.'}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt
        })
      });

      const data = await res.json();
      const text = data.reply || data.text || '';
      setGeneratedReportText(text);
    } catch (err) {
      console.warn('Failed to draft Section 34 report:', err);
    } finally {
      setIsGeneratingReport(false);
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

  const evaluateBudgetBurnRateAndNotify = (clientId: string, additionalSpend: number) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const totalBudget = client.allocatedBudget || client.totalBudget || 25000;
    const newSpent = (client.spentBudget || 0) + additionalSpend;
    updateClient(client.id, { spentBudget: Number(newSpent.toFixed(2)) });

    const startMs = client.planStartDate ? new Date(client.planStartDate).getTime() : Date.now() - 180 * 86400000;
    const endMs = client.planEndDate ? new Date(client.planEndDate).getTime() : Date.now() + 185 * 86400000;
    const nowMs = Date.now();
    const totalDuration = Math.max(1, endMs - startMs);
    const elapsedPct = Math.min(100, Math.max(5, ((nowMs - startMs) / totalDuration) * 100));
    const spentPct = (newSpent / Math.max(1, totalBudget)) * 100;

    // Trigger Budget Burn-Rate Alert if funds consumed >10% faster than linear timeline
    if (spentPct > elapsedPct + 10 || spentPct >= 80) {
      addNotification({
        title: `Budget Burn-Rate Alert: ${client.name}`,
        message: `${spentPct.toFixed(1)}% of NDIS plan budget ($${newSpent.toLocaleString()}) consumed at ${elapsedPct.toFixed(0)}% of plan timeline. Case Manager review required.`,
        type: 'billing',
        severity: 'high',
        linkTab: 'billing'
      });
    }
  };

  const createClaimFromNote = (note: Partial<CaseNote>, clientName: string, ndisNumber?: string) => {
    const totalMinutes = (Number(note.sessionDurationMinutes) || 60) + (Number(note.nonFaceToFaceMinutes) || 0);
    const hours = Number((totalMinutes / 60).toFixed(2));
    const unitPrice = note.supportItemCode === '15_054_0128_1_3' ? 232.74 : 193.99;
    const totalAmount = Number((hours * unitPrice).toFixed(2));

    addBillingClaim({
      clientId: note.clientId || 'cli-001',
      clientName,
      ndisNumber: ndisNumber || '430000000',
      serviceDate: note.date || new Date().toISOString().split('T')[0],
      dateOfService: note.date || new Date().toISOString().split('T')[0],
      supportItemCode: note.supportItemCode || '15_056_0128_1_3',
      supportItemNumber: note.supportItemCode || '15_056_0128_1_3',
      supportItemName:
        note.supportItemCode === '15_054_0128_1_3'
          ? 'Specialist Behaviour Intervention Support'
          : 'Assessment, Recommendation, Therapy or Training - Other Professional',
      hours,
      unitRate: unitPrice,
      rate: unitPrice,
      unitPrice,
      totalAmount,
      status: 'Pending',
      isPaceCompliant: true,
      invoiceNumber: `PRODA-${Date.now().toString().slice(-6)}`,
      claimReference: `PRODA-${Date.now().toString().slice(-6)}`
    });

    if (note.clientId) {
      evaluateBudgetBurnRateAndNotify(note.clientId, totalAmount);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formData.clientId);
    const clientName = client?.name || formData.clientName || 'Participant';

    const shouldLockForIncident = incidentFlag;

    addCaseNote({
      ...formData,
      clientName,
      ndisNumber: client?.ndisNumber,
      practitionerName: currentUser?.name || 'Clinician',
      flaggedForReview: incidentFlag,
      isLocked: shouldLockForIncident,
      reviewNotes: incidentFlag
        ? `LOCKED FOR STATUTORY INCIDENT ESCALATION (${incidentSeverity}): ${incidentSummary || 'Incident flagged during session'}`
        : undefined
    });

    // Mandatory Incident Escalation Workflow
    if (incidentFlag) {
      addIncident({
        clientId: formData.clientId || 'cli-001',
        clientName,
        incidentDate: formData.date || new Date().toISOString().split('T')[0],
        date: formData.date || new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        category: incidentCategory,
        severity: incidentSeverity,
        isNdisReportable: incidentSeverity.includes('Reportable') || incidentSeverity.includes('Notice'),
        status: 'Reported to NDIS Commission',
        description:
          incidentSummary ||
          formData.subjective ||
          formData.objective ||
          'Incident flagged during clinical shift delivery.',
        immediateActionTaken:
          incidentImmediateAction ||
          'Participant safety ensured, de-escalation protocol applied, and Director notified.',
        reportedBy: currentUser?.name || 'Clinician',
        reportedToNDISCommission: true
      });

      addNotification({
        title: `URGENT: Mandatory Incident Escalation (${clientName})`,
        message: `Shift progress note locked and statutory incident record generated (${incidentSeverity}). Admin & Quality Officer alerted.`,
        type: 'incident',
        severity: 'high',
        linkTab: 'incidents'
      });
    }

    if (autoGenerateClaim) {
      createClaimFromNote(formData, clientName, client?.ndisNumber);
    }

    setIsAddOpen(false);
    setIncidentFlag(false);
    setIncidentSummary('');
    setIncidentImmediateAction('');
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
      linkedGoalIds: [],
      linkedDriveFiles: []
    });
  };

  const activeFormatLabels = FORMAT_LABELS[(formData.format as 'SOAP' | 'BIRP' | 'SIMPL') || 'SOAP'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Clinical Case Notes &amp; Section 34 Reports</h1>
          <p className="text-xs text-slate-400">
            Goal-linked SOAP, BIRP &amp; SIMPL documentation with mandatory incident locking and PRODA PACE billing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const defaultClient = clients.find((c) => c.id === selectedClientId) || clients[0];
              setReportClientId(defaultClient?.id || '');
              setGeneratedReportText('');
              setIsReportDrafterOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> AI Section 34 Report Drafter
          </button>

          <button
            id="btn-new-case-note"
            onClick={handleOpenNewModal}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" /> New Case Note
          </button>
        </div>
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['ALL', 'SOAP', 'BIRP', 'SIMPL'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
        <div className="p-10 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
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
            const noteClient = clients.find((c) => c.id === note.clientId);
            const linkedGoals = (noteClient?.goals || []).filter((g) =>
              (note.linkedGoalIds || []).includes(g.id)
            );
            const isLocked = Boolean(note.isLocked || note.flaggedForReview);

            return (
              <div
                key={note.id}
                className={`p-5 rounded-2xl bg-slate-900/80 border space-y-4 transition-colors shadow-sm flex flex-col justify-between ${
                  isLocked ? 'border-rose-500/40' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{note.clientName}</span>
                        <span className="text-xs text-slate-500" aria-hidden="true">·</span>
                        <span className="text-xs font-mono font-bold text-teal-400">{fmt}</span>
                        {isLocked && (
                          <>
                            <span className="text-xs text-slate-500" aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                              <Lock className="w-3 h-3" /> Incident Locked
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium font-mono tabular-nums">
                        {note.category || 'Therapy Session'} · {note.date} · {note.sessionDurationMinutes}m F2F / {note.nonFaceToFaceMinutes || 0}m NF2F
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLocked ? (
                        <span
                          className="text-[11px] text-rose-400 font-semibold px-2 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center gap-1"
                          title="Locked due to mandatory statutory incident escalation"
                        >
                          <Lock className="w-3 h-3" /> Read-Only
                        </span>
                      ) : (
                        <button
                          onClick={() => deleteCaseNote(note.id)}
                          aria-label="Delete note"
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition cursor-pointer"
                          title="Delete progress note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Linked NDIS Plan Goals */}
                  {linkedGoals.length > 0 && (
                    <div className="pt-1 pb-1 border-y border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px] text-slate-300">
                      <Target className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="text-slate-400 font-semibold">Goals Advanced:</span>
                      <span>{linkedGoals.map((g) => g.title).join(' · ')}</span>
                    </div>
                  )}

                  {/* Note Clinical Content */}
                  <div className="space-y-2.5 text-xs">
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
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
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
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs gap-2"
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
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800 mt-2 gap-2">
                  <span className="flex items-center gap-1.5 text-teal-400 font-semibold truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Signed: {note.practitionerName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                      {note.supportItemCode || '15_056_0128_1_3'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        createClaimFromNote(note, note.clientName, noteClient?.ndisNumber);
                        addNotification({
                          title: 'NDIS Claim Queued',
                          message: `Billable session claim created for ${note.clientName} (${note.supportItemCode || '15_056_0128_1_3'}).`,
                          type: 'billing',
                          severity: 'low',
                          linkTab: 'billing'
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Create Clinical Progress Note</h3>
                <p className="text-[11px] text-slate-400">
                  Goal-linked {formData.format} documentation with PRODA claim &amp; incident safeguarding
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePolishWithAI}
                  disabled={isPolishingAI}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  title="Refine draft text into NDIS Section 34 compliant clinical terminology"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isPolishingAI ? 'Refining...' : 'AI Clinical Polish'}</span>
                </button>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
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
                        clientName: found?.name || formData.clientName,
                        linkedGoalIds: found?.goals?.[0]?.id ? [found.goals[0].id] : []
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

              {/* Goal-Linked Progress Notes Selector */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-teal-400" />
                    NDIS Plan Goals Advanced in Session (Required for Compliance)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {(formData.linkedGoalIds || []).length} selected
                  </span>
                </div>

                {availableClientGoals.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    General Capacity Building &amp; Daily Living Independence Goal linked automatically.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {availableClientGoals.map((goal) => {
                      const isSelected = (formData.linkedGoalIds || []).includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => toggleGoalSelection(goal.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-teal-500/15 border-teal-500/40 text-teal-200'
                              : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-teal-500 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold leading-snug truncate">{goal.title}</p>
                            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {goal.category} · {goal.progressPercent ?? goal.progress ?? 0}% achieved
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                  required
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
                  required
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

              {/* Mandatory Incident Escalation Toggle */}
              <div
                className={`p-3.5 rounded-xl border space-y-3 transition-colors ${
                  incidentFlag
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-slate-800/40 border-slate-700/60'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={incidentFlag}
                      onChange={(e) => setIncidentFlag(e.target.checked)}
                      className="rounded text-rose-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                        Incident Flag (Mandatory NDIS Safeguarding Escalation)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        If checked, locks this progress note from future edits and creates an urgent record in the Incidents register
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-300">
                    {incidentFlag ? 'ESCALATION ACTIVE' : 'No Incident'}
                  </span>
                </label>

                {incidentFlag && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-500/20">
                    <div className="space-y-1">
                      <label className="text-rose-200 font-semibold">Incident Category</label>
                      <select
                        value={incidentCategory}
                        onChange={(e) => setIncidentCategory(e.target.value as IncidentCategory)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-rose-500/30 text-white"
                      >
                        <option value="Behaviour of Concern">Behaviour of Concern</option>
                        <option value="Injury">Participant / Worker Injury</option>
                        <option value="Medication Error">Medication Error</option>
                        <option value="Restrictive Practice Issue">Unauthorised Restrictive Practice</option>
                        <option value="Property Damage">Property Damage</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-rose-200 font-semibold">Commission Notification Tier</label>
                      <select
                        value={incidentSeverity}
                        onChange={(e) => setIncidentSeverity(e.target.value as any)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-rose-500/30 text-white"
                      >
                        <option value="Critical - 24h Reportable">Critical - 24h Reportable</option>
                        <option value="High - 5-Day Notice">High - 5-Day Notice</option>
                        <option value="Medium">Internal Safeguarding Watch</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-rose-200 font-semibold">Immediate Safeguarding Action Taken</label>
                      <input
                        type="text"
                        value={incidentImmediateAction}
                        onChange={(e) => setIncidentImmediateAction(e.target.value)}
                        placeholder="e.g. Applied low-arousal de-escalation, ensured physical safety, notified nominee..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-rose-500/30 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Attach Google Drive Files to Draft */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30 transition cursor-pointer whitespace-nowrap shrink-0"
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
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
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
                            className="text-teal-400 hover:text-teal-300 text-[11px] font-semibold underline cursor-pointer"
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
                            className="text-slate-400 hover:text-rose-400 cursor-pointer"
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
                      Auto-queue NDIS PRODA Billing Claim &amp; Check Plan Burn-Rate
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
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
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white transition cursor-pointer shadow-lg shadow-teal-600/20"
                >
                  {incidentFlag ? 'Sign, Lock Note & Escalate Incident' : 'Sign & Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Section 34 Progress Report Drafter Modal */}
      {isReportDrafterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    AI NDIS Section 34 Plan Review &amp; Progress Report Drafter
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Synthesizes participant session notes, goal attainment, and budget utilization into an audit-ready clinical report
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportDrafterOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-slate-300 font-semibold">Select Participant</label>
                  <select
                    value={reportClientId}
                    onChange={(e) => setReportClientId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (NDIS #{c.ndisNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateSection34Report}
                  disabled={isGeneratingReport}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingReport ? 'Synthesizing Clinical Evidence...' : 'Generate Section 34 Report'}</span>
                </button>
              </div>

              {generatedReportText ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-400">
                      Generated NDIS Section 34 Clinical Evidence Report
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedReportText);
                        setCopiedReport(true);
                        setTimeout(() => setCopiedReport(false), 2500);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReport ? 'Copied to Clipboard' : 'Copy Report'}</span>
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-sans">
                    {generatedReportText}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                  <TrendingUp className="w-6 h-6 text-teal-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">
                    Ready to Synthesize Participant Clinical Evidence
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Click &ldquo;Generate Section 34 Report&rdquo; to compile linked NDIS goals, session notes, and linear budget burn-rate metrics into a formal NDIS Quality &amp; Safeguards Commission compliant report.
                  </p>
                </div>
              )}
            </div>
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

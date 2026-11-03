'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CompanyDocument, CompanyDocumentCategory } from '@/types';
import {
  FolderOpen,
  FileText,
  UploadCloud,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  Briefcase,
  FileSpreadsheet,
  Sparkles,
  Download,
  Trash2,
  ExternalLink,
  Users,
  Mail,
  ArrowRight,
  Building2,
  X,
  Check,
  RefreshCw,
  Compass
} from 'lucide-react';

const VAULT_CATEGORIES: {
  id: CompanyDocumentCategory | 'ALL';
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: 'ALL',
    label: 'All Company Documents',
    shortLabel: 'All Vaults',
    description: 'Complete repository of corporate financials, NDIS policies, HR contracts, and templates',
    icon: FolderOpen,
    accent: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
  },
  {
    id: 'Financials, P&L, BAS & Tax',
    label: 'Financials, P&L, BAS & Tax',
    shortLabel: 'Financials & Tax',
    description: 'Profit & Loss statements, quarterly BAS, Xero exports, payroll ledgers, and tax filings',
    icon: DollarSign,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'NDIS Policies, SOPs & Governance',
    label: 'NDIS Policies, SOPs & Governance',
    shortLabel: 'Policies & SOPs',
    description: 'NDIS Practice Standards policies, Incident & Restrictive Practice SOPs, and Risk Registers',
    icon: ShieldCheck,
    accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 'HR Contracts, Insurance & Licenses',
    label: 'HR Contracts, Insurance & Licenses',
    shortLabel: 'HR & Insurance',
    description: 'Public Liability & Professional Indemnity ($20M), WorkCover, SCHADS contracts, and PRODA certs',
    icon: Briefcase,
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'Clinical Templates & Service Agreements',
    label: 'Clinical Templates & Service Agreements',
    shortLabel: 'Templates & Agreements',
    description: 'Master Service Agreements, Schedule of Supports, Consent forms, and BSP/FBA clinical templates',
    icon: FileText,
    accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  },
  {
    id: 'Participant Plans & Schedules',
    label: 'Participant Plans & Schedules',
    shortLabel: 'Participant Plans',
    description: 'Uploaded NDIS Plan PDFs and funding schedules linked to your 22 active participants',
    icon: Users,
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
];

export const CompanyLibraryModule: React.FC = () => {
  const {
    companyDocuments,
    addCompanyDocument,
    updateCompanyDocument,
    deleteCompanyDocument,
    clients,
    practitioners,
    updateClient,
    addBillingClaim,
    setActiveTab,
    currentUser,
    addNotification
  } = useManagementStore();

  const [activeView, setActiveView] = useState<'vault' | 'plan-managers' | 'advisory'>('vault');
  const [selectedCategory, setSelectedCategory] = useState<CompanyDocumentCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload Form State
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    fileName: string;
    category: CompanyDocumentCategory;
    version: string;
    status: 'Current' | 'Review Due Soon' | 'Expired' | 'Draft';
    effectiveDate: string;
    reviewOrExpiryDate: string;
    fileSize: string;
    mimeType: string;
    url: string;
    linkedParticipantId: string;
    summary: string;
    rawTextContent: string;
    extractedFacts: { label: string; value: string }[];
    extractedBudgetAmount: number;
    tagsInput: string;
  }>({
    title: '',
    fileName: '',
    category: 'Financials, P&L, BAS & Tax',
    version: 'v1.0',
    status: 'Current',
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewOrExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    fileSize: '250 KB',
    mimeType: 'application/pdf',
    url: '',
    linkedParticipantId: '',
    summary: '',
    rawTextContent: '',
    extractedFacts: [],
    extractedBudgetAmount: 0,
    tagsInput: 'Company, Governance, 2026'
  });

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const filteredDocuments = useMemo(() => {
    return companyDocuments.filter((doc) => {
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (doc.title.toLowerCase().includes(q) ||
          doc.fileName.toLowerCase().includes(q) ||
          (doc.summary || '').toLowerCase().includes(q) ||
          doc.tags.some((t) => t.toLowerCase().includes(q)) ||
          (doc.linkedParticipantName || '').toLowerCase().includes(q))
      );
    });
  }, [companyDocuments, selectedCategory, searchQuery]);

  // Group 22 Active Participants by Plan Manager Invoice Email for Batch Invoicing
  const planManagerGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        agency: string;
        invoiceEmail: string;
        planManagementType: string;
        participants: typeof clients;
        totalRecordedBudget: number;
      }
    > = {};

    for (const c of clients) {
      const email = c.planManager?.email || (c.planManagementType?.includes('Self') ? c.email || 'Self-Managed' : 'NDIA');
      const agency =
        c.planManager?.agency ||
        c.planManager?.agencyName ||
        (email === 'NDIA' ? 'NDIA PRODA Portal' : c.planManagementType || 'Plan Managed');
      const key = `${agency}__${email}`;

      if (!groups[key]) {
        groups[key] = {
          agency,
          invoiceEmail: email,
          planManagementType: c.planManagementType || 'Plan-Managed',
          participants: [],
          totalRecordedBudget: 0
        };
      }
      groups[key].participants.push(c);
      groups[key].totalRecordedBudget += c.totalBudget || 0;
    }

    return Object.values(groups).sort((a, b) => b.participants.length - a.participants.length);
  }, [clients]);

  // Auto-detect category & facts when user selects a local file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const formattedSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    const lowerName = file.name.toLowerCase();

    let detectedCategory: CompanyDocumentCategory = uploadForm.category;
    if (
      lowerName.includes('fin') ||
      lowerName.includes('bas') ||
      lowerName.includes('p&l') ||
      lowerName.includes('tax') ||
      lowerName.includes('invoice') ||
      lowerName.includes('xero') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx')
    ) {
      detectedCategory = 'Financials, P&L, BAS & Tax';
    } else if (
      lowerName.includes('policy') ||
      lowerName.includes('sop') ||
      lowerName.includes('incident') ||
      lowerName.includes('governance') ||
      lowerName.includes('audit')
    ) {
      detectedCategory = 'NDIS Policies, SOPs & Governance';
    } else if (
      lowerName.includes('insurance') ||
      lowerName.includes('contract') ||
      lowerName.includes('hr') ||
      lowerName.includes('screening') ||
      lowerName.includes('certificate')
    ) {
      detectedCategory = 'HR Contracts, Insurance & Licenses';
    } else if (
      lowerName.includes('agreement') ||
      lowerName.includes('template') ||
      lowerName.includes('consent') ||
      lowerName.includes('schedule')
    ) {
      detectedCategory = 'Clinical Templates & Service Agreements';
    } else if (lowerName.includes('plan') || lowerName.includes('ndis')) {
      detectedCategory = 'Participant Plans & Schedules';
    }

    // Match participant name if present in filename
    const matchedClient = clients.find((c) =>
      lowerName.includes(c.name.toLowerCase().split(' ')[0]) &&
      c.name.toLowerCase().split(' ')[0].length > 3
    );

    let textPreview = '';
    if (
      file.type.startsWith('text/') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.md')
    ) {
      try {
        textPreview = (await file.text()).slice(0, 6000);
      } catch {
        textPreview = '';
      }
    }

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    setUploadForm((prev) => ({
      ...prev,
      title: prev.title || cleanTitle,
      fileName: file.name,
      category: detectedCategory,
      fileSize: formattedSize,
      mimeType: file.type || 'application/octet-stream',
      linkedParticipantId: matchedClient?.id || prev.linkedParticipantId,
      rawTextContent: textPreview,
      summary:
        prev.summary ||
        `Uploaded company record (${file.name}, ${formattedSize}) categorized under ${detectedCategory}.`
    }));
  };

  // Run AI Evidence-Based Fact Extraction on the document
  const handleRunAIExtraction = async () => {
    setIsExtractingAI(true);
    try {
      const prompt = `You are Breakthrough Assistant analysing a company document uploaded to the Company Document Library.
Document Title: ${uploadForm.title || uploadForm.fileName}
File Name: ${uploadForm.fileName}
Category: ${uploadForm.category}
Document Content / Notes Supplied:
${uploadForm.rawTextContent || uploadForm.summary || 'Only filename and metadata supplied.'}

Extract only facts explicitly evidenced in the supplied text/metadata. Never invent or guess figures.
Return valid JSON only with this structure:
{
  "summary": "1-2 sentence neutral factual summary of the document",
  "facts": [
    { "label": "Fact Label", "value": "Evidenced Value or Not stated" }
  ],
  "detectedBudgetAud": 0
}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.text || data.response || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setUploadForm((prev) => ({
            ...prev,
            summary: parsed.summary || prev.summary,
            extractedFacts: Array.isArray(parsed.facts) ? parsed.facts : prev.extractedFacts,
            extractedBudgetAmount:
              typeof parsed.detectedBudgetAud === 'number' ? parsed.detectedBudgetAud : prev.extractedBudgetAmount
          }));
          showBanner('Extracted evidenced document facts via Breakthrough Assistant.');
          setIsExtractingAI(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI extraction fallback:', err);
    }

    // Deterministic regex extraction fallback (strictly from supplied text)
    const content = `${uploadForm.title} ${uploadForm.fileName} ${uploadForm.rawTextContent} ${uploadForm.summary}`;
    const dollarMatches = content.match(/\$[0-9,]+(\.[0-9]{2})?/g) || [];
    const dateMatches = content.match(/\b(202[4-9]-[01][0-9]-[0-3][0-9]|[0-3][0-9]\/[01][0-9]\/202[4-9])\b/g) || [];
    const facts: { label: string; value: string }[] = [
      { label: 'Document Category', value: uploadForm.category },
      { label: 'File Format', value: uploadForm.fileName.split('.').pop()?.toUpperCase() || 'PDF' }
    ];
    if (dollarMatches.length > 0) {
      facts.push({ label: 'Evidenced Monetary Figures', value: dollarMatches.slice(0, 3).join(', ') });
    }
    if (dateMatches.length > 0) {
      facts.push({ label: 'Evidenced Dates', value: dateMatches.slice(0, 3).join(', ') });
    }

    const numericBudget =
      dollarMatches.length > 0 ? parseFloat(dollarMatches[0].replace(/[^0-9.]/g, '')) || 0 : 0;

    setUploadForm((prev) => ({
      ...prev,
      extractedFacts: facts,
      extractedBudgetAmount: numericBudget
    }));
    setIsExtractingAI(false);
  };

  const handleSaveCompanyDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedClient = clients.find((c) => c.id === uploadForm.linkedParticipantId);
    const newDoc: CompanyDocument = {
      id: `comp-doc-${Date.now()}`,
      title: uploadForm.title.trim() || uploadForm.fileName || 'Untitled Company Document',
      fileName: uploadForm.fileName || `${uploadForm.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category: uploadForm.category,
      version: uploadForm.version || 'v1.0',
      status: uploadForm.status,
      effectiveDate: uploadForm.effectiveDate,
      reviewOrExpiryDate: uploadForm.reviewOrExpiryDate,
      uploadedBy: currentUser?.name || 'Director Office',
      uploadedAt: new Date().toISOString(),
      fileSize: uploadForm.fileSize || '240 KB',
      mimeType: uploadForm.mimeType || 'application/pdf',
      url: uploadForm.url || undefined,
      linkedParticipantId: linkedClient?.id,
      linkedParticipantName: linkedClient?.name,
      summary: uploadForm.summary || 'Uploaded to company operations vault.',
      extractedFacts:
        uploadForm.extractedFacts.length > 0
          ? uploadForm.extractedFacts
          : [
              { label: 'Vault Folder', value: uploadForm.category },
              { label: 'Version', value: uploadForm.version },
              { label: 'Review / Expiry Date', value: uploadForm.reviewOrExpiryDate || 'Not stated' }
            ],
      tags: uploadForm.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    };

    addCompanyDocument(newDoc);

    // If linked to a participant and a budget amount was explicitly entered/extracted, update participant budget if desired
    if (linkedClient && uploadForm.extractedBudgetAmount > 0) {
      updateClient(linkedClient.id, {
        totalBudget: uploadForm.extractedBudgetAmount,
        allocatedBudget: uploadForm.extractedBudgetAmount,
        serviceAgreementStatus: 'Signed & Active',
        budgetBreakdown: {
          ...linkedClient.budgetBreakdown,
          capacityBuildingPBS: uploadForm.extractedBudgetAmount
        }
      });
    }

    setIsUploadModalOpen(false);
    setSelectedDoc(newDoc);
    showBanner(`Saved "${newDoc.title}" to ${newDoc.category} and synchronized with Firestore.`);
  };

  // Generate Batch Claims for a Plan Manager group
  const handleGeneratePlanManagerBatch = (group: (typeof planManagerGroups)[0]) => {
    const today = new Date().toISOString().split('T')[0];
    let createdCount = 0;

    for (const participant of group.participants) {
      addBillingClaim({
        clientId: participant.id,
        clientName: participant.name,
        ndisNumber: participant.ndisNumber,
        serviceDate: today,
        supportItemCode: '07_002_0115_8_3',
        supportItemName: 'Specialist Behavioural Intervention Support',
        ndisSupportItem: '07_002_0115_8_3 - Specialist Behavioural Intervention Support',
        hours: 2.0,
        unitRate: 214.41,
        totalAmount: 428.82,
        status: 'Pending',
        invoiceNumber: `INV-${participant.ndisNumber.slice(-4)}-${Date.now().toString().slice(-3)}`,
        claimType: participant.planManagementType || 'Plan Managed',
        practitionerId: participant.primaryPractitionerId,
        practitionerName: participant.primaryPractitionerName
      });
      createdCount++;
    }

    addNotification({
      title: `Batch Claims Prepared for ${group.agency}`,
      message: `Prepared ${createdCount} draft claims ($${(createdCount * 428.82).toFixed(2)} AUD) addressed to ${group.invoiceEmail} for staff review.`,
      type: 'billing',
      severity: 'low',
      linkTab: 'billing'
    });

    showBanner(
      `Prepared ${createdCount} draft claims for ${group.agency} (${group.invoiceEmail}). Review them in NDIS Billing & PACE before submission.`
    );
  };

  const handleExportPlanManagerCSV = (group: (typeof planManagerGroups)[0]) => {
    const headers = [
      'Participant Name',
      'NDIS Number',
      'Plan Management Type',
      'Plan Manager Agency',
      'Invoice Email',
      'Primary Practitioner',
      'Support Item Code',
      'Recorded Total Budget (AUD)'
    ];
    const rows = group.participants.map((p) => [
      `"${p.name}"`,
      `"${p.ndisNumber}"`,
      `"${p.planManagementType || 'Plan-Managed'}"`,
      `"${group.agency}"`,
      `"${group.invoiceEmail}"`,
      `"${p.primaryPractitionerName || 'Unassigned'}"`,
      `"07_002_0115_8_3"`,
      `"${(p.totalBudget || 0).toFixed(2)}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plan_Manager_Batch_${group.agency.replace(/[^a-zA-Z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeClientsCount = clients.filter((c) => c.status === 'Active').length;
  const zeroBudgetClients = clients.filter((c) => !c.totalBudget || c.totalBudget === 0);
  const totalCompanyBudget = clients.reduce((sum, c) => sum + (c.totalBudget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Company Document Library &amp; Operations Hub
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {activeClientsCount} / {clients.length} Participants Active
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Centralized corporate vault for Financials (P&amp;L, BAS, Tax), NDIS Policies &amp; SOPs, HR &amp; Insurance Certificates, Service Agreements, Plan Manager Invoice Batching, and Practice Advisory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-950/50 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Company Document</span>
          </button>

          <button
            onClick={() => setActiveTab('hr-roster')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Practitioners &amp; Caseloads ({practitioners.length})</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Executive KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Company Vault Documents</span>
            <FolderOpen className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{companyDocuments.length}</div>
          <p className="text-[11px] text-emerald-400">
            Across 5 corporate &amp; clinical governance folders
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active NDIS Participants</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{activeClientsCount} Active</div>
          <p className="text-[11px] text-slate-400">
            100% of imported V2 roster set to Active
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recorded NDIS Plan Budgets</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${totalCompanyBudget.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-300">
            {clients.length - zeroBudgetClients.length} plans with budget · {zeroBudgetClients.length} awaiting plan PDF
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Plan Manager Channels</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{planManagerGroups.length} Channels</div>
          <p className="text-[11px] text-indigo-300">
            Ready for automated batch invoicing
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveView('vault')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'vault'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Company Document Vault ({companyDocuments.length})</span>
        </button>

        <button
          onClick={() => setActiveView('plan-managers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'plan-managers'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Plan Manager Invoice Batching ({planManagerGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveView('advisory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'advisory'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Practice Improvement &amp; Executive Advisory</span>
        </button>
      </div>

      {/* =====================================================================
          VIEW 1: COMPANY DOCUMENT VAULT
          ===================================================================== */}
      {activeView === 'vault' && (
        <div className="space-y-5">
          {/* 5 Vault Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VAULT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count =
                cat.id === 'ALL'
                  ? companyDocuments.length
                  : companyDocuments.filter((d) => d.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-500/50 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2 rounded-xl border ${cat.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
                      {count} {count === 1 ? 'doc' : 'docs'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-3">{cat.label}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                </button>
              );
            })}
          </div>

          {/* Search & Quick Upload Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company documents by title, filename, policy standard, BAS, or tag..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedCategory !== 'ALL') {
                    setUploadForm((prev) => ({ ...prev, category: selectedCategory }));
                  }
                  setIsUploadModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to {selectedCategory === 'ALL' ? 'Vault' : selectedCategory.split(',')[0]}</span>
              </button>
            </div>
          </div>

          {/* Document Grid + Detail Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              {filteredDocuments.length === 0 ? (
                <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Documents Found in This Vault</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Upload your financials (P&amp;L, BAS, Xero exports), NDIS policies, HR contracts, or participant NDIS plans to centralize your company records.
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload First Document</span>
                  </button>
                </div>
              ) : (
                filteredDocuments.map((doc) => {
                  const isActive = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800/90 border-teal-500/50 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-teal-400 border border-slate-800">
                              {doc.category}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{doc.version}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                doc.status === 'Current'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : doc.status === 'Review Due Soon'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">{doc.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{doc.summary}</p>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="text-[11px] font-mono text-slate-400">{doc.fileSize}</div>
                          {doc.reviewOrExpiryDate && (
                            <div className="text-[10px] text-slate-500">
                              Review: <span className="font-mono text-slate-300">{doc.reviewOrExpiryDate}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-300">{doc.fileName}</span>
                          {doc.linkedParticipantName && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                              Participant: {doc.linkedParticipantName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-teal-400 hover:text-teal-300 font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCompanyDocument(doc.id);
                              if (selectedDoc?.id === doc.id) setSelectedDoc(null);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Delete document from company vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Inspector Drawer */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 h-fit sticky top-20">
              {selectedDoc ? (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        {selectedDoc.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{selectedDoc.title}</h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{selectedDoc.fileName}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed">{selectedDoc.summary}</p>
                  </div>

                  {selectedDoc.extractedFacts && selectedDoc.extractedFacts.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Evidenced Document Facts</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedDoc.extractedFacts.map((fact, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-400">{fact.label}:</span>
                            <span className="font-mono font-semibold text-white text-right">{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Effective Date</span>
                      <span className="font-mono text-slate-200">{selectedDoc.effectiveDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Review / Expiry</span>
                      <span className="font-mono text-slate-200">{selectedDoc.reviewOrExpiryDate || 'Not stated'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Uploaded By</span>
                      <span className="text-slate-200">{selectedDoc.uploadedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Version</span>
                      <span className="font-mono text-slate-200">{selectedDoc.version}</span>
                    </div>
                  </div>

                  {selectedDoc.url && (
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Source File</span>
                    </a>
                  )}
                </>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">Select a Document to Inspect</h4>
                  <p className="text-[11px] text-slate-500">
                    Click any policy, financial statement, or template on the left to view extracted facts, version history, and review dates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: PLAN MANAGER INVOICE BATCHING HUB
          ===================================================================== */}
      {activeView === 'plan-managers' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Plan Manager &amp; Agency Claim Channels (All 22 Active Participants)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grouped automatically by the invoice emails from your imported V2 roster. Prepare draft NDIS claims or export remittance CSVs per Plan Manager.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('billing')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>Open Full Billing &amp; PACE Ledger</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planManagerGroups.map((group) => (
              <div
                key={`${group.agency}-${group.invoiceEmail}`}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {group.planManagementType}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{group.agency}</h3>
                      <p className="text-xs font-mono text-teal-400">{group.invoiceEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white font-mono">
                        {group.participants.length} {group.participants.length === 1 ? 'Participant' : 'Participants'}
                      </span>
                      <div className="text-[11px] font-mono text-slate-400">
                        Recorded Budget: ${group.totalRecordedBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {group.participants.map((p) => (
                      <span
                        key={p.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 font-medium"
                      >
                        {p.name} <span className="font-mono text-[10px] text-slate-400">({p.ndisNumber})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleGeneratePlanManagerBatch(group)}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Prepare Draft Claims ({group.participants.length})</span>
                  </button>
                  <button
                    onClick={() => handleExportPlanManagerCSV(group)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: PRACTICE IMPROVEMENT & EXECUTIVE ADVISORY
          ===================================================================== */}
      {activeView === 'advisory' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              Breakthrough Executive Advisory — Based on Your Live 22-Participant Roster
            </span>
            <h2 className="text-lg font-extrabold text-white">
              How to Run &amp; Scale Your NDIS Practice End-to-End
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Below is an evidence-based operational roadmap tailored to your 22 active participants, their Plan Management channels, and NDIS Quality &amp; Safeguards Commission requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Priority 1 · Revenue &amp; Plan Integrity
                  </span>
                  <span className="text-xs font-mono text-amber-400">{zeroBudgetClients.length} Participants at $0.00</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  1. Complete NDIS Plan Budgets &amp; Signed Service Agreements
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  While all 22 participants are now <strong>Active</strong>, {zeroBudgetClients.length} participants currently have <code>$0.00</code> recorded budget in the V2 roster (only Abu Bakr Tyson Amiri, Celeste Rattray-Wood, Eman Syed, Titan Tai, and Viren Virdi have dollar budgets entered). Upload their NDIS Plan PDFs or use the Quick Budget Editor on the Participants page to record their Capacity Building (15_056 / 07_002) and Core funding ceilings so automated burn-rate alerts can protect you from over-servicing.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('clients')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Participants &amp; Quick Budget Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Priority 2 · Workforce &amp; Caseload Allocation
                  </span>
                  <span className="text-xs font-mono text-teal-400">{practitioners.length} Practitioners</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  2. Assign Primary &amp; Secondary Practitioners + Weekly Billable Targets
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Use the new <strong>Caseload Assignment Matrix</strong> in the HR &amp; Roster module to onboard your full clinical team, verify their NDIS Worker Screening (NDISWC) and AHPRA numbers, and bulk-assign Primary and Secondary practitioners across all 22 participants. Setting weekly billable hour targets (e.g., 25–28 billable hrs/week) lets you track utilization against SCHADS wage costs.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('hr-roster')}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Practitioner Creation &amp; Caseload Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Priority 3 · Cashflow &amp; Claim Automation
                  </span>
                  <span className="text-xs font-mono text-indigo-400">14 Plan-Managed · 7 NDIA · 1 Self</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  3. Automate Case Note → Claim Generation &amp; Plan Manager Dispatch
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  7 of your active participants are <strong>NDIA-Managed</strong> (claimed via PRODA Bulk CSV) and 14 are <strong>Plan-Managed</strong> across Blossom Community Care, Plan Managers, Supportive Choices, My Plan Manager, Motivision, AYS, NSP, Sky, Canny Group, and Focus On You. Requiring practitioners to sign SOAP/BIRP case notes at the end of each shift automatically creates validated draft claims ready for Friday batch invoicing.
                </p>
              </div>
              <button
                onClick={() => setActiveView('plan-managers')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review Plan Manager Batch Channels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Priority 4 · Clinical &amp; Statutory Governance
                  </span>
                  <span className="text-xs font-mono text-purple-400">Module 2A Audit Ready</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  4. Complete Missing Dates of Birth &amp; High-Risk BSP Reviews
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  3 active participants (<strong>Viren Virdi</strong>, <strong>Saffron Robinson</strong>, and <strong>Zachariah Psaila Nogueira</strong>) have <code>Not stated</code> for Date of Birth in the imported sheet, and 10 participants are flagged as <strong>High Risk</strong>. Updating their DOBs (required for PRODA bulk claim validation) and ensuring every High-Risk participant has an active Behaviour Support Plan (BSP) &amp; Emergency Disaster Plan in the Vault ensures 100% NDIS Commission audit readiness.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('bsp-plans')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Behaviour Support Plans (BSP)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: UPLOAD COMPANY DOCUMENT TO VAULT
          ===================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Upload Document to Company Library</h3>
                <p className="text-xs text-slate-400">
                  Store financials, BAS/tax records, NDIS policies, HR contracts, or participant NDIS plans
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyDocument} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-950/60 text-center space-y-2 cursor-pointer transition-all"
              >
                <UploadCloud className="w-7 h-7 text-teal-400 mx-auto" />
                <div className="text-xs font-bold text-white">
                  {uploadForm.fileName
                    ? `Selected: ${uploadForm.fileName} (${uploadForm.fileSize})`
                    : 'Click to select a PDF, Excel (.xlsx), CSV, Word (.docx), or Image file'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Automatically detects folder category and supports AI fact extraction
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.json,.png,.jpg,.jpeg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Q2 FY27 Profit & Loss Statement"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Company Vault Folder *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, category: e.target.value as CompanyDocumentCategory })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Financials, P&L, BAS & Tax">Financials, P&amp;L, BAS &amp; Tax</option>
                    <option value="NDIS Policies, SOPs & Governance">NDIS Policies, SOPs &amp; Governance</option>
                    <option value="HR Contracts, Insurance & Licenses">HR Contracts, Insurance &amp; Licenses</option>
                    <option value="Clinical Templates & Service Agreements">
                      Clinical Templates &amp; Service Agreements
                    </option>
                    <option value="Participant Plans & Schedules">Participant Plans &amp; Schedules</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Version</label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Effective Date</label>
                  <input
                    type="date"
                    value={uploadForm.effectiveDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Review / Expiry Date</label>
                  <input
                    type="date"
                    value={uploadForm.reviewOrExpiryDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, reviewOrExpiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Link to Active Participant (Optional)
                  </label>
                  <select
                    value={uploadForm.linkedParticipantId}
                    onChange={(e) => setUploadForm({ ...uploadForm, linkedParticipantId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">— Company-Wide (Not Participant-Specific) —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (NDIS: {c.ndisNumber}) — Current Budget: ${(c.totalBudget || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Update Linked Participant Budget (AUD, Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={uploadForm.extractedBudgetAmount || ''}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        extractedBudgetAmount: parseFloat(e.target.value) || 0
                      })
                    }
                    placeholder="e.g. 45000.00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    Executive Summary / Paste Document Excerpt for AI Extraction
                  </label>
                  <button
                    type="button"
                    onClick={handleRunAIExtraction}
                    disabled={isExtractingAI}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isExtractingAI ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Extract Evidenced Facts</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={uploadForm.summary}
                  onChange={(e) => setUploadForm({ ...uploadForm, summary: e.target.value })}
                  placeholder="Summarize key financial figures, policy scope, or paste document text here..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              {uploadForm.extractedFacts.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    Extracted Facts Preview
                  </span>
                  {uploadForm.extractedFacts.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{f.label}:</span>
                      <span className="font-mono text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Google Drive / Document Link (Optional)</label>
                  <input
                    type="text"
                    value={uploadForm.url}
                    onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={uploadForm.tagsInput}
                    onChange={(e) => setUploadForm({ ...uploadForm, tagsInput: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Company Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

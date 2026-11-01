'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { AttachedDocument, Client } from '@/types';
import { ParticipantScanDocumentModal } from './ParticipantScanDocumentModal';
import { ParticipantFeedbackModal } from './ParticipantFeedbackModal';
import { ParticipantSecureFileList } from './ParticipantSecureFileList';
import { ParticipantPlanUtilization } from './ParticipantPlanUtilization';
import {
  UserCheck,
  Target,
  Calendar,
  Phone,
  CheckCircle2,
  Camera,
  Receipt,
  FileText,
  DollarSign,
  ShieldCheck,
  StickyNote,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  X,
  FileCheck2,
  Sparkles,
  Eye,
  Clock,
  ChevronRight,
  Filter,
  Check,
  Building,
  Star,
  MessageSquare,
  Lock,
  PieChart as PieIcon,
  FileCheck
} from 'lucide-react';

export const ParticipantPortalView: React.FC = () => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    attachDocumentToClient,
    removeDocumentFromClient,
    setActiveTab,
    addNotification
  } = useManagementStore();

  // Find or fallback to first client or safe default
  const defaultParticipant: Client = useMemo(
    () => ({
      id: 'cli-001',
      name: 'Liam O’Connor',
      ndisNumber: '430982103',
      dateOfBirth: '2012-04-18',
      gender: 'Male',
      contactNumber: '0412 889 123',
      email: 'liam.carer@example.com',
      address: {
        street: '14 Elmwood Terrace',
        suburb: 'Hawthorn',
        state: 'VIC',
        postcode: '3122'
      },
      diagnosis: 'Autism Spectrum Disorder (Level 2), ADHD Combined Type',
      primaryDisability: 'Autism Spectrum Disorder (Level 2)',
      status: 'Active' as const,
      totalBudget: 48500,
      allocatedBudget: 32400,
      spentBudget: 12200,
      primaryPractitionerId: 'prac-201',
      primaryPractitionerName: 'Dr. Sarah Jenkins',
      riskLevel: 'Low' as const,
      emergencyContact: {
        name: 'Fiona O’Connor',
        relationship: 'Mother',
        phone: '0412 889 123'
      },
      restrictivePracticesActive: false,
      createdAt: '2025-07-01T00:00:00Z',
      updatedAt: '2026-10-08T00:00:00Z',
      planStartDate: '2025-07-01',
      planEndDate: '2026-06-30',
      goals: [
        {
          id: 'goal-1',
          title: 'Emotional Regulation & Sensory Routine',
          category: 'Capacity Building',
          targetDate: '2026-06-30',
          progressPercent: 75,
          status: 'In Progress'
        },
        {
          id: 'goal-2',
          title: 'Independent Public Transport Navigation',
          category: 'Social & Community',
          targetDate: '2026-05-15',
          progressPercent: 45,
          status: 'In Progress'
        }
      ],
      attachedDocuments: [
        {
          id: 'doc-starter-1',
          name: 'Chemist Warehouse - Sensory Weighted Blanket & Timer',
          url: 'https://images.unsplash.com/photo-1554415707-9e44667ebbbf?auto=format&fit=crop&w=800&q=80',
          sizeBytes: 245000,
          mimeType: 'image/jpeg',
          uploadedBy: 'liam.carer@example.com',
          uploadedByName: 'Carer / Nominee',
          uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          category: 'other',
          clientId: 'cli-001',
          clientName: 'Liam O’Connor',
          metadata: {
            isScannedDoc: true,
            scanCategory: 'receipt',
            amount: 89.5,
            currency: 'AUD',
            providerName: 'Chemist Warehouse Hawthorn',
            serviceDate: '2026-10-06',
            budgetLine: 'Core - Daily Activities & Consumables',
            notes: 'Sensory calming equipment for bedtime and study routine as recommended by OT.',
            syncedToGoogleKeep: true,
            reimbursementSubmitted: true,
            status: 'Approved'
          }
        },
        {
          id: 'doc-starter-2',
          name: 'Silver Top Taxis - Transport to Allied Health Clinic',
          url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80',
          sizeBytes: 182000,
          mimeType: 'image/jpeg',
          uploadedBy: 'liam.carer@example.com',
          uploadedByName: 'Carer / Nominee',
          uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          category: 'other',
          clientId: 'cli-001',
          clientName: 'Liam O’Connor',
          metadata: {
            isScannedDoc: true,
            scanCategory: 'receipt',
            amount: 34.2,
            currency: 'AUD',
            providerName: 'Silver Top Taxi Service',
            serviceDate: '2026-10-03',
            budgetLine: 'Core - Transport & Community Access',
            notes: 'Return trip to Richmond PBS clinical rooms.',
            syncedToGoogleKeep: true,
            reimbursementSubmitted: true,
            status: 'Submitted'
          }
        },
        {
          id: 'doc-starter-3',
          name: 'Paediatric OT Sensory Profile Assessment Summary',
          url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          sizeBytes: 420000,
          mimeType: 'image/jpeg',
          uploadedBy: 'liam.carer@example.com',
          uploadedByName: 'Carer / Nominee',
          uploadedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
          category: 'assessment',
          clientId: 'cli-001',
          clientName: 'Liam O’Connor',
          metadata: {
            isScannedDoc: true,
            scanCategory: 'clinical',
            providerName: 'Melbourne Children’s Occupational Therapy',
            serviceDate: '2026-09-24',
            budgetLine: 'Capacity Building - Improved Daily Living',
            notes: 'Comprehensive sensory audit recommending tactile scheduling tools and noise dampening headphones.',
            syncedToGoogleKeep: true,
            status: 'Verified'
          }
        }
      ]
    }),
    []
  );

  const currentParticipant = useMemo(() => {
    const found = clients.find((c) => c.id === selectedClientId) || clients[0];
    if (found) {
      // Ensure documents list exists
      if (!found.attachedDocuments || found.attachedDocuments.length === 0) {
        return {
          ...found,
          attachedDocuments: defaultParticipant.attachedDocuments
        };
      }
      return found;
    }
    return defaultParticipant;
  }, [clients, selectedClientId, defaultParticipant]);

  // Modal & Tab states
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [activePortalTab, setActivePortalTab] = useState<'all' | 'budget' | 'agreements' | 'scans' | 'goals'>('all');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<AttachedDocument | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'receipts' | 'clinical' | 'keep'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Participant's documents list
  const documentsList: AttachedDocument[] = useMemo(() => {
    return currentParticipant?.attachedDocuments || [];
  }, [currentParticipant]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documentsList.filter((doc) => {
      const matchSearch =
        searchQuery === '' ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata?.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata?.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'receipts') {
        return doc.metadata?.scanCategory === 'receipt' || doc.metadata?.amount !== undefined;
      }
      if (filterType === 'clinical') {
        return (
          doc.category === 'assessment' ||
          doc.category === 'bsp' ||
          doc.metadata?.scanCategory === 'clinical' ||
          doc.metadata?.scanCategory === 'consent' ||
          doc.metadata?.scanCategory === 'prescription'
        );
      }
      if (filterType === 'keep') {
        return doc.metadata?.syncedToGoogleKeep === true;
      }
      return true;
    });
  }, [documentsList, filterType, searchQuery]);

  // Document metrics
  const receiptDocs = useMemo(
    () => documentsList.filter((d) => d.metadata?.scanCategory === 'receipt' || d.metadata?.amount),
    [documentsList]
  );
  const totalReimbursementAmount = useMemo(() => {
    return receiptDocs.reduce((acc, d) => acc + (d.metadata?.amount || 0), 0);
  }, [receiptDocs]);
  const clinicalDocsCount = useMemo(
    () =>
      documentsList.filter(
        (d) => d.category === 'assessment' || d.metadata?.scanCategory === 'clinical'
      ).length,
    [documentsList]
  );

  const handleDocumentSaved = (newDoc: AttachedDocument) => {
    attachDocumentToClient(currentParticipant.id, newDoc);

    const message = `Document "${newDoc.name}" scanned and saved securely.${
      newDoc.metadata?.syncedToGoogleKeep ? ' Synced to Google Keep notes.' : ''
    }`;
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 5000);

    addNotification({
      title: 'Scanned Document Uploaded',
      message,
      type: 'client',
      severity: 'low'
    });
  };

  const handleDeleteDocument = (docId: string, docName: string) => {
    if (confirm(`Are you sure you want to remove "${docName}" from your participant record?`)) {
      removeDocumentFromClient(currentParticipant.id, docId);
      setSuccessToast(`Removed document "${docName}".`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Participant Banner */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/20 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/20">
              <UserCheck className="w-3.5 h-3.5" /> Participant & Nominee Portal
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> NDIS Verified
            </span>
            {clients.length > 1 && (
              <select
                value={currentParticipant.id}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1 border border-slate-700 focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Switch: {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hello, {currentParticipant?.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>
              NDIS Number: <strong className="text-slate-200 font-mono">{currentParticipant?.ndisNumber}</strong>
            </span>
            <span>•</span>
            <span>
              Active Plan: <strong className="text-teal-300">2025 – 2026 NDIS Budget</strong>
            </span>
            <span>•</span>
            <span>Managed by Breakthrough Allied Health Care Team</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full sm:w-auto">
          {/* Submit Feedback Button */}
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 hover:text-white text-xs font-bold transition-all border border-amber-500/40 shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95 group"
          >
            <div className="p-1 rounded-lg bg-amber-500/30 group-hover:scale-110 transition-transform">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <span>Submit Feedback</span>
          </button>

          {/* Primary CTA: SCAN DOCUMENT */}
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 group"
          >
            <div className="p-1 rounded-lg bg-white/20 group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span>Scan Document & Receipts</span>
          </button>

          <button
            onClick={() => setContactModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-teal-400" />
            <span>Contact Clinician</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-teal-400 hover:text-white p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Remaining Budget</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white">
            ${((currentParticipant.totalBudget || 48500) - (currentParticipant.spentBudget || 12200)).toLocaleString()}
          </p>
          <p className="text-[11px] text-teal-400/90 font-medium">Of ${(currentParticipant.totalBudget || 48500).toLocaleString()} plan</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Expense Receipts</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">${totalReimbursementAmount.toFixed(2)}</p>
          <p className="text-[11px] text-amber-300 font-medium">{receiptDocs.length} claimed receipt(s)</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Read-Only Agreements</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">5</p>
          <p className="text-[11px] text-emerald-400/90 font-medium">Official executed copies</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Scanned Documents</span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white">{documentsList.length}</p>
          <p className="text-[11px] text-teal-400/90 font-medium">{clinicalDocsCount} clinical report(s)</p>
        </div>
      </div>

      {/* Portal Section Navigation Filter */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-950/70 border border-slate-800">
        <button
          onClick={() => setActivePortalTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activePortalTab === 'all'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>All Overview</span>
        </button>
        <button
          onClick={() => setActivePortalTab('budget')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activePortalTab === 'budget'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <PieIcon className="w-3.5 h-3.5 text-teal-400" />
          <span>Plan Budget Tracker</span>
        </button>
        <button
          onClick={() => setActivePortalTab('agreements')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activePortalTab === 'agreements'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Agreements & Support Plans</span>
        </button>
        <button
          onClick={() => setActivePortalTab('scans')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activePortalTab === 'scans'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>Scanned Receipts ({documentsList.length})</span>
        </button>
        <button
          onClick={() => setActivePortalTab('goals')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activePortalTab === 'goals'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-teal-400" />
          <span>Therapy Sessions & Goals</span>
        </button>
      </div>

      {/* SECTION 1: NDIS PLAN UTILIZATION TRACKER */}
      {(activePortalTab === 'all' || activePortalTab === 'budget') && (
        <ParticipantPlanUtilization
          participant={currentParticipant}
          onOpenScanReceipt={() => setIsScanModalOpen(true)}
        />
      )}

      {/* SECTION 2: SECURE FILE LIST FOR SERVICE AGREEMENTS & SUPPORT PLANS */}
      {(activePortalTab === 'all' || activePortalTab === 'agreements') && (
        <ParticipantSecureFileList participant={currentParticipant} />
      )}

      {/* MAIN SECTION: SCANNED RECEIPTS & CLINICAL DOCUMENTS REPOSITORY */}
      {(activePortalTab === 'all' || activePortalTab === 'scans') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-400" /> My Scanned Documents & Receipts
              </h2>
              <p className="text-xs text-slate-400">
                Securely scanned via device camera. Filter by expense receipts, medical reports, or Keep synced items.
              </p>
            </div>

            <button
              onClick={() => setIsScanModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-teal-950/40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Scan New Document
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({documentsList.length})
              </button>
              <button
                onClick={() => setFilterType('receipts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'receipts'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3 h-3 text-amber-400" />
                <span>Receipts ({receiptDocs.length})</span>
              </button>
              <button
                onClick={() => setFilterType('clinical')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'clinical'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3 h-3 text-teal-400" />
                <span>Clinical Reports ({clinicalDocsCount})</span>
              </button>
              <button
                onClick={() => setFilterType('keep')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'keep'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <StickyNote className="w-3 h-3 text-amber-400" />
                <span>Google Keep ({documentsList.filter((d) => d.metadata?.syncedToGoogleKeep).length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents or provider..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">No documents found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No documents matched your search query. Try clearing the filter.'
                    : 'You have not uploaded any documents in this category yet. Use the camera to scan receipts or clinical files.'}
                </p>
              </div>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Scan First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const isReceipt = doc.metadata?.scanCategory === 'receipt' || doc.metadata?.amount !== undefined;
                const formattedDate = doc.metadata?.serviceDate
                  ? new Date(doc.metadata.serviceDate).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  : new Date(doc.uploadedAt || new Date().toISOString()).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-3">
                      {/* Thumbnail & Badges */}
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1554415707-9e44667ebbbf?auto=format&fit=crop&w=800&q=80';
                          }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
                                isReceipt
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                  : 'bg-teal-950/80 text-teal-300 border-teal-500/40'
                              }`}
                            >
                              {isReceipt ? 'Receipt' : 'Clinical Report'}
                            </span>

                            {doc.metadata?.syncedToGoogleKeep && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/80 text-amber-300 border border-amber-500/30 flex items-center gap-1 backdrop-blur-sm"
                                title="Synced with Google Keep Clinical Notes"
                              >
                                <StickyNote className="w-2.5 h-2.5" /> Keep
                              </span>
                            )}
                          </div>

                          {/* Amount or status tag at bottom of image */}
                          <div className="flex items-center justify-between text-white">
                            {isReceipt && doc.metadata?.amount ? (
                              <span className="text-sm font-black text-amber-300">
                                ${doc.metadata.amount.toFixed(2)} AUD
                              </span>
                            ) : (
                              <span className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Encrypted
                              </span>
                            )}
                            <span className="text-[10px] text-slate-300">{formattedDate}</span>
                          </div>
                        </div>

                        {/* Click overlay to view full */}
                        <button
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[2px] transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-teal-300" />
                          <span>Inspect Document</span>
                        </button>
                      </div>

                      {/* Metadata */}
                      <div>
                        <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-teal-300 transition-colors">
                          {doc.name}
                        </h3>
                        {doc.metadata?.providerName && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500" /> {doc.metadata.providerName}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          Budget: {doc.metadata?.budgetLine || 'Core Supports'}
                        </p>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          doc.metadata?.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-teal-500/10 text-teal-400'
                        }`}
                      >
                        {doc.metadata?.status || 'Submitted'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          title="View Document Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={doc.url}
                          download={`${doc.name}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Remove Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Existing Therapy Session & Goals Progress Grid */}
      {(activePortalTab === 'all' || activePortalTab === 'goals') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Next Scheduled Appointment */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Upcoming Therapy Session
              </h2>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 font-bold border border-teal-500/30">
                Confirmed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-2">
              <p className="text-lg font-bold text-white">Community Capacity Building Session</p>
              <p className="text-xs text-slate-300">With Dr. Sarah Jenkins, Behaviour Support Practitioner</p>
              <p className="text-xs text-teal-400 font-mono font-bold">Friday at 10:00 AM — 11:30 AM</p>
              <p className="text-[11px] text-slate-400">
                Location: Participant Residence (
                {typeof currentParticipant?.address === 'string'
                  ? currentParticipant.address
                  : currentParticipant?.address?.suburb || 'Hawthorn, VIC'}
                )
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Clinical contact: sarah.jenkins@breakthrough.org.au</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                >
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>Rate Session</span>
                </button>
                <button
                  onClick={() => setContactModalOpen(true)}
                  className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Message</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Goals Summary */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-400" /> My Goals Progress
              </h2>
              <span className="text-[10px] text-teal-400 font-semibold">2026 NDIS Plan</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white">Emotional Regulation & Sensory Routine</span>
                  <span className="text-teal-400 font-bold">75%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white">Independent Public Transport Navigation</span>
                  <span className="text-teal-400 font-bold">45%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Reviewed monthly by PBS Practitioner</span>
              <button
                onClick={() => setActiveTab('ndis-goals')}
                className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Tracker</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCAN DOCUMENT MODAL */}
      <ParticipantScanDocumentModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        participant={currentParticipant}
        onDocumentSaved={handleDocumentSaved}
      />

      {/* SUBMIT FEEDBACK MODAL */}
      <ParticipantFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        participant={currentParticipant}
        onFeedbackSubmitted={(fb) => {
          setSuccessToast(`Feedback (${fb.overallRating}★) submitted directly to ${fb.practitionerName}. Thank you!`);
          setTimeout(() => setSuccessToast(null), 5000);
        }}
      />

      {/* DOCUMENT DETAIL / LIGHTBOX MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>{selectedDocForPreview.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Attached to {selectedDocForPreview.clientName || currentParticipant.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Document Image Lightbox */}
              <div className="relative aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedDocForPreview.url}
                  alt={selectedDocForPreview.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Metadata details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 font-semibold block">Classification</span>
                  <span className="text-white font-bold capitalize">
                    {selectedDocForPreview.metadata?.scanCategory || selectedDocForPreview.category}
                  </span>
                </div>

                {selectedDocForPreview.metadata?.amount && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Expense Amount</span>
                    <span className="text-amber-300 font-bold text-sm">
                      ${selectedDocForPreview.metadata.amount.toFixed(2)} AUD
                    </span>
                  </div>
                )}

                {selectedDocForPreview.metadata?.providerName && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Provider / Merchant</span>
                    <span className="text-slate-200">{selectedDocForPreview.metadata.providerName}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 font-semibold block">Date</span>
                  <span className="text-slate-200">
                    {selectedDocForPreview.metadata?.serviceDate || selectedDocForPreview.uploadedAt}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-semibold block">NDIS Budget Line</span>
                  <span className="text-slate-200">
                    {selectedDocForPreview.metadata?.budgetLine || 'Core Supports'}
                  </span>
                </div>

                {selectedDocForPreview.metadata?.notes && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-500 font-semibold block mb-1">Context Notes</span>
                    <p className="text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      {selectedDocForPreview.metadata.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Security info */}
              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between text-xs text-teal-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Encrypted via AES-256 • NDIS Commission Governance</span>
                </div>
                {selectedDocForPreview.metadata?.syncedToGoogleKeep && (
                  <span className="flex items-center gap-1 font-bold text-amber-300">
                    <StickyNote className="w-3.5 h-3.5" /> Synced to Keep
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleDeleteDocument(selectedDocForPreview.id, selectedDocForPreview.name);
                  setSelectedDocForPreview(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={selectedDocForPreview.url}
                  download={`${selectedDocForPreview.name}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Scan
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT CLINICIAN MODAL */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Contact Allied Health Clinician</h3>
              </div>
              <button onClick={() => setContactModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <p className="font-bold text-white text-sm">Dr. Sarah Jenkins</p>
                <p className="text-teal-400">Clinical Director & Principal PBS Specialist</p>
                <p className="text-slate-400">Breakthrough Allied Health Services</p>
                <div className="pt-2 flex flex-col gap-1 text-[11px] font-mono text-slate-300">
                  <span>Direct: 1300 002 984</span>
                  <span>Email: sarah.jenkins@breakthrough.org.au</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                For urgent emergencies, dial 000 immediately. For NDIS plan administration and invoice reimbursement inquiries, queries are processed within 24-48 business hours.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setContactModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

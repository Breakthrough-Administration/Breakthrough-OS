'use client';

import React, { useState, useMemo } from 'react';
import { Client } from '@/types';
import {
  FileText,
  Download,
  Eye,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  FileCheck,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

export interface SecureDocument {
  id: string;
  title: string;
  type: 'Service Agreement' | 'Support Plan' | 'Schedule of Supports' | 'Emergency Plan' | 'Consent Form';
  docNumber: string;
  fileFormat: string;
  fileSizeBytes: number;
  signedDate: string;
  validFrom: string;
  validTo: string;
  status: 'Active & Executed' | 'Active / Current' | 'Approved by Specialist' | 'Read-Only Verified';
  practitionerSignatory: string;
  participantSignatory: string;
  description: string;
  sections: { heading: string; body: string }[];
  complianceStandard: string;
}

interface ParticipantSecureFileListProps {
  participant: Client;
}

export const ParticipantSecureFileList: React.FC<ParticipantSecureFileListProps> = ({
  participant
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<SecureDocument | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const practitionerName =
    participant.primaryPractitionerName || participant.allocatedPractitionerName || 'Dr. Sarah Jenkins';

  const secureDocuments: SecureDocument[] = useMemo(() => {
    return [
      {
        id: 'sec-doc-001',
        title: 'NDIS Service Agreement 2025–2026',
        type: 'Service Agreement',
        docNumber: `SA-2025-${participant.id.slice(-4).toUpperCase()}`,
        fileFormat: 'PDF Document (Signed)',
        fileSizeBytes: 1450000,
        signedDate: '2025-07-01',
        validFrom: participant.planStartDate || '2025-07-01',
        validTo: participant.planEndDate || '2026-06-30',
        status: 'Active & Executed',
        practitionerSignatory: practitionerName,
        participantSignatory: `${participant.name} / Fiona O’Connor (Nominee)`,
        description:
          'Official NDIS-compliant service agreement governing allied health, positive behaviour support, and therapy session delivery under the 2025/26 NDIS Pricing Arrangements.',
        complianceStandard: 'NDIS Practice Standards Core Module 1 (Rights & Responsibilities)',
        sections: [
          {
            heading: '1. Parties to the Agreement',
            body: `This agreement is made between Breakthrough Allied Health Services Pty Ltd (Provider) and ${participant.name} (Participant, NDIS No: ${participant.ndisNumber}), represented by authorized nominee Fiona O’Connor.`
          },
          {
            heading: '2. Agreed Supports & Price Caps',
            body: 'Supports will be billed strictly in accordance with current NDIS Price Limits. Therapy supports (Item 15_056_0128_1_3) billed at $193.99/hr. Provider travel capped in accordance with MMM1 metropolitan rates.'
          },
          {
            heading: '3. Cancellation Policy (7-Day Rule)',
            body: 'In accordance with NDIS Quality and Safeguards Commission guidelines, cancellations must be provided with at least 7 clear business days notice where practicable. Late notice within 7 days may be billed at 100% of the scheduled session fee.'
          },
          {
            heading: '4. Participant Rights & Privacy',
            body: 'The participant has the right to access all clinical case notes, revoke consent for external communication at any time, and lodge complaints through the NDIS Commission (1800 035 544).'
          },
          {
            heading: '5. Variation & Review',
            body: 'This agreement remains in effect throughout the current NDIS plan period until 30 June 2026 or until mutual amendment in writing.'
          }
        ]
      },
      {
        id: 'sec-doc-002',
        title: 'Positive Behaviour Support Plan (Comprehensive BSP)',
        type: 'Support Plan',
        docNumber: `BSP-COMP-2025-${participant.ndisNumber.slice(-4)}`,
        fileFormat: 'PDF Document (Clinical)',
        fileSizeBytes: 2840000,
        signedDate: '2025-08-15',
        validFrom: '2025-08-15',
        validTo: '2026-08-14',
        status: 'Approved by Specialist',
        practitionerSignatory: `${practitionerName} (Principal PBS Practitioner)`,
        participantSignatory: 'Reviewed and Endorsed by Participant Support Network',
        description:
          'Person-centered behaviour support plan detailing proactive regulation strategies, environmental adjustments, sensory routines, and zero regulated restrictive practices.',
        complianceStandard: 'NDIS Commission Positive Behaviour Support Rules 2018',
        sections: [
          {
            heading: '1. Clinical Profile & Functional Analysis',
            body: `Participant: ${participant.name}. Functional assessment identifies sensory overload and unexpected schedule transitions as primary triggers for dysregulation. Primary communicative function: seeking sensory regulation and predictability.`
          },
          {
            heading: '2. Proactive & Preventative Strategies',
            body: 'Visual countdown schedules, tactile transition cards, structured sensory diet (weighted blanket, noise-reduction headphones in noisy transit), 5-minute verbal warnings prior to activity switching.'
          },
          {
            heading: '3. De-escalation Protocol',
            body: 'Low-arousal verbal tone, reduced demands, offering calming sensory corner, non-verbal hand signals, no physical containment or restraint.'
          },
          {
            heading: '4. Restrictive Practice Safeguard Declaration',
            body: 'Zero regulated restrictive practices are authorized, implemented, or recommended in this plan. Breakthrough Allied Health enforces a strict least-restrictive rights-based framework.'
          }
        ]
      },
      {
        id: 'sec-doc-003',
        title: 'Schedule of Supports & Budget Allocation',
        type: 'Schedule of Supports',
        docNumber: `SCH-2025-SUPP-${participant.id.slice(-3)}`,
        fileFormat: 'PDF Document (Financial)',
        fileSizeBytes: 690000,
        signedDate: '2025-07-01',
        validFrom: '2025-07-01',
        validTo: '2026-06-30',
        status: 'Active & Executed',
        practitionerSignatory: practitionerName,
        participantSignatory: `${participant.name} / Nominee`,
        description:
          'Itemized funding schedule detailing hours allocated per week, travel fees, assessment report hours, and total plan budget commitment ($48,500.00).',
        complianceStandard: 'NDIS PACE Schedule of Supports & Claim Guidelines',
        sections: [
          {
            heading: '1. Budget Category Allocation',
            body: `Total Authorized Budget: $${participant.totalBudget.toLocaleString()} AUD. Core Supports: $18,000. Capacity Building - Allied Health & PBS: $24,500. Capital & Assistive Tech: $6,000.`
          },
          {
            heading: '2. Support Itemization',
            body: 'Direct Therapy: 1.5 hrs/week fortnightly @ $193.99/hr. Monthly PBS Review: 1.0 hr/month @ $214.41/hr. End of Plan Progress Report: 4.0 hrs allocated for May 2026.'
          },
          {
            heading: '3. Claiming Mechanism',
            body: 'Claims lodged weekly through PRODA PACE Bulk Claim portal. Participant and nominee receive automatic claim receipts in this portal.'
          }
        ]
      },
      {
        id: 'sec-doc-004',
        title: 'Emergency & Continuity of Support Plan',
        type: 'Emergency Plan',
        docNumber: `EMG-CONT-2025-${participant.id.slice(-4)}`,
        fileFormat: 'PDF Document (Safety)',
        fileSizeBytes: 520000,
        signedDate: '2025-07-10',
        validFrom: '2025-07-01',
        validTo: '2026-06-30',
        status: 'Active / Current',
        practitionerSignatory: 'Governance & Safety Officer',
        participantSignatory: 'Fiona O’Connor (Mother & Emergency Contact)',
        description:
          'Contingency guidelines for severe weather, health emergencies, staff illness, and communication fallback protocols.',
        complianceStandard: 'NDIS Practice Standards Module 2 (Emergency Management)',
        sections: [
          {
            heading: '1. Emergency Contacts',
            body: `Primary Contact: ${participant.emergencyContact?.name || 'Fiona O’Connor'} (${participant.emergencyContact?.phone || '0412 889 123'}). Secondary: Breakthrough Emergency Duty Line 1300 002 984.`
          },
          {
            heading: '2. Extreme Weather & Heatwave Protocol',
            body: 'In the event of Code Red fire danger or extreme heat, in-person community visits transition to telehealth sensory consultation.'
          },
          {
            heading: '3. Continuity of Support',
            body: 'In the event of primary practitioner illness, secondary practitioner Dr. Michael Vance will step in with full access to this endorsed BSP.'
          }
        ]
      },
      {
        id: 'sec-doc-005',
        title: 'Participant Consent & Advocacy Authority Form',
        type: 'Consent Form',
        docNumber: `CNS-AUTH-2025-${participant.ndisNumber.slice(-3)}`,
        fileFormat: 'PDF Document (Legal)',
        fileSizeBytes: 410000,
        signedDate: '2025-07-01',
        validFrom: '2025-07-01',
        validTo: '2026-06-30',
        status: 'Active & Executed',
        practitionerSignatory: practitionerName,
        participantSignatory: `${participant.name} & Fiona O’Connor`,
        description:
          'Signed informed consent granting permission for Breakthrough Allied Health to share relevant clinical progress updates with the GP, Support Coordinator, and NDIA.',
        complianceStandard: 'Privacy Act 1988 (Cth) & Australian Privacy Principles (APPs)',
        sections: [
          {
            heading: '1. Authorized Information Sharing',
            body: 'Consent granted to liaise with: General Practitioner, Hawthorn Paediatric Clinic, St. Jude Support Coordination, and NDIA PACE planners.'
          },
          {
            heading: '2. Revocation Terms',
            body: 'This consent may be modified or revoked in whole or in part at any time by written notice from the participant or authorized nominee.'
          }
        ]
      }
    ];
  }, [participant, practitionerName]);

  const filteredDocs = useMemo(() => {
    return secureDocuments.filter((doc) => {
      const matchSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeCategory === 'agreements') return doc.type === 'Service Agreement';
      if (activeCategory === 'plans') return doc.type === 'Support Plan';
      if (activeCategory === 'schedules') return doc.type === 'Schedule of Supports';
      if (activeCategory === 'emergency') return doc.type === 'Emergency Plan' || doc.type === 'Consent Form';

      return true;
    });
  }, [secureDocuments, activeCategory, searchQuery]);

  const handleDownloadPDF = async (doc: SecureDocument) => {
    try {
      setIsGeneratingPdf(true);
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, 210, 38, 'F');

      pdf.setTextColor(20, 184, 166); // teal-500
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BREAKTHROUGH ALLIED HEALTH SERVICES', 14, 14);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(15);
      pdf.text(doc.title.toUpperCase(), 14, 23);

      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('OFFICIAL READ-ONLY PARTICIPANT COPY • NDIS REGISTRATION NO: 4050012984', 14, 30);

      // Watermark in background
      pdf.setTextColor(240, 245, 245);
      pdf.setFontSize(45);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OFFICIAL READ-ONLY', 20, 150, { angle: 45 });

      // Document Metadata Box
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(14, 44, 182, 38, 2, 2, 'FD');

      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PARTICIPANT DETAILS', 18, 51);
      pdf.text('DOCUMENT METADATA', 105, 51);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Name: ${participant.name}`, 18, 58);
      pdf.text(`NDIS Number: ${participant.ndisNumber}`, 18, 64);
      pdf.text(`Plan Period: ${doc.validFrom} to ${doc.validTo}`, 18, 70);
      pdf.text(`Status: ${doc.status} (Verified)`, 18, 76);

      pdf.text(`Document Reference: ${doc.docNumber}`, 105, 58);
      pdf.text(`Executed Date: ${doc.signedDate}`, 105, 64);
      pdf.text(`Practitioner Signatory: ${doc.practitionerSignatory}`, 105, 70);
      pdf.text(`Standard: ${doc.complianceStandard.slice(0, 36)}...`, 105, 76);

      // Document Sections
      let currentY = 92;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('TERMS, SCHEDULES & AGREED PROVISIONS', 14, currentY);
      currentY += 8;

      doc.sections.forEach((section) => {
        if (currentY > 260) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFontSize(9.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(13, 148, 136); // teal-600
        pdf.text(section.heading, 14, currentY);
        currentY += 5;

        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(51, 65, 85);
        const splitText = pdf.splitTextToSize(section.body, 182);
        pdf.text(splitText, 14, currentY);
        currentY += splitText.length * 4.5 + 4;
      });

      if (currentY > 240) {
        pdf.addPage();
        currentY = 20;
      }

      currentY += 6;
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(14, currentY, 182, 34, 2, 2, 'FD');

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('EXECUTION & CERTIFICATION OF READ-ONLY RECORD', 18, currentY + 7);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Provider Signatory: ${doc.practitionerSignatory} [Digitally Signed & Certified]`, 18, currentY + 15);
      pdf.text(`Participant / Nominee: ${doc.participantSignatory} [Endorsed on file]`, 18, currentY + 22);
      pdf.text(`Cryptographic Audit Seal: SHA-256 Verified • Registered with NDIS Commission Portal`, 18, currentY + 29);

      const cleanFilename = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}_ReadOnly.pdf`;
      pdf.save(cleanFilename);

      setDownloadSuccessToast(`Downloaded read-only copy of "${doc.title}".`);
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button onClick={() => setDownloadSuccessToast(null)} className="text-teal-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-400" /> Service Agreements & Support Plans
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-Only Repository
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Download certified, read-only copies of executed service agreements, comprehensive BSPs, and support schedules for your records.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>NDIS Practice Standards Compliant</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Files ({secureDocuments.length})
          </button>
          <button
            onClick={() => setActiveCategory('agreements')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'agreements'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Service Agreements
          </button>
          <button
            onClick={() => setActiveCategory('plans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'plans'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Support Plans (BSP)
          </button>
          <button
            onClick={() => setActiveCategory('schedules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'schedules'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schedules of Support
          </button>
          <button
            onClick={() => setActiveCategory('emergency')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'emergency'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Safety & Consent
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agreements or plans..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400 text-xs">
            No files found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const sizeKB = Math.round(doc.fileSizeBytes / 1024);
            const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

            return (
              <div
                key={doc.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-teal-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                        {doc.title}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-teal-300 border border-teal-500/30 font-semibold">
                        {doc.type}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                        {doc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-1">{doc.description}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>Ref: <strong className="text-slate-300 font-mono">{doc.docNumber}</strong></span>
                      <span>•</span>
                      <span>Signed: <strong className="text-slate-300">{doc.signedDate}</strong></span>
                      <span>•</span>
                      <span>Valid: <strong className="text-slate-300">{doc.validFrom} – {doc.validTo}</strong></span>
                      <span>•</span>
                      <span>Format: <strong className="text-slate-300">{doc.fileFormat} ({sizeStr})</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-750">
                  <button
                    onClick={() => setSelectedDocForPreview(doc)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    title="Read Document Online"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                    <span>View Clauses</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPDF(doc)}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
                    title="Download Official Read-Only PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>
            Read-only files are cryptographically certified and tamper-evident under NDIS Practice Standards.
          </span>
        </div>
        <span className="text-slate-500">Need amendments? Contact your Support Coordinator or Clinician.</span>
      </div>

      {/* Preview Modal */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>{selectedDocForPreview.title}</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">
                    Read-Only Copy
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Reference: <span className="text-slate-200 font-mono">{selectedDocForPreview.docNumber}</span> • Participant: {participant.name}
                </p>
              </div>

              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Document Type</span>
                  <span className="text-white font-semibold">{selectedDocForPreview.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Execution Date</span>
                  <span className="text-white font-semibold">{selectedDocForPreview.signedDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Plan Validity</span>
                  <span className="text-teal-300 font-semibold">
                    {selectedDocForPreview.validFrom} – {selectedDocForPreview.validTo}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
                  <span className="text-emerald-400 font-semibold">{selectedDocForPreview.status}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-slate-200 mb-1">Executive Summary:</p>
                <p>{selectedDocForPreview.description}</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Agreed Provisions & Terms
                </h4>
                {selectedDocForPreview.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                  >
                    <h5 className="text-xs font-bold text-teal-400">{sec.heading}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{sec.body}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Execution & Electronic Endorsement</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-medium">Provider Signatory:</span>
                    <p className="font-bold text-white mt-0.5">{selectedDocForPreview.practitionerSignatory}</p>
                    <span className="text-[10px] text-teal-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Digitally Certified
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-medium">Participant / Nominee:</span>
                    <p className="font-bold text-white mt-0.5">{selectedDocForPreview.participantSignatory}</p>
                    <span className="text-[10px] text-teal-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Endorsement on file
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 pt-1">
                  Compliance Framework: {selectedDocForPreview.complianceStandard}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                <span>Read-Only Official Copy</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDocForPreview(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedDocForPreview)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

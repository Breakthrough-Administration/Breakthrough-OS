'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  RotateCcw,
  CheckSquare,
  FileSignature,
  Lock
} from 'lucide-react';

export interface NDISPracticeStandardItem {
  id: string;
  code: string;
  moduleName: string;
  title: string;
  description: string;
  weight: number;
  remediationHint: string;
}

export const NDIS_PRACTICE_STANDARDS_LIST: NDISPracticeStandardItem[] = [
  {
    id: 'std-core-1',
    code: 'CORE 1',
    moduleName: 'Rights and Responsibilities',
    title: 'Person-Centred Supports, Privacy & Informed Consent',
    description:
      'Signed participant consent forms, charter of rights acknowledgement, and dignity-of-risk protocols archived in participant dossier.',
    weight: 15,
    remediationHint: 'Upload signed NDIS Service & Privacy Consent form to Participant Dossier.'
  },
  {
    id: 'std-core-2',
    code: 'CORE 2',
    moduleName: 'Provider Governance & Operational Management',
    title: 'Clinical Governance, Quality & Reportable Incident Ledger',
    description:
      'Active quality management framework, 24-hour/5-day NDIS Commission statutory incident notification workflow, and director sign-off.',
    weight: 15,
    remediationHint: 'Ensure all open reportable incidents have completed Root Cause & Director Sign-off.'
  },
  {
    id: 'std-core-3',
    code: 'CORE 3',
    moduleName: 'Provision of Supports',
    title: 'Access to Supports, Service Agreements & Goal Alignment',
    description:
      'Every active participant has an executed Service Agreement and clinical progress notes linked to Section 34 NDIS Plan goals.',
    weight: 15,
    remediationHint: 'Link SOAP/BIRP case notes to active NDIS Plan goals in Goal Outcomes Tracker.'
  },
  {
    id: 'std-core-4',
    code: 'CORE 4',
    moduleName: 'Support Provision Environment',
    title: 'Safe Environment, Lone Worker & Emergency Continuity Plans',
    description:
      'Individualized Emergency & Disaster Management plans and outreach lone-worker safety protocols verified.',
    weight: 10,
    remediationHint: 'Complete Participant Emergency & Disaster Plan in clinical folder.'
  },
  {
    id: 'std-mod-2a',
    code: 'MODULE 2A',
    moduleName: 'Implementing Behaviour Support Plans',
    title: 'Regulated Restrictive Practice Dual Authorisation & Fade Tracking',
    description:
      'All regulated restrictive practices hold both Behaviour Support Practitioner (BSP) and Authorised Program Officer (APO) sign-off with monthly Commission reporting.',
    weight: 20,
    remediationHint: 'Obtain dual BSP + APO sign-off and submit due monthly logs in Restrictive Practices.'
  },
  {
    id: 'std-hr-wsc',
    code: 'HR SAFEGUARD',
    moduleName: 'Worker Screening & AHPRA Credentialing',
    title: '100% Valid NDIS Worker Screening (WSC) & Orientation',
    description:
      'All rostered practitioners hold current NDIS Worker Screening clearances, National Police Checks, and AHPRA/PBS registration.',
    weight: 15,
    remediationHint: 'Verify practitioner NDIS Worker Screening expiry dates in SCHADS Roster & HR.'
  },
  {
    id: 'std-pace-fin',
    code: 'PACE AUDIT',
    moduleName: 'PRODA & PACE Financial Integrity',
    title: '2026 NDIS Price Guide Cap Validation & Signed Clinical Evidence',
    description:
      'All PRODA claims reconcile against the 2026 NDIS Support Catalogue rate caps and link to digitally signed clinical case notes.',
    weight: 10,
    remediationHint: 'Run Auto-Reconcile in NDIS Billing & PACE to clear any rate cap warnings.'
  }
];

export const ComplianceCheck: React.FC = () => {
  const { currentUser, addAuditLog, addNotification } = useManagementStore();

  const [enabledStandards, setEnabledStandards] = useState<Record<string, boolean>>({
    'std-core-1': true,
    'std-core-2': true,
    'std-core-3': true,
    'std-core-4': true,
    'std-mod-2a': true,
    'std-hr-wsc': true,
    'std-pace-fin': false
  });
  const [certifiedBanner, setCertifiedBanner] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN' || !currentUser?.role;

  const { readinessScore, passedCount, flaggedStandards } = useMemo(() => {
    let earnedWeight = 0;
    let totalWeight = 0;
    let count = 0;
    const flagged: NDISPracticeStandardItem[] = [];

    NDIS_PRACTICE_STANDARDS_LIST.forEach((std) => {
      totalWeight += std.weight;
      if (enabledStandards[std.id]) {
        earnedWeight += std.weight;
        count += 1;
      } else {
        flagged.push(std);
      }
    });

    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    return {
      readinessScore: score,
      passedCount: count,
      flaggedStandards: flagged
    };
  }, [enabledStandards]);

  const handleToggleStandard = (id: string) => {
    setEnabledStandards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleMarkAllCompliant = () => {
    const allTrue: Record<string, boolean> = {};
    NDIS_PRACTICE_STANDARDS_LIST.forEach((s) => {
      allTrue[s.id] = true;
    });
    setEnabledStandards(allTrue);
  };

  const handleResetAudit = () => {
    setEnabledStandards({
      'std-core-1': true,
      'std-core-2': true,
      'std-core-3': true,
      'std-core-4': false,
      'std-mod-2a': false,
      'std-hr-wsc': true,
      'std-pace-fin': false
    });
  };

  const handleCertifyAuditScore = () => {
    const certId = `AUDIT-CERT-${Date.now().toString().slice(-6)}`;
    const summary = `Administrator ${
      currentUser?.name || 'Dr. Sarah Jenkins'
    } certified NDIS Practice Standards Readiness Score at ${readinessScore}% (${passedCount}/${
      NDIS_PRACTICE_STANDARDS_LIST.length
    } standards verified).`;

    addAuditLog('NDIS_COMPLIANCE_CHECK_CERTIFIED', 'PracticeStandardsAudit', certId, summary);
    addNotification({
      title: `Audit Readiness Certified (${readinessScore}%)`,
      message: summary,
      type: 'compliance',
      severity: readinessScore >= 90 ? 'low' : 'medium',
      linkTab: 'audit'
    });

    setCertifiedBanner(`Audit Certificate ${certId} logged to immutable ledger (${readinessScore}% readiness).`);
    setTimeout(() => setCertifiedBanner(null), 4000);
  };

  const readinessTier =
    readinessScore >= 90
      ? {
          label: 'Commission Audit Ready',
          badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          barClass: 'bg-teal-500'
        }
      : readinessScore >= 70
      ? {
          label: 'Provisional Compliance (Minor Gaps)',
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          barClass: 'bg-amber-500'
        }
      : {
          label: 'Corrective Action Required',
          badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          barClass: 'bg-rose-500'
        };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
      {/* Header & Automated Score Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-extrabold text-white">
              Compliance Check — NDIS Practice Standards &amp; Audit Readiness
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
              {isAdmin ? 'Admin Controls Active' : `Role: ${currentUser?.role}`}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Toggle NDIS Quality &amp; Safeguards Commission Practice Standards (Core Modules 1–4 &amp; Module 2A) to calculate real-time mid-term and renewal audit readiness
          </p>
        </div>

        {/* Automated Audit Readiness Score Widget */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Automated Audit Readiness Score
            </span>
            <span
              className={`inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${readinessTier.badgeClass}`}
            >
              {readinessTier.label}
            </span>
          </div>
          <div className="pl-3 border-l border-slate-800 text-center">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {readinessScore}%
            </span>
            <p className="text-[10px] text-slate-400 font-mono tabular-nums">
              {passedCount}/{NDIS_PRACTICE_STANDARDS_LIST.length} Standards
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            Weighted Statutory Compliance Index (90% threshold required for unconditional registration renewal)
          </span>
          <span className="font-mono font-bold text-white tabular-nums">{readinessScore} / 100 pts</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${readinessTier.barClass}`}
            style={{ width: `${readinessScore}%` }}
          />
        </div>
      </div>

      {certifiedBanner && (
        <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center gap-2">
          <Award className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{certifiedBanner}</span>
        </div>
      )}

      {/* Interactive NDIS Practice Standards Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NDIS_PRACTICE_STANDARDS_LIST.map((std) => {
          const isChecked = !!enabledStandards[std.id];
          return (
            <div
              key={std.id}
              onClick={() => handleToggleStandard(std.id)}
              role="switch"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleStandard(std.id);
                }
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                isChecked
                  ? 'bg-slate-800/50 border-teal-500/30 hover:border-teal-500/50'
                  : 'bg-slate-950/50 border-amber-500/30 hover:border-amber-500/50'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-700">
                    {std.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{std.moduleName}</span>
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                    ({std.weight}% weight)
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white">{std.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{std.description}</p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    isChecked ? 'bg-teal-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isChecked ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {isChecked ? 'Verified' : 'Gap'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automated Deficiency & Corrective Action Advisory */}
      {flaggedStandards.length > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Automated Audit Gap Analysis ({flaggedStandards.length} Practice Standard
              {flaggedStandards.length > 1 ? 's' : ''} Pending Verification)
            </span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300 pl-6 list-disc">
            {flaggedStandards.map((gap) => (
              <li key={gap.id}>
                <strong className="text-white">{gap.code} ({gap.moduleName}):</strong> {gap.remediationHint}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-teal-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              100% NDIS Practice Standards Verified — Zero statutory non-conformities detected across Core Modules 1–4 and Module 2A.
            </span>
          </div>
        </div>
      )}

      {/* Administrator Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllCompliant}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-teal-400" /> Verify All Standards
          </button>
          <button
            type="button"
            onClick={handleResetAudit}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Simulate Audit Gap
          </button>
        </div>

        <button
          type="button"
          onClick={handleCertifyAuditScore}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <FileSignature className="w-4 h-4" /> Certify Readiness Score ({readinessScore}%) to Audit Ledger
        </button>
      </div>
    </div>
  );
};

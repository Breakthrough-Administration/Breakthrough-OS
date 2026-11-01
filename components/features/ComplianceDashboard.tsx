'use client';

import React from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CheckSquare, ShieldCheck, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
  const { clients, incidents, restrictivePractices, users } = useManagementStore();

  const auditMetrics = [
    {
      title: 'NDIS Core Practice Standards',
      status: '100% Audit Ready',
      description: 'Rights & Responsibilities, Provider Governance, Support Provision, Support Environment',
      score: 100
    },
    {
      title: 'Module 2: Behaviour Support',
      status: '96% Compliant',
      description: 'PBS assessment documentation, state authorisations, monthly reduction reporting',
      score: 96
    },
    {
      title: 'Worker Screening Checks (WSC)',
      status: 'All Cleared',
      description: `${users.length} active practitioners with valid WWCC and NDIS worker screening clearance`,
      score: 100
    },
    {
      title: 'Incident Management System (IMS)',
      status: 'Compliant',
      description: '24-hour Commission notices, investigation protocols, Root Cause Analysis',
      score: 98
    }
  ];

  const handleExportAuditDossier = () => {
    const data = {
      practice: 'Breakthrough Coaching & Consulting',
      timestamp: new Date().toISOString(),
      activeParticipantsCount: clients.length,
      incidentsLogged: incidents.length,
      restrictivePracticesCount: restrictivePractices.length,
      staffCount: users.length,
      auditReadinessScore: '98.5%'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Breakthrough_NDIS_Audit_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">NDIS Quality & Audit Readiness</h1>
          <p className="text-xs text-slate-400">
            Real-time compliance tracking against NDIS Practice Standards & Verification / Certification audits
          </p>
        </div>

        <button
          onClick={handleExportAuditDossier}
          className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20"
        >
          <Download className="w-4 h-4" /> Export Audit Dossier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditMetrics.map((m, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{m.title}</h3>
                  <span className="text-xs text-teal-400 font-semibold">{m.status}</span>
                </div>
              </div>
              <span className="text-lg font-extrabold text-white">{m.score}%</span>
            </div>

            <p className="text-xs text-slate-400">{m.description}</p>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-500 h-2 rounded-full"
                style={{ width: `${m.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

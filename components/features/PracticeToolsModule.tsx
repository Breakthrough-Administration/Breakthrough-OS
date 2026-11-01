'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CheckCircle2, Calculator, Save, Users, FileCheck } from 'lucide-react';
import { ComplianceCheck } from './ComplianceCheck';

export { ComplianceCheck };

const WHODAS_ITEMS = [
  '1. Standing for long periods such as 30 minutes',
  '2. Taking care of household responsibilities',
  '3. Learning a new task (e.g., learning how to get to a new place)',
  '4. Joining in community activities in the same way as anyone else',
  '5. Emotionally affected by health / disability barriers',
  '6. Concentrating on doing something for ten minutes',
  '7. Walking a long distance such as a kilometre',
  '8. Washing your whole body independently',
  '9. Getting dressed independently',
  '10. Dealing with people you do not know',
  '11. Maintaining a friendship and social reciprocity',
  '12. Carrying out day-to-day work or school activities'
];

export const PracticeToolsModule: React.FC = () => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    currentUser,
    addCaseNote,
    attachDocumentToClient,
    addNotification
  } = useManagementStore();

  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // WHODAS 2.0 12-item screener
  const [whodasScores, setWhodasScores] = useState<number[]>([2, 2, 3, 3, 2, 3, 1, 1, 1, 3, 2, 3]);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Section 34 Checklist
  const [s34Checks, setS34Checks] = useState<Record<string, boolean>>({
    goals: true,
    socialEconomic: true,
    valueForMoney: true,
    effectiveAndBeneficial: true,
    familyExpectations: true,
    mostAppropriateNdis: true
  });

  const totalWhodas = whodasScores.reduce((a, b) => a + b, 0);
  const whodasPercentage = Math.round((totalWhodas / 48) * 100);

  const toggleS34 = (key: string) => {
    setS34Checks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isS34Compliant = Object.values(s34Checks).every(Boolean);

  const handleSaveAssessmentToRecord = () => {
    const clientName = activeClient?.name || 'Participant';
    const clientId = activeClient?.id || 'cli-001';
    const today = new Date().toISOString().split('T')[0];

    addCaseNote({
      clientId,
      clientName,
      format: 'SOAP',
      category: 'WHODAS 2.0 & Section 34 Assessment',
      date: today,
      sessionDurationMinutes: 60,
      nonFaceToFaceMinutes: 30,
      subjective: `Administered WHODAS 2.0 12-item functional impairment index and NDIS Act Section 34 Reasonable & Necessary compliance audit for ${clientName}.`,
      objective: `WHODAS 2.0 Composite Score: ${totalWhodas}/48 (${whodasPercentage}% functional impairment). Section 34 Criteria Status: ${
        isS34Compliant ? '6/6 Criteria Met (Audit Ready)' : 'Criteria Gap Flagged'
      }.`,
      assessment: `Functional impairment index of ${whodasPercentage}% provides clinical evidence for ongoing Capacity Building Improved Daily Living (15_056_0128_1_3) and Improved Relationships (15_054_0128_1_3) funding.`,
      plan: 'Attach signed functional assessment report to NDIS Plan Review dossier.',
      practitionerName: currentUser?.name || 'Dr. Sarah Jenkins',
      supportItemCode: '15_056_0128_1_3'
    });

    if (activeClient?.id) {
      attachDocumentToClient(activeClient.id, {
        id: `doc-whodas-${Date.now()}`,
        name: `WHODAS_2.0_Functional_Assessment_${clientName.replace(/\s+/g, '_')}_${today}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 124800,
        uploadedBy: currentUser?.id || 'prac-201',
        url: `https://drive.google.com/file/d/whodas-${Date.now()}/view`,
        category: 'Clinical Report',
        uploadedAt: new Date().toISOString()
      });
    }

    const msg = `Saved WHODAS 2.0 (${whodasPercentage}% impairment) & Section 34 Audit to ${clientName}'s clinical case notes and dossier.`;
    setSavedBanner(msg);
    addNotification({
      title: 'Clinical Assessment Saved',
      message: msg,
      type: 'clinical',
      severity: 'low',
      linkTab: 'case-notes'
    });
    setTimeout(() => setSavedBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Clinical Assessment &amp; Diagnostic Tools</h1>
          <p className="text-xs text-slate-400">
            Validated assessment scales, WHODAS 2.0 functional impairment index, Section 34 NDIS compliance evaluators, and Practice Standards Audit Readiness
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clients.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={activeClient?.id || ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSaveAssessmentToRecord}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Assessment to Participant Record
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Administrator NDIS Practice Standards Compliance Check Component */}
      <ComplianceCheck />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool 1: WHODAS 2.0 12-Item Screener */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-400" /> WHODAS 2.0 (12-Item) Functional Score
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 font-bold font-mono tabular-nums">
              Impairment: {whodasPercentage}%
            </span>
          </div>

          <p className="text-xs text-slate-400">
            World Health Organization 12-item clinical screener measuring functional difficulty across cognition, mobility, self-care, getting along, life activities, and participation.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {WHODAS_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 gap-2"
              >
                <span className="text-slate-200 truncate">{item}</span>
                <select
                  value={whodasScores[idx]}
                  onChange={(e) => {
                    const next = [...whodasScores];
                    next[idx] = Number(e.target.value);
                    setWhodasScores(next);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] font-mono shrink-0 cursor-pointer"
                >
                  <option value={0}>0 - None</option>
                  <option value={1}>1 - Mild</option>
                  <option value={2}>2 - Moderate</option>
                  <option value={3}>3 - Severe</option>
                  <option value={4}>4 - Extreme</option>
                </select>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center justify-between">
            <span>
              Total Raw Score:{' '}
              <strong className="text-white font-mono tabular-nums">{totalWhodas} / 48</strong>
            </span>
            <span className="font-mono text-[11px] text-teal-400">
              {whodasPercentage >= 50 ? 'High Functional Support Need' : 'Moderate Functional Support Need'}
            </span>
          </div>
        </div>

        {/* Tool 2: NDIS Act 2013 Section 34 Criteria Audit */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" /> Section 34 Reasonable &amp; Necessary Audit
              </h2>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  isS34Compliant ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {isS34Compliant ? 'NDIS Audit Ready' : 'Criteria Gap'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Mandatory legislative criteria under Section 34 of the National Disability Insurance Scheme Act 2013 for justifying allied health and behaviour support hours.
            </p>

            <div className="space-y-2">
              {[
                { id: 'goals', label: 's34(1)(a) Assists the participant to pursue goals, objectives, and aspirations' },
                { id: 'socialEconomic', label: 's34(1)(b) Facilitates social, economic, and community participation' },
                { id: 'valueForMoney', label: 's34(1)(c) Represents value for money relative to benefits achieved' },
                { id: 'effectiveAndBeneficial', label: 's34(1)(d) Effective and beneficial for the participant (evidence-based PBS)' },
                { id: 'familyExpectations', label: 's34(1)(e) Takes into account reasonable expectations of informal carers & family' },
                { id: 'mostAppropriateNdis', label: 's34(1)(f) Most appropriately funded by the NDIS rather than Medicare/health system' }
              ].map((rule) => (
                <label
                  key={rule.id}
                  onClick={() => toggleS34(rule.id)}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/70 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={s34Checks[rule.id]}
                    readOnly
                    className="mt-0.5 rounded text-teal-500 focus:ring-0"
                  />
                  <span>{rule.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            Click <strong>Save Assessment to Participant Record</strong> above to log this WHODAS 2.0 score and Section 34 audit directly into {activeClient?.name || 'the participant'}&apos;s signed case notes and dossier.
          </div>
        </div>
      </div>
    </div>
  );
};

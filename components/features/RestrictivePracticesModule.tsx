'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { RestrictivePractice } from '@/types';
import {
  ShieldAlert,
  Plus,
  CheckCircle2,
  Clock,
  X,
  FileSignature,
  UserCheck,
  Database,
  TrendingDown
} from 'lucide-react';

export const RestrictivePracticesModule: React.FC = () => {
  const {
    restrictivePractices,
    clients,
    addRestrictivePractice,
    updateRestrictivePractice,
    currentUser,
    loadDemoData
  } = useManagementStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [fadeProgress, setFadeProgress] = useState<Record<string, number>>({
    'rp-101': 65,
    'rp-102': 35
  });

  const [formData, setFormData] = useState<Partial<RestrictivePractice>>({
    clientId: clients[0]?.id || 'cli-001',
    clientName: clients[0]?.name || '',
    type: 'Environmental',
    description: '',
    authorizedBy: 'State Authorisation Authority / VCAT',
    authorizationDate: new Date().toISOString().split('T')[0],
    expiryDate: '2026-12-31',
    status: 'Proposed',
    monthlyReportStatus: 'Due',
    reductionStrategy: '',
    bspSignOff: { signed: false },
    apoSignOff: { signed: false }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formData.clientId);
    addRestrictivePractice({
      ...formData,
      clientName: client?.name || formData.clientName || 'Participant',
      status: 'Proposed',
      bspSignOff: { signed: false },
      apoSignOff: { signed: false }
    });
    setIsAddOpen(false);
    setSuccessBanner('New regulated practice created. Pending BSP and APO sign-off pipeline.');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const markReportSubmitted = (id: string) => {
    updateRestrictivePractice(id, { monthlyReportStatus: 'Submitted' });
    setSuccessBanner('Monthly restrictive practice report submitted to NDIS Commission portal.');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const handleBSPSignOff = (rp: RestrictivePractice) => {
    const updatedBsp = {
      signed: true,
      signedBy: currentUser?.name || 'Dr. Sarah Jenkins, BCBA',
      signedAt: new Date().toISOString(),
      credential: 'PRAC-PBS-ADV-2026'
    };

    const isFullyAuthorized = rp.apoSignOff?.signed;

    updateRestrictivePractice(rp.id, {
      bspSignOff: updatedBsp,
      status: isFullyAuthorized ? 'Authorised' : 'Pending APO Sign-off'
    });

    setSuccessBanner(
      `BSP Clinical sign-off applied for ${rp.clientName}. ${
        isFullyAuthorized
          ? 'Dual authorization complete. Practice is now Authorised.'
          : 'Awaiting Authorised Program Officer (APO) sign-off.'
      }`
    );
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleAPOSignOff = (rp: RestrictivePractice) => {
    const updatedApo = {
      signed: true,
      signedBy: 'David Henderson (Senior APO)',
      signedAt: new Date().toISOString(),
      apoRegistrationNumber: 'APO-VIC-09412'
    };

    const isFullyAuthorized = rp.bspSignOff?.signed;

    updateRestrictivePractice(rp.id, {
      apoSignOff: updatedApo,
      status: isFullyAuthorized ? 'Authorised' : 'Pending BSP Sign-off'
    });

    setSuccessBanner(
      `APO Statutory sign-off applied for ${rp.clientName}. ${
        isFullyAuthorized
          ? 'Dual authorization complete. Practice is now Authorised.'
          : 'Awaiting Behaviour Support Practitioner sign-off.'
      }`
    );
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Regulated Restrictive Practices</h1>
          <p className="text-xs text-slate-400">
            Mandatory reduction plans, dual BSP &amp; APO sign-off pipeline, and NDIS Commission monthly portal logs
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Regulated Practice
        </button>
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statutory Guidance Banner */}
      <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-purple-300">NDIS (Restrictive Practices and Behaviour Support) Rules 2018</p>
          <p className="text-slate-400">
            Regulated restrictive practices (Chemical, Mechanical, Physical, Environmental, Seclusion) cannot be marked <strong>Authorised</strong> without dual clinical governance sign-off from both an accredited <strong>Behaviour Support Practitioner</strong> and an appointed <strong>Authorised Program Officer (APO)</strong>.
          </p>
        </div>
      </div>

      {/* Empty State */}
      {restrictivePractices.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Regulated Restrictive Practices Registered</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Register a regulated restrictive practice with a mandatory reduction strategy and dual BSP/APO authorization workflow, or load the sample NDIS clinical dataset.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Add Regulated Practice
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
        /* Regulated Practice Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restrictivePractices.map((rp) => {
            const isBspSigned = !!rp.bspSignOff?.signed;
            const isApoSigned = !!rp.apoSignOff?.signed;
            const isFullyAuthorized = isBspSigned && isApoSigned;
            const currentFadePct = fadeProgress[rp.id] ?? 50;

            return (
              <div
                key={rp.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 uppercase tracking-wide">
                          {rp.type} Restraint
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isFullyAuthorized
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isFullyAuthorized ? 'Authorized' : 'Authorization Pending'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5">{rp.clientName}</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Authorised Body: {rp.authorizedBy}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          rp.monthlyReportStatus === 'Due'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400'
                        }`}
                      >
                        Monthly Log: {rp.monthlyReportStatus}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono tabular-nums">
                        Expires: {rp.expiryDate}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Protocol &amp; Description
                    </span>
                    <p className="text-slate-200">{rp.description}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" /> Mandatory Fade &amp; Reduction Strategy
                      </span>
                      <span className="font-mono text-[11px] font-bold text-teal-300 tabular-nums">
                        {currentFadePct}% Faded
                      </span>
                    </div>
                    <p className="text-slate-200">
                      {rp.reductionStrategy || 'Gradual desensitisation and environmental modification.'}
                    </p>
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${currentFadePct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Fade Milestone Progress</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={currentFadePct}
                          onChange={(e) =>
                            setFadeProgress((prev) => ({ ...prev, [rp.id]: Number(e.target.value) }))
                          }
                          className="w-24 accent-teal-500 cursor-pointer"
                          aria-label="Fade milestone percentage"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dual Approval Sign-Off Pipeline */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Statutory Approval Sign-off Pipeline
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {isFullyAuthorized
                          ? '2 of 2 signed'
                          : `${(isBspSigned ? 1 : 0) + (isApoSigned ? 1 : 0)} of 2 signed`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* BSP Sign-off box */}
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isBspSigned
                            ? 'bg-teal-950/30 border-teal-500/40 text-teal-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">1. BSP Practitioner</span>
                          {isBspSigned ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {isBspSigned ? `${rp.bspSignOff?.signedBy || 'Signed'}` : 'Sign-off required'}
                        </p>
                        {!isBspSigned && (
                          <button
                            onClick={() => handleBSPSignOff(rp)}
                            className="mt-2 w-full py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[10px] font-bold border border-teal-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <FileSignature className="w-3 h-3" /> Sign as BSP
                          </button>
                        )}
                      </div>

                      {/* APO Sign-off box */}
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isApoSigned
                            ? 'bg-teal-950/30 border-teal-500/40 text-teal-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">2. Program Officer (APO)</span>
                          {isApoSigned ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {isApoSigned ? `${rp.apoSignOff?.signedBy || 'Signed'}` : 'Sign-off required'}
                        </p>
                        {!isApoSigned && (
                          <button
                            onClick={() => handleAPOSignOff(rp)}
                            className="mt-2 w-full py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" /> Sign as APO
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs border-t border-slate-800 mt-4">
                  <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                    State Ref: {rp.authorizationDate}
                  </span>
                  {rp.monthlyReportStatus === 'Due' && (
                    <button
                      onClick={() => markReportSubmitted(rp.id)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-teal-900/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Submit Monthly Log to Commission
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Record Regulated Practice</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Participant</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Restraint Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Environmental">Environmental</option>
                    <option value="Chemical">Chemical</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Physical">Physical</option>
                    <option value="Seclusion">Seclusion</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Authorisation Body</label>
                  <input
                    type="text"
                    value={formData.authorizedBy}
                    onChange={(e) => setFormData({ ...formData, authorizedBy: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Clinical Protocol &amp; Description</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the exact restraint parameters, duration caps, and triggers..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Mandatory Fade &amp; Reduction Strategy</label>
                <textarea
                  rows={2}
                  required
                  value={formData.reductionStrategy}
                  onChange={(e) => setFormData({ ...formData, reductionStrategy: e.target.value })}
                  placeholder="Measurable reduction milestones, replacement skills, and elimination timeline..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400">
                <p>
                  Once saved, this practice enters the approval pipeline as <strong>Proposed</strong>. Both the Behaviour Support Practitioner and the Authorised Program Officer must sign off before it can be legally applied.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white shadow-md shadow-teal-900/30"
                >
                  Submit for Dual Sign-off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

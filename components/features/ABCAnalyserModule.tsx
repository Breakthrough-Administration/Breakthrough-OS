'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { ABCLog } from '@/types';
import {
  Activity,
  Plus,
  BarChart2,
  CheckCircle2,
  X,
  FileCheck,
  Database
} from 'lucide-react';

export const ABCAnalyserModule: React.FC = () => {
  const {
    abcLogs,
    clients,
    selectedClientId,
    setSelectedClientId,
    addABCLog,
    updateBSP,
    bspDocuments,
    addNotification,
    loadDemoData
  } = useManagementStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [syncedBanner, setSyncedBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ABCLog>>({
    clientId: selectedClientId || clients[0]?.id || 'cli-001',
    clientName: clients.find((c) => c.id === selectedClientId)?.name || clients[0]?.name || '',
    timestamp: new Date().toISOString(),
    timeOfDay: '14:30',
    dayOfWeek: 'Monday',
    location: 'Community Setting',
    antecedent: '',
    behavior: '',
    consequence: '',
    intensity: 3,
    durationMinutes: 10,
    perceivedFunction: 'Escape/Avoidance',
    recordedBy: 'Support Practitioner'
  });

  const filteredLogs = abcLogs.filter(
    (log) => !selectedClientId || log.clientId === selectedClientId
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formData.clientId);
    const clientName = client?.name || formData.clientName || 'Participant';
    addABCLog({
      clientId: formData.clientId || 'cli-001',
      clientName,
      timestamp: formData.timestamp || new Date().toISOString(),
      timeOfDay: formData.timeOfDay || '14:30',
      dayOfWeek: formData.dayOfWeek || 'Monday',
      location: formData.location || 'Community Setting',
      antecedent: formData.antecedent || 'General demand',
      behavior: formData.behavior || 'Target behaviour observed',
      consequence: formData.consequence || 'Redirection provided',
      intensity: formData.intensity || 3,
      durationMinutes: formData.durationMinutes || 10,
      perceivedFunction: formData.perceivedFunction || 'Escape/Avoidance',
      recordedBy: formData.recordedBy || 'Support Practitioner'
    });
    setIsAddOpen(false);
  };

  const handleSyncToBSP = () => {
    const targetClient = clients.find((c) => c.id === selectedClientId) || clients[0];
    const targetLogs = filteredLogs.length > 0 ? filteredLogs : abcLogs;
    if (targetLogs.length === 0) return;

    const existingBsp = bspDocuments.find((b) => b.clientId === targetClient?.id);
    const extractedTriggers = Array.from(new Set(targetLogs.map((l) => l.antecedent).filter(Boolean)));
    const extractedBehaviours = Array.from(new Set(targetLogs.map((l) => l.behavior).filter(Boolean)));

    updateBSP({
      clientId: targetClient?.id || 'cli-001',
      clientName: targetClient?.name || 'Participant',
      triggers: Array.from(new Set([...(existingBsp?.triggers || []), ...extractedTriggers])),
      primaryBehavioursOfConcern: Array.from(
        new Set([...(existingBsp?.primaryBehavioursOfConcern || []), ...extractedBehaviours])
      )
    });

    const msg = `Synced ${extractedTriggers.length} FBA triggers & ${extractedBehaviours.length} target behaviours into ${
      targetClient?.name || 'Participant'
    }'s Behaviour Support Plan.`;
    setSyncedBanner(msg);
    addNotification({
      title: 'FBA Triggers Synced to BSP',
      message: msg,
      type: 'clinical',
      severity: 'low',
      linkTab: 'bsp-plans'
    });
    setTimeout(() => setSyncedBanner(null), 4000);
  };

  // Normalize function counts across slash/spacing variations
  const getCountForFunction = (label: string) => {
    const keyPart = label.split('/')[0].trim().toLowerCase();
    return filteredLogs.filter((l) => (l.perceivedFunction || '').toLowerCase().includes(keyPart)).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">ABC Behaviour Analyser (PBS)</h1>
          <p className="text-xs text-slate-400">
            Antecedent-Behaviour-Consequence tracking and functional behaviour assessment (FBA)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {filteredLogs.length > 0 && (
            <button
              onClick={handleSyncToBSP}
              className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Push observed antecedents and behaviours directly into the participant's BSP"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-400" /> Sync FBA to BSP
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" /> Log ABC Episode
          </button>
        </div>
      </div>

      {syncedBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> {syncedBanner}
          </span>
          <button onClick={() => setSyncedBanner(null)} className="text-teal-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Function of Behaviour Synthesis */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-teal-400" /> Functional Behaviour Assessment (FBA) Synthesis
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Escape / Avoidance', 'Tangible / Access', 'Attention / Social', 'Sensory / Automatic'].map((fn) => {
            const count = getCountForFunction(fn);
            const percentage =
              filteredLogs.length > 0 ? Math.round((count / filteredLogs.length) * 100) : 0;
            return (
              <div
                key={fn}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate block">{fn}</span>
                <p className="text-xl font-extrabold text-white font-mono tabular-nums">
                  {count}{' '}
                  <span className="text-xs font-normal text-slate-400">({percentage}%)</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ABC Records Timeline */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white">Recent Clinical Observations</h2>

        {filteredLogs.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
            <Activity className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No ABC Behaviour Episodes Recorded</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Record antecedent-behaviour-consequence episodes to calculate functional behaviour distributions and sync triggers to the participant&apos;s BSP.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Log First ABC Episode
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
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{log.clientName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-mono tabular-nums">
                      {log.timestamp?.slice(0, 10) || '2026-03-08'} @ {log.timeOfDay || '14:30'}
                    </span>
                    <span className="text-[10px] text-slate-400">{log.location}</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 font-semibold">
                    Function: {log.perceivedFunction || 'Sensory/Automatic'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                      A — Antecedent (Trigger)
                    </span>
                    <p className="text-slate-200">{log.antecedent}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                      B — Behaviour (Topography)
                    </span>
                    <p className="text-slate-200">{log.behavior}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
                      Intensity: {log.intensity}/5 • Duration: {log.durationMinutes}m
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                      C — Consequence (Response)
                    </span>
                    <p className="text-slate-200">{log.consequence}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add ABC Log Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Record ABC Observation</h3>
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
                  <label className="text-slate-300 font-semibold">Date</label>
                  <input
                    type="date"
                    value={formData.timestamp?.slice(0, 10) || '2026-03-08'}
                    onChange={(e) => setFormData({ ...formData, timestamp: new Date(e.target.value).toISOString() })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Time</label>
                  <input
                    type="time"
                    value={formData.timeOfDay || '14:30'}
                    onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Antecedent (Setting event / trigger)</label>
                <textarea
                  rows={2}
                  required
                  value={formData.antecedent}
                  onChange={(e) => setFormData({ ...formData, antecedent: e.target.value })}
                  placeholder="Transition demand, loud environment, denied request..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Behaviour (Specific observable action)</label>
                <textarea
                  rows={2}
                  required
                  value={formData.behavior}
                  onChange={(e) => setFormData({ ...formData, behavior: e.target.value })}
                  placeholder="Property destruction, physical aggression, vocal protest..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Consequence (Staff / environment response)</label>
                <textarea
                  rows={2}
                  required
                  value={formData.consequence}
                  onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
                  placeholder="Task removed, verbal reassurance provided, quiet space offered..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Intensity (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formData.intensity || 3}
                    onChange={(e) => setFormData({ ...formData, intensity: Number(e.target.value) as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Duration (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.durationMinutes || 10}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Perceived Function</label>
                  <select
                    value={formData.perceivedFunction}
                    onChange={(e) => setFormData({ ...formData, perceivedFunction: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Escape/Avoidance">Escape / Avoidance</option>
                    <option value="Tangible/Access">Tangible Access</option>
                    <option value="Attention/Social">Attention / Social</option>
                    <option value="Sensory/Automatic">Sensory / Automatic</option>
                  </select>
                </div>
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
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white"
                >
                  Save Episode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

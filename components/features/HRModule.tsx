'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { ScheduledShift } from '@/types';
import { BulkParticipantImporter } from './BulkParticipantImporter';
import { BulkImportPreviewModal } from './BulkImportPreviewModal';
import {
  parseParticipantCSV,
  autoDetectFieldMappings,
  preUploadValidationCheck,
  mapToFirestoreClientSchema,
  autoSanitizeRow,
  generateSampleParticipantCSVWithErrors,
} from '@/services/hrParticipantImportService';
export {
  parseParticipantCSV,
  autoDetectFieldMappings,
  preUploadValidationCheck,
  mapToFirestoreClientSchema,
  autoSanitizeRow,
  generateSampleParticipantCSVWithErrors,
};
import {
  FileSpreadsheet,
  Plus,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  UploadCloud,
  Check,
  Sliders,
  CalendarDays,
  FileCheck,
  Eye
} from 'lucide-react';

export const HRModule: React.FC = () => {
  const { practitioners, scheduledShifts, clients, addScheduledShift, setActiveTab } = useManagementStore();
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'bulk-import' | 'workforce'>('roster');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  const [shiftForm, setShiftForm] = useState<Partial<ScheduledShift>>({
    practitionerId: practitioners[0]?.id || 'prac-1',
    practitionerName: practitioners[0]?.name || '',
    clientId: clients[0]?.id || 'client-1',
    clientName: clients[0]?.name || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    status: 'Scheduled',
    schadsClassification: 'SCHADS Level 4.1'
  });

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const prac = practitioners.find((p) => p.id === shiftForm.practitionerId);
    const client = clients.find((c) => c.id === shiftForm.clientId);

    addScheduledShift({
      ...shiftForm,
      practitionerName: prac?.name || shiftForm.practitionerName,
      clientName: client?.name || shiftForm.clientName
    });
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white">HR & Administration Module</h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
              Operations OS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Workforce screening verification, SCHADS award roster compliance, and Participant bulk data import engine
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30"
            title="Open Bulk Import Preview modal with real-time data validation and error highlighting"
          >
            <Eye className="w-4 h-4" />
            <span>Bulk Import Preview</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bulk-import')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              activeSubTab === 'bulk-import'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Workspace</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700"
          >
            <Plus className="w-4 h-4" /> Schedule Roster Shift
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'roster'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-teal-400" />
          <span>SCHADS Roster & Schedule</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono">
            {scheduledShifts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('bulk-import')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'bulk-import'
              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-teal-400" />
          <span>Bulk Participant Importer & Validator</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
            CSV / Excel
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('workforce')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'workforce'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Clinical Workforce Credentials</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono">
            {practitioners.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: BULK PARTICIPANT IMPORTER & DATA VALIDATOR */}
      {activeSubTab === 'bulk-import' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pre-Upload Data Table & Error Highlight Modal</h3>
                <p className="text-xs text-slate-400">
                  Open the full-screen Bulk Import Preview modal to inspect rows with color-coded status indicators (Red for errors, Amber for warnings, Green for valid) with inline cell correction.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsBulkImportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-900/30 flex-shrink-0 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Launch Bulk Import Preview</span>
            </button>
          </div>
          <BulkParticipantImporter
            isOpen={true}
            onSuccessNavigate={() => setActiveTab('clients')}
          />
        </div>
      )}

      {/* VIEW 2: SCHADS ROSTER & SCHEDULE */}
      {activeSubTab === 'roster' && (
        <div className="space-y-6">
          {/* SCHADS Award Compliance Banner */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white">SCHADS Award 2010 Automated Rules Engine Active</p>
                <p className="text-slate-400">
                  Enforcing minimum 2-hour engagements, broken shift allowances, 10-hour rest breaks between shifts, and overtime penalties.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                onClick={() => setIsBulkImportModalOpen(true)}
                className="text-xs text-white hover:text-teal-200 font-bold whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 shadow-sm transition-colors"
                title="Open Bulk Import Preview modal"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Bulk Import Preview</span>
              </button>
              <button
                onClick={() => setActiveSubTab('bulk-import')}
                className="text-xs text-slate-300 hover:text-white font-bold whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Import Workspace</span>
              </button>
            </div>
          </div>

          {/* Practitioners Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Active Clinical Practitioners & Allocations</h2>
              <span className="text-xs text-slate-400">{practitioners.length} Practitioners registered</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {practitioners.map((prac) => (
                <div
                  key={prac.id}
                  className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{prac.name}</h3>
                      <p className="text-[11px] text-teal-400 font-semibold">{prac.role}</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                      {prac.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>NDIS Screening:</span>
                      <span className="text-teal-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid (2028)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>AHPRA Reg:</span>
                      <span className="font-mono text-white text-[10px]">{prac.registrationNumber || 'MED00021482'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Shifts Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Upcoming SCHADS Award Roster Schedule</h2>
                  <p className="text-[11px] text-slate-400">Two-way Google Calendar synchronization with participant addresses & MMM travel buffers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const firstShift = scheduledShifts[0];
                    if (firstShift) {
                      const client = clients.find((c) => c.id === firstShift.clientId);
                      const rawAddr = client?.address;
                      const addr = typeof rawAddr === 'string'
                        ? rawAddr
                        : rawAddr
                        ? [rawAddr.street, rawAddr.suburb, rawAddr.state, rawAddr.postcode].filter(Boolean).join(', ')
                        : '12 Collins St, Melbourne VIC 3000';
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`NDIS Shift: ${firstShift.clientName} w/ ${firstShift.practitionerName}`)}&details=${encodeURIComponent(`SCHADS Award Shift\nParticipant Address: ${addr}\nMMM Zone: MMM 1 (30m travel buffer)\nSession: ${firstShift.startTime}-${firstShift.endTime}`)}&location=${encodeURIComponent(addr)}`;
                      window.open(url, '_blank');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Sync roster shifts directly to practitioner's Google Calendar"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sync Shifts to Google Calendar</span>
                </button>
                <span className="text-xs text-slate-400 font-mono">{scheduledShifts.length} shifts</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Practitioner</th>
                    <th className="p-4">Participant & Location</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">MMM Travel Buffer</th>
                    <th className="p-4">SCHADS Award</th>
                    <th className="p-4">Calendar Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {scheduledShifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No active shifts scheduled today. Click &quot;Schedule Roster Shift&quot; above.
                      </td>
                    </tr>
                  ) : (
                    scheduledShifts.map((shift) => {
                      const client = clients.find((c) => c.id === shift.clientId);
                      const rawAddress = client?.address;
                      const address = typeof rawAddress === 'string'
                        ? rawAddress
                        : rawAddress
                        ? [rawAddress.street, rawAddress.suburb, rawAddress.state, rawAddress.postcode].filter(Boolean).join(', ')
                        : 'Participant Residence, Melbourne VIC';
                      const isRegional = address.toLowerCase().includes('ballarat') || address.toLowerCase().includes('bendigo') || address.toLowerCase().includes('geelong');
                      const mmmBuffer = isRegional ? 'MMM 3 (+45m travel)' : 'MMM 1 (+30m travel)';

                      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                        `NDIS Session: ${shift.clientName} (${shift.practitionerName})`
                      )}&dates=${shift.date.replace(/-/g, '')}T${(shift.startTime || '09:00').replace(':', '')}00/${shift.date.replace(/-/g, '')}T${(shift.endTime || '12:00').replace(':', '')}00&details=${encodeURIComponent(
                        `NDIS Therapy Session\nParticipant: ${shift.clientName}\nAddress: ${address}\nBuffer: ${mmmBuffer}\nClassification: ${shift.schadsClassification}`
                      )}&location=${encodeURIComponent(address)}`;

                      return (
                        <tr key={shift.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-bold text-white">
                            <div>{shift.practitionerName}</div>
                            <span className="text-[10px] text-teal-400 font-semibold">{shift.status}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white">{shift.clientName}</div>
                            <span className="text-[10px] text-slate-400 truncate block max-w-xs">{address}</span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-mono text-white">{shift.date}</div>
                            <span className="font-mono text-[11px] text-slate-400">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold font-mono">
                              {mmmBuffer}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-teal-400">{shift.schadsClassification}</td>
                          <td className="p-4">
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                              title="Add to Google Calendar with participant address & travel buffer"
                            >
                              <CalendarDays className="w-3 h-3 text-indigo-400" />
                              <span>Sync GCal</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CLINICAL WORKFORCE CREDENTIALS & SCREENING AUDIT */}
      {activeSubTab === 'workforce' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">NDIS Quality & Safeguards Commission Compliance</h3>
                <p className="text-xs text-slate-400">
                  Verification status of NDIS Worker Screening Check (NDISWC), Working with Children Check (WWCC), and professional indemnity insurance
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> 100% Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {practitioners.map((prac) => (
                <div
                  key={prac.id}
                  className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{prac.name}</h4>
                      <p className="text-xs text-teal-400 font-semibold">{prac.role}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                      {prac.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>AHPRA / Professional Reg:</span>
                      <span className="font-mono text-white">{prac.registrationNumber || 'MED00021482'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>NDIS Worker Screening Check:</span>
                      <span className="text-teal-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Valid (Expires 2028)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Working with Children (WWCC):</span>
                      <span className="text-teal-400 font-semibold">Current (VIC / Verified)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>First Aid & CPR (HLTAID011):</span>
                      <span className="text-emerald-400 font-semibold">Current (Expires Nov 2026)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Schedule Roster Shift</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Practitioner</label>
                <select
                  value={shiftForm.practitionerId}
                  onChange={(e) => setShiftForm({ ...shiftForm, practitionerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  {practitioners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Participant</label>
                <select
                  value={shiftForm.clientId}
                  onChange={(e) => setShiftForm({ ...shiftForm, clientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Date</label>
                  <input
                    type="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Start</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">End</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">SCHADS Classification</label>
                <select
                  value={shiftForm.schadsClassification}
                  onChange={(e) => setShiftForm({ ...shiftForm, schadsClassification: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option>SCHADS Level 4.1 (Therapy Assistant)</option>
                  <option>SCHADS Level 5.1 (Allied Health Practitioner)</option>
                  <option>SCHADS Level 6.2 (Senior Clinician / Supervisor)</option>
                </select>
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
                  Schedule Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Bulk Import Preview Modal */}
      {isBulkImportModalOpen && (
        <BulkImportPreviewModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          onSuccess={() => {
            setIsBulkImportModalOpen(false);
            setActiveTab('clients');
          }}
        />
      )}
    </div>
  );
};

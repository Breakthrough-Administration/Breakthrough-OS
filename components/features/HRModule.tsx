'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { ScheduledShift, Practitioner } from '@/types';
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
  X,
  UploadCloud,
  Check,
  CalendarDays,
  Eye,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  Briefcase
} from 'lucide-react';

export const HRModule: React.FC = () => {
  const {
    practitioners,
    scheduledShifts,
    clients,
    addPractitioner,
    updatePractitioner,
    deletePractitioner,
    assignPractitionerToClients,
    addScheduledShift,
    setActiveTab
  } = useManagementStore();

  const [activeSubTab, setActiveSubTab] = useState<'caseload-matrix' | 'roster' | 'bulk-import' | 'workforce'>(
    'caseload-matrix'
  );
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isPractitionerModalOpen, setIsPractitionerModalOpen] = useState(false);
  const [editingPractitionerId, setEditingPractitionerId] = useState<string | null>(null);

  // Caseload Assignment Matrix state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [bulkPractitionerId, setBulkPractitionerId] = useState<string>(practitioners[0]?.id || 'prac-201');
  const [bulkRoleType, setBulkRoleType] = useState<'primary' | 'secondary'>('primary');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFilterPrac, setMatrixFilterPrac] = useState<string>('ALL');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Practitioner Create / Edit Form
  const [pracForm, setPracForm] = useState<{
    name: string;
    position: string;
    role: string;
    qualification: string;
    email: string;
    phone: string;
    ahpraNumber: string;
    workerScreeningId: string;
    workerScreeningExpiry: string;
    policeCheckExpiryDate: string;
    schadsLevel: string;
    hourlyPayRate: number;
    billableTargetHours: number;
    maxCaseload: number;
    status: string;
  }>({
    name: '',
    position: 'Senior Behaviour Support Practitioner',
    role: 'Specialist Behaviour Support Clinician',
    qualification: 'B.Psych (Hons), PBS Proficient',
    email: '',
    phone: '',
    ahpraNumber: 'PSY0002481920',
    workerScreeningId: 'NDIS-WS-8841209',
    workerScreeningExpiry: '2028-12-31',
    policeCheckExpiryDate: '2027-12-31',
    schadsLevel: 'SCHADS Level 6.3 (Senior Clinician)',
    hourlyPayRate: 65.0,
    billableTargetHours: 26,
    maxCaseload: 12,
    status: 'Active'
  });

  const [shiftForm, setShiftForm] = useState<Partial<ScheduledShift>>({
    practitionerId: practitioners[0]?.id || 'prac-201',
    practitionerName: practitioners[0]?.name || '',
    clientId: clients[0]?.id || 'client-1',
    clientName: clients[0]?.name || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    status: 'Scheduled',
    schadsClassification: 'SCHADS Level 5.1 (Allied Health Practitioner)'
  });

  const showBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const openCreatePractitioner = () => {
    setEditingPractitionerId(null);
    setPracForm({
      name: '',
      position: 'Senior Behaviour Support Practitioner',
      role: 'Positive Behaviour Support Clinician',
      qualification: 'B.Psych / M.AlliedHealth',
      email: '',
      phone: '0411 000 000',
      ahpraNumber: `MED${Math.floor(1000000 + Math.random() * 9000000)}`,
      workerScreeningId: `NDIS-WS-${Math.floor(1000000 + Math.random() * 9000000)}`,
      workerScreeningExpiry: '2028-12-31',
      policeCheckExpiryDate: '2027-12-31',
      schadsLevel: 'SCHADS Level 6.1 (Clinician)',
      hourlyPayRate: 62.5,
      billableTargetHours: 26,
      maxCaseload: 12,
      status: 'Active'
    });
    setIsPractitionerModalOpen(true);
  };

  const openEditPractitioner = (p: Practitioner) => {
    setEditingPractitionerId(p.id);
    setPracForm({
      name: p.name,
      position: p.position || 'Senior Behaviour Support Practitioner',
      role: p.role || p.position || 'Clinician',
      qualification: p.qualification || 'Allied Health / PBS',
      email: p.email || '',
      phone: p.phone || '',
      ahpraNumber: p.ahpraNumber || p.registrationNumber || 'MED00021482',
      workerScreeningId: p.workerScreeningId || 'NDIS-WS-8829104',
      workerScreeningExpiry: p.workerScreeningExpiry || p.screeningExpiryDate || '2028-09-30',
      policeCheckExpiryDate: p.policeCheckExpiryDate || '2027-11-15',
      schadsLevel: p.schadsLevel || 'SCHADS Level 6.1',
      hourlyPayRate: p.hourlyPayRate || 64.0,
      billableTargetHours: p.billableTargetHours || 26,
      maxCaseload: p.maxCaseload || 14,
      status: p.status || 'Active'
    });
    setIsPractitionerModalOpen(true);
  };

  const handleSavePractitioner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pracForm.name.trim()) return;

    if (editingPractitionerId) {
      updatePractitioner(editingPractitionerId, {
        name: pracForm.name.trim(),
        position: pracForm.position,
        role: pracForm.role || pracForm.position,
        qualification: pracForm.qualification,
        email: pracForm.email,
        phone: pracForm.phone,
        ahpraNumber: pracForm.ahpraNumber,
        registrationNumber: pracForm.ahpraNumber,
        workerScreeningId: pracForm.workerScreeningId,
        workerScreeningExpiry: pracForm.workerScreeningExpiry,
        screeningExpiryDate: pracForm.workerScreeningExpiry,
        policeCheckExpiryDate: pracForm.policeCheckExpiryDate,
        schadsLevel: pracForm.schadsLevel,
        hourlyPayRate: Number(pracForm.hourlyPayRate) || 60,
        billableTargetHours: Number(pracForm.billableTargetHours) || 26,
        maxCaseload: Number(pracForm.maxCaseload) || 12,
        status: pracForm.status
      });
      showBanner(`Updated practitioner profile for ${pracForm.name.trim()}.`);
    } else {
      const newId = `prac-${Date.now().toString().slice(-5)}`;
      const newPrac: Practitioner = {
        id: newId,
        name: pracForm.name.trim(),
        position: pracForm.position,
        role: pracForm.role || pracForm.position,
        qualification: pracForm.qualification,
        ndisRegistrationNumber: `PRAC-${Date.now().toString().slice(-4)}`,
        registrationNumber: pracForm.ahpraNumber,
        ahpraNumber: pracForm.ahpraNumber,
        email: pracForm.email || `${pracForm.name.toLowerCase().replace(/[^a-z]+/g, '.')}@breakthrough.org.au`,
        phone: pracForm.phone,
        caseloadCount: 0,
        maxCaseload: Number(pracForm.maxCaseload) || 12,
        billableTargetHours: Number(pracForm.billableTargetHours) || 26,
        currentBillableHours: 0,
        schadsLevel: pracForm.schadsLevel,
        hourlyPayRate: Number(pracForm.hourlyPayRate) || 60,
        workerScreeningId: pracForm.workerScreeningId,
        workerScreeningExpiry: pracForm.workerScreeningExpiry,
        screeningStatus: 'Valid',
        screeningExpiryDate: pracForm.workerScreeningExpiry,
        policeCheckExpiryDate: pracForm.policeCheckExpiryDate,
        status: pracForm.status
      };
      addPractitioner(newPrac);
      setBulkPractitionerId(newPrac.id);
      showBanner(`Created practitioner ${newPrac.name} (${newPrac.position}) and saved to Firestore.`);
    }

    setIsPractitionerModalOpen(false);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const prac = practitioners.find((p) => p.id === shiftForm.practitionerId);
    const client = clients.find((c) => c.id === shiftForm.clientId);

    addScheduledShift({
      ...shiftForm,
      practitionerName: prac?.name || shiftForm.practitionerName,
      clientName: client?.name || shiftForm.clientName
    });
    setIsAddShiftOpen(false);
    showBanner(`Scheduled shift for ${client?.name || 'Participant'} with ${prac?.name || 'Practitioner'}.`);
  };

  // Filtered participants for Caseload Matrix
  const filteredMatrixClients = useMemo(() => {
    return clients.filter((c) => {
      const q = matrixSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.ndisNumber.toLowerCase().includes(q) ||
        (c.primaryDisability || '').toLowerCase().includes(q) ||
        (c.primaryPractitionerName || '').toLowerCase().includes(q);

      const matchesPrac =
        matrixFilterPrac === 'ALL' ||
        (matrixFilterPrac === 'UNASSIGNED' && !c.primaryPractitionerId) ||
        c.primaryPractitionerId === matrixFilterPrac ||
        c.secondaryPractitionerId === matrixFilterPrac;

      return matchesSearch && matchesPrac;
    });
  }, [clients, matrixSearch, matrixFilterPrac]);

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllFiltered = () => {
    if (selectedClientIds.length === filteredMatrixClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredMatrixClients.map((c) => c.id));
    }
  };

  const handleBulkAssign = async () => {
    const targetPrac = practitioners.find((p) => p.id === bulkPractitionerId);
    if (!targetPrac || selectedClientIds.length === 0) return;

    const count = await assignPractitionerToClients(
      selectedClientIds,
      targetPrac.id,
      targetPrac.name,
      bulkRoleType
    );
    setSelectedClientIds([]);
    showBanner(
      `Assigned ${targetPrac.name} as ${
        bulkRoleType === 'primary' ? 'Primary Practitioner' : 'Secondary Support'
      } to ${count} active participant(s).`
    );
  };

  const handleSingleAssign = async (
    clientId: string,
    practitionerId: string,
    roleType: 'primary' | 'secondary'
  ) => {
    const prac = practitioners.find((p) => p.id === practitionerId);
    if (!prac) return;
    await assignPractitionerToClients([clientId], prac.id, prac.name, roleType);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white">
              Practitioners, Caseload Assignment &amp; SCHADS Roster
            </h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
              {practitioners.length} Practitioners · {clients.length} Active Participants
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create practitioners, assign Primary and Secondary clinicians across your 22 active NDIS participants, verify NDIS Worker Screening, and schedule SCHADS shifts
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openCreatePractitioner}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Practitioner</span>
          </button>

          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Shift</span>
          </button>

          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Bulk Import Preview</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{statusBanner}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('caseload-matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'caseload-matrix'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4 text-teal-400" />
          <span>Practitioners &amp; Caseload Assignment ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'roster'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-teal-400" />
          <span>SCHADS Roster &amp; Schedule ({scheduledShifts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('workforce')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'workforce'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>NDIS Screening &amp; Credentials ({practitioners.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bulk-import')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'bulk-import'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-teal-400" />
          <span>Bulk Participant CSV Importer</span>
        </button>
      </div>

      {/* =====================================================================
          VIEW 0: PRACTITIONER CREATION & CASELOAD ASSIGNMENT MATRIX
          ===================================================================== */}
      {activeSubTab === 'caseload-matrix' && (
        <div className="space-y-6">
          {/* Practitioner Cards with Caseload Utilization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Company Clinical Team &amp; Live Caseload Capacity
                </h2>
                <p className="text-xs text-slate-400">
                  Click &quot;Create Practitioner&quot; to add new staff or click &quot;Edit&quot; on any card to update credentials, rates, and max caseload
                </p>
              </div>
              <button
                onClick={openCreatePractitioner}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Practitioner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {practitioners.map((prac) => {
                const primaryAssigned = clients.filter(
                  (c) => c.primaryPractitionerId === prac.id || c.allocatedPractitionerId === prac.id
                );
                const secondaryAssigned = clients.filter((c) => c.secondaryPractitionerId === prac.id);
                const maxCap = prac.maxCaseload || 14;
                const utilPercent = Math.min(100, Math.round((primaryAssigned.length / maxCap) * 100));

                return (
                  <div
                    key={prac.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white">{prac.name}</h3>
                          <p className="text-[11px] text-teal-400 font-semibold">
                            {prac.position || prac.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPractitioner(prac)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Edit practitioner profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePractitioner(prac.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                            title="Remove practitioner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span>Primary Caseload:</span>
                          <span className="font-mono font-bold text-white">
                            {primaryAssigned.length} / {maxCap} participants
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Secondary Support:</span>
                          <span className="font-mono text-indigo-300">
                            {secondaryAssigned.length} participants
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Billable Target:</span>
                          <span className="font-mono text-emerald-400">
                            {prac.billableTargetHours || 26} hrs/wk (${prac.hourlyPayRate || 64}/hr)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Caseload Capacity</span>
                        <span
                          className={`font-mono font-bold ${
                            utilPercent >= 90
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`}
                        >
                          {utilPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            utilPercent >= 90 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${utilPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bulk Caseload Assignment Control Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Filter 22 active participants by name, NDIS #, or practitioner..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <select
                value={matrixFilterPrac}
                onChange={(e) => setMatrixFilterPrac(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="ALL">All Practitioners ({clients.length} Active)</option>
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    Assigned to {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Assign Action */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-teal-400 px-2">
                {selectedClientIds.length} Selected:
              </span>
              <select
                value={bulkPractitionerId}
                onChange={(e) => setBulkPractitionerId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position || p.role})
                  </option>
                ))}
              </select>
              <select
                value={bulkRoleType}
                onChange={(e) => setBulkRoleType(e.target.value as 'primary' | 'secondary')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="primary">As Primary Practitioner</option>
                <option value="secondary">As Secondary / Support</option>
              </select>
              <button
                type="button"
                disabled={selectedClientIds.length === 0}
                onClick={handleBulkAssign}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Assign Selected ({selectedClientIds.length})
              </button>
            </div>
          </div>

          {/* 22-Participant Interactive Caseload Assignment Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredMatrixClients.length > 0 &&
                          selectedClientIds.length === filteredMatrixClients.length
                        }
                        onChange={toggleSelectAllFiltered}
                        className="rounded border-slate-700 bg-slate-900 text-teal-500"
                      />
                    </th>
                    <th className="p-3.5">Active Participant &amp; NDIS #</th>
                    <th className="p-3.5">Primary Disability &amp; Risk</th>
                    <th className="p-3.5">Plan Management &amp; Budget</th>
                    <th className="p-3.5">Primary Practitioner (Lead Clinician)</th>
                    <th className="p-3.5">Secondary / Allied Support Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredMatrixClients.map((client) => {
                    const isChecked = selectedClientIds.includes(client.id);
                    return (
                      <tr
                        key={client.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-teal-500/10' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectClient(client.id)}
                            className="rounded border-slate-700 bg-slate-900 text-teal-500"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{client.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              {client.status}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            NDIS: {client.ndisNumber} · DOB: {client.dateOfBirth}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium">{client.primaryDisability}</div>
                          <span
                            className={`text-[10px] font-bold ${
                              client.riskLevel === 'High' || client.riskLevel === 'Critical'
                                ? 'text-rose-400'
                                : client.riskLevel === 'Medium'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {client.riskLevel} Risk
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-white">
                            ${(client.totalBudget || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {client.planManagementType} ({client.planManager?.email || 'NDIA'})
                          </div>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={client.primaryPractitionerId || ''}
                            onChange={(e) => handleSingleAssign(client.id, e.target.value, 'primary')}
                            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold focus:border-teal-500"
                          >
                            {practitioners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.position?.split(' ')[0] || 'Clinician'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={client.secondaryPractitionerId || ''}
                            onChange={(e) => handleSingleAssign(client.id, e.target.value, 'secondary')}
                            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500"
                          >
                            <option value="">— Select Secondary Staff —</option>
                            {practitioners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.role?.split(' ')[0] || 'Support'})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: BULK PARTICIPANT IMPORTER & DATA VALIDATOR */}
      {activeSubTab === 'bulk-import' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pre-Upload Data Table &amp; Error Highlight Modal</h3>
                <p className="text-xs text-slate-400">
                  Open the full-screen Bulk Import Preview modal to inspect rows with color-coded status indicators with inline cell correction.
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
            <button
              onClick={() => setIsAddShiftOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Shift</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Upcoming SCHADS Award Roster Schedule</h2>
                  <p className="text-[11px] text-slate-400">
                    Two-way Google Calendar synchronization with participant addresses &amp; MMM travel buffers
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">{scheduledShifts.length} shifts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Practitioner</th>
                    <th className="p-4">Participant &amp; Location</th>
                    <th className="p-4">Date &amp; Time</th>
                    <th className="p-4">MMM Travel Buffer</th>
                    <th className="p-4">SCHADS Award</th>
                    <th className="p-4">Calendar Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {scheduledShifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No active shifts scheduled today. Click &quot;Schedule Shift&quot; above to roster any of your {practitioners.length} practitioners with your 22 active participants.
                      </td>
                    </tr>
                  ) : (
                    scheduledShifts.map((shift) => {
                      const client = clients.find((c) => c.id === shift.clientId);
                      const rawAddress = client?.address;
                      const address =
                        typeof rawAddress === 'string'
                          ? rawAddress
                          : rawAddress
                          ? [rawAddress.street, rawAddress.suburb, rawAddress.state, rawAddress.postcode]
                              .filter(Boolean)
                              .join(', ')
                          : 'Participant Residence, Melbourne VIC';
                      const mmmBuffer = 'MMM 1 (+30m travel)';
                      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                        `NDIS Session: ${shift.clientName} (${shift.practitionerName})`
                      )}&dates=${shift.date.replace(/-/g, '')}T${(shift.startTime || '09:00').replace(
                        ':',
                        ''
                      )}00/${shift.date.replace(/-/g, '')}T${(shift.endTime || '12:00').replace(
                        ':',
                        ''
                      )}00&details=${encodeURIComponent(
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
                <h3 className="text-base font-bold text-white">NDIS Quality &amp; Safeguards Commission Compliance</h3>
                <p className="text-xs text-slate-400">
                  Verification status of NDIS Worker Screening Check (NDISWC), Working with Children Check (WWCC), AHPRA, and SCHADS classifications
                </p>
              </div>
              <button
                onClick={openCreatePractitioner}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Practitioner</span>
              </button>
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
                      <p className="text-xs text-teal-400 font-semibold">{prac.position || prac.role}</p>
                      <p className="text-[11px] text-slate-400">{prac.email} · {prac.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditPractitioner(prac)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
                      >
                        Edit
                      </button>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                        {prac.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>AHPRA / Professional Reg:</span>
                      <span className="font-mono text-white">{prac.ahpraNumber || prac.registrationNumber || 'MED00021482'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>NDIS Worker Screening ID:</span>
                      <span className="text-teal-400 font-mono font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {prac.workerScreeningId || 'NDIS-WS-8829104'} (Exp: {prac.workerScreeningExpiry || '2028-09-30'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>SCHADS Award Level:</span>
                      <span className="font-mono text-indigo-300">{prac.schadsLevel || 'SCHADS Level 6.1'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Pay Rate &amp; Billable Target:</span>
                      <span className="font-mono text-emerald-400">
                        ${prac.hourlyPayRate || 64}/hr · {prac.billableTargetHours || 26}h/wk target
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT PRACTITIONER
          ===================================================================== */}
      {isPractitionerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingPractitionerId ? 'Edit Practitioner Profile' : 'Create New Company Practitioner'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure clinical discipline, NDIS Worker Screening credentials, SCHADS pay rate, and caseload capacity
                </p>
              </div>
              <button
                onClick={() => setIsPractitionerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePractitioner} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Practitioner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={pracForm.name}
                    onChange={(e) => setPracForm({ ...pracForm, name: e.target.value })}
                    placeholder="e.g. Dr. Hannah Sterling"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Clinical Discipline / Position *</label>
                  <select
                    value={pracForm.position}
                    onChange={(e) => setPracForm({ ...pracForm, position: e.target.value, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Senior Behaviour Support Practitioner">Senior Behaviour Support Practitioner</option>
                    <option value="Core Behaviour Specialist">Core Behaviour Specialist</option>
                    <option value="Occupational Therapist">Occupational Therapist</option>
                    <option value="Speech Pathologist">Speech Pathologist</option>
                    <option value="Developmental Educator">Developmental Educator</option>
                    <option value="Lead Support Coordinator & Intake Specialist">Support Coordinator</option>
                    <option value="Therapy Assistant / Support Worker">Therapy Assistant / Support Worker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={pracForm.email}
                    onChange={(e) => setPracForm({ ...pracForm, email: e.target.value })}
                    placeholder="clinician@breakthroughconsult.com.au"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Mobile Phone</label>
                  <input
                    type="text"
                    value={pracForm.phone}
                    onChange={(e) => setPracForm({ ...pracForm, phone: e.target.value })}
                    placeholder="0411 200 300"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">AHPRA / PBS Registration #</label>
                  <input
                    type="text"
                    value={pracForm.ahpraNumber}
                    onChange={(e) => setPracForm({ ...pracForm, ahpraNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Qualifications</label>
                  <input
                    type="text"
                    value={pracForm.qualification}
                    onChange={(e) => setPracForm({ ...pracForm, qualification: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">NDIS Worker Screening ID</label>
                  <input
                    type="text"
                    value={pracForm.workerScreeningId}
                    onChange={(e) => setPracForm({ ...pracForm, workerScreeningId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">NDIS Screening Expiry Date</label>
                  <input
                    type="date"
                    value={pracForm.workerScreeningExpiry}
                    onChange={(e) => setPracForm({ ...pracForm, workerScreeningExpiry: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Max Participant Caseload</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={pracForm.maxCaseload}
                    onChange={(e) => setPracForm({ ...pracForm, maxCaseload: Number(e.target.value) || 12 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Billable Target (Hrs/Wk)</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={pracForm.billableTargetHours}
                    onChange={(e) => setPracForm({ ...pracForm, billableTargetHours: Number(e.target.value) || 26 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Hourly Pay Rate ($ AUD)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="25"
                    value={pracForm.hourlyPayRate}
                    onChange={(e) => setPracForm({ ...pracForm, hourlyPayRate: Number(e.target.value) || 60 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">SCHADS Award Classification</label>
                <select
                  value={pracForm.schadsLevel}
                  onChange={(e) => setPracForm({ ...pracForm, schadsLevel: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option>SCHADS Level 4.1 (Therapy Assistant / Support Worker)</option>
                  <option>SCHADS Level 4.3 (Support Coordinator)</option>
                  <option>SCHADS Level 5.2 (Allied Health Clinician)</option>
                  <option>SCHADS Level 6.1 (Clinician)</option>
                  <option>SCHADS Level 6.3 (Senior Clinician)</option>
                  <option>SCHADS Level 8.1 (Principal Specialist)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPractitionerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPractitionerId ? 'Save Changes' : 'Create Practitioner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {isAddShiftOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Schedule Roster Shift</h3>
              <button onClick={() => setIsAddShiftOpen(false)} className="text-slate-400 hover:text-white">
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
                      {p.name} ({p.position || p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Active Participant</label>
                <select
                  value={shiftForm.clientId}
                  onChange={(e) => setShiftForm({ ...shiftForm, clientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (NDIS: {c.ndisNumber})
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
                  onClick={() => setIsAddShiftOpen(false)}
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

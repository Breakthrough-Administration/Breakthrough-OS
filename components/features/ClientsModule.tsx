'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client, AttachedDocument } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import { openGoogleDrivePicker, PickedGoogleDriveFile } from '@/lib/googlePicker';
import { GoogleDrivePreviewModal } from './GoogleDrivePreviewModal';
import { BulkParticipantImporter } from './BulkParticipantImporter';
import { GoogleDriveFolderIngestModal } from './GoogleDriveFolderIngestModal';
import { SeventeenHatsModal } from './SeventeenHatsModal';
import {
  Users,
  Search,
  Plus,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Target,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  HardDrive,
  Folder,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Download,
  Eye,
  Check,
  FileSpreadsheet
} from 'lucide-react';

export const ClientsModule: React.FC = () => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    addClient,
    updateClient,
    deleteClient,
    setActiveTab,
    importCompanyParticipants,
    attachDocumentToClient,
    removeDocumentFromClient,
    currentUser,
    addAuditLog
  } = useManagementStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [isBulkImporterOpen, setIsBulkImporterOpen] = useState(false);
  const [isDriveIngestOpen, setIsDriveIngestOpen] = useState(false);
  const [isSeventeenHatsOpen, setIsSeventeenHatsOpen] = useState(false);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AttachedDocument | PickedGoogleDriveFile | null>(null);
  const [activeFolderPick, setActiveFolderPick] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    ndisNumber: '',
    dateOfBirth: '',
    primaryDisability: '',
    status: 'Active',
    contactNumber: '',
    email: '',
    address: '',
    allocatedPractitionerId: 'prac-1',
    emergencyContact: { name: '', relation: '', phone: '' }
  });

  const companyParticipantsCount = clients.filter(
    (c) => c.isCompanyDriveParticipant || c.driveFolderPath
  ).length;

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ndisNumber.includes(search) ||
      c.primaryDisability.toLowerCase().includes(search.toLowerCase()) ||
      (c.driveFolderPath && c.driveFolderPath.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'Company Drive' || filterStatus.startsWith('Company Drive')) {
      return matchesSearch && (c.isCompanyDriveParticipant || !!c.driveFolderPath);
    }
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSyncCompanyParticipants = async () => {
    setIsSyncingDrive(true);
    setSyncSuccessMessage(null);
    try {
      const count = await importCompanyParticipants();
      setSyncSuccessMessage(`Successfully synchronized ${count} participants from Breakthrough Behaviour Support Drive.`);
      setFilterStatus('Company Drive');
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to sync company participants:', err);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleArchiveParticipantDossier = (client: Client) => {
    const archivePath = `Staff Share Drive > Archive > Inactive Participants > ${client.name}`;
    updateClient(client.id, {
      status: 'Archived',
      driveFolderPath: archivePath
    });

    addAuditLog(
      'DRIVE_DOSSIER_ARCHIVED',
      'clients',
      client.id,
      `Drive Dossier Archival: Participant ${client.name} files consolidated and transferred to "${archivePath}". Audit record sealed.`
    );

    setSyncSuccessMessage(
      `Drive Dossier Archival: ${client.name}'s participant folder archived to "${archivePath}". Audit trail permanently logged.`
    );
    setTimeout(() => setSyncSuccessMessage(null), 5000);
  };

  const handleLaunchPickerForFolder = async (folderName?: string) => {
    if (!selectedClient) return;
    setActiveFolderPick(folderName || null);

    const queryTarget = folderName ? `${selectedClient.name} ${folderName}` : selectedClient.name;

    try {
      await openGoogleDrivePicker({
        title: folderName
          ? `Select "${folderName}" for ${selectedClient.name}`
          : `Select Clinical Document for ${selectedClient.name}`,
        query: queryTarget,
        multiSelect: true,
        onPicked: (pickedFiles) => {
          pickedFiles.forEach((file) => {
            const newDoc: AttachedDocument = {
              id: file.id || `doc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              name: file.name,
              url: file.url,
              sizeBytes: file.sizeBytes || 1024 * 45,
              mimeType: file.mimeType,
              uploadedBy: currentUser?.id || 'admin',
              uploadedByName: currentUser?.name || 'Administrator',
              uploadedAt: new Date().toISOString(),
              category: (folderName?.toLowerCase().includes('bsp')
                ? 'bsp'
                : folderName?.toLowerCase().includes('consent')
                ? 'consent'
                : folderName?.toLowerCase().includes('assessment')
                ? 'assessment'
                : 'other') as any,
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              driveFileId: file.id,
              iconUrl: file.iconUrl,
              metadata: {
                folderCategory: folderName || 'General',
                driveFolderPath: selectedClient.driveFolderPath || `Staff Share Drive > Participants > Behaviour Support > ${selectedClient.name}`
              }
            };
            attachDocumentToClient(selectedClient.id, newDoc);
          });
        }
      });
    } catch (err: any) {
      if (!err?.isUserCancelled) {
        console.warn('Google Picker error for participant folder:', err);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ndisNumber) return;

    if (editingClient) {
      updateClient(editingClient.id, formData);
      setEditingClient(null);
    } else {
      addClient(formData);
      setIsAddOpen(false);
    }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
  };

  const currentSubfolders = selectedClient?.driveSubfolders || STANDARD_DRIVE_SUBFOLDERS;
  const clientAttachedDocs = selectedClient?.attachedDocuments || selectedClient?.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white">NDIS Participants</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {clients.length} Total
            </span>
            {companyParticipantsCount > 0 && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-indigo-400" />
                {companyParticipantsCount} Drive Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Breakthrough Behaviour Support caseload records, Google Drive participant vaults, and NDIS allocations
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsDriveIngestOpen(true)}
            className="px-4 py-2 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
            title="Ingest participant folder from Google Drive and extract clinical profile via Gemini 2.5 Flash"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Ingest Drive Folder</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/40 text-slate-950 font-extrabold uppercase tracking-wider">
              Gemini AI
            </span>
          </button>

          <button
            onClick={() => setIsSeventeenHatsOpen(true)}
            className="px-4 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-2"
            title="Synchronize contacts, intake questionnaires, and leads with 17hats"
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span>17hats Sync</span>
          </button>

          <button
            onClick={() => setIsBulkImporterOpen(true)}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
            title="Bulk import participants from CSV or Excel file with field mapping & error validation"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV/Excel</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                name: '',
                ndisNumber: '',
                dateOfBirth: '',
                primaryDisability: '',
                status: 'Active',
                contactNumber: '',
                email: '',
                address: '',
                allocatedPractitionerId: 'prac-1',
                emergencyContact: { name: '', relation: '', phone: '' }
              });
              setIsAddOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" /> New Participant
          </button>
        </div>
      </div>

      {/* Sync Banner Notification */}
      {syncSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSyncSuccessMessage(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by participant name (e.g. Ben Rusic, Reyansh), NDIS #, or diagnosis..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'Company Drive', label: `Company Drive (${companyParticipantsCount})` },
            { id: 'Active', label: 'Active' },
            { id: 'Pending', label: 'Pending' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterStatus === item.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {item.id === 'Company Drive' && <HardDrive className="w-3 h-3 text-indigo-400" />}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: List and Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Participant Cards */}
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-300 font-medium">No live participants found.</p>
              <p className="text-[11px] text-slate-500">
                Import participant clinical folders from your Google Drive or sync contacts from 17hats.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => setIsDriveIngestOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 inline-flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Ingest from Google Drive
                </button>
                <button
                  onClick={() => setIsSeventeenHatsOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 inline-flex items-center justify-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Sync from 17hats CRM
                </button>
              </div>
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              const isDrive = c.isCompanyDriveParticipant || !!c.driveFolderPath;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-teal-950/30 border-teal-500/40 shadow-lg ring-1 ring-teal-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      {c.name}
                      {isDrive && (
                        <span title="Breakthrough Google Drive Linked" className="text-indigo-400">
                          <HardDrive className="w-3 h-3 inline" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        c.status === 'Active'
                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>NDIS #{c.ndisNumber}</span>
                    <span className="text-[10px] font-sans text-slate-500">
                      DOB: {c.dateOfBirth}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-1">{c.primaryDisability}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 truncate max-w-[170px]">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {typeof c.address === 'string'
                          ? c.address
                          : c.address?.suburb
                          ? `${c.address.suburb}, ${c.address.state || 'VIC'}`
                          : c.suburb || 'VIC Metro'}
                      </span>
                    </div>

                    {isDrive ? (
                      <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                        <Folder className="w-3 h-3" /> Drive Vault
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        Budget: ${(c.allocatedBudget || c.totalBudget || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Participant Detail View */}
        {selectedClient && (
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white">{selectedClient.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                    {selectedClient.status}
                  </span>
                  {(selectedClient.isCompanyDriveParticipant || selectedClient.driveFolderPath) && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      Drive Synchronized
                    </span>
                  )}
                  {selectedClient.riskLevel && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        selectedClient.riskLevel === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : selectedClient.riskLevel === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {selectedClient.riskLevel} Risk
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  NDIS ID: {selectedClient.ndisNumber} • DOB: {selectedClient.dateOfBirth} • Primary Practitioner: {selectedClient.primaryPractitionerName || 'Marcus Vance'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleArchiveParticipantDossier(selectedClient)}
                  className="px-3 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Archive participant clinical folder to Google Drive archive with automated audit trail"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Archive Dossier to Drive</span>
                </button>
                <button
                  onClick={() => openEdit(selectedClient)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteClient(selectedClient.id)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                  title="Delete participant record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Google Drive Clinical Vault & 12 Folder Hierarchy */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Google Drive Participant Vault
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          12 Clinical Folders
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <FolderOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-indigo-200">
                          {selectedClient.driveFolderPath || `Staff Share Drive > Participants > Behaviour Support > ${selectedClient.name}`}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={selectedClient.driveFolderUrl || 'https://drive.google.com/drive/u/1/folders/1jd5KeDWRr2-xYf3f2'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in Drive
                      </a>
                      <button
                        onClick={() => handleLaunchPickerForFolder()}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                      >
                        <Search className="w-3 h-3 text-teal-400" /> Picker Search
                      </button>
                    </div>
                  </div>

                  {/* 12 Standard Subfolders Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Folder Structure (Breakthrough Template)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {currentSubfolders.map((folderName) => {
                        const docsInFolder = clientAttachedDocs.filter(
                          (d) =>
                            d.metadata?.folderCategory === folderName ||
                            d.category?.toLowerCase() === folderName.toLowerCase() ||
                            d.name.toLowerCase().includes(folderName.toLowerCase().split(' ')[0])
                        );

                        return (
                          <div
                            key={folderName}
                            onClick={() => handleLaunchPickerForFolder(folderName)}
                            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group space-y-1.5"
                            title={`Click to pick documents for ${folderName}`}
                          >
                            <div className="flex items-center justify-between">
                              <Folder className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                              {docsInFolder.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                                  {docsInFolder.length}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate">
                              {folderName}
                            </p>
                            <span className="text-[9px] text-slate-500 group-hover:text-indigo-300 block">
                              + Link file
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attached Clinical Documents list */}
                  {clientAttachedDocs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Linked Documents ({clientAttachedDocs.length})
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {clientAttachedDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="text-white font-medium truncate">{doc.name}</span>
                              {doc.metadata?.folderCategory && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                  {doc.metadata.folderCategory}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setPreviewDoc(doc);
                                  setPreviewModalOpen(true);
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                title="Preview file"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Open Google Drive link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => removeDocumentFromClient(selectedClient.id, doc.id)}
                                className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                title="Unlink document"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-teal-400" /> Phone
                    </span>
                    <p className="text-xs text-white font-medium">
                      {selectedClient.contactNumber || selectedClient.emergencyContact?.phone || 'Not provided'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-teal-400" /> Nominee Contact
                    </span>
                    <p className="text-xs text-white font-medium truncate">
                      {selectedClient.emergencyContact?.name} ({selectedClient.emergencyContact?.relationship || 'Primary'})
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-teal-400" /> Suburb / Base
                    </span>
                    <p className="text-xs text-white font-medium truncate">
                      {typeof selectedClient.address === 'string'
                        ? selectedClient.address
                        : selectedClient.address?.suburb
                        ? `${selectedClient.address.suburb}, ${selectedClient.address.state || 'VIC'}`
                        : selectedClient.suburb || 'Melbourne, VIC'}
                    </p>
                  </div>
                </div>

                {/* Diagnostic Profile */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Diagnosis &amp; Behaviour Support Needs
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-2">
                    <p className="text-sm font-semibold text-white">{selectedClient.primaryDisability}</p>
                    {selectedClient.secondaryDisabilities && selectedClient.secondaryDisabilities.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Secondary: {selectedClient.secondaryDisabilities.join(', ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 text-teal-300 border border-slate-700">
                        Plan Management: Plan-Managed
                      </span>
                      <span className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 text-teal-300 border border-slate-700">
                        Category: Capacity Building - Relationships (PBS)
                      </span>
                      {selectedClient.restrictivePracticesActive && (
                        <span className="text-[11px] px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                          Restrictive Practices Protocol Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions to Other Clinical Modules */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('ndis-goals')}
                    className="px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Target className="w-4 h-4" /> NDIS Goals Tracker
                  </button>
                  <button
                    onClick={() => setActiveTab('case-notes')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Clinical Case Notes
                  </button>
                  <button
                    onClick={() => setActiveTab('google-workspace')}
                    className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" /> Google Workspace Hub
                  </button>
                </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddOpen || editingClient) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingClient ? 'Edit Participant' : 'New Participant'}
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingClient(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Participant Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">NDIS Number</label>
                  <input
                    type="text"
                    required
                    value={formData.ndisNumber}
                    onChange={(e) => setFormData({ ...formData, ndisNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Primary Disability / Diagnosis</label>
                <input
                  type="text"
                  value={formData.primaryDisability}
                  onChange={(e) => setFormData({ ...formData, primaryDisability: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Home Address / Location</label>
                <input
                  type="text"
                  value={typeof formData.address === 'string' ? formData.address : formData.address?.street || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white"
                >
                  {editingClient ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Preview Modal */}
      {previewModalOpen && previewDoc && (
        <GoogleDrivePreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewDoc(null);
          }}
          document={previewDoc}
          initialClientId={selectedClient?.id}
        />
      )}

      {/* Google Drive Folder Ingest Modal */}
      {isDriveIngestOpen && (
        <GoogleDriveFolderIngestModal
          isOpen={isDriveIngestOpen}
          onClose={() => setIsDriveIngestOpen(false)}
        />
      )}

      {/* 17hats CRM Integration Modal */}
      {isSeventeenHatsOpen && (
        <SeventeenHatsModal
          isOpen={isSeventeenHatsOpen}
          onClose={() => setIsSeventeenHatsOpen(false)}
        />
      )}
    </div>
  );
};


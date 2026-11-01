'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  QuickNoteDoc,
  subscribeToQuickNotes,
  saveQuickNote,
  deleteQuickNote,
  convertQuickNoteToBIRPCaseNote
} from '@/lib/firestoreService';
import {
  StickyNote,
  Plus,
  Check,
  ArrowRight,
  Trash2,
  Tag,
  FileText,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckSquare,
  Square,
  Receipt,
  UserCheck,
  ListTodo,
  Sparkles,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const GoogleKeepModule: React.FC = () => {
  const {
    clients,
    currentUser,
    addCaseNote,
    setActiveTab,
    setSelectedClientId,
    syncKeepNoteToCRMTasks
  } = useManagementStore();

  const [notes, setNotes] = useState<QuickNoteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'scans' | 'clinical' | 'checklists' | 'converted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedClientForNew, setSelectedClientForNew] = useState<string>(clients[0]?.id || '');
  const [newTag, setNewTag] = useState('Clinical Field Observation');
  const [newNoteColor, setNewNoteColor] = useState('bg-slate-900/80 border-slate-800');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // BIRP Conversion Modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [activeNoteToConvert, setActiveNoteToConvert] = useState<QuickNoteDoc | null>(null);
  const [convertClientId, setConvertClientId] = useState<string>(clients[0]?.id || '');
  const [interventionText, setInterventionText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [planText, setPlanText] = useState('');
  const [isSubmittingBIRP, setIsSubmittingBIRP] = useState(false);

  // Subscribe to real-time Firestore quickNotes collection
  useEffect(() => {
    const unsub = subscribeToQuickNotes(
      (docs) => {
        if (docs && docs.length > 0) {
          setNotes(docs);
        } else {
          // Provide default starter quick notes if empty
          const initialStarterNotes: QuickNoteDoc[] = [
            {
              id: 'kn-1',
              title: 'Liam O’Connor - Sensory Observation',
              content: 'Transition from park was smooth using the tactile countdown timer. Remember to share visual schedule with mum.',
              color: 'bg-teal-950/40 border-teal-500/30',
              tag: 'Clinical Field Note',
              date: 'Today, 11:20 AM',
              clientId: 'cli-001',
              clientName: 'Liam O’Connor',
              isConverted: false,
              checklist: [
                { id: 'item-1', text: 'Share printed visual schedule with primary carer', completed: true },
                { id: 'item-2', text: 'Review deep pressure vest sizing with OT', completed: false }
              ]
            },
            {
              id: 'kn-2',
              title: 'NDIS Plan Review Meeting Prep',
              content: 'Extract latest WHODAS score (24/48) and compiled ABC logs to support increased CB Daily Activity hours.',
              color: 'bg-amber-950/40 border-amber-500/30',
              tag: 'Audit & Review',
              date: 'Yesterday',
              clientId: 'cli-002',
              clientName: 'Marcus Sterling',
              isConverted: false,
              checklist: [
                { id: 'item-3', text: 'Export WHODAS 2.0 clinical metrics table', completed: false },
                { id: 'item-4', text: 'Compile 60-day ABC log incident severity summary', completed: false }
              ]
            },
            {
              id: 'kn-3',
              title: 'Equipment check for Marcus Sterling',
              content: 'Check non-slip wheelchair footplate adjustment with OT before next Friday community access session.',
              color: 'bg-purple-950/40 border-purple-500/30',
              tag: 'Allied Health Followup',
              date: '2 days ago',
              clientId: 'cli-002',
              clientName: 'Marcus Sterling',
              isConverted: false
            }
          ];
          setNotes(initialStarterNotes);
          initialStarterNotes.forEach((n) => saveQuickNote(n).catch(() => {}));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Could not subscribe to quickNotes:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tag?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeFilter === 'scans') {
        return (
          n.isScannedDoc ||
          n.tag?.includes('Scan') ||
          n.tag?.includes('Receipt') ||
          n.title.startsWith('[Doc Scan]') ||
          n.receiptAmount !== undefined
        );
      }
      if (activeFilter === 'clinical') {
        return (
          n.tag?.includes('Clinical') ||
          n.tag?.includes('Field') ||
          n.tag?.includes('Observation') ||
          n.tag?.includes('Audit')
        );
      }
      if (activeFilter === 'checklists') {
        return n.checklist && n.checklist.length > 0;
      }
      if (activeFilter === 'converted') {
        return n.isConverted;
      }
      return true;
    });
  }, [notes, activeFilter, searchQuery]);

  const handleAddChecklistField = () => {
    setChecklistItems((prev) => [...prev, '']);
  };

  const handleChecklistChange = (index: number, val: string) => {
    setChecklistItems((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleRemoveChecklistField = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const matchedClient = clients.find((c) => c.id === selectedClientForNew);

    const validChecklist = isChecklistMode
      ? checklistItems
          .filter((text) => text.trim().length > 0)
          .map((text, idx) => ({
            id: `chk-${Date.now()}-${idx}`,
            text: text.trim(),
            completed: false
          }))
      : undefined;

    const note: QuickNoteDoc = {
      id: `kn-${Date.now()}`,
      title: newTitle.trim() || 'Untitled Quick Note',
      content: newContent.trim(),
      color: newNoteColor,
      tag: newTag,
      date: 'Just now',
      clientId: matchedClient?.id || '',
      clientName: matchedClient?.name || '',
      isConverted: false,
      checklist: validChecklist,
      labels: [newTag],
      text: newContent.trim(),
      createdAt: new Date().toISOString()
    };

    setNotes((prev) => [note, ...prev]);
    await saveQuickNote(note).catch((err) => console.warn('Offline note save:', err));

    setNewTitle('');
    setNewContent('');
    setIsChecklistMode(false);
    setChecklistItems(['']);
    setSuccessBanner('Clinical observation saved and synced to Google Keep Firestore collection.');
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteQuickNote(id).catch(() => {});
  };

  const handleToggleChecklistItem = async (noteId: string, itemIdx: number) => {
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId && n.checklist) {
        const nextList = n.checklist.map((item, idx) =>
          idx === itemIdx ? { ...item, completed: !item.completed } : item
        );
        const updated = { ...n, checklist: nextList, updatedAt: new Date().toISOString() };
        saveQuickNote(updated).catch(() => {});
        return updated;
      }
      return n;
    });
    setNotes(updatedNotes);
  };

  const handleSyncToCRM = (note: QuickNoteDoc) => {
    syncKeepNoteToCRMTasks(
      {
        id: note.id,
        title: note.title,
        text: note.content,
        labels: note.labels || [note.tag || 'Clinical'],
        clientId: note.clientId,
        clientName: note.clientName,
        checklist: note.checklist
      },
      {
        assignedTo: currentUser?.name || 'Marcus Vance',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      }
    );

    setSuccessBanner(`Synced checklist items from "${note.title}" into CRM Tasks ledger.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleCopyForKeep = (note: QuickNoteDoc) => {
    let copyText = `${note.title}\n${note.content}`;
    if (note.checklist && note.checklist.length > 0) {
      copyText +=
        '\n\nChecklist:\n' +
        note.checklist.map((c) => `[${c.completed ? 'x' : ' '}] ${c.text}`).join('\n');
    }
    navigator.clipboard?.writeText(copyText);
    setSuccessBanner(`Copied "${note.title}" to clipboard ready to paste into Google Keep.`);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const openConvertModal = (note: QuickNoteDoc) => {
    setActiveNoteToConvert(note);
    setConvertClientId(note.clientId || clients[0]?.id || '');
    setInterventionText(
      `Direct positive reinforcement, tactile scheduling tool, and communication board prompt provided by practitioner.`
    );
    setResponseText(
      `Participant responded positively with calm affect, engaged within 2 minutes of de-escalation prompt.`
    );
    setPlanText(
      `Review proactive environmental modifications with primary carer. Continue PBS plan strategies.`
    );
    setConvertModalOpen(true);
  };

  const handleExecuteConvertBIRP = async () => {
    if (!activeNoteToConvert) return;
    setIsSubmittingBIRP(true);

    const targetClient = clients.find((c) => c.id === convertClientId) || clients[0];

    try {
      const createdNote = await convertQuickNoteToBIRPCaseNote({
        note: activeNoteToConvert,
        clientId: targetClient.id,
        clientName: targetClient.name,
        practitionerId: currentUser?.id || 'prac-1',
        practitionerName: currentUser?.name || 'Principal Clinician',
        interventionText,
        responseText,
        planText
      });

      // Update store
      addCaseNote(createdNote);

      // Update local state note as converted
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNoteToConvert.id
            ? { ...n, isConverted: true, convertedCaseNoteId: createdNote.id, clientName: targetClient.name }
            : n
        )
      );

      setSuccessBanner(
        `Field note converted to formal BIRP Case Note for ${targetClient.name} and attached to client record in Firestore.`
      );
      setConvertModalOpen(false);
      setActiveNoteToConvert(null);
    } catch (err: any) {
      console.error('Error converting quick note to BIRP:', err);
    } finally {
      setIsSubmittingBIRP(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
            <StickyNote className="w-3.5 h-3.5" /> Google Keep Clinical Workspace
          </div>
          <h1 className="text-2xl font-extrabold text-white">Google Keep Clinical Field Sync</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Live voice memos, mobile observations, and participant scanned receipts synced in real-time with Firestore (<code className="text-amber-400">quickNotes</code>), ready to attach as formal BIRP case notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://keep.google.com/"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Google Keep Web</span>
          </a>

          <button
            onClick={() => setActiveTab('participant-portal')}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-950/50"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Participant Scanner</span>
          </button>
        </div>
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

      {/* New Note & Checklist Form */}
      <form
        onSubmit={handleAdd}
        className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Observation or Action Title (e.g. Liam O’Connor - Sensory Transition)..."
            className="flex-1 bg-transparent text-sm font-bold text-white placeholder-slate-500 focus:outline-none"
          />

          <select
            value={selectedClientForNew}
            onChange={(e) => setSelectedClientForNew(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="">Select Participant (Optional)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          rows={2}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Take a clinical note or mobile observation in the field (Behavior / Trigger / Sensory cue)..."
          className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-500 focus:outline-none resize-none"
        />

        {/* Dynamic Checklist Section */}
        {isChecklistMode && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                <ListTodo className="w-4 h-4" /> Checklist Items:
              </span>
              <button
                type="button"
                onClick={handleAddChecklistField}
                className="text-teal-400 hover:text-teal-300 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {checklistItems.map((itemText, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  value={itemText}
                  onChange={(e) => handleChecklistChange(idx, e.target.value)}
                  placeholder={`Action step #${idx + 1}...`}
                  className="flex-1 bg-slate-800/60 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
                {checklistItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistField(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChecklistMode(!isChecklistMode)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                isChecklistMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isChecklistMode ? 'Checklist Active' : 'Add Checklist'}</span>
            </button>

            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none"
            >
              <option value="Clinical Field Observation">Clinical Observation</option>
              <option value="Sensory Routine">Sensory Routine</option>
              <option value="PBS Action Item">PBS Action Item</option>
              <option value="Audit & Review">Audit & Review</option>
              <option value="Receipt / Expense">Receipt / Expense</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40"
          >
            <Plus className="w-4 h-4" /> Save Note
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveFilter('scans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'scans'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Participant Scans ({notes.filter((n) => n.isScannedDoc || n.tag?.includes('Scan')).length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('checklists')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'checklists'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Checklists ({notes.filter((n) => n.checklist && n.checklist.length > 0).length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('clinical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'clinical'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clinical Observations
          </button>
          <button
            onClick={() => setActiveFilter('converted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'converted'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Converted to BIRP
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Keep notes..."
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 min-w-[200px]"
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredNotes.map((note) => {
          const isFromParticipantScan =
            note.isScannedDoc ||
            note.tag?.includes('Scan') ||
            note.tag?.includes('Receipt') ||
            note.title.startsWith('[Doc Scan]');

          return (
            <div
              key={note.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between space-y-3 shadow-md transition-all ${
                note.isConverted
                  ? 'bg-slate-900/40 border-slate-800 opacity-75'
                  : isFromParticipantScan
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : note.color || 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isFromParticipantScan && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Receipt className="w-2.5 h-2.5" /> Scanned Doc
                        </span>
                      )}
                      {note.receiptAmount && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ${note.receiptAmount.toFixed(2)} AUD
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">{note.title}</h3>
                    {note.clientName && (
                      <span className="text-[10px] text-teal-400 font-semibold block">
                        Participant: {note.clientName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyForKeep(note)}
                      className="text-slate-500 hover:text-amber-300 p-1"
                      title="Copy note content for Google Keep"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>

                {/* Checklist rendering if present */}
                {note.checklist && note.checklist.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/80">
                      <span className="font-bold flex items-center gap-1 text-amber-300">
                        <CheckSquare className="w-3 h-3" /> Action Checklist
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSyncToCRM(note)}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
                        title="Push checklist to CRM Tasks"
                      >
                        <ListTodo className="w-3 h-3" /> Sync to CRM
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      {note.checklist.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleChecklistItem(note.id, idx)}
                          className="w-full flex items-start gap-2 text-left group/item"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-amber-400 flex-shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-xs transition-colors ${
                              item.completed
                                ? 'line-through text-slate-500'
                                : 'text-slate-200 group-hover/item:text-white'
                            }`}
                          >
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/40">
                <span className="font-medium text-amber-400/90">{note.tag || 'Field Note'}</span>

                <div className="flex items-center gap-2">
                  {isFromParticipantScan && (
                    <button
                      onClick={() => {
                        if (note.clientId) setSelectedClientId(note.clientId);
                        setActiveTab('participant-portal');
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold flex items-center gap-1"
                    >
                      <span>View in Portal</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {note.isConverted ? (
                    <span className="text-xs text-teal-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Attached as BIRP
                    </span>
                  ) : (
                    <button
                      onClick={() => openConvertModal(note)}
                      className="px-2.5 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 hover:border-teal-500/60 font-bold flex items-center gap-1 transition-all"
                      title="Convert observation to formal BIRP Case Note attached to client file"
                    >
                      <FileText className="w-3 h-3 text-teal-400" />
                      <span>Convert to BIRP</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BIRP Conversion Modal */}
      {convertModalOpen && activeNoteToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Convert Observation to BIRP Case Note</h2>
              </div>
              <button
                onClick={() => setConvertModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Target Participant File</label>
                <select
                  value={convertClientId}
                  onChange={(e) => setConvertClientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (NDIS: {c.ndisNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">B - Behavior (Observed Field Note)</label>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs">
                  {activeNoteToConvert.content}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">I - Intervention (Clinical Strategy)</label>
                <textarea
                  rows={2}
                  value={interventionText}
                  onChange={(e) => setInterventionText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">R - Response (Participant Outcome)</label>
                <textarea
                  rows={2}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">P - Plan (Next Actions & Review)</label>
                <textarea
                  rows={2}
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConvertBIRP}
                disabled={isSubmittingBIRP}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-teal-950/30"
              >
                {isSubmittingBIRP ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Attach BIRP to Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

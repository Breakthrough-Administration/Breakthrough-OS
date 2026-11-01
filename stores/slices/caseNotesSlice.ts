import { StateCreator } from 'zustand';
import { CaseNote } from '@/types';
import {
  createCaseNote as createCaseNoteDoc,
  updateCaseNote as updateCaseNoteDoc,
  deleteCaseNote as deleteCaseNoteDoc
} from '@/lib/firestoreService';
import { CaseNotesSlice, RootStore } from '../types';

export const createCaseNotesSlice: StateCreator<RootStore, [], [], CaseNotesSlice> = (set, get) => ({
  caseNotes: [],

  addCaseNote: (noteData) => {
    const newNote: CaseNote = {
      id: (noteData as CaseNote).id || `note-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...noteData,
    } as CaseNote;

    set((state) => ({ caseNotes: [newNote, ...state.caseNotes] }));
    get().addAuditLog('CREATE', 'CaseNote', newNote.id, `Logged ${newNote.format} case note for ${newNote.clientName}`);

    createCaseNoteDoc(newNote).catch((err) => {
      console.warn('Firestore write failed for addCaseNote, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'CaseNote', newNote.id, newNote);
    });
  },

  updateCaseNote: (id, updates) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      caseNotes: state.caseNotes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt } : n))
    }));
    get().addAuditLog('UPDATE', 'CaseNote', id, `Updated clinical case note`);

    updateCaseNoteDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateCaseNote, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'CaseNote', id, updates);
    });
  },

  deleteCaseNote: (id) => {
    set((state) => ({
      caseNotes: state.caseNotes.filter((n) => n.id !== id)
    }));
    get().addAuditLog('DELETE', 'CaseNote', id, `Deleted clinical case note`);

    deleteCaseNoteDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteCaseNote, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'CaseNote', id, { id });
    });
  }
});

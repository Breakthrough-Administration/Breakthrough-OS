import { StateCreator } from 'zustand';
import { Practitioner, ScheduledShift, NDISSupportItem } from '@/types';
import {
  createPractitioner as createPractitionerDoc,
  updatePractitioner as updatePractitionerDoc,
  deletePractitioner as deletePractitionerDoc,
  createScheduledShift as createScheduledShiftDoc,
  updateScheduledShift as updateScheduledShiftDoc,
  deleteScheduledShift as deleteScheduledShiftDoc
} from '@/lib/firestoreService';
import { INITIAL_PRACTITIONERS, OFFICIAL_2026_NDIS_PRICE_GUIDE } from '@/lib/seedData';
import { HRSlice, RootStore } from '../types';

export const createHRSlice: StateCreator<RootStore, [], [], HRSlice> = (set, get) => ({
  practitioners: INITIAL_PRACTITIONERS,
  scheduledShifts: [],
  supportItems: OFFICIAL_2026_NDIS_PRICE_GUIDE,

  addPractitioner: (practitioner) => {
    set((state) => ({ practitioners: [practitioner, ...state.practitioners] }));
    get().addAuditLog('CREATE', 'Practitioner', practitioner.id, `Added practitioner ${practitioner.name} to HR roster`);

    createPractitionerDoc(practitioner).catch((err) => {
      console.warn('Firestore write failed for addPractitioner, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Practitioner', practitioner.id, practitioner);
    });
  },

  updatePractitioner: (id, updates) => {
    set((state) => ({
      practitioners: state.practitioners.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
    get().addAuditLog('UPDATE', 'Practitioner', id, `Updated practitioner credentials`);

    updatePractitionerDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updatePractitioner, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Practitioner', id, updates);
    });
  },

  deletePractitioner: (id) => {
    set((state) => ({
      practitioners: state.practitioners.filter((p) => p.id !== id)
    }));
    get().addAuditLog('DELETE', 'Practitioner', id, `Removed practitioner from HR roster`);

    deletePractitionerDoc(id).catch((err) => {
      console.warn('Firestore write failed for deletePractitioner, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Practitioner', id, { id });
    });
  },

  addScheduledShift: (shiftData) => {
    const newShift: ScheduledShift = {
      id: (shiftData as ScheduledShift).id || `shift-${Date.now().toString().slice(-4)}`,
      ...shiftData
    } as ScheduledShift;

    set((state) => ({ scheduledShifts: [newShift, ...state.scheduledShifts] }));
    get().addAuditLog('CREATE', 'ScheduledShift', newShift.id, `Scheduled shift for ${newShift.clientName}`);

    createScheduledShiftDoc(newShift).catch((err) => {
      console.warn('Firestore write failed for addScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'ScheduledShift', newShift.id, newShift);
    });
  },

  updateScheduledShift: (id, updates) => {
    set((state) => ({
      scheduledShifts: state.scheduledShifts.map((s) => (s.id === id ? { ...s, ...updates } : s))
    }));
    get().addAuditLog('UPDATE', 'ScheduledShift', id, `Updated scheduled shift`);

    updateScheduledShiftDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'ScheduledShift', id, updates);
    });
  },

  deleteScheduledShift: (id) => {
    set((state) => ({
      scheduledShifts: state.scheduledShifts.filter((s) => s.id !== id)
    }));
    get().addAuditLog('DELETE', 'ScheduledShift', id, `Removed scheduled shift`);

    deleteScheduledShiftDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'ScheduledShift', id, { id });
    });
  }
});

import { StateCreator } from 'zustand';
import { Practitioner, ScheduledShift, NDISSupportItem, CompanyDocument } from '@/types';
import {
  createPractitioner as createPractitionerDoc,
  updatePractitioner as updatePractitionerDoc,
  deletePractitioner as deletePractitionerDoc,
  createScheduledShift as createScheduledShiftDoc,
  updateScheduledShift as updateScheduledShiftDoc,
  deleteScheduledShift as deleteScheduledShiftDoc,
  createCompanyDocument as createCompanyDocumentDoc,
  updateCompanyDocument as updateCompanyDocumentDoc,
  deleteCompanyDocument as deleteCompanyDocumentDoc
} from '@/lib/firestoreService';
import {
  INITIAL_PRACTITIONERS,
  OFFICIAL_2026_NDIS_PRICE_GUIDE,
  INITIAL_COMPANY_DOCUMENTS
} from '@/lib/seedData';
import { HRSlice, RootStore } from '../types';

export const createHRSlice: StateCreator<RootStore, [], [], HRSlice> = (set, get) => ({
  practitioners: INITIAL_PRACTITIONERS,
  scheduledShifts: [],
  supportItems: OFFICIAL_2026_NDIS_PRICE_GUIDE,
  companyDocuments: INITIAL_COMPANY_DOCUMENTS,

  addPractitioner: (practitioner) => {
    set((state) => {
      const exists = state.practitioners.some((p) => p.id === practitioner.id);
      return {
        practitioners: exists
          ? state.practitioners.map((p) => (p.id === practitioner.id ? practitioner : p))
          : [practitioner, ...state.practitioners]
      };
    });
    get().addAuditLog('CREATE', 'Practitioner', practitioner.id, `Added practitioner ${practitioner.name} (${practitioner.position}) to HR roster`);

    createPractitionerDoc(practitioner).catch((err) => {
      console.warn('Firestore write failed for addPractitioner, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Practitioner', practitioner.id, practitioner);
    });
  },

  updatePractitioner: (id, updates) => {
    set((state) => ({
      practitioners: state.practitioners.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
    get().addAuditLog('UPDATE', 'Practitioner', id, `Updated practitioner credentials & caseload parameters`);

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
  },

  addCompanyDocument: (docData) => {
    set((state) => {
      const exists = state.companyDocuments.some((d) => d.id === docData.id);
      return {
        companyDocuments: exists
          ? state.companyDocuments.map((d) => (d.id === docData.id ? docData : d))
          : [docData, ...state.companyDocuments]
      };
    });
    get().addAuditLog(
      'CREATE',
      'CompanyDocument',
      docData.id,
      `Uploaded company document "${docData.title}" (${docData.category})`
    );

    createCompanyDocumentDoc(docData).catch((err) => {
      console.warn('Firestore write failed for addCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'CompanyDocument', docData.id, docData);
    });
  },

  updateCompanyDocument: (id, updates) => {
    set((state) => ({
      companyDocuments: state.companyDocuments.map((d) => (d.id === id ? { ...d, ...updates } : d))
    }));
    get().addAuditLog('UPDATE', 'CompanyDocument', id, `Updated company document metadata`);

    updateCompanyDocumentDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'CompanyDocument', id, updates);
    });
  },

  deleteCompanyDocument: (id) => {
    set((state) => ({
      companyDocuments: state.companyDocuments.filter((d) => d.id !== id)
    }));
    get().addAuditLog('DELETE', 'CompanyDocument', id, `Deleted company document from vault`);

    deleteCompanyDocumentDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'CompanyDocument', id, { id });
    });
  }
});

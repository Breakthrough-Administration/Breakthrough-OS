import { StateCreator } from 'zustand';
import { RestrictivePractice, ABCLog, BSPDocument } from '@/types';
import {
  createRestrictivePractice as createRestrictivePracticeDoc,
  updateRestrictivePractice as updateRestrictivePracticeDoc,
  deleteRestrictivePractice as deleteRestrictivePracticeDoc,
  createABCLog as createABCLogDoc,
  updateABCLog as updateABCLogDoc,
  deleteABCLog as deleteABCLogDoc,
  createBSPDocument as createBSPDocumentDoc,
  updateBSPDocument as updateBSPDocumentDoc,
  deleteBSPDocument as deleteBSPDocumentDoc
} from '@/lib/firestoreService';
import { ComplianceSlice, RootStore } from '../types';

export const createComplianceSlice: StateCreator<RootStore, [], [], ComplianceSlice> = (set, get) => ({
  restrictivePractices: [],
  abcLogs: [],
  bsp: null as any,
  bspPlans: [],
  bspDocuments: [],

  addRestrictivePractice: (practiceData) => {
    const newPractice: RestrictivePractice = {
      id: (practiceData as RestrictivePractice).id || `rp-${Date.now().toString().slice(-4)}`,
      ...practiceData
    } as RestrictivePractice;

    set((state) => ({
      restrictivePractices: [newPractice, ...state.restrictivePractices]
    }));
    get().addAuditLog('CREATE', 'RestrictivePractice', newPractice.id, `Lodged ${newPractice.practiceType} restriction for ${newPractice.clientName}`);

    createRestrictivePracticeDoc(newPractice).catch((err) => {
      console.warn('Firestore write failed for addRestrictivePractice, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'RestrictivePractice', newPractice.id, newPractice);
    });
  },

  updateRestrictivePractice: (id, updates) => {
    set((state) => ({
      restrictivePractices: state.restrictivePractices.map((rp) => (rp.id === id ? { ...rp, ...updates } : rp))
    }));
    get().addAuditLog('UPDATE', 'RestrictivePractice', id, `Updated restrictive practice governance record`);

    updateRestrictivePracticeDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateRestrictivePractice, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'RestrictivePractice', id, updates);
    });
  },

  deleteRestrictivePractice: (id) => {
    set((state) => ({
      restrictivePractices: state.restrictivePractices.filter((rp) => rp.id !== id)
    }));
    get().addAuditLog('DELETE', 'RestrictivePractice', id, `Removed restrictive practice record`);

    deleteRestrictivePracticeDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteRestrictivePractice, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'RestrictivePractice', id, { id });
    });
  },

  addABCLog: (logData) => {
    const newLog: ABCLog = {
      id: (logData as ABCLog).id || `abc-${Date.now().toString().slice(-4)}`,
      ...logData
    } as ABCLog;

    set((state) => ({ abcLogs: [newLog, ...state.abcLogs] }));
    get().addAuditLog('CREATE', 'ABCLog', newLog.id, `Logged ABC behavior event for ${newLog.clientName}`);

    createABCLogDoc(newLog).catch((err) => {
      console.warn('Firestore write failed for addABCLog, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'ABCLog', newLog.id, newLog);
    });
  },

  updateAbcLog: (id, updates) => {
    set((state) => ({
      abcLogs: state.abcLogs.map((log) => (log.id === id ? { ...log, ...updates } : log))
    }));
    get().addAuditLog('UPDATE', 'ABCLog', id, `Updated ABC behavior observation log`);

    updateABCLogDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateAbcLog, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'ABCLog', id, updates);
    });
  },

  deleteABCLog: (id) => {
    set((state) => ({
      abcLogs: state.abcLogs.filter((log) => log.id !== id)
    }));
    get().addAuditLog('DELETE', 'ABCLog', id, `Deleted ABC behavior log`);

    deleteABCLogDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteABCLog, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'ABCLog', id, { id });
    });
  },

  updateBSP: (updates) => {
    const lastUpdated = new Date().toISOString();
    const currentBspId = get().bsp?.id || 'bsp-901';
    const updatedBsp = { ...get().bsp, ...updates, lastUpdated };
    set((state) => ({
      bsp: updatedBsp,
      bspPlans: state.bspPlans.map((p) => (p.id === updatedBsp.id ? updatedBsp : p)),
      bspDocuments: state.bspDocuments.map((d) => (d.id === updatedBsp.id ? updatedBsp : d))
    }));
    get().addAuditLog('UPDATE', 'BSP', currentBspId, `Updated Behaviour Support Plan`);

    updateBSPDocumentDoc(currentBspId, updates).catch((err) => {
      console.warn('Firestore write failed for updateBSP, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'BSPDocument', currentBspId, updates);
    });
  },

  addBSPPlan: (bspData) => {
    const bsp: BSPDocument = {
      id: (bspData as BSPDocument).id || `bsp-${Date.now().toString().slice(-4)}`,
      lastUpdated: (bspData as BSPDocument).lastUpdated || new Date().toISOString(),
      ...bspData
    } as BSPDocument;
    set((state) => ({
      bspPlans: [bsp, ...state.bspPlans],
      bspDocuments: [bsp, ...(state.bspDocuments || [])],
      bsp
    }));
    get().addAuditLog('CREATE', 'BSP', bsp.id, `Registered Behaviour Support Plan v${bsp.version}`);

    createBSPDocumentDoc(bsp).catch((err) => {
      console.warn('Firestore write failed for addBSPPlan, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'BSPDocument', bsp.id, bsp);
    });
  },

  addBSPDocument: (bspData) => {
    get().addBSPPlan(bspData);
  },

  updateBspDocument: (id, updates) => {
    const lastUpdated = new Date().toISOString();
    set((state) => ({
      bspDocuments: state.bspDocuments.map((d) => (d.id === id ? { ...d, ...updates, lastUpdated } : d)),
      bspPlans: state.bspPlans.map((p) => (p.id === id ? { ...p, ...updates, lastUpdated } : p)),
      bsp: state.bsp?.id === id ? { ...state.bsp, ...updates, lastUpdated } : state.bsp
    }));
    get().addAuditLog('UPDATE', 'BSPDocument', id, `Updated Behaviour Support Plan`);

    updateBSPDocumentDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateBspDocument, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'BSPDocument', id, updates);
    });
  },

  updateBSPDocument: (id, updates) => {
    get().updateBspDocument(id, updates);
  },

  deleteBSPDocument: (id) => {
    set((state) => ({
      bspDocuments: state.bspDocuments.filter((d) => d.id !== id),
      bspPlans: state.bspPlans.filter((p) => p.id !== id)
    }));
    get().addAuditLog('DELETE', 'BSPDocument', id, `Removed Behaviour Support Plan`);

    deleteBSPDocumentDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteBSPDocument, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'BSPDocument', id, { id });
    });
  }
});

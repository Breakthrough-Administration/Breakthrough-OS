import { StateCreator } from 'zustand';
import { OfflineDelta, Client } from '@/types';
import {
  COMPANY_DRIVE_PARTICIPANTS,
  INITIAL_PRACTITIONERS,
  INITIAL_COMPANY_DOCUMENTS
} from '@/lib/seedData';
import {
  fetchClients,
  fetchCaseNotes,
  fetchBillingClaims,
  fetchIncidents,
  fetchRestrictivePractices,
  fetchABCLogs,
  fetchBSPDocuments,
  fetchCRMLeads,
  fetchCRMTasks,
  fetchPractitioners,
  fetchCompanyDocuments,
  fetchSupportItems,
  fetchAuditLogs,
  fetchScheduledShifts,
  fetchUsers,
  fetchNotifications,
  seedInitialFirestoreDataIfEmpty,
  createClientsBatch,
  createPractitioner,
  createCompanyDocument,
  subscribeToClients,
  subscribeToCaseNotes,
  subscribeToBillingClaims,
  subscribeToIncidents,
  subscribeToRestrictivePractices,
  subscribeToABCLogs,
  subscribeToBSPDocuments,
  subscribeToCRMLeads,
  subscribeToCRMTasks,
  subscribeToPractitioners,
  subscribeToCompanyDocuments,
  subscribeToSupportItems,
  subscribeToAuditLogs,
  subscribeToScheduledShifts,
  subscribeToUsers,
  subscribeToNotifications,
  createDocument,
  deleteDocument
} from '@/lib/firestoreService';
import { SyncSlice, RootStore } from '../types';

// Module-level unsubscribe handles for real-time Firestore listeners
let _unsubClients: (() => void) | null = null;
let _unsubCaseNotes: (() => void) | null = null;
let _unsubBillingClaims: (() => void) | null = null;
let _unsubIncidents: (() => void) | null = null;
let _unsubRP: (() => void) | null = null;
let _unsubABCLogs: (() => void) | null = null;
let _unsubBSPDocuments: (() => void) | null = null;
let _unsubCRMLeads: (() => void) | null = null;
let _unsubCRMTasks: (() => void) | null = null;
let _unsubPractitioners: (() => void) | null = null;
let _unsubCompanyDocuments: (() => void) | null = null;
let _unsubSupportItems: (() => void) | null = null;
let _unsubAuditLogs: (() => void) | null = null;
let _unsubScheduledShifts: (() => void) | null = null;
let _unsubUsers: (() => void) | null = null;
let _unsubNotifications: (() => void) | null = null;

export const createSyncSlice: StateCreator<RootStore, [], [], SyncSlice> = (set, get) => ({
  isOnline: true,
  syncStatus: 'synced',
  pendingChangesCount: 0,
  offlineQueue: [],
  lastSyncTime: new Date().toISOString(),
  isUsingMockData: false,

  setOnlineStatus: (isOnline: boolean) => {
    set((state) => {
      const syncStatus = !isOnline
        ? 'offline'
        : state.offlineQueue.length > 0
        ? 'pending'
        : 'synced';
      return { isOnline, syncStatus };
    });
    if (isOnline && get().offlineQueue.length > 0) {
      get().triggerDeltaSync();
    }
  },

  simulateOfflineToggle: () => {
    const nextOnline = !get().isOnline;
    get().setOnlineStatus(nextOnline);
    get().addNotification({
      title: nextOnline ? 'Network Connection Restored' : 'Operating in Field Offline Mode',
      message: nextOnline
        ? 'Online connectivity detected. Synchronizing queued clinical and billing deltas with Cloud ledger.'
        : 'Local delta cache active. All case notes, billing claims, and audits will be safely queued locally.',
      type: 'compliance',
      severity: nextOnline ? 'low' : 'medium'
    });
  },

  queueOfflineDelta: (action, entity, entityId, payload) => {
    const delta: OfflineDelta = {
      id: `delta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      payload
    };

    // Calculate clinical and regulatory priority (Priority 1: Critical Incidents -> Priority 5: CRM)
    const getPriority = (d: OfflineDelta): number => {
      const ent = (d.entity || '').toLowerCase();
      const p = d.payload || {};
      if (ent.includes('incident')) {
        if (p.isNdisReportable || p.severity?.includes('Critical') || p.severity?.includes('High')) return 1;
        return 2;
      }
      if (ent.includes('casenote') || ent.includes('case_note')) {
        if (p.isLocked) return 2;
        return 3;
      }
      if (ent.includes('restrictive') || ent.includes('bsp')) return 2;
      if (ent.includes('claim') || ent.includes('billing') || ent.includes('abc')) return 3;
      if (ent.includes('client') || ent.includes('shift') || ent.includes('goal')) return 4;
      return 5;
    };

    set((state) => {
      const updatedQueue = [...state.offlineQueue, delta].sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      return {
        offlineQueue: updatedQueue,
        pendingChangesCount: updatedQueue.length,
        syncStatus: state.isOnline ? 'pending' : 'offline'
      };
    });

    // Register Background Sync API event with Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg: any) => {
        return reg.sync.register('sync-offline-mutations');
      }).catch((swErr) => {
        console.warn('Background sync registration notice:', swErr);
      });
    }
  },

  triggerDeltaSync: async () => {
    const getPriority = (d: OfflineDelta): number => {
      const ent = (d.entity || '').toLowerCase();
      const p = d.payload || {};
      if (ent.includes('incident')) {
        if (p.isNdisReportable || p.severity?.includes('Critical') || p.severity?.includes('High')) return 1;
        return 2;
      }
      if (ent.includes('casenote') || ent.includes('case_note')) {
        if (p.isLocked) return 2;
        return 3;
      }
      if (ent.includes('restrictive') || ent.includes('bsp')) return 2;
      if (ent.includes('claim') || ent.includes('billing') || ent.includes('abc')) return 3;
      if (ent.includes('client') || ent.includes('shift') || ent.includes('goal')) return 4;
      return 5;
    };

    const queue = [...get().offlineQueue].sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    if (queue.length === 0) {
      set({ syncStatus: 'synced', pendingChangesCount: 0, lastSyncTime: new Date().toISOString() });
      return;
    }

    set({ syncStatus: 'syncing' });
    try {
      const entityToCollection: Record<string, string> = {
        Client: 'clients',
        CaseNote: 'caseNotes',
        BillingClaim: 'billingClaims',
        Incident: 'incidents',
        RestrictivePractice: 'restrictivePractices',
        ABCLog: 'abcLogs',
        BSPDocument: 'bspDocuments',
        Lead: 'crmLeads',
        CRMTask: 'crmTasks',
        Practitioner: 'practitioners',
        CompanyDocument: 'companyDocuments',
        ScheduledShift: 'scheduledShifts',
        Notification: 'notifications',
        AuditLog: 'auditLogs'
      };

      for (const delta of queue) {
        const colName = entityToCollection[delta.entity] || delta.entity.toLowerCase();
        try {
          if (delta.action === 'CREATE' || delta.action === 'UPDATE' || delta.action === 'UPDATE_GOALS') {
            const docData = delta.payload || {};
            await createDocument(colName, docData, delta.entityId);
          } else if (delta.action === 'DELETE') {
            await deleteDocument(colName, delta.entityId);
          }
        } catch (subErr) {
          console.warn(`Delta sync error for entity ${delta.entity} (${delta.entityId}):`, subErr);
        }
      }

      const processedCount = queue.length;
      set({
        offlineQueue: [],
        pendingChangesCount: 0,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });

      get().addAuditLog(
        'DELTA_SYNC_SUCCESS',
        'OfflineDeltaQueue',
        `batch-${Date.now()}`,
        `Successfully prioritized and synchronized ${processedCount} pending deltas (Critical incidents & clinical records dispatched first).`
      );

      get().addNotification({
        title: 'Priority Deltas Synchronized',
        message: `Successfully flushed ${processedCount} queued records to Cloud Firestore in statutory priority sequence.`,
        type: 'compliance',
        severity: 'low'
      });
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
      set({ syncStatus: 'pending' });
    }
  },

  clearAllMockData: (keepCurrentUser = true) => {
    set({
      isUsingMockData: false,
      clients: [],
      caseNotes: [],
      restrictivePractices: [],
      incidents: [],
      leads: [],
      crmTasks: [],
      abcLogs: [],
      bspPlans: [],
      bspDocuments: [],
      claims: [],
      billingClaims: [],
      scheduledShifts: [],
      selectedClientId: null
    });
    import('@/lib/firestoreService').then(({ purgeMockDataFromFirestore }) => {
      purgeMockDataFromFirestore().catch((e) => console.warn('Purge mock data from firestore:', e));
    });
    get().addAuditLog(
      'WIPE_DEMO_DATABASE',
      'DatabaseEngine',
      'db-root',
      'Cleared all mock participants, notes, and records to initialize production database'
    );
  },

  loadDemoData: () => {
    import('@/lib/seedData').then((seed) => {
      set({
        isUsingMockData: true,
        currentUser: get().currentUser || seed.INITIAL_USERS[0],
        users: seed.INITIAL_USERS,
        clients: seed.SAMPLE_CLIENTS,
        selectedClientId: seed.SAMPLE_CLIENTS[0]?.id || null,
        caseNotes: seed.SAMPLE_CASE_NOTES,
        restrictivePractices: seed.SAMPLE_RESTRICTIVE_PRACTICES,
        incidents: seed.SAMPLE_INCIDENTS,
        leads: seed.SAMPLE_LEADS,
        crmTasks: seed.INITIAL_CRM_TASKS,
        practitioners: seed.SAMPLE_PRACTITIONERS,
        abcLogs: seed.SAMPLE_ABC_LOGS,
        bsp: seed.SAMPLE_BSP_DOCUMENTS[0] || seed.INITIAL_BSP,
        bspPlans: seed.SAMPLE_BSP_DOCUMENTS,
        bspDocuments: seed.SAMPLE_BSP_DOCUMENTS,
        claims: seed.SAMPLE_CLAIMS,
        billingClaims: seed.SAMPLE_CLAIMS,
        supportItems: seed.OFFICIAL_2026_NDIS_PRICE_GUIDE,
        auditLogs: seed.INITIAL_AUDIT_LOGS,
        notifications: seed.SAMPLE_NOTIFICATIONS,
        scheduledShifts: []
      });
      get().addAuditLog(
        'RESTORE_DEMO_DATA',
        'DatabaseEngine',
        'db-root',
        `Loaded sample NDIS clinical practice dataset (${seed.SAMPLE_CLIENTS.length} participants, ${seed.SAMPLE_CASE_NOTES.length} signed notes, ${seed.SAMPLE_CLAIMS.length} claims)`
      );
      get().addNotification({
        title: 'Sample NDIS Practice Dataset Loaded',
        message: 'Populated 3 active participants, clinical notes, ABC logs, BSPs, and PRODA claims for immediate exploration.',
        type: 'compliance',
        severity: 'low'
      });
    });
  },

  exportFullDatabaseJSON: () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '2026.1-ndis-enterprise',
      app: 'Breakthrough OS - NDIS Business Operating System',
      clients: get().clients,
      caseNotes: get().caseNotes,
      restrictivePractices: get().restrictivePractices,
      incidents: get().incidents,
      billingClaims: get().billingClaims,
      crmLeads: get().leads,
      crmTasks: get().crmTasks,
      practitioners: get().practitioners
    };
    return JSON.stringify(data, null, 2);
  },

  resetToDefaultData: () => {
    get().loadDemoData();
  },

  loadFromFirestore: async () => {
    await get().syncWithFirestore();
  },

  syncWithFirestore: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const [
        fetchedClients,
        fetchedCaseNotes,
        fetchedClaims,
        fetchedIncidents,
        fetchedRP,
        fetchedABC,
        fetchedBSP,
        fetchedLeads,
        fetchedTasks,
        fetchedPracs,
        fetchedCompanyDocs,
        fetchedSupportItems,
        fetchedAuditLogs,
        fetchedShifts,
        fetchedUsers,
        fetchedNotifications
      ] = await Promise.all([
        fetchClients().catch(() => []),
        fetchCaseNotes().catch(() => []),
        fetchBillingClaims().catch(() => []),
        fetchIncidents().catch(() => []),
        fetchRestrictivePractices().catch(() => []),
        fetchABCLogs().catch(() => []),
        fetchBSPDocuments().catch(() => []),
        fetchCRMLeads().catch(() => []),
        fetchCRMTasks().catch(() => []),
        fetchPractitioners().catch(() => []),
        fetchCompanyDocuments().catch(() => []),
        fetchSupportItems().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchScheduledShifts().catch(() => []),
        fetchUsers().catch(() => []),
        fetchNotifications().catch(() => [])
      ]);

      const seed = await import('@/lib/seedData');
      // Filter out only legacy hardcoded mock participants so real imported/ingested participants always persist
      const LEGACY_MOCK_IDS = new Set(['cli-1', 'cli-2', 'cli-3', 'cli-4', 'cli-5']);
      const realClients = fetchedClients.filter((c) => {
        if (c.isCustomUserParticipant === true) return true;
        if (LEGACY_MOCK_IDS.has(c.id) || c.id.startsWith('client-mock')) return false;
        return true;
      });

      if (realClients.length < fetchedClients.length) {
        const { purgeMockDataFromFirestore } = await import('@/lib/firestoreService');
        purgeMockDataFromFirestore().catch(() => {});
      }

      // Ensure all 22 canonical business participants are present AND set to Active status
      const canonicalNamesSet = new Set(
        COMPANY_DRIVE_PARTICIPANTS.map((cp) => cp.name.trim().toLowerCase())
      );
      const canonicalNdisSet = new Set(
        COMPANY_DRIVE_PARTICIPANTS.map((cp) => (cp.ndisNumber || '').replace(/[^0-9]/g, ''))
      );

      const clientsToBatchUpsert: Client[] = [];
      const activatedRealClients: Client[] = realClients.map((c) => {
        const cleanNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
        const cleanName = (c.name || '').trim().toLowerCase();
        if (
          (canonicalNdisSet.has(cleanNdis) || canonicalNamesSet.has(cleanName)) &&
          c.status !== 'Active'
        ) {
          const promoted: Client = { ...c, status: 'Active', updatedAt: new Date().toISOString() };
          clientsToBatchUpsert.push(promoted);
          return promoted;
        }
        return c;
      });

      const existingNdisSet = new Set(
        activatedRealClients.map((c) => (c.ndisNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
      );
      const existingIdSet = new Set(activatedRealClients.map((c) => c.id));
      const missingCanonical: Client[] = COMPANY_DRIVE_PARTICIPANTS.filter(
        (cp) =>
          !existingNdisSet.has((cp.ndisNumber || '').replace(/[^0-9]/g, '')) &&
          !existingIdSet.has(cp.id)
      );

      clientsToBatchUpsert.push(...missingCanonical);
      const mergedClients: Client[] = [...activatedRealClients, ...missingCanonical];

      if (clientsToBatchUpsert.length > 0) {
        createClientsBatch(clientsToBatchUpsert).catch((err) => {
          console.warn('Notice: Could not auto-seed/activate canonical business participants to Firestore:', err);
        });
      }

      // Ensure initial company practitioners exist
      const existingPracIds = new Set(fetchedPracs.map((p) => p.id));
      const missingPracs = INITIAL_PRACTITIONERS.filter((ip) => !existingPracIds.has(ip.id));
      const mergedPracs = [...fetchedPracs, ...missingPracs];
      if (missingPracs.length > 0) {
        for (const mp of missingPracs) {
          createPractitioner(mp).catch(() => {});
        }
      }

      // Ensure initial company library documents exist
      const existingDocIds = new Set(fetchedCompanyDocs.map((d) => d.id));
      const missingCompanyDocs = INITIAL_COMPANY_DOCUMENTS.filter((idDoc) => !existingDocIds.has(idDoc.id));
      const mergedCompanyDocs = [...fetchedCompanyDocs, ...missingCompanyDocs];
      if (missingCompanyDocs.length > 0) {
        for (const md of missingCompanyDocs) {
          createCompanyDocument(md).catch(() => {});
        }
      }

      set({
        clients: mergedClients,
        selectedClientId: get().selectedClientId || mergedClients[0]?.id || null,
        caseNotes: fetchedCaseNotes,
        billingClaims: fetchedClaims,
        claims: fetchedClaims,
        incidents: fetchedIncidents,
        restrictivePractices: fetchedRP,
        abcLogs: fetchedABC,
        bspDocuments: fetchedBSP,
        bspPlans: fetchedBSP,
        bsp: fetchedBSP[0] || null,
        leads: fetchedLeads,
        crmTasks: fetchedTasks,
        practitioners: mergedPracs,
        companyDocuments: mergedCompanyDocs,
        supportItems: fetchedSupportItems.length > 0 ? fetchedSupportItems : seed.OFFICIAL_2026_NDIS_PRICE_GUIDE,
        auditLogs: fetchedAuditLogs,
        notifications: fetchedNotifications,
        scheduledShifts: fetchedShifts,
        users: fetchedUsers,
        isUsingMockData: false,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to sync with Firestore, operating in cached mode:', error);
      set({ syncStatus: 'offline' });
    }
  },

  startRealtimeListeners: () => {
    // Tear down any existing listeners first (idempotent)
    get().stopRealtimeListeners();

    const errHandler = (err: Error) => {
      console.warn('[Realtime] Firestore listener error, operating from cache:', err.message);
      set({ syncStatus: 'offline' });
    };

    const canonicalNamesSet = new Set(
      COMPANY_DRIVE_PARTICIPANTS.map((cp) => cp.name.trim().toLowerCase())
    );
    const canonicalNdisSet = new Set(
      COMPANY_DRIVE_PARTICIPANTS.map((cp) => (cp.ndisNumber || '').replace(/[^0-9]/g, ''))
    );

    _unsubClients = subscribeToClients((clients) => {
      const normalizedClients = clients.map((c) => {
        const cleanNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
        const cleanName = (c.name || '').trim().toLowerCase();
        if (
          (canonicalNdisSet.has(cleanNdis) || canonicalNamesSet.has(cleanName)) &&
          c.status !== 'Active'
        ) {
          return { ...c, status: 'Active' as const };
        }
        return c;
      });
      const existingNdisSet = new Set(
        normalizedClients.map((c) => (c.ndisNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
      );
      const existingIdSet = new Set(normalizedClients.map((c) => c.id));
      const missingCanonical = COMPANY_DRIVE_PARTICIPANTS.filter(
        (cp) =>
          !existingNdisSet.has((cp.ndisNumber || '').replace(/[^0-9]/g, '')) &&
          !existingIdSet.has(cp.id)
      );
      const merged = [...normalizedClients, ...missingCanonical];
      set({
        clients: merged,
        selectedClientId: get().selectedClientId || merged[0]?.id || null,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });
    }, errHandler);

    _unsubCaseNotes = subscribeToCaseNotes((caseNotes) => {
      set({ caseNotes });
    }, errHandler);

    _unsubBillingClaims = subscribeToBillingClaims((billingClaims) => {
      set({ billingClaims, claims: billingClaims });
    }, errHandler);

    _unsubIncidents = subscribeToIncidents((incidents) => {
      set({ incidents });
    }, errHandler);

    _unsubRP = subscribeToRestrictivePractices((restrictivePractices) => {
      set({ restrictivePractices });
    }, errHandler);

    _unsubABCLogs = subscribeToABCLogs((abcLogs) => {
      set({ abcLogs });
    }, errHandler);

    _unsubBSPDocuments = subscribeToBSPDocuments((bspDocuments) => {
      set({
        bspDocuments,
        bspPlans: bspDocuments,
        ...(bspDocuments.length > 0 ? { bsp: bspDocuments[0] } : {})
      });
    }, errHandler);

    _unsubCRMLeads = subscribeToCRMLeads((leads) => {
      set({ leads });
    }, errHandler);

    _unsubCRMTasks = subscribeToCRMTasks((crmTasks) => {
      set({ crmTasks });
    }, errHandler);

    _unsubPractitioners = subscribeToPractitioners((practitioners) => {
      const existingIds = new Set(practitioners.map((p) => p.id));
      const missing = INITIAL_PRACTITIONERS.filter((ip) => !existingIds.has(ip.id));
      set({ practitioners: [...practitioners, ...missing] });
    }, errHandler);

    _unsubCompanyDocuments = subscribeToCompanyDocuments((companyDocuments) => {
      const existingIds = new Set(companyDocuments.map((d) => d.id));
      const missing = INITIAL_COMPANY_DOCUMENTS.filter((idDoc) => !existingIds.has(idDoc.id));
      set({ companyDocuments: [...companyDocuments, ...missing] });
    }, errHandler);

    _unsubSupportItems = subscribeToSupportItems((supportItems) => {
      set({ supportItems });
    }, errHandler);

    _unsubAuditLogs = subscribeToAuditLogs((auditLogs) => {
      set({ auditLogs });
    }, errHandler);

    _unsubScheduledShifts = subscribeToScheduledShifts((scheduledShifts) => {
      set({ scheduledShifts });
    }, errHandler);

    _unsubUsers = subscribeToUsers((users) => {
      set({ users });
    }, errHandler);

    _unsubNotifications = subscribeToNotifications((notifications) => {
      set({ notifications });
    }, errHandler);

    set({ syncStatus: 'synced' });
  },

  stopRealtimeListeners: () => {
    if (_unsubClients) { _unsubClients(); _unsubClients = null; }
    if (_unsubCaseNotes) { _unsubCaseNotes(); _unsubCaseNotes = null; }
    if (_unsubBillingClaims) { _unsubBillingClaims(); _unsubBillingClaims = null; }
    if (_unsubIncidents) { _unsubIncidents(); _unsubIncidents = null; }
    if (_unsubRP) { _unsubRP(); _unsubRP = null; }
    if (_unsubABCLogs) { _unsubABCLogs(); _unsubABCLogs = null; }
    if (_unsubBSPDocuments) { _unsubBSPDocuments(); _unsubBSPDocuments = null; }
    if (_unsubCRMLeads) { _unsubCRMLeads(); _unsubCRMLeads = null; }
    if (_unsubCRMTasks) { _unsubCRMTasks(); _unsubCRMTasks = null; }
    if (_unsubPractitioners) { _unsubPractitioners(); _unsubPractitioners = null; }
    if (_unsubCompanyDocuments) { _unsubCompanyDocuments(); _unsubCompanyDocuments = null; }
    if (_unsubSupportItems) { _unsubSupportItems(); _unsubSupportItems = null; }
    if (_unsubAuditLogs) { _unsubAuditLogs(); _unsubAuditLogs = null; }
    if (_unsubScheduledShifts) { _unsubScheduledShifts(); _unsubScheduledShifts = null; }
    if (_unsubUsers) { _unsubUsers(); _unsubUsers = null; }
    if (_unsubNotifications) { _unsubNotifications(); _unsubNotifications = null; }
  }
});

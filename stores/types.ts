import { User } from 'firebase/auth';
import {
  UserProfile,
  UserRole,
  Client,
  ClientGoal,
  CaseNote,
  RestrictivePractice,
  Incident,
  Lead,
  Practitioner,
  ABCLog,
  BSPDocument,
  BillingClaim,
  NDISSupportItem,
  AuditLog,
  AppNotification,
  OfflineDelta,
  CRMTask,
  TaskPriority,
  NoteCategory,
  ScheduledShift,
  AttachedDocument
} from '@/types';

export type TabType =
  | 'command-center'
  | 'clients'
  | 'ndis-goals'
  | 'google-maps'
  | 'case-notes'
  | 'incidents'
  | 'restrictive-practices'
  | 'abc-analyser'
  | 'bsp-plans'
  | 'practice-tools'
  | 'google-workspace'
  | 'google-keep'
  | 'google-classroom'
  | 'audit'
  | 'crm'
  | 'billing'
  | 'hr-roster'
  | 'audit-logs'
  | 'security-audit'
  | 'integrations'
  | 'participant-portal'
  | 'ai-predictive-insights';

export interface AuthSlice {
  currentUser: UserProfile;
  users: UserProfile[];
  isAuthenticated: boolean;
  authLoading: boolean;

  setUserProfile: (profile: UserProfile | null) => void;
  signOutUser: () => Promise<void>;
  handleAuthUser: (firebaseUser: User | null) => Promise<UserProfile | null>;
  canEdit: () => boolean;
  canDelete: () => boolean;
  isAdmin: () => boolean;
  isPractitioner: () => boolean;
  isViewer: () => boolean;
  isSupportCoordinator: () => boolean;
  isParticipant: () => boolean;
  switchUser: (id: string) => void;
  setUserRole: (role: UserRole) => void;
}

export interface ClientsSlice {
  clients: Client[];
  selectedClientId: string | null;

  setSelectedClientId: (id: string | null) => void;
  navigateToClient: (identifier: string) => void;
  addClient: (client: Partial<Client>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addClientGoal: (clientId: string, goal: Partial<ClientGoal>) => void;
  updateClientGoal: (clientId: string, goalId: string, updates: Partial<ClientGoal>) => void;
  deleteClientGoal: (clientId: string, goalId: string) => void;
  linkCaseNoteToGoal: (clientId: string, goalId: string, noteId: string) => void;
  importClientsFromCSV: (csvText: string) => number;
  exportClientsCSV: () => string;
  generateParticipantTemplateCSV: () => string;
  importCompanyParticipants: () => Promise<number>;
  batchImportValidatedClients: (clients: Client[]) => Promise<{ success: boolean; count: number; error?: string }>;
  attachDocumentToClient: (clientId: string, document: AttachedDocument) => void;
  removeDocumentFromClient: (clientId: string, documentId: string) => void;
}

export interface CaseNotesSlice {
  caseNotes: CaseNote[];

  addCaseNote: (note: Partial<CaseNote>) => void;
  updateCaseNote: (id: string, updates: Partial<CaseNote>) => void;
  deleteCaseNote: (id: string) => void;
}

export interface BillingSlice {
  billingClaims: BillingClaim[];
  claims: BillingClaim[];

  addBillingClaim: (claim: Partial<BillingClaim>) => void;
  updateBillingClaim: (id: string, updates: Partial<BillingClaim>) => void;
  updateBillingStatus: (id: string, status: BillingClaim['status']) => void;
  deleteBillingClaim: (id: string) => void;
  reconcileClaim: (id: string, status: 'Reconciled' | 'Failed' | 'SLA_Breach_Risk', note?: string) => void;
  autoReconcileAllClaims: () => void;
}

export interface IncidentsSlice {
  incidents: Incident[];

  addIncident: (incident: Partial<Incident>) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  updateIncidentStatus: (id: string, status: any) => void;
  deleteIncident: (id: string) => void;
}

export interface ComplianceSlice {
  restrictivePractices: RestrictivePractice[];
  abcLogs: ABCLog[];
  bsp: BSPDocument;
  bspPlans: BSPDocument[];
  bspDocuments: BSPDocument[];

  addRestrictivePractice: (practice: Partial<RestrictivePractice>) => void;
  updateRestrictivePractice: (id: string, updates: Partial<RestrictivePractice>) => void;
  deleteRestrictivePractice: (id: string) => void;

  addABCLog: (log: Partial<ABCLog>) => void;
  updateAbcLog: (id: string, updates: Partial<ABCLog>) => void;
  deleteABCLog: (id: string) => void;

  updateBSP: (updates: Partial<BSPDocument>) => void;
  addBSPPlan: (bsp: Partial<BSPDocument>) => void;
  addBSPDocument: (bsp: Partial<BSPDocument>) => void;
  updateBspDocument: (id: string, updates: Partial<BSPDocument>) => void;
  updateBSPDocument: (id: string, updates: Partial<BSPDocument>) => void;
  deleteBSPDocument: (id: string) => void;
}

export interface CRMSlice {
  leads: Lead[];
  crmTasks: CRMTask[];

  addLead: (lead: Partial<Lead>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  updateLeadStage: (id: string, stage: Lead['stage']) => void;
  deleteLead: (id: string) => void;

  addCRMTask: (task: Partial<CRMTask>) => void;
  updateCRMTask: (id: string, updates: Partial<CRMTask>) => void;
  deleteCRMTask: (id: string) => void;
  toggleCRMTaskStatus: (id: string) => void;
  syncKeepNoteToCRMTasks: (
    note: any,
    options?: { priority?: TaskPriority; dueDate?: string; assignedTo?: string; defaultCategory?: NoteCategory }
  ) => { count: number; taskIds: string[] };
}

export interface HRSlice {
  practitioners: Practitioner[];
  scheduledShifts: ScheduledShift[];
  supportItems: NDISSupportItem[];

  addPractitioner: (practitioner: Practitioner) => void;
  updatePractitioner: (id: string, updates: Partial<Practitioner>) => void;
  deletePractitioner: (id: string) => void;

  addScheduledShift: (shift: Partial<ScheduledShift>) => void;
  updateScheduledShift: (id: string, updates: Partial<ScheduledShift>) => void;
  deleteScheduledShift: (id: string) => void;
}

export interface AuditSlice {
  auditLogs: AuditLog[];
  notifications: AppNotification[];

  addAuditLog: (action: string, entity: string, entityId: string, details: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
}

export interface UISlice {
  theme: 'light' | 'dark';
  activeTab: TabType;
  searchTerm: string;
  isCommandPaletteOpen: boolean;
  isMobileSidebarOpen: boolean;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setActiveTab: (tab: TabType) => void;
  setSearchTerm: (term: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

export interface SyncSlice {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'pending';
  pendingChangesCount: number;
  offlineQueue: OfflineDelta[];
  lastSyncTime: string;
  isUsingMockData: boolean;

  setOnlineStatus: (status: boolean) => void;
  triggerDeltaSync: () => Promise<void>;
  simulateOfflineToggle: () => void;
  queueOfflineDelta: (action: string, entity: string, entityId: string, payload: any) => void;

  clearAllMockData: (keepCurrentUser?: boolean) => void;
  loadDemoData: () => void;
  exportFullDatabaseJSON: () => string;
  resetToDefaultData: () => void;
  loadFromFirestore: () => Promise<void>;
  syncWithFirestore: () => Promise<void>;
  startRealtimeListeners: () => void;
  stopRealtimeListeners: () => void;
}

export type RootStore = AuthSlice &
  ClientsSlice &
  CaseNotesSlice &
  BillingSlice &
  IncidentsSlice &
  ComplianceSlice &
  CRMSlice &
  HRSlice &
  AuditSlice &
  UISlice &
  SyncSlice;

export type ManagementState = RootStore;

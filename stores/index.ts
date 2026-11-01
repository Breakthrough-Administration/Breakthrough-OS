import { create } from 'zustand';
import { RootStore, TabType, ManagementState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createClientsSlice } from './slices/clientsSlice';
import { createCaseNotesSlice } from './slices/caseNotesSlice';
import { createBillingSlice } from './slices/billingSlice';
import { createIncidentsSlice } from './slices/incidentsSlice';
import { createComplianceSlice } from './slices/complianceSlice';
import { createCRMSlice } from './slices/crmSlice';
import { createHRSlice } from './slices/hrSlice';
import { createAuditSlice } from './slices/auditSlice';
import { createUISlice } from './slices/uiSlice';
import { createSyncSlice } from './slices/syncSlice';

export const useManagementStore = create<RootStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createClientsSlice(...a),
  ...createCaseNotesSlice(...a),
  ...createBillingSlice(...a),
  ...createIncidentsSlice(...a),
  ...createComplianceSlice(...a),
  ...createCRMSlice(...a),
  ...createHRSlice(...a),
  ...createAuditSlice(...a),
  ...createUISlice(...a),
  ...createSyncSlice(...a),
}));

export type { TabType, ManagementState, RootStore };
export { OFFICIAL_2026_NDIS_PRICE_GUIDE } from '@/lib/seedData';

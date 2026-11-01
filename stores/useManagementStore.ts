/**
 * Root State Management Aggregator for AMOS-Breakthrough
 * Complies with strict modular architecture (<50 LOC)
 * All domain state logic is isolated in stores/slices/
 */
export { useManagementStore, OFFICIAL_2026_NDIS_PRICE_GUIDE } from './index';
export type { TabType, ManagementState, RootStore } from './types';

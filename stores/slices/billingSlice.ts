import { StateCreator } from 'zustand';
import { BillingClaim } from '@/types';
import {
  createBillingClaim as createBillingClaimDoc,
  updateBillingClaim as updateBillingClaimDoc,
  deleteBillingClaim as deleteBillingClaimDoc
} from '@/lib/firestoreService';
import { BillingSlice, RootStore } from '../types';

export const createBillingSlice: StateCreator<RootStore, [], [], BillingSlice> = (set, get) => ({
  billingClaims: [],
  claims: [],

  addBillingClaim: (claimData) => {
    const invoiceNum = (claimData as BillingClaim).invoiceNumber || `INV-BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClaim: BillingClaim = Object.assign(
      {
        ndisNumber: '430000000',
        ndisSupportItem: (claimData as any).supportItemName || (claimData as any).supportItemCode || '07_002_0115_8_3 - Specialist Behavioural Intervention',
        hours: (claimData as any).hours ?? (claimData as any).hoursWorked ?? (claimData as any).quantity ?? 1
      },
      claimData,
      {
        id: (claimData as BillingClaim).id || `claim-${Date.now().toString().slice(-4)}`,
        invoiceNumber: invoiceNum
      }
    ) as BillingClaim;

    set((state) => ({
      claims: [newClaim, ...state.claims],
      billingClaims: [newClaim, ...state.billingClaims]
    }));
    get().addAuditLog('CREATE', 'BillingClaim', newClaim.id, `Generated NDIS billable claim ${newClaim.invoiceNumber} for ${newClaim.clientName}`);

    createBillingClaimDoc(newClaim).catch((err) => {
      console.warn('Firestore write failed for addBillingClaim, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'BillingClaim', newClaim.id, newClaim);
    });
  },

  updateBillingClaim: (id, updates) => {
    set((state) => {
      const updatedClaims = state.billingClaims.map((c) => (c.id === id ? { ...c, ...updates } : c));
      return {
        billingClaims: updatedClaims,
        claims: updatedClaims
      };
    });
    get().addAuditLog('UPDATE', 'BillingClaim', id, `Updated billing claim`);

    updateBillingClaimDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateBillingClaim, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'BillingClaim', id, updates);
    });
  },

  updateBillingStatus: (id, status) => {
    get().updateBillingClaim(id, { status });
  },

  deleteBillingClaim: (id) => {
    set((state) => ({
      billingClaims: state.billingClaims.filter((c) => c.id !== id),
      claims: state.claims.filter((c) => c.id !== id)
    }));
    get().addAuditLog('DELETE', 'BillingClaim', id, `Voided NDIS billing claim`);

    deleteBillingClaimDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteBillingClaim, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'BillingClaim', id, { id });
    });
  },

  reconcileClaim: (id, status, errorNote) => {
    const reconciliationError = errorNote || (status === 'Reconciled' ? undefined : undefined);
    get().updateBillingClaim(id, {
      reconciliationStatus: status,
      ...(reconciliationError !== undefined ? { reconciliationError } : {})
    });

    const claim = get().billingClaims.find((c) => c.id === id);
    if (claim) {
      get().addAuditLog(
        'RECONCILE_CLAIM',
        'BillingClaim',
        id,
        `Invoice ${claim.invoiceNumber} reconciliation marked as ${status}${errorNote ? `: ${errorNote}` : ''}`
      );

      if (status === 'Failed' || status === 'SLA_Breach_Risk') {
        get().addNotification({
          title: `NDIS Claim Reconciliation Alert: ${claim.invoiceNumber}`,
          message: `Claim for ${claim.clientName} (${claim.supportItemCode}) status is ${status}. ${errorNote || ''}`,
          type: 'billing',
          severity: status === 'Failed' ? 'high' : 'medium',
          linkTab: 'billing'
        });
      }
    }
  },

  autoReconcileAllClaims: () => {
    const claims = get().billingClaims;
    let failedCount = 0;
    let atRiskCount = 0;
    let reconciledCount = 0;

    const updated = claims.map((c) => {
      if (c.unitRate > 214.41) {
        failedCount++;
        return {
          ...c,
          reconciliationStatus: 'Failed' as const,
          reconciliationError: `Unit rate $${c.unitRate.toFixed(2)} exceeds standard NDIS price guide cap of $214.41/hr`
        };
      }
      if (c.status === 'Rejected') {
        failedCount++;
        return {
          ...c,
          reconciliationStatus: 'Failed' as const,
          reconciliationError: c.reconciliationError || 'PACE Provider Portal rejected invoice transmission'
        };
      }
      if (c.status === 'Pending') {
        atRiskCount++;
        return {
          ...c,
          reconciliationStatus: 'SLA_Breach_Risk' as const,
          reconciliationError: 'PACE Submission pending > 5 business days; nearing 7-day payment SLA window'
        };
      }
      reconciledCount++;
      return {
        ...c,
        reconciliationStatus: 'Reconciled' as const,
        reconciliationError: undefined
      };
    });

    set({ billingClaims: updated, claims: updated });

    get().addAuditLog(
      'BATCH_RECONCILIATION_RUN',
      'BillingReconciliationEngine',
      `batch-${Date.now()}`,
      `Auto-reconciled ${claims.length} claims. Results: ${reconciledCount} Reconciled, ${failedCount} Failed, ${atRiskCount} SLA Breach Risks.`
    );

    if (failedCount > 0 || atRiskCount > 0) {
      get().addNotification({
        title: 'NDIS Billing SLA & Reconciliation Warning',
        message: `Automated engine detected ${failedCount} failed line-item reconciliations and ${atRiskCount} claims nearing SLA breach window.`,
        type: 'billing',
        severity: failedCount > 0 ? 'high' : 'medium',
        linkTab: 'billing'
      });
    }
  }
});

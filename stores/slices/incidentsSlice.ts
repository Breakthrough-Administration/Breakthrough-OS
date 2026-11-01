import { StateCreator } from 'zustand';
import { Incident } from '@/types';
import {
  createIncident as createIncidentDoc,
  updateIncident as updateIncidentDoc,
  deleteIncident as deleteIncidentDoc
} from '@/lib/firestoreService';
import { IncidentsSlice, RootStore } from '../types';

export const createIncidentsSlice: StateCreator<RootStore, [], [], IncidentsSlice> = (set, get) => ({
  incidents: [],

  addIncident: (incidentData) => {
    const newIncident: Incident = {
      id: (incidentData as Incident).id || `inc-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      ...incidentData
    } as Incident;

    set((state) => ({ incidents: [newIncident, ...state.incidents] }));
    get().addAuditLog('CREATE', 'Incident', newIncident.id, `Reported ${newIncident.severity} incident for ${newIncident.clientName}`);

    createIncidentDoc(newIncident).catch((err) => {
      console.warn('Firestore write failed for addIncident, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Incident', newIncident.id, newIncident);
    });

    const isHighOrCritical =
      newIncident.severity === 'High' ||
      newIncident.severity === 'Critical / Reportable' ||
      newIncident.severity.toLowerCase().includes('high') ||
      newIncident.severity.toLowerCase().includes('critical') ||
      newIncident.isNdisReportable;

    if (isHighOrCritical) {
      const isCritical = newIncident.severity.includes('Critical') || !!newIncident.isNdisReportable;
      const actionText = (newIncident.immediateActionTaken || newIncident.actionTaken || 'No immediate action logged').slice(0, 100);
      get().addNotification({
        title: `🚨 ${isCritical ? 'CRITICAL / NDIS REPORTABLE' : 'HIGH SEVERITY'} INCIDENT: ${newIncident.clientName}`,
        message: `${newIncident.severity} incident recorded for participant ${newIncident.clientName} (Reported by ${newIncident.reportedBy || 'Practitioner'}). Action taken: "${actionText}...". ${
          isCritical
            ? 'Mandatory 24-hour statutory lodgement to NDIS Quality and Safeguards Commission required.'
            : 'Requires immediate clinical supervisor review and follow-up.'
        }`,
        type: 'incident',
        severity: 'high',
        linkTab: 'incidents'
      });

      get().addAuditLog(
        'COMMAND_CENTER_AUTOMATED_ESCALATION',
        'Incident',
        newIncident.id,
        `Automated Workflow: Dispatched High/Critical incident notification to Command Center for participant ${newIncident.clientName}`
      );
    }
  },

  updateIncident: (id, updates) => {
    set((state) => ({
      incidents: state.incidents.map((inc) => (inc.id === id ? { ...inc, ...updates } : inc))
    }));
    get().addAuditLog('UPDATE', 'Incident', id, `Updated incident escalation status`);

    updateIncidentDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateIncident, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Incident', id, updates);
    });
  },

  updateIncidentStatus: (id, status) => {
    set((state) => ({
      incidents: state.incidents.map((inc) => (inc.id === id ? { ...inc, status } : inc))
    }));
    get().addAuditLog('UPDATE', 'Incident', id, `Updated incident status to ${status}`);

    updateIncidentDoc(id, { status }).catch((err) => {
      console.warn('Firestore write failed for updateIncidentStatus, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Incident', id, { status });
    });
  },

  deleteIncident: (id) => {
    set((state) => ({
      incidents: state.incidents.filter((inc) => inc.id !== id)
    }));
    get().addAuditLog('DELETE', 'Incident', id, `Archived incident record`);

    deleteIncidentDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteIncident, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Incident', id, { id });
    });
  }
});

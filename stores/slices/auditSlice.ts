import { StateCreator } from 'zustand';
import { AuditLog, AppNotification } from '@/types';
import { createAuditLog as createAuditLogDoc } from '@/lib/firestoreService';
import { INITIAL_AUDIT_LOGS, INITIAL_NOTIFICATIONS } from '@/lib/seedData';
import { AuditSlice, RootStore } from '../types';

export const createAuditSlice: StateCreator<RootStore, [], [], AuditSlice> = (set, get) => ({
  auditLogs: INITIAL_AUDIT_LOGS,
  notifications: INITIAL_NOTIFICATIONS,

  addAuditLog: (action, entity, entityId, details) => {
    const user = get().currentUser;
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: user?.id || 'sys-user',
      actorName: user?.name || 'Authorized Practitioner',
      actorRole: user?.role || 'PRACTITIONER',
      action,
      entity,
      entityId,
      details,
      ipAddress: '127.0.0.1'
    };
    set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));

    createAuditLogDoc(newLog).catch(() => {
      // Audit log write failure in firestore is non-blocking
    });
  },

  addNotification: (notifData) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notifData
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
  },

  markNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  }
});

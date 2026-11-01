import { StateCreator } from 'zustand';
import { Lead, CRMTask, TaskPriority, TaskStatus, NoteCategory } from '@/types';
import {
  createCRMLead as createCRMLeadDoc,
  updateCRMLead as updateCRMLeadDoc,
  deleteCRMLead as deleteCRMLeadDoc,
  createCRMTask as createCRMTaskDoc,
  updateCRMTask as updateCRMTaskDoc,
  deleteCRMTask as deleteCRMTaskDoc
} from '@/lib/firestoreService';
import { CRMSlice, RootStore } from '../types';

export const createCRMSlice: StateCreator<RootStore, [], [], CRMSlice> = (set, get) => ({
  leads: [],
  crmTasks: [],

  addLead: (leadData) => {
    const newLead: Lead = {
      id: leadData.id || `lead-${Date.now().toString().slice(-4)}`,
      prospectName: leadData.prospectName || leadData.name || 'New Prospect',
      contactName: leadData.contactName || 'Primary Contact',
      contactEmail: leadData.contactEmail || leadData.email || 'intake@example.com',
      contactPhone: leadData.contactPhone || leadData.phone || '0400000000',
      stage: leadData.stage || 'New Intake',
      source: leadData.source || 'Support Coordinator Referral',
      estimatedPlanValue: typeof leadData.estimatedPlanValue === 'number' ? leadData.estimatedPlanValue : 25000,
      notes: leadData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...leadData
    };

    set((state) => ({ leads: [newLead, ...state.leads] }));
    get().addAuditLog('CREATE', 'Lead', newLead.id, `Created CRM intake lead for ${newLead.prospectName}`);

    createCRMLeadDoc(newLead).catch((err) => {
      console.warn('Firestore write failed for addLead, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Lead', newLead.id, newLead);
    });
  },

  updateLead: (id, updates) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates, updatedAt } : l))
    }));
    get().addAuditLog('UPDATE', 'Lead', id, `Updated CRM intake pipeline stage`);

    updateCRMLeadDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateLead, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Lead', id, updates);
    });
  },

  updateLeadStage: (id, stage) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      leads: state.leads.map((l) => (l.id === id ? { ...l, stage, updatedAt } : l))
    }));
    get().addAuditLog('UPDATE', 'Lead', id, `Advanced CRM lead stage to ${stage}`);

    updateCRMLeadDoc(id, { stage, updatedAt }).catch((err) => {
      console.warn('Firestore write failed for updateLeadStage, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Lead', id, { stage });
    });
  },

  deleteLead: (id) => {
    set((state) => ({
      leads: state.leads.filter((l) => l.id !== id)
    }));
    get().addAuditLog('DELETE', 'Lead', id, `Removed CRM lead`);

    deleteCRMLeadDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteLead, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Lead', id, { id });
    });
  },

  addCRMTask: (taskData) => {
    const id = taskData.id || `task-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const newTask: CRMTask = {
      id,
      title: taskData.title || 'Untitled CRM Task',
      description: taskData.description || '',
      category: taskData.category || 'General',
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'Pending',
      dueDate: taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTo: taskData.assignedTo || 'Marcus Vance',
      createdAt: now,
      updatedAt: now,
      ...taskData,
    };

    set((state) => ({ crmTasks: [newTask, ...state.crmTasks] }));
    get().addAuditLog('CREATE', 'CRMTask', newTask.id, `Created CRM action task: "${newTask.title}"`);

    createCRMTaskDoc(newTask).catch((err) => {
      console.warn('Firestore write failed for addCRMTask, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'CRMTask', newTask.id, newTask);
    });
  },

  updateCRMTask: (id, updates) => {
    const updatedAt = new Date().toISOString();
    const fullUpdates = {
      ...updates,
      completedAt: updates.status === 'Completed' ? new Date().toISOString() : undefined,
      updatedAt
    };
    set((state) => ({
      crmTasks: state.crmTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updates,
              completedAt: updates.status === 'Completed' ? new Date().toISOString() : t.completedAt,
              updatedAt
            }
          : t
      )
    }));
    get().addAuditLog('UPDATE', 'CRMTask', id, `Updated CRM task`);

    updateCRMTaskDoc(id, fullUpdates).catch((err) => {
      console.warn('Firestore write failed for updateCRMTask, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'CRMTask', id, updates);
    });
  },

  deleteCRMTask: (id) => {
    set((state) => ({
      crmTasks: state.crmTasks.filter((t) => t.id !== id)
    }));
    get().addAuditLog('DELETE', 'CRMTask', id, `Deleted CRM task`);

    deleteCRMTaskDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteCRMTask, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'CRMTask', id, { id });
    });
  },

  toggleCRMTaskStatus: (id) => {
    const target = get().crmTasks.find((t) => t.id === id);
    if (!target) return;
    const nextStatus: TaskStatus = target.status === 'Completed' ? 'Pending' : 'Completed';
    get().updateCRMTask(id, { status: nextStatus });
  },

  syncKeepNoteToCRMTasks: (note, options) => {
    const createdTaskIds: string[] = [];
    const targetCategory: NoteCategory = options?.defaultCategory ||
      (note.labels?.some((l: string) => /clinical|bsp|sensory/i.test(l)) ? 'Clinical'
      : note.labels?.some((l: string) => /financial|budget|claim|invoice|pricing/i.test(l)) ? 'Financial'
      : note.labels?.some((l: string) => /compliance|audit|safeguard|commission|incident/i.test(l)) ? 'Compliance'
      : note.labels?.some((l: string) => /hr|staff|worker|roster/i.test(l)) ? 'HR'
      : note.labels?.some((l: string) => /intake|lead|referral/i.test(l)) ? 'Intake'
      : 'General');

    const defaultDueDate = options?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultPriority: TaskPriority = options?.priority ||
      (note.labels?.some((l: string) => /urgent|critical|alert/i.test(l)) ? 'Critical' : 'High');
    const assignedPractitioner = options?.assignedTo || 'Marcus Vance';

    if (note.checklist && note.checklist.length > 0) {
      const activeItems = note.checklist.filter((item: any) => !item.completed);
      const itemsToSync = activeItems.length > 0 ? activeItems : note.checklist;

      itemsToSync.forEach((item: any, idx: number) => {
        const taskId = `task-keep-${Date.now().toString().slice(-4)}-${idx + 1}`;
        const task: CRMTask = {
          id: taskId,
          title: item.text,
          description: `Action item extracted from Google Keep Note: "${note.title}". ${note.text ? `\nContext: ${note.text}` : ''}`,
          category: targetCategory,
          priority: defaultPriority,
          status: item.completed ? 'Completed' : 'Pending',
          dueDate: defaultDueDate,
          assignedTo: assignedPractitioner,
          sourceNoteId: note.id,
          sourceNoteTitle: note.title,
          clientId: note.clientId,
          clientName: note.clientName,
          isSyncedFromKeep: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        get().addCRMTask(task);
        createdTaskIds.push(taskId);
      });
    } else {
      const taskId = `task-keep-${Date.now().toString().slice(-4)}`;
      const task: CRMTask = {
        id: taskId,
        title: note.title || 'Action Item from Keep',
        description: note.text || 'Review Keep note details.',
        category: targetCategory,
        priority: defaultPriority,
        status: 'Pending',
        dueDate: defaultDueDate,
        assignedTo: assignedPractitioner,
        sourceNoteId: note.id,
        sourceNoteTitle: note.title,
        clientId: note.clientId,
        clientName: note.clientName,
        isSyncedFromKeep: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      get().addCRMTask(task);
      createdTaskIds.push(taskId);
    }

    get().addNotification({
      title: 'Action Items Synced to CRM',
      message: `Pushed ${createdTaskIds.length} NDIS action items from note "${note.title}" into CRM Task Management.`,
      type: 'clinical',
      severity: 'low',
      linkTab: 'crm'
    });

    get().addAuditLog(
      'SYNC_KEEP_TO_CRM',
      'GoogleKeepModule',
      note.id,
      `Synchronized ${createdTaskIds.length} prioritized action tasks to CRM pipeline`
    );

    return { count: createdTaskIds.length, taskIds: createdTaskIds };
  }
});

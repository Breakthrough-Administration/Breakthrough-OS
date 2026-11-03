import { StateCreator } from 'zustand';
import { Client, ClientGoal } from '@/types';
import { COMPANY_DRIVE_PARTICIPANTS } from '@/lib/seedData';
import {
  createClient as createClientDoc,
  createClientsBatch,
  updateClient as updateClientDoc,
  deleteClient as deleteClientDoc,
  updateCaseNote as updateCaseNoteDoc
} from '@/lib/firestoreService';
import { ClientsSlice, RootStore } from '../types';

export const createClientsSlice: StateCreator<RootStore, [], [], ClientsSlice> = (set, get) => ({
  clients: COMPANY_DRIVE_PARTICIPANTS,
  selectedClientId: COMPANY_DRIVE_PARTICIPANTS[0]?.id || null,

  setSelectedClientId: (selectedClientId) => set({ selectedClientId }),

  navigateToClient: (identifier: string) => {
    const raw = identifier.trim();
    const cleanId = raw.replace(/^[#\[\]]+|[#\[\]]+$/g, '').trim().toLowerCase();
    const cleanNum = cleanId.replace(/^cid-|^cli-|^client-/, '');
    const clients = get().clients;

    const match = clients.find((c) => {
      const cId = c.id.toLowerCase();
      const cNum = cId.replace(/^cli-|^cid-/, '');
      const cNdis = c.ndisNumber.toLowerCase();
      const cName = c.name.toLowerCase();

      return (
        cId === cleanId ||
        cNum === cleanNum ||
        cNdis === cleanId ||
        cNdis === cleanNum ||
        cName.includes(cleanId) ||
        cleanId.includes(cId) ||
        `cli-${cleanNum}` === cId ||
        `cid-${cleanNum}` === cId
      );
    });

    if (match) {
      set({ selectedClientId: match.id, activeTab: 'clients' });
      get().addNotification({
        title: `Viewing Client Dashboard: ${match.name}`,
        message: `Navigated to ${match.name} (NDIS: ${match.ndisNumber}) via smart Keep link.`,
        type: 'client',
        severity: 'low'
      });
    } else {
      set({ activeTab: 'clients' });
    }
  },

  addClient: (clientData) => {
    const existingClients = get().clients;
    const cleanNdis = (clientData.ndisNumber || '').replace(/[^0-9]/g, '');
    const cleanName = (clientData.name || '').trim().toLowerCase();

    const existingMatch = existingClients.find((c) => {
      const cNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
      const cName = (c.name || '').trim().toLowerCase();
      if (cleanNdis && cleanNdis.length === 9 && cleanNdis !== '430000000' && cNdis === cleanNdis) {
        return true;
      }
      if (cleanName && cleanName.length > 2 && cName === cleanName) {
        return true;
      }
      return false;
    });

    const nowIso = new Date().toISOString();
    const safeSlug = (clientData.name || 'participant')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    const resolvedId =
      existingMatch?.id ||
      (clientData.id && !clientData.id.startsWith('cli-')
        ? clientData.id
        : `participant-${safeSlug}-${Date.now().toString().slice(-6)}`);

    // Merge goals without duplicating existing goal titles
    const existingGoals = existingMatch?.goals || [];
    const incomingGoals = clientData.goals || [];
    const existingGoalTitles = new Set(existingGoals.map((g) => g.title.trim().toLowerCase()));
    const mergedGoals = [
      ...existingGoals,
      ...incomingGoals.filter((g) => !existingGoalTitles.has((g.title || '').trim().toLowerCase()))
    ];

    // Merge attached Drive documents without duplicating IDs or names
    const existingDocs = existingMatch?.attachedDocuments || existingMatch?.documents || [];
    const incomingDocs = clientData.attachedDocuments || clientData.documents || [];
    const existingDocKeys = new Set(existingDocs.map((d) => d.driveFileId || d.id || d.name));
    const mergedDocs = [
      ...existingDocs,
      ...incomingDocs.filter((d) => !existingDocKeys.has(d.driveFileId || d.id || d.name))
    ];

    const newClient: Client = {
      ...(existingMatch || {}),
      name: clientData.name || existingMatch?.name || 'New Participant',
      ndisNumber: clientData.ndisNumber || existingMatch?.ndisNumber || '430000000',
      dateOfBirth: clientData.dateOfBirth || existingMatch?.dateOfBirth || '1995-01-01',
      status: clientData.status || existingMatch?.status || 'Active',
      primaryDisability: clientData.primaryDisability || existingMatch?.primaryDisability || 'Autism Spectrum Disorder',
      planStartDate: clientData.planStartDate || existingMatch?.planStartDate || nowIso.split('T')[0],
      planEndDate:
        clientData.planEndDate ||
        existingMatch?.planEndDate ||
        new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      totalBudget:
        typeof clientData.totalBudget === 'number'
          ? clientData.totalBudget
          : existingMatch?.totalBudget || clientData.allocatedBudget || 50000,
      allocatedBudget:
        typeof clientData.allocatedBudget === 'number'
          ? clientData.allocatedBudget
          : existingMatch?.allocatedBudget || 50000,
      spentBudget:
        typeof clientData.spentBudget === 'number' ? clientData.spentBudget : existingMatch?.spentBudget || 0,
      primaryPractitionerId:
        clientData.primaryPractitionerId || existingMatch?.primaryPractitionerId || 'practitioner-1',
      primaryPractitionerName:
        clientData.primaryPractitionerName || existingMatch?.primaryPractitionerName || 'Clinical Lead',
      riskLevel: clientData.riskLevel || existingMatch?.riskLevel || 'Medium',
      emergencyContact: clientData.emergencyContact ||
        existingMatch?.emergencyContact || { name: 'Emergency Contact', phone: '0400000000' },
      restrictivePracticesActive:
        clientData.restrictivePracticesActive ?? existingMatch?.restrictivePracticesActive ?? false,
      ...clientData,
      id: resolvedId,
      goals: mergedGoals,
      documents: mergedDocs,
      attachedDocuments: mergedDocs,
      isCustomUserParticipant: true,
      createdAt: existingMatch?.createdAt || clientData.createdAt || nowIso,
      updatedAt: nowIso
    };

    if (existingMatch) {
      set((state) => ({
        clients: state.clients.map((c) => (c.id === resolvedId ? newClient : c))
      }));
      get().addAuditLog(
        'UPDATE',
        'Client',
        newClient.id,
        `Merged & updated participant ${newClient.name} (NDIS: ${newClient.ndisNumber})`
      );
    } else {
      set((state) => ({ clients: [newClient, ...state.clients] }));
      get().addAuditLog(
        'CREATE',
        'Client',
        newClient.id,
        `Enrolled participant ${newClient.name} (NDIS: ${newClient.ndisNumber})`
      );
    }

    createClientDoc(newClient).catch((err) => {
      console.warn('Firestore write failed for addClient, queueing offline:', err);
      get().queueOfflineDelta(existingMatch ? 'UPDATE' : 'CREATE', 'Client', newClient.id, newClient);
    });
  },

  updateClient: (id, updates) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...updates, updatedAt } : c))
    }));
    get().addAuditLog('UPDATE', 'Client', id, `Updated participant record`);

    updateClientDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateClient, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Client', id, updates);
    });
  },

  deleteClient: (id) => {
    const target = get().clients.find((c) => c.id === id);
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id)
    }));
    if (target) {
      get().addAuditLog('DELETE', 'Client', id, `Archived participant record for ${target.name}`);
    }

    deleteClientDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteClient, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Client', id, { id });
    });
  },

  addClientGoal: (clientId, goalData) => {
    const newGoal: ClientGoal = {
      id: (goalData as ClientGoal).id || `g-${Date.now().toString().slice(-4)}`,
      title: goalData.title || 'Support Goal',
      category: goalData.category || 'Capacity Building',
      targetDate: goalData.targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      progressPercent: typeof goalData.progressPercent === 'number' ? goalData.progressPercent : 0,
      status: goalData.status || 'In Progress',
      gasScore: goalData.gasScore,
      gasHistory: goalData.gasHistory || [],
      linkedNoteIds: goalData.linkedNoteIds || [],
      ...goalData,
    };
    let updatedGoals: ClientGoal[] = [];
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id === clientId) {
          updatedGoals = [...c.goals, newGoal];
          return { ...c, goals: updatedGoals, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    }));
    get().addAuditLog('CREATE', 'ClientGoal', newGoal.id, `Added goal "${newGoal.title}" to participant record`);

    if (updatedGoals.length > 0) {
      updateClientDoc(clientId, { goals: updatedGoals }).catch((err) => {
        get().queueOfflineDelta('UPDATE_GOALS', 'Client', clientId, { goals: updatedGoals });
      });
    }
  },

  updateClientGoal: (clientId, goalId, updates) => {
    let updatedGoals: ClientGoal[] = [];
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id !== clientId) return c;
        updatedGoals = c.goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g));
        return {
          ...c,
          goals: updatedGoals,
          updatedAt: new Date().toISOString()
        };
      })
    }));
    get().addAuditLog('UPDATE', 'ClientGoal', goalId, `Updated goal milestone progress`);

    if (updatedGoals.length > 0) {
      updateClientDoc(clientId, { goals: updatedGoals }).catch((err) => {
        get().queueOfflineDelta('UPDATE_GOALS', 'Client', clientId, { goals: updatedGoals });
      });
    }
  },

  deleteClientGoal: (clientId, goalId) => {
    let updatedGoals: ClientGoal[] = [];
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id !== clientId) return c;
        updatedGoals = c.goals.filter((g) => g.id !== goalId);
        return {
          ...c,
          goals: updatedGoals,
          updatedAt: new Date().toISOString()
        };
      })
    }));
    get().addAuditLog('DELETE', 'ClientGoal', goalId, `Removed goal from participant record`);

    updateClientDoc(clientId, { goals: updatedGoals }).catch((err) => {
      get().queueOfflineDelta('UPDATE_GOALS', 'Client', clientId, { goals: updatedGoals });
    });
  },

  linkCaseNoteToGoal: (clientId, goalId, noteId) => {
    let updatedGoals: ClientGoal[] = [];
    let updatedNoteGoals: string[] = [];
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id !== clientId) return c;
        updatedGoals = c.goals.map((g) => {
          if (g.id !== goalId) return g;
          const existingLinks = g.linkedNoteIds || [];
          if (existingLinks.includes(noteId)) return g;
          return {
            ...g,
            linkedNoteIds: [...existingLinks, noteId]
          };
        });
        return {
          ...c,
          goals: updatedGoals,
          updatedAt: new Date().toISOString()
        };
      }),
      caseNotes: state.caseNotes.map((n) => {
        if (n.id !== noteId) return n;
        const linkedGoals = n.linkedGoalIds || [];
        if (linkedGoals.includes(goalId)) {
          updatedNoteGoals = linkedGoals;
          return n;
        }
        updatedNoteGoals = [...linkedGoals, goalId];
        return {
          ...n,
          linkedGoalIds: updatedNoteGoals,
          updatedAt: new Date().toISOString()
        };
      })
    }));
    get().addAuditLog('LINK_NOTE_GOAL', 'ClientGoal', goalId, `Linked case note ${noteId} to goal ${goalId}`);

    if (updatedGoals.length > 0) {
      updateClientDoc(clientId, { goals: updatedGoals }).catch((err) => {
        console.warn('Failed to persist goal link to client doc:', err);
      });
    }
    if (updatedNoteGoals.length > 0) {
      updateCaseNoteDoc(noteId, { linkedGoalIds: updatedNoteGoals }).catch((err) => {
        console.warn('Failed to persist goal link to caseNote doc:', err);
      });
    }
  },

  importClientsFromCSV: (csvText: string) => {
    try {
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return 0;

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const newClients: Client[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length === 0 || !row[0]) continue;

        const name = row[headers.indexOf('name')] || row[0] || `Participant ${i}`;
        const ndisNumber =
          row[headers.indexOf('ndisnumber')] ||
          row[headers.indexOf('ndis number')] ||
          row[1] ||
          `43${Math.floor(1000000 + Math.random() * 9000000)}`;
        const dob = row[headers.indexOf('dateofbirth')] || row[headers.indexOf('dob')] || '2000-01-01';
        const disability =
          row[headers.indexOf('primarydisability')] || row[headers.indexOf('disability')] || 'NDIS Support';
        const budget = Number(row[headers.indexOf('totalbudget')] || row[headers.indexOf('budget')]) || 45000;
        const planType = (row[headers.indexOf('planmanagementtype')] ||
          row[headers.indexOf('management')] ||
          'Plan-Managed') as any;
        const risk = (row[headers.indexOf('risklevel')] || row[headers.indexOf('risk')] || 'Medium') as any;
        const safeSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 24);

        const client: Client = {
          id: `participant-${safeSlug}-${Date.now().toString().slice(-5)}-${i}`,
          name,
          ndisNumber,
          dateOfBirth: dob,
          primaryDisability: disability,
          status: 'Active',
          totalBudget: budget,
          allocatedBudget: Math.round(budget * 0.8),
          spentBudget: 0,
          planStartDate: new Date().toISOString().split('T')[0],
          planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          planManagementType: planType,
          riskLevel: risk,
          goals: [
            {
              id: `g-imp-${i}-1`,
              title: `Primary NDIS Capacity Building Goal for ${name}`,
              category: 'Capacity Building',
              targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              progressPercent: 20,
              status: 'In Progress',
              gasScore: 0
            }
          ],
          primaryPractitionerId: get().currentUser.practitionerId || 'prac-201',
          primaryPractitionerName: get().currentUser.name || 'Practitioner',
          emergencyContact: {
            name: row[headers.indexOf('contactname')] || 'Emergency Contact',
            relationship: 'Nominee / Contact',
            phone: row[headers.indexOf('phone')] || '0400 000 000'
          },
          restrictivePracticesActive: false,
          isCustomUserParticipant: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        newClients.push(client);
      }

      if (newClients.length > 0) {
        get().batchImportValidatedClients(newClients).catch((err) => {
          console.warn('Failed to batch import CSV clients:', err);
        });
      }

      return newClients.length;
    } catch (e) {
      console.error('Error parsing participant CSV:', e);
      return 0;
    }
  },

  exportClientsCSV: () => {
    const clients = get().clients;
    const headers = [
      'Name',
      'Preferred Name',
      'NDIS Number',
      'Date of Birth',
      'Email',
      'Phone',
      'Primary Disability',
      'Status',
      'Plan Management Type',
      'Plan Start Date',
      'Plan End Date',
      'Total Budget',
      'Core Budget',
      'Capacity Building Budget',
      'PBS Budget',
      'Spent Budget',
      'Risk Level',
      'Support Coordinator Name',
      'Support Coordinator Email',
      'Plan Manager Agency',
      'Plan Manager Email',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Address',
      'Suburb',
      'Primary Goal'
    ];

    const rows = clients.map((c) => [
      `"${c.name || ''}"`,
      `"${c.preferredName || ''}"`,
      `"${c.ndisNumber || ''}"`,
      `"${c.dateOfBirth || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.primaryDisability || ''}"`,
      `"${c.status || 'Active'}"`,
      `"${c.planManagementType || 'Plan-Managed'}"`,
      `"${c.planStartDate || ''}"`,
      `"${c.planEndDate || ''}"`,
      c.totalBudget || 0,
      c.budgetBreakdown?.core || Math.round((c.totalBudget || 0) * 0.55),
      c.budgetBreakdown?.capacityBuildingTherapy || Math.round((c.totalBudget || 0) * 0.25),
      c.budgetBreakdown?.capacityBuildingPBS || Math.round((c.totalBudget || 0) * 0.2),
      c.spentBudget || 0,
      `"${c.riskLevel || 'Medium'}"`,
      `"${c.supportCoordinator?.name || ''}"`,
      `"${c.supportCoordinator?.email || ''}"`,
      `"${c.planManager?.agency || ''}"`,
      `"${c.planManager?.email || ''}"`,
      `"${c.emergencyContact?.name || ''}"`,
      `"${c.emergencyContact?.phone || ''}"`,
      `"${typeof c.address === 'string' ? c.address : c.address?.street || ''}"`,
      `"${c.suburb || (typeof c.address === 'object' ? c.address?.suburb : '') || ''}"`,
      `"${c.goals?.[0]?.title || ''}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  generateParticipantTemplateCSV: () => {
    const headers = [
      'Name',
      'Preferred Name',
      'NDIS Number',
      'Date of Birth',
      'Email',
      'Phone',
      'Primary Disability',
      'Plan Management Type',
      'Plan Start Date',
      'Plan End Date',
      'Total Budget',
      'Core Budget',
      'Capacity Building Budget',
      'PBS Budget',
      'Spent Budget',
      'Risk Level',
      'Support Coordinator Name',
      'Support Coordinator Email',
      'Support Coordinator Phone',
      'Plan Manager Agency',
      'Plan Manager Email',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Address',
      'Suburb',
      'Primary Goal'
    ];
    const sampleRows = [
      [
        '"Jordan Miller"',
        '"Jordan"',
        '"430891245"',
        '"2004-03-15"',
        '"jordan.miller@example.com.au"',
        '"0412 889 201"',
        '"Autism Spectrum Disorder (Level 3)"',
        '"Plan-Managed"',
        '"2026-01-15"',
        '"2027-01-15"',
        '68500',
        '38000',
        '16500',
        '14000',
        '12400',
        '"Medium"',
        '"Sarah Jenkins"',
        '"sarah.j@coordcare.com.au"',
        '"0400 112 334"',
        '"National Plan Managers"',
        '"claims@nationalpm.com.au"',
        '"Karen Miller"',
        '"0412 889 201"',
        '"12 Example Street, Melbourne VIC 3000"',
        '"Melbourne"',
        '"Emotional Regulation & Community Independence"'
      ],
      [
        '"Celeste Rattray-Wood"',
        '"Celeste"',
        '"430764192"',
        '"1999-08-22"',
        '"celeste.rw@example.com.au"',
        '"0422 391 840"',
        '"Psychosocial Disability"',
        '"Plan-Managed"',
        '"2026-02-01"',
        '"2027-02-01"',
        '54000',
        '30000',
        '14000',
        '10000',
        '8200',
        '"High"',
        '"David Tan"',
        '"d.tan@alliedlinks.org.au"',
        '"0411 223 445"',
        '"MyIntegra Plan Management"',
        '"invoices@myintegra.com.au"',
        '"Karen Wood"',
        '"0422 123 456"',
        '"45 Victoria Parade, Collingwood VIC 3066"',
        '"Collingwood"',
        '"Positive Behaviour Support & Daily Routine Stability"'
      ]
    ];
    return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
  },

  importCompanyParticipants: async () => {
    const { COMPANY_DRIVE_PARTICIPANTS } = await import('@/lib/seedData');
    const normalizedCompany = COMPANY_DRIVE_PARTICIPANTS.map((c, idx) => {
      const safeSlug = c.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
      return {
        ...c,
        id: c.id.startsWith('cli-') ? `participant-drive-${safeSlug}-${idx + 1}` : c.id,
        isCustomUserParticipant: true
      };
    });

    const result = await get().batchImportValidatedClients(normalizedCompany);
    return result.count;
  },

  batchImportValidatedClients: async (incomingClients: Client[]) => {
    try {
      if (!incomingClients || incomingClients.length === 0) {
        return { success: false, count: 0, error: 'No participants provided for import' };
      }

      const currentClients = [...get().clients];
      const nowIso = new Date().toISOString();
      const upsertedBatch: Client[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < incomingClients.length; i++) {
        const incoming = incomingClients[i];
        const cleanNdis = (incoming.ndisNumber || '').replace(/[^0-9]/g, '');
        const cleanName = (incoming.name || '').trim().toLowerCase();

        // Find matching record in currentClients or earlier in upsertedBatch
        const existingIdx = currentClients.findIndex((c) => {
          const cNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
          const cName = (c.name || '').trim().toLowerCase();
          if (cleanNdis && cleanNdis.length === 9 && cleanNdis !== '430000000' && cNdis === cleanNdis) {
            return true;
          }
          if (cleanName && cleanName.length > 2 && cName === cleanName) {
            return true;
          }
          return false;
        });

        const existingMatch = existingIdx >= 0 ? currentClients[existingIdx] : undefined;

        const safeSlug = (incoming.name || 'participant')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 24);

        const resolvedId =
          existingMatch && !existingMatch.id.startsWith('cli-')
            ? existingMatch.id
            : incoming.id && !incoming.id.startsWith('cli-')
            ? incoming.id
            : `participant-${safeSlug}-${Date.now().toString().slice(-5)}-${i + 1}`;

        // Merge goals without duplicating titles
        const existingGoals = existingMatch?.goals || [];
        const incomingGoals = incoming.goals || [];
        const existingGoalTitles = new Set(existingGoals.map((g) => (g.title || '').trim().toLowerCase()));
        const mergedGoals = [
          ...existingGoals,
          ...incomingGoals.filter((g) => g.title && !existingGoalTitles.has(g.title.trim().toLowerCase()))
        ];

        // Merge attached documents without duplicating IDs or filenames
        const existingDocs = existingMatch?.attachedDocuments || existingMatch?.documents || [];
        const incomingDocs = incoming.attachedDocuments || incoming.documents || [];
        const existingDocKeys = new Set(existingDocs.map((d) => d.driveFileId || d.id || d.name));
        const mergedDocs = [
          ...existingDocs,
          ...incomingDocs.filter((d) => !existingDocKeys.has(d.driveFileId || d.id || d.name))
        ];

        // Merge standard Drive subfolders
        const existingSubfolders = existingMatch?.driveSubfolders || [];
        const incomingSubfolders = incoming.driveSubfolders || [];
        const mergedSubfolders = Array.from(new Set([...existingSubfolders, ...incomingSubfolders]));

        const mergedClient: Client = {
          ...(existingMatch || {}),
          ...incoming,
          id: resolvedId,
          name: incoming.name || existingMatch?.name || 'Participant',
          ndisNumber:
            cleanNdis && cleanNdis.length === 9
              ? cleanNdis
              : existingMatch?.ndisNumber || incoming.ndisNumber || '430000000',
          dateOfBirth:
            incoming.dateOfBirth && incoming.dateOfBirth !== '2000-01-01'
              ? incoming.dateOfBirth
              : existingMatch?.dateOfBirth || incoming.dateOfBirth || '2000-01-01',
          primaryDisability:
            incoming.primaryDisability && incoming.primaryDisability !== 'NDIS Core Support'
              ? incoming.primaryDisability
              : existingMatch?.primaryDisability || incoming.primaryDisability || 'NDIS Core Support',
          totalBudget: incoming.totalBudget || existingMatch?.totalBudget || 45000,
          allocatedBudget:
            incoming.allocatedBudget ||
            existingMatch?.allocatedBudget ||
            Math.round((incoming.totalBudget || 45000) * 0.85),
          spentBudget:
            typeof incoming.spentBudget === 'number' && incoming.spentBudget > 0
              ? incoming.spentBudget
              : existingMatch?.spentBudget || 0,
          budgetBreakdown: {
            ...(existingMatch?.budgetBreakdown || {}),
            ...(incoming.budgetBreakdown || {})
          },
          supportCoordinator: {
            ...(existingMatch?.supportCoordinator || {}),
            ...(incoming.supportCoordinator || {})
          },
          planManager: {
            ...(existingMatch?.planManager || {}),
            ...(incoming.planManager || {})
          },
          emergencyContact: {
            name:
              incoming.emergencyContact?.name ||
              existingMatch?.emergencyContact?.name ||
              'Nominee Contact',
            phone:
              incoming.emergencyContact?.phone ||
              existingMatch?.emergencyContact?.phone ||
              '0400 000 000',
            relationship:
              incoming.emergencyContact?.relationship ||
              existingMatch?.emergencyContact?.relationship ||
              'Nominee / Support Contact'
          },
          goals: mergedGoals.length > 0 ? mergedGoals : incoming.goals || [],
          documents: mergedDocs,
          attachedDocuments: mergedDocs,
          driveSubfolders: mergedSubfolders.length > 0 ? mergedSubfolders : undefined,
          driveFolderPath:
            incoming.driveFolderPath ||
            existingMatch?.driveFolderPath ||
            `Staff Share Drive > Participants > Behaviour Support > ${incoming.name || 'Participant'}`,
          isCustomUserParticipant: true,
          createdAt: existingMatch?.createdAt || incoming.createdAt || nowIso,
          updatedAt: nowIso
        };

        upsertedBatch.push(mergedClient);

        if (existingIdx >= 0) {
          currentClients[existingIdx] = mergedClient;
          updatedCount++;
        } else {
          currentClients.unshift(mergedClient);
          createdCount++;
        }
      }

      // Persist all upserted clients directly to Firestore collection
      await createClientsBatch(upsertedBatch);

      set({
        clients: currentClients,
        selectedClientId: upsertedBatch[0]?.id || get().selectedClientId,
        isUsingMockData: false
      });

      // Security Audit Trail
      get().addAuditLog(
        'IMPORT_BULK_PARTICIPANTS',
        'DatabaseEngine',
        `batch-${Date.now()}`,
        `Committed ${upsertedBatch.length} participants to Firestore (${createdCount} new, ${updatedCount} merged/updated): ${upsertedBatch
          .map((c) => c.name)
          .slice(0, 5)
          .join(', ')}${upsertedBatch.length > 5 ? '...' : ''}`
      );

      // System notification
      get().addNotification({
        title: 'Participants Synchronized to Firestore',
        message: `Processed ${upsertedBatch.length} participant records (${createdCount} newly created, ${updatedCount} existing profiles merged & updated).`,
        type: 'client',
        severity: 'low'
      });

      return {
        success: true,
        count: upsertedBatch.length,
        createdCount,
        updatedCount
      };
    } catch (err: any) {
      console.error('Failed to commit batch to Firestore:', err);
      return { success: false, count: 0, error: err?.message || 'Database commit failed' };
    }
  },

  attachDocumentToClient: (clientId, document) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id === clientId) {
          const currentDocs = c.attachedDocuments || c.documents || [];
          const updatedDocs = [document, ...currentDocs.filter((d) => d.id !== document.id)];
          return {
            ...c,
            attachedDocuments: updatedDocs,
            documents: updatedDocs,
            updatedAt
          };
        }
        return c;
      })
    }));

    const client = get().clients.find((c) => c.id === clientId);
    if (client) {
      updateClientDoc(clientId, {
        attachedDocuments: client.attachedDocuments,
        documents: client.documents,
        updatedAt
      }).catch((err) => console.warn('Could not update client documents in Firestore:', err));

      get().addAuditLog(
        'LINK_DOCUMENT',
        'Client',
        clientId,
        `Linked Google Drive document "${document.name}" to participant ${client.name}`
      );
    }
  },

  removeDocumentFromClient: (clientId, documentId) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      clients: state.clients.map((c) => {
        if (c.id === clientId) {
          const currentDocs = c.attachedDocuments || c.documents || [];
          const updatedDocs = currentDocs.filter((d) => d.id !== documentId);
          return {
            ...c,
            attachedDocuments: updatedDocs,
            documents: updatedDocs,
            updatedAt
          };
        }
        return c;
      })
    }));

    const client = get().clients.find((c) => c.id === clientId);
    if (client) {
      updateClientDoc(clientId, {
        attachedDocuments: client.attachedDocuments,
        documents: client.documents,
        updatedAt
      }).catch((err) => console.warn('Could not update client documents in Firestore:', err));

      get().addAuditLog(
        'UNLINK_DOCUMENT',
        'Client',
        clientId,
        `Unlinked document ${documentId} from participant ${client.name}`
      );
    }
  },

  activateAllCompanyParticipants: async () => {
    const nowIso = new Date().toISOString();
    const current = get().clients;
    const updatedClients: Client[] = current.map((c) => ({
      ...c,
      status: 'Active',
      updatedAt: nowIso
    }));

    set({ clients: updatedClients });

    try {
      await createClientsBatch(updatedClients);
    } catch (err) {
      console.warn('Could not batch-activate participants in Firestore:', err);
    }

    get().addAuditLog(
      'ACTIVATE_ALL_PARTICIPANTS',
      'Client',
      'batch-22',
      `Activated all ${updatedClients.length} NDIS participants to Active status`
    );

    get().addNotification({
      title: 'All 22 Participants Activated',
      message: `All ${updatedClients.length} participant profiles are now set to Active status and synchronized to Firestore.`,
      type: 'client',
      severity: 'low'
    });

    return updatedClients.length;
  },

  assignPractitionerToClients: async (
    clientIds: string[],
    practitionerId: string,
    practitionerName: string,
    roleType: 'primary' | 'secondary' = 'primary'
  ) => {
    if (!clientIds.length) return 0;
    const targetSet = new Set(clientIds);
    const nowIso = new Date().toISOString();
    const modifiedClients: Client[] = [];

    const nextClients = get().clients.map((c) => {
      if (!targetSet.has(c.id)) return c;
      const updated: Client =
        roleType === 'primary'
          ? {
              ...c,
              primaryPractitionerId: practitionerId,
              primaryPractitionerName: practitionerName,
              allocatedPractitionerId: practitionerId,
              allocatedPractitionerName: practitionerName,
              updatedAt: nowIso
            }
          : {
              ...c,
              secondaryPractitionerId: practitionerId,
              secondaryPractitionerName: practitionerName,
              updatedAt: nowIso
            };
      modifiedClients.push(updated);
      return updated;
    });

    // Recalculate caseload counts on practitioners
    const nextPractitioners = get().practitioners.map((p) => {
      const assignedPrimaryCount = nextClients.filter(
        (c) => c.primaryPractitionerId === p.id || c.allocatedPractitionerId === p.id
      ).length;
      const assignedSecondaryCount = nextClients.filter((c) => c.secondaryPractitionerId === p.id).length;
      return {
        ...p,
        caseloadCount: assignedPrimaryCount,
        activeCaseloadCount: assignedPrimaryCount + assignedSecondaryCount
      };
    });

    set({
      clients: nextClients,
      practitioners: nextPractitioners
    });

    try {
      await createClientsBatch(modifiedClients);
    } catch (err) {
      console.warn('Could not persist practitioner assignment batch to Firestore:', err);
    }

    get().addAuditLog(
      'ASSIGN_PRACTITIONER',
      'Client',
      `batch-${modifiedClients.length}`,
      `Assigned ${practitionerName} (${roleType === 'primary' ? 'Primary Practitioner' : 'Secondary Support'}) to ${modifiedClients.length} participant(s)`
    );

    get().addNotification({
      title: 'Practitioner Caseload Updated',
      message: `Assigned ${practitionerName} as ${roleType === 'primary' ? 'Primary Practitioner' : 'Secondary Support'} for ${modifiedClients.length} participant(s).`,
      type: 'hr',
      severity: 'low'
    });

    return modifiedClients.length;
  }
});

import { StateCreator } from 'zustand';
import { Client, ClientGoal } from '@/types';
import {
  createClient as createClientDoc,
  createClientsBatch,
  updateClient as updateClientDoc,
  deleteClient as deleteClientDoc,
  updateCaseNote as updateCaseNoteDoc
} from '@/lib/firestoreService';
import { ClientsSlice, RootStore } from '../types';

export const createClientsSlice: StateCreator<RootStore, [], [], ClientsSlice> = (set, get) => ({
  clients: [],
  selectedClientId: null,

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
    const newClient: Client = {
      id: clientData.id || `cli-${Date.now().toString().slice(-4)}`,
      name: clientData.name || 'New Participant',
      ndisNumber: clientData.ndisNumber || '430000000',
      dateOfBirth: clientData.dateOfBirth || '1995-01-01',
      status: clientData.status || 'Active',
      primaryDisability: clientData.primaryDisability || 'Autism Spectrum Disorder',
      planStartDate: clientData.planStartDate || new Date().toISOString().split('T')[0],
      planEndDate: clientData.planEndDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      totalBudget: typeof clientData.totalBudget === 'number' ? clientData.totalBudget : (clientData.allocatedBudget || 50000),
      allocatedBudget: typeof clientData.allocatedBudget === 'number' ? clientData.allocatedBudget : 50000,
      spentBudget: typeof clientData.spentBudget === 'number' ? clientData.spentBudget : 0,
      primaryPractitionerId: clientData.primaryPractitionerId || 'practitioner-1',
      primaryPractitionerName: clientData.primaryPractitionerName || 'Clinical Lead',
      riskLevel: clientData.riskLevel || 'Medium',
      goals: clientData.goals || [],
      emergencyContact: clientData.emergencyContact || { name: 'Emergency Contact', phone: '0400000000' },
      restrictivePracticesActive: clientData.restrictivePracticesActive ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...clientData,
    };

    set((state) => ({ clients: [newClient, ...state.clients] }));
    get().addAuditLog('CREATE', 'Client', newClient.id, `Enrolled participant ${newClient.name} (NDIS: ${newClient.ndisNumber})`);

    createClientDoc(newClient).catch((err) => {
      console.warn('Firestore write failed for addClient, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Client', newClient.id, newClient);
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
        const ndisNumber = row[headers.indexOf('ndisnumber')] || row[headers.indexOf('ndis number')] || row[1] || `43${Math.floor(1000000 + Math.random() * 9000000)}`;
        const dob = row[headers.indexOf('dateofbirth')] || row[headers.indexOf('dob')] || '2000-01-01';
        const disability = row[headers.indexOf('primarydisability')] || row[headers.indexOf('disability')] || 'NDIS Support';
        const budget = Number(row[headers.indexOf('totalbudget')] || row[headers.indexOf('budget')]) || 45000;
        const planType = (row[headers.indexOf('planmanagementtype')] || row[headers.indexOf('management')] || 'Plan-Managed') as any;
        const risk = (row[headers.indexOf('risklevel')] || row[headers.indexOf('risk')] || 'Medium') as any;

        const client: Client = {
          id: `cli-imp-${Date.now()}-${i}`,
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
        createClientDoc(client).catch((err) => {
          console.warn('Failed to persist imported client to Firestore:', err);
        });
      }

      set((state) => ({
        clients: [...newClients, ...state.clients],
        isUsingMockData: false
      }));

      get().addAuditLog(
        'IMPORT_CSV_PARTICIPANTS',
        'DatabaseEngine',
        `import-${Date.now()}`,
        `Successfully imported ${newClients.length} participants from CSV roster`
      );

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
      'NDIS Number',
      'Date of Birth',
      'Primary Disability',
      'Status',
      'Plan Management Type',
      'Plan Start Date',
      'Plan End Date',
      'Total Budget',
      'Spent Budget',
      'Risk Level',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Primary Goal'
    ];

    const rows = clients.map((c) => [
      `"${c.name}"`,
      `"${c.ndisNumber}"`,
      `"${c.dateOfBirth}"`,
      `"${c.primaryDisability}"`,
      `"${c.status}"`,
      `"${c.planManagementType || 'Plan-Managed'}"`,
      `"${c.planStartDate}"`,
      `"${c.planEndDate}"`,
      c.totalBudget || 0,
      c.spentBudget || 0,
      `"${c.riskLevel}"`,
      `"${c.emergencyContact?.name || ''}"`,
      `"${c.emergencyContact?.phone || ''}"`,
      `"${c.goals?.[0]?.title || ''}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  generateParticipantTemplateCSV: () => {
    const headers = [
      'Name',
      'NDIS Number',
      'Date of Birth',
      'Primary Disability',
      'Total Budget',
      'Plan Management Type',
      'Risk Level',
      'Contact Name',
      'Phone',
      'Address',
      'Suburb',
      'State',
      'Postcode'
    ];
    const sampleRow = [
      '"Jordan Miller"',
      '"430891245"',
      '"2004-03-15"',
      '"Autism Spectrum Disorder (Level 3)"',
      '48500',
      '"Plan-Managed"',
      '"Medium"',
      '"Karen Miller"',
      '"0412 889 201"',
      '"12 Example Street"',
      '"Melbourne"',
      '"VIC"',
      '"3000"'
    ];
    return [headers.join(','), sampleRow.join(',')].join('\n');
  },

  importCompanyParticipants: async () => {
    const { COMPANY_DRIVE_PARTICIPANTS } = await import('@/lib/seedData');
    const existing = get().clients;
    const existingIds = new Set(existing.map((c) => c.id));
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    const toAdd = COMPANY_DRIVE_PARTICIPANTS.filter(
      (c) => !existingIds.has(c.id) && !existingNames.has(c.name.toLowerCase())
    );

    const merged = [
      ...toAdd,
      ...existing.map((c) => {
        const matchingCompany = COMPANY_DRIVE_PARTICIPANTS.find(
          (p) => p.id === c.id || p.name.toLowerCase() === c.name.toLowerCase()
        );
        return matchingCompany ? { ...matchingCompany, ...c } : c;
      })
    ];

    set({ clients: merged, selectedClientId: 'cli-ben-rusic' });

    get().addAuditLog(
      'SYNC',
      'Client',
      'all',
      `Imported & synchronized ${COMPANY_DRIVE_PARTICIPANTS.length} company participants from Breakthrough Staff Share Drive (Behaviour Support)`
    );

    get().addNotification({
      title: 'Company Participants Imported',
      message: `Successfully synchronized all 17 participants from Breakthrough Staff Share Drive (Behaviour Support).`,
      type: 'client',
      severity: 'low'
    });

    // Write all to Firestore in background
    Promise.all(
      COMPANY_DRIVE_PARTICIPANTS.map((client) =>
        createClientDoc(client).catch((err) => {
          console.warn(`Firestore sync note for ${client.name}:`, err);
        })
      )
    ).catch(() => {});

    return COMPANY_DRIVE_PARTICIPANTS.length;
  },

  batchImportValidatedClients: async (newClients: Client[]) => {
    try {
      if (!newClients || newClients.length === 0) {
        return { success: false, count: 0, error: 'No participants provided for import' };
      }

      // Persist all clients directly to Firestore collection
      await createClientsBatch(newClients);

      // Merge into local store state
      const currentClients = get().clients;
      const newIds = new Set(newClients.map((c) => c.id));
      const filteredExisting = currentClients.filter((c) => !newIds.has(c.id));
      const updatedClients = [...newClients, ...filteredExisting];

      set({
        clients: updatedClients,
        selectedClientId: newClients[0]?.id || get().selectedClientId,
        isUsingMockData: false
      });

      // Security Audit Trail
      get().addAuditLog(
        'IMPORT_BULK_PARTICIPANTS',
        'DatabaseEngine',
        `batch-${Date.now()}`,
        `Successfully validated and committed batch of ${newClients.length} participants to Firestore database: ${newClients.map((c) => c.name).slice(0, 5).join(', ')}${newClients.length > 5 ? '...' : ''}`
      );

      // System notification
      get().addNotification({
        title: 'Bulk Participant Batch Committed',
        message: `Successfully validated and committed ${newClients.length} participants directly to the Firestore collection.`,
        type: 'client',
        severity: 'low'
      });

      return { success: true, count: newClients.length };
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
  }
});

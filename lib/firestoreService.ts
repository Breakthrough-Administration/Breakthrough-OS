import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Client,
  CaseNote,
  BillingClaim,
  Incident,
  RestrictivePractice,
  ABCLog,
  BSPDocument,
  Lead,
  CRMTask,
  Practitioner,
  NDISSupportItem,
  AuditLog,
  ScheduledShift,
  UserProfile,
  AppNotification,
  AttachedDocument,
  DocumentCategory,
  DocumentTag,
  DriveSyncLog,
  PickerSearchInsight
} from '@/types';
import type { PickedGoogleDriveFile } from './googlePicker';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes undefined properties from an object or array so it can be safely written to Firestore.
 * Firestore strictly rejects documents containing undefined values.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as any;
  }
  if (typeof data === 'object') {
    // Preserve special Firestore objects or Dates
    if (
      data instanceof Date ||
      (data as any)?._methodName ||
      typeof (data as any)?.toMillis === 'function'
    ) {
      return data;
    }
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        sanitized[key] = sanitizeFirestoreData(val);
      }
    }
    return sanitized as T;
  }
  return data;
}

// Helper for generic collection fetch
async function getCollectionDocs<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as T));
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, collectionName);
    }
    console.warn(`Firestore getCollectionDocs failed for ${collectionName}:`, err);
    return [];
  }
}

// Helper for generic collection subscription
function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snap) => {
        const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as T));
        onUpdate(items);
      },
      (err) => {
        if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.GET, collectionName);
        }
        console.warn(`Subscription error on ${collectionName}:`, err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn(`Failed to set up subscription for ${collectionName}:`, err);
    if (onError) onError(err);
    return () => {};
  }
}

// Helper for document write
export async function setDocumentData<T extends { id?: string }>(
  collectionName: string,
  data: T,
  idOverride?: string
): Promise<void> {
  const id = idOverride || data.id || `doc-${Date.now()}`;
  const docRef = doc(db, collectionName, id);
  try {
    const cleanData = sanitizeFirestoreData(data);
    await setDoc(docRef, cleanData as any, { merge: true });
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
    }
    throw err;
  }
}

// Helper for document update
async function updateDocumentData(
  collectionName: string,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  try {
    const cleanUpdates = sanitizeFirestoreData(updates);
    await updateDoc(docRef, cleanUpdates);
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
    }
    throw err;
  }
}

// Helper for document delete
async function deleteDocumentData(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  try {
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
    throw err;
  }
}

// Clients
export const fetchClients = () => getCollectionDocs<Client>('clients');
export const createClient = (data: Client) => setDocumentData<Client>('clients', data);
export const updateClient = (id: string, updates: Partial<Client>) =>
  updateDocumentData('clients', id, updates);
export const deleteClient = (id: string) => deleteDocumentData('clients', id);
export const subscribeToClients = (
  onUpdate: (data: Client[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<Client>('clients', onUpdate, onError);

export async function createClientsBatch(clients: Client[]): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < clients.length; i += batchSize) {
    const chunk = clients.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const client of chunk) {
      const docRef = doc(db, 'clients', client.id);
      batch.set(docRef, sanitizeFirestoreData(client), { merge: true });
    }
    try {
      await batch.commit();
    } catch (err: any) {
      if (err?.message?.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, 'clients');
      }
      throw err;
    }
  }
}

// Case Notes
export const fetchCaseNotes = () => getCollectionDocs<CaseNote>('caseNotes');
export const createCaseNote = (data: CaseNote) => setDocumentData<CaseNote>('caseNotes', data);
export const updateCaseNote = (id: string, updates: Partial<CaseNote>) =>
  updateDocumentData('caseNotes', id, updates);
export const deleteCaseNote = (id: string) => deleteDocumentData('caseNotes', id);
export const subscribeToCaseNotes = (
  onUpdate: (data: CaseNote[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<CaseNote>('caseNotes', onUpdate, onError);

// Billing Claims
export const fetchBillingClaims = () => getCollectionDocs<BillingClaim>('billingClaims');
export const createBillingClaim = (data: BillingClaim) =>
  setDocumentData<BillingClaim>('billingClaims', data);
export const updateBillingClaim = (id: string, updates: Partial<BillingClaim>) =>
  updateDocumentData('billingClaims', id, updates);
export const deleteBillingClaim = (id: string) => deleteDocumentData('billingClaims', id);
export const subscribeToBillingClaims = (
  onUpdate: (data: BillingClaim[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<BillingClaim>('billingClaims', onUpdate, onError);

// Incidents
export const fetchIncidents = () => getCollectionDocs<Incident>('incidents');
export const createIncident = (data: Incident) => setDocumentData<Incident>('incidents', data);
export const updateIncident = (id: string, updates: Partial<Incident>) =>
  updateDocumentData('incidents', id, updates);
export const deleteIncident = (id: string) => deleteDocumentData('incidents', id);
export const subscribeToIncidents = (
  onUpdate: (data: Incident[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<Incident>('incidents', onUpdate, onError);

// Restrictive Practices
export const fetchRestrictivePractices = () =>
  getCollectionDocs<RestrictivePractice>('restrictivePractices');
export const createRestrictivePractice = (data: RestrictivePractice) =>
  setDocumentData<RestrictivePractice>('restrictivePractices', data);
export const updateRestrictivePractice = (id: string, updates: Partial<RestrictivePractice>) =>
  updateDocumentData('restrictivePractices', id, updates);
export const deleteRestrictivePractice = (id: string) =>
  deleteDocumentData('restrictivePractices', id);
export const subscribeToRestrictivePractices = (
  onUpdate: (data: RestrictivePractice[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<RestrictivePractice>('restrictivePractices', onUpdate, onError);

// ABC Logs
export const fetchABCLogs = () => getCollectionDocs<ABCLog>('abcLogs');
export const createABCLog = (data: ABCLog) => setDocumentData<ABCLog>('abcLogs', data);
export const updateABCLog = (id: string, updates: Partial<ABCLog>) =>
  updateDocumentData('abcLogs', id, updates);
export const deleteABCLog = (id: string) => deleteDocumentData('abcLogs', id);
export const subscribeToABCLogs = (
  onUpdate: (data: ABCLog[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<ABCLog>('abcLogs', onUpdate, onError);

// BSP Documents
export const fetchBSPDocuments = () => getCollectionDocs<BSPDocument>('bspDocuments');
export const createBSPDocument = (data: BSPDocument) =>
  setDocumentData<BSPDocument>('bspDocuments', data);
export const updateBSPDocument = (id: string, updates: Partial<BSPDocument>) =>
  updateDocumentData('bspDocuments', id, updates);
export const deleteBSPDocument = (id: string) => deleteDocumentData('bspDocuments', id);
export const subscribeToBSPDocuments = (
  onUpdate: (data: BSPDocument[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<BSPDocument>('bspDocuments', onUpdate, onError);

// CRM Leads
export const fetchCRMLeads = () => getCollectionDocs<Lead>('leads');
export const createCRMLead = (data: Lead) => setDocumentData<Lead>('leads', data);
export const updateCRMLead = (id: string, updates: Partial<Lead>) =>
  updateDocumentData('leads', id, updates);
export const deleteCRMLead = (id: string) => deleteDocumentData('leads', id);
export const subscribeToCRMLeads = (
  onUpdate: (data: Lead[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<Lead>('leads', onUpdate, onError);

// CRM Tasks
export const fetchCRMTasks = () => getCollectionDocs<CRMTask>('crmTasks');
export const createCRMTask = (data: CRMTask) => setDocumentData<CRMTask>('crmTasks', data);
export const updateCRMTask = (id: string, updates: Partial<CRMTask>) =>
  updateDocumentData('crmTasks', id, updates);
export const deleteCRMTask = (id: string) => deleteDocumentData('crmTasks', id);
export const subscribeToCRMTasks = (
  onUpdate: (data: CRMTask[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<CRMTask>('crmTasks', onUpdate, onError);

// Practitioners
export const fetchPractitioners = () => getCollectionDocs<Practitioner>('practitioners');
export const createPractitioner = (data: Practitioner) =>
  setDocumentData<Practitioner>('practitioners', data);
export const updatePractitioner = (id: string, updates: Partial<Practitioner>) =>
  updateDocumentData('practitioners', id, updates);
export const deletePractitioner = (id: string) => deleteDocumentData('practitioners', id);
export const subscribeToPractitioners = (
  onUpdate: (data: Practitioner[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<Practitioner>('practitioners', onUpdate, onError);

// Support Items (NDIS Price Guide)
export const fetchSupportItems = () => getCollectionDocs<NDISSupportItem>('supportItems');
export const createSupportItem = (data: NDISSupportItem) =>
  setDocumentData<NDISSupportItem>('supportItems', data);
export const updateSupportItem = (id: string, updates: Partial<NDISSupportItem>) =>
  updateDocumentData('supportItems', id, updates);
export const subscribeToSupportItems = (
  onUpdate: (data: NDISSupportItem[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<NDISSupportItem>('supportItems', onUpdate, onError);

// Audit Logs
export const fetchAuditLogs = () => getCollectionDocs<AuditLog>('auditLogs');
export const createAuditLog = (data: AuditLog) => setDocumentData<AuditLog>('auditLogs', data);
export const subscribeToAuditLogs = (
  onUpdate: (data: AuditLog[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<AuditLog>('auditLogs', onUpdate, onError);

// Scheduled Shifts
export const fetchScheduledShifts = () => getCollectionDocs<ScheduledShift>('scheduledShifts');
export const createScheduledShift = (data: ScheduledShift) =>
  setDocumentData<ScheduledShift>('scheduledShifts', data);
export const updateScheduledShift = (id: string, updates: Partial<ScheduledShift>) =>
  updateDocumentData('scheduledShifts', id, updates);
export const deleteScheduledShift = (id: string) => deleteDocumentData('scheduledShifts', id);
export const subscribeToScheduledShifts = (
  onUpdate: (data: ScheduledShift[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<ScheduledShift>('scheduledShifts', onUpdate, onError);

// Users
export const fetchUsers = () => getCollectionDocs<UserProfile>('users');
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('getUserProfile failed:', err);
    return null;
  }
};
export const saveUserProfile = (user: UserProfile) => setDocumentData<UserProfile>('users', user);
export const subscribeToUsers = (
  onUpdate: (data: UserProfile[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<UserProfile>('users', onUpdate, onError);

// Notifications
export const fetchNotifications = () => getCollectionDocs<AppNotification>('notifications');
export const createNotification = (data: AppNotification) =>
  setDocumentData<AppNotification>('notifications', data);
export const subscribeToNotifications = (
  onUpdate: (data: AppNotification[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<AppNotification>('notifications', onUpdate, onError);

// Documents & Picked Google Drive Files (Secure Service Layer)
export const fetchDocuments = () => getCollectionDocs<AttachedDocument>('documents');

export const subscribeToDocuments = (
  onUpdate: (data: AttachedDocument[]) => void,
  onError?: (err: Error) => void
) => subscribeToCollection<AttachedDocument>('documents', onUpdate, onError);

export async function fetchClientDocuments(clientId: string): Promise<AttachedDocument[]> {
  try {
    const colRef = collection(db, 'documents');
    const q = query(colRef, where('clientId', '==', clientId));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AttachedDocument));

    if (docs.length > 0) {
      return docs;
    }

    // Fallback: check client profile attachedDocuments
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.data() as Client;
      return clientData.attachedDocuments || [];
    }
    return [];
  } catch (err) {
    console.warn(`Failed to fetch documents for client ${clientId}:`, err);
    return [];
  }
}

export interface StoreDriveFileMetadataParams {
  file: PickedGoogleDriveFile;
  clientId: string;
  clientName?: string;
  category?: DocumentCategory;
  tags?: DocumentTag[];
  caseNoteId?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  clinicalNotes?: string;
}

/**
 * Securely stores the metadata of a picked Google Drive file within Firestore,
 * ensuring it is correctly associated with the specific client profile and optional case note.
 */
export async function storePickedDriveFileMetadata(
  params: StoreDriveFileMetadataParams
): Promise<AttachedDocument> {
  const {
    file,
    clientId,
    clientName,
    category = 'NDIS Plan Document',
    tags,
    caseNoteId,
    uploadedBy = 'user-practitioner-1',
    uploadedByName = 'Allied Health Practitioner',
    clinicalNotes = ''
  } = params;

  const docId = `gdoc-${Date.now()}-${file.id.slice(-6).replace(/[^a-zA-Z0-9]/g, 'x')}`;
  const now = new Date().toISOString();

  // Determine intelligent default tags based on document category
  const resolvedTags: DocumentTag[] =
    tags && tags.length > 0
      ? tags
      : category === 'NDIS Plan Document'
      ? ['Clinical', 'Financial']
      : category === 'Consent Form'
      ? ['Legal', 'Compliance']
      : category === 'BSP Document'
      ? ['Clinical', 'Behavioural']
      : category === 'Incident Photo Evidence'
      ? ['Legal', 'Compliance']
      : ['Clinical'];

  const attachedDoc: AttachedDocument = {
    id: docId,
    driveFileId: file.id,
    name: file.name,
    url: file.url || `https://drive.google.com/file/d/${file.id}/view`,
    sizeBytes: file.sizeBytes || 0,
    mimeType: file.mimeType || 'application/octet-stream',
    uploadedBy,
    uploadedByName,
    uploadedAt: now,
    category,
    tags: resolvedTags,
    clientId,
    clientName,
    caseNoteId: caseNoteId || undefined,
    iconUrl: file.iconUrl,
    storagePath: `google-drive/${file.id}`,
    metadata: {
      driveFileId: file.id,
      iconUrl: file.iconUrl || '',
      lastEditedUtc: file.lastEditedUtc || 0,
      description: file.description || '',
      source: 'google-picker',
      caseNoteId: caseNoteId || null,
      clinicalNotes,
      tags: resolvedTags,
      verifiedAt: now
    }
  };

  // 1. Write document metadata to `/documents/{docId}` collection
  await setDocumentData<AttachedDocument>('documents', attachedDoc, docId);

  // 2. Associate securely with specific client profile under `/clients/{clientId}`
  if (clientId) {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const clientData = clientSnap.data() as Client;
        const existingDocs = clientData.attachedDocuments || [];
        // Prevent duplicates for the same driveFileId
        const filteredDocs = existingDocs.filter(
          (d) => d.driveFileId !== file.id && d.id !== docId
        );
        const updatedAttached = [attachedDoc, ...filteredDocs];

        await updateDoc(clientRef, {
          attachedDocuments: updatedAttached,
          documents: updatedAttached,
          updatedAt: now
        });
      }
    } catch (clientErr) {
      console.warn(`Could not link document ${docId} to client ${clientId}:`, clientErr);
    }
  }

  // 3. If a caseNoteId is provided, associate with `/caseNotes/{caseNoteId}`
  if (caseNoteId) {
    try {
      const noteRef = doc(db, 'caseNotes', caseNoteId);
      const noteSnap = await getDoc(noteRef);
      if (noteSnap.exists()) {
        const noteData = noteSnap.data() as CaseNote;
        const linkedIds = noteData.linkedDocumentIds || [];
        const existingFiles = noteData.linkedDriveFiles || [];

        const updatedLinkedIds = linkedIds.includes(docId) ? linkedIds : [...linkedIds, docId];
        const updatedFiles = [
          ...existingFiles.filter((f) => f.driveFileId !== file.id && f.id !== docId),
          {
            id: docId,
            driveFileId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            url: file.url,
            sizeBytes: file.sizeBytes,
            category,
            uploadedAt: now
          }
        ];

        await updateDoc(noteRef, {
          linkedDocumentIds: updatedLinkedIds,
          linkedDriveFiles: updatedFiles,
          updatedAt: now
        });
      }
    } catch (noteErr) {
      console.warn(`Could not link document ${docId} to case note ${caseNoteId}:`, noteErr);
    }
  }

  return attachedDoc;
}

/**
 * Stores multiple picked Google Drive files within Firestore and associates them with a client.
 */
export async function storeMultiplePickedDriveFiles(params: {
  files: PickedGoogleDriveFile[];
  clientId: string;
  clientName?: string;
  category?: DocumentCategory;
  caseNoteId?: string;
  uploadedBy?: string;
  uploadedByName?: string;
}): Promise<AttachedDocument[]> {
  const { files, ...rest } = params;
  const results: AttachedDocument[] = [];
  for (const file of files) {
    const docRecord = await storePickedDriveFileMetadata({ file, ...rest });
    results.push(docRecord);
  }
  return results;
}

/**
 * Links an existing stored document to a clinical case note.
 */
export async function linkDocumentToCaseNote(
  documentId: string,
  caseNoteId: string,
  clientId?: string,
  clinicalNotes?: string
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update /documents/{documentId}
  const docRef = doc(db, 'documents', documentId);
  await updateDoc(docRef, {
    caseNoteId,
    'metadata.caseNoteId': caseNoteId,
    'metadata.clinicalNotes': clinicalNotes || '',
    'metadata.linkedToCaseNoteAt': now,
    updatedAt: now
  });

  const docSnap = await getDoc(docRef);
  const docData = docSnap.exists() ? (docSnap.data() as AttachedDocument) : null;

  // 2. Update /caseNotes/{caseNoteId}
  const noteRef = doc(db, 'caseNotes', caseNoteId);
  const noteSnap = await getDoc(noteRef);
  if (noteSnap.exists()) {
    const noteData = noteSnap.data() as CaseNote;
    const existingIds = noteData.linkedDocumentIds || [];
    const existingFiles = noteData.linkedDriveFiles || [];

    const updatedIds = existingIds.includes(documentId) ? existingIds : [...existingIds, documentId];
    const newDriveFileEntry = docData
      ? {
          id: documentId,
          driveFileId: docData.driveFileId || documentId,
          name: docData.name,
          mimeType: docData.mimeType,
          url: docData.url,
          sizeBytes: docData.sizeBytes,
          category: docData.category,
          uploadedAt: docData.uploadedAt
        }
      : null;

    const updatedFiles = newDriveFileEntry
      ? [
          ...existingFiles.filter((f) => f.id !== documentId),
          newDriveFileEntry
        ]
      : existingFiles;

    await updateDoc(noteRef, {
      linkedDocumentIds: updatedIds,
      linkedDriveFiles: updatedFiles,
      updatedAt: now
    });
  }

  // 3. Update client attachedDocuments if clientId provided
  const targetClientId = clientId || docData?.clientId;
  if (targetClientId) {
    try {
      const clientRef = doc(db, 'clients', targetClientId);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const clientData = clientSnap.data() as Client;
        const updatedDocs = (clientData.attachedDocuments || []).map((d) =>
          d.id === documentId ? { ...d, caseNoteId } : d
        );
        await updateDoc(clientRef, {
          attachedDocuments: updatedDocs,
          documents: updatedDocs,
          updatedAt: now
        });
      }
    } catch (err) {
      console.warn('Failed to update client attachedDocuments with caseNoteId:', err);
    }
  }
}

/**
 * Unlinks or deletes a document from a client's profile and documents collection.
 */
export async function unlinkDocumentFromClient(
  documentId: string,
  clientId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'documents', documentId));
  } catch (err) {
    console.warn(`Error deleting document ${documentId}:`, err);
  }

  if (clientId) {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const clientData = clientSnap.data() as Client;
        const updatedDocs = (clientData.attachedDocuments || []).filter((d) => d.id !== documentId);
        await updateDoc(clientRef, {
          attachedDocuments: updatedDocs,
          documents: updatedDocs,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn(`Error unlinking document ${documentId} from client ${clientId}:`, err);
    }
  }
}

/**
 * Fetches the most recent files successfully linked to client profiles using the metadata stored in Firestore.
 */
export async function fetchRecentLinkedDriveDocuments(limitCount: number = 5): Promise<AttachedDocument[]> {
  try {
    const allDocs = await fetchDocuments();
    // Filter to documents linked to client profiles
    const linkedDocs = allDocs.filter((d) => Boolean(d.clientId || d.clientName));

    // Sort descending by uploadedAt / createdAt
    linkedDocs.sort((a, b) => {
      const dateA = new Date(a.uploadedAt || a.metadata?.verifiedAt || 0).getTime();
      const dateB = new Date(b.uploadedAt || b.metadata?.verifiedAt || 0).getTime();
      return dateB - dateA;
    });

    return linkedDocs.slice(0, limitCount);
  } catch (err) {
    console.warn('Failed to fetch recent linked drive documents from Firestore:', err);
    return [];
  }
}

/**
 * Batch updates tags on multiple documents and their corresponding client attachedDocuments.
 */
export async function batchUpdateDocumentTags(
  documentIds: string[],
  tagsToAdd: string[]
): Promise<void> {
  const now = new Date().toISOString();
  for (const docId of documentIds) {
    try {
      const docRef = doc(db, 'documents', docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as AttachedDocument;
        const currentTags = data.tags || [];
        const mergedTags = Array.from(new Set([...currentTags, ...tagsToAdd])) as DocumentTag[];

        await updateDoc(docRef, {
          tags: mergedTags,
          updatedAt: now
        });

        if (data.clientId) {
          const clientRef = doc(db, 'clients', data.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            const updatedDocs = (clientData.attachedDocuments || []).map((d) =>
              d.id === docId ? { ...d, tags: mergedTags } : d
            );
            await updateDoc(clientRef, {
              attachedDocuments: updatedDocs,
              documents: updatedDocs,
              updatedAt: now
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to batch update tags for doc ${docId}:`, err);
    }
  }
}

/**
 * Records a real-time Google Drive synchronization log to Firestore.
 */
export async function recordDriveSyncLog(
  log: Omit<DriveSyncLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<DriveSyncLog> {
  const id = log.id || `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = log.timestamp || new Date().toISOString();
  const rawLog: DriveSyncLog = {
    ...log,
    id,
    timestamp,
    ...(log.firestorePath || log.fileId ? { firestorePath: log.firestorePath || `/documents/${log.fileId}` } : {})
  };
  const fullLog = sanitizeFirestoreData(rawLog);

  try {
    const logRef = doc(db, 'syncLogs', id);
    await setDoc(logRef, fullLog);
  } catch (err) {
    console.warn('Could not write sync log to Firestore (continuing in local state):', err);
  }

  return fullLog;
}

/**
 * Fetches recent Drive sync logs from Firestore.
 */
export async function fetchDriveSyncLogs(limitCount: number = 20): Promise<DriveSyncLog[]> {
  try {
    const logs = await getCollectionDocs<DriveSyncLog>('syncLogs');
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, limitCount);
  } catch (err) {
    console.warn('Failed to fetch sync logs from Firestore:', err);
    return [];
  }
}

/**
 * Records or increments a search query in Firestore to track frequent search terms.
 */
export async function recordPickerSearchQuery(
  query: string,
  practitionerName?: string,
  categorySuggestion?: string
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;

  const queryDocId = `query-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}`;
  const now = new Date().toISOString();

  try {
    const queryRef = doc(db, 'pickerSearchInsights', queryDocId);
    const snap = await getDoc(queryRef);

    if (snap.exists()) {
      const existing = snap.data() as PickerSearchInsight;
      await updateDoc(queryRef, sanitizeFirestoreData({
        count: (existing.count || 1) + 1,
        lastSearchedAt: now,
        lastPractitionerName: practitionerName || existing.lastPractitionerName || 'Clinician'
      }));
    } else {
      const newInsight: PickerSearchInsight = sanitizeFirestoreData({
        id: queryDocId,
        query: trimmed,
        count: 1,
        lastSearchedAt: now,
        ...(categorySuggestion ? { categorySuggestion } : {}),
        lastPractitionerName: practitionerName || 'Clinician'
      });
      await setDoc(queryRef, newInsight);
    }
  } catch (err) {
    console.warn(`Failed to record search insight for "${trimmed}" to Firestore:`, err);
  }
}

/**
 * Fetches the most frequently searched terms in the Google Picker from Firestore.
 */
export async function fetchPickerSearchInsights(limitCount: number = 10): Promise<PickerSearchInsight[]> {
  try {
    const insights = await getCollectionDocs<PickerSearchInsight>('pickerSearchInsights');
    if (insights && insights.length > 0) {
      insights.sort((a, b) => (b.count || 0) - (a.count || 0));
      return insights.slice(0, limitCount);
    }
  } catch (err) {
    console.warn('Failed to fetch search insights from Firestore, falling back to defaults:', err);
  }

  // Fallback defaults for allied health & NDIS workflows
  return [
    { id: 'query-ndis_plan', query: 'NDIS Plan', count: 48, lastSearchedAt: new Date(Date.now() - 3600000).toISOString(), categorySuggestion: 'NDIS Plan Document' },
    { id: 'query-pbs_assessment', query: 'PBS Assessment', count: 35, lastSearchedAt: new Date(Date.now() - 7200000).toISOString(), categorySuggestion: 'Assessment PDF' },
    { id: 'query-functional_behaviour', query: 'Functional Behaviour', count: 29, lastSearchedAt: new Date(Date.now() - 14400000).toISOString(), categorySuggestion: 'BSP Document' },
    { id: 'query-consent_form', query: 'Consent Form', count: 24, lastSearchedAt: new Date(Date.now() - 28800000).toISOString(), categorySuggestion: 'Consent Form' },
    { id: 'query-sensory_profile', query: 'Sensory Profile', count: 19, lastSearchedAt: new Date(Date.now() - 86400000).toISOString(), categorySuggestion: 'Assessment PDF' },
    { id: 'query-progress_report', query: 'Progress Report', count: 16, lastSearchedAt: new Date(Date.now() - 172800000).toISOString(), categorySuggestion: 'Clinical Report' }
  ].slice(0, limitCount);
}

// Generic Fallbacks
export const createDocument = setDocumentData;
export const updateDocument = updateDocumentData;
export const deleteDocument = deleteDocumentData;

// Purge any mock participants from Firestore to ensure production cleanliness
export async function purgeMockDataFromFirestore(): Promise<void> {
  try {
    const clientsCol = collection(db, 'clients');
    const snapshot = await getDocs(clientsCol);
    const mockDocIds: string[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (
        d.id.startsWith('cli-') ||
        data.isCompanyDriveParticipant === true ||
        d.id.startsWith('client-mock') ||
        ['Ben Rusic', 'Milly Kane', 'Cooper Brooks', 'Reuben Turner', 'Reyansh Chawla'].includes(data.name)
      ) {
        mockDocIds.push(d.id);
      }
    });

    if (mockDocIds.length > 0) {
      const batch = writeBatch(db);
      mockDocIds.forEach((id) => {
        batch.delete(doc(db, 'clients', id));
      });
      await batch.commit();
      console.info(`Successfully purged ${mockDocIds.length} mock participants from Firestore`);
    }
  } catch (err) {
    console.warn('Could not purge mock documents from Firestore:', err);
  }
}

// Seed Initial Data (only seeds official price guides or non-empty collections)
export async function seedInitialFirestoreDataIfEmpty(seedData: Record<string, any[]>): Promise<void> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const [collectionName, items] of Object.entries(seedData)) {
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items.slice(0, 50)) {
          const id = item.id || `${collectionName}-${Math.random().toString(36).substring(2, 8)}`;
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, sanitizeFirestoreData(item), { merge: true });
          count++;
        }
      }
    }
    if (count > 0) {
      await batch.commit();
      console.info('Successfully populated initial Firestore system documents');
    }
  } catch (err) {
    console.warn('Firestore seeding skipped or restricted by security rules:', err);
  }
}

// Quick Notes for Google Keep Module
export interface QuickNoteDoc {
  id: string;
  title: string;
  content: string;
  color?: string;
  tag?: string;
  date?: string;
  clientId?: string;
  clientName?: string;
  isConverted?: boolean;
  convertedCaseNoteId?: string;
  checklist?: { id?: string; text: string; completed: boolean }[];
  receiptAmount?: number;
  isScannedDoc?: boolean;
  labels?: string[];
  text?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function subscribeToQuickNotes(
  onUpdate: (docs: QuickNoteDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  return subscribeToCollection<QuickNoteDoc>('quickNotes', onUpdate, onError);
}

export async function saveQuickNote(note: QuickNoteDoc): Promise<void> {
  await setDocumentData<QuickNoteDoc>('quickNotes', note);
}

export async function deleteQuickNote(id: string): Promise<void> {
  await deleteDocumentData('quickNotes', id);
}

export async function convertQuickNoteToBIRPCaseNote(params: {
  note: QuickNoteDoc;
  clientId: string;
  clientName: string;
  practitionerId: string;
  practitionerName: string;
  interventionText: string;
  responseText: string;
  planText: string;
}): Promise<CaseNote> {
  const now = new Date().toISOString();
  const caseNoteId = `cn-birp-${Date.now()}`;
  const caseNote: CaseNote = {
    id: caseNoteId,
    clientId: params.clientId,
    clientName: params.clientName,
    practitionerId: params.practitionerId,
    practitionerName: params.practitionerName,
    date: now.split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    sessionDurationMinutes: 60,
    durationMinutes: 60,
    format: 'BIRP',
    category: 'Capacity Building - Improved Daily Living',
    subjective: params.note.content,
    objective: params.interventionText,
    assessment: params.responseText,
    plan: params.planText,
    content: `${params.note.title}\n${params.note.content}`,
    intervention: params.interventionText,
    linkedGoalIds: [],
    flaggedForReview: false,
    status: 'Approved',
    createdAt: now,
    updatedAt: now
  };

  await setDocumentData<CaseNote>('caseNotes', caseNote);

  // Mark quickNote as converted
  await updateDocumentData('quickNotes', params.note.id, {
    isConverted: true,
    convertedCaseNoteId: caseNoteId,
    clientName: params.clientName,
    updatedAt: now
  });

  return caseNote;
}

// ==========================================
// Participant Session Feedback
// ==========================================
export interface ParticipantFeedbackDoc {
  id: string;
  participantId: string;
  participantName: string;
  practitionerId: string;
  practitionerName: string;
  sessionDate: string;
  sessionType: string;
  overallRating: number; // 1 to 5
  sentiment: 'Delighted' | 'Good' | 'Neutral' | 'Needs Attention';
  highlights?: string[];
  notesToPractitioner: string;
  requestFollowUp: boolean;
  submittedBy: 'Participant' | 'Nominee / Carer';
  status: 'Submitted' | 'Reviewed' | 'Acknowledged';
  createdAt: string;
  practitionerResponseNote?: string;
}

export function subscribeToParticipantFeedback(
  participantId: string,
  onUpdate: (docs: ParticipantFeedbackDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  return subscribeToCollection<ParticipantFeedbackDoc>(
    'participant_feedback',
    (all) => {
      onUpdate(all.filter((f) => f.participantId === participantId));
    },
    onError
  );
}

export async function saveParticipantFeedback(feedback: ParticipantFeedbackDoc): Promise<void> {
  await setDocumentData<ParticipantFeedbackDoc>('participant_feedback', feedback);
}



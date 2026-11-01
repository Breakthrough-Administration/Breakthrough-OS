/**
 * Document Assessment & Intelligent Clinical Router Service
 * Automatically assesses dropped folders, multiple files, and Google Drive files,
 * classifies them into the correct participant subfolder, and extracts
 * clinical & administrative updates to synchronize directly into Firestore.
 */

import { Client, AttachedDocument, DocumentCategory } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import { updateClient as updateClientDoc, storePickedDriveFileMetadata } from '@/lib/firestoreService';

export interface DroppedDocumentItem {
  id: string;
  file?: File;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  googleDriveId?: string;
  googleDriveUrl?: string;
  contentPreview?: string;
}

export interface ExtractedParticipantUpdates {
  ndisNumber?: string;
  planStartDate?: string;
  planEndDate?: string;
  totalBudget?: number;
  allocatedBudget?: number;
  primaryDisability?: string;
  secondaryDisabilities?: string[];
  bspExpiryDate?: string;
  bspStatus?: string;
  restrictivePracticesActive?: boolean;
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone: string;
  };
  status?: 'Active' | 'Onboarding' | 'Archived' | 'Pending Plan';
}

export interface DocumentAssessment {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  googleDriveId?: string;
  googleDriveUrl?: string;
  targetParticipantId: string;
  targetParticipantName: string;
  targetSubfolder: string;
  category: DocumentCategory;
  confidence: number;
  rationale: string;
  extractedUpdates: ExtractedParticipantUpdates;
  suggestedNewParticipant?: boolean;
  status: 'pending' | 'assessing' | 'ready' | 'committed' | 'error';
  error?: string;
}

/**
 * Standard subfolder mapping rules for NDIS Allied Health & Behaviour Support
 */
const SUBFOLDER_RULES: Record<string, { category: DocumentCategory; keywords: string[] }> = {
  'BSP': {
    category: 'BSP Document',
    keywords: [
      'bsp',
      'behaviour support',
      'behavior support',
      'intervention plan',
      'positive behaviour',
      'restrictive practice',
      'interim bsp',
      'comprehensive bsp',
      'pbsp',
    ],
  },
  'NDIS Plan': {
    category: 'NDIS Plan Document',
    keywords: [
      'ndis plan',
      'pace plan',
      'plan 20',
      'funding',
      'participant plan',
      'statement of supports',
      'ndia plan',
      'plan details',
    ],
  },
  'FBA': {
    category: 'Assessment PDF',
    keywords: [
      'fba',
      'functional behaviour assessment',
      'functional analysis',
      'scatter plot',
      'abc data',
      'antecedent',
      'behaviour formulation',
    ],
  },
  'Assessments/ Reports': {
    category: 'Clinical Report',
    keywords: [
      'assessment',
      'clinical report',
      'psychology',
      'speech pathology',
      'occupational therapy',
      'ot report',
      'sensory profile',
      'vineland',
      'whodas',
      'allied health report',
      'neuropsych',
      'diagnostic',
    ],
  },
  'Invoices': {
    category: 'Invoicing & Claims',
    keywords: [
      'invoice',
      'claim',
      'receipt',
      'billing',
      'tax invoice',
      'remittance',
      'payment advice',
      'pace claim',
      'timesheet',
    ],
  },
  'Service Agreement': {
    category: 'Service Agreement',
    keywords: [
      'service agreement',
      'schedule of supports',
      'client contract',
      'terms of business',
      'engagement agreement',
      'service contract',
    ],
  },
  'Consent Form': {
    category: 'Consent Form',
    keywords: [
      'consent',
      'privacy consent',
      'authority to release',
      'information sharing',
      'media consent',
      'advocacy consent',
      'consent form',
    ],
  },
  'Emergency and Disaster Plan': {
    category: 'Legal Document',
    keywords: [
      'emergency',
      'disaster',
      'evacuation',
      'fire safety',
      'crisis plan',
      'safety plan',
      'emergency contact',
    ],
  },
  'Goals Statement': {
    category: 'Clinical Report',
    keywords: [
      'goal',
      'goals statement',
      'gas target',
      'outcome measure',
      'smart goal',
      'participant goals',
    ],
  },
  'Letters/ Correspondence': {
    category: 'Legal Document',
    keywords: [
      'letter',
      'correspondence',
      'ndia notice',
      'planner letter',
      'review outcome',
      'tribunal',
      'formal notice',
      'email confirmation',
    ],
  },
  'Progress Notes': {
    category: 'Clinical Report',
    keywords: [
      'progress note',
      'session note',
      'contact note',
      'case note',
      'summary report',
      'monthly note',
    ],
  },
  'Referral Form': {
    category: 'Consent Form',
    keywords: [
      'referral',
      'intake form',
      'request for service',
      'onboarding form',
      'intake assessment',
    ],
  },
};

/**
 * Traverses dropped DataTransfer items recursively, handling entire directories,
 * nested subdirectories, and multiple files across any depth.
 */
export async function readDroppedItemsRecursively(
  dataTransfer: DataTransfer
): Promise<DroppedDocumentItem[]> {
  const items: DroppedDocumentItem[] = [];
  const entries: any[] = [];

  // Check if webkitGetAsEntry is available
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          entries.push(entry);
        } else {
          const file = item.getAsFile();
          if (file) {
            items.push({
              id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file,
              name: file.name,
              path: file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
            });
          }
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      items.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        path: (file as any).webkitRelativePath || file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
    }
    return items;
  }

  // Recursive entry reader
  async function readEntry(entry: any, currentPath: string): Promise<void> {
    if (!entry) return;

    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          async (file: File) => {
            let contentPreview = '';
            try {
              if (
                file.type.startsWith('text/') ||
                file.name.endsWith('.txt') ||
                file.name.endsWith('.csv') ||
                file.name.endsWith('.md') ||
                file.name.endsWith('.json')
              ) {
                contentPreview = (await file.slice(0, 2048).text()) || '';
              }
            } catch {
              // Ignore preview extraction error
            }

            items.push({
              id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file,
              name: file.name,
              path: currentPath ? `${currentPath}/${file.name}` : file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              contentPreview,
            });
            resolve();
          },
          (err: any) => {
            console.warn('Failed to read file entry:', err);
            resolve();
          }
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        const batch: any[] = [];
        let done = false;
        while (!done) {
          const result: any[] = await new Promise((res) => {
            dirReader.readEntries(
              (results: any[]) => res(results || []),
              (err: any) => {
                console.warn('Error reading directory entries:', err);
                res([]);
              }
            );
          });
          if (result.length === 0) {
            done = true;
          } else {
            batch.push(...result);
          }
        }
        return batch;
      };

      const childEntries = await readAllEntries();
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      for (const child of childEntries) {
        await readEntry(child, nextPath);
      }
    }
  }

  for (const entry of entries) {
    await readEntry(entry, '');
  }

  return items;
}

/**
 * Assesses an individual document:
 * 1. Matches target participant by name, NDIS number, and directory path.
 * 2. Classifies document into the correct one of the 12 standard participant subfolders.
 * 3. Extracts clinical and administrative field updates to apply to the participant.
 */
export function assessDocumentLocally(
  item: DroppedDocumentItem,
  participants: Client[],
  defaultClient?: Client | null
): DocumentAssessment {
  const fullText = `${item.path} ${item.name}`.toLowerCase();

  // 1. MATCH PARTICIPANT
  let bestParticipant: Client | null = null;
  let participantScore = 0;
  let participantMatchRationale = '';

  for (const p of participants) {
    let score = 0;
    const pName = p.name.toLowerCase();
    const pId = p.id.toLowerCase();
    const pNdis = p.ndisNumber ? p.ndisNumber.replace(/[^0-9]/g, '') : '';

    // Check full name match in path or file
    if (fullText.includes(pName)) {
      score += 50;
      participantMatchRationale = `Matched participant name "${p.name}" in folder/filename`;
    }

    // Check NDIS number match
    if (pNdis && pNdis.length >= 7 && fullText.includes(pNdis)) {
      score += 60;
      participantMatchRationale = `Matched 9-digit NDIS number ${p.ndisNumber}`;
    }

    // Check individual name parts (first & last name)
    const nameParts = pName.split(/\s+/).filter((part) => part.length >= 3);
    const matchedParts = nameParts.filter((part) => fullText.includes(part));
    if (matchedParts.length === nameParts.length && nameParts.length > 1) {
      score += 40;
      if (!participantMatchRationale) {
        participantMatchRationale = `Matched name parts [${matchedParts.join(', ')}]`;
      }
    } else if (matchedParts.length > 0) {
      score += matchedParts.length * 15;
    }

    // Check ID match
    if (fullText.includes(pId) || fullText.includes(pId.replace(/^cli-/, ''))) {
      score += 45;
      participantMatchRationale = `Matched client ID identifier ${p.id}`;
    }

    if (score > participantScore) {
      participantScore = score;
      bestParticipant = p;
    }
  }

  // Fallback to folder-level candidate participant name if no existing participant matches
  let suggestedNewParticipant = false;
  let candidateParticipantName = '';

  if (!bestParticipant) {
    const rawPath = item.path || '';
    const segments = rawPath.split(/[\/\\]+/).filter(Boolean);
    if (segments.length > 1) {
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i].trim();
        const isStandardSub = STANDARD_DRIVE_SUBFOLDERS.some(
          (sf) => sf.toLowerCase() === seg.toLowerCase()
        );
        const isGeneric = [
          'documents',
          'files',
          'upload',
          'share',
          'drive',
          'downloads',
          'participant',
          'participants',
          'staff share drive',
          'behaviour support',
        ].includes(seg.toLowerCase());

        if (!isStandardSub && !isGeneric && seg.length >= 3) {
          const cleaned = seg.replace(/[-_]\s*43\d{7}/, '').replace(/[_\.]+/g, ' ').trim();
          if (cleaned.length >= 3) {
            candidateParticipantName = cleaned;
            suggestedNewParticipant = true;
            participantScore = 40;
            participantMatchRationale = `Detected participant directory "${cleaned}"`;
            break;
          }
        }
      }
    }
  }

  // Fallback to active/default client if provided and no folder candidate found
  if (!bestParticipant && !candidateParticipantName && defaultClient) {
    bestParticipant = defaultClient;
    participantScore = 30;
    participantMatchRationale = `Assigned to active participant (${defaultClient.name})`;
  }

  // 2. CLASSIFY SUBFOLDER & CATEGORY
  let bestSubfolder = 'Assessments/ Reports';
  let bestCategory: DocumentCategory = 'Clinical Report';
  let subfolderScore = 0;
  let subfolderRationale = 'Categorized by default clinical assessment rule';

  const previewText = (item.contentPreview || '').toLowerCase();
  const allTextToInspect = `${fullText} ${previewText}`;

  for (const [subfolderName, rule] of Object.entries(SUBFOLDER_RULES)) {
    let score = 0;

    // Check if path explicitly contains the subfolder name
    if (fullText.includes(subfolderName.toLowerCase())) {
      score += 45;
    }

    // Check keywords in fullText and content preview
    for (const kw of rule.keywords) {
      if (allTextToInspect.includes(kw)) {
        score += 25;
      }
    }

    // Extension weighting
    if (subfolderName === 'Invoices' && (fullText.endsWith('.xlsx') || fullText.endsWith('.csv'))) {
      score += 15;
    }

    if (score > subfolderScore) {
      subfolderScore = score;
      bestSubfolder = subfolderName;
      bestCategory = rule.category;
      subfolderRationale = `Matched category keywords for "${subfolderName}"`;
    }
  }

  // 3. EXTRACT CLINICAL / ADMINISTRATIVE UPDATES FOR PARTICIPANT
  const updates: ExtractedParticipantUpdates = {};

  // Extract NDIS Number if present in filename, path, or preview
  const ndisMatch = allTextToInspect.match(/\b(43\d{7})\b/);
  if (ndisMatch && ndisMatch[1]) {
    updates.ndisNumber = ndisMatch[1];
  }

  // NDIS Plan extractions
  if (bestSubfolder === 'NDIS Plan' || allTextToInspect.includes('ndis plan')) {
    updates.status = 'Active';

    // Check for years e.g. 2026-2027 or 2026
    const yearMatch = allTextToInspect.match(/20(2[5-9])-20(2[6-9])/);
    if (yearMatch) {
      updates.planStartDate = `20${yearMatch[1]}-01-01`;
      updates.planEndDate = `20${yearMatch[2]}-12-31`;
    }

    // Extract budget figures like $65k or 65000
    const budgetMatch = allTextToInspect.match(/\$?(\d{2,3})[k,\s]000|\$?(\d{5,6})/);
    if (budgetMatch) {
      const val = parseInt(budgetMatch[1] || budgetMatch[2], 10);
      if (val > 1000) {
        updates.totalBudget = val;
        updates.allocatedBudget = Math.round(val * 0.85);
      }
    }
  }

  // BSP extractions
  if (bestSubfolder === 'BSP' || allTextToInspect.includes('behaviour support plan')) {
    updates.bspStatus = 'Active';
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    updates.bspExpiryDate = oneYearLater;

    // Check for restrictive practices mentions
    if (
      allTextToInspect.includes('restrictive') ||
      allTextToInspect.includes('chemical') ||
      allTextToInspect.includes('environmental') ||
      allTextToInspect.includes('mechanical') ||
      allTextToInspect.includes('prn')
    ) {
      updates.restrictivePracticesActive = true;
    }
  }

  // Clinical disability extractions
  if (bestSubfolder === 'Assessments/ Reports' || bestSubfolder === 'FBA') {
    if (allTextToInspect.includes('autism') || allTextToInspect.includes('asd')) {
      updates.primaryDisability = 'Autism Spectrum Disorder';
    } else if (allTextToInspect.includes('abi') || allTextToInspect.includes('brain injury')) {
      updates.primaryDisability = 'Acquired Brain Injury (ABI)';
    } else if (allTextToInspect.includes('cerebral palsy')) {
      updates.primaryDisability = 'Cerebral Palsy';
    } else if (allTextToInspect.includes('down syndrome')) {
      updates.primaryDisability = 'Down Syndrome';
    }
  }

  const confidence = Math.min(
    98,
    Math.max(45, Math.round(participantScore * 0.5 + subfolderScore * 0.5 + 20))
  );

  return {
    id: item.id,
    fileName: item.name,
    filePath: item.path,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    googleDriveId: item.googleDriveId,
    googleDriveUrl: item.googleDriveUrl,
    targetParticipantId: bestParticipant?.id || '',
    targetParticipantName:
      bestParticipant?.name || candidateParticipantName || 'Unassigned (Select Participant)',
    suggestedNewParticipant,
    targetSubfolder: bestSubfolder,
    category: bestCategory,
    confidence,
    rationale: `${participantMatchRationale || 'Evaluated document'} • ${subfolderRationale}`,
    extractedUpdates: updates,
    status: 'ready',
  };
}

/**
 * Executes server-side AI assessment with fallback to heuristic classification
 */
export async function assessDocumentWithAI(
  item: DroppedDocumentItem,
  participants: Client[],
  defaultClient?: Client | null
): Promise<DocumentAssessment> {
  const localAssessment = assessDocumentLocally(item, participants, defaultClient);

  try {
    const res = await fetch('/api/documents/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: item.name,
        filePath: item.path,
        mimeType: item.mimeType,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          ndisNumber: p.ndisNumber,
        })),
        defaultClientId: defaultClient?.id,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.assessment) {
        return {
          ...localAssessment,
          targetParticipantId: data.assessment.targetParticipantId || localAssessment.targetParticipantId,
          targetParticipantName: data.assessment.targetParticipantName || localAssessment.targetParticipantName,
          targetSubfolder: data.assessment.targetSubfolder || localAssessment.targetSubfolder,
          category: data.assessment.category || localAssessment.category,
          confidence: data.assessment.confidence || localAssessment.confidence,
          rationale: data.assessment.rationale || localAssessment.rationale,
          extractedUpdates: {
            ...localAssessment.extractedUpdates,
            ...(data.assessment.extractedUpdates || {}),
          },
        };
      }
    }
  } catch (err) {
    // Graceful fallback to local heuristic
    console.info('Using local document assessment engine:', err);
  }

  return localAssessment;
}

/**
 * Commits an assessed document into Firestore:
 * 1. Attaches the document to the participant's record with target subfolder routing.
 * 2. Merges extracted clinical & administrative updates into the participant document.
 * 3. Saves document record into the global documents collection.
 */
export async function commitDocumentAssessment(
  assessment: DocumentAssessment,
  participants: Client[],
  currentUser?: { id?: string; name?: string } | null
): Promise<{ success: boolean; updatedParticipant?: Client; isNew?: boolean; error?: string }> {
  try {
    const participant = participants.find(
      (p) => p.id === assessment.targetParticipantId || p.name.toLowerCase() === assessment.targetParticipantName.toLowerCase()
    );

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newAttachedDoc: AttachedDocument = {
      id: documentId,
      name: assessment.fileName,
      url: assessment.googleDriveUrl || `https://drive.google.com/file/d/${assessment.id}/view`,
      mimeType: assessment.mimeType,
      sizeBytes: assessment.sizeBytes,
      uploadedBy: currentUser?.id || 'staff-system',
      uploadedByName: currentUser?.name || 'Allied Health Practitioner',
      uploadedAt: new Date().toISOString(),
      category: assessment.category,
      tags: [assessment.targetSubfolder, 'Drive Sync', 'AI Assessed'],
      caseNoteId: undefined,
    };

    let targetClient: Client | undefined = participant;
    let isNewClientCreated = false;

    if (!targetClient) {
      if (
        assessment.targetParticipantName &&
        assessment.targetParticipantName !== 'Unassigned (Select Participant)' &&
        assessment.targetParticipantName.trim().length > 0
      ) {
        // Auto-provision new participant document in Firestore
        const newClientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const initialClientDoc: Client = {
          id: newClientId,
          name: assessment.targetParticipantName.trim(),
          ndisNumber: assessment.extractedUpdates.ndisNumber || `43${Math.floor(1000000 + Math.random() * 9000000)}`,
          dateOfBirth: '2000-01-01',
          status: assessment.extractedUpdates.status || 'Active',
          primaryDisability: assessment.extractedUpdates.primaryDisability || 'Allied Health Participant',
          secondaryDisabilities: assessment.extractedUpdates.secondaryDisabilities || [],
          driveFolderPath: `Staff Share Drive > Participants > Behaviour Support > ${assessment.targetParticipantName.trim()}`,
          driveSubfolders: STANDARD_DRIVE_SUBFOLDERS,
          allocatedBudget: assessment.extractedUpdates.allocatedBudget || 45000,
          spentBudget: 0,
          totalBudget: assessment.extractedUpdates.totalBudget || 55000,
          planStartDate: assessment.extractedUpdates.planStartDate || new Date().toISOString().split('T')[0],
          planEndDate:
            assessment.extractedUpdates.planEndDate ||
            new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          bspStatus: assessment.extractedUpdates.bspStatus || 'Active',
          bspExpiryDate: assessment.extractedUpdates.bspExpiryDate,
          restrictivePracticesActive: !!assessment.extractedUpdates.restrictivePracticesActive,
          goals: [],
          primaryPractitionerId: 'unassigned',
          primaryPractitionerName: 'Practitioner Team',
          riskLevel: 'Low',
          emergencyContact: assessment.extractedUpdates.emergencyContact || {
            name: 'Primary Nominee',
            relationship: 'Support Nominee',
            phone: 'Not provided'
          },
          documents: [newAttachedDoc],
          attachedDocuments: [newAttachedDoc],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { createClient } = await import('@/lib/firestoreService');
        await createClient(initialClientDoc);
        targetClient = initialClientDoc;
        isNewClientCreated = true;
      } else {
        return { success: false, error: 'Target participant not found in registry. Please assign a participant.' };
      }
    } else {
      // Existing client: merge document into target subfolder and update participant fields
      const existingDocs = targetClient.documents || targetClient.attachedDocuments || [];
      const updatedDocs = [...existingDocs, newAttachedDoc];

      const participantUpdates: Partial<Client> = {
        documents: updatedDocs,
        attachedDocuments: updatedDocs,
        updatedAt: new Date().toISOString(),
        ...assessment.extractedUpdates,
      };

      await updateClientDoc(targetClient.id, participantUpdates);
      targetClient = {
        ...targetClient,
        ...participantUpdates,
      };
    }

    // Save to global Firestore documents collection
    await storePickedDriveFileMetadata({
      file: {
        id: assessment.id || documentId,
        name: assessment.fileName,
        url: assessment.googleDriveUrl || `https://drive.google.com/file/d/${assessment.id}/view`,
        mimeType: assessment.mimeType,
        sizeBytes: assessment.sizeBytes,
      },
      clientId: targetClient.id,
      clientName: targetClient.name,
      uploadedBy: currentUser?.id || 'staff-system',
      uploadedByName: currentUser?.name || 'Allied Health Practitioner',
      category: assessment.category,
      tags: [assessment.targetSubfolder, 'Drive Sync', 'AI Assessed'],
    });

    return {
      success: true,
      updatedParticipant: targetClient,
      isNew: isNewClientCreated,
    };
  } catch (err: any) {
    console.error('Failed to commit document assessment to Firestore:', err);
    return {
      success: false,
      error: err?.message || 'Firestore update failed.',
    };
  }
}

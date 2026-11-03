import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

interface DriveFileInput {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  url?: string;
  path?: string;
  content?: string;
  sizeBytes?: number;
}

interface SubfolderBatchItem {
  folderId?: string;
  folderName: string;
  folderUrl?: string;
  subfolders?: string[];
  files?: DriveFileInput[];
}

function inferFolderCategory(fileName: string, filePath?: string): string {
  const combined = `${filePath || ''} ${fileName}`.toLowerCase();
  if (combined.includes('service agreement') || combined.includes('consent') || combined.includes('intake')) {
    return STANDARD_DRIVE_SUBFOLDERS[0] || '01_Service_Agreement_&_Consent';
  }
  if (combined.includes('ndis plan') || combined.includes('funding') || combined.includes('budget')) {
    return STANDARD_DRIVE_SUBFOLDERS[1] || '02_NDIS_Plan_&_Funding';
  }
  if (combined.includes('fba') || combined.includes('assessment') || combined.includes('functional')) {
    return STANDARD_DRIVE_SUBFOLDERS[2] || '03_Clinical_Assessments_&_FBA';
  }
  if (combined.includes('bsp') || combined.includes('behaviour support plan') || combined.includes('interim')) {
    return STANDARD_DRIVE_SUBFOLDERS[3] || '04_Behaviour_Support_Plans_(BSP)';
  }
  if (combined.includes('case note') || combined.includes('session') || combined.includes('progress note')) {
    return STANDARD_DRIVE_SUBFOLDERS[4] || '05_Case_Notes_&_Session_Logs';
  }
  if (combined.includes('incident') || combined.includes('restrictive') || combined.includes('rp')) {
    return STANDARD_DRIVE_SUBFOLDERS[5] || '06_Incident_&_RP_Reports';
  }
  return STANDARD_DRIVE_SUBFOLDERS[6] || '07_Correspondence_&_Reviews';
}

async function enrichFilesWithDriveSnippets(
  files: DriveFileInput[],
  accessToken?: string
): Promise<DriveFileInput[]> {
  if (!accessToken || files.length === 0) return files;

  const enriched = await Promise.all(
    files.slice(0, 8).map(async (f) => {
      if (f.content) return f;
      try {
        if (f.mimeType === 'application/vnd.google-apps.document') {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}/export?mimeType=text/plain`,
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          );
          if (res.ok) {
            const text = await res.text();
            return { ...f, content: text.slice(0, 2500) };
          }
        } else if (f.mimeType === 'text/plain' || f.mimeType === 'text/csv') {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          );
          if (res.ok) {
            const text = await res.text();
            return { ...f, content: text.slice(0, 2500) };
          }
        }
      } catch {
        // Ignore individual file snippet errors
      }
      return f;
    })
  );

  return [...enriched, ...files.slice(8)];
}

function buildNormalizedParticipant(
  extractedProfile: any,
  folderName: string,
  folderId: string | undefined,
  folderUrl: string | undefined,
  files: DriveFileInput[],
  discoveredSubfolders: string[] = [],
  indexOffset: number = 0
) {
  const rawName = (extractedProfile.name || folderName || 'New Participant')
    .replace(/(NDIS|Plan|Folder|Dossier|[-_]+[0-9]{9})/gi, '')
    .trim();
  const safeSlug = (rawName || 'participant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  const clientId = `participant-${safeSlug}-${Date.now().toString().slice(-5)}-${indexOffset + 1}`;

  const cleanNdis = String(extractedProfile.ndisNumber || '').replace(/[^0-9]/g, '');
  const resolvedNdis =
    cleanNdis.length === 9
      ? cleanNdis
      : `430${Math.floor(100000 + Math.random() * 900000)}`;

  const mergedSubfolders = Array.from(
    new Set([...STANDARD_DRIVE_SUBFOLDERS, ...(discoveredSubfolders || [])])
  );

  const attachedDocuments = files.map((f, idx) => {
    const folderCategory = inferFolderCategory(f.name, f.path);
    const viewUrl = f.webViewLink || f.url || `https://drive.google.com/file/d/${f.id}/view`;
    return {
      id: f.id || `doc-${clientId}-${idx + 1}`,
      name: f.name,
      url: viewUrl,
      sizeBytes: f.sizeBytes || 1024 * 64,
      mimeType: f.mimeType || 'application/pdf',
      dateUploaded: new Date().toISOString().split('T')[0],
      uploadedAt: new Date().toISOString(),
      fileType: f.mimeType || 'Document',
      fileSize: 'Google Drive',
      category: (folderCategory.toLowerCase().includes('bsp')
        ? 'bsp'
        : folderCategory.toLowerCase().includes('consent')
        ? 'consent'
        : folderCategory.toLowerCase().includes('assessment')
        ? 'assessment'
        : 'other') as any,
      driveFileId: f.id,
      metadata: {
        folderCategory,
        driveFolderPath: `Staff Share Drive > Participants > Behaviour Support > ${rawName}`
      }
    };
  });

  const coreBudget = Number(extractedProfile.budgetBreakdown?.core) || 40000;
  const cbTherapy = Number(extractedProfile.budgetBreakdown?.capacityBuildingTherapy) || 15000;
  const cbPbs = Number(extractedProfile.budgetBreakdown?.capacityBuildingPBS) || 12000;
  const scBudget = Number(extractedProfile.budgetBreakdown?.supportCoordination) || 3500;
  const computedTotal =
    Number(extractedProfile.totalBudget) || coreBudget + cbTherapy + cbPbs + scBudget;

  return {
    id: clientId,
    name: rawName || 'New Participant',
    preferredName: extractedProfile.preferredName || rawName.split(' ')[0] || '',
    ndisNumber: resolvedNdis,
    dateOfBirth: extractedProfile.dateOfBirth || '2000-01-01',
    gender: extractedProfile.gender || 'Not specified',
    phone: extractedProfile.phone || '0400 000 000',
    email: extractedProfile.email || '',
    address: extractedProfile.address || 'Melbourne, VIC 3000',
    suburb: extractedProfile.suburb || 'Melbourne',
    status: 'Active',
    primaryDisability: extractedProfile.primaryDisability || 'Autism Spectrum Disorder',
    secondaryDisabilities: Array.isArray(extractedProfile.secondaryDisabilities)
      ? extractedProfile.secondaryDisabilities
      : [],
    planStartDate: extractedProfile.planStartDate || new Date().toISOString().split('T')[0],
    planEndDate:
      extractedProfile.planEndDate ||
      new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    planManagementType: extractedProfile.planManagementType || 'Plan-Managed',
    planManager: extractedProfile.planManager || {
      agency: 'National Plan Managers',
      email: 'invoices@planmanagers.example.com',
      phone: '1300 000 000'
    },
    supportCoordinator: extractedProfile.supportCoordinator || {
      name: 'Support Coordinator',
      agency: 'Breakthrough Allied Health Network',
      email: 'coordinator@breakthrough.example.com',
      phone: '0400 000 000'
    },
    budgetBreakdown: {
      core: coreBudget,
      capacityBuildingTherapy: cbTherapy,
      capacityBuildingPBS: cbPbs,
      supportCoordination: scBudget,
      capital: Number(extractedProfile.budgetBreakdown?.capital) || 0
    },
    totalBudget: computedTotal,
    allocatedBudget: Number(extractedProfile.allocatedBudget) || Math.round(computedTotal * 0.9),
    spentBudget: Number(extractedProfile.spentBudget) || 0,
    primaryPractitionerId: 'prac-1',
    primaryPractitionerName: 'Senior Behaviour Practitioner',
    riskLevel: extractedProfile.riskLevel || 'Medium',
    emergencyContact: extractedProfile.emergencyContact || {
      name: 'Primary Nominee / Guardian',
      relationship: 'Guardian',
      phone: '0400 000 000'
    },
    highIntensityNeeds: Array.isArray(extractedProfile.highIntensityNeeds)
      ? extractedProfile.highIntensityNeeds
      : [],
    communicationMethod: extractedProfile.communicationMethod || 'Verbal',
    mobilityNeeds: extractedProfile.mobilityNeeds || 'Independent',
    triggers: Array.isArray(extractedProfile.triggers) ? extractedProfile.triggers : [],
    goals:
      Array.isArray(extractedProfile.goals) && extractedProfile.goals.length > 0
        ? extractedProfile.goals.map((g: any, idx: number) => ({
            id: g.id || `goal-${idx + 1}`,
            title: g.title || `Clinical Goal ${idx + 1}`,
            description: g.description || '',
            category: g.category || 'Capacity Building',
            targetDate:
              g.targetDate ||
              new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
            progressPercent: Number(g.progressPercent) || 15,
            status: g.status || 'In Progress'
          }))
        : [
            {
              id: 'goal-1',
              title: 'Positive Behaviour Support & Emotional Regulation',
              description:
                'Implement evidence-based PBS strategies to build emotional regulation and community participation.',
              category: 'Capacity Building',
              targetDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
              progressPercent: 15,
              status: 'In Progress'
            }
          ],
    restrictivePracticesActive: Boolean(extractedProfile.restrictivePracticesActive ?? false),
    isCustomUserParticipant: true,
    driveFolderId: folderId || undefined,
    driveFolderUrl:
      folderUrl || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : undefined),
    driveFolderPath: `Staff Share Drive > Participants > Behaviour Support > ${rawName}`,
    driveSubfolders: mergedSubfolders,
    documents: attachedDocuments,
    attachedDocuments,
    sourceDriveFolderId: folderId || null,
    sourceDriveFolderName: folderName || rawName,
    sourceDriveFiles: files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || f.url || `https://drive.google.com/file/d/${f.id}/view`
    }))
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = 'single',
      folderId,
      folderName,
      folderUrl,
      files = [],
      subfolders = [],
      accessToken
    } = body;

    // MODE: BATCH SUBFOLDER INGESTION (Multiple participant folders inside a parent Drive folder)
    if (mode === 'batch' && Array.isArray(subfolders) && subfolders.length > 0) {
      const batchSummary = subfolders
        .slice(0, 25)
        .map((sf: SubfolderBatchItem, idx: number) => {
          const fileNames = (sf.files || []).map((f) => f.name).join(', ');
          const nestedFolders = (sf.subfolders || []).join(', ');
          return `${idx + 1}. Participant Folder: "${sf.folderName}" | Subfolders: [${nestedFolders || 'Standard'}] | Clinical Files: [${fileNames || 'None listed'}]`;
        })
        .join('\n');

      const batchPrompt = `You are an expert NDIS Clinical Intake Specialist for Breakthrough Coaching & Consulting.
You are ingesting a batch of participant folders from the business's Google Drive directory.

Participant Folders Discovered:
${batchSummary}

TASK:
For EACH participant folder listed above, extract or professionally infer a structured NDIS participant profile matching the folder name and clinical file inventory. If an NDIS number or date of birth is present in the folder or file names, extract it; otherwise provide realistic defaults so the record is ready for clinical review.

Return a JSON object with a "participants" array matching this exact schema:
{
  "participants": [
    {
      "folderName": "Exact folderName from input",
      "name": "Clean full name of participant",
      "preferredName": "First name",
      "ndisNumber": "9-digit NDIS number starting with 43",
      "dateOfBirth": "YYYY-MM-DD",
      "gender": "Male | Female | Non-binary | Not specified",
      "phone": "Australian mobile number",
      "email": "Email if inferable or empty string",
      "address": "Suburb, VIC",
      "suburb": "Suburb",
      "primaryDisability": "Primary NDIS diagnosis inferred from clinical files (e.g. Autism Spectrum Disorder Level 2, Psychosocial Disability, Intellectual Disability)",
      "planManagementType": "Plan-Managed | Agency-Managed (NDIA) | Self-Managed",
      "totalBudget": 65000,
      "budgetBreakdown": {
        "core": 38000,
        "capacityBuildingTherapy": 15000,
        "capacityBuildingPBS": 12000,
        "supportCoordination": 0,
        "capital": 0
      },
      "riskLevel": "Low | Medium | High | Critical",
      "goals": [
        {
          "id": "goal-1",
          "title": "Primary NDIS Goal",
          "description": "Clinical goal description based on folder documents",
          "category": "Capacity Building",
          "targetDate": "2026-12-31",
          "status": "In Progress"
        }
      ]
    }
  ]
}

Return ONLY valid JSON.`;

      let parsedBatch: any = { participants: [] };
      try {
        const aiRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: batchPrompt,
          config: { responseMimeType: 'application/json' }
        });
        const raw = (aiRes.text || '{}').replace(/^```json\s*/, '').replace(/```$/, '').trim();
        parsedBatch = JSON.parse(raw);
      } catch (aiErr) {
        console.warn('Gemini batch extraction fallback:', aiErr);
      }

      const extractedList: any[] = Array.isArray(parsedBatch.participants)
        ? parsedBatch.participants
        : [];

      const participants = subfolders.slice(0, 25).map((sf: SubfolderBatchItem, idx: number) => {
        const matchedAi =
          extractedList.find(
            (p) =>
              p.folderName?.toLowerCase() === sf.folderName.toLowerCase() ||
              p.name?.toLowerCase() === sf.folderName.toLowerCase()
          ) ||
          extractedList[idx] || { name: sf.folderName };

        return buildNormalizedParticipant(
          matchedAi,
          sf.folderName,
          sf.folderId,
          sf.folderUrl,
          sf.files || [],
          sf.subfolders || [],
          idx
        );
      });

      return NextResponse.json({
        success: true,
        participants,
        count: participants.length
      });
    }

    // MODE: SINGLE PARTICIPANT FOLDER / CLINICAL FILES
    if (!folderName && files.length === 0 && !folderId) {
      return NextResponse.json(
        { error: 'Folder name, folder link, or files must be provided for ingestion' },
        { status: 400 }
      );
    }

    let fetchedFiles: DriveFileInput[] = [...files];
    let discoveredSubfolders: string[] = [];

    if (folderId && accessToken && fetchedFiles.length === 0) {
      try {
        const driveRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(
            folderId
          )}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink,size,createdTime)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json'
            }
          }
        );
        if (driveRes.ok) {
          const driveData = await driveRes.json();
          const allDriveItems = driveData.files || [];
          discoveredSubfolders = allDriveItems
            .filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
            .map((f: any) => f.name);
          fetchedFiles = allDriveItems
            .filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder')
            .map((f: any) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
              sizeBytes: f.size ? Number(f.size) : undefined
            }));
        }
      } catch (driveErr) {
        console.warn('Google Drive API query warning:', driveErr);
      }
    }

    fetchedFiles = await enrichFilesWithDriveSnippets(fetchedFiles, accessToken);

    const fileInventorySummary = fetchedFiles
      .map(
        (f, i) =>
          `${i + 1}. [${f.path || f.name}] (${f.mimeType || 'unknown'})${
            f.content ? `\nExtracted Text Snippet:\n${f.content.slice(0, 1500)}` : ''
          }`
      )
      .join('\n');

    const prompt = `You are an expert NDIS Clinical Intake specialist and Allied Health Practice Auditor for Breakthrough Coaching & Consulting.
You have been given the documents and files from an individual participant's folder in Google Drive.

Folder Name: "${folderName || 'Participant Clinical Folder'}"
Discovered Subfolders: ${discoveredSubfolders.join(', ') || 'Standard NDIS clinical folders'}
Google Drive Files Found:
${fileInventorySummary || 'No text contents provided, extract and infer from folder name and filenames.'}

TASK:
Extract and normalize all available clinical, administrative, and NDIS information for this participant into a pristine JSON object matching the exact structure required. If certain fields cannot be determined from the file names/contents, make reasonable professional inferences appropriate for an active NDIS participant.

JSON Output Schema:
{
  "name": "Full legal name of participant",
  "preferredName": "Preferred first name or nickname",
  "ndisNumber": "9-digit NDIS number (e.g. 430198421)",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "Male | Female | Non-binary | Prefer not to say",
  "phone": "Australian phone number",
  "email": "Email address",
  "address": "Street address, suburb, state, postcode",
  "suburb": "Suburb name",
  "status": "Active",
  "primaryDisability": "Primary diagnosed disability (e.g. Autism Spectrum Disorder Level 2, Intellectual Disability, Acquired Brain Injury, Psychosocial Disability)",
  "secondaryDisabilities": ["Secondary diagnosis if any"],
  "planStartDate": "YYYY-MM-DD",
  "planEndDate": "YYYY-MM-DD",
  "planManagementType": "Agency-Managed (NDIA) | Plan-Managed | Self-Managed",
  "planManager": {
    "agency": "Plan Management Agency name",
    "contactName": "Accounts contact name",
    "email": "invoices@planmanager.example.com",
    "phone": "03 9000 0000"
  },
  "supportCoordinator": {
    "name": "Support Coordinator Name",
    "agency": "Support Coordination Agency",
    "email": "sc@agency.example.com",
    "phone": "0400 000 000"
  },
  "budgetBreakdown": {
    "core": 45000,
    "capacityBuildingTherapy": 18500,
    "capacityBuildingPBS": 12000,
    "supportCoordination": 4800,
    "capital": 0
  },
  "totalBudget": 80300,
  "allocatedBudget": 72000,
  "spentBudget": 12500,
  "riskLevel": "Low | Medium | High | Critical",
  "emergencyContact": {
    "name": "Emergency contact full name",
    "relationship": "Parent / Guardian / Support Coordinator",
    "phone": "0400 111 222"
  },
  "highIntensityNeeds": ["Behavioural regulation support"],
  "communicationMethod": "Verbal | AAC Device | PECS | Visual schedule",
  "mobilityNeeds": "Independent | Wheelchair | Walking frame",
  "triggers": ["Loud sudden noises", "Unannounced changes to schedule"],
  "goals": [
    {
      "id": "goal-1",
      "title": "Community Independence & Travel Training",
      "description": "Increase independent navigation of public transport and shopping routines with positive behaviour support.",
      "category": "Community Participation",
      "targetDate": "2026-12-31",
      "status": "In Progress"
    },
    {
      "id": "goal-2",
      "title": "Emotional Regulation & De-escalation",
      "description": "Implement evidence-based PBS strategies to reduce frequency of restrictive interventions and distress behaviours.",
      "category": "Behaviour Support",
      "targetDate": "2026-11-30",
      "status": "In Progress"
    }
  ]
}

Return ONLY valid JSON. No conversational text or markdown code fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '{}';
    let extractedProfile: any = {};
    try {
      extractedProfile = JSON.parse(rawText);
    } catch {
      const cleanJson = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      extractedProfile = JSON.parse(cleanJson);
    }

    const normalizedClient = buildNormalizedParticipant(
      extractedProfile,
      folderName || extractedProfile.name || 'New Participant',
      folderId,
      folderUrl,
      fetchedFiles,
      discoveredSubfolders,
      0
    );

    return NextResponse.json({
      success: true,
      participant: normalizedClient,
      fileCount: fetchedFiles.length,
      files: fetchedFiles
    });
  } catch (error: any) {
    console.error('Error in /api/drive/ingest-folder:', error);
    return NextResponse.json(
      {
        error: 'Failed to process participant Google Drive folder',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

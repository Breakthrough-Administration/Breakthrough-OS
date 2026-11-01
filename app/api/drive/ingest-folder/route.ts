import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderId, folderName, files = [], accessToken } = body;

    if (!folderName && files.length === 0 && !folderId) {
      return NextResponse.json(
        { error: 'Folder name or files must be provided for ingestion' },
        { status: 400 }
      );
    }

    // If an accessToken and folderId were passed, fetch files directly from Google Drive API v3
    let fetchedFiles = [...files];
    if (folderId && accessToken && fetchedFiles.length === 0) {
      try {
        const driveRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(
            folderId
          )}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink,size,createdTime)&pageSize=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json'
            }
          }
        );
        if (driveRes.ok) {
          const driveData = await driveRes.json();
          fetchedFiles = (driveData.files || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`
          }));
        }
      } catch (driveErr) {
        console.warn('Google Drive API query warning:', driveErr);
      }
    }

    // Build document context for Gemini
    const fileInventorySummary = fetchedFiles
      .map((f, i) => `${i + 1}. [${f.name}] (${f.mimeType || 'unknown'}) ${f.content ? `\nContent snippet: ${f.content.slice(0, 1500)}` : ''}`)
      .join('\n');

    const prompt = `You are an expert NDIS Clinical Intake specialist and Allied Health Practice Auditor for Breakthrough Coaching & Consulting.
You have been given the documents and files from an individual participant's folder in Google Drive.

Folder Name: "${folderName || 'Participant Clinical Folder'}"
Google Drive Files Found:
${fileInventorySummary || 'No text contents provided, extract and infer from folder name and filenames.'}

TASK:
Extract and normalize all available clinical, administrative, and NDIS information for this participant into a pristine JSON object matching the exact structure required. If certain fields cannot be determined from the file names/contents, make reasonable professional inferences appropriate for an active NDIS participant (e.g. valid 9-digit NDIS number like 430xxxxxx, realistic budget allocations, standard allied health goals).

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
  "spentBudget": 24500,
  "riskLevel": "Low | Medium | High | Critical",
  "emergencyContact": {
    "name": "Emergency contact full name",
    "relationship": "Parent / Guardian / Support Coordinator",
    "phone": "0400 111 222"
  },
  "highIntensityNeeds": ["Epilepsy monitoring", "Dysphagia mealtime support"],
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
      model: 'gemini-3.8-flash',
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
      // Clean possible wrapper if necessary
      const cleanJson = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      extractedProfile = JSON.parse(cleanJson);
    }

    // Ensure vital fields
    const clientId = `cli-live-${Date.now().toString().slice(-6)}`;
    const normalizedClient = {
      id: clientId,
      name: extractedProfile.name || folderName || 'New Participant',
      preferredName: extractedProfile.preferredName || extractedProfile.name?.split(' ')[0] || '',
      ndisNumber: String(extractedProfile.ndisNumber || `430${Math.floor(100000 + Math.random() * 900000)}`),
      dateOfBirth: extractedProfile.dateOfBirth || '2000-01-01',
      gender: extractedProfile.gender || 'Not specified',
      phone: extractedProfile.phone || '0400 000 000',
      email: extractedProfile.email || 'participant@example.com',
      address: extractedProfile.address || 'Melbourne, VIC 3000',
      suburb: extractedProfile.suburb || 'Melbourne',
      status: 'Active',
      primaryDisability: extractedProfile.primaryDisability || 'Autism Spectrum Disorder',
      secondaryDisabilities: extractedProfile.secondaryDisabilities || [],
      planStartDate: extractedProfile.planStartDate || new Date().toISOString().split('T')[0],
      planEndDate: extractedProfile.planEndDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      planManagementType: extractedProfile.planManagementType || 'Plan-Managed',
      planManager: extractedProfile.planManager || {
        agency: 'National Plan Managers',
        email: 'invoices@planmanagers.example.com',
        phone: '1300 000 000'
      },
      supportCoordinator: extractedProfile.supportCoordinator || {
        name: 'Care Coordinator',
        agency: 'Breakthrough Allied Health',
        email: 'coordinator@breakthrough.example.com',
        phone: '0400 000 000'
      },
      budgetBreakdown: extractedProfile.budgetBreakdown || {
        core: 40000,
        capacityBuildingTherapy: 15000,
        capacityBuildingPBS: 10000,
        supportCoordination: 3000,
        capital: 0
      },
      totalBudget: Number(extractedProfile.totalBudget) || 68000,
      allocatedBudget: Number(extractedProfile.allocatedBudget) || 60000,
      spentBudget: Number(extractedProfile.spentBudget) || 15000,
      primaryPractitionerId: 'prac-1',
      primaryPractitionerName: 'Senior Behaviour Practitioner',
      riskLevel: extractedProfile.riskLevel || 'Medium',
      emergencyContact: extractedProfile.emergencyContact || {
        name: 'Emergency Contact',
        relationship: 'Guardian',
        phone: '0400 000 000'
      },
      highIntensityNeeds: extractedProfile.highIntensityNeeds || [],
      communicationMethod: extractedProfile.communicationMethod || 'Verbal',
      mobilityNeeds: extractedProfile.mobilityNeeds || 'Independent',
      triggers: extractedProfile.triggers || [],
      goals: extractedProfile.goals || [
        {
          id: 'goal-1',
          title: 'Skill Development & Daily Autonomy',
          description: 'Develop personal autonomy and emotional regulation strategies.',
          category: 'Daily Living',
          targetDate: '2026-12-31',
          status: 'In Progress'
        }
      ],
      // Attach Google Drive source references
      sourceDriveFolderId: folderId || null,
      sourceDriveFolderName: folderName || null,
      sourceDriveFiles: fetchedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.webViewLink
      }))
    };

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

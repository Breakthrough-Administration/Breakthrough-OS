import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithTimeout } from '@/lib/geminiSafeClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ScannedDriveFile {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  iconUrl?: string;
  modifiedTime?: string;
  contentPreview?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { folderId, folderPath, accessToken, participants, files: providedFiles } = await req.json();

    const discoveredFiles: ScannedDriveFile[] = [];
    const errors: string[] = [];

    // 1. Recursive Google Drive folder scanning if accessToken & folderId are provided
    if (accessToken && folderId) {
      async function recurseDriveFolder(parentFolderId: string, currentPath: string): Promise<void> {
        try {
          let pageToken: string | undefined = undefined;
          do {
            const queryParams = new URLSearchParams({
              q: `'${parentFolderId}' in parents and trashed = false`,
              fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, iconLink, modifiedTime, description)',
              pageSize: '100',
              supportsAllDrives: 'true',
              includeItemsFromAllDrives: 'true',
            });
            if (pageToken) queryParams.set('pageToken', pageToken);

            const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });

            if (!res.ok) {
              errors.push(`Drive API query failed for folder ${parentFolderId} (${res.statusText})`);
              break;
            }

            const data = await res.json();
            const childFiles = data.files || [];

            for (const f of childFiles) {
              const relPath = currentPath ? `${currentPath}/${f.name}` : f.name;
              if (f.mimeType === 'application/vnd.google-apps.folder') {
                await recurseDriveFolder(f.id, relPath);
              } else {
                discoveredFiles.push({
                  id: f.id,
                  name: f.name,
                  path: relPath,
                  mimeType: f.mimeType,
                  sizeBytes: f.size ? parseInt(f.size, 10) : 102400,
                  url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                  iconUrl: f.iconLink,
                  modifiedTime: f.modifiedTime,
                });
              }
            }

            pageToken = data.nextPageToken;
          } while (pageToken);
        } catch (err: any) {
          errors.push(`Recursive traversal error: ${err?.message}`);
        }
      }

      await recurseDriveFolder(folderId, folderPath || '');
    } else if (Array.isArray(providedFiles) && providedFiles.length > 0) {
      discoveredFiles.push(...providedFiles);
    }

    // 2. Batch classification & metadata extraction with Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const classifications: any[] = [];

    const participantList = (participants || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      ndisNumber: p.ndisNumber,
    }));

    if (apiKey && discoveredFiles.length > 0) {
      try {
        // Process files in batches to respect prompt constraints and quotas
        const batchSize = 10;
        for (let i = 0; i < discoveredFiles.length; i += batchSize) {
          const batch = discoveredFiles.slice(i, i + batchSize);

          const prompt = `You are an expert NDIS Clinical Practice Management Document Classifier.
Analyze the following batch of clinical and administrative documents discovered during a recursive directory scan of Google Drive.
For EACH document, evaluate its name and relative path:
1. Match it to the most relevant participant from the registered list (or identify new participant candidate from path folder name).
2. Assign it to one of the 12 standard NDIS participant subfolders:
   - "BSP" (Behaviour Support Plans, restrictive practice reduction)
   - "NDIS Plan" (Official NDIA plans, funding statements)
   - "FBA" (Functional Behaviour Assessments, ABC logs)
   - "Assessments/ Reports" (Psychology, Speech, OT, Allied Health, Sensory profiles)
   - "Invoices" (Tax invoices, claims, receipts)
   - "Service Agreement" (Client contracts, schedule of supports)
   - "Consent Form" (Information sharing, authority to release, privacy)
   - "Emergency and Disaster Plan" (Emergency contacts, evacuation protocols)
   - "Goals Statement" (Participant goals, GAS outcomes)
   - "Letters/ Correspondence" (NDIA notices, planner correspondence)
   - "Progress Notes" (Session notes, case notes, contact summaries)
   - "Referral Form" (Intake documents, requests for service)
3. Extract any identifiable participant field updates (NDIS number 9 digits, plan dates, budget amounts, restrictive practices flags, primary disability).
4. Provide confidence percentage (0-100) and rationale.

REGISTERED PARTICIPANTS:
${participantList.length > 0 ? participantList.map((p: { id: string; name: string; ndisNumber: string }) => `- ID: ${p.id}, Name: "${p.name}", NDIS: "${p.ndisNumber}"`).join('\n') : 'No participants registered yet.'}

DOCUMENTS TO EVALUATE:
${batch.map((b, idx) => `[Doc ${idx + 1}] ID: "${b.id}", Name: "${b.name}", Path: "${b.path}", MIME: "${b.mimeType}"`).join('\n')}`;

          const geminiResponse = await callGeminiWithTimeout(async (ai) => {
            return await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      docId: { type: Type.STRING },
                      targetParticipantId: { type: Type.STRING },
                      targetParticipantName: { type: Type.STRING },
                      targetSubfolder: { type: Type.STRING },
                      category: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      rationale: { type: Type.STRING },
                      isUnmatchable: { type: Type.BOOLEAN },
                      extractedUpdates: {
                        type: Type.OBJECT,
                        properties: {
                          ndisNumber: { type: Type.STRING },
                          planStartDate: { type: Type.STRING },
                          planEndDate: { type: Type.STRING },
                          totalBudget: { type: Type.NUMBER },
                          primaryDisability: { type: Type.STRING },
                          restrictivePracticesActive: { type: Type.BOOLEAN },
                          bspExpiryDate: { type: Type.STRING },
                          bspStatus: { type: Type.STRING },
                        },
                      },
                    },
                    required: ['targetSubfolder', 'confidence', 'rationale'],
                  },
                },
              },
            });
          }, 4500);

          if (geminiResponse && geminiResponse.text) {
            try {
              const parsedBatch = JSON.parse(geminiResponse.text);
              if (Array.isArray(parsedBatch)) {
                classifications.push(...parsedBatch);
              }
            } catch {
              // Graceful ignore
            }
          }
        }
      } catch (geminiErr: any) {
        errors.push(`Gemini AI analysis note: ${geminiErr?.message || 'Fallback to heuristic engine'}`);
      }
    }

    return NextResponse.json({
      success: true,
      filesDiscoveredCount: discoveredFiles.length,
      files: discoveredFiles,
      classifications,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Error in /api/drive/scan:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Drive directory scan failed' },
      { status: 500 }
    );
  }
}

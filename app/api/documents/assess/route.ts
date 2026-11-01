import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithTimeout } from '@/lib/geminiSafeClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fileName, filePath, mimeType, participants, defaultClientId } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
    }

    const participantListSummary = (participants || [])
      .map((p: any) => `- ID: ${p.id}, Name: "${p.name}", NDIS: "${p.ndisNumber}"`)
      .join('\n');

    const prompt = `You are an expert NDIS Clinical Practice Management Document Classifier.
Analyze the following document to match it to the correct NDIS participant, determine which of the 12 standard participant subfolders it belongs to, and extract clinical/administrative updates for the participant's record.

STANDARD SUBFOLDERS:
1. "BSP" (Behaviour Support Plans, restrictive practices, intervention strategies)
2. "NDIS Plan" (Official NDIA plans, funding allocations, statement of supports)
3. "FBA" (Functional Behaviour Assessments, scatter plots, ABC data)
4. "Assessments/ Reports" (Psychology, Speech Pathology, OT, Allied Health, Sensory profiles)
5. "Invoices" (Tax invoices, claims, receipts, fee schedules)
6. "Service Agreement" (Contracts, Schedule of supports, engagement letters)
7. "Consent Form" (Privacy consents, release of information, authority forms)
8. "Emergency and Disaster Plan" (Emergency contacts, evacuation protocols, crisis plans)
9. "Goals Statement" (Participant goals, GAS outcome targets)
10. "Letters/ Correspondence" (NDIA notices, planner correspondence, tribunal letters)
11. "Progress Notes" (Session notes, case notes, contact summaries)
12. "Referral Form" (Intake forms, onboarding documents, requests for service)

DOCUMENT DETAILS:
- File Name: "${fileName}"
- Relative Path / Folder: "${filePath}"
- MIME Type: "${mimeType}"

KNOWN REGISTERED PARTICIPANTS:
${participantListSummary || 'None registered yet'}

TASK:
1. Match to the most likely participant from the known list (or suggest unassigned if no match).
2. Select the most accurate standard subfolder from the 12 options above.
3. Extract any identifiable participant field updates (e.g. NDIS number if 9 digits, plan dates, budget amounts, restrictive practices flags, primary disability if stated).
4. Provide confidence (0-100) and rationale.`;

    const geminiResponse = await callGeminiWithTimeout(async (ai) => {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetParticipantId: { type: Type.STRING },
              targetParticipantName: { type: Type.STRING },
              targetSubfolder: { type: Type.STRING },
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              rationale: { type: Type.STRING },
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
                  status: { type: Type.STRING },
                },
              },
            },
            required: ['targetSubfolder', 'confidence', 'rationale'],
          },
        },
      });
    }, 4500);

    if (geminiResponse && geminiResponse.text) {
      try {
        const parsedJson = JSON.parse(geminiResponse.text);
        return NextResponse.json({ assessment: parsedJson });
      } catch {
        // Continue to fallback
      }
    }

    return NextResponse.json({ assessment: null, fallback: true });
  } catch (err: any) {
    console.warn('AI document assessment error handled:', err?.message || err);
    return NextResponse.json({ assessment: null, fallback: true });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithTimeout } from '@/lib/geminiSafeClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AutoTagRequest {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  category?: string;
  clientName?: string;
  description?: string;
}

interface AutoTagResponse {
  suggestedTags: string[];
  confidence: number;
  suggestedCategory?: string;
  reasoning: string;
  source: 'gemini' | 'heuristic';
}

const ALL_POSSIBLE_TAGS = [
  'Clinical',
  'Financial',
  'Legal',
  'Compliance',
  'NDIS Plan',
  'Behavioural',
  'Medical',
  'Governance'
];

/**
 * Heuristic fallback tag engine if GEMINI_API_KEY is not configured or in case of network issues
 */
function heuristicTagAnalysis(req: AutoTagRequest): AutoTagResponse {
  const name = (req.fileName || '').toLowerCase();
  const cat = (req.category || '').toLowerCase();
  const desc = (req.description || '').toLowerCase();
  const combined = `${name} ${cat} ${desc}`;

  const tags = new Set<string>();

  // Clinical indicators
  if (
    combined.includes('clinical') ||
    combined.includes('progress') ||
    combined.includes('report') ||
    combined.includes('therapy') ||
    combined.includes('physio') ||
    combined.includes('hydro') ||
    combined.includes('assessment') ||
    combined.includes('pbs') ||
    combined.includes('soap')
  ) {
    tags.add('Clinical');
  }

  // Financial indicators
  if (
    combined.includes('plan') ||
    combined.includes('ndis plan') ||
    combined.includes('budget') ||
    combined.includes('invoice') ||
    combined.includes('financial') ||
    combined.includes('funding') ||
    combined.includes('quote')
  ) {
    tags.add('Financial');
    if (combined.includes('ndis')) {
      tags.add('NDIS Plan');
    }
  }

  // Legal / Compliance indicators
  if (
    combined.includes('consent') ||
    combined.includes('agreement') ||
    combined.includes('service agreement') ||
    combined.includes('contract') ||
    combined.includes('nda') ||
    combined.includes('form')
  ) {
    tags.add('Legal');
    tags.add('Compliance');
  }

  // Behavioural indicators
  if (
    combined.includes('pbs') ||
    combined.includes('behaviour') ||
    combined.includes('behavior') ||
    combined.includes('restrictive') ||
    combined.includes('abc') ||
    combined.includes('sensory')
  ) {
    tags.add('Behavioural');
    tags.add('Clinical');
  }

  // Medical indicators
  if (
    combined.includes('gp') ||
    combined.includes('doctor') ||
    combined.includes('medical') ||
    combined.includes('neurolog') ||
    combined.includes('paediatric') ||
    combined.includes('prescription') ||
    combined.includes('diagnosis')
  ) {
    tags.add('Medical');
    tags.add('Clinical');
  }

  if (tags.size === 0) {
    tags.add('Clinical');
  }

  let suggestedCategory = req.category;
  if (combined.includes('consent') || combined.includes('service agreement')) {
    suggestedCategory = 'Consent Form';
  } else if (combined.includes('ndis plan')) {
    suggestedCategory = 'NDIS Plan Document';
  } else if (combined.includes('pbs') || combined.includes('behaviour')) {
    suggestedCategory = 'BSP Document';
  } else if (combined.includes('assessment')) {
    suggestedCategory = 'Assessment PDF';
  } else if (combined.includes('report')) {
    suggestedCategory = 'Clinical Report';
  }

  const suggestedTags = Array.from(tags).filter((t) => ALL_POSSIBLE_TAGS.includes(t));

  return {
    suggestedTags: suggestedTags.length > 0 ? suggestedTags : ['Clinical'],
    confidence: 0.88,
    suggestedCategory,
    reasoning: `Rule-based clinical inference detected pattern matching tags: ${suggestedTags.join(', ')} from file name "${req.fileName}".`,
    source: 'heuristic'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AutoTagRequest;

    if (!body || !body.fileName) {
      return NextResponse.json(
        { error: 'fileName is required for auto-tag analysis' },
        { status: 400 }
      );
    }

    // Attempt classification with Gemini 3.8 Flash, or fallback to heuristics if unavailable
    const prompt = `You are an expert NDIS Clinical Records & Compliance AI for Breakthrough Coaching & Consulting.
Inspect the following document metadata and determine the most relevant tags and category before it is linked to a participant's profile.

Document Details:
- File Name: "${body.fileName}"
- MIME Type: "${body.mimeType || 'unknown'}"
- File Size (Bytes): ${body.sizeBytes || 'unknown'}
- Associated Participant: "${body.clientName || 'Unspecified'}"
- Current Category: "${body.category || 'Clinical Document'}"
- Description/Notes: "${body.description || 'None'}"

Valid Tags to choose from:
- "Clinical" (Diagnostic reports, SOAP notes, therapy evaluations, sensory assessments)
- "Financial" (NDIS budgets, price guide claims, funding summaries, invoices)
- "Legal" (Service agreements, NDIA authorisations, guardianship documents)
- "Compliance" (Worker screening, audits, verified identification, consent forms)
- "NDIS Plan" (Official NDIS participant plan documents, goal schedules)
- "Behavioural" (Positive Behaviour Support plans, ABC charts, restrictive practices)
- "Medical" (Physician reports, medication charts, hospital summaries)
- "Governance" (Provider compliance, policy acknowledgments, risk assessments)

Return ONLY valid JSON matching this exact structure:
{
  "suggestedTags": ["Clinical", "Legal"],
  "confidence": 0.95,
  "suggestedCategory": "Consent Form",
  "reasoning": "Clear concise 1-2 sentence explanation of why these tags apply based on NDIS governance standards."
}`;

    const geminiResponse = await callGeminiWithTimeout(async (ai) => {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
    }, 4000);

    if (geminiResponse && geminiResponse.text) {
      const responseText = geminiResponse.text.trim();
      let parsed: any = null;

      try {
        parsed = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            parsed = null;
          }
        }
      }

      if (parsed) {
        const validTags = Array.isArray(parsed.suggestedTags)
          ? parsed.suggestedTags.filter((t: string) => ALL_POSSIBLE_TAGS.includes(t))
          : ['Clinical'];

        return NextResponse.json({
          suggestedTags: validTags.length > 0 ? validTags : ['Clinical'],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
          suggestedCategory: parsed.suggestedCategory || body.category || 'Clinical Document',
          reasoning: parsed.reasoning || `Classified using Gemini AI for "${body.fileName}".`,
          source: 'gemini'
        });
      }
    }

    // Heuristic fallback if Gemini timed out, returned 503, or returned unparseable text
    const fallback = heuristicTagAnalysis(body);
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.warn('Auto-tagging endpoint caught error, reverting to heuristic fallback:', error?.message || error);
    return NextResponse.json({
      suggestedTags: ['Clinical'],
      confidence: 0.85,
      suggestedCategory: 'Clinical Document',
      reasoning: 'Safe clinical fallback applied.',
      source: 'heuristic'
    });
  }
}

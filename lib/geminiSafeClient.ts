import { GoogleGenAI } from '@google/genai';

/**
 * Executes a Gemini model call with an aggressive timeout and graceful fallback.
 * If the upstream service is temporarily overloaded (HTTP 503 ServerError) or unresponsive,
 * it returns null rather than throwing an unhandled exception or blocking the request indefinitely.
 */
export async function callGeminiWithTimeout<T>(
  action: (ai: GoogleGenAI) => Promise<T>,
  timeoutMs: number = 4000
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      action(ai),
      timeoutPromise,
    ]);
    return result;
  } catch (err: any) {
    // Suppress ServerError / 503 / network exceptions so user flows remain smooth with heuristic fallback
    const message = err?.message || String(err);
    console.warn(`[Gemini Safe Dispatch] Handled service error gracefully: ${message}`);
    return null;
  }
}

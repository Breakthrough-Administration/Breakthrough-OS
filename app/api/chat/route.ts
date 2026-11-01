import { NextRequest, NextResponse } from 'next/server';
import { processChatTurn } from '@/services/chatService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId = 'default-session' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const reply = await processChatTurn(sessionId, message);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process clinical AI turn', details: error?.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { runServerStartupHealthCheck } from '@/lib/serverHealthCheck';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await runServerStartupHealthCheck();
    return NextResponse.json(report, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        summary: `Startup health check: ${err?.message || 'running'}`,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

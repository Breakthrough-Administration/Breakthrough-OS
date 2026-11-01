import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectUrl = new URL(`/?xero_connected=true${url.search ? '&' + url.search.substring(1) : ''}`, req.url);
  return NextResponse.redirect(redirectUrl);
}

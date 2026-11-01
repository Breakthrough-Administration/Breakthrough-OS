import { NextRequest, NextResponse } from 'next/server';
import { NDISPricingSyncEngine } from '@/lib/ndisPricingService';
import { OFFICIAL_2026_NDIS_PRICE_GUIDE } from '@/lib/seedData';
import { requireAuth } from '@/lib/auth/verifySession';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, ['ADMIN', 'PRACTITIONER']);
  if ('errorResponse' in authResult) {
    return authResult.errorResponse;
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { updatedCatalogue = null, currentItems = OFFICIAL_2026_NDIS_PRICE_GUIDE, claims = [] } = body;

    const storeProxy = {
      supportItems: currentItems,
      billingClaims: claims
    };

    const result = NDISPricingSyncEngine.syncPriceGuide(storeProxy, updatedCatalogue);

    return NextResponse.json({
      success: true,
      updatedCount: result.syncedCount,
      syncedCount: result.syncedCount,
      changesCount: result.changesCount,
      changes: result.changes,
      revalidatedClaimsCount: result.revalidatedClaimsCount,
      catalogue: storeProxy.supportItems,
      timestamp: result.timestamp
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'NDIS_SYNC_FAILED', message: err.message || 'Failed to sync NDIS price guide' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const latestItems = NDISPricingSyncEngine.fetchLatestPriceGuide();
    return NextResponse.json({
      success: true,
      catalogueVersion: '2026.1-PRODA-PACE',
      effectiveDate: '2026-07-01',
      totalItems: latestItems.length,
      items: latestItems
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'NDIS_FETCH_FAILED', message: err.message || 'Failed to retrieve NDIS price guide' },
      { status: 500 }
    );
  }
}

import { NDISSupportItem } from '@/types';
import { OFFICIAL_2026_NDIS_PRICE_GUIDE } from './seedData';

export class NDISPricingSyncEngine {
  static fetchLatestPriceGuide(): NDISSupportItem[] {
    return OFFICIAL_2026_NDIS_PRICE_GUIDE;
  }

  static syncPriceGuide(
    storeProxy: { supportItems: NDISSupportItem[]; billingClaims?: any[] },
    updatedCatalogue: NDISSupportItem[] | null
  ) {
    const catalogue = updatedCatalogue || OFFICIAL_2026_NDIS_PRICE_GUIDE;
    let changesCount = 0;
    const changes: any[] = [];

    catalogue.forEach((newItem) => {
      const existing = storeProxy.supportItems.find((item) => item.code === newItem.code);
      if (!existing || existing.pricePerUnit !== newItem.pricePerUnit) {
        changesCount++;
        changes.push({
          code: newItem.code,
          name: newItem.name,
          oldRate: existing?.pricePerUnit || 0,
          newRate: newItem.pricePerUnit
        });
      }
    });

    storeProxy.supportItems = catalogue;

    return {
      syncedCount: catalogue.length,
      changesCount,
      changes,
      revalidatedClaimsCount: storeProxy.billingClaims ? storeProxy.billingClaims.length : 0,
      timestamp: new Date().toISOString()
    };
  }
}

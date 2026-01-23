/**
 * Product Usage Page
 * Track and analyze product usage for sales intelligence
 */

'use client';

import { ProductUsage } from '@/components/cais/product-usage';

export default function ProductUsagePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Usage</h1>
        <p className="text-muted-foreground">
          Track product usage events for sales intelligence
        </p>
      </div>
      <ProductUsage />
    </div>
  );
}

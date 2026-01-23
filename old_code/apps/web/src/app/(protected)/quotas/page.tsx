/**
 * Quotas Page
 * Main page for quota management
 */

'use client';

import { QuotaDashboard } from '@/components/quotas/quota-dashboard';

export default function QuotasPage() {
  return (
    <div className="container mx-auto py-6">
      <QuotaDashboard />
    </div>
  );
}



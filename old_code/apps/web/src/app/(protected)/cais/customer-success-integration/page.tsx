/**
 * Customer Success Integration Page
 * Integrate customer success data with sales intelligence
 */

'use client';

import { CustomerSuccessIntegration } from '@/components/cais/customer-success-integration';

export default function CustomerSuccessIntegrationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Success Integration</h1>
        <p className="text-muted-foreground">
          Integrate customer success data with sales intelligence
        </p>
      </div>
      <CustomerSuccessIntegration />
    </div>
  );
}

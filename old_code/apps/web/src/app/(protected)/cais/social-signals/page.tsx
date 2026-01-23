/**
 * Social Signals Page
 * Process and monitor social signals for sales intelligence
 */

'use client';

import { SocialSignal } from '@/components/cais/social-signal';

export default function SocialSignalsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Signals</h1>
        <p className="text-muted-foreground">
          Process external social signals for sales intelligence
        </p>
      </div>
      <SocialSignal />
    </div>
  );
}

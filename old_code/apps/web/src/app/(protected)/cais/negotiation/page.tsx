/**
 * Negotiation Intelligence Page
 * Negotiation analysis and strategy recommendations
 */

'use client';

import { NegotiationIntelligence } from '@/components/cais/negotiation-intelligence';

export default function NegotiationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Negotiation Intelligence</h1>
        <p className="text-muted-foreground">
          Analyze negotiations and get strategy recommendations
        </p>
      </div>
      <NegotiationIntelligence />
    </div>
  );
}

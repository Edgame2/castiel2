/**
 * Competitive Intelligence Page
 * Analyze competitive intelligence and detect threats
 */

'use client';

import { CompetitiveIntelligence } from '@/components/cais/competitive-intelligence';

export default function CompetitiveIntelligencePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Competitive Intelligence</h1>
        <p className="text-muted-foreground">
          Analyze competitive intelligence and detect threats
        </p>
      </div>
      <CompetitiveIntelligence />
    </div>
  );
}

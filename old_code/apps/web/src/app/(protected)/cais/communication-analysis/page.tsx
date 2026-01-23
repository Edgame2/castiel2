/**
 * Communication Analysis Page
 * Analyze communication content for sentiment, tone, and engagement
 */

'use client';

import { CommunicationAnalysis } from '@/components/cais/communication-analysis';

export default function CommunicationAnalysisPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communication Analysis</h1>
        <p className="text-muted-foreground">
          Analyze communication content for sentiment, tone, and engagement insights
        </p>
      </div>
      <CommunicationAnalysis />
    </div>
  );
}

/**
 * Pipeline Health Page
 * Comprehensive pipeline health dashboard
 */

'use client';

import { PipelineHealth } from '@/components/cais/pipeline-health';

export default function PipelineHealthPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pipeline Health</h1>
        <p className="text-muted-foreground">
          Comprehensive health analysis of your sales pipeline
        </p>
      </div>
      <PipelineHealth />
    </div>
  );
}

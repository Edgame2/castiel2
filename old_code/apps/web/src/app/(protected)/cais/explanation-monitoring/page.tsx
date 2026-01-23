/**
 * Explanation Monitoring Page
 * Track explanation usage and monitoring metrics
 */

'use client';

import { ExplanationMonitoring } from '@/components/cais/explanation-monitoring';

export default function ExplanationMonitoringPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Explanation Monitoring</h1>
        <p className="text-muted-foreground">
          Track how users interact with AI explanations
        </p>
      </div>
      <ExplanationMonitoring />
    </div>
  );
}

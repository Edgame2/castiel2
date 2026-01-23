/**
 * Anomaly Detection Page
 * Detect anomalies in opportunity data
 */

'use client';

import { AnomalyDetection } from '@/components/cais/anomaly-detection';

export default function AnomalyDetectionPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anomaly Detection</h1>
        <p className="text-muted-foreground">
          Detect anomalies in opportunity data
        </p>
      </div>
      <AnomalyDetection />
    </div>
  );
}

/**
 * Explanation Quality Page
 * Assess explanation quality metrics
 */

'use client';

import { ExplanationQuality } from '@/components/cais/explanation-quality';

export default function ExplanationQualityPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Explanation Quality</h1>
        <p className="text-muted-foreground">
          Assess the quality of AI explanations
        </p>
      </div>
      <ExplanationQuality />
    </div>
  );
}

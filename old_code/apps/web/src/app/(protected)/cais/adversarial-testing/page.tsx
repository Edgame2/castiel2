/**
 * Adversarial Testing Page
 * Run adversarial tests to detect vulnerabilities
 */

'use client';

import { AdversarialTesting } from '@/components/cais/adversarial-testing';

export default function AdversarialTestingPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Adversarial Testing</h1>
        <p className="text-muted-foreground">
          Run adversarial tests to detect vulnerabilities
        </p>
      </div>
      <AdversarialTesting />
    </div>
  );
}

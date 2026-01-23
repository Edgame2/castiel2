/**
 * Self Healing Page
 * Automatically detect and remediate issues
 */

'use client';

import { SelfHealing } from '@/components/cais/self-healing';

export default function SelfHealingPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Self Healing</h1>
        <p className="text-muted-foreground">
          Automatically detect and remediate issues
        </p>
      </div>
      <SelfHealing />
    </div>
  );
}

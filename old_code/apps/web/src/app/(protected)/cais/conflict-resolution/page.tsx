/**
 * Conflict Resolution Learning Page
 * Resolve conflicts between detection methods using learned strategies
 */

'use client';

import { ConflictResolutionLearning } from '@/components/cais/conflict-resolution-learning';

export default function ConflictResolutionPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conflict Resolution Learning</h1>
        <p className="text-muted-foreground">
          Resolve conflicts between detection methods using learned strategies
        </p>
      </div>
      <ConflictResolutionLearning />
    </div>
  );
}

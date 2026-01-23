/**
 * Relationship Evolution Page
 * Track relationship evolution and health over time
 */

'use client';

import { RelationshipEvolution } from '@/components/cais/relationship-evolution';

export default function RelationshipEvolutionPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relationship Evolution</h1>
        <p className="text-muted-foreground">
          Track relationship evolution and health over time
        </p>
      </div>
      <RelationshipEvolution />
    </div>
  );
}

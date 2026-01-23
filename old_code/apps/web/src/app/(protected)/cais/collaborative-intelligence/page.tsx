/**
 * Collaborative Intelligence Page
 * Team learning and knowledge sharing
 */

'use client';

import { CollaborativeIntelligence } from '@/components/cais/collaborative-intelligence';

export default function CollaborativeIntelligencePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collaborative Intelligence</h1>
        <p className="text-muted-foreground">
          Team learning and knowledge sharing
        </p>
      </div>
      <CollaborativeIntelligence />
    </div>
  );
}

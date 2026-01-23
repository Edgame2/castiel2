/**
 * Hierarchical Memory Page
 * Store and retrieve memory records from the hierarchical memory system
 */

'use client';

import { HierarchicalMemory } from '@/components/cais/hierarchical-memory';

export default function MemoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hierarchical Memory</h1>
        <p className="text-muted-foreground">
          Store and retrieve memory records from the hierarchical memory system
        </p>
      </div>
      <HierarchicalMemory />
    </div>
  );
}

/**
 * Benchmarks Page
 * Main page for viewing benchmarks
 */

'use client';

import { BenchmarkDashboard } from '@/components/benchmarks/benchmark-dashboard';

export default function BenchmarksPage() {
  return (
    <div className="container mx-auto py-6">
      <BenchmarkDashboard />
    </div>
  );
}



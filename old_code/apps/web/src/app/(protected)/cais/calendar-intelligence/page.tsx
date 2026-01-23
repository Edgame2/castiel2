/**
 * Calendar Intelligence Page
 * Analyze calendar patterns for sales intelligence
 */

'use client';

import { CalendarIntelligence } from '@/components/cais/calendar-intelligence';

export default function CalendarIntelligencePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar Intelligence</h1>
        <p className="text-muted-foreground">
          Analyze calendar patterns for sales intelligence insights
        </p>
      </div>
      <CalendarIntelligence />
    </div>
  );
}

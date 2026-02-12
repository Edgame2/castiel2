/**
 * LinkCompetitorCard – trigger to link a competitor to an opportunity (Gap 4, Plan §14).
 * Renders a "Link competitor" button and CompetitorSelectModal (GET /competitors, POST /competitors/:id/track).
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompetitorSelectModal } from './CompetitorSelectModal';

export type LinkCompetitorCardProps = {
  opportunityId: string;
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  onLinked?: () => void;
};

export function LinkCompetitorCard({
  opportunityId,
  title = 'Competitors',
  apiBaseUrl = '',
  getHeaders,
  onLinked,
}: LinkCompetitorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Link competitor
      </Button>
      <CompetitorSelectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        opportunityId={opportunityId}
        onLinked={onLinked}
        apiBaseUrl={apiBaseUrl}
        getHeaders={getHeaders}
      />
    </div>
  );
}

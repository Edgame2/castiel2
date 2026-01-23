'use client';

import { IntegrationCard } from './integration-card';
import type { IntegrationDocument } from '@/types/integration';

interface IntegrationListProps {
  integrations: IntegrationDocument[];
  onEdit?: (integration: IntegrationDocument) => void;
  onDelete?: (integration: IntegrationDocument) => void;
  onActivate?: (integration: IntegrationDocument) => void;
  onDeactivate?: (integration: IntegrationDocument) => void;
  onTestConnection?: (integration: IntegrationDocument) => void;
}

export function IntegrationList({
  integrations,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onTestConnection,
}: IntegrationListProps) {
  if (integrations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No integrations found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          onEdit={() => onEdit?.(integration)}
          onDelete={() => onDelete?.(integration)}
          onActivate={() => onActivate?.(integration)}
          onDeactivate={() => onDeactivate?.(integration)}
          onTestConnection={() => onTestConnection?.(integration)}
        />
      ))}
    </div>
  );
}








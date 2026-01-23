'use client';

import { IntegrationProviderCard } from './integration-provider-card';
import type { IntegrationProviderDocument } from '@/types/integration';

interface IntegrationProviderListProps {
  providers: IntegrationProviderDocument[];
  onEdit?: (provider: IntegrationProviderDocument) => void;
  onDelete?: (provider: IntegrationProviderDocument) => void;
  onChangeStatus?: (provider: IntegrationProviderDocument) => void;
  onChangeAudience?: (provider: IntegrationProviderDocument) => void;
}

export function IntegrationProviderList({
  providers,
  onEdit,
  onDelete,
  onChangeStatus,
  onChangeAudience,
}: IntegrationProviderListProps) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No providers found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => (
        <IntegrationProviderCard
          key={provider.id}
          provider={provider}
          onEdit={() => onEdit?.(provider)}
          onDelete={() => onDelete?.(provider)}
          onChangeStatus={() => onChangeStatus?.(provider)}
          onChangeAudience={() => onChangeAudience?.(provider)}
        />
      ))}
    </div>
  );
}








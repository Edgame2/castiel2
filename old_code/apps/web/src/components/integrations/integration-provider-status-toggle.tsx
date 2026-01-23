'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useChangeProviderStatus } from '@/hooks/use-integration-providers';
import type { IntegrationProviderDocument } from '@/types/integration';
import { Loader2 } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface IntegrationProviderStatusToggleProps {
  provider: IntegrationProviderDocument;
  onSuccess?: () => void;
}

export function IntegrationProviderStatusToggle({
  provider,
  onSuccess,
}: IntegrationProviderStatusToggleProps) {
  const [selectedStatus, setSelectedStatus] = useState(provider.status);
  const changeStatus = useChangeProviderStatus();

  const handleStatusChange = async (newStatus: 'active' | 'beta' | 'deprecated' | 'disabled') => {
    if (newStatus === provider.status) return;

    try {
      await changeStatus.mutateAsync({
        category: provider.category,
        id: provider.id,
        status: newStatus,
      });
      setSelectedStatus(newStatus);
      onSuccess?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to change provider status', 3, {
        errorMessage: errorObj.message,
        providerId: provider.id,
        newStatus,
      })
      // Revert on error
      setSelectedStatus(provider.status);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'beta':
        return 'secondary';
      case 'deprecated':
      case 'disabled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          handleStatusChange(value as 'active' | 'beta' | 'deprecated' | 'disabled')
        }
        disabled={changeStatus.isPending}
      >
        <SelectTrigger className="w-[140px]">
          {changeStatus.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="beta">Beta</SelectItem>
          <SelectItem value="deprecated">Deprecated</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
        </SelectContent>
      </Select>
      <Badge variant={getStatusVariant(selectedStatus)}>{selectedStatus}</Badge>
    </div>
  );
}








'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface IntegrationProviderFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    status?: string;
    audience?: string;
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
  }) => void;
  initialFilters?: {
    category?: string;
    status?: string;
    audience?: string;
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
  };
}

export function IntegrationProviderFilters({
  onFilterChange,
  initialFilters = {},
}: IntegrationProviderFiltersProps) {
  const [filters, setFilters] = useState(initialFilters);

  const handleFilterChange = (key: string, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [key]: value };
    if (value === undefined || value === '') {
      delete newFilters[key as keyof typeof newFilters];
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={filters.category || ''}
            onValueChange={(value) => handleFilterChange('category', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              <SelectItem value="crm">CRM</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="data_source">Data Source</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status || ''}
            onValueChange={(value) => handleFilterChange('status', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Audience</Label>
          <Select
            value={filters.audience || ''}
            onValueChange={(value) => handleFilterChange('audience', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All audiences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All audiences</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.supportsSearch ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange('supportsSearch', filters.supportsSearch ? undefined : true)}
        >
          <Badge variant={filters.supportsSearch ? 'default' : 'outline'}>Search</Badge>
        </Button>
        <Button
          variant={filters.supportsNotifications ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange('supportsNotifications', filters.supportsNotifications ? undefined : true)}
        >
          <Badge variant={filters.supportsNotifications ? 'default' : 'outline'}>Notifications</Badge>
        </Button>
        <Button
          variant={filters.requiresUserScoping ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange('requiresUserScoping', filters.requiresUserScoping ? undefined : true)}
        >
          <Badge variant={filters.requiresUserScoping ? 'default' : 'outline'}>User Scoped</Badge>
        </Button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1">
              {key}: {String(value)}
              <button
                onClick={() => handleFilterChange(key, undefined)}
                className="ml-1 hover:bg-destructive/20 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}








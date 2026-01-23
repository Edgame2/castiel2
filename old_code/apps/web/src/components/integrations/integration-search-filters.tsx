'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface IntegrationSearchFiltersProps {
  onFilterChange: (filters: {
    entities?: string[];
    dateRange?: { start?: Date; end?: Date };
    integrationIds?: string[];
  }) => void;
  availableEntities?: string[];
  availableIntegrations?: Array<{ id: string; name: string }>;
}

export function IntegrationSearchFilters({
  onFilterChange,
  availableEntities = [],
  availableIntegrations = [],
}: IntegrationSearchFiltersProps) {
  const [filters, setFilters] = useState<{
    entities?: string[];
    dateRange?: { start?: Date; end?: Date };
    integrationIds?: string[];
  }>({});

  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  const handleEntityToggle = (entity: string) => {
    const newEntities = selectedEntities.includes(entity)
      ? selectedEntities.filter((e) => e !== entity)
      : [...selectedEntities, entity];
    setSelectedEntities(newEntities);
    updateFilters({ entities: newEntities.length > 0 ? newEntities : undefined });
  };

  const handleIntegrationToggle = (integrationId: string) => {
    const newIntegrations = selectedIntegrations.includes(integrationId)
      ? selectedIntegrations.filter((id) => id !== integrationId)
      : [...selectedIntegrations, integrationId];
    setSelectedIntegrations(newIntegrations);
    updateFilters({ integrationIds: newIntegrations.length > 0 ? newIntegrations : undefined });
  };

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    setDateStart(start);
    setDateEnd(end);
    updateFilters({
      dateRange: start || end ? { start, end } : undefined,
    });
  };

  const updateFilters = (updates: Partial<typeof filters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedEntities([]);
    setSelectedIntegrations([]);
    setDateStart(undefined);
    setDateEnd(undefined);
    onFilterChange({});
  };

  const activeFilterCount =
    (selectedEntities.length > 0 ? 1 : 0) +
    (selectedIntegrations.length > 0 ? 1 : 0) +
    (dateStart || dateEnd ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Search Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {availableEntities.length > 0 && (
        <div className="space-y-2">
          <Label>Entity Types</Label>
          <div className="flex flex-wrap gap-2">
            {availableEntities.map((entity) => (
              <Button
                key={entity}
                variant={selectedEntities.includes(entity) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleEntityToggle(entity)}
              >
                {entity}
              </Button>
            ))}
          </div>
        </div>
      )}

      {availableIntegrations.length > 0 && (
        <div className="space-y-2">
          <Label>Integrations</Label>
          <div className="flex flex-wrap gap-2">
            {availableIntegrations.map((integration) => (
              <Button
                key={integration.id}
                variant={selectedIntegrations.includes(integration.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleIntegrationToggle(integration.id)}
              >
                {integration.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Date Range</Label>
        <div className="grid gap-2 md:grid-cols-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateStart && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateStart ? format(dateStart, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateStart}
                onSelect={(date) => handleDateRangeChange(date, dateEnd)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateEnd && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateEnd ? format(dateEnd, 'PPP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateEnd}
                onSelect={(date) => handleDateRangeChange(dateStart, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEntities.map((entity) => (
            <Badge key={entity} variant="secondary" className="gap-1">
              Entity: {entity}
              <button
                onClick={() => handleEntityToggle(entity)}
                className="ml-1 hover:bg-destructive/20 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedIntegrations.map((id) => {
            const integration = availableIntegrations.find((i) => i.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                Integration: {integration?.name || id}
                <button
                  onClick={() => handleIntegrationToggle(id)}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {dateStart && (
            <Badge variant="secondary" className="gap-1">
              From: {format(dateStart, 'MMM d')}
              <button
                onClick={() => handleDateRangeChange(undefined, dateEnd)}
                className="ml-1 hover:bg-destructive/20 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateEnd && (
            <Badge variant="secondary" className="gap-1">
              To: {format(dateEnd, 'MMM d')}
              <button
                onClick={() => handleDateRangeChange(dateStart, undefined)}
                className="ml-1 hover:bg-destructive/20 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}








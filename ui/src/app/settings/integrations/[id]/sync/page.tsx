/**
 * Tenant Admin: Sync Configuration
 * Configure sync settings: entity selection, schedule, direction, filters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface SyncConfig {
  syncEnabled?: boolean;
  enabledEntities?: string[];
  schedule?: {
    frequency: 'manual' | '15min' | 'hourly' | 'daily' | 'weekly' | 'custom';
    cronExpression?: string;
    timezone?: string;
  };
  direction?: 'one-way' | 'bidirectional';
  filters?: Array<{
    entityType: string;
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
    value: string | number | boolean;
  }>;
  maxRecordsPerSync?: number;
}

interface Integration {
  id: string;
  name: string;
  integrationType: string;
  syncConfig?: SyncConfig;
}

export default function SyncConfigurationPage() {
  const params = useParams();
  const integrationId = params.id as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'entities' | 'schedule' | 'direction' | 'filters'>('entities');

  const fetchIntegration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/integrations/${integrationId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegration(json);
      setSyncConfig(json?.syncConfig || {});
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  const fetchSyncConfig = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/v1/integrations/${integrationId}/sync-config`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSyncConfig(json?.syncConfig || {});
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    }
  }, [integrationId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/integrations/${integrationId}/sync-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncConfig),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSyncConfig();
      alert('Sync configuration saved successfully');
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      alert(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSync = async (fullSync = false) => {
    if (!confirm(`Are you sure you want to trigger a ${fullSync ? 'full' : 'incremental'} sync?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullSync }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      alert(`Sync triggered successfully. Task ID: ${json.syncTaskId}`);
    } catch (e) {
      alert(GENERIC_ERROR_MESSAGE);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading sync configuration…</p>
      </div>
    );
  }

  if (error && !integration) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          ← Integrations
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href={`/settings/integrations/${integrationId}`} className="text-sm font-medium hover:underline">
          {integration?.name || 'Integration'}
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Sync Configuration</h1>
          <p className="text-muted-foreground">
            Configure sync settings for {integration?.name || 'integration'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => handleTriggerSync(false)}>
            Sync Now
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-gray-900">
        <div className="border-b">
          <nav className="flex gap-4 px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 ${activeTab === 'entities' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('entities')}
            >
              Entity Selection
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 ${activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('schedule')}
            >
              Sync Schedule
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 ${activeTab === 'direction' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('direction')}
            >
              Sync Direction
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 ${activeTab === 'filters' ? 'border-primary text-primary' : 'border-transparent'}`}
              onClick={() => setActiveTab('filters')}
            >
              Filters
            </Button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'entities' && (
            <EntitySelectionTab
              enabledEntities={syncConfig.enabledEntities || []}
              onChange={(entities) => setSyncConfig({ ...syncConfig, enabledEntities: entities })}
            />
          )}

          {activeTab === 'schedule' && (
            <SyncScheduleTab
              schedule={syncConfig.schedule}
              onChange={(schedule) => setSyncConfig({ ...syncConfig, schedule })}
            />
          )}

          {activeTab === 'direction' && (
            <SyncDirectionTab
              direction={syncConfig.direction || 'one-way'}
              onChange={(direction) => setSyncConfig({ ...syncConfig, direction })}
            />
          )}

          {activeTab === 'filters' && (
            <SyncFiltersTab
              filters={syncConfig.filters || []}
              onChange={(filters) => setSyncConfig({ ...syncConfig, filters })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface EntitySelectionTabProps {
  enabledEntities: string[];
  onChange: (entities: string[]) => void;
}

function EntitySelectionTab({ enabledEntities, onChange }: EntitySelectionTabProps) {
  // Common CRM entities - in a real app, these would come from the integration catalog
  const availableEntities = ['Opportunity', 'Account', 'Contact', 'Lead', 'Case', 'Task', 'Event'];

  const toggleEntity = (entity: string) => {
    if (enabledEntities.includes(entity)) {
      onChange(enabledEntities.filter((e) => e !== entity));
    } else {
      onChange([...enabledEntities, entity]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Select Entities to Sync</h3>
      <div className="space-y-2">
        {availableEntities.map((entity) => (
          <div key={entity} className="flex items-center space-x-2 p-3 border rounded hover:bg-muted/50">
            <Checkbox
              id={`entity-${entity}`}
              checked={enabledEntities.includes(entity)}
              onCheckedChange={() => toggleEntity(entity)}
            />
            <Label htmlFor={`entity-${entity}`} className="text-sm font-medium cursor-pointer flex-1">
              {entity}
            </Label>
          </div>
        ))}
      </div>
      {enabledEntities.length === 0 && (
        <p className="text-sm text-gray-500 mt-4">No entities selected. Select at least one entity to enable syncing.</p>
      )}
    </div>
  );
}

interface SyncScheduleTabProps {
  schedule?: SyncConfig['schedule'];
  onChange: (schedule: SyncConfig['schedule']) => void;
}

function SyncScheduleTab({ schedule, onChange }: SyncScheduleTabProps) {
  const frequency = schedule?.frequency || 'manual';

  const handleFrequencyChange = (newFrequency: NonNullable<SyncConfig['schedule']>['frequency']) => {
    onChange({
      ...schedule,
      frequency: newFrequency,
      cronExpression: newFrequency === 'custom' ? schedule?.cronExpression : undefined,
    });
  };

  const frequencyLabels: Record<typeof frequency, string> = {
    manual: 'Manual only',
    '15min': 'Every 15 minutes',
    hourly: 'Every hour',
    daily: 'Daily',
    weekly: 'Weekly',
    custom: 'Custom cron expression',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Sync Schedule</h3>
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(v) => handleFrequencyChange(v as NonNullable<SyncConfig['schedule']>['frequency'])}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['manual', '15min', 'hourly', 'daily', 'weekly', 'custom'] as const).map((freq) => (
              <SelectItem key={freq} value={freq}>
                {frequencyLabels[freq]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {frequency === 'custom' && (
        <div className="mt-4 space-y-2">
          <Label>Cron Expression</Label>
          <Input
            type="text"
            value={schedule?.cronExpression || ''}
            onChange={(e) => onChange({ frequency: schedule?.frequency ?? 'custom', cronExpression: e.target.value, timezone: schedule?.timezone })}
            placeholder="0 0 * * *"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Enter a valid cron expression (e.g., "0 0 * * *" for daily at midnight)</p>
        </div>
      )}
      <div className="mt-4 space-y-2">
        <Label>Timezone (optional)</Label>
        <Input
          type="text"
          value={schedule?.timezone || ''}
          onChange={(e) => onChange({ frequency: schedule?.frequency ?? 'manual', timezone: e.target.value, cronExpression: schedule?.cronExpression })}
          placeholder="UTC"
          className="w-full max-w-xs"
        />
      </div>
    </div>
  );
}

interface SyncDirectionTabProps {
  direction: 'one-way' | 'bidirectional';
  onChange: (direction: 'one-way' | 'bidirectional') => void;
}

function SyncDirectionTab({ direction, onChange }: SyncDirectionTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Sync Direction</h3>
      <div className="space-y-2">
        <Label>Direction</Label>
        <Select value={direction} onValueChange={(v) => onChange(v as 'one-way' | 'bidirectional')}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one-way">One-way (Integration → Castiel)</SelectItem>
            <SelectItem value="bidirectional">Two-way (Bidirectional)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface SyncFiltersTabProps {
  filters: SyncConfig['filters'];
  onChange: (filters: SyncConfig['filters']) => void;
}

function SyncFiltersTab({ filters = [], onChange }: SyncFiltersTabProps) {
  const addFilter = () => {
    onChange([
      ...filters,
      {
        entityType: 'Opportunity',
        field: '',
        operator: 'equals' as const,
        value: '',
      },
    ]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<NonNullable<SyncConfig['filters']>[0]>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sync Filters</h3>
        <Button type="button" size="sm" onClick={addFilter}>
          Add Filter
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Configure filters to limit which records are synced. Only records matching all filters will be synced.
      </p>
      {filters.length === 0 ? (
        <p className="text-sm text-gray-500">No filters configured. All records will be synced.</p>
      ) : (
        <div className="space-y-4">
          {filters.map((filter, index) => (
            <div key={index} className="p-4 border rounded">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Entity Type</Label>
                  <Input
                    type="text"
                    value={filter.entityType}
                    onChange={(e) => updateFilter(index, { entityType: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="Opportunity"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field</Label>
                  <Input
                    type="text"
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="StageName"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(v) => updateFilter(index, { operator: v as 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greaterThan">Greater Than</SelectItem>
                      <SelectItem value="lessThan">Less Than</SelectItem>
                      <SelectItem value="in">In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={filter.value === undefined || filter.value === null ? '' : String(filter.value)}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      className="h-8 flex-1 text-sm"
                      placeholder="Value"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFilter(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

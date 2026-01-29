/**
 * Tenant Admin: Sync Configuration
 * Configure sync settings: entity selection, schedule, direction, filters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
    value: any;
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
  const router = useRouter();
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
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegration(json);
      setSyncConfig(json?.syncConfig || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  const fetchSyncConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/sync-config`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSyncConfig(json?.syncConfig || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [integrationId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/sync-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(syncConfig),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSyncConfig();
      alert('Sync configuration saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSync = async (fullSync = false) => {
    if (!confirm(`Are you sure you want to trigger a ${fullSync ? 'full' : 'incremental'} sync?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}/sync`, {
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
      alert(`Failed to trigger sync: ${e instanceof Error ? e.message : String(e)}`);
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
          <button
            onClick={() => handleTriggerSync(false)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
          >
            Sync Now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
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
            <button
              onClick={() => setActiveTab('entities')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'entities'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Entity Selection
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sync Schedule
            </button>
            <button
              onClick={() => setActiveTab('direction')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'direction'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sync Direction
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'filters'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Filters
            </button>
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
          <label key={entity} className="flex items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={enabledEntities.includes(entity)}
              onChange={() => toggleEntity(entity)}
              className="mr-3"
            />
            <span className="text-sm font-medium">{entity}</span>
          </label>
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Sync Schedule</h3>
      <div className="space-y-2">
        {(['manual', '15min', 'hourly', 'daily', 'weekly', 'custom'] as const).map((freq) => (
          <label key={freq} className="flex items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value={freq}
              checked={frequency === freq}
              onChange={() => handleFrequencyChange(freq)}
              className="mr-3"
            />
            <span className="text-sm font-medium">
              {freq === 'manual'
                ? 'Manual only'
                : freq === '15min'
                  ? 'Every 15 minutes'
                  : freq === 'hourly'
                    ? 'Every hour'
                    : freq === 'daily'
                      ? 'Daily'
                      : freq === 'weekly'
                        ? 'Weekly'
                        : 'Custom cron expression'}
            </span>
          </label>
        ))}
      </div>
      {frequency === 'custom' && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Cron Expression</label>
          <input
            type="text"
            value={schedule?.cronExpression || ''}
            onChange={(e) => onChange({ frequency: schedule?.frequency ?? 'custom', cronExpression: e.target.value, timezone: schedule?.timezone })}
            className="w-full px-3 py-2 border rounded"
            placeholder="0 0 * * *"
          />
          <p className="text-xs text-gray-500 mt-1">Enter a valid cron expression (e.g., "0 0 * * *" for daily at midnight)</p>
        </div>
      )}
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Timezone (optional)</label>
        <input
          type="text"
          value={schedule?.timezone || ''}
          onChange={(e) => onChange({ frequency: schedule?.frequency ?? 'manual', timezone: e.target.value, cronExpression: schedule?.cronExpression })}
          className="w-full px-3 py-2 border rounded"
          placeholder="UTC"
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
        <label className="flex items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
          <input
            type="radio"
            name="direction"
            value="one-way"
            checked={direction === 'one-way'}
            onChange={() => onChange('one-way')}
            className="mr-3"
          />
          <div>
            <span className="text-sm font-medium">One-way (Integration → Castiel)</span>
            <p className="text-xs text-gray-500 mt-1">Data flows from the integration to Castiel only</p>
          </div>
        </label>
        <label className="flex items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
          <input
            type="radio"
            name="direction"
            value="bidirectional"
            checked={direction === 'bidirectional'}
            onChange={() => onChange('bidirectional')}
            className="mr-3"
          />
          <div>
            <span className="text-sm font-medium">Two-way (Bidirectional)</span>
            <p className="text-xs text-gray-500 mt-1">Data flows both ways between the integration and Castiel</p>
          </div>
        </label>
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
        <button
          onClick={addFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Add Filter
        </button>
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
                <div>
                  <label className="block text-xs font-medium mb-1">Entity Type</label>
                  <input
                    type="text"
                    value={filter.entityType}
                    onChange={(e) => updateFilter(index, { entityType: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Opportunity"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Field</label>
                  <input
                    type="text"
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="StageName"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Operator</label>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater Than</option>
                    <option value="lessThan">Less Than</option>
                    <option value="in">In</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Value</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      placeholder="Value"
                    />
                    <button
                      onClick={() => removeFilter(index)}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      ×
                    </button>
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

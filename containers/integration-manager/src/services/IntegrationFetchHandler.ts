/**
 * Fetch integration records handler (used by POST .../fetch route).
 * Resolves integration, merges pullFilters and settings, gets adapter, calls fetchRecords.
 */

import type { IntegrationService } from './IntegrationService';
import type { AdapterManagerService } from './AdapterManagerService';
import type { IntegrationAdapter } from '../types/adapter.types';

export interface FetchIntegrationRecordsParams {
  integrationId: string;
  tenantId: string;
  userId: string;
  body: {
    entityType?: string;
    filters?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  };
}

export interface FetchIntegrationRecordsResult {
  records: unknown[];
}

/**
 * Fetch records from an integration via its adapter. Used by the fetch route.
 */
export async function fetchIntegrationRecords(
  integrationService: IntegrationService,
  adapterManagerService: AdapterManagerService,
  params: FetchIntegrationRecordsParams
): Promise<FetchIntegrationRecordsResult> {
  const { integrationId, tenantId, userId, body } = params;
  const entityType = body.entityType || 'opportunity';
  const limit = body.limit ?? 1000;
  const offset = body.offset ?? 0;

  const integration = await integrationService.getById(integrationId, tenantId);
  const providerName = integration.providerName;
  if (!providerName) {
    return { records: [] };
  }

  const pullFilters = integration.syncConfig?.pullFilters || [];
  const bodyFilters = body.filters || {};
  const filters: Record<string, unknown> = { ...bodyFilters };
  if (pullFilters.length > 0) {
    filters._pullFilters = pullFilters;
  }
  if (integration.settings && Object.keys(integration.settings).length > 0) {
    filters._integrationSettings = integration.settings;
  }

  let adapter: IntegrationAdapter | undefined;
  try {
    adapter = await adapterManagerService.getAdapter(providerName, integrationId, tenantId, userId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Adapter not found') || message.includes('Integration not found')) {
      return { records: [] };
    }
    throw err;
  }
  if (!adapter.fetchRecords) {
    return { records: [] };
  }

  const result = await adapter.fetchRecords(entityType, {
    tenantId,
    userId,
    limit,
    offset,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });
  const records = result?.records ?? [];
  return { records: Array.isArray(records) ? records : [] };
}

/**
 * Unit tests for fetch route handler (fetchIntegrationRecords).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIntegrationRecords } from '../../../src/services/IntegrationFetchHandler';
import type { IntegrationService } from '../../../src/services/IntegrationService';
import type { AdapterManagerService } from '../../../src/services/AdapterManagerService';

describe('fetchIntegrationRecords', () => {
  let mockIntegrationService: IntegrationService;
  let mockAdapterManagerService: AdapterManagerService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrationService = {
      getById: vi.fn(),
    } as unknown as IntegrationService;
    mockAdapterManagerService = {
      getAdapter: vi.fn(),
    } as unknown as AdapterManagerService;
  });

  it('should return empty array when integration has no providerName', async () => {
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: undefined as unknown as string,
      syncConfig: {},
    } as any);
    const result = await fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
      integrationId: 'int-1',
      tenantId: 't1',
      userId: 'u1',
      body: {},
    });
    expect(result.records).toEqual([]);
    expect(mockAdapterManagerService.getAdapter).not.toHaveBeenCalled();
  });

  it('should return empty array when getAdapter throws Adapter not found', async () => {
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: 'unknown_provider',
      syncConfig: { pullFilters: [] },
      settings: {},
    } as any);
    vi.mocked(mockAdapterManagerService.getAdapter).mockRejectedValue(new Error('Adapter not found'));
    const result = await fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
      integrationId: 'int-1',
      tenantId: 't1',
      userId: 'u1',
      body: {},
    });
    expect(result.records).toEqual([]);
  });

  it('should return empty array when adapter has no fetchRecords', async () => {
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: 'salesforce',
      syncConfig: {},
      settings: {},
    } as any);
    vi.mocked(mockAdapterManagerService.getAdapter).mockResolvedValue({ connect: vi.fn() } as any);
    const result = await fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
      integrationId: 'int-1',
      tenantId: 't1',
      userId: 'u1',
      body: {},
    });
    expect(result.records).toEqual([]);
  });

  it('should return records from adapter and pass pullFilters and settings', async () => {
    const mockRecords = [{ id: 'r1', name: 'Record 1' }];
    const fetchRecords = vi.fn().mockResolvedValue({ records: mockRecords, total: 1, hasMore: false });
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: 'google_workspace',
      syncConfig: {
        pullFilters: [
          { field: 'calendarId', operator: 'equals', value: 'primary' },
          { field: 'timeMin', operator: 'equals', value: '2025-02-01T00:00:00Z' },
        ],
      },
      settings: { userList: ['u@example.com'] },
    } as any);
    vi.mocked(mockAdapterManagerService.getAdapter).mockResolvedValue({
      fetchRecords,
    } as any);
    const result = await fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
      integrationId: 'int-1',
      tenantId: 't1',
      userId: 'u1',
      body: { entityType: 'Event', limit: 100, offset: 0 },
    });
    expect(result.records).toEqual(mockRecords);
    expect(fetchRecords).toHaveBeenCalledWith(
      'Event',
      expect.objectContaining({
        tenantId: 't1',
        userId: 'u1',
        limit: 100,
        offset: 0,
        filters: expect.objectContaining({
          _pullFilters: [
            { field: 'calendarId', operator: 'equals', value: 'primary' },
            { field: 'timeMin', operator: 'equals', value: '2025-02-01T00:00:00Z' },
          ],
          _integrationSettings: { userList: ['u@example.com'] },
        }),
      })
    );
  });

  it('should merge body filters with syncConfig pullFilters', async () => {
    const fetchRecords = vi.fn().mockResolvedValue({ records: [], total: 0, hasMore: false });
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: 'google_workspace',
      syncConfig: { pullFilters: [{ field: 'labelIds', operator: 'equals', value: ['INBOX'] }] },
      settings: {},
    } as any);
    vi.mocked(mockAdapterManagerService.getAdapter).mockResolvedValue({ fetchRecords } as any);
    await fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
      integrationId: 'int-1',
      tenantId: 't1',
      userId: 'u1',
      body: { filters: { custom: 'value' } },
    });
    expect(fetchRecords).toHaveBeenCalledWith(
      'opportunity',
      expect.objectContaining({
        filters: expect.objectContaining({
          _pullFilters: [{ field: 'labelIds', operator: 'equals', value: ['INBOX'] }],
          custom: 'value',
        }),
      })
    );
  });

  it('should rethrow when getAdapter throws non-not-found error', async () => {
    vi.mocked(mockIntegrationService.getById).mockResolvedValue({
      id: 'int-1',
      tenantId: 't1',
      providerName: 'salesforce',
      syncConfig: {},
      settings: {},
    } as any);
    vi.mocked(mockAdapterManagerService.getAdapter).mockRejectedValue(new Error('Network error'));
    await expect(
      fetchIntegrationRecords(mockIntegrationService, mockAdapterManagerService, {
        integrationId: 'int-1',
        tenantId: 't1',
        userId: 'u1',
        body: {},
      })
    ).rejects.toThrow('Network error');
  });
});

/**
 * Unit tests for ContextTemplateService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextTemplateService } from '../../../src/services/ContextTemplateService';
import { loadConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('ContextTemplateService', () => {
  let service: ContextTemplateService;
  const tenantId = 'tenant-1';
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        shard_manager: { url: 'http://shard' },
        ai_service: { url: 'http://ai' },
      },
    } as any);
    service = new ContextTemplateService(undefined);
    (service as any).shardManagerClient = { get: mockGet };
    (service as any).getServiceToken = vi.fn(() => 'token');
  });

  describe('selectTemplate', () => {
    it('returns null when no options match', async () => {
      mockGet.mockResolvedValue(null);
      const result = await service.selectTemplate(tenantId, {});
      expect(result).toBeNull();
    });

    it('returns template when preferredTemplateId is set and found', async () => {
      const template = { id: 't1', shardTypeId: 'c_contextTemplate', structuredData: {} };
      mockGet.mockResolvedValue(template);
      const result = await service.selectTemplate(tenantId, {
        preferredTemplateId: 't1',
      });
      expect(result).toEqual(template);
    });

    it('returns null when preferredTemplateId not found', async () => {
      mockGet.mockResolvedValue({ shardTypeId: 'other' });
      const result = await service.selectTemplate(tenantId, {
        preferredTemplateId: 't1',
      });
      expect(result).toBeNull();
    });
  });

  describe('getTemplateById', () => {
    it('returns null when response is not context template type', async () => {
      mockGet.mockResolvedValue({ shardTypeId: 'other' });
      const result = await service.getTemplateById('t1', tenantId);
      expect(result).toBeNull();
    });

    it('returns template when shardTypeId matches', async () => {
      const template = { id: 't1', shardTypeId: 'c_contextTemplate' };
      mockGet.mockResolvedValue(template);
      const result = await service.getTemplateById('t1', tenantId);
      expect(result).toEqual(template);
    });
  });

  describe('listTemplates', () => {
    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('network'));
      const result = await service.listTemplates(tenantId);
      expect(result).toEqual([]);
    });

    it('returns templates from response', async () => {
      mockGet.mockResolvedValue({ shards: [{ id: 't1' }] });
      const result = await service.listTemplates(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });
  });
});

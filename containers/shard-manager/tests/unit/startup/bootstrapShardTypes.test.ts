/**
 * Unit tests for bootstrapShardTypes startup module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootstrapShardTypes } from '../../../src/startup/bootstrapShardTypes';
import type { ShardTypeService } from '../../../src/services/ShardTypeService';

function createMockShardTypeService(): {
  service: ShardTypeService;
  getByName: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  const getByName = vi.fn();
  const create = vi.fn().mockResolvedValue({ id: 'created', tenantId: 't1', name: 'test' });
  const update = vi.fn().mockResolvedValue({ id: 'updated', tenantId: 't1', name: 'test' });
  const service = {
    getByName,
    create,
    update,
  } as unknown as ShardTypeService;
  return { service, getByName, create, update };
}

const config = { tenant_id: 't1', created_by: 'system' };

describe('bootstrapShardTypes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('creates all system and platform types when none exist', async () => {
    const { service, getByName, create } = createMockShardTypeService();
    getByName.mockResolvedValue(null);

    await bootstrapShardTypes(service, config);

    expect(getByName).toHaveBeenCalledTimes(18);
    expect(create).toHaveBeenCalledTimes(18);
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'c_competitor',
        tenantId: 't1',
        createdBy: 'system',
        isSystem: true,
      })
    );
    expect(create).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({
        name: 'Opportunity',
        tenantId: 't1',
        createdBy: 'system',
        isSystem: false,
        schema: expect.objectContaining({ $schemaVersion: '1.1' }),
      })
    );
  });

  it('skips system type when getByName returns existing', async () => {
    const { service, getByName, create } = createMockShardTypeService();
    getByName.mockImplementation((name: string) => {
      if (name === 'c_competitor') return Promise.resolve({ id: 'st1', name, tenantId: 't1' });
      return Promise.resolve(null);
    });

    await bootstrapShardTypes(service, config);

    expect(create).toHaveBeenCalledTimes(17);
    const createCalls = vi.mocked(create).mock.calls;
    const names = createCalls.map((c) => c[0].name);
    expect(names).not.toContain('c_competitor');
  });

  it('updates platform type when existing schema version differs', async () => {
    const { service, getByName, create, update } = createMockShardTypeService();
    getByName.mockImplementation((name: string) => {
      if (name === 'Account')
        return Promise.resolve({
          id: 'st-account',
          name: 'Account',
          tenantId: 't1',
          schema: { $schemaVersion: '0.9', type: 'object' },
        });
      return Promise.resolve(null);
    });

    await bootstrapShardTypes(service, config);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      'st-account',
      't1',
      expect.objectContaining({
        schema: expect.objectContaining({ $schemaVersion: '1.0' }),
      })
    );
  });

  it('does not update platform type when schema version matches', async () => {
    const { service, getByName, update } = createMockShardTypeService();
    getByName.mockImplementation((name: string) => {
      if (name === 'Opportunity')
        return Promise.resolve({
          id: 'st-opp',
          name: 'Opportunity',
          tenantId: 't1',
          schema: { $schemaVersion: '1.1', type: 'object' },
        });
      return Promise.resolve(null);
    });

    await bootstrapShardTypes(service, config);

    expect(update).not.toHaveBeenCalled();
  });
});

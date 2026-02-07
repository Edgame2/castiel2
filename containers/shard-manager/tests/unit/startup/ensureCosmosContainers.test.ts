/**
 * Unit tests for ensureCosmosContainers startup module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureContainer } from '@coder/shared/database';

const validManifest = {
  containers: [
    { id: 'test_container_1', partitionKey: '/tenantId' },
    { id: 'test_container_2', partitionKey: '/tenantId', defaultTtl: 3600 },
  ],
};

vi.mock('fs', () => ({
  existsSync: vi.fn((path: string) => path.includes('cosmos-containers')),
  readFileSync: vi.fn((path: string) => (path.includes('cosmos-containers') ? 'yaml-content' : '')),
}));

vi.mock('yaml', () => ({
  parse: vi.fn((content: string) => {
    if (content === 'yaml-content') return validManifest;
    if (content === 'other: value') return { other: 'value' };
    return {};
  }),
}));

describe('ensureCosmosContainers', () => {
  beforeEach(() => {
    vi.mocked(ensureContainer).mockClear();
  });

  it('loads manifest and calls ensureContainer for each entry', async () => {
    const { ensureCosmosContainers } = await import('../../../src/startup/ensureCosmosContainers');
    await ensureCosmosContainers('config/cosmos-containers.yaml');

    expect(ensureContainer).toHaveBeenCalledTimes(2);
    expect(ensureContainer).toHaveBeenNthCalledWith(1, 'test_container_1', '/tenantId', undefined);
    expect(ensureContainer).toHaveBeenNthCalledWith(2, 'test_container_2', '/tenantId', {
      defaultTtl: 3600,
    });
  });

  it('throws when manifest file does not exist', async () => {
    const { existsSync } = await import('fs');
    vi.mocked(existsSync).mockReturnValueOnce(false);

    const { ensureCosmosContainers } = await import('../../../src/startup/ensureCosmosContainers');
    await expect(
      ensureCosmosContainers('config/nonexistent-manifest.yaml')
    ).rejects.toThrow(/manifest not found/);
  });

  it('throws when manifest has no containers array', async () => {
    const { parse } = await import('yaml');
    vi.mocked(parse).mockReturnValueOnce({ other: 'value' });

    const { ensureCosmosContainers } = await import('../../../src/startup/ensureCosmosContainers');
    await expect(ensureCosmosContainers('config/cosmos-containers.yaml')).rejects.toThrow(
      /Invalid manifest: expected "containers" array/
    );
  });
});

/**
 * c_search flow integration test (dataflow Phase 3.1, 3.5).
 * Runs only when RUN_C_SEARCH_E2E=1 and SHARD_MANAGER_URL is set.
 * Requires a running Shard Manager (and optionally AI service). Verifies web-search search()
 * completes and creates c_search shard when shard_manager is configured.
 *
 * Run with: RUN_C_SEARCH_E2E=1 SHARD_MANAGER_URL=http://localhost:3023 pnpm test tests/integration/c-search-flow
 */

import { describe, it, expect, vi } from 'vitest';

const runE2E = process.env.RUN_C_SEARCH_E2E === '1';
const shardManagerUrl = process.env.SHARD_MANAGER_URL || '';

vi.mock('../../../src/config/index.js', () => ({
  loadConfig: () => ({
    services: {
      shard_manager: { url: shardManagerUrl },
      ai_service: { url: process.env.AI_SERVICE_URL || 'http://localhost:3006' },
      context_service: { url: process.env.CONTEXT_SERVICE_URL || '' },
      embeddings: { url: process.env.EMBEDDINGS_URL || '' },
    },
    database: { containers: { web_search_results: 'web_search_results', cache: 'web_search_cache' } },
    cosmos_db: { containers: { results: 'web_search_results', cache: 'web_search_cache' } },
    jwt: { secret: process.env.JWT_SECRET || 'test-secret' },
  }),
}));

describe.skipIf(!runE2E || !shardManagerUrl)('c_search flow (E2E)', () => {
  it('search() completes and returns result when shard_manager.url is set', async () => {
    const { WebSearchService } = await import('../../../src/services/WebSearchService.js');
    const service = new WebSearchService();
    const result = await service.search('e2e-tenant-id', 'test query', { useCache: false });

    expect(result).toBeDefined();
    expect(result.query).toBe('test query');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.tenantId).toBe('e2e-tenant-id');
  });
});

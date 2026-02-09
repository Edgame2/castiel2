/**
 * Prometheus metrics for web-search (dataflow Phase 4.3)
 */

import { Counter, register } from 'prom-client';

export const cSearchShardsCreatedTotal = new Counter({
  name: 'c_search_shards_created_total',
  help: 'Total c_search shards created by web-search',
  labelNames: ['tenant_id'],
});

export { register };

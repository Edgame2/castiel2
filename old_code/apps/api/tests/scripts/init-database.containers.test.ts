import { describe, it, expect } from 'vitest';
import { CONTAINERS } from '../../../../scripts/init-database'

describe('init-database containers', () => {
  const byId = new Map(CONTAINERS.map(c => [c.id, c]))

  it('includes prompts container with tenant partition key', () => {
    const prompts = byId.get('prompts') as any
    expect(prompts).toBeDefined()
    expect(prompts.partitionKey).toBe('/tenantId')
    expect(prompts.indexingPolicy?.compositeIndexes?.length).toBeGreaterThan(0)
  })

  it('includes leases container with id partition key', () => {
    const leases = byId.get('leases') as any
    expect(leases).toBeDefined()
    expect(leases.partitionKey).toBe('/id')
  })
})

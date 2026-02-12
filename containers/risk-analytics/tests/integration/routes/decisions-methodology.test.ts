/**
 * POST /api/v1/decisions/methodology Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mocks from tests/setup.ts: @coder/shared/database, @coder/shared (auth, ServiceClient)
vi.mock('../../../src/events/publishers/RiskAnalyticsEventPublisher');

describe('POST /api/v1/decisions/methodology', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 or 204 with methodology decision', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/decisions/methodology',
      headers: {
        authorization: 'Bearer test-token',
        'x-tenant-id': 'tenant-123',
      },
      payload: { opportunityId: 'opp-123' },
    });

    expect([200, 204]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('decisionType', 'methodology');
      expect(body).toHaveProperty('source', 'methodology');
      expect(body).toHaveProperty('actions');
    }
  });

  it('returns 400 when opportunityId missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/decisions/methodology',
      headers: {
        authorization: 'Bearer test-token',
        'x-tenant-id': 'tenant-123',
      },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

});

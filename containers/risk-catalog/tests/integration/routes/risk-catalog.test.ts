/**
 * Risk Catalog Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/RiskCatalogEventPublisher');

describe('GET /api/v1/risk-catalog', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve catalog and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/risk-catalog?type=tenant',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
  });

  it('should return 400 for invalid catalog type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/risk-catalog?type=invalid',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/v1/risk-catalog/risks', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create risk and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk-catalog/risks',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        name: 'Test Risk',
        category: 'financial',
        description: 'Test risk description',
        catalogType: 'tenant',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data.data.name).toBe('Test Risk');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk-catalog/risks',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        // Missing required fields
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('PUT /api/v1/risk-catalog/risks/:id', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should update risk and return 200', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/risk-catalog/risks/risk-123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        name: 'Updated Risk',
        description: 'Updated description',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
  });

  it('should return 404 for non-existent risk', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/risk-catalog/risks/non-existent',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        name: 'Updated Risk',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

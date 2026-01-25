/**
 * Conversation Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared/database');
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/ConversationEventPublisher');

describe('POST /api/v1/conversations', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    // Build app with test configuration
    app = await buildApp();
    // In real tests, get auth token from test setup
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create conversation and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        title: 'Test Conversation',
        context: {
          projectId: 'project-123',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data.title).toBe('Test Conversation');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations',
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

  it('should return 401 for missing authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations',
      headers: {
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        title: 'Test Conversation',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/v1/conversations/:id', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve conversation and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations/conversation-123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
  });

  it('should return 404 for non-existent conversation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations/non-existent',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/v1/conversations', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list conversations and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      query: {
        limit: '10',
        offset: '0',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('conversations');
    expect(Array.isArray(body.data.conversations)).toBe(true);
  });
});

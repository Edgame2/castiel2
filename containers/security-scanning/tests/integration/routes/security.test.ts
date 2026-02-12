/**
 * Security Scanning Routes Integration Tests
 * GET /api/v1/security/scans/:scanId, POST /api/v1/security/scans
 * POST /api/v1/security/pii/detect, POST /api/v1/security/pii/redact
 * GET /api/v1/security/pii/detections/:detectionId
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/SecurityScanningEventPublisher');

describe('Security Scanning routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'tenant-123',
  };

  describe('POST /api/v1/security/scans', () => {
    it('returns 202 with scanId when scan triggered', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/security/scans',
        headers: authHeaders,
        payload: {
          targetId: 'target-1',
          targetType: 'shard',
          scanType: 'pii',
        },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body).toHaveProperty('scanId');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/security/scans/:scanId', () => {
    it('returns 404 when scan not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/security/scans/non-existent-scan',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/security/pii/detect', () => {
    it('returns 200 with detection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/security/pii/detect',
        headers: authHeaders,
        payload: {
          contentId: 'content-1',
          content: 'John Doe lives at 123 Main St',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('detectionId');
      expect(body).toHaveProperty('contentId');
      expect(body).toHaveProperty('detectedPII');
      expect(Array.isArray(body.detectedPII)).toBe(true);
    });
  });

  describe('POST /api/v1/security/pii/redact', () => {
    it('returns 200 with redactedContent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/security/pii/redact',
        headers: authHeaders,
        payload: {
          contentId: 'content-1',
          content: 'Contact: john@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('redactedContent');
    });
  });

  describe('GET /api/v1/security/pii/detections/:detectionId', () => {
    it('returns 404 when detection not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/security/pii/detections/non-existent-detection',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });
});

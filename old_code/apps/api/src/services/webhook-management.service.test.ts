import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookManagementService } from './webhook-management.service.js';
import { IIntegrationConnectionService } from '../interfaces/integration-connection.interface.js';
import { ISyncTaskService } from '../interfaces/sync-task.interface.js';
import { IMonitoringProvider } from '../interfaces/monitoring.interface.js';
import { ICacheProvider } from '../interfaces/cache.interface.js';

describe('WebhookManagementService', () => {
  let service: WebhookManagementService;
  let mockConnectionService: any;
  let mockSyncService: any;
  let mockMonitoring: any;
  let mockCache: any;

  beforeEach(() => {
    // Mock services
    mockConnectionService = {
      registerWebhookWithProvider: vi.fn(),
      unregisterWebhookWithProvider: vi.fn(),
    };

    mockSyncService = {
      enqueueSyncTask: vi.fn(),
    };

    mockMonitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    };

    service = new WebhookManagementService(
      mockConnectionService,
      mockSyncService,
      mockMonitoring,
      mockCache,
      'https://api.example.com/webhooks'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWebhook', () => {
    it('should register a webhook successfully', async () => {
      const tenantId = 'tenant-123';
      const integrationId = 'salesforce';
      const connectionId = 'conn-456';
      const events = ['contact.created', 'contact.updated'];

      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        tenantId,
        integrationId,
        connectionId,
        events
      );

      expect(registration).toBeDefined();
      expect(registration.tenantId).toBe(tenantId);
      expect(registration.integrationId).toBe(integrationId);
      expect(registration.connectionId).toBe(connectionId);
      expect(registration.events).toEqual(events);
      expect(registration.status).toBe('active');
      expect(registration.isVerified).toBe(true);

      expect(mockConnectionService.registerWebhookWithProvider).toHaveBeenCalledWith(
        connectionId,
        expect.stringContaining('https://api.example.com/webhooks/')
      );

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'webhook_registered',
        expect.any(Object)
      );
    });

    it('should handle webhook registration failures', async () => {
      mockConnectionService.registerWebhookWithProvider.mockRejectedValue(
        new Error('Provider error')
      );

      const promise = service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      await expect(promise).rejects.toThrow('Provider error');

      expect(mockMonitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should support custom retry policy', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const retryPolicy = { maxRetries: 5, backoffSeconds: 120 };

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created'],
        { retryPolicy }
      );

      expect(registration.retryPolicy).toEqual(retryPolicy);
    });
  });

  describe('unregisterWebhook', () => {
    it('should unregister a webhook successfully', async () => {
      // First register
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Then unregister
      mockConnectionService.unregisterWebhookWithProvider.mockResolvedValue(void 0);

      await service.unregisterWebhook(registration.id, 'tenant-123');

      expect(mockConnectionService.unregisterWebhookWithProvider).toHaveBeenCalledWith(
        registration.connectionId,
        registration.providerWebhookId
      );

      expect(mockCache.delete).toHaveBeenCalled();

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'webhook_unregistered',
        expect.any(Object)
      );
    });

    it('should prevent unregistering webhooks from other tenants', async () => {
      // Register webhook for tenant-123
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Try to unregister as tenant-456
      const promise = service.unregisterWebhook(registration.id, 'tenant-456');

      await expect(promise).rejects.toThrow();
    });
  });

  describe('processWebhookEvent', () => {
    it('should process valid webhook event with HMAC signature', async () => {
      // Register webhook first
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Create webhook body and signature
      const bodyStr = JSON.stringify({
        action: 'created',
        sobject: {
          name: 'Contact',
          fields: { Id: 'contact-123', FirstName: 'John' },
        },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', registration.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      // Process event
      const result = await service.processWebhookEvent(registration.id, {
        'x-salesforce-event-signature': signature,
      } as any, bodyStr);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('created');
      expect(result.entityId).toBe('contact-123');

      expect(mockSyncService.enqueueSyncTask).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'webhook_event_processed',
        expect.any(Object)
      );
    });

    it('should reject webhook with invalid signature', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      const bodyStr = JSON.stringify({ action: 'created' });

      const result = await service.processWebhookEvent(registration.id, {
        'x-salesforce-event-signature': 'invalid-signature',
      } as any, bodyStr);

      expect(result.success).toBe(false);
      expect(result.error).toContain('signature');

      expect(mockSyncService.enqueueSyncTask).not.toHaveBeenCalled();
    });

    it('should handle Notion webhook signature verification', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'notion',
        'conn-456',
        ['page.created']
      );

      const timestamp = Date.now().toString();
      const bodyStr = JSON.stringify({ type: 'page.created' });

      const crypto = require('crypto');
      const signed = `${timestamp}.${bodyStr}`;
      const signature = crypto
        .createHmac('sha256', registration.webhookSecret)
        .update(signed)
        .digest('hex');

      const result = await service.processWebhookEvent(registration.id, {
        'x-notion-signature': signature,
        'x-notion-request-timestamp': timestamp,
      } as any, bodyStr);

      expect(result.success).toBe(true);
    });

    it('should handle GitHub webhook signature verification', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'github',
        'conn-456',
        ['push']
      );

      const bodyStr = JSON.stringify({ action: 'opened' });

      const crypto = require('crypto');
      const signature = 'sha256=' + crypto
        .createHmac('sha256', registration.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      const result = await service.processWebhookEvent(registration.id, {
        'x-hub-signature-256': signature,
      } as any, bodyStr);

      expect(result.success).toBe(true);
    });

    it('should skip processing if webhook is inactive', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      let registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Manually mark as inactive (in real scenario, would happen via API)
      registration.status = 'inactive';

      const bodyStr = JSON.stringify({ action: 'created' });

      const result = await service.processWebhookEvent(registration.id, {} as any, bodyStr);

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });
  });

  describe('parseProviderEvent', () => {
    it('should parse Salesforce event correctly', async () => {
      const event = service['parseProviderEvent']('salesforce', {
        action: 'created',
        sobject: {
          name: 'Contact',
          fields: { Id: 'contact-123', FirstName: 'John' },
        },
      } as any);

      expect(event.eventType).toBe('created');
      expect(event.entityType).toBe('Contact');
      expect(event.entityId).toBe('contact-123');
      expect(event.data).toHaveProperty('FirstName', 'John');
    });

    it('should parse Notion event correctly', async () => {
      const event = service['parseProviderEvent']('notion', {
        type: 'page.created',
        object: 'page',
        id: 'page-456',
        properties: { Title: { title: [{ text: { content: 'New Page' } }] } },
      } as any);

      expect(event.eventType).toBe('created');
      expect(event.entityType).toBe('page');
      expect(event.entityId).toBe('page-456');
    });

    it('should parse Slack event correctly', async () => {
      const event = service['parseProviderEvent']('slack', {
        type: 'event_callback',
        event: {
          type: 'message',
          channel: 'C123456',
          user: 'U123456',
          text: 'Hello',
          ts: '1234567890.000001',
        },
      } as any);

      expect(event.eventType).toBe('message');
      expect(event.entityType).toBe('message');
      expect(event.entityId).toBe('1234567890.000001');
    });

    it('should parse GitHub event correctly', async () => {
      const event = service['parseProviderEvent']('github', {
        action: 'opened',
        issue: {
          number: 123,
          id: 1234567,
          title: 'Bug report',
        },
      } as any);

      expect(event.eventType).toBe('opened');
      expect(event.entityType).toBe('issue');
      expect(event.entityId).toBe('1234567');
    });

    it('should parse Google event correctly', async () => {
      const event = service['parseProviderEvent']('google', {
        message: {
          data: Buffer.from(
            JSON.stringify({
              resourceName: 'people/c123456789',
              personFields: 'names,emailAddresses',
            })
          ).toString('base64'),
        },
      } as any);

      expect(event.entityType).toBe('people');
      expect(event.entityId).toContain('c123456789');
    });
  });

  describe('checkWebhookHealth', () => {
    it('should return healthy status for active webhook', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      const health = await service.checkWebhookHealth(registration.id);

      expect(health.status).toBe('healthy');
      expect(health.registrationId).toBe(registration.id);
      expect(health.lastEventAt).toBeDefined();
      expect(health.failureRate).toBe(0);
    });

    it('should track webhook failures', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Simulate failures
      await service['recordWebhookFailure'](registration.id, new Error('Test error'));
      await service['recordWebhookFailure'](registration.id, new Error('Test error'));

      const health = await service.checkWebhookHealth(registration.id);

      expect(health.failureCount).toBeGreaterThan(0);
    });

    it('should mark webhook as failed after threshold', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Simulate many failures (assuming threshold is 5)
      for (let i = 0; i < 6; i++) {
        await service['recordWebhookFailure'](registration.id, new Error('Test error'));
      }

      const health = await service.checkWebhookHealth(registration.id);

      expect(health.status).toBe('failed');
      expect(health.recommendations).toContain('verify');
    });
  });

  describe('listRegistrations', () => {
    it('should list all registrations for tenant', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      // Register multiple webhooks
      const reg1 = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      const reg2 = await service.registerWebhook(
        'tenant-123',
        'notion',
        'conn-789',
        ['page.created']
      );

      const registrations = await service.listRegistrations('tenant-123');

      expect(registrations).toHaveLength(2);
      expect(registrations.some(r => r.id === reg1.id)).toBe(true);
      expect(registrations.some(r => r.id === reg2.id)).toBe(true);
    });

    it('should filter registrations by integrationId', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      await service.registerWebhook(
        'tenant-123',
        'notion',
        'conn-789',
        ['page.created']
      );

      const registrations = await service.listRegistrations('tenant-123', 'salesforce');

      expect(registrations).toHaveLength(1);
      expect(registrations[0].integrationId).toBe('salesforce');
    });

    it('should filter registrations by connectionId', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const reg = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      const registrations = await service.listRegistrations(
        'tenant-123',
        undefined,
        'conn-456'
      );

      expect(registrations).toHaveLength(1);
      expect(registrations[0].connectionId).toBe('conn-456');
    });
  });

  describe('getUnhealthyWebhooks', () => {
    it('should identify unhealthy webhooks', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      // Simulate failures
      for (let i = 0; i < 6; i++) {
        await service['recordWebhookFailure'](registration.id, new Error('Test error'));
      }

      const unhealthy = await service.getUnhealthyWebhooks('tenant-123');

      expect(unhealthy.length).toBeGreaterThan(0);
      expect(unhealthy.some(w => w.registrationId === registration.id)).toBe(true);
    });
  });

  describe('shouldTriggerSync', () => {
    it('should trigger sync for matching events', async () => {
      const shouldTrigger = service['shouldTriggerSync'](['contact.created'], 'contact', 'created');

      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger sync for unmatched events', async () => {
      const shouldTrigger = service['shouldTriggerSync'](['contact.created'], 'contact', 'deleted');

      expect(shouldTrigger).toBe(false);
    });

    it('should support wildcard event matching', async () => {
      const shouldTrigger = service['shouldTriggerSync'](['contact.*'], 'contact', 'updated');

      expect(shouldTrigger).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache webhook registrations', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      mockCache.get.mockResolvedValue(null);

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining(registration.id),
        registration,
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should retrieve cached registrations', async () => {
      const cachedRegistration = {
        id: 'webhook-123',
        tenantId: 'tenant-123',
        integrationId: 'salesforce',
        connectionId: 'conn-456',
        webhookUrl: 'https://api.example.com/webhooks/webhook-123',
        webhookSecret: 'secret-123',
        events: ['contact.created'],
        status: 'active',
        isVerified: true,
        failureCount: 0,
      };

      mockCache.get.mockResolvedValue(cachedRegistration);

      const retrieved = await service.getWebhookRegistration('webhook-123');

      expect(retrieved).toEqual(cachedRegistration);
    });

    it('should clear cache on unregister', async () => {
      mockConnectionService.registerWebhookWithProvider.mockResolvedValue({
        webhookId: 'webhook-789',
      });

      const registration = await service.registerWebhook(
        'tenant-123',
        'salesforce',
        'conn-456',
        ['contact.created']
      );

      mockConnectionService.unregisterWebhookWithProvider.mockResolvedValue(void 0);

      await service.unregisterWebhook(registration.id, 'tenant-123');

      expect(mockCache.delete).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return service-level health status', async () => {
      const health = await service.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.registrationsCount).toBe(0);
      expect(health.failedRegistrationsCount).toBe(0);
    });
  });
});

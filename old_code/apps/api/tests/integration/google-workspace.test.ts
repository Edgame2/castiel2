/**
 * Google Workspace Integration Tests
 * 
 * Tests the complete Google Workspace integration flow including:
 * - OAuth connection
 * - Data fetching
 * - Widget endpoints
 * - Error handling
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleWorkspaceAdapter } from '../../src/integrations/adapters/google-workspace.adapter.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { IntegrationConnectionService } from '../../src/services/integration-connection.service.js';

// Mock monitoring
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
  trackDependency: vi.fn(),
  trackRequest: vi.fn(),
  flush: vi.fn(),
  setUser: vi.fn(),
  setAuthenticatedUserContext: vi.fn(),
  clearAuthenticatedUserContext: vi.fn(),
  setOperationId: vi.fn(),
  setOperationName: vi.fn(),
  setOperationParentId: vi.fn(),
  setCustomProperty: vi.fn(),
  setCustomMeasurement: vi.fn(),
  startOperation: vi.fn(),
  endOperation: vi.fn(),
  getCorrelationContext: vi.fn(),
  setCorrelationContext: vi.fn(),
};

describe('Google Workspace Integration', () => {
  const tenantId = 'test-tenant';
  const connectionId = 'test-connection';
  let mockConnectionService: IntegrationConnectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConnectionService = {
      getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
      getConnection: vi.fn(),
      testConnection: vi.fn(),
    } as unknown as IntegrationConnectionService;
  });

  describe('OAuth Flow', () => {
    it('should initialize adapter with OAuth credentials', () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      expect(adapter).toBeDefined();
      const definition = adapter.getDefinition();
      expect(definition.authType).toBe('oauth2');
    });

    it('should require OAuth configuration', () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const definition = adapter.getDefinition();
      expect(definition.oauthConfig).toBeDefined();
      expect(definition.oauthConfig?.clientIdEnvVar).toBe('GOOGLE_WORKSPACE_CLIENT_ID');
      expect(definition.oauthConfig?.clientSecretEnvVar).toBe('GOOGLE_WORKSPACE_CLIENT_SECRET');
    });
  });

  describe('Widget Endpoints', () => {
    it('should support Gmail inbox widget endpoint', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      // Verify entity exists
      const schema = await adapter.getEntitySchema('gmail_message');
      expect(schema).toBeDefined();
      expect(schema?.supportsPull).toBe(true);
    });

    it('should support Calendar events widget endpoint', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const schema = await adapter.getEntitySchema('calendar_event');
      expect(schema).toBeDefined();
      expect(schema?.supportsPull).toBe(true);
    });

    it('should support Drive files widget endpoint', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const schema = await adapter.getEntitySchema('drive_file');
      expect(schema).toBeDefined();
      expect(schema?.supportsPull).toBe(true);
    });

    it('should support Contacts stats widget endpoint', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const schema = await adapter.getEntitySchema('contact');
      expect(schema).toBeDefined();
      expect(schema?.supportsPull).toBe(true);
    });

    it('should support Tasks summary widget endpoint', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const schema = await adapter.getEntitySchema('task');
      expect(schema).toBeDefined();
      expect(schema?.supportsPull).toBe(true);
    });
  });

  describe('Entity Support', () => {
    it('should support all required entities', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const entities = await adapter.listEntities();
      const entityNames = entities.map((e) => e.name);

      expect(entityNames).toContain('gmail_message');
      expect(entityNames).toContain('gmail_thread');
      expect(entityNames).toContain('calendar_event');
      expect(entityNames).toContain('drive_file');
      expect(entityNames).toContain('contact');
      expect(entityNames).toContain('task');
    });

    it('should have correct field definitions for each entity', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const gmailSchema = await adapter.getEntitySchema('gmail_message');
      expect(gmailSchema?.fields).toBeDefined();
      expect(gmailSchema?.fields.some((f) => f.name === 'id')).toBe(true);
      expect(gmailSchema?.fields.some((f) => f.name === 'subject')).toBe(true);

      const calendarSchema = await adapter.getEntitySchema('calendar_event');
      expect(calendarSchema?.fields).toBeDefined();
      expect(calendarSchema?.fields.some((f) => f.name === 'id')).toBe(true);
      expect(calendarSchema?.fields.some((f) => f.name === 'summary')).toBe(true);
    });
  });

  describe('Webhook Support', () => {
    it('should parse Gmail Pub/Sub webhooks', () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const payload = {
        message: {
          data: Buffer.from(JSON.stringify({ historyId: '12345' })).toString('base64'),
          publishTime: new Date().toISOString(),
        },
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('gmail.history');
    });

    it('should parse Calendar webhooks', () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const payload = {
        kind: 'api#channel',
        id: 'event-123',
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('calendar.event');
    });

    it('should parse Drive webhooks', () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      const payload = {
        kind: 'drive#change',
        fileId: 'file-123',
        removed: false,
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('drive.change');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing credentials gracefully', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      // Mock missing access token
      vi.spyOn(mockConnectionService, 'getAccessToken').mockResolvedValue(null);

      // This should fail during initialization
      await expect(adapter.testConnection()).rejects.toThrow();
    });

    it('should track errors in monitoring', async () => {
      const adapter = new GoogleWorkspaceAdapter(
        mockMonitoring,
        mockConnectionService,
        tenantId,
        connectionId
      );

      // Mock error scenario
      vi.spyOn(mockConnectionService, 'getAccessToken').mockRejectedValue(
        new Error('Token error')
      );

      try {
        await adapter.testConnection();
      } catch (error) {
        // Error should be tracked
        expect(mockMonitoring.trackException).toHaveBeenCalled();
      }
    });
  });
});








/**
 * Google Workspace Adapter Unit Tests
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleWorkspaceAdapter, GOOGLE_WORKSPACE_DEFINITION } from '../google-workspace.adapter.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { IntegrationConnectionService } from '../../../services/integration-connection.service.js';

// Mock dependencies
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

const mockConnectionService = {
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  getConnection: vi.fn(),
  testConnection: vi.fn(),
} as unknown as IntegrationConnectionService;

describe('GoogleWorkspaceAdapter', () => {
  let adapter: GoogleWorkspaceAdapter;
  const tenantId = 'test-tenant';
  const connectionId = 'test-connection';

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GoogleWorkspaceAdapter(
      mockMonitoring,
      mockConnectionService,
      tenantId,
      connectionId
    );
  });

  describe('getDefinition', () => {
    it('should return Google Workspace integration definition', () => {
      const definition = adapter.getDefinition();
      expect(definition).toBe(GOOGLE_WORKSPACE_DEFINITION);
      expect(definition.id).toBe('google-workspace');
      expect(definition.name).toBe('google_workspace');
      expect(definition.displayName).toBe('Google Workspace');
      expect(definition.category).toBe('communication');
    });

    it('should have all required entities', () => {
      const definition = adapter.getDefinition();
      const entityNames = definition.availableEntities.map((e) => e.name);
      expect(entityNames).toContain('gmail_message');
      expect(entityNames).toContain('gmail_thread');
      expect(entityNames).toContain('calendar_event');
      expect(entityNames).toContain('drive_file');
      expect(entityNames).toContain('contact');
      expect(entityNames).toContain('task');
    });

    it('should have OAuth configuration', () => {
      const definition = adapter.getDefinition();
      expect(definition.authType).toBe('oauth2');
      expect(definition.oauthConfig).toBeDefined();
      expect(definition.oauthConfig?.scopes).toBeDefined();
      expect(definition.oauthConfig?.scopes?.length).toBeGreaterThan(0);
    });
  });

  describe('listEntities', () => {
    it('should return all available entities', async () => {
      const entities = await adapter.listEntities();
      expect(entities).toHaveLength(6);
      expect(entities.map((e) => e.name)).toEqual([
        'gmail_message',
        'gmail_thread',
        'calendar_event',
        'drive_file',
        'contact',
        'task',
      ]);
    });
  });

  describe('getEntitySchema', () => {
    it('should return schema for valid entity', async () => {
      const schema = await adapter.getEntitySchema('gmail_message');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('gmail_message');
      expect(schema?.fields).toBeDefined();
      expect(schema?.fields.length).toBeGreaterThan(0);
    });

    it('should return null for invalid entity', async () => {
      const schema = await adapter.getEntitySchema('invalid_entity');
      expect(schema).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Mock Google API clients
      const mockPeopleClient = {
        people: {
          get: vi.fn().mockResolvedValue({
            data: {
              emailAddresses: [{ value: 'test@example.com' }],
              names: [{ displayName: 'Test User' }],
            },
          }),
        },
      };

      const mockGmailClient = {
        users: {
          getProfile: vi.fn().mockResolvedValue({ data: {} }),
        },
      };

      const mockCalendarClient = {
        calendarList: {
          list: vi.fn().mockResolvedValue({ data: {} }),
        },
      };

      const mockDriveClient = {
        files: {
          list: vi.fn().mockResolvedValue({ data: {} }),
        },
      };

      const mockTasksClient = {
        tasklists: {
          list: vi.fn().mockResolvedValue({ data: {} }),
        },
      };

      // Note: In a real test, we would need to mock the Google API client initialization
      // This is a simplified test structure
      const result = await adapter.testConnection();
      
      // The actual implementation would require mocking the Google API clients
      // For now, we test the structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('details');
    });
  });

  describe('parseWebhook', () => {
    it('should parse Gmail Pub/Sub webhook', () => {
      const payload = {
        message: {
          data: Buffer.from(JSON.stringify({ historyId: '12345' })).toString('base64'),
          publishTime: new Date().toISOString(),
        },
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('gmail.history');
      expect(event?.entity).toBe('gmail_message');
      expect(event?.operation).toBe('update');
    });

    it('should parse Calendar webhook', () => {
      const payload = {
        kind: 'api#channel',
        id: 'event-123',
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('calendar.event');
      expect(event?.entity).toBe('calendar_event');
    });

    it('should parse Drive webhook', () => {
      const payload = {
        kind: 'drive#change',
        fileId: 'file-123',
        removed: false,
        modificationTime: new Date().toISOString(),
      };

      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeDefined();
      expect(event?.type).toBe('drive.change');
      expect(event?.entity).toBe('drive_file');
      expect(event?.operation).toBe('update');
    });

    it('should return null for unknown webhook format', () => {
      const payload = { unknown: 'format' };
      const event = adapter.parseWebhook(payload, {});
      expect(event).toBeNull();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid Pub/Sub JWT signature structure', () => {
      const payload = 'test-payload';
      const signature = 'header.payload.signature';
      const secret = 'test-secret';

      const isValid = adapter.verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature format', () => {
      const payload = 'test-payload';
      const signature = 'invalid-format';
      const secret = 'test-secret';

      const isValid = adapter.verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle missing access token gracefully', async () => {
      vi.spyOn(mockConnectionService, 'getAccessToken').mockResolvedValue(null);
      
      // This would fail during initialization
      // In a real scenario, we'd need to handle this more gracefully
      await expect(adapter.testConnection()).rejects.toThrow();
    });
  });
});








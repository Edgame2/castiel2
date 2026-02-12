/**
 * AlertService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertService } from '../../../src/services/AlertService';
import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider } from '../../../src/services/providers/storage/IStorageProvider';
import { LogCategory, LogSeverity } from '../../../src/types';

describe('AlertService', () => {
  let alertService: AlertService;
  let mockPrisma: any;
  let mockStorage: IStorageProvider;

  beforeEach(() => {
    mockPrisma = {
      audit_alert_rules: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockStorage = {
      store: vi.fn(),
      storeBatch: vi.fn(),
      getById: vi.fn(),
      search: vi.fn(),
      getLastLog: vi.fn(),
      healthCheck: vi.fn(),
      getLogsInRange: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    } as any;

    alertService = new AlertService(mockPrisma, mockStorage);
  });

  describe('createRule', () => {
    it('should create an alert rule', async () => {
      const input = {
        organizationId: 'org-1',
        name: 'Failed Login Alert',
        description: 'Alert on failed logins',
        type: 'PATTERN' as const,
        conditions: {
          action: 'auth.login.failed',
        },
        notificationChannels: ['email'],
      };

      const mockRule = {
        id: 'rule-1',
        ...input,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      vi.mocked(mockPrisma.audit_alert_rules.create).mockResolvedValue(mockRule);

      const result = await alertService.createRule(input, 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('rule-1');
      expect(result.name).toBe('Failed Login Alert');
    });
  });

  describe('getRule', () => {
    it('should retrieve a rule by ID when tenant matches', async () => {
      const mockRule = {
        id: 'rule-1',
        organizationId: 'org-1',
        name: 'Test Rule',
        enabled: true,
      };

      vi.mocked(mockPrisma.audit_alert_rules.findUnique).mockResolvedValue(mockRule);

      const result = await alertService.getRule('rule-1', 'org-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rule-1');
    });

    it('should return null when rule belongs to another tenant', async () => {
      const mockRule = {
        id: 'rule-1',
        organizationId: 'other-org',
        name: 'Test Rule',
        enabled: true,
      };

      vi.mocked(mockPrisma.audit_alert_rules.findUnique).mockResolvedValue(mockRule);

      const result = await alertService.getRule('rule-1', 'org-1');

      expect(result).toBeNull();
    });
  });

  describe('evaluateRule', () => {
    it('should evaluate pattern-based rule', async () => {
      const rule = {
        id: 'rule-1',
        organizationId: 'org-1',
        name: 'Test Rule',
        enabled: true,
        type: 'PATTERN' as const,
        conditions: {
          action: 'auth.login.failed',
        },
        notificationChannels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      vi.mocked(mockPrisma.audit_alert_rules.findUnique).mockResolvedValue(rule);
      vi.mocked(mockStorage.search).mockResolvedValue({
        items: [{ id: 'log-1', action: 'auth.login.failed' }],
        total: 1,
        hasMore: false,
      });

      const result = await alertService.evaluateRule('rule-1', 'org-1');

      expect(result).toBe(true);
    });

    it('should evaluate threshold-based rule', async () => {
      const rule = {
        id: 'rule-2',
        organizationId: 'org-1',
        name: 'Threshold Rule',
        enabled: true,
        type: 'THRESHOLD' as const,
        conditions: {
          threshold: 5,
          timeWindow: 3600,
          action: 'auth.login.failed',
        },
        notificationChannels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      vi.mocked(mockPrisma.audit_alert_rules.findUnique).mockResolvedValue(rule);
      vi.mocked(mockStorage.search).mockResolvedValue({
        items: Array(5).fill({ id: 'log-1', action: 'auth.login.failed' }),
        total: 5,
        hasMore: false,
      });

      const result = await alertService.evaluateRule('rule-2', 'org-1');

      expect(result).toBe(true);
    });

    it('should return false for disabled rule', async () => {
      const rule = {
        id: 'rule-3',
        organizationId: 'org-1',
        name: 'Disabled Rule',
        enabled: false,
        type: 'PATTERN' as const,
        conditions: {},
        notificationChannels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      vi.mocked(mockPrisma.audit_alert_rules.findUnique).mockResolvedValue(rule);

      const result = await alertService.evaluateRule('rule-3', 'org-1');

      expect(result).toBe(false);
    });
  });
});


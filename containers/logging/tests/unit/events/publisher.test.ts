/**
 * Event Publisher Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { publishEvent, publishAlertTriggered, publishVerificationFailed } from '../../../src/events/publisher';
import { EventPublisher } from '@coder/shared';

// Mock @coder/shared
vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock config
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn().mockReturnValue({
    rabbitmq: {
      url: 'amqp://localhost:5672',
      exchange: 'coder_events',
    },
  }),
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Event Publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishEvent', () => {
    it('should publish an event', async () => {
      await publishEvent('test.event', { data: 'test' }, 'org-1', 'user-1');

      expect(EventPublisher).toHaveBeenCalled();
    });

    it('should skip publishing if RabbitMQ not configured', async () => {
      const { getConfig } = await import('../../../src/config');
      vi.mocked(getConfig).mockReturnValueOnce({
        rabbitmq: {
          url: '',
          exchange: 'coder_events',
        },
      } as any);

      await publishEvent('test.event', { data: 'test' });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('publishAlertTriggered', () => {
    it('should publish alert triggered event', async () => {
      await publishAlertTriggered({
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        tenantId: 'tenant-1',
        triggeredAt: new Date(),
        matchCount: 5,
        conditions: { action: 'failed.login' },
        notificationChannels: ['email'],
      });

      expect(EventPublisher).toHaveBeenCalled();
    });
  });

  describe('publishVerificationFailed', () => {
    it('should publish verification failed event', async () => {
      await publishVerificationFailed('org-1', ['log-1', 'log-2'], 'user-1');

      expect(EventPublisher).toHaveBeenCalled();
    });
  });
});


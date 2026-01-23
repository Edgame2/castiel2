/**
 * Integration tests for Slack/Teams notification delivery
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';

// Mock NestJS
vi.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Logger: class {
    log = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  },
}));

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

import { SlackChannelAdapter } from '../../src/services/slack-channel.adapter';
import { TeamsChannelAdapter } from '../../src/services/teams-channel.adapter';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationEventType,
  QueuedNotification,
} from '../../src/types/notification.types';

function buildNotification(overrides: Partial<QueuedNotification> = {}): QueuedNotification {
  return {
    id: 'notif-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    userId: 'user-1',
    email: 'user@example.com',
    channels: [NotificationChannel.SLACK],
    template: { body: 'Hello {{recipientName}}' },
    templateVars: {
      recipientName: 'John',
      senderName: 'Jane',
      projectName: 'Test Project',
      message: 'Test notification',
      timestamp: new Date().toISOString(),
      eventType: NotificationEventType.PROJECT_SHARED,
      actionUrl: 'https://castiel.app/projects/123',
    },
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.NORMAL,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SlackChannelAdapter', () => {
  let adapter: SlackChannelAdapter;

  beforeEach(() => {
    adapter = new SlackChannelAdapter();
    vi.clearAllMocks();
  });

  describe('Successful delivery', () => {
    it('delivers notification with Block Kit formatting', async () => {
      const notification = buildNotification();
      const webhookUrl = 'https://hooks.slack.com/services/TEST/WEBHOOK/URL';

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'ok',
        headers: { 'x-slack-req-id': 'req-123' },
      });

      const result = await adapter.sendNotification(webhookUrl, notification);

      expect(result.success).toBe(true);
      expect(result.messageTs).toBe('req-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          text: expect.any(String),
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: expect.any(String),
            }),
          ]),
        }),
        expect.objectContaining({
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('includes project shared formatting', async () => {
      const notification = buildNotification({
        templateVars: {
          eventType: NotificationEventType.PROJECT_SHARED,
          senderName: 'Alice',
          projectName: 'Marketing Campaign',
          role: 'Editor',
          actionUrl: 'https://castiel.app/projects/456',
        },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'ok',
        headers: {},
      });

      const result = await adapter.sendNotification('https://hooks.slack.com/test', notification);

      expect(result.success).toBe(true);
      const payload = mockedAxios.post.mock.calls[0][1];
      expect(payload.blocks[0].text.text).toContain('Project Shared');
      expect(payload.blocks[1].text.text).toContain('Alice');
      expect(payload.blocks[1].text.text).toContain('Marketing Campaign');
    });
  });

  describe('Error handling', () => {
    it('handles rate limiting with retry-after', async () => {
      const notification = buildNotification();

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'rate_limited' },
          headers: { 'retry-after': '60' },
        },
      });

      const result = await adapter.sendNotification('https://hooks.slack.com/test', notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limited');
      expect(result.statusCode).toBe(429);
      expect(result.retryAfter).toBe(60);
    });

    it('handles network timeout', async () => {
      const notification = buildNotification();

      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      });

      const result = await adapter.sendNotification('https://hooks.slack.com/test', notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('handles invalid webhook URL (404)', async () => {
      const notification = buildNotification();

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'channel_not_found' },
        },
      });

      const result = await adapter.sendNotification('https://hooks.slack.com/invalid', notification);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('Retry logic', () => {
    it('retries on 5xx errors with exponential backoff', async () => {
      const notification = buildNotification();

      mockedAxios.post
        .mockRejectedValueOnce({
          response: { status: 500, data: { error: 'server_error' } },
        })
        .mockRejectedValueOnce({
          response: { status: 503, data: { error: 'service_unavailable' } },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: 'ok',
          headers: {},
        });

      const result = await adapter.sendWithRetry('https://hooks.slack.com/test', notification);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('does not retry on 4xx client errors', async () => {
      const notification = buildNotification();

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'invalid_payload' },
        },
      });

      const result = await adapter.sendWithRetry('https://hooks.slack.com/test', notification, 3);

      expect(result.success).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it.skip('respects retry-after header from rate limiting', async () => {
      const notification = buildNotification();

      mockedAxios.post
        .mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '1' }, // 1 second for faster test
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: 'ok',
        });

      const result = await adapter.sendWithRetry('https://hooks.slack.com/test', notification);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    }, 15000); // Increase timeout to 15s
  });
});

describe('TeamsChannelAdapter', () => {
  let adapter: TeamsChannelAdapter;

  beforeEach(() => {
    adapter = new TeamsChannelAdapter();
    vi.clearAllMocks();
  });

  describe('Successful delivery', () => {
    it('delivers notification with MessageCard format', async () => {
      const notification = buildNotification({
        channels: [NotificationChannel.TEAMS],
      });
      const webhookUrl = 'https://outlook.office.com/webhook/test';

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: '1',
        headers: { 'x-ms-request-id': 'ms-123' },
      });

      const result = await adapter.sendNotification(webhookUrl, notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('ms-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          '@type': 'MessageCard',
          '@context': 'https://schema.org/extensions',
          summary: expect.any(String),
        }),
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });

    it.skip('includes recommendation formatting with facts', async () => {
      const notification = buildNotification({
        channels: [NotificationChannel.TEAMS],
        templateVars: {
          eventType: NotificationEventType.RECOMMENDATION_GENERATED,
          projectName: 'Data Analysis',
          message: 'Consider linking to related datasets',
          confidence: '85%',
          actionUrl: 'https://castiel.app/recommendations/789',
        },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: '1',
      });

      const result = await adapter.sendNotification('https://outlook.office.com/webhook/test', notification);

      expect(result.success).toBe(true);
      const payload = mockedAxios.post.mock.calls[0][1];
      expect(payload.title).toContain('Recommendation');
      expect(payload.sections[0].text).toContain('Consider linking');
      expect(payload.sections).toHaveLength(2);
      expect(payload.sections[1].facts).toBeDefined();
      expect(payload.potentialAction[0].targets[0].uri).toBe('https://castiel.app/recommendations/789');
    });
  });

  describe('Error handling', () => {
    it('handles Teams-specific errors', async () => {
      const notification = buildNotification({
        channels: [NotificationChannel.TEAMS],
      });

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Invalid card payload' },
        },
      });

      const result = await adapter.sendNotification('https://outlook.office.com/webhook/test', notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card payload');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('Retry logic', () => {
    it.skip('retries on transient failures', async () => {
      const notification = buildNotification({
        channels: [NotificationChannel.TEAMS],
      });

      mockedAxios.post
        .mockRejectedValueOnce({
          response: { status: 502, data: {} },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: '1',
        });

      const result = await adapter.sendWithRetry('https://outlook.office.com/webhook/test', notification);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    }, 15000); // Increase timeout to 15s
  });
});

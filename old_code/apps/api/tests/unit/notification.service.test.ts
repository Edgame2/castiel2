/**
 * Unit tests for NotificationService Slack/Teams delivery
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@nestjs/common', () => {
  const Logger = class {
    log = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  };

  return {
    Injectable: () => () => undefined,
    Inject: () => () => undefined,
    Logger,
    BadRequestException: class extends Error {},
  };
});

vi.mock('../../src/services/cosmos-db.service', () => ({
  CosmosDBService: class {
    upsertDocument = vi.fn();
    queryDocuments = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock('../../src/services/cache.service', () => ({
  CacheService: class {
    get = vi.fn().mockResolvedValue(null);
    set = vi.fn().mockResolvedValue(undefined);
    delete = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../src/services/project-activity.service', () => ({
  ProjectActivityService: class {
    logActivity = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../src/services/performance-monitoring.service', () => ({
  PerformanceMonitoringService: class {
    trackMetric = vi.fn();
  },
}));

import { NotificationService } from '../../src/services/notification.service';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  QueuedNotification,
} from '../../src/types/notification.types';

function createService() {
  const cosmosDB = {
    upsertDocument: vi.fn(),
    queryDocuments: vi.fn().mockResolvedValue([]),
  };
  const cache = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const activityService = {
    logActivity: vi.fn().mockResolvedValue(undefined),
  };
  const performanceMonitoring = {
    trackMetric: vi.fn(),
  };

  const service = new NotificationService(
    cosmosDB as any,
    cache as any,
    activityService as any,
    performanceMonitoring as any,
  );

  return { service, cosmosDB, cache, activityService, performanceMonitoring };
}

function buildQueuedNotification(
  overrides: Partial<QueuedNotification> & { metadata?: Record<string, any> } = {},
): QueuedNotification & { metadata?: Record<string, any> } {
  return {
    id: 'queued-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    userId: 'user-1',
    channels: [NotificationChannel.SLACK],
    template: { body: 'Hello from Castiel' },
    templateVars: {},
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.NORMAL,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('NotificationService Slack/Teams channels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('delivers Slack notifications when webhook is provided', async () => {
    const { service } = createService();
    const notification = buildQueuedNotification({
      channels: [NotificationChannel.SLACK],
      metadata: { slackWebhookUrl: 'https://hooks.slack.com/services/test' },
    });

    await (service as any).sendViaChannel(notification, NotificationChannel.SLACK);

    expect(notification.deliveredAt).toBeInstanceOf(Date);
  });

  it('throws when Slack webhook is missing', async () => {
    const { service } = createService();
    const notification = buildQueuedNotification({ channels: [NotificationChannel.SLACK], metadata: {} });

    await expect(
      (service as any).sendViaChannel(notification, NotificationChannel.SLACK),
    ).rejects.toThrow(/Slack webhook URL is not configured/);
  });

  it('delivers Teams notifications when webhook is provided', async () => {
    const { service } = createService();
    const notification = buildQueuedNotification({
      channels: [NotificationChannel.TEAMS],
      metadata: { teamsWebhookUrl: 'https://outlook.office.com/webhook/test' },
    });

    await (service as any).sendViaChannel(notification, NotificationChannel.TEAMS);

    expect(notification.deliveredAt).toBeInstanceOf(Date);
  });
});

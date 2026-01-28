/**
 * System Settings Service
 * Manages system-wide settings (rate limits, capacity, feature flags)
 */

import { SystemSettingsRepository } from '../repositories/SystemSettingsRepository';
import {
  SystemSettings,
  UpdateSystemSettingsInput,
  RateLimitSettings,
  ProcessingCapacitySettings,
  QueueConfiguration,
  FeatureFlags,
} from '../types/system-settings.types';
import { log } from '../utils/logger';

export class SystemSettingsService {
  private repository: SystemSettingsRepository;

  constructor() {
    this.repository = new SystemSettingsRepository();
  }

  /**
   * Get all system settings
   */
  async getSettings(): Promise<SystemSettings> {
    const settings = await this.repository.getSettings();

    if (!settings) {
      // Return default settings if none exist
      return this.getDefaultSettings();
    }

    return settings;
  }

  /**
   * Update system settings
   */
  async updateSettings(updates: UpdateSystemSettingsInput, updatedBy: string): Promise<SystemSettings> {
    return this.repository.updateSettings(updates, updatedBy);
  }

  /**
   * Get rate limit settings
   */
  async getRateLimits(): Promise<RateLimitSettings> {
    const settings = await this.getSettings();
    return settings.rateLimits;
  }

  /**
   * Update rate limit settings
   */
  async updateRateLimits(rateLimits: RateLimitSettings, updatedBy: string): Promise<RateLimitSettings> {
    const settings = await this.repository.updateSettings(
      { rateLimits },
      updatedBy
    );
    return settings.rateLimits;
  }

  /**
   * Get processing capacity settings
   */
  async getCapacity(): Promise<ProcessingCapacitySettings> {
    const settings = await this.getSettings();
    return settings.capacity;
  }

  /**
   * Update processing capacity settings
   */
  async updateCapacity(
    capacity: ProcessingCapacitySettings,
    updatedBy: string
  ): Promise<ProcessingCapacitySettings> {
    const settings = await this.repository.updateSettings(
      { capacity },
      updatedBy
    );
    return settings.capacity;
  }

  /**
   * Get queue configuration
   */
  async getQueueConfig(): Promise<QueueConfiguration> {
    const settings = await this.getSettings();
    return settings.queueConfig;
  }

  /**
   * Update queue configuration
   */
  async updateQueueConfig(
    queueConfig: QueueConfiguration,
    updatedBy: string
  ): Promise<QueueConfiguration> {
    const settings = await this.repository.updateSettings(
      { queueConfig },
      updatedBy
    );
    return settings.queueConfig;
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const settings = await this.getSettings();
    return settings.featureFlags;
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(featureFlags: FeatureFlags, updatedBy: string): Promise<FeatureFlags> {
    const settings = await this.repository.updateSettings(
      { featureFlags },
      updatedBy
    );
    return settings.featureFlags;
  }

  /**
   * Toggle a single feature flag
   */
  async toggleFeatureFlag(flagName: string, enabled: boolean, updatedBy: string): Promise<FeatureFlags> {
    const currentFlags = await this.getFeatureFlags();
    const updatedFlags = {
      ...currentFlags,
      [flagName]: enabled,
    };
    return this.updateFeatureFlags(updatedFlags, updatedBy);
  }

  /**
   * Get default system settings
   */
  private getDefaultSettings(): SystemSettings {
    return {
      id: 'system',
      rateLimits: {
        global: {
          requestsPerSecond: 100,
          requestsPerMinute: 5000,
          requestsPerHour: 100000,
        },
        defaultByIntegrationType: {
          salesforce: { requestsPerMinute: 100, requestsPerHour: 5000 },
          hubspot: { requestsPerMinute: 100, requestsPerHour: 5000 },
          google_drive: { requestsPerMinute: 50, requestsPerHour: 2000 },
        },
        bypassTenants: [],
      },
      capacity: {
        lightProcessors: {
          minInstances: 1,
          maxInstances: 10,
          autoScaleThreshold: 70,
          prefetch: 20,
          concurrentProcessing: 10,
          memoryLimitMB: 2048,
        },
        heavyProcessors: {
          minInstances: 1,
          maxInstances: 5,
          autoScaleThreshold: 70,
          prefetch: 5,
          concurrentProcessing: 3,
          memoryLimitMB: 8192,
        },
      },
      queueConfig: {
        ttl: {
          integrationDataRaw: 86400000, // 24 hours
          integrationDocuments: 172800000, // 48 hours
          integrationCommunications: 86400000, // 24 hours
          integrationMeetings: 259200000, // 72 hours
          integrationEvents: 86400000, // 24 hours
          shardMlAggregation: 86400000, // 24 hours
        },
        dlq: {
          maxRetries: 3,
          alertThreshold: 100,
        },
        priority: {
          enabled: true,
          highPriorityQueues: ['integration_events', 'shard_ml_aggregation'],
        },
        depthAlerts: {
          enabled: true,
          warningThreshold: 1000,
          criticalThreshold: 5000,
        },
        autoScaling: {
          enabled: true,
          scaleUpThreshold: 500,
          scaleDownThreshold: 100,
        },
      },
      featureFlags: {
        documentProcessing: true,
        emailProcessing: true,
        meetingTranscription: true,
        entityLinking: true,
        mlFieldAggregation: true,
        suggestedLinks: true,
        bidirectionalSync: true,
        webhooks: true,
      },
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }
}

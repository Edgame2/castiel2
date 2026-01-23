/**
 * Proactive Insights Delivery Preferences Repository
 * 
 * Manages storage and retrieval of user delivery preferences for proactive insights.
 * Uses Cosmos DB with partition key [tenantId, userId].
 */

import { Container } from '@azure/cosmos';
import {
  DeliveryPreferences,
  ProactiveInsightPriority,
  ProactiveInsightType,
} from '../types/proactive-insights.types.js';

/**
 * Repository for proactive insights delivery preferences
 */
export class ProactiveInsightsDeliveryPreferencesRepository {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Get delivery preferences for a user
   */
  async getPreferences(
    tenantId: string,
    userId: string
  ): Promise<DeliveryPreferences | null> {
    // Use tenantId as partition key (matches proactive-insights container)
    const partitionKey = tenantId;
    const itemId = `preferences:${tenantId}:${userId}`;

    try {
      const { resource } = await this.container
        .item(itemId, partitionKey)
        .read<DeliveryPreferences & { _type?: string }>();

      if (!resource || resource._type !== 'delivery_preferences') {
        return null;
      }

      // Convert date strings to Date objects
      return {
        ...resource,
        createdAt: new Date(resource.createdAt),
        updatedAt: new Date(resource.updatedAt),
      };
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update delivery preferences
   */
  async upsertPreferences(
    tenantId: string,
    userId: string,
    preferences: Partial<DeliveryPreferences>
  ): Promise<DeliveryPreferences> {
    // Use tenantId as partition key (matches proactive-insights container)
    const partitionKey = tenantId;
    const itemId = `preferences:${tenantId}:${userId}`;
    const now = new Date();

    // Get existing preferences or create defaults
    const existing = await this.getPreferences(tenantId, userId);

    let updatedPreferences: DeliveryPreferences & { _type: string; id: string };

    if (existing) {
      // Merge with existing preferences
      updatedPreferences = {
        ...existing,
        ...preferences,
        userId,
        tenantId,
        updatedAt: now,
        _type: 'delivery_preferences',
        id: itemId,
      };
    } else {
      // Create new preferences with defaults
      const defaultPreferences = this.getDefaultPreferences(tenantId, userId);
      updatedPreferences = {
        ...defaultPreferences,
        ...preferences,
        userId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        _type: 'delivery_preferences',
        id: itemId,
      };
    }

    // Ensure all required fields are present
    if (!updatedPreferences.channels) {
      updatedPreferences.channels = this.getDefaultPreferences(tenantId, userId).channels;
    }

    const { resource } = await this.container
      .item(itemId, partitionKey)
      .replace(updatedPreferences);

    if (!resource) {
      throw new Error('Failed to save delivery preferences');
    }

    return {
      ...resource,
      createdAt: new Date(resource.createdAt),
      updatedAt: new Date(resource.updatedAt),
    } as DeliveryPreferences;
  }

  /**
   * Delete delivery preferences (revert to defaults)
   */
  async deletePreferences(tenantId: string, userId: string): Promise<void> {
    // Use tenantId as partition key (matches proactive-insights container)
    const partitionKey = tenantId;
    const itemId = `preferences:${tenantId}:${userId}`;

    try {
      await this.container.item(itemId, partitionKey).delete();
    } catch (error: any) {
      if (error.code !== 404) {
        throw error;
      }
    }
  }

  /**
   * Get default delivery preferences
   */
  private getDefaultPreferences(
    tenantId: string,
    userId: string
  ): DeliveryPreferences {
    return {
      userId,
      tenantId,
      channels: {
        in_app: {
          enabled: true,
          pushThreshold: 'medium',
        },
        dashboard: {
          enabled: true,
          maxItems: 10,
          groupByType: false,
        },
        email: {
          enabled: true,
          immediateThreshold: 'high',
          digestFrequency: 'daily',
          digestTime: '09:00',
        },
        webhook: {
          enabled: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}


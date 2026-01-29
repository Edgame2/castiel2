/**
 * System Settings Repository
 * Manages system settings storage in Cosmos DB
 */

import { getContainer } from '@coder/shared';
import {
  SystemSettings,
  UpdateSystemSettingsInput,
  FeatureFlags,
  AzureServiceSettings,
} from '../types/system-settings.types';
import { log } from '../utils/logger';

export class SystemSettingsRepository {
  private containerName = 'system_settings';

  /**
   * Get system settings (singleton)
   */
  async getSettings(): Promise<SystemSettings | null> {
    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item('system', 'system').read<SystemSettings>();

      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      log.error('Failed to get system settings', error, { service: 'integration-manager' });
      throw error;
    }
  }

  /**
   * Create or update system settings
   */
  async upsertSettings(
    settings: SystemSettings,
    updatedBy: string
  ): Promise<SystemSettings> {
    try {
      const container = getContainer(this.containerName);
      const existing = await this.getSettings();

      const updated: SystemSettings = {
        ...settings,
        id: 'system',
        updatedAt: new Date(),
        updatedBy,
      };

      if (existing) {
        // Update existing
        const { resource } = await container.item('system', 'system').replace(updated);
        if (!resource) {
          throw new Error('Failed to update system settings');
        }
        return resource;
      } else {
        // Create new
        const { resource } = await container.items.create(updated, {
          partitionKey: 'system',
        } as Parameters<typeof container.items.create>[1]);
        if (!resource) {
          throw new Error('Failed to create system settings');
        }
        return resource;
      }
    } catch (error: any) {
      log.error('Failed to upsert system settings', error, { service: 'integration-manager' });
      throw error;
    }
  }

  /**
   * Update system settings (partial update)
   */
  async updateSettings(
    updates: UpdateSystemSettingsInput,
    updatedBy: string
  ): Promise<SystemSettings> {
    const existing = await this.getSettings();

    if (!existing) {
      throw new Error('System settings not found. Initialize settings first.');
    }

    const updated: SystemSettings = {
      ...existing,
      rateLimits: updates.rateLimits ? { ...existing.rateLimits, ...updates.rateLimits } : existing.rateLimits,
      capacity: updates.capacity ? { ...existing.capacity, ...updates.capacity } : existing.capacity,
      queueConfig: updates.queueConfig ? { ...existing.queueConfig, ...updates.queueConfig } : existing.queueConfig,
      featureFlags: (updates.featureFlags
        ? { ...existing.featureFlags, ...updates.featureFlags }
        : existing.featureFlags) as FeatureFlags,
      azureServices: (updates.azureServices
        ? { ...existing.azureServices, ...updates.azureServices }
        : existing.azureServices) as AzureServiceSettings | undefined,
      updatedAt: new Date(),
      updatedBy,
    };

    return this.upsertSettings(updated, updatedBy);
  }
}

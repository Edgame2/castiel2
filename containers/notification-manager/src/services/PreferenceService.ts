/**
 * Preference Service
 * 
 * CRUD operations for notification preferences
 */

import { getDatabaseClient } from '@coder/shared';
import { NotFoundError } from '@coder/shared';
import { NotificationPreferences, PreferenceScope } from '../types/notification';

export interface CreatePreferenceInput {
  scope: PreferenceScope;
  scopeId?: string;
  organizationId: string;
  channels?: any;
  categories?: any;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface UpdatePreferenceInput {
  channels?: any;
  categories?: any;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export class PreferenceService {
  private get db() { return getDatabaseClient() as any; }

  /**
   * Get effective preferences for a scope
   */
  async getEffectivePreferences(
    scope: PreferenceScope,
    scopeId: string,
    organizationId: string
  ): Promise<NotificationPreferences> {
    const preference = await this.db.notification_preferences.findUnique({
      where: {
        scope_scopeId_organizationId: {
          scope,
          scopeId: scope === 'GLOBAL' ? null : scopeId,
          organizationId,
        },
      },
    });

    if (!preference) {
      // Return defaults
      return {
        channels: {},
        categories: {},
      };
    }

    return {
      channels: (preference.channels as any) || {},
      categories: (preference.categories as any) || {},
      quietHoursStart: preference.quietHoursStart || undefined,
      quietHoursEnd: preference.quietHoursEnd || undefined,
      timezone: preference.timezone || undefined,
    };
  }

  /**
   * Get preference by ID
   */
  async getPreference(id: string): Promise<any> {
    const preference = await this.db.notification_preferences.findUnique({
      where: { id },
    });

    if (!preference) {
      throw new NotFoundError('Preference', id);
    }

    return preference;
  }

  /**
   * Create or update preference
   */
  async upsertPreference(input: CreatePreferenceInput): Promise<any> {
    return await this.db.notification_preferences.upsert({
      where: {
        scope_scopeId_organizationId: {
          scope: input.scope,
          scopeId: input.scopeId || null,
          organizationId: input.organizationId,
        },
      },
      create: {
        scope: input.scope,
        scopeId: input.scopeId || null,
        organizationId: input.organizationId,
        channels: input.channels || {},
        categories: input.categories || {},
        quietHoursStart: input.quietHoursStart || null,
        quietHoursEnd: input.quietHoursEnd || null,
        timezone: input.timezone || null,
      },
      update: {
        channels: input.channels,
        categories: input.categories,
        quietHoursStart: input.quietHoursStart || null,
        quietHoursEnd: input.quietHoursEnd || null,
        timezone: input.timezone || null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update preference
   */
  async updatePreference(
    id: string,
    input: UpdatePreferenceInput
  ): Promise<any> {
    const preference = await this.getPreference(id);

    return await this.db.notification_preferences.update({
      where: { id },
      data: {
        channels: input.channels !== undefined ? input.channels : preference.channels,
        categories: input.categories !== undefined ? input.categories : preference.categories,
        quietHoursStart: input.quietHoursStart !== undefined ? input.quietHoursStart : preference.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd !== undefined ? input.quietHoursEnd : preference.quietHoursEnd,
        timezone: input.timezone !== undefined ? input.timezone : preference.timezone,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete preference (reset to defaults)
   */
  async deletePreference(id: string): Promise<void> {
    await this.getPreference(id); // Throws if not found
    
    await this.db.notification_preferences.delete({
      where: { id },
    });
  }

  /**
   * List preferences for an organization
   */
  async listPreferences(
    organizationId: string,
    scope?: PreferenceScope
  ): Promise<any[]> {
    const where: any = { organizationId };
    if (scope) {
      where.scope = scope;
    }

    return await this.db.notification_preferences.findMany({
      where,
      orderBy: [
        { scope: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }
}


/**
 * Preference Resolver
 * 
 * Resolves hierarchical notification preferences
 * Hierarchy: Global (config) → Tenant → Team → Project → User
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationPreferences, PreferenceScope, ResolvedPreferences } from '../types/notification';
import { getConfig } from '../config';

export class PreferenceResolver {
  private get db() {
    return getDatabaseClient() as any;
  }
  private config = getConfig();

  /**
   * Resolve effective preferences for a user
   */
  async resolvePreferences(
    userId: string,
    tenantId: string,
    teamId?: string,
    projectId?: string
  ): Promise<ResolvedPreferences> {
    const globalDefaults = this.getGlobalDefaults();
    const tenantPrefs = await this.getPreferences('TENANT', tenantId, tenantId);
    const teamPrefs = teamId ? await this.getPreferences('TEAM', teamId, tenantId) : null;
    const projectPrefs = projectId ? await this.getPreferences('PROJECT', projectId, tenantId) : null;
    const userPrefs = await this.getPreferences('USER', userId, tenantId);
    const resolved = this.mergePreferences(
      globalDefaults,
      tenantPrefs,
      teamPrefs,
      projectPrefs,
      userPrefs
    );
    return {
      ...resolved,
      scope: userPrefs ? 'USER' : projectPrefs ? 'PROJECT' : teamPrefs ? 'TEAM' : 'TENANT',
      scopeId: userPrefs ? userId : projectPrefs ? projectId : teamPrefs ? teamId : tenantId,
    };
  }

  /**
   * Get preferences for a specific scope
   */
  private async getPreferences(
    scope: PreferenceScope,
    scopeId: string,
    tenantId: string
  ): Promise<NotificationPreferences | null> {
    const pref = await this.db.notification_preferences.findUnique({
      where: {
        scope_scopeId_tenantId: {
          scope,
          scopeId: scope === 'GLOBAL' ? null : scopeId,
          tenantId,
        },
      },
    });

    if (!pref) {
      return null;
    }

    return {
      channels: (pref.channels as any) || {},
      categories: (pref.categories as any) || {},
      quietHoursStart: pref.quietHoursStart || undefined,
      quietHoursEnd: pref.quietHoursEnd || undefined,
      timezone: pref.timezone || undefined,
    };
  }

  /**
   * Get global defaults from config
   */
  private getGlobalDefaults(): NotificationPreferences {
    // Default: all channels enabled, all categories enabled
    return {
      channels: {
        IN_APP: { enabled: true, priority: 1 },
        EMAIL: { enabled: true, priority: 2 },
        PUSH: { enabled: true, priority: 3 },
        SMS: { enabled: false, priority: 4 },
        WHATSAPP: { enabled: false, priority: 5 },
        VOICE: { enabled: false, priority: 6 },
      },
      categories: {},
    };
  }

  /**
   * Merge preferences (later preferences override earlier ones)
   */
  private mergePreferences(
    ...prefs: (NotificationPreferences | null)[]
  ): NotificationPreferences {
    const merged: NotificationPreferences = {
      channels: {},
      categories: {},
    };

    for (const pref of prefs) {
      if (!pref) continue;

      // Merge channels
      if (pref.channels) {
        merged.channels = {
          ...merged.channels,
          ...pref.channels,
        };
      }

      // Merge categories
      if (pref.categories) {
        merged.categories = {
          ...merged.categories,
          ...pref.categories,
        };
      }

      // Override quiet hours (last non-null wins)
      if (pref.quietHoursStart) {
        merged.quietHoursStart = pref.quietHoursStart;
      }
      if (pref.quietHoursEnd) {
        merged.quietHoursEnd = pref.quietHoursEnd;
      }
      if (pref.timezone) {
        merged.timezone = pref.timezone;
      }
    }

    return merged;
  }

  /**
   * Check if a channel is enabled for a category
   */
  isChannelEnabledForCategory(
    preferences: ResolvedPreferences,
    channel: string,
    category: string
  ): boolean {
    // Check category-specific preferences first
    const categoryPref = preferences.categories[category as keyof typeof preferences.categories];
    if (categoryPref) {
      if (categoryPref.enabled === false) {
        return false;
      }
      if (categoryPref.channels && !categoryPref.channels.includes(channel as any)) {
        return false;
      }
    }

    // Check channel preferences
    const channelPref = preferences.channels[channel as keyof typeof preferences.channels];
    if (channelPref) {
      return channelPref.enabled !== false;
    }

    // Default: enabled
    return true;
  }
}


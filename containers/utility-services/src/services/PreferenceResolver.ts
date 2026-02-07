/**
 * Preference Resolver
 * 
 * Resolves hierarchical notification preferences
 * Hierarchy: Global (config) → Organization → Team → Project → User
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationPreferences, PreferenceScope, ResolvedPreferences } from '../types/notification';
import { getConfig } from '../config/index.js';

export class PreferenceResolver {
  private db = getDatabaseClient() as any;
  private config = getConfig();

  /**
   * Resolve effective preferences for a user
   * Returns merged preferences from all hierarchy levels
   */
  async resolvePreferences(
    userId: string,
    organizationId: string,
    teamId?: string,
    projectId?: string
  ): Promise<ResolvedPreferences> {
    // Start with global defaults from config
    const globalDefaults = this.getGlobalDefaults();
    
    // Merge organization preferences
    const orgPrefs = await this.getPreferences('ORGANIZATION', organizationId, organizationId);
    
    // Merge team preferences if teamId provided
    const teamPrefs = teamId 
      ? await this.getPreferences('TEAM', teamId, organizationId)
      : null;
    
    // Merge project preferences if projectId provided
    const projectPrefs = projectId
      ? await this.getPreferences('PROJECT', projectId, organizationId)
      : null;
    
    // Merge user preferences (highest priority)
    const userPrefs = await this.getPreferences('USER', userId, organizationId);
    
    // Merge in priority order (later overrides earlier)
    const resolved = this.mergePreferences(
      globalDefaults,
      orgPrefs,
      teamPrefs,
      projectPrefs,
      userPrefs
    );

    return {
      ...resolved,
      scope: userPrefs ? 'USER' : projectPrefs ? 'PROJECT' : teamPrefs ? 'TEAM' : 'ORGANIZATION',
      scopeId: userPrefs ? userId : projectPrefs ? projectId : teamPrefs ? teamId : organizationId,
    };
  }

  /**
   * Get preferences for a specific scope
   */
  private async getPreferences(
    scope: PreferenceScope,
    scopeId: string,
    organizationId: string
  ): Promise<NotificationPreferences | null> {
    const pref = await this.db.notification_preferences.findUnique({
      where: {
        scope_scopeId_organizationId: {
          scope,
          scopeId: scope === 'GLOBAL' ? null : scopeId,
          organizationId: scope === 'GLOBAL' ? organizationId : organizationId,
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


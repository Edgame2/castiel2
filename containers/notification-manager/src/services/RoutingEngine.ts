/**
 * Routing Engine
 * 
 * Determines which channels to use for a notification based on:
 * - User preferences
 * - Presence status
 * - Criticality
 * - Quiet hours
 * - Channel availability
 */

import { 
  NotificationChannel, 
  NotificationCriticality, 
  ResolvedPreferences, 
  RoutingDecision 
} from '../types/notification';
import { PreferenceResolver } from './PreferenceResolver';
import { PresenceTracker } from './PresenceTracker';
import { QuietHoursService } from './QuietHoursService';
import { getConfig } from '../config';

export interface RoutingContext {
  userId: string;
  organizationId: string;
  teamId?: string;
  projectId?: string;
  criticality: NotificationCriticality;
  eventCategory: string;
  channelsRequested: NotificationChannel[];
}

export class RoutingEngine {
  private preferenceResolver: PreferenceResolver;
  private presenceTracker?: PresenceTracker;
  private quietHoursService?: QuietHoursService;
  private config = getConfig();

  constructor(
    preferenceResolver: PreferenceResolver,
    presenceTracker?: PresenceTracker,
    quietHoursService?: QuietHoursService
  ) {
    this.preferenceResolver = preferenceResolver;
    this.presenceTracker = presenceTracker;
    this.quietHoursService = quietHoursService;
  }

  /**
   * Determine which channels to use for a notification
   */
  async routeNotification(context: RoutingContext): Promise<RoutingDecision> {
    // Resolve user preferences
    const preferences = await this.preferenceResolver.resolvePreferences(
      context.userId,
      context.organizationId,
      context.teamId,
      context.projectId
    );

    // Start with requested channels
    let candidateChannels = [...context.channelsRequested];

    // Filter by preferences
    candidateChannels = candidateChannels.filter(channel => {
      return this.preferenceResolver.isChannelEnabledForCategory(
        preferences,
        channel,
        context.eventCategory
      );
    });

    // Check quiet hours (unless critical)
    if (context.criticality !== 'CRITICAL' && this.quietHoursService) {
      const inQuietHours = await this.quietHoursService.isInQuietHours(
        context.userId,
        preferences
      );
      
      if (inQuietHours) {
        // Only allow high-priority channels during quiet hours
        candidateChannels = candidateChannels.filter(channel => 
          ['IN_APP', 'PUSH'].includes(channel)
        );
      }
    }

    // Presence-aware routing (if enabled)
    if (this.config.notification.features?.presence_aware && this.presenceTracker) {
      const isOnline = await this.presenceTracker.isUserOnline(context.userId);
      
      if (isOnline) {
        // Prefer in-app for online users
        if (candidateChannels.includes('IN_APP')) {
          candidateChannels = ['IN_APP', ...candidateChannels.filter(c => c !== 'IN_APP')];
        }
      } else {
        // For offline users, prefer email/push
        candidateChannels = candidateChannels.filter(c => 
          ['EMAIL', 'PUSH', 'SMS'].includes(c)
        );
      }
    }

    // Criticality-based channel selection
    if (context.criticality === 'CRITICAL') {
      // Critical notifications: try all available channels
      if (!candidateChannels.includes('EMAIL')) candidateChannels.push('EMAIL');
      if (!candidateChannels.includes('SMS')) candidateChannels.push('SMS');
      if (!candidateChannels.includes('VOICE')) candidateChannels.push('VOICE');
    } else if (context.criticality === 'HIGH') {
      // High priority: ensure email is included
      if (!candidateChannels.includes('EMAIL')) {
        candidateChannels.push('EMAIL');
      }
    }

    // Remove duplicates and maintain order
    const finalChannels = Array.from(new Set(candidateChannels));

    // Build reason
    const reasons: string[] = [];
    if (preferences.scope !== 'GLOBAL') {
      reasons.push(`preferences from ${preferences.scope.toLowerCase()}`);
    }
    if (this.presenceTracker) {
      const isOnline = await this.presenceTracker.isUserOnline(context.userId);
      reasons.push(`user is ${isOnline ? 'online' : 'offline'}`);
    }
    if (context.criticality === 'CRITICAL') {
      reasons.push('critical notification - using all channels');
    }

    return {
      channels: finalChannels,
      reason: reasons.length > 0 
        ? `Routing based on: ${reasons.join(', ')}`
        : 'Using default routing',
      overrides: {
        quietHours: this.quietHoursService 
          ? await this.quietHoursService.isInQuietHours(context.userId, preferences)
          : false,
        presenceAware: this.config.notification.features?.presence_aware || false,
      },
    };
  }

  /**
   * Get fallback channels if primary channels fail
   */
  getFallbackChannels(primaryChannels: NotificationChannel[]): NotificationChannel[] {
    const fallbackOrder: NotificationChannel[] = ['EMAIL', 'SMS', 'VOICE'];
    
    // Return channels not in primary list, in priority order
    return fallbackOrder.filter(channel => !primaryChannels.includes(channel));
  }
}


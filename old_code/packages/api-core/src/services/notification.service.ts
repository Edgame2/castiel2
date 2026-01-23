/**
 * Notification Service
 * Business logic for notification management
 */

import { NotificationRepository } from '../repositories/notification.repository.js';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository.js';
import { NotificationDigestRepository } from '../repositories/notification-digest.repository.js';
import { UserService } from './auth/user.service.js';
import { TenantService } from './auth/tenant.service.js';
import {
  Notification,
  CreateSystemNotificationInput,
  CreateAdminNotificationInput,
  NotificationListOptions,
  NotificationListResult,
  NotificationStatus,
  NotificationStats,
  NotificationCreatorType,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  DeliveryTrackingOptions,
  DeliveryTrackingResult,
  DeliveryChannel,
  DeliveryRecord,
  DigestSchedule,
} from '../types/notification.types.js';
import type { AuthUser } from '../types/auth.types.js';
import { EmailNotificationService } from './notifications/email-notification.service.js';
import { WebhookNotificationService } from './notifications/webhook-notification.service.js';
import { SlackNotificationService } from './notifications/slack-notification.service.js';
import { TeamsNotificationService } from './notifications/teams-notification.service.js';
import { PushNotificationService } from './notifications/push-notification.service.js';
import { DeliveryTrackingService } from './notifications/delivery-tracking.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Notification Service
 */
export class NotificationService {
  private repository: NotificationRepository;
  private preferenceRepository?: NotificationPreferenceRepository;
  private digestRepository?: NotificationDigestRepository;
  private deliveryTrackingService?: DeliveryTrackingService;
  private userService: UserService;
  private tenantService: TenantService;
  private emailNotificationService?: EmailNotificationService;
  private webhookNotificationService?: WebhookNotificationService;
  private slackNotificationService?: SlackNotificationService;
  private teamsNotificationService?: TeamsNotificationService;
  private pushNotificationService?: PushNotificationService;
  private monitoring?: IMonitoringProvider;

  constructor(
    repository: NotificationRepository,
    userService: UserService,
    tenantService: TenantService,
    emailNotificationService?: EmailNotificationService,
    preferenceRepository?: NotificationPreferenceRepository,
    deliveryTrackingService?: DeliveryTrackingService,
    webhookNotificationService?: WebhookNotificationService,
    slackNotificationService?: SlackNotificationService,
    teamsNotificationService?: TeamsNotificationService,
    digestRepository?: NotificationDigestRepository,
    pushNotificationService?: PushNotificationService,
    monitoring?: IMonitoringProvider
  ) {
    this.repository = repository;
    this.userService = userService;
    this.tenantService = tenantService;
    this.emailNotificationService = emailNotificationService;
    this.preferenceRepository = preferenceRepository;
    this.deliveryTrackingService = deliveryTrackingService;
    this.webhookNotificationService = webhookNotificationService;
    this.slackNotificationService = slackNotificationService;
    this.teamsNotificationService = teamsNotificationService;
    this.digestRepository = digestRepository;
    this.pushNotificationService = pushNotificationService;
    this.monitoring = monitoring;
  }

  /**
   * Create a system notification (for use by other services)
   */
  async createSystemNotification(input: CreateSystemNotificationInput): Promise<Notification> {
    const notification: Omit<Notification, 'id' | 'notificationId' | 'createdAt' | 'expiresAt'> = {
      tenantId: input.tenantId,
      userId: input.userId,
      name: input.name,
      content: input.content,
      link: input.link,
      status: 'unread',
      type: input.type,
      priority: input.priority,
      createdBy: {
        type: 'system',
      },
      metadata: input.metadata,
    };

    const createdNotification = await this.repository.create(notification);

    // Send email notification if service is available and user preferences allow it
    if (this.emailNotificationService) {
      try {
        const user = await this.userService.findById(input.userId, input.tenantId);
        if (user?.email && await this.shouldSendEmail(createdNotification, input.tenantId, input.userId)) {
          // Check if digest mode is enabled
          const shouldUseDigest = await this.shouldUseDigest('email', input.tenantId, input.userId);
          if (shouldUseDigest) {
            // Queue notification for digest
            await this.queueNotificationForDigest(createdNotification, 'email', input.tenantId, input.userId);
          } else {
            // Send immediately
            const userName = user.firstName
              ? user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName
              : undefined;
            await this.emailNotificationService.sendEmailNotification(
              createdNotification,
              user.email,
              userName
            );
          }
        }
      } catch (error) {
        // Don't fail notification creation if email fails
        this.monitoring?.trackException(error as Error, { operation: 'notification.send-email' });
      }
    }

    // Send webhook notification if service is available and user preferences allow it
    if (this.webhookNotificationService) {
      try {
        const webhookConfig = await this.getWebhookConfig(input.tenantId, input.userId);
        if (webhookConfig && await this.shouldSendWebhook(createdNotification, input.tenantId, input.userId)) {
          await this.webhookNotificationService.sendWebhookNotification(
            createdNotification,
            webhookConfig
          );
        }
      } catch (error) {
        // Don't fail notification creation if webhook fails
        this.monitoring?.trackException(error as Error, { operation: 'notification.send-webhook' });
      }
    }

    // Send Slack notification if service is available and user preferences allow it
    if (this.slackNotificationService) {
      try {
        const slackConfig = await this.getSlackConfig(input.tenantId, input.userId);
        if (slackConfig && await this.shouldSendSlack(createdNotification, input.tenantId, input.userId)) {
          await this.slackNotificationService.sendSlackNotification(
            createdNotification,
            slackConfig
          );
        }
      } catch (error) {
        // Don't fail notification creation if Slack fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'NotificationService',
          operation: 'createSystemNotification',
          context: 'send-slack-notification',
        });
      }
    }

    // Send Teams notification if service is available and user preferences allow it
    if (this.teamsNotificationService) {
      try {
        const teamsConfig = await this.getTeamsConfig(input.tenantId, input.userId);
        if (teamsConfig && await this.shouldSendTeams(createdNotification, input.tenantId, input.userId)) {
          await this.teamsNotificationService.sendTeamsNotification(
            createdNotification,
            teamsConfig
          );
        }
      } catch (error) {
        // Don't fail notification creation if Teams fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'NotificationService',
          operation: 'createSystemNotification',
          context: 'send-teams-notification',
        });
      }
    }

    // Send push notification if service is available and user preferences allow it
    if (this.pushNotificationService) {
      try {
        const pushConfig = await this.getPushConfig(input.tenantId, input.userId);
        if (pushConfig && await this.shouldSendPush(createdNotification, input.tenantId, input.userId)) {
          await this.pushNotificationService.sendPushNotification(
            createdNotification,
            pushConfig
          );
        }
      } catch (error) {
        // Don't fail notification creation if push fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'NotificationService',
          operation: 'createSystemNotification',
          context: 'send-push-notification',
        });
      }
    }

    return createdNotification;
  }

  /**
   * Create admin notification(s) (for super admin or tenant admin)
   */
  async createAdminNotification(
    input: CreateAdminNotificationInput,
    creator: AuthUser
  ): Promise<{ notifications: Notification[]; count: number }> {
    // Determine creator type
    const isSuperAdmin = creator.roles?.some(role =>
      ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(role)
    );
    const isTenantAdmin = creator.roles?.some(role =>
      ['admin', 'owner', 'tenant_admin'].includes(role)
    );

    if (!isSuperAdmin && !isTenantAdmin) {
      throw new Error('Insufficient permissions: Admin role required');
    }

    const creatorType: NotificationCreatorType = isSuperAdmin ? 'super_admin' : 'tenant_admin';

    // Get target user IDs based on targetType
    let targetUserIds: string[] = [];

    if (input.targetType === 'user') {
      if (!input.targetUserIds || input.targetUserIds.length === 0) {
        throw new Error('targetUserIds is required when targetType is "user"');
      }
      targetUserIds = input.targetUserIds;
    } else if (input.targetType === 'all_tenant') {
      // Get all users in the tenant
      const result = await this.userService.listUsers(creator.tenantId, {
        page: 1,
        limit: 1000, // Large limit to get all users
      });
      targetUserIds = result.users.map(u => u.id);
    } else if (input.targetType === 'all_system') {
      // Only super admin can send system-wide notifications
      if (!isSuperAdmin) {
        throw new Error('Insufficient permissions: System-wide notifications require super admin role');
      }

      // Get all tenants, then all users
      const tenants = await this.tenantService.listTenants({ page: 1, limit: 1000 });
      const allUserIds: string[] = [];

      for (const tenant of tenants.tenants) {
        try {
          const result = await this.userService.listUsers(tenant.id, {
            page: 1,
            limit: 1000,
          });
          allUserIds.push(...result.users.map(u => u.id));
        } catch (error) {
          // Skip tenants that fail (might not have access)
          this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
            component: 'NotificationService',
            operation: 'createAdminNotification',
            context: 'get-tenant-users',
            tenantId: tenant.id,
          });
        }
      }

      targetUserIds = allUserIds;
    }

    // Create notifications for all target users
    const notifications: Notification[] = [];

    for (const userId of targetUserIds) {
      // Get user to get their tenantId
      try {
        // For system-wide, we need to find user across tenants
        const user = input.targetType === 'all_system'
          ? await this.userService.findByIdAcrossTenants(userId)
          : await this.userService.findById(userId, creator.tenantId);
        
        if (!user) {continue;}

        const notification: Omit<Notification, 'id' | 'notificationId' | 'createdAt' | 'expiresAt'> = {
          tenantId: user.tenantId,
          userId: user.id,
          name: input.name,
          content: input.content,
          link: input.link,
          status: 'unread',
          type: input.type,
          priority: input.priority,
          createdBy: {
            type: creatorType,
            userId: creator.id,
            name: creator.email || 'Admin',
          },
          targetType: input.targetType,
          targetUserIds: input.targetType === 'user' ? input.targetUserIds : undefined,
          metadata: input.metadata,
        };

        const created = await this.repository.create(notification);
        notifications.push(created);

        // Send email notification if service is available and user preferences allow it
        if (this.emailNotificationService && user.email) {
          try {
            if (await this.shouldSendEmail(created, user.tenantId, user.id)) {
              const userName = user.firstName
                ? user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName
                : undefined;
              await this.emailNotificationService.sendEmailNotification(
                created,
                user.email,
                userName
              );
            }
          } catch (error) {
            // Don't fail notification creation if email fails
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
              component: 'NotificationService',
              operation: 'createAdminNotification',
              context: 'send-email-notification',
              userEmail: user.email,
            });
          }
        }

        // Send webhook notification if service is available and user preferences allow it
        if (this.webhookNotificationService) {
          try {
            const webhookConfig = await this.getWebhookConfig(user.tenantId, user.id);
            if (webhookConfig && await this.shouldSendWebhook(created, user.tenantId, user.id)) {
              await this.webhookNotificationService.sendWebhookNotification(
                created,
                webhookConfig
              );
            }
          } catch (error) {
            // Don't fail notification creation if webhook fails
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
              component: 'NotificationService',
              operation: 'createAdminNotification',
              context: 'send-webhook-notification',
              userId: user.id,
            });
          }
        }

        // Send Slack notification if service is available and user preferences allow it
        if (this.slackNotificationService) {
          try {
            const slackConfig = await this.getSlackConfig(user.tenantId, user.id);
            if (slackConfig && await this.shouldSendSlack(created, user.tenantId, user.id)) {
              await this.slackNotificationService.sendSlackNotification(
                created,
                slackConfig
              );
            }
          } catch (error) {
            // Don't fail notification creation if Slack fails
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
              component: 'NotificationService',
              operation: 'createAdminNotification',
              context: 'send-slack-notification',
              userId: user.id,
            });
          }
        }

        // Send Teams notification if service is available and user preferences allow it
        if (this.teamsNotificationService) {
          try {
            const teamsConfig = await this.getTeamsConfig(user.tenantId, user.id);
            if (teamsConfig && await this.shouldSendTeams(created, user.tenantId, user.id)) {
              await this.teamsNotificationService.sendTeamsNotification(
                created,
                teamsConfig
              );
            }
          } catch (error) {
            // Don't fail notification creation if Teams fails
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
              component: 'NotificationService',
              operation: 'createAdminNotification',
              context: 'send-teams-notification',
              userId: user.id,
            });
          }
        }
      } catch (error) {
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'NotificationService',
          operation: 'createAdminNotification',
          context: 'create-notification',
          userId,
        });
        // Continue with other users
      }
    }

    return {
      notifications,
      count: notifications.length,
    };
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    options: NotificationListOptions = {}
  ): Promise<NotificationListResult> {
    return this.repository.list(tenantId, userId, options);
  }

  /**
   * Get a specific notification
   */
  async getNotification(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<Notification | null> {
    return this.repository.findById(id, tenantId, userId);
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(
    id: string,
    tenantId: string,
    userId: string,
    status: NotificationStatus
  ): Promise<Notification | null> {
    return this.repository.updateStatus(id, tenantId, userId, status);
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    return this.repository.delete(id, tenantId, userId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    return this.repository.markAllAsRead(tenantId, userId);
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.repository.getUnreadCount(tenantId, userId);
  }

  /**
   * Get notification statistics (for admin)
   */
  async getStats(tenantId: string): Promise<NotificationStats> {
    // This is a simplified version - in production, you'd want to aggregate
    // across all users in the tenant
    // For now, we'll return basic stats

    // Get all users in tenant
    const users = await this.userService.listUsers(tenantId, {
      page: 1,
      limit: 1000,
    });

    let totalSent = 0;
    const byType: Record<string, number> = {
      success: 0,
      error: 0,
      warning: 0,
      information: 0,
      alert: 0,
    };
    let unread = 0;
    let read = 0;

    // Aggregate stats from all users (simplified - in production, use aggregation queries)
    for (const user of users.users) {
      try {
        const unreadCount = await this.repository.getUnreadCount(tenantId, user.id);
        unread += unreadCount;

        // Get a sample to estimate type distribution
        const sample = await this.repository.list(tenantId, user.id, { limit: 100 });
        totalSent += sample.pagination.total;
        read += sample.pagination.total - unreadCount;

        for (const notif of sample.notifications) {
          byType[notif.type] = (byType[notif.type] || 0) + 1;
        }
      } catch (error) {
        // Skip users that fail
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'NotificationService',
          operation: 'getStats',
          context: 'get-user-stats',
          userId: user.id,
        });
      }
    }

    return {
      totalSent,
      byType: byType as Record<Notification['type'], number>,
      byStatus: {
        unread,
        read,
      },
      avgDeliveryTime: 0, // Would need delivery tracking for this
    };
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    if (!this.preferenceRepository) {
      // Return default preferences if repository not available
      return this.getDefaultPreferences(tenantId, userId);
    }

    const preferences = await this.preferenceRepository.getPreferences(tenantId, userId);
    if (preferences) {
      return preferences;
    }

    // Return defaults if no preferences found
    return this.getDefaultPreferences(tenantId, userId);
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    tenantId: string,
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    if (!this.preferenceRepository) {
      throw new Error('Notification preferences repository not available');
    }

    return this.preferenceRepository.upsertPreferences(tenantId, userId, input);
  }

  /**
   * Check if email should be sent based on user preferences
   */
  private async shouldSendEmail(
    notification: Notification,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    // If no preference repository, default to sending (backward compatibility)
    if (!this.preferenceRepository) {
      return true;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Check global settings
      if (!preferences.globalSettings.enabled) {
        return false;
      }

      // Check quiet hours
      if (preferences.globalSettings.quietHoursEnabled) {
        // Simple timezone check - in production, use a proper timezone library
        const currentHour = new Date().getUTCHours();
        const startHour = preferences.globalSettings.quietHoursStart
          ? parseInt(preferences.globalSettings.quietHoursStart.split(':')[0])
          : 22;
        const endHour = preferences.globalSettings.quietHoursEnd
          ? parseInt(preferences.globalSettings.quietHoursEnd.split(':')[0])
          : 7;

        if (startHour > endHour) {
          // Overnight quiet hours (e.g., 22:00 - 07:00)
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          // Same-day quiet hours
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Check email channel is enabled
      if (!preferences.channels.email?.enabled) {
        return false;
      }

      // Check type-specific preferences
      const typePref = preferences.typePreferences?.[notification.type];
      if (typePref) {
        if (!typePref.enabled) {
          return false;
        }
        // Check if email is in the allowed channels for this type
        if (typePref.channels && !typePref.channels.includes('email')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If there's an error checking preferences, default to sending (fail open)
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldSendEmail',
        context: 'check-preferences',
      });
      return true;
    }
  }

  /**
   * Check if webhook should be sent based on user preferences
   */
  private async shouldSendWebhook(
    notification: Notification,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    // If no preference repository, default to not sending (webhooks require explicit config)
    if (!this.preferenceRepository) {
      return false;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Check global settings
      if (!preferences.globalSettings.enabled) {
        return false;
      }

      // Check quiet hours (same logic as email)
      if (preferences.globalSettings.quietHoursEnabled) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const startHour = preferences.globalSettings.quietHoursStart
          ? parseInt(preferences.globalSettings.quietHoursStart.split(':')[0])
          : 22;
        const endHour = preferences.globalSettings.quietHoursEnd
          ? parseInt(preferences.globalSettings.quietHoursEnd.split(':')[0])
          : 7;

        if (startHour > endHour) {
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Check webhook channel is enabled and has URL
      const webhookChannel = preferences.channels.webhook;
      if (!webhookChannel?.enabled || !webhookChannel.url) {
        return false;
      }

      // Check type-specific preferences
      const typePref = preferences.typePreferences?.[notification.type];
      if (typePref) {
        if (!typePref.enabled) {
          return false;
        }
        // Check if webhook is in the allowed channels for this type
        if (typePref.channels && !typePref.channels.includes('webhook')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If there's an error checking preferences, default to not sending (fail closed for webhooks)
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldSendWebhook',
        context: 'check-preferences',
      });
      return false;
    }
  }

  /**
   * Get webhook configuration from user preferences
   */
  private async getWebhookConfig(
    tenantId: string,
    userId: string
  ): Promise<{ url: string; secret?: string; headers?: Record<string, string> } | null> {
    if (!this.preferenceRepository) {
      return null;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);
      const webhookChannel = preferences.channels.webhook;

      if (!webhookChannel?.enabled || !webhookChannel.url) {
        return null;
      }

      return {
        url: webhookChannel.url,
        secret: webhookChannel.secret,
        headers: webhookChannel.headers,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'getWebhookConfig',
      });
      return null;
    }
  }

  /**
   * Check if Slack should be sent based on user preferences
   */
  private async shouldSendSlack(
    notification: Notification,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    // If no preference repository, default to not sending (Slack requires explicit config)
    if (!this.preferenceRepository) {
      return false;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Check global settings
      if (!preferences.globalSettings.enabled) {
        return false;
      }

      // Check quiet hours (same logic as email)
      if (preferences.globalSettings.quietHoursEnabled) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const startHour = preferences.globalSettings.quietHoursStart
          ? parseInt(preferences.globalSettings.quietHoursStart.split(':')[0])
          : 22;
        const endHour = preferences.globalSettings.quietHoursEnd
          ? parseInt(preferences.globalSettings.quietHoursEnd.split(':')[0])
          : 7;

        if (startHour > endHour) {
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Check Slack channel is enabled and has webhook URL
      const slackChannel = preferences.channels.slack;
      if (!slackChannel?.enabled || !slackChannel.webhookUrl) {
        return false;
      }

      // Check type-specific preferences
      const typePref = preferences.typePreferences?.[notification.type];
      if (typePref) {
        if (!typePref.enabled) {
          return false;
        }
        // Check if slack is in the allowed channels for this type
        if (typePref.channels && !typePref.channels.includes('slack')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If there's an error checking preferences, default to not sending (fail closed for Slack)
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldSendSlack',
        context: 'check-preferences',
      });
      return false;
    }
  }

  /**
   * Get Slack configuration from user preferences
   */
  private async getSlackConfig(
    tenantId: string,
    userId: string
  ): Promise<{ webhookUrl: string; channel?: string } | null> {
    if (!this.preferenceRepository) {
      return null;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);
      const slackChannel = preferences.channels.slack;

      if (!slackChannel?.enabled || !slackChannel.webhookUrl) {
        return null;
      }

      return {
        webhookUrl: slackChannel.webhookUrl,
        channel: slackChannel.channel,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'getSlackConfig',
      });
      return null;
    }
  }

  /**
   * Check if Teams should be sent based on user preferences
   */
  private async shouldSendTeams(
    notification: Notification,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    // If no preference repository, default to not sending (Teams requires explicit config)
    if (!this.preferenceRepository) {
      return false;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Check global settings
      if (!preferences.globalSettings.enabled) {
        return false;
      }

      // Check quiet hours (same logic as email)
      if (preferences.globalSettings.quietHoursEnabled) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const startHour = preferences.globalSettings.quietHoursStart
          ? parseInt(preferences.globalSettings.quietHoursStart.split(':')[0])
          : 22;
        const endHour = preferences.globalSettings.quietHoursEnd
          ? parseInt(preferences.globalSettings.quietHoursEnd.split(':')[0])
          : 7;

        if (startHour > endHour) {
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Check Teams channel is enabled and has webhook URL
      const teamsChannel = preferences.channels.teams;
      if (!teamsChannel?.enabled || !teamsChannel.webhookUrl) {
        return false;
      }

      // Check type-specific preferences
      const typePref = preferences.typePreferences?.[notification.type];
      if (typePref) {
        if (!typePref.enabled) {
          return false;
        }
        // Check if teams is in the allowed channels for this type
        if (typePref.channels && !typePref.channels.includes('teams')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If there's an error checking preferences, default to not sending (fail closed for Teams)
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldSendTeams',
        context: 'check-preferences',
      });
      return false;
    }
  }

  /**
   * Get Teams configuration from user preferences
   */
  private async getTeamsConfig(
    tenantId: string,
    userId: string
  ): Promise<{ webhookUrl: string; channel?: string } | null> {
    if (!this.preferenceRepository) {
      return null;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);
      const teamsChannel = preferences.channels.teams;

      if (!teamsChannel?.enabled || !teamsChannel.webhookUrl) {
        return null;
      }

      return {
        webhookUrl: teamsChannel.webhookUrl,
        channel: teamsChannel.channel,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'getTeamsConfig',
      });
      return null;
    }
  }

  /**
   * Check if push should be sent based on user preferences
   */
  private async shouldSendPush(
    notification: Notification,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    // If no preference repository, default to not sending (push requires explicit config)
    if (!this.preferenceRepository) {
      return false;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Check global settings
      if (!preferences.globalSettings.enabled) {
        return false;
      }

      // Check quiet hours (same logic as email)
      if (preferences.globalSettings.quietHoursEnabled) {
        const currentHour = new Date().getUTCHours();
        const startHour = preferences.globalSettings.quietHoursStart
          ? parseInt(preferences.globalSettings.quietHoursStart.split(':')[0])
          : 22;
        const endHour = preferences.globalSettings.quietHoursEnd
          ? parseInt(preferences.globalSettings.quietHoursEnd.split(':')[0])
          : 7;

        if (startHour > endHour) {
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Check push channel is enabled and has devices
      const pushChannel = preferences.channels.push;
      if (!pushChannel?.enabled || !pushChannel.devices || pushChannel.devices.length === 0) {
        return false;
      }

      // Check type-specific preferences
      const typePref = preferences.typePreferences?.[notification.type];
      if (typePref) {
        if (!typePref.enabled) {
          return false;
        }
        // Check if push is in the allowed channels for this type
        if (typePref.channels && !typePref.channels.includes('push')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If there's an error checking preferences, default to not sending (fail closed for push)
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldSendPush',
        context: 'check-preferences',
      });
      return false;
    }
  }

  /**
   * Get push configuration from user preferences
   */
  private async getPushConfig(
    tenantId: string,
    userId: string
  ): Promise<{ devices: Array<{ endpoint: string; keys: { p256dh: string; auth: string }; platform?: string }> } | null> {
    if (!this.preferenceRepository) {
      return null;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);
      const pushChannel = preferences.channels.push;

      if (!pushChannel?.enabled || !pushChannel.devices || pushChannel.devices.length === 0) {
        return null;
      }

      // Convert device tokens to push device format
      const devices = pushChannel.devices.map(device => {
        // Device token format: { token: string, platform: string }
        // For web push, token should be a JSON string containing the subscription
        // We need to parse it or handle it appropriately
        try {
          // If token is a JSON string, parse it
          const subscription = typeof device.token === 'string' 
            ? JSON.parse(device.token) 
            : device.token;

          return {
            endpoint: subscription.endpoint || device.token,
            keys: {
              p256dh: subscription.keys?.p256dh || subscription.p256dh || '',
              auth: subscription.keys?.auth || subscription.auth || '',
            },
            platform: device.platform || 'web',
          };
        } catch {
          // If parsing fails, assume token is the endpoint and keys are missing
          // This is a fallback - in production, devices should be stored properly
          return {
            endpoint: device.token,
            keys: {
              p256dh: '',
              auth: '',
            },
            platform: device.platform || 'web',
          };
        }
      }).filter(device => device.endpoint && device.keys.p256dh && device.keys.auth); // Filter out invalid devices

      if (devices.length === 0) {
        return null;
      }

      return { devices };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'getPushConfig',
      });
      return null;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(tenantId: string, userId: string): NotificationPreferences {
    const now = new Date().toISOString();
    return {
      userId,
      tenantId,
      globalSettings: {
        enabled: true,
        quietHoursEnabled: false,
      },
      channels: {
        'in-app': {
          enabled: true,
        },
        'email': {
          enabled: true,
          digestEnabled: false,
        },
      },
      typePreferences: {
        success: { enabled: true, channels: ['in-app'] },
        error: { enabled: true, channels: ['in-app', 'email'] },
        warning: { enabled: true, channels: ['in-app', 'email'] },
        information: { enabled: true, channels: ['in-app'] },
        alert: { enabled: true, channels: ['in-app', 'email'] },
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get delivery status for a specific notification
   */
  async getNotificationDeliveryStatus(
    notificationId: string,
    tenantId: string,
    userId: string,
    channel?: DeliveryChannel
  ): Promise<DeliveryRecord[]> {
    const notification = await this.repository.findById(notificationId, tenantId, userId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!this.deliveryTrackingService) {
      return [];
    }

    return this.deliveryTrackingService.getDeliveryStatus(notification, channel);
  }

  /**
   * Get delivery tracking for user's notifications
   */
  async getDeliveryTracking(
    tenantId: string,
    userId: string,
    options: DeliveryTrackingOptions = {}
  ): Promise<DeliveryTrackingResult> {
    if (!this.deliveryTrackingService) {
      return {
        records: [],
        pagination: {
          total: 0,
          limit: options.limit || 20,
          offset: options.offset || 0,
          hasMore: false,
        },
        summary: {
          pending: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          bounced: 0,
        },
      };
    }

    // Get user's notifications
    const notificationOptions: NotificationListOptions = {
      limit: 1000, // Get all notifications for filtering
      offset: 0,
    };

    const notifications = await this.getUserNotifications(tenantId, userId, notificationOptions);
    
    // Filter and collect delivery records
    const allRecords: Array<{ notification: Notification; record: DeliveryRecord }> = [];

    for (const notification of notifications.notifications) {
      if (!notification.delivery || !notification.delivery.channels) {
        continue;
      }

      // Apply filters
      for (const record of notification.delivery.channels) {
        // Filter by channel
        if (options.channel && record.channel !== options.channel) {
          continue;
        }

        // Filter by status
        if (options.status && record.status !== options.status) {
          continue;
        }

        // Filter by date range
        if (options.startDate || options.endDate) {
          const recordDate = record.sentAt || record.deliveredAt || record.failedAt;
          if (recordDate) {
            const date = new Date(recordDate);
            if (options.startDate && date < new Date(options.startDate)) {
              continue;
            }
            if (options.endDate && date > new Date(options.endDate)) {
              continue;
            }
          }
        }

        allRecords.push({ notification, record });
      }
    }

    // Sort by date (most recent first)
    allRecords.sort((a, b) => {
      const dateA = a.record.sentAt || a.record.deliveredAt || a.record.failedAt || '';
      const dateB = b.record.sentAt || b.record.deliveredAt || b.record.failedAt || '';
      return dateB.localeCompare(dateA);
    });

    // Paginate
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const paginatedRecords = allRecords.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      pending: allRecords.filter(r => r.record.status === 'pending').length,
      sent: allRecords.filter(r => r.record.status === 'sent').length,
      delivered: allRecords.filter(r => r.record.status === 'delivered').length,
      failed: allRecords.filter(r => r.record.status === 'failed').length,
      bounced: allRecords.filter(r => r.record.status === 'bounced').length,
    };

    return {
      records: paginatedRecords.map(r => r.record),
      pagination: {
        total: allRecords.length,
        limit,
        offset,
        hasMore: offset + limit < allRecords.length,
      },
      summary,
    };
  }

  /**
   * Check if digest mode should be used for a channel
   */
  private async shouldUseDigest(
    channel: DeliveryChannel,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    if (!this.preferenceRepository || !this.digestRepository) {
      return false;
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Only email channel supports digest mode currently
      if (channel === 'email') {
        const emailChannel = preferences.channels.email;
        return emailChannel?.enabled === true && emailChannel?.digestEnabled === true;
      }

      // Other channels don't support digest mode yet
      return false;
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'shouldQueueForDigest',
        context: 'check-digest-mode',
      });
      return false;
    }
  }

  /**
   * Queue a notification for digest delivery
   */
  private async queueNotificationForDigest(
    notification: Notification,
    channel: DeliveryChannel,
    tenantId: string,
    userId: string
  ): Promise<void> {
    if (!this.digestRepository || !this.preferenceRepository) {
      throw new Error('Digest repository or preference repository not available');
    }

    try {
      const preferences = await this.getPreferences(tenantId, userId);

      // Get digest configuration
      let schedule: DigestSchedule = 'daily';
      let digestTime = '09:00'; // Default to 9 AM

      if (channel === 'email') {
        const emailChannel = preferences.channels.email;
        if (emailChannel?.digestSchedule) {
          schedule = emailChannel.digestSchedule;
        }
        if (emailChannel?.digestTime) {
          digestTime = emailChannel.digestTime;
        }
      }

      // Calculate when the digest should be sent (periodEnd)
      const periodEnd = this.calculateDigestPeriodEnd(schedule, digestTime);

      // Queue notification to digest
      await this.digestRepository.upsertDigest(
        tenantId,
        userId,
        channel,
        schedule,
        periodEnd,
        [notification.id]
      );
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'NotificationService',
        operation: 'queueForDigest',
      });
      throw error;
    }
  }

  /**
   * Calculate the digest period end time based on schedule and digest time
   */
  private calculateDigestPeriodEnd(schedule: DigestSchedule, digestTime: string): string {
    const now = new Date();
    const [hours, minutes] = digestTime.split(':').map(Number);
    
    // Create a date for today at the digest time
    const todayAtDigestTime = new Date(now);
    todayAtDigestTime.setUTCHours(hours, minutes || 0, 0, 0);

    if (schedule === 'daily') {
      // If digest time has passed today, schedule for tomorrow
      if (now >= todayAtDigestTime) {
        todayAtDigestTime.setUTCDate(todayAtDigestTime.getUTCDate() + 1);
      }
      return todayAtDigestTime.toISOString();
    } else {
      // Weekly: find next occurrence of the digest time
      // For simplicity, we'll use the next Monday at digest time
      // In production, you might want to allow users to choose the day
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7; // 0 = Sunday, 1 = Monday, etc.
      const nextMonday = new Date(todayAtDigestTime);
      nextMonday.setUTCDate(todayAtDigestTime.getUTCDate() + daysUntilMonday);
      
      // If today is Monday and digest time hasn't passed, use today
      if (now.getUTCDay() === 1 && now < todayAtDigestTime) {
        return todayAtDigestTime.toISOString();
      }
      
      return nextMonday.toISOString();
    }
  }
}

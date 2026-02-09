/**
 * Escalation Manager
 * 
 * Manages escalation chains for notifications
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationInput, NotificationChannel } from '../types/notification';
import { NotificationEngine } from './NotificationEngine';
import { getConfig } from '../config/index.js';

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: NotificationChannel[];
  recipients?: string[]; // Override recipients at this level
  message?: string; // Override message at this level
}

export interface EscalationChain {
  id: string;
  organizationId: string;
  name: string;
  levels: EscalationLevel[];
  enabled: boolean;
}

export class EscalationManager {
  private db = getDatabaseClient() as any;
  private config = getConfig();
  private notificationEngine: NotificationEngine;

  constructor(notificationEngine: NotificationEngine) {
    this.notificationEngine = notificationEngine;
  }

  /**
   * Process escalation for a notification
   */
  async processEscalation(notificationId: string): Promise<void> {
    const notification = await this.db.notification_notifications.findUnique({
      where: { id: notificationId },
      include: {
        escalationChain: true,
      },
    });

    if (!notification || !notification.escalationChainId || !notification.escalationChain) {
      return; // No escalation chain
    }

    const chain = notification.escalationChain;
    const levels = chain.levels as any as EscalationLevel[];

    if (!levels || levels.length === 0) {
      return;
    }

    const currentLevel = notification.escalationLevel || 0;
    const nextLevel = currentLevel + 1;

    if (nextLevel >= levels.length) {
      // Escalation complete
      return;
    }

    const levelConfig = levels[nextLevel];
    
    // Check if delay has passed
    const processedAt = notification.processedAt || notification.createdAt;
    const delayMs = levelConfig.delayMinutes * 60 * 1000;
    const nextEscalationTime = new Date(processedAt.getTime() + delayMs);

    if (new Date() < nextEscalationTime) {
      // Not time to escalate yet
      return;
    }

    // Escalate to next level
    await this.escalateToLevel(notification, levelConfig, nextLevel);
  }

  /**
   * Escalate notification to a specific level
   */
  private async escalateToLevel(
    notification: any,
    levelConfig: EscalationLevel,
    level: number
  ): Promise<void> {
    // Update notification escalation level
    await this.db.notification_notifications.update({
      where: { id: notification.id },
      data: {
        escalationLevel: level,
      },
    });

    // Create escalated notification
    const escalatedInput: NotificationInput = {
      organizationId: notification.organizationId,
      eventType: `${notification.eventType}.escalated`,
      eventCategory: notification.eventCategory as any,
      sourceModule: notification.sourceModule,
      sourceResourceId: notification.sourceResourceId,
      sourceResourceType: notification.sourceResourceType,
      recipientId: notification.recipientId, // Can be overridden by levelConfig
      recipientEmail: notification.recipientEmail,
      recipientPhone: notification.recipientPhone,
      title: levelConfig.message || notification.title,
      body: levelConfig.message || notification.body,
      bodyHtml: notification.bodyHtml,
      criticality: 'HIGH', // Escalations are always high priority
      channelsRequested: levelConfig.channels,
      teamId: notification.teamId,
      projectId: notification.projectId,
      escalationChainId: notification.escalationChainId,
      deduplicationKey: `${notification.id}-escalation-${level}`,
    };

    // Override recipients if specified (multi-recipient: send to all when supported)
    if (levelConfig.recipients && levelConfig.recipients.length > 0) {
      escalatedInput.recipientId = levelConfig.recipients[0];
    }

    // Process escalated notification
    await this.notificationEngine.processNotification(escalatedInput, {
      eventData: {
        originalNotificationId: notification.id,
        escalationLevel: level,
      },
    });
  }

  /**
   * Get escalation chain by ID
   */
  async getEscalationChain(id: string): Promise<EscalationChain | null> {
    const chain = await this.db.notification_escalation_chains.findUnique({
      where: { id },
    });

    if (!chain) {
      return null;
    }

    return {
      id: chain.id,
      organizationId: chain.organizationId,
      name: chain.name,
      levels: chain.levels as any as EscalationLevel[],
      enabled: chain.enabled,
    };
  }

  /**
   * Create escalation chain
   */
  async createEscalationChain(
    organizationId: string,
    name: string,
    levels: EscalationLevel[],
    description?: string
  ): Promise<EscalationChain> {
    const chain = await this.db.notification_escalation_chains.create({
      data: {
        organizationId,
        name,
        description: description || null,
        levels: levels as any,
        enabled: true,
      },
    });

    return {
      id: chain.id,
      organizationId: chain.organizationId,
      name: chain.name,
      levels: chain.levels as any as EscalationLevel[],
      enabled: chain.enabled,
    };
  }
}


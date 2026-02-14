/**
 * Escalation Manager
 * 
 * Manages escalation chains for notifications
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationInput, NotificationChannel, EventCategory } from '../types/notification';
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
  tenantId: string;
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
    notification: { id: string; tenantId?: string; organizationId?: string; [k: string]: unknown },
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

    // Create escalated notification (notification from DB has [k: string]: unknown)
    const n = notification as Record<string, unknown>;
    const escalatedInput: NotificationInput = {
      tenantId: (notification.tenantId ?? (notification as { organizationId?: string }).organizationId) ?? '',
      eventType: `${String(n.eventType ?? '')}.escalated`,
      eventCategory: (n.eventCategory as EventCategory | undefined) ?? 'SYSTEM_ADMIN',
      sourceModule: String(n.sourceModule ?? ''),
      sourceResourceId: n.sourceResourceId != null ? String(n.sourceResourceId) : undefined,
      sourceResourceType: n.sourceResourceType != null ? String(n.sourceResourceType) : undefined,
      recipientId: String(n.recipientId ?? ''),
      recipientEmail: n.recipientEmail != null ? String(n.recipientEmail) : undefined,
      recipientPhone: n.recipientPhone != null ? String(n.recipientPhone) : undefined,
      title: levelConfig.message ?? String(n.title ?? ''),
      body: levelConfig.message ?? String(n.body ?? ''),
      bodyHtml: n.bodyHtml != null ? String(n.bodyHtml) : undefined,
      criticality: 'HIGH', // Escalations are always high priority
      channelsRequested: levelConfig.channels,
      teamId: n.teamId != null ? String(n.teamId) : undefined,
      projectId: n.projectId != null ? String(n.projectId) : undefined,
      escalationChainId: n.escalationChainId != null ? String(n.escalationChainId) : undefined,
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
      tenantId: (chain as { tenantId?: string }).tenantId ?? (chain as { organizationId?: string }).organizationId,
      name: chain.name,
      levels: chain.levels as any as EscalationLevel[],
      enabled: chain.enabled,
    };
  }

  /**
   * Create escalation chain
   */
  async createEscalationChain(
    tenantId: string,
    name: string,
    levels: EscalationLevel[],
    description?: string
  ): Promise<EscalationChain> {
    const chain = await this.db.notification_escalation_chains.create({
      data: {
        tenantId,
        name,
        description: description || null,
        levels: levels as any,
        enabled: true,
      },
    });

    return {
      id: chain.id,
      tenantId: (chain as { tenantId?: string }).tenantId ?? (chain as { organizationId?: string }).organizationId,
      name: chain.name,
      levels: chain.levels as any as EscalationLevel[],
      enabled: chain.enabled,
    };
  }
}


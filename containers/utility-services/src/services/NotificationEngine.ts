/**
 * Notification Engine
 * 
 * Core orchestration engine for notification processing
 */

import { getDatabaseClient } from '@coder/shared';
import { 
  NotificationInput, 
  NotificationChannel,
  EventCategory 
} from '../types/notification';
import { RoutingEngine } from './RoutingEngine';
import { PreferenceResolver } from './PreferenceResolver';
import { TemplateEngine } from './TemplateEngine';
import { VariableResolver } from './VariableResolver';
import { DeliveryManager } from './DeliveryManager';
import { DeduplicationService } from './DeduplicationService';
import { RateLimiter } from './RateLimiter';
import { getConfig } from '../config/index.js';

export interface ProcessNotificationOptions {
  eventData: any;
  skipDeduplication?: boolean;
  skipRateLimit?: boolean;
}

export class NotificationEngine {
  private db = getDatabaseClient() as any;
  private config = getConfig();
  private routingEngine: RoutingEngine;
  private preferenceResolver: PreferenceResolver;
  private templateEngine: TemplateEngine;
  private variableResolver: VariableResolver;
  private deliveryManager: DeliveryManager;
  private deduplicationService?: DeduplicationService;
  private rateLimiter?: RateLimiter;

  constructor(
    routingEngine: RoutingEngine,
    preferenceResolver: PreferenceResolver,
    templateEngine: TemplateEngine,
    variableResolver: VariableResolver,
    deliveryManager: DeliveryManager,
    deduplicationService?: DeduplicationService,
    rateLimiter?: RateLimiter
  ) {
    this.routingEngine = routingEngine;
    this.preferenceResolver = preferenceResolver;
    this.templateEngine = templateEngine;
    this.variableResolver = variableResolver;
    this.deliveryManager = deliveryManager;
    this.deduplicationService = deduplicationService;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Process a notification from an event
   */
  async processNotification(
    input: NotificationInput,
    options: ProcessNotificationOptions = { eventData: {} }
  ): Promise<string> {
    // Check deduplication
    if (!options.skipDeduplication && this.deduplicationService && input.deduplicationKey) {
      const isDuplicate = await this.deduplicationService.isDuplicate(input.deduplicationKey);
      if (isDuplicate) {
        throw new Error('Duplicate notification detected');
      }
    }

    // Check rate limits
    if (!options.skipRateLimit && this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit(
        input.recipientId,
        input.tenantId
      );
      if (!allowed) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Resolve variables
    const variables = await this.variableResolver.resolveVariables(
      options.eventData,
      input.recipientId,
      input.tenantId
    );

    // Determine routing
    const routingDecision = await this.routingEngine.routeNotification({
      userId: input.recipientId,
      tenantId: input.tenantId,
      teamId: input.teamId,
      projectId: input.projectId,
      criticality: input.criticality,
      eventCategory: input.eventCategory,
      channelsRequested: input.channelsRequested,
    });

    // Render templates for each channel
    const renderedContent: Record<NotificationChannel, { subject?: string; body: string; bodyHtml?: string }> = {} as any;
    
    for (const channel of routingDecision.channels) {
      try {
        const rendered = await this.templateEngine.renderTemplate(
          input.eventType,
          input.eventType,
          channel,
          'en', // Locale: use user preferences when available
          variables,
          input.tenantId
        );

        renderedContent[channel] = {
          subject: rendered.subject,
          body: rendered.body,
          bodyHtml: rendered.bodyHtml,
        };
      } catch (error) {
        // Fallback to default content
        renderedContent[channel] = {
          body: input.body,
          bodyHtml: input.bodyHtml,
        };
      }
    }

    // Create notification record
    const notification = await this.db.notification_notifications.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        eventCategory: input.eventCategory,
        sourceModule: input.sourceModule,
        sourceResourceId: input.sourceResourceId,
        sourceResourceType: input.sourceResourceType,
        recipientId: input.recipientId,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        title: input.title,
        body: input.body,
        bodyHtml: input.bodyHtml,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        imageUrl: input.imageUrl,
        metadata: input.metadata || {},
        criticality: input.criticality,
        channelsRequested: input.channelsRequested,
        channelsDelivered: [],
        status: 'PENDING',
        scheduledFor: input.scheduledFor,
        expiresAt: input.expiresAt,
        teamId: input.teamId,
        projectId: input.projectId,
        escalationChainId: input.escalationChainId,
        escalationLevel: 0,
        batchId: input.deduplicationKey ? undefined : undefined, // Batch: set when batch grouping is implemented
        deduplicationKey: input.deduplicationKey,
        read: false,
        processedAt: new Date(),
      },
    });

    // Deliver notification
    await this.deliveryManager.deliverNotification(
      notification.id,
      {
        ...input,
        body: renderedContent[routingDecision.channels[0]]?.body || input.body,
        bodyHtml: renderedContent[routingDecision.channels[0]]?.bodyHtml || input.bodyHtml,
      },
      routingDecision.channels
    );

    // Mark deduplication key as used
    if (!options.skipDeduplication && this.deduplicationService && input.deduplicationKey) {
      await this.deduplicationService.markAsSent(input.deduplicationKey);
    }

    return notification.id;
  }
}


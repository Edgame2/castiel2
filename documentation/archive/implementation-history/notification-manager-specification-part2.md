# Notification Manager Module Specification - Part 2

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft

---

## Table of Contents - Part 2

8. [Delivery Engine](#8-delivery-engine)
9. [Template System](#9-template-system)
10. [Preference Resolution](#10-preference-resolution)
11. [Escalation & Fallback](#11-escalation--fallback)
12. [Quiet Hours & DND](#12-quiet-hours--dnd)

---

## 8. Delivery Engine

### 8.1 Delivery Flow

```typescript
class DeliveryManager {
  private routingEngine: RoutingEngine;
  private templateEngine: TemplateEngine;
  private preferenceResolver: PreferenceResolver;
  private presenceTracker: PresenceTracker;
  private rateLimiter: RateLimiter;
  private deduplicationService: DeduplicationService;
  private providerRegistry: ProviderRegistry;
  
  /**
   * Main delivery orchestration
   */
  async processNotification(event: NotificationEvent): Promise<ProcessingResult> {
    // 1. Deduplication check
    if (await this.deduplicationService.isDuplicate(event)) {
      return { status: 'DEDUPLICATED', notificationId: null };
    }
    
    // 2. Create notification record
    const notification = await this.createNotification(event);
    
    // 3. For each recipient
    const results = await Promise.all(
      event.recipientIds.map(recipientId => 
        this.processForRecipient(notification, recipientId, event)
      )
    );
    
    return {
      status: 'PROCESSED',
      notificationId: notification.id,
      recipientResults: results
    };
  }
  
  private async processForRecipient(
    notification: Notification,
    recipientId: string,
    event: NotificationEvent
  ): Promise<RecipientResult> {
    // 1. Resolve effective preferences
    const preferences = await this.preferenceResolver.resolve({
      userId: recipientId,
      organizationId: event.organizationId,
      teamId: event.teamId,
      projectId: event.projectId,
      eventType: event.type,
      eventCategory: event.category
    });
    
    // 2. Check if notifications enabled
    if (!preferences.isEnabled) {
      return { recipientId, status: 'DISABLED' };
    }
    
    // 3. Check quiet hours
    const quietHoursStatus = await this.checkQuietHours(recipientId, event);
    if (quietHoursStatus.isQuietHours && !quietHoursStatus.allowCritical) {
      await this.holdNotification(notification, recipientId);
      return { recipientId, status: 'HELD' };
    }
    
    // 4. Determine channels based on criticality and preferences
    const channels = await this.routingEngine.determineChannels({
      event,
      preferences,
      criticality: notification.criticality
    });
    
    // 5. Check presence for smart delivery
    const presence = await this.presenceTracker.getPresence(recipientId);
    const adjustedChannels = this.adjustChannelsForPresence(channels, presence, preferences);
    
    // 6. Render content for each channel
    const renderedContent = await this.templateEngine.render({
      eventType: event.type,
      channels: adjustedChannels,
      data: event.data,
      locale: await this.getUserLocale(recipientId)
    });
    
    // 7. Deliver to each channel
    const deliveryResults = await Promise.all(
      adjustedChannels.map(channel => 
        this.deliverToChannel(notification, recipientId, channel, renderedContent[channel])
      )
    );
    
    // 8. Handle escalation if needed
    if (notification.criticality === 'CRITICAL') {
      await this.escalationManager.scheduleEscalation(notification, recipientId);
    }
    
    return {
      recipientId,
      status: 'DELIVERED',
      channels: deliveryResults
    };
  }
  
  private async deliverToChannel(
    notification: Notification,
    recipientId: string,
    channel: NotificationChannel,
    content: RenderedContent
  ): Promise<ChannelDeliveryResult> {
    // 1. Rate limit check
    const rateLimitResult = await this.rateLimiter.check(recipientId, channel);
    if (!rateLimitResult.allowed) {
      return { channel, status: 'RATE_LIMITED' };
    }
    
    // 2. Create delivery record
    const delivery = await this.createDeliveryRecord(notification, recipientId, channel);
    
    // 3. Get provider
    const provider = await this.providerRegistry.getProvider(
      channel,
      notification.organizationId
    );
    
    // 4. Build payload
    const payload = await this.buildPayload(channel, recipientId, content, notification);
    
    // 5. Send with circuit breaker
    try {
      const result = await this.circuitBreaker.execute(
        provider.code,
        () => provider.send(payload)
      );
      
      await this.updateDeliveryStatus(delivery, 'SENT', result);
      return { channel, status: 'SENT', messageId: result.messageId };
    } catch (error) {
      await this.updateDeliveryStatus(delivery, 'FAILED', null, error);
      
      // 6. Attempt failover to backup provider
      const failoverResult = await this.attemptFailover(channel, payload, notification.organizationId);
      if (failoverResult.success) {
        return { channel, status: 'SENT_FAILOVER', messageId: failoverResult.messageId };
      }
      
      // 7. Schedule retry
      await this.scheduleRetry(delivery, error);
      return { channel, status: 'FAILED', error: error.message };
    }
  }
  
  private adjustChannelsForPresence(
    channels: NotificationChannel[],
    presence: UserPresence,
    preferences: ResolvedPreferences
  ): NotificationChannel[] {
    if (!preferences.presenceAware) {
      return channels;
    }
    
    if (presence.status === 'ONLINE') {
      // User is online - prioritize in-app
      return channels.filter(ch => {
        const pref = preferences.channelPreferences[ch];
        return !pref?.onlyWhenOffline;
      });
    }
    
    return channels;
  }
}
```

### 8.2 Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  
  // Criticality-based overrides
  criticalityOverrides: Record<NotificationCriticality, Partial<RetryConfig>>;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,      // 1 second
  maxDelayMs: 3600000,    // 1 hour
  backoffMultiplier: 2,
  
  criticalityOverrides: {
    LOW: { maxAttempts: 2, maxDelayMs: 86400000 },    // 24h max
    MEDIUM: { maxAttempts: 3, maxDelayMs: 3600000 },   // 1h max
    HIGH: { maxAttempts: 5, maxDelayMs: 1800000 },     // 30m max
    CRITICAL: { maxAttempts: 10, maxDelayMs: 300000 }  // 5m max
  }
};

class RetryService {
  private config: RetryConfig;
  
  async scheduleRetry(delivery: NotificationDelivery, error: Error): Promise<void> {
    const criticality = delivery.notification.criticality;
    const effectiveConfig = {
      ...this.config,
      ...this.config.criticalityOverrides[criticality]
    };
    
    if (delivery.attemptCount >= effectiveConfig.maxAttempts) {
      // Max retries exceeded - mark as failed
      await this.markAsFailed(delivery, error);
      return;
    }
    
    // Calculate delay with exponential backoff + jitter
    const delay = Math.min(
      effectiveConfig.baseDelayMs * Math.pow(effectiveConfig.backoffMultiplier, delivery.attemptCount),
      effectiveConfig.maxDelayMs
    );
    const jitter = delay * 0.1 * Math.random();
    const nextRetryAt = new Date(Date.now() + delay + jitter);
    
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        attemptCount: { increment: 1 },
        nextRetryAt,
        lastError: error.message,
        status: 'PENDING'
      }
    });
    
    // Publish retry event
    await this.rabbitMQ.publish('notification.retry', {
      deliveryId: delivery.id,
      scheduledFor: nextRetryAt
    });
  }
}
```

### 8.3 Deduplication

```typescript
class DeduplicationService {
  private redis: Redis;
  private ttlSeconds: number = 3600; // 1 hour window
  
  /**
   * Check if notification is a duplicate
   * Deduplication key format: {eventType}:{resourceId}:{recipientId}:{hash}
   */
  async isDuplicate(event: NotificationEvent): Promise<boolean> {
    const key = this.buildDeduplicationKey(event);
    
    const result = await this.redis.set(
      `dedup:${key}`,
      '1',
      'EX', this.ttlSeconds,
      'NX'  // Only set if not exists
    );
    
    // If null, key already existed (duplicate)
    return result === null;
  }
  
  private buildDeduplicationKey(event: NotificationEvent): string {
    if (event.deduplicationKey) {
      return event.deduplicationKey;
    }
    
    // Default key: event type + resource + content hash
    const contentHash = crypto
      .createHash('md5')
      .update(JSON.stringify(event.data))
      .digest('hex')
      .substring(0, 8);
    
    return `${event.type}:${event.resourceId}:${contentHash}`;
  }
}
```

### 8.4 Rate Limiting

```typescript
interface RateLimitConfig {
  // Per-channel limits (per user per hour)
  channelLimits: Record<NotificationChannel, number>;
  
  // Per-user total limit
  userTotalLimit: number;
  
  // Burst allowance
  burstMultiplier: number;
}

const defaultRateLimits: RateLimitConfig = {
  channelLimits: {
    IN_APP: 100,      // 100 per hour
    EMAIL: 20,        // 20 per hour
    PUSH: 50,         // 50 per hour
    SMS: 10,          // 10 per hour
    WHATSAPP: 10,
    VOICE: 5          // 5 per hour (expensive)
  },
  userTotalLimit: 200,
  burstMultiplier: 2
};

class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  
  async check(userId: string, channel: NotificationChannel): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 3600000; // 1 hour
    const windowKey = Math.floor(now / windowMs);
    
    // Channel-specific key
    const channelKey = `ratelimit:${userId}:${channel}:${windowKey}`;
    
    // Get current count
    const currentCount = await this.redis.incr(channelKey);
    if (currentCount === 1) {
      await this.redis.expire(channelKey, 3600);
    }
    
    const limit = this.config.channelLimits[channel];
    
    if (currentCount > limit) {
      return {
        allowed: false,
        currentCount,
        limit,
        resetAt: new Date((windowKey + 1) * windowMs)
      };
    }
    
    return { allowed: true, currentCount, limit };
  }
}
```

### 8.5 Batch/Digest Processing

```typescript
class BatchProcessor {
  /**
   * Collect low-priority notifications for digest
   */
  async collectForDigest(notification: Notification, recipientId: string): Promise<void> {
    const preferences = await this.getDigestPreferences(recipientId);
    
    if (!preferences.digestEnabled) {
      return;
    }
    
    // Find or create active batch
    let batch = await prisma.notificationBatch.findFirst({
      where: {
        recipientId,
        status: 'COLLECTING',
        frequency: preferences.digestFrequency
      }
    });
    
    if (!batch) {
      batch = await this.createBatch(recipientId, preferences);
    }
    
    // Add notification to batch
    await prisma.notification.update({
      where: { id: notification.id },
      data: { batchId: batch.id, status: 'SCHEDULED' }
    });
  }
  
  /**
   * Process and send digest
   */
  async processDigest(batchId: string): Promise<void> {
    const batch = await prisma.notificationBatch.findUnique({
      where: { id: batchId },
      include: { notifications: true }
    });
    
    if (!batch || batch.status !== 'READY') {
      return;
    }
    
    // Update status
    await prisma.notificationBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' }
    });
    
    // Group notifications by category
    const grouped = this.groupNotifications(batch.notifications);
    
    // Render digest content
    const content = await this.templateEngine.renderDigest({
      recipientId: batch.recipientId,
      groups: grouped,
      period: batch.frequency,
      locale: await this.getUserLocale(batch.recipientId)
    });
    
    // Send via email
    await this.deliveryManager.deliverToChannel(
      batch,
      batch.recipientId,
      'EMAIL',
      content
    );
    
    // Update status
    await prisma.notificationBatch.update({
      where: { id: batchId },
      data: { status: 'DELIVERED', deliveredAt: new Date() }
    });
  }
  
  private groupNotifications(notifications: Notification[]): GroupedNotifications {
    return notifications.reduce((groups, notification) => {
      const category = notification.eventCategory;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(notification);
      return groups;
    }, {} as GroupedNotifications);
  }
}
```

---

## 9. Template System

### 9.1 Template Engine

```typescript
class TemplateEngine {
  private templateCache: Map<string, CompiledTemplate> = new Map();
  private variableResolver: VariableResolver;
  private localeManager: LocaleManager;
  
  /**
   * Render notification content for all requested channels
   */
  async render(params: RenderParams): Promise<Record<NotificationChannel, RenderedContent>> {
    const template = await this.getTemplate(params.eventType, params.organizationId);
    const results: Record<NotificationChannel, RenderedContent> = {};
    
    for (const channel of params.channels) {
      const channelTemplate = template.channels.find(c => c.channel === channel);
      if (!channelTemplate) {
        throw new Error(`No template for channel ${channel}`);
      }
      
      results[channel] = await this.renderChannel(channelTemplate, params);
    }
    
    return results;
  }
  
  private async renderChannel(
    channelTemplate: TemplateChannel,
    params: RenderParams
  ): Promise<RenderedContent> {
    // Get localized content
    const localization = this.getLocalization(channelTemplate, params.locale);
    
    // Resolve variables
    const variables = await this.variableResolver.resolve(params.data, params.eventType);
    
    // Compile and render templates
    const title = this.compileAndRender(localization.title, variables);
    const body = this.compileAndRender(localization.body, variables);
    const bodyHtml = localization.bodyHtml 
      ? this.compileAndRender(localization.bodyHtml, variables)
      : undefined;
    const subject = localization.subject
      ? this.compileAndRender(localization.subject, variables)
      : undefined;
    const actionLabel = localization.actionLabel
      ? this.compileAndRender(localization.actionLabel, variables)
      : undefined;
    
    return {
      title,
      body,
      bodyHtml,
      subject,
      actionLabel,
      actionUrl: variables.actionUrl
    };
  }
  
  private compileAndRender(template: string, variables: Record<string, unknown>): string {
    // Use Handlebars or similar
    const compiled = Handlebars.compile(template);
    return compiled(variables);
  }
  
  private getLocalization(channel: TemplateChannel, locale: string): TemplateLocalization {
    // Try exact match
    let localization = channel.localizations.find(l => l.locale === locale);
    
    // Try language only (e.g., 'en' for 'en-US')
    if (!localization) {
      const language = locale.split('-')[0];
      localization = channel.localizations.find(l => l.locale === language);
    }
    
    // Fall back to English
    if (!localization) {
      localization = channel.localizations.find(l => l.locale === 'en');
    }
    
    if (!localization) {
      throw new Error(`No localization found for channel`);
    }
    
    return localization;
  }
}
```

### 9.2 Variable Resolver

```typescript
class VariableResolver {
  /**
   * Resolve template variables from event data
   */
  async resolve(
    data: Record<string, unknown>,
    eventType: string
  ): Promise<Record<string, unknown>> {
    const mapping = this.getVariableMapping(eventType);
    const resolved: Record<string, unknown> = {};
    
    // Standard variables
    resolved.app = {
      name: 'Coder IDE',
      url: config.appUrl,
      supportEmail: config.supportEmail
    };
    
    resolved.timestamp = new Date();
    resolved.year = new Date().getFullYear();
    
    // Event-specific variables
    for (const [templateVar, dataPath] of Object.entries(mapping)) {
      resolved[templateVar] = this.getNestedValue(data, dataPath);
    }
    
    // Generate action URL
    resolved.actionUrl = this.generateActionUrl(eventType, data);
    
    return resolved;
  }
  
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => 
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined,
      obj
    );
  }
  
  private generateActionUrl(eventType: string, data: Record<string, unknown>): string {
    // Generate deep link based on event type
    const urlPatterns: Record<string, string> = {
      'task.assigned': '/projects/{{projectId}}/tasks/{{taskId}}',
      'task.mentioned': '/projects/{{projectId}}/tasks/{{taskId}}#comment-{{commentId}}',
      'incident.created': '/incidents/{{incidentId}}',
      'review.requested': '/reviews/{{reviewId}}',
      'team.invite': '/invitations/{{invitationId}}'
    };
    
    const pattern = urlPatterns[eventType] || '/';
    let url = `${config.appUrl}${pattern}`;
    
    // Replace placeholders
    url = url.replace(/\{\{(\w+)\}\}/g, (_, key) => 
      String(data[key] || '')
    );
    
    return url;
  }
}
```

### 9.3 Default Templates

```typescript
// Seed default templates
const defaultTemplates: NotificationTemplateInput[] = [
  // Task Assigned
  {
    code: 'task.assigned',
    name: 'Task Assigned',
    eventType: 'task.assigned',
    scope: 'GLOBAL',
    defaultCriticality: 'MEDIUM',
    channels: [
      {
        channel: 'IN_APP',
        localizations: [
          {
            locale: 'en',
            title: 'New task assigned',
            body: '{{assigner.name}} assigned you "{{task.title}}"',
            actionLabel: 'View Task'
          },
          {
            locale: 'fr',
            title: 'Nouvelle tâche assignée',
            body: '{{assigner.name}} vous a assigné "{{task.title}}"',
            actionLabel: 'Voir la tâche'
          }
        ]
      },
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '[{{project.name}}] Task assigned: {{task.title}}',
            title: 'Task Assigned',
            body: 'Hi {{recipient.firstName}},\n\n{{assigner.name}} has assigned you a new task in {{project.name}}.\n\nTask: {{task.title}}\nDue: {{task.dueDate}}\n\nClick below to view the task details.',
            bodyHtml: `
              <h1>Task Assigned</h1>
              <p>Hi {{recipient.firstName}},</p>
              <p><strong>{{assigner.name}}</strong> has assigned you a new task in <strong>{{project.name}}</strong>.</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>{{task.title}}</strong></p>
                <p style="margin: 8px 0 0 0; color: #666;">Due: {{task.dueDate}}</p>
              </div>
              <a href="{{actionUrl}}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
            `,
            actionLabel: 'View Task'
          },
          {
            locale: 'fr',
            subject: '[{{project.name}}] Tâche assignée: {{task.title}}',
            title: 'Tâche Assignée',
            body: 'Bonjour {{recipient.firstName}},\n\n{{assigner.name}} vous a assigné une nouvelle tâche dans {{project.name}}.\n\nTâche: {{task.title}}\nÉchéance: {{task.dueDate}}\n\nCliquez ci-dessous pour voir les détails.',
            bodyHtml: '...',
            actionLabel: 'Voir la tâche'
          }
        ]
      },
      {
        channel: 'PUSH',
        localizations: [
          {
            locale: 'en',
            title: '📋 Task assigned',
            body: '{{assigner.name}}: {{task.title}}'
          },
          {
            locale: 'fr',
            title: '📋 Tâche assignée',
            body: '{{assigner.name}}: {{task.title}}'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'Task Assigned',
            body: '[Coder] {{assigner.name}} assigned you "{{task.title}}" in {{project.name}}. View: {{actionUrl}}'
          }
        ]
      }
    ]
  },
  
  // Incident Created (Critical)
  {
    code: 'incident.created',
    name: 'Incident Created',
    eventType: 'incident.created',
    scope: 'GLOBAL',
    defaultCriticality: 'HIGH',
    channels: [
      {
        channel: 'IN_APP',
        localizations: [
          {
            locale: 'en',
            title: '🚨 New Incident',
            body: '{{incident.severity}} severity incident: {{incident.title}}',
            actionLabel: 'View Incident'
          }
        ]
      },
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '🚨 [INCIDENT] {{incident.severity}}: {{incident.title}}',
            title: 'Incident Created',
            body: 'A new {{incident.severity}} severity incident has been created.\n\nTitle: {{incident.title}}\nReported by: {{reporter.name}}\nTime: {{incident.createdAt}}\n\nImmediate attention required.',
            bodyHtml: '...',
            actionLabel: 'View Incident'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'INCIDENT',
            body: '[INCIDENT] {{incident.severity}}: {{incident.title}}. View: {{actionUrl}}'
          }
        ]
      },
      {
        channel: 'VOICE',
        localizations: [
          {
            locale: 'en',
            title: 'Incident Alert',
            body: 'Alert! A {{incident.severity}} severity incident has been created. Title: {{incident.title}}. Please check the Coder platform immediately. Press 1 to acknowledge.'
          }
        ]
      }
    ]
  },
  
  // Security Alert
  {
    code: 'security.suspicious_login',
    name: 'Suspicious Login Alert',
    eventType: 'security.suspicious_login',
    scope: 'GLOBAL',
    defaultCriticality: 'CRITICAL',
    channels: [
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '⚠️ [Security Alert] Suspicious login detected',
            title: 'Suspicious Login Detected',
            body: 'We detected a suspicious login attempt on your account.\n\nTime: {{login.timestamp}}\nLocation: {{login.location}}\nDevice: {{login.device}}\nIP: {{login.ip}}\n\nIf this was you, you can ignore this message. Otherwise, please secure your account immediately.',
            bodyHtml: '...',
            actionLabel: 'Secure Account'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'Security Alert',
            body: '[Coder Security] Suspicious login from {{login.location}}. If not you, secure account: {{actionUrl}}'
          }
        ]
      },
      {
        channel: 'VOICE',
        localizations: [
          {
            locale: 'en',
            title: 'Security Alert',
            body: 'Security alert from Coder. A suspicious login was detected on your account from {{login.location}}. If this was not you, please secure your account immediately by visiting the Coder platform. Press 1 to acknowledge.'
          }
        ]
      }
    ]
  }
  
  // ... more templates
];
```

---

## 10. Preference Resolution

### 10.1 Preference Hierarchy

```
GLOBAL (Platform defaults)
    ↓
ORGANIZATION (Organization-wide settings)
    ↓
TEAM (Team-level overrides)
    ↓
PROJECT (Project-specific settings)
    ↓
USER (User's personal preferences)
```

### 10.2 Preference Resolver

```typescript
interface PreferenceContext {
  userId: string;
  organizationId: string;
  teamId?: string;
  projectId?: string;
  eventType?: string;
  eventCategory?: EventCategory;
}

interface ResolvedPreferences {
  isEnabled: boolean;
  minCriticality: NotificationCriticality;
  channelPreferences: Record<NotificationChannel, ChannelPreferenceResolved>;
  presenceAware: boolean;
  digestEnabled: boolean;
  digestFrequency?: BatchFrequency;
}

interface ChannelPreferenceResolved {
  isEnabled: boolean;
  onlyWhenOffline: boolean;
  digestEnabled: boolean;
}

class PreferenceResolver {
  /**
   * Resolve effective preferences by merging hierarchy
   */
  async resolve(context: PreferenceContext): Promise<ResolvedPreferences> {
    // Fetch all applicable preferences
    const preferences = await this.fetchPreferences(context);
    
    // Sort by scope priority (GLOBAL -> USER)
    const sorted = this.sortByScope(preferences);
    
    // Merge preferences (later scopes override earlier)
    return this.mergePreferences(sorted);
  }
  
  private async fetchPreferences(context: PreferenceContext): Promise<NotificationPreference[]> {
    const conditions: Prisma.NotificationPreferenceWhereInput[] = [];
    
    // Global
    conditions.push({ scope: 'GLOBAL' });
    
    // Organization
    conditions.push({
      scope: 'ORGANIZATION',
      organizationId: context.organizationId
    });
    
    // Team
    if (context.teamId) {
      conditions.push({
        scope: 'TEAM',
        teamId: context.teamId
      });
    }
    
    // Project
    if (context.projectId) {
      conditions.push({
        scope: 'PROJECT',
        projectId: context.projectId
      });
    }
    
    // User
    conditions.push({
      scope: 'USER',
      userId: context.userId
    });
    
    return prisma.notificationPreference.findMany({
      where: {
        OR: conditions,
        OR: [
          { eventType: null, eventCategory: null },           // Applies to all
          { eventType: context.eventType },                    // Event-specific
          { eventCategory: context.eventCategory }             // Category-specific
        ]
      },
      include: { channelPreferences: true }
    });
  }
  
  private sortByScope(preferences: NotificationPreference[]): NotificationPreference[] {
    const scopePriority: Record<PreferenceScope, number> = {
      GLOBAL: 0,
      ORGANIZATION: 1,
      TEAM: 2,
      PROJECT: 3,
      USER: 4
    };
    
    return preferences.sort((a, b) => 
      scopePriority[a.scope] - scopePriority[b.scope]
    );
  }
  
  private mergePreferences(sorted: NotificationPreference[]): ResolvedPreferences {
    // Start with defaults
    let result: ResolvedPreferences = {
      isEnabled: true,
      minCriticality: 'LOW',
      channelPreferences: this.getDefaultChannelPreferences(),
      presenceAware: true,
      digestEnabled: false
    };
    
    // Merge each preference layer
    for (const pref of sorted) {
      if (pref.isEnabled !== undefined) {
        result.isEnabled = pref.isEnabled;
      }
      
      if (pref.minCriticality) {
        result.minCriticality = pref.minCriticality;
      }
      
      // Merge channel preferences
      for (const channelPref of pref.channelPreferences) {
        result.channelPreferences[channelPref.channel] = {
          isEnabled: channelPref.isEnabled,
          onlyWhenOffline: channelPref.onlyWhenOffline,
          digestEnabled: channelPref.digestEnabled
        };
        
        if (channelPref.digestEnabled) {
          result.digestEnabled = true;
          result.digestFrequency = channelPref.digestFrequency;
        }
      }
    }
    
    return result;
  }
  
  private getDefaultChannelPreferences(): Record<NotificationChannel, ChannelPreferenceResolved> {
    return {
      IN_APP: { isEnabled: true, onlyWhenOffline: false, digestEnabled: false },
      EMAIL: { isEnabled: true, onlyWhenOffline: false, digestEnabled: false },
      PUSH: { isEnabled: true, onlyWhenOffline: true, digestEnabled: false },
      SMS: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false },
      WHATSAPP: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false },
      VOICE: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false }
    };
  }
}
```

---

## 11. Escalation & Fallback

### 11.1 Escalation Manager

```typescript
class EscalationManager {
  private scheduler: Scheduler;
  
  /**
   * Schedule escalation for critical notification
   */
  async scheduleEscalation(notification: Notification, recipientId: string): Promise<void> {
    // Find applicable escalation chain
    const chain = await this.findEscalationChain(notification);
    
    if (!chain) {
      return; // No escalation configured
    }
    
    // Link notification to chain
    await prisma.notification.update({
      where: { id: notification.id },
      data: { escalationChainId: chain.id, escalationLevel: 0 }
    });
    
    // Schedule first escalation check
    const firstLevel = chain.levels.find(l => l.level === 1);
    if (firstLevel) {
      await this.scheduleEscalationCheck(notification, firstLevel);
    }
  }
  
  /**
   * Check and execute escalation
   */
  async checkEscalation(notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        escalationChain: { include: { levels: true } },
        deliveries: true
      }
    });
    
    if (!notification || !notification.escalationChain) {
      return;
    }
    
    // Check if acknowledgment condition is met
    const acknowledged = await this.checkAcknowledgment(notification);
    if (acknowledged) {
      await this.cancelEscalation(notification);
      return;
    }
    
    // Get next escalation level
    const nextLevel = notification.escalationChain.levels.find(
      l => l.level === notification.escalationLevel + 1
    );
    
    if (!nextLevel) {
      // Max escalation reached
      await this.logMaxEscalation(notification);
      return;
    }
    
    // Execute escalation
    await this.executeEscalation(notification, nextLevel);
  }
  
  private async executeEscalation(
    notification: Notification,
    level: EscalationLevel
  ): Promise<void> {
    // Determine recipients
    const recipients = await this.resolveEscalationRecipients(notification, level);
    
    // Send via escalation channels
    for (const recipientId of recipients) {
      for (const channel of level.channels) {
        await this.deliveryManager.deliverToChannel(
          notification,
          recipientId,
          channel,
          await this.renderEscalationContent(notification, level, channel)
        );
      }
    }
    
    // Update notification
    await prisma.notification.update({
      where: { id: notification.id },
      data: { escalationLevel: level.level }
    });
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'NOTIFICATION_ESCALATED',
      notificationId: notification.id,
      details: { level: level.level, channels: level.channels, recipients }
    });
    
    // Schedule next level check
    const nextLevel = notification.escalationChain.levels.find(
      l => l.level === level.level + 1
    );
    if (nextLevel) {
      await this.scheduleEscalationCheck(notification, nextLevel);
    }
  }
  
  private async resolveEscalationRecipients(
    notification: Notification,
    level: EscalationLevel
  ): Promise<string[]> {
    switch (level.recipientType) {
      case 'ORIGINAL':
        return [notification.recipientId];
        
      case 'USER':
        return level.recipientUserId ? [level.recipientUserId] : [];
        
      case 'ROLE':
        return this.getUsersByRole(level.recipientRoleId, notification.organizationId);
        
      case 'ON_CALL':
        return this.getCurrentOnCallUsers(notification.organizationId, notification.teamId);
        
      default:
        return [notification.recipientId];
    }
  }
}
```

### 11.2 Fallback Handler

```typescript
class FallbackHandler {
  /**
   * Attempt fallback channels when primary channel fails
   */
  async attemptFallback(
    notification: Notification,
    failedChannel: NotificationChannel,
    recipientId: string
  ): Promise<FallbackResult> {
    // Get channel configuration
    const channelConfig = await this.getChannelConfig(
      failedChannel,
      notification.organizationId
    );
    
    if (!channelConfig.fallbackChain || channelConfig.fallbackChain.length === 0) {
      return { success: false, reason: 'No fallback configured' };
    }
    
    // Try each fallback channel in order
    for (const fallbackChannel of channelConfig.fallbackChain) {
      // Check if fallback channel is enabled for user
      const preferences = await this.preferenceResolver.resolve({
        userId: recipientId,
        organizationId: notification.organizationId
      });
      
      if (!preferences.channelPreferences[fallbackChannel]?.isEnabled) {
        continue;
      }
      
      // Attempt delivery
      const result = await this.deliveryManager.deliverToChannel(
        notification,
        recipientId,
        fallbackChannel,
        await this.templateEngine.render({
          eventType: notification.eventType,
          channels: [fallbackChannel],
          data: notification.metadata
        })
      );
      
      if (result.status === 'SENT') {
        // Audit log
        await this.auditLogger.log({
          eventType: 'PROVIDER_FAILOVER',
          notificationId: notification.id,
          details: {
            failedChannel,
            fallbackChannel,
            success: true
          }
        });
        
        return { success: true, fallbackChannel, result };
      }
    }
    
    return { success: false, reason: 'All fallback channels failed' };
  }
}
```

### 11.3 Default Escalation Chain

```typescript
// Default critical notification escalation
const defaultCriticalEscalation: EscalationChainInput = {
  name: 'Default Critical Escalation',
  scope: 'GLOBAL',
  triggerCriticality: 'CRITICAL',
  triggerEventTypes: ['incident.created', 'security.suspicious_login', 'system.outage'],
  levels: [
    {
      level: 0,
      delayMinutes: 0,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 1,
      delayMinutes: 5,
      channels: ['SMS'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 2,
      delayMinutes: 10,
      channels: ['VOICE'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 3,
      delayMinutes: 15,
      channels: ['VOICE', 'SMS'],
      recipientType: 'ON_CALL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    }
  ]
};
```

---

## 12. Quiet Hours & DND

### 12.1 Quiet Hours Service

```typescript
class QuietHoursService {
  /**
   * Check if user is in quiet hours
   */
  async checkQuietHours(
    userId: string,
    notification: Notification
  ): Promise<QuietHoursStatus> {
    const quietHours = await this.getQuietHours(userId);
    
    if (!quietHours || !quietHours.isEnabled) {
      return { isQuietHours: false };
    }
    
    // Check manual DND override
    if (quietHours.dndActiveUntil && quietHours.dndActiveUntil > new Date()) {
      return this.applyQuietHoursRules(quietHours, notification);
    }
    
    // Check scheduled quiet hours
    const now = new Date();
    const userTime = this.convertToUserTimezone(now, quietHours.timezone);
    
    const isInSchedule = this.isInSchedule(userTime, quietHours.schedules);
    
    if (!isInSchedule) {
      return { isQuietHours: false };
    }
    
    return this.applyQuietHoursRules(quietHours, notification);
  }
  
  private applyQuietHoursRules(
    quietHours: QuietHours,
    notification: Notification
  ): QuietHoursStatus {
    // Always allow critical if configured
    if (quietHours.allowCritical && notification.criticality === 'CRITICAL') {
      return { isQuietHours: false, overrideReason: 'CRITICAL_ALLOWED' };
    }
    
    // Check channel-specific rules
    const channelRules: Record<NotificationChannel, QuietHoursBehavior> = {};
    for (const rule of quietHours.channelRules) {
      channelRules[rule.channel] = rule.behavior;
    }
    
    return {
      isQuietHours: true,
      holdNonCritical: quietHours.holdNonCritical,
      channelRules
    };
  }
  
  private isInSchedule(userTime: Date, schedules: QuietHoursSchedule[]): boolean {
    const dayOfWeek = userTime.getDay();
    const minutesSinceMidnight = userTime.getHours() * 60 + userTime.getMinutes();
    
    for (const schedule of schedules) {
      if (!schedule.dayOfWeek.includes(dayOfWeek)) {
        continue;
      }
      
      // Handle overnight schedules (e.g., 22:00 - 07:00)
      if (schedule.startMinutes > schedule.endMinutes) {
        if (minutesSinceMidnight >= schedule.startMinutes || 
            minutesSinceMidnight < schedule.endMinutes) {
          return true;
        }
      } else {
        if (minutesSinceMidnight >= schedule.startMinutes && 
            minutesSinceMidnight < schedule.endMinutes) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Release held notifications when quiet hours end
   */
  async releaseHeldNotifications(userId: string): Promise<void> {
    const heldNotifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        status: 'HELD'
      }
    });
    
    for (const notification of heldNotifications) {
      // Re-process notification
      await this.deliveryManager.processNotification({
        ...notification,
        // Skip quiet hours check this time
        skipQuietHours: true
      });
      
      // Update status
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'PROCESSING' }
      });
      
      // Audit log
      await this.auditLogger.log({
        eventType: 'NOTIFICATION_RELEASED',
        notificationId: notification.id,
        details: { reason: 'QUIET_HOURS_ENDED' }
      });
    }
  }
}
```

### 12.2 DND API

```typescript
// Enable/disable DND
interface SetDNDRequest {
  enabled: boolean;
  duration?: number;        // Minutes
  untilTime?: Date;         // Specific end time
}

// Quick DND options
const dndPresets = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'Until tomorrow', minutes: 'untilTomorrow' },
  { label: 'Until end of day', minutes: 'untilEndOfDay' }
];
```

---

**Continue to Part 3** for:
- API Endpoints
- UI Views & Components
- Webhook Integration
- Implementation Guidelines
- Performance & Scaling


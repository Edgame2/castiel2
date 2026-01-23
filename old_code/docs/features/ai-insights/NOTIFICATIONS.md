# AI Insights: Global Notification System

## Overview

The Notification System is a **global, application-wide service** that manages all types of user notifications across the CASTIEL platform. While initially designed to support Recurring Search alerts, it provides a unified infrastructure for all notification needs including system announcements, team mentions, sharing notifications, and more.

**Key Features**:
- **Multi-Channel Delivery**: Email, in-app, webhook, push notifications, Slack, Teams
- **User Preferences**: Granular control over notification channels and frequency
- **Digest Mode**: Batch notifications into daily/weekly summaries
- **Delivery Tracking**: Monitor sent, failed, and bounced notifications
- **Retry Logic**: Automatic retry with exponential backoff
- **Rich Content**: Support for markdown, actions, and attachments
- **Priority Levels**: Low, medium, high, urgent classification
- **Global Architecture**: Reusable across all features

## Table of Contents

1. [Architecture](#architecture)
2. [Notification Types](#notification-types)
3. [Delivery Channels](#delivery-channels)
4. [User Preferences](#user-preferences)
5. [Digest Mode](#digest-mode)
6. [Delivery Flow](#delivery-flow)
7. [Channel Implementations](#channel-implementations)
8. [Retry & Error Handling](#retry--error-handling)
9. [Notification Templates](#notification-templates)
10. [Database Schema](#database-schema)
11. [Service Implementation](#service-implementation)
12. [API Endpoints](#api-endpoints)

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Global Notification System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Feature    │      │ Notification │      │   Delivery   │  │
│  │   Services   │─────▶│   Service    │─────▶│  Dispatcher  │  │
│  │ (Any Feature)│      │   (Core)     │      │              │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Notifications Container                      │  │
│  │              (Cosmos DB - HPK: tenantId/userId/id)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Channel Adapters │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┬───────────┐
          │                   │                   │           │
          ▼                   ▼                   ▼           ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐ ┌────────┐
    │  Email   │        │  In-App  │       │ Webhook  │ │  Push  │
    │  (ACS)   │        │  (DB)    │       │ (HTTP)   │ │ (APN)  │
    └──────────┘        └──────────┘       └──────────┘ └────────┘
          │                   │                   │           │
          ▼                   ▼                   ▼           ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐ ┌────────┐
    │  Slack   │        │  Teams   │       │  Custom  │ │  SMS   │
    │  (API)   │        │  (Graph) │       │ (Future) │ │(Future)│
    └──────────┘        └──────────┘       └──────────┘ └────────┘
```

### Component Responsibilities

**1. Feature Services** (e.g., RecurringSearchService, TeamService)
- Generate notification requests
- Provide notification content
- Specify target users and channels

**2. NotificationService** (Core)
- Create notification records in database
- Load user preferences
- Route to appropriate channels
- Track delivery status
- Handle retry logic

**3. Delivery Dispatcher**
- Manages channel-specific delivery
- Implements channel adapters
- Handles rate limiting per channel
- Aggregates delivery status

**4. Channel Adapters**
- Encapsulate channel-specific logic
- Format messages for each channel
- Handle channel-specific auth
- Report delivery status

## Notification Types

### Supported Types

```typescript
type NotificationType = 
  | 'recurring_search_alert'    // Alert from recurring search
  | 'system'                    // System announcements
  | 'team_mention'              // User mentioned in comment/chat
  | 'share'                     // Content shared with user
  | 'learning_update'           // AI learning system improvements
  | 'quota_warning'             // Approaching quota limits
  | 'execution_failure'         // Recurring search failed
  | 'permission_change'         // User permissions updated
  | 'invitation'                // Team invitation
  | 'comment'                   // New comment on user's content
  | 'custom';                   // Custom notifications
```

### Type-Specific Configuration

```typescript
const notificationTypeConfig = {
  recurring_search_alert: {
    defaultChannels: ['email', 'in-app'],
    defaultPriority: 'medium',
    supportDigest: true,
    icon: '🔔',
    color: '#3B82F6'
  },
  system: {
    defaultChannels: ['in-app'],
    defaultPriority: 'high',
    supportDigest: false,
    icon: '📢',
    color: '#EF4444'
  },
  team_mention: {
    defaultChannels: ['email', 'in-app', 'push'],
    defaultPriority: 'high',
    supportDigest: false,
    icon: '@',
    color: '#8B5CF6'
  },
  share: {
    defaultChannels: ['in-app'],
    defaultPriority: 'low',
    supportDigest: true,
    icon: '🔗',
    color: '#10B981'
  },
  learning_update: {
    defaultChannels: ['in-app'],
    defaultPriority: 'low',
    supportDigest: true,
    icon: '🎓',
    color: '#F59E0B'
  }
};
```

## Delivery Channels

### Channel Overview

| Channel | Use Case | Real-time | Cost | Reliability |
|---------|----------|-----------|------|-------------|
| In-App | All notifications | ✅ Yes | Free | ⭐⭐⭐⭐⭐ |
| Email | Important alerts | ❌ No | Low | ⭐⭐⭐⭐ |
| Webhook | Integration with external systems | ✅ Yes | Free | ⭐⭐⭐ |
| Push | Mobile notifications | ✅ Yes | Low | ⭐⭐⭐⭐ |
| Slack | Team collaboration | ✅ Yes | Free | ⭐⭐⭐⭐ |
| Teams | Enterprise collaboration | ✅ Yes | Free | ⭐⭐⭐⭐ |

### Channel Capabilities

```typescript
interface ChannelCapabilities {
  channel: string;
  supportsRichText: boolean;
  supportsAttachments: boolean;
  supportsActions: boolean;
  maxContentLength: number;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay?: number;
  };
}

const channelCapabilities: Record<string, ChannelCapabilities> = {
  'in-app': {
    channel: 'in-app',
    supportsRichText: true,
    supportsAttachments: true,
    supportsActions: true,
    maxContentLength: 10000,
    rateLimit: { requestsPerSecond: 100 }
  },
  'email': {
    channel: 'email',
    supportsRichText: true,
    supportsAttachments: true,
    supportsActions: true,
    maxContentLength: 100000,
    rateLimit: { requestsPerSecond: 10, requestsPerDay: 1000 }
  },
  'webhook': {
    channel: 'webhook',
    supportsRichText: false,
    supportsAttachments: false,
    supportsActions: false,
    maxContentLength: 10000,
    rateLimit: { requestsPerSecond: 5 }
  },
  'push': {
    channel: 'push',
    supportsRichText: false,
    supportsAttachments: false,
    supportsActions: true,
    maxContentLength: 256,
    rateLimit: { requestsPerSecond: 10 }
  },
  'slack': {
    channel: 'slack',
    supportsRichText: true,
    supportsAttachments: true,
    supportsActions: true,
    maxContentLength: 4000,
    rateLimit: { requestsPerSecond: 1 }
  },
  'teams': {
    channel: 'teams',
    supportsRichText: true,
    supportsAttachments: true,
    supportsActions: true,
    maxContentLength: 28000,
    rateLimit: { requestsPerSecond: 5 }
  }
};
```

## User Preferences

### Preference Schema

```typescript
interface NotificationPreferences {
  userId: string;
  tenantId: string;
  
  // Global settings
  globalSettings: {
    enabled: boolean;                   // Master switch
    quietHoursEnabled: boolean;
    quietHoursStart: string;            // HH:mm
    quietHoursEnd: string;              // HH:mm
    timezone: string;                   // IANA timezone
  };
  
  // Channel preferences
  channels: {
    'in-app': {
      enabled: boolean;
      sound: boolean;
    };
    'email': {
      enabled: boolean;
      address?: string;                 // Override default
      digestEnabled: boolean;
      digestSchedule: 'daily' | 'weekly';
      digestTime: string;               // HH:mm
    };
    'webhook': {
      enabled: boolean;
      url?: string;
      secret?: string;
      headers?: Record<string, string>;
    };
    'push': {
      enabled: boolean;
      devices: {
        token: string;
        platform: 'ios' | 'android' | 'web';
        lastUsed: string;
      }[];
    };
    'slack': {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    'teams': {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
  };
  
  // Type-specific preferences
  typePreferences: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: string[];               // Which channels for this type
      priority: 'low' | 'medium' | 'high' | 'urgent';
      digestMode: boolean;              // Join digest?
    };
  };
  
  // Keywords
  muteKeywords: string[];               // Suppress notifications with these
  priorityKeywords: string[];           // Boost priority if contains these
  
  // Metadata
  updatedAt: string;
  version: number;
}
```

### Default Preferences

```typescript
const defaultPreferences: NotificationPreferences = {
  globalSettings: {
    enabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'UTC'
  },
  channels: {
    'in-app': { enabled: true, sound: true },
    'email': { 
      enabled: true, 
      digestEnabled: false,
      digestSchedule: 'daily',
      digestTime: '09:00'
    },
    'webhook': { enabled: false },
    'push': { enabled: false, devices: [] },
    'slack': { enabled: false },
    'teams': { enabled: false }
  },
  typePreferences: {
    recurring_search_alert: {
      enabled: true,
      channels: ['email', 'in-app'],
      priority: 'medium',
      digestMode: false
    },
    system: {
      enabled: true,
      channels: ['in-app'],
      priority: 'high',
      digestMode: false
    },
    team_mention: {
      enabled: true,
      channels: ['email', 'in-app', 'push'],
      priority: 'high',
      digestMode: false
    }
  },
  muteKeywords: [],
  priorityKeywords: []
};
```

## Digest Mode

### Concept

Instead of sending individual notifications, batch them into a periodic summary (daily or weekly).

**Benefits**:
- Reduce notification fatigue
- Lower email sending costs
- Better user experience for high-frequency notifications

**Use Cases**:
- Recurring search alerts (if user prefers daily summary)
- Learning updates
- Low-priority system notifications
- Share notifications

### Digest Compilation

```typescript
interface DigestCompilation {
  userId: string;
  tenantId: string;
  period: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  
  // Grouped notifications
  sections: {
    type: NotificationType;
    title: string;
    icon: string;
    notifications: Notification[];
    count: number;
  }[];
  
  // Summary stats
  summary: {
    totalNotifications: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
    unreadCount: number;
  };
  
  // Metadata
  generatedAt: string;
  sentAt?: string;
}
```

### Digest Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Daily Digest - CASTIEL AI Insights</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>📬 Your Daily Digest</h1>
  <p style="color: #666;">{{periodStart}} - {{periodEnd}}</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <strong>{{totalNotifications}} notifications</strong>
    <ul>
      {{#each byType}}
      <li>{{@key}}: {{this}}</li>
      {{/each}}
    </ul>
  </div>
  
  {{#each sections}}
  <div style="margin: 30px 0;">
    <h2 style="display: flex; align-items: center;">
      <span style="font-size: 24px; margin-right: 10px;">{{icon}}</span>
      {{title}} ({{count}})
    </h2>
    
    {{#each notifications}}
    <div style="border-left: 3px solid #3B82F6; padding: 15px; margin: 10px 0; background: white;">
      <h3>{{this.title}}</h3>
      <p>{{this.summary}}</p>
      <small style="color: #999;">{{formatDate this.createdAt}}</small>
      <div style="margin-top: 10px;">
        <a href="{{this.actionUrl}}" style="background: #3B82F6; color: white; padding: 8px 15px; text-decoration: none; border-radius: 3px;">View Details</a>
      </div>
    </div>
    {{/each}}
  </div>
  {{/each}}
  
  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f5f5f5;">
    <a href="{{appUrl}}/notifications" style="background: #3B82F6; color: white; padding: 10px 30px; text-decoration: none; border-radius: 5px;">View All Notifications</a>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    <a href="{{preferencesUrl}}">Manage notification preferences</a>
  </p>
</body>
</html>
```

## Delivery Flow

### Complete Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. NOTIFICATION CREATION                                         │
│    - Feature service calls notificationService.create()          │
│    - Notification record created in database                     │
│    - Status: 'unread', delivery status: 'pending'                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. LOAD USER PREFERENCES                                         │
│    - Fetch user's notification preferences                       │
│    - Check global enabled flag                                   │
│    - Check quiet hours (if enabled)                              │
│    - Get type-specific channel list                              │
│    - Check digest mode preference                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              Digest Mode?        Immediate
                    │                 │
                    ▼                 ▼
          ┌──────────────┐   ┌──────────────────┐
          │ 3a. QUEUE    │   │ 3b. DISPATCH NOW │
          │    FOR       │   │     - Send to    │
          │   DIGEST     │   │       channels   │
          │              │   │     - Track      │
          │ Wait for     │   │       delivery   │
          │ digest time  │   └────────┬─────────┘
          └──────┬───────┘            │
                 │                    │
                 │                    ▼
                 │           ┌──────────────────┐
                 │           │ 4. CHANNEL       │
                 │           │    DELIVERY      │
                 │           │    - Email       │
                 │           │    - In-App      │
                 └──────────▶│    - Webhook     │
                             │    - Push        │
                             │    - Slack       │
                             │    - Teams       │
                             └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ 5. TRACK STATUS  │
                             │    - Update DB   │
                             │    - Retry if    │
                             │      failed      │
                             │    - Log metrics │
                             └──────────────────┘
```

### Code Flow

```typescript
// Feature service creates notification
const notification = await notificationService.create({
  type: 'recurring_search_alert',
  tenantId: search.tenantId,
  userId: search.userId,
  title: 'New opportunities detected',
  summary: 'Found 3 new companies adopting AI solutions',
  content: detailedContent,
  source: {
    searchId: search.id,
    executionId: execution.id
  },
  alert: {
    confidence: 0.87,
    keyChanges: [...],
    citations: [...]
  },
  priority: 'medium'
});

// NotificationService handles delivery
class NotificationService {
  async create(data: CreateNotificationRequest): Promise<Notification> {
    // 1. Create notification record
    const notification = await this.saveToDatabase(data);
    
    // 2. Load user preferences
    const preferences = await this.getPreferences(data.userId);
    
    // 3. Check if should deliver now or queue for digest
    if (this.shouldDigest(notification, preferences)) {
      await this.queueForDigest(notification);
    } else {
      await this.deliverImmediate(notification, preferences);
    }
    
    return notification;
  }
  
  private async deliverImmediate(
    notification: Notification,
    preferences: NotificationPreferences
  ) {
    // Get channels for this notification type
    const channels = this.getChannelsForType(
      notification.type,
      preferences
    );
    
    // Dispatch to each channel in parallel
    const deliveryPromises = channels.map(channel =>
      this.deliverToChannel(notification, channel, preferences)
    );
    
    // Wait for all deliveries (don't fail if one channel fails)
    const results = await Promise.allSettled(deliveryPromises);
    
    // Update delivery status
    await this.updateDeliveryStatus(notification.id, results);
  }
  
  private async deliverToChannel(
    notification: Notification,
    channel: string,
    preferences: NotificationPreferences
  ) {
    const adapter = this.getChannelAdapter(channel);
    
    try {
      const result = await adapter.send(notification, preferences);
      return { channel, status: 'sent', sentAt: new Date().toISOString() };
    } catch (error) {
      // Log error and schedule retry
      await this.scheduleRetry(notification.id, channel, error);
      return { 
        channel, 
        status: 'failed', 
        failedAt: new Date().toISOString(),
        error: error.message 
      };
    }
  }
}
```

## Channel Implementations

### Email (Azure Communication Services)

```typescript
class EmailChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    const emailClient = new EmailClient(
      process.env.ACS_CONNECTION_STRING!
    );
    
    // Get email address (user's preference or default)
    const toAddress = preferences.channels.email.address || 
                      await this.getUserEmail(notification.userId);
    
    // Render template
    const html = await this.renderTemplate(notification);
    
    // Send email
    const result = await emailClient.beginSend({
      senderAddress: 'notifications@castiel.ai',
      recipients: {
        to: [{ address: toAddress }]
      },
      content: {
        subject: notification.title,
        html: html
      }
    });
    
    // Wait for delivery
    await result.pollUntilDone();
    
    return {
      channel: 'email',
      status: 'sent',
      sentAt: new Date().toISOString(),
      metadata: {
        messageId: result.id,
        toAddress
      }
    };
  }
  
  private async renderTemplate(notification: Notification): Promise<string> {
    // Use Handlebars or similar for templating
    const template = this.getTemplateForType(notification.type);
    return template(notification);
  }
}
```

### In-App (Database)

```typescript
class InAppChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    // In-app notifications are already stored in database
    // Just update the delivery status
    
    await this.updateNotification(notification.id, {
      'delivery.channels': [
        ...notification.delivery.channels,
        {
          channel: 'in-app',
          status: 'sent',
          sentAt: new Date().toISOString()
        }
      ]
    });
    
    // Trigger real-time update via WebSocket/SignalR
    await this.pushToClient(notification.userId, notification);
    
    return {
      channel: 'in-app',
      status: 'sent',
      sentAt: new Date().toISOString()
    };
  }
  
  private async pushToClient(userId: string, notification: Notification) {
    // Use SignalR or WebSocket to push to connected clients
    const signalRService = SignalRService.getInstance();
    await signalRService.sendToUser(userId, 'notification', notification);
  }
}
```

### Webhook (HTTP POST)

```typescript
class WebhookChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    const webhookConfig = preferences.channels.webhook;
    
    if (!webhookConfig.url) {
      throw new Error('Webhook URL not configured');
    }
    
    // Build payload
    const payload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      summary: notification.summary,
      content: notification.content,
      priority: notification.priority,
      createdAt: notification.createdAt,
      source: notification.source,
      alert: notification.alert
    };
    
    // Sign payload if secret configured
    const signature = webhookConfig.secret
      ? this.signPayload(payload, webhookConfig.secret)
      : undefined;
    
    // Send HTTP POST
    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Castiel-Signature': signature || '',
        ...webhookConfig.headers
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    return {
      channel: 'webhook',
      status: 'sent',
      sentAt: new Date().toISOString(),
      metadata: {
        url: webhookConfig.url,
        statusCode: response.status
      }
    };
  }
  
  private signPayload(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}
```

### Push Notifications (Azure Notification Hubs)

```typescript
class PushChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    const pushConfig = preferences.channels.push;
    
    if (!pushConfig.devices || pushConfig.devices.length === 0) {
      throw new Error('No push devices registered');
    }
    
    // Send to all registered devices
    const results = await Promise.all(
      pushConfig.devices.map(device =>
        this.sendToDevice(notification, device)
      )
    );
    
    return {
      channel: 'push',
      status: 'sent',
      sentAt: new Date().toISOString(),
      metadata: {
        deviceCount: pushConfig.devices.length,
        results
      }
    };
  }
  
  private async sendToDevice(
    notification: Notification,
    device: PushDevice
  ): Promise<any> {
    const hubClient = new NotificationHubsClient(
      process.env.NH_CONNECTION_STRING!,
      process.env.NH_HUB_NAME!
    );
    
    // Format notification for platform
    const message = device.platform === 'ios'
      ? this.formatApns(notification)
      : this.formatFcm(notification);
    
    // Send
    return await hubClient.sendNotification(message, {
      deviceHandle: device.token
    });
  }
  
  private formatApns(notification: Notification) {
    return {
      aps: {
        alert: {
          title: notification.title,
          body: notification.summary
        },
        badge: 1,
        sound: 'default'
      },
      data: {
        notificationId: notification.id,
        type: notification.type
      }
    };
  }
  
  private formatFcm(notification: Notification) {
    return {
      notification: {
        title: notification.title,
        body: notification.summary
      },
      data: {
        notificationId: notification.id,
        type: notification.type
      }
    };
  }
}
```

### Slack

```typescript
class SlackChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    const slackConfig = preferences.channels.slack;
    
    if (!slackConfig.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }
    
    // Format as Slack message
    const message = {
      text: notification.title,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: notification.title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.summary
          }
        },
        ...(notification.alert?.keyChanges ? [{
          type: 'section',
          fields: notification.alert.keyChanges.map(change => ({
            type: 'mrkdwn',
            text: `• ${change}`
          }))
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details'
              },
              url: `${process.env.APP_URL}/notifications/${notification.id}`
            }
          ]
        }
      ]
    };
    
    // Send to Slack
    const response = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
    
    return {
      channel: 'slack',
      status: 'sent',
      sentAt: new Date().toISOString()
    };
  }
}
```

### Microsoft Teams

```typescript
class TeamsChannelAdapter implements ChannelAdapter {
  async send(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<ChannelDeliveryResult> {
    const teamsConfig = preferences.channels.teams;
    
    if (!teamsConfig.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }
    
    // Format as Adaptive Card
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              size: 'Large',
              weight: 'Bolder',
              text: notification.title
            },
            {
              type: 'TextBlock',
              text: notification.summary,
              wrap: true
            },
            ...(notification.alert?.keyChanges ? [{
              type: 'FactSet',
              facts: notification.alert.keyChanges.map(change => ({
                title: '•',
                value: change
              }))
            }] : [])
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Details',
              url: `${process.env.APP_URL}/notifications/${notification.id}`
            }
          ]
        }
      }]
    };
    
    // Send to Teams
    const response = await fetch(teamsConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    
    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.statusText}`);
    }
    
    return {
      channel: 'teams',
      status: 'sent',
      sentAt: new Date().toISOString()
    };
  }
}
```

## Retry & Error Handling

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

const retryConfig: Record<string, RetryConfig> = {
  email: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 60000
  },
  webhook: {
    maxAttempts: 5,
    backoffMultiplier: 2,
    initialDelayMs: 500,
    maxDelayMs: 30000
  },
  push: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 60000
  },
  slack: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000
  },
  teams: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000
  }
};

async function scheduleRetry(
  notificationId: string,
  channel: string,
  error: Error,
  attempt: number = 0
) {
  const config = retryConfig[channel];
  
  if (attempt >= config.maxAttempts) {
    // Max attempts reached, mark as permanently failed
    await markChannelFailed(notificationId, channel, error);
    return;
  }
  
  // Calculate delay with exponential backoff
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  
  // Schedule retry using Azure Queue or setTimeout
  await queueRetry({
    notificationId,
    channel,
    attempt: attempt + 1,
    scheduledFor: Date.now() + delay
  });
}
```

### Error Types

```typescript
enum NotificationErrorType {
  INVALID_ADDRESS = 'invalid_address',
  RATE_LIMIT = 'rate_limit',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  AUTH_FAILED = 'auth_failed',
  INVALID_CONTENT = 'invalid_content',
  USER_DISABLED = 'user_disabled',
  UNKNOWN = 'unknown'
}

function classifyError(error: Error, channel: string): NotificationErrorType {
  // Classify based on error message/code
  if (error.message.includes('rate limit')) {
    return NotificationErrorType.RATE_LIMIT;
  }
  if (error.message.includes('invalid email') || error.message.includes('bounced')) {
    return NotificationErrorType.INVALID_ADDRESS;
  }
  if (error.message.includes('401') || error.message.includes('403')) {
    return NotificationErrorType.AUTH_FAILED;
  }
  if (error.message.includes('503') || error.message.includes('timeout')) {
    return NotificationErrorType.SERVICE_UNAVAILABLE;
  }
  return NotificationErrorType.UNKNOWN;
}
```

## Notification Templates

Templates are stored in the database and can be customized per tenant:

```typescript
interface NotificationTemplate {
  id: string;
  tenantId?: string;  // Null for global templates
  type: NotificationType;
  channel: string;
  
  // Template content
  subject?: string;   // For email
  title: string;
  summary: string;
  content: string;    // Handlebars template
  
  // Variables available in template
  variables: string[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

## Database Schema

See [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) for complete `notifications` container schema.

## Service Implementation

See [RECURRING-SEARCH-SERVICES.md](./RECURRING-SEARCH-SERVICES.md) for complete `NotificationService` implementation.

## API Endpoints

### User Endpoints

**GET /api/v1/notifications**
```typescript
// Get user's notifications
Response: {
  notifications: Notification[];
  unreadCount: number;
  pagination: { ... };
}
```

**GET /api/v1/notifications/:id**
```typescript
// Get specific notification
Response: Notification
```

**PATCH /api/v1/notifications/:id**
```typescript
// Update notification status
Request: {
  status: 'read' | 'acknowledged' | 'snoozed';
  snoozeUntil?: string;
}
Response: Notification
```

**DELETE /api/v1/notifications/:id**
```typescript
// Delete notification (soft delete)
Response: { success: boolean }
```

**POST /api/v1/notifications/:id/feedback**
```typescript
// Provide feedback on alert notification
Request: {
  feedback: 'relevant' | 'irrelevant';
  comment?: string;
}
Response: { success: boolean }
```

**GET /api/v1/notifications/preferences**
```typescript
// Get user's notification preferences
Response: NotificationPreferences
```

**PATCH /api/v1/notifications/preferences**
```typescript
// Update notification preferences
Request: Partial<NotificationPreferences>
Response: NotificationPreferences
```

**POST /api/v1/notifications/mark-all-read**
```typescript
// Mark all notifications as read
Response: { count: number }
```

### Admin Endpoints

**GET /api/v1/admin/notifications/stats**
```typescript
// Get notification statistics for tenant
Response: {
  totalSent: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
  deliveryRate: number;
  avgDeliveryTime: number;
}
```

## Related Documentation

- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md) - Recurring search system
- [RECURRING-SEARCH-ALERTS.md](./RECURRING-SEARCH-ALERTS.md) - Alert detection
- [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) - Database schema
- [RECURRING-SEARCH-SERVICES.md](./RECURRING-SEARCH-SERVICES.md) - Service implementations
- [API.md](./API.md) - Complete API reference

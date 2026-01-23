# Notification Manager Module Specification - Part 3

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft

---

## Table of Contents - Part 3

13. [API Endpoints](#13-api-endpoints)
14. [UI Views](#14-ui-views)
15. [Webhook Integration](#15-webhook-integration)
16. [Implementation Guidelines](#16-implementation-guidelines)

---

## 13. API Endpoints

### 13.1 Internal Admin API

Base URL: `http://notification-manager:3001/api/v1`

#### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications` | Send notification (direct API call) |
| `GET` | `/notifications` | List notifications (with filters) |
| `GET` | `/notifications/:id` | Get notification details |
| `DELETE` | `/notifications/:id` | Cancel pending notification |
| `POST` | `/notifications/:id/acknowledge` | Mark as acknowledged |

#### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/templates` | List all templates |
| `GET` | `/templates/:id` | Get template details |
| `POST` | `/templates` | Create template |
| `PUT` | `/templates/:id` | Update template |
| `DELETE` | `/templates/:id` | Delete template |
| `POST` | `/templates/:id/preview` | Preview rendered template |
| `POST` | `/templates/:id/duplicate` | Duplicate template |

#### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/preferences/user/:userId` | Get user preferences |
| `PUT` | `/preferences/user/:userId` | Update user preferences |
| `GET` | `/preferences/organization/:orgId` | Get org preferences |
| `PUT` | `/preferences/organization/:orgId` | Update org preferences |
| `GET` | `/preferences/resolved` | Get resolved preferences for context |

#### Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/providers` | List configured providers |
| `GET` | `/providers/:id` | Get provider details |
| `POST` | `/providers` | Configure new provider |
| `PUT` | `/providers/:id` | Update provider config |
| `DELETE` | `/providers/:id` | Remove provider |
| `POST` | `/providers/:id/test` | Test provider connectivity |
| `GET` | `/providers/:id/health` | Get provider health status |

#### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/channels` | List channel configurations |
| `PUT` | `/channels/:channel` | Update channel configuration |
| `GET` | `/channels/:channel/stats` | Get channel statistics |

#### History & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/history` | Notification history (paginated) |
| `GET` | `/history/:notificationId` | Delivery history for notification |
| `GET` | `/audit` | Audit log (admin only) |
| `GET` | `/metrics` | Delivery metrics & analytics |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/webhooks` | List webhooks |
| `POST` | `/webhooks` | Create webhook |
| `PUT` | `/webhooks/:id` | Update webhook |
| `DELETE` | `/webhooks/:id` | Delete webhook |
| `POST` | `/webhooks/:id/test` | Test webhook delivery |

#### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/detailed` | Detailed health (providers, queues) |

### 13.2 API Examples

```typescript
// Send notification via API
POST /api/v1/notifications
{
  "eventType": "custom.notification",
  "recipientIds": ["user-123", "user-456"],
  "title": "Custom Alert",
  "body": "This is a custom notification",
  "criticality": "MEDIUM",
  "channels": ["IN_APP", "EMAIL"],
  "actionUrl": "https://app.coder.io/alerts/123",
  "metadata": {
    "alertId": "123",
    "source": "external-system"
  }
}

// Response
{
  "success": true,
  "notificationId": "notif-uuid",
  "recipientCount": 2,
  "status": "PROCESSING"
}
```

```typescript
// Get user preferences
GET /api/v1/preferences/user/user-123

// Response
{
  "userId": "user-123",
  "preferences": {
    "isEnabled": true,
    "minCriticality": "LOW",
    "channels": {
      "IN_APP": { "enabled": true, "onlyWhenOffline": false },
      "EMAIL": { "enabled": true, "onlyWhenOffline": false, "digestEnabled": true, "digestFrequency": "DAILY" },
      "PUSH": { "enabled": true, "onlyWhenOffline": true },
      "SMS": { "enabled": false },
      "WHATSAPP": { "enabled": false },
      "VOICE": { "enabled": false }
    },
    "quietHours": {
      "enabled": true,
      "timezone": "Europe/Paris",
      "schedules": [
        { "days": [0,1,2,3,4,5,6], "start": "22:00", "end": "08:00" }
      ],
      "allowCritical": true
    },
    "eventOverrides": [
      { "eventType": "task.assigned", "channels": ["IN_APP", "PUSH"] },
      { "eventCategory": "INCIDENTS", "minCriticality": "HIGH" }
    ]
  }
}
```

```typescript
// Update user preferences
PUT /api/v1/preferences/user/user-123
{
  "channels": {
    "SMS": { "enabled": true }
  },
  "quietHours": {
    "enabled": true,
    "schedules": [
      { "days": [1,2,3,4,5], "start": "18:00", "end": "09:00" }
    ]
  }
}
```

---

## 14. UI Views

### 14.1 UI Component Structure

```
src/renderer/components/notifications/
├── NotificationCenter/
│   ├── NotificationCenter.tsx       # Main notification inbox
│   ├── NotificationList.tsx         # Notification list with filters
│   ├── NotificationItem.tsx         # Individual notification item
│   ├── NotificationFilters.tsx      # Filter controls
│   └── NotificationEmpty.tsx        # Empty state
│
├── NotificationBell/
│   ├── NotificationBell.tsx         # Header bell icon with badge
│   └── NotificationPopover.tsx      # Quick notifications popover
│
├── NotificationToast/
│   ├── NotificationToast.tsx        # Toast notification component
│   └── ToastContainer.tsx           # Toast positioning container
│
├── Preferences/
│   ├── NotificationPreferences.tsx  # User preferences page
│   ├── ChannelPreferences.tsx       # Per-channel settings
│   ├── EventPreferences.tsx         # Per-event type settings
│   └── QuietHoursSettings.tsx       # Quiet hours configuration
│
└── Admin/
    ├── NotificationDashboard.tsx    # Admin overview dashboard
    ├── TemplateManager.tsx          # Template CRUD
    ├── TemplateEditor.tsx           # Template editing with preview
    ├── ProviderConfig.tsx           # Provider configuration
    ├── ChannelConfig.tsx            # Channel settings
    ├── DeliveryStats.tsx            # Delivery statistics
    └── AuditLog.tsx                 # Audit log viewer
```

### 14.2 Notification Center

```tsx
interface NotificationCenterProps {
  userId: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>({
    status: 'all',
    category: null,
    dateRange: 'week'
  });
  const [loading, setLoading] = useState(true);

  return (
    <div className="notification-center">
      <header className="notification-center__header">
        <h1>Notifications</h1>
        <div className="notification-center__actions">
          <Button variant="ghost" onClick={markAllAsRead}>
            Mark all as read
          </Button>
          <Button variant="ghost" onClick={() => navigate('/settings/notifications')}>
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </header>

      <NotificationFilters 
        filters={filters} 
        onChange={setFilters} 
      />

      <div className="notification-center__content">
        {loading ? (
          <NotificationSkeleton count={5} />
        ) : notifications.length === 0 ? (
          <NotificationEmpty filters={filters} />
        ) : (
          <NotificationList 
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onNotificationAction={handleNotificationAction}
          />
        )}
      </div>
    </div>
  );
};
```

### 14.3 User Preferences UI

```tsx
const NotificationPreferences: React.FC = () => {
  const { preferences, updatePreferences, loading } = useNotificationPreferences();

  return (
    <div className="notification-preferences">
      <h1>Notification Preferences</h1>
      
      {/* Global Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Switch
            checked={preferences.isEnabled}
            onCheckedChange={(enabled) => updatePreferences({ isEnabled: enabled })}
            label="Enable notifications"
          />
        </CardContent>
      </Card>

      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelPreferences
            channels={preferences.channels}
            onChange={(channels) => updatePreferences({ channels })}
          />
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Set times when non-critical notifications are held</CardDescription>
        </CardHeader>
        <CardContent>
          <QuietHoursSettings
            quietHours={preferences.quietHours}
            onChange={(quietHours) => updatePreferences({ quietHours })}
          />
        </CardContent>
      </Card>

      {/* Event-specific Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Event Preferences</CardTitle>
          <CardDescription>Customize notifications for specific events</CardDescription>
        </CardHeader>
        <CardContent>
          <EventPreferences
            overrides={preferences.eventOverrides}
            onChange={(overrides) => updatePreferences({ eventOverrides: overrides })}
          />
        </CardContent>
      </Card>
    </div>
  );
};
```

### 14.4 Admin Template Editor

```tsx
const TemplateEditor: React.FC<{ templateId?: string }> = ({ templateId }) => {
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [activeChannel, setActiveChannel] = useState<NotificationChannel>('EMAIL');
  const [activeLocale, setActiveLocale] = useState('en');
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  return (
    <div className="template-editor">
      <div className="template-editor__sidebar">
        {/* Template Info */}
        <Card>
          <CardContent>
            <Input
              label="Template Code"
              value={template?.code}
              onChange={(e) => updateTemplate({ code: e.target.value })}
            />
            <Input
              label="Name"
              value={template?.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
            />
            <Select
              label="Default Criticality"
              value={template?.defaultCriticality}
              options={criticalityOptions}
              onChange={(value) => updateTemplate({ defaultCriticality: value })}
            />
          </CardContent>
        </Card>

        {/* Channel Tabs */}
        <Tabs value={activeChannel} onValueChange={setActiveChannel}>
          <TabsList>
            {channels.map(channel => (
              <TabsTrigger key={channel} value={channel}>
                {channelIcons[channel]} {channel}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Locale Selector */}
        <Select
          label="Locale"
          value={activeLocale}
          options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'French' }]}
          onChange={setActiveLocale}
        />
      </div>

      <div className="template-editor__main">
        {/* Content Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Content ({activeChannel} - {activeLocale})</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateContentEditor
              channel={activeChannel}
              locale={activeLocale}
              content={getChannelContent(template, activeChannel, activeLocale)}
              onChange={(content) => updateChannelContent(activeChannel, activeLocale, content)}
            />
          </CardContent>
        </Card>

        {/* Available Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <VariableList eventType={template?.eventType} />
          </CardContent>
        </Card>
      </div>

      <div className="template-editor__preview">
        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewDataEditor
              data={previewData}
              onChange={setPreviewData}
            />
            <TemplatePreview
              template={template}
              channel={activeChannel}
              locale={activeLocale}
              data={previewData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

---

## 15. Webhook Integration

### 15.1 CloudEvents Format

Following CloudEvents specification for webhook payloads:

```typescript
interface CloudEvent {
  specversion: '1.0';
  type: string;                    // e.g., 'io.coder.notification.delivered'
  source: string;                  // e.g., '/notification-manager'
  id: string;                      // Unique event ID
  time: string;                    // ISO 8601 timestamp
  datacontenttype: 'application/json';
  data: Record<string, unknown>;
  
  // Extensions
  organizationid?: string;
  correlationid?: string;
}

// Example outgoing webhook payload
const webhookPayload: CloudEvent = {
  specversion: '1.0',
  type: 'io.coder.notification.delivered',
  source: '/notification-manager',
  id: 'evt-uuid-123',
  time: '2026-01-20T10:30:00Z',
  datacontenttype: 'application/json',
  organizationid: 'org-123',
  data: {
    notificationId: 'notif-uuid',
    eventType: 'task.assigned',
    recipientId: 'user-123',
    channel: 'EMAIL',
    deliveryStatus: 'DELIVERED',
    timestamp: '2026-01-20T10:30:00Z'
  }
};
```

### 15.2 Incoming Webhook Handler

```typescript
class IncomingWebhookHandler {
  /**
   * Process incoming webhook to trigger notification
   */
  async handleWebhook(
    webhookId: string,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    // 1. Validate webhook exists and is active
    const webhook = await this.getWebhook(webhookId);
    if (!webhook || !webhook.isActive) {
      throw new NotFoundError('Webhook not found or inactive');
    }
    
    // 2. Validate signature
    await this.validateSignature(webhook, payload, headers);
    
    // 3. Parse and validate payload
    const event = this.parsePayload(payload, webhook);
    
    // 4. Create notification event
    await this.rabbitMQ.publish('notification.events', {
      type: event.eventType,
      category: event.category || 'SYSTEM_ADMIN',
      recipientIds: event.recipientIds,
      data: event.data,
      organizationId: webhook.organizationId,
      source: 'webhook',
      webhookId: webhook.id
    });
    
    // 5. Audit log
    await this.auditLogger.log({
      eventType: 'WEBHOOK_RECEIVED',
      webhookId: webhook.id,
      details: { eventType: event.eventType, recipientCount: event.recipientIds.length }
    });
    
    return { success: true, eventId: event.id };
  }
  
  private async validateSignature(
    webhook: Webhook,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<void> {
    if (webhook.authType === 'HMAC_SHA256') {
      const secret = await this.secretService.getProviderSecret(webhook.authSecretId);
      const signature = headers['x-webhook-signature'] || headers['x-hub-signature-256'];
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expectedSignature}`)
      )) {
        throw new UnauthorizedError('Invalid webhook signature');
      }
    }
  }
}
```

### 15.3 Outgoing Webhook Service

```typescript
class OutgoingWebhookService {
  /**
   * Send webhook to external system
   */
  async sendWebhook(
    webhook: Webhook,
    event: NotificationEvent
  ): Promise<WebhookDeliveryResult> {
    // Build CloudEvents payload
    const payload = this.buildCloudEvent(event, webhook);
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/cloudevents+json',
      'User-Agent': 'Coder-Notification-Manager/1.0'
    };
    
    // Add authentication
    if (webhook.authType !== 'NONE') {
      await this.addAuthHeaders(headers, webhook);
    }
    
    // Add signature
    const signature = this.generateSignature(payload, webhook);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
    
    // Send with retry
    try {
      const response = await this.httpClient.post(webhook.url, payload, {
        headers,
        timeout: 30000
      });
      
      await this.recordSuccess(webhook);
      
      return {
        success: true,
        statusCode: response.status,
        responseTime: response.duration
      };
    } catch (error) {
      await this.recordFailure(webhook, error);
      
      if (webhook.retryEnabled) {
        await this.scheduleRetry(webhook, event, error);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

## 16. Implementation Guidelines

### 16.1 Implementation Phases

| Phase | Scope | Duration |
|-------|-------|----------|
| **Phase 1** | Core Infrastructure | 2-3 weeks |
| **Phase 2** | In-App & Email Channels | 2 weeks |
| **Phase 3** | Push & SMS Channels | 2 weeks |
| **Phase 4** | Preferences & Templates | 2 weeks |
| **Phase 5** | Escalation & Fallback | 1-2 weeks |
| **Phase 6** | WhatsApp & Voice | 1-2 weeks |
| **Phase 7** | Webhooks | 1 week |
| **Phase 8** | Admin UI | 2 weeks |
| **Phase 9** | Testing & Polish | 2 weeks |

### 16.2 Phase 1: Core Infrastructure

```
Tasks:
- [ ] Set up notification-manager container (Docker, docker-compose)
- [ ] Configure Cosmos DB connection
- [ ] Set up RabbitMQ connection (consumer)
- [ ] Implement basic Prisma schema
- [ ] Create event consumer framework
- [ ] Set up Fastify admin API
- [ ] Implement health check endpoints
- [ ] Create Secret Management integration client
- [ ] Set up logging and monitoring
```

### 16.3 Phase 2: In-App & Email

```
Tasks:
- [ ] Implement In-App notification payload builder
- [ ] Set up RabbitMQ publisher for main app WebSocket
- [ ] Implement Email provider abstraction
- [ ] Add SendGrid provider implementation
- [ ] Add SMTP provider implementation
- [ ] Create basic template engine
- [ ] Implement delivery tracking
- [ ] Add retry mechanism
- [ ] Create Notification Center UI component
- [ ] Create notification bell/badge component
```

### 16.4 Technology Stack

```yaml
# notification-manager/docker-compose.yml
version: '3.8'
services:
  notification-manager:
    build: .
    ports:
      - "3001:3001"
    environment:
      - COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_MANAGEMENT_URL=http://secret-management:3002
      - REDIS_URL=redis://redis:6379
    depends_on:
      - notification-db
      - rabbitmq
      - redis

  notification-db:
    # Cosmos DB is a managed service, no local container needed
    # Connection string is provided via environment variable

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  notification-data:
```

### 16.5 RabbitMQ Queue Configuration

```typescript
// Queue definitions
const queues = {
  // Main event queue
  'notification.events': {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'notification.dlx',
      'x-dead-letter-routing-key': 'notification.dlq'
    }
  },
  
  // Retry queue with delay
  'notification.retry': {
    durable: true,
    arguments: {
      'x-message-ttl': 60000, // 1 minute default
      'x-dead-letter-exchange': 'notification.events'
    }
  },
  
  // Dead letter queue
  'notification.dlq': {
    durable: true
  },
  
  // In-app delivery queue (to main app)
  'notification.inapp.deliver': {
    durable: true
  },
  
  // Scheduled/digest processing
  'notification.scheduled': {
    durable: true
  }
};

// Exchange definitions
const exchanges = {
  'notification.events': { type: 'topic', durable: true },
  'notification.dlx': { type: 'direct', durable: true }
};
```

### 16.6 Performance Considerations

| Aspect | Recommendation |
|--------|----------------|
| **Message Processing** | Use prefetch limit (e.g., 10) to control concurrency |
| **Database** | Index on frequently queried fields; use connection pooling |
| **Caching** | Cache templates, preferences in Redis (TTL: 5 min) |
| **Provider Calls** | Use circuit breaker pattern; timeout: 30s |
| **Batch Processing** | Process digests in batches of 100 |
| **Scaling** | Horizontal scaling via multiple consumer instances |

### 16.7 Monitoring & Alerting

```typescript
// Key metrics to track
const metrics = {
  // Counters
  'notifications.created': Counter,
  'notifications.delivered': Counter,
  'notifications.failed': Counter,
  'deliveries.by_channel': Counter,
  'deliveries.by_provider': Counter,
  
  // Histograms
  'delivery.latency': Histogram,
  'provider.response_time': Histogram,
  
  // Gauges
  'queue.depth': Gauge,
  'active.escalations': Gauge,
  'held.notifications': Gauge
};

// Alerts
const alerts = [
  { name: 'HighFailureRate', condition: 'failure_rate > 5%', severity: 'warning' },
  { name: 'QueueBacklog', condition: 'queue_depth > 10000', severity: 'warning' },
  { name: 'ProviderDown', condition: 'health_status = unhealthy', severity: 'critical' },
  { name: 'EscalationTriggered', condition: 'escalation_level >= 2', severity: 'warning' }
];
```

---

## Summary

The Notification Manager module provides:

1. **Multi-Channel Delivery**: In-App, Email, Push, SMS, WhatsApp, Voice
2. **Provider Abstraction**: Easy switching between providers (SendGrid, Twilio, FCM, etc.)
3. **Event-Driven Architecture**: RabbitMQ-based decoupled communication
4. **Intelligent Routing**: Presence-aware, preference-based delivery
5. **Reliability**: Retry, deduplication, rate limiting, circuit breaker
6. **Escalation & Fallback**: Automatic escalation chains for critical notifications
7. **Template System**: Multi-language, dynamic templates with rich content
8. **Hierarchical Preferences**: Global → Organization → Team → Project → User
9. **Quiet Hours/DND**: Configurable hold periods with critical override
10. **Webhook Integration**: CloudEvents-based incoming/outgoing webhooks
11. **Secret Management Integration**: Secure credential storage via Secret Management module
12. **Comprehensive UI**: Notification Center, Preferences, Admin Dashboard

---

**Related Documents:**
- [Part 1: Overview, Architecture, Data Models, Channels, Events, Providers](./notification-manager-specification-part1.md)
- [Part 2: Delivery Engine, Templates, Preferences, Escalation, Quiet Hours](./notification-manager-specification-part2.md)


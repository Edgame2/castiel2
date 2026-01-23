# Email Management Notification Integration

## Overview

The Email Management System integrates directly with the Notification System to enable email notifications. When notifications are created with email support, the system uses email templates to render and send emails to users.

---

## Table of Contents

1. [Direct Integration](#direct-integration)
2. [Usage Patterns](#usage-patterns)
3. [Template Categories](#template-categories)
4. [Language Handling](#language-handling)
5. [Placeholder Mapping](#placeholder-mapping)
6. [Error Handling](#error-handling)

---

## Direct Integration

### Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│           NotificationService                           │
│                                                          │
│  createSystemNotification({                            │
│    ...notificationFields,                               │
│    emailTemplate: {                                    │
│      templateName: 'welcome-email',                     │
│      language: 'en',                                    │
│      placeholders: { ... }                              │
│    }                                                    │
│  })                                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           EmailTemplateService                         │
│                                                          │
│  1. Get template by name and language                  │
│  2. Render template with placeholders                  │
│  3. Get email provider                                 │
│  4. Send email via provider                             │
└─────────────────────────────────────────────────────────┘
```

### NotificationService Integration

The `NotificationService` uses `EmailTemplateService` when email templates are specified:

```typescript
import { NotificationService } from '@/services/notification.service';
import { EmailTemplateService } from '@/services/email-template.service';

class NotificationService {
  private emailTemplateService: EmailTemplateService;

  async createSystemNotification(params: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    name: string;
    content: string;
    emailTemplate?: {
      templateName: string;
      language?: string;
      placeholders: Record<string, any>;
    };
    // ... other notification fields
  }): Promise<Notification> {
    // Create notification
    const notification = await this.createNotification(params);

    // Send email if template specified
    if (params.emailTemplate) {
      await this.sendEmailNotification(
        params.userId,
        params.emailTemplate,
        notification
      );
    }

    return notification;
  }

  private async sendEmailNotification(
    userId: string,
    emailTemplate: EmailTemplateConfig,
    notification: Notification
  ): Promise<void> {
    try {
      // Get user to determine language preference
      const user = await this.userService.getUser(userId);
      const language = emailTemplate.language || user.preferredLanguage || 'en';

      // Get template
      const template = await this.emailTemplateService.getTemplateByLanguage(
        emailTemplate.templateName,
        language,
        notification.tenantId
      );

      // Render template
      const rendered = await this.emailTemplateService.renderTemplate(
        template,
        emailTemplate.placeholders
      );

      // Get user email
      const userEmail = user.email;

      // Send email
      await this.emailTemplateService.sendEmail({
        template,
        rendered,
        to: userEmail,
        tenantId: notification.tenantId
      });
    } catch (error) {
      // Log error but don't fail notification creation
      console.error('Failed to send email notification:', error);
      // Optionally create error notification
    }
  }
}
```

---

## Usage Patterns

### Pattern 1: Simple Email Notification

```typescript
await notificationService.createSystemNotification({
  tenantId: user.tenantId,
  userId: user.id,
  type: 'information',
  name: 'Welcome',
  content: 'Welcome to the platform!',
  emailTemplate: {
    templateName: 'welcome-email',
    placeholders: {
      userName: user.name,
      tenantName: tenant.name,
      loginUrl: `${baseUrl}/login`
    }
  }
});
```

### Pattern 2: Email with Explicit Language

```typescript
await notificationService.createSystemNotification({
  tenantId: user.tenantId,
  userId: user.id,
  type: 'alert',
  name: 'Security Alert',
  content: 'Your account has been accessed from a new device.',
  emailTemplate: {
    templateName: 'security-alert',
    language: 'fr', // Force French language
    placeholders: {
      userName: user.name,
      deviceInfo: deviceInfo,
      timestamp: new Date().toISOString(),
      actionUrl: `${baseUrl}/security`
    }
  }
});
```

### Pattern 3: Bulk Email Notifications

```typescript
// Send to multiple users
const users = await getUsersByTenant(tenantId);

for (const user of users) {
  await notificationService.createSystemNotification({
    tenantId: user.tenantId,
    userId: user.id,
    type: 'information',
    name: 'System Update',
    content: 'A new system update is available.',
    emailTemplate: {
      templateName: 'system-update',
      placeholders: {
        userName: user.name,
        updateDetails: updateDetails,
        releaseNotesUrl: `${baseUrl}/releases/${version}`
      }
    }
  });
}
```

### Pattern 4: Conditional Email Notification

```typescript
// Only send email if user has email notifications enabled
const userPreferences = await getUserPreferences(userId);

if (userPreferences.emailNotifications) {
  await notificationService.createSystemNotification({
    tenantId: user.tenantId,
    userId: user.id,
    type: 'success',
    name: 'Task Completed',
    content: 'Your task has been completed.',
    emailTemplate: {
      templateName: 'task-completed',
      placeholders: {
        userName: user.name,
        taskName: task.name,
        taskUrl: `${baseUrl}/tasks/${task.id}`
      }
    }
  });
} else {
  // Create notification without email
  await notificationService.createSystemNotification({
    tenantId: user.tenantId,
    userId: user.id,
    type: 'success',
    name: 'Task Completed',
    content: 'Your task has been completed.'
    // No emailTemplate
  });
}
```

---

## Template Categories

### Notification Categories

Templates are organized by category for different notification types:

#### `notifications`

General notification emails for standard system notifications.

**Example Templates**:
- `welcome-email` - Welcome new users
- `task-assigned` - Task assignment notifications
- `document-shared` - Document sharing notifications

**Usage**:
```typescript
emailTemplate: {
  templateName: 'task-assigned',
  category: 'notifications',
  placeholders: {
    userName: user.name,
    taskName: task.name,
    assignerName: assigner.name
  }
}
```

#### `alerts`

Alert/urgent notification emails for important system events.

**Example Templates**:
- `security-alert` - Security-related alerts
- `system-alert` - System-wide alerts
- `billing-alert` - Billing and subscription alerts

**Usage**:
```typescript
emailTemplate: {
  templateName: 'security-alert',
  category: 'alerts',
  placeholders: {
    userName: user.name,
    alertType: 'new-device',
    actionRequired: true
  }
}
```

#### `invitations`

User invitation emails for inviting new users to the platform.

**Example Templates**:
- `user-invitation` - Invite new users
- `tenant-invitation` - Invite to tenant
- `role-invitation` - Invite with specific role

**Usage**:
```typescript
emailTemplate: {
  templateName: 'user-invitation',
  category: 'invitations',
  placeholders: {
    inviterName: inviter.name,
    tenantName: tenant.name,
    invitationUrl: invitationUrl,
    expiresAt: invitation.expiresAt
  }
}
```

#### `system`

System-generated emails for automated system communications.

**Example Templates**:
- `password-reset` - Password reset emails
- `email-verification` - Email verification
- `system-maintenance` - Maintenance notifications

**Usage**:
```typescript
emailTemplate: {
  templateName: 'password-reset',
  category: 'system',
  placeholders: {
    userName: user.name,
    resetUrl: resetUrl,
    expiresAt: resetToken.expiresAt
  }
}
```

---

## Language Handling

### Automatic Language Detection

The system automatically uses the user's preferred language:

```typescript
// Get user's preferred language
const user = await getUser(userId);
const language = user.preferredLanguage || 'en';

// Get template in user's language
const template = await emailTemplateService.getTemplateByLanguage(
  templateName,
  language,
  tenantId
);
```

### Language Fallback

If the requested language is not available, the system falls back to English:

```typescript
// Try user's language first
let template = await getTemplateByLanguage(templateName, userLanguage, tenantId);

// Fallback to English if not found
if (!template && userLanguage !== 'en') {
  template = await getTemplateByLanguage(templateName, 'en', tenantId);
}
```

### Explicit Language Override

You can override the user's language preference:

```typescript
emailTemplate: {
  templateName: 'welcome-email',
  language: 'fr', // Force French, regardless of user preference
  placeholders: { ... }
}
```

---

## Placeholder Mapping

### Common Placeholders

Standard placeholders available across notification types:

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `userName` | User's full name | "John Doe" |
| `userEmail` | User's email address | "john@example.com" |
| `tenantName` | Tenant organization name | "Acme Corp" |
| `baseUrl` | Application base URL | "https://app.castiel.io" |
| `timestamp` | Current timestamp | "2024-01-15T10:30:00Z" |

### Notification-Specific Placeholders

Placeholders specific to notification types:

#### Task Notifications

```typescript
{
  taskName: "Complete project proposal",
  taskId: "task-123",
  taskUrl: "https://app.castiel.io/tasks/task-123",
  assignerName: "Jane Smith",
  dueDate: "2024-01-20"
}
```

#### Security Alerts

```typescript
{
  alertType: "new-device",
  deviceInfo: "Chrome on Windows",
  ipAddress: "192.168.1.1",
  location: "New York, US",
  actionUrl: "https://app.castiel.io/security"
}
```

#### Invitations

```typescript
{
  inviterName: "Admin User",
  invitationUrl: "https://app.castiel.io/invite/abc123",
  expiresAt: "2024-01-22T10:30:00Z",
  roleName: "Member"
}
```

---

## Error Handling

### Template Not Found

```typescript
try {
  await sendEmailNotification(/* ... */);
} catch (error) {
  if (error.code === 'TEMPLATE_NOT_FOUND') {
    // Log error and continue without email
    console.error('Email template not found, notification created without email');
    // Notification is still created
  }
}
```

### Template Rendering Error

```typescript
try {
  const rendered = await renderTemplate(template, placeholders);
} catch (error) {
  if (error.code === 'MISSING_REQUIRED_PLACEHOLDER') {
    // Log missing placeholder
    console.error('Missing required placeholder:', error.placeholder);
    // Use default value or skip email
  }
}
```

### Email Send Failure

```typescript
try {
  await sendEmail(/* ... */);
} catch (error) {
  // Log error but don't fail notification
  console.error('Email send failed:', error);
  // Notification is still created in system
  // User can view notification in UI
}
```

### Provider Unavailable

```typescript
// Check provider availability before sending
const provider = await getEmailProvider(providerId);
if (provider.status !== 'active') {
  // Skip email, create notification only
  console.warn('Email provider unavailable, skipping email');
}
```

---

## Best Practices

### 1. Always Provide Fallback

```typescript
// Always create notification even if email fails
try {
  await sendEmailNotification(/* ... */);
} catch (error) {
  // Notification already created, just log error
  console.error('Email failed:', error);
}
```

### 2. Use Appropriate Categories

```typescript
// Use correct category for template
emailTemplate: {
  templateName: 'security-alert',
  category: 'alerts', // Not 'notifications'
  // ...
}
```

### 3. Provide All Required Placeholders

```typescript
// Check template requirements before sending
const template = await getTemplate(templateName);
const requiredPlaceholders = template.placeholders
  .filter(p => p.required)
  .map(p => p.name);

// Validate all required placeholders are provided
for (const placeholder of requiredPlaceholders) {
  if (!placeholders[placeholder]) {
    throw new Error(`Missing required placeholder: ${placeholder}`);
  }
}
```

### 4. Handle Language Gracefully

```typescript
// Always provide fallback language
const language = userLanguage || 'en';
const template = await getTemplateByLanguage(templateName, language, tenantId);
if (!template) {
  // Fallback to English
  template = await getTemplateByLanguage(templateName, 'en', tenantId);
}
```

---

## Related Documentation

- [Notifications System](../notifications/README.md) - Notification system overview
- [Email Templates README](./README.md) - Email management overview
- [Template Rendering](./TEMPLATE-RENDERING.md) - Placeholder system
- [Multi-Language Support](./MULTI-LANGUAGE.md) - Language handling








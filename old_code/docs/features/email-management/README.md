# Email Management System

## Overview

The Email Management System enables super admins to create and manage reusable email templates with placeholder support and multi-language capabilities. Templates are stored in a dedicated Cosmos DB container and integrate with the integration system to use configured email providers for sending emails. The notification system directly uses these templates when sending email notifications.

**Key Features**:
- **Super Admin Management**: Only super admins can create and manage email templates
- **Multi-Language Support**: Separate template documents per language with automatic fallback
- **Placeholder System**: Mustache-style placeholders ({{variableName}}) for dynamic content
- **TipTap WYSIWYG Editor**: Rich text editing with email-safe HTML generation
- **HTML and Text Multipart**: Both HTML and plain text versions for maximum compatibility
- **Integration-Based Providers**: Leverages integration system for email provider configuration
- **Direct Notification Integration**: Notification system uses templates for email sending
- **Template Categorization**: Organize templates by use case (notifications, invitations, alerts, etc.)

## Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Database Implementation](./DATABASE-IMPLEMENTATION.md)
4. [Integration System](./INTEGRATION-SYSTEM.md)
5. [Notification Integration](./NOTIFICATION-INTEGRATION.md)
6. [API Reference](./API-IMPLEMENTATION.md)
7. [Template Rendering](./TEMPLATE-RENDERING.md)
8. [UI Implementation](./UI-IMPLEMENTATION.md)
9. [Service Implementation](./SERVICE-IMPLEMENTATION.md)
10. [Multi-Language Support](./MULTI-LANGUAGE.md)
11. [TipTap Editor](./TIPTAP-EDITOR.md)

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Email Management System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Super      │      │   Email      │      │ Integration  │  │
│  │   Admin      │─────▶│   Template   │─────▶│   System     │  │
│  │   UI         │      │   Service    │      │  (Providers) │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              EmailTemplates Container                      │  │
│  │              (Cosmos DB - Partition: tenantId)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│                              │                                    │
│                              ▼                                    │
│                    ┌──────────────────┐                          │
│                    │  Notification    │                          │
│                    │  System          │                          │
│                    │  (Email Sending) │                          │
│                    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Email Management Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  TipTap Editor  │  │  Template       │                 │
│  │  (WYSIWYG)      │  │  Rendering      │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
│           │                     │                            │
│           ▼                     ▼                            │
│  ┌──────────────────────────────────────┐                   │
│  │      EmailTemplateService            │                   │
│  │  - createTemplate()                  │                   │
│  │  - renderTemplate()                  │                   │
│  │  - sendEmail()                       │                   │
│  └──────────────┬───────────────────────┘                   │
│                 │                                             │
│                 ▼                                             │
│  ┌──────────────────────────────────────┐                   │
│  │   EmailTemplateRepository            │                   │
│  │   (Cosmos DB Access)                 │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Integration System (Email Providers)            │
│  - Azure Communication Services                             │
│  - SendGrid                                                  │
│  - Mailgun                                                   │
│  - SMTP                                                      │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize Database Container

```bash
# Run the container initialization script
npx tsx apps/api/src/scripts/init-email-templates-container.ts
```

### 2. Create Your First Template

As a super admin, navigate to `/admin/email-templates/new` and:

1. **Basic Information**:
   - Name: `welcome-email`
   - Display Name: `Welcome Email`
   - Category: `notifications`
   - Language: `en` (English)

2. **Email Content**:
   - Subject: `Welcome to {{tenantName}}!`
   - HTML Body: Use TipTap editor to create rich content
   - Text Body: Plain text version

3. **Placeholders**:
   - Define placeholders like `userName`, `tenantName`, `loginUrl`

4. **Save**: Template is now available for use

### 3. Use Template in Notifications

```typescript
import { NotificationService } from '@/services/notification.service';

await notificationService.createSystemNotification({
  tenantId: user.tenantId,
  userId: user.id,
  type: 'information',
  name: 'Welcome',
  content: 'Welcome to the platform!',
  emailTemplate: {
    templateName: 'welcome-email',
    language: user.preferredLanguage || 'en',
    placeholders: {
      userName: user.name,
      tenantName: tenant.name,
      loginUrl: `${baseUrl}/login`
    }
  }
});
```

### 4. Add Language Variants

1. Navigate to template edit page
2. Click "Add Language" or use language tabs
3. Create French version: `welcome-email-fr`
4. Translate content while keeping same placeholders

## Key Concepts

### Templates

Email templates are reusable email structures with placeholders that can be dynamically filled when sending emails. Each template has:

- **Unique Name**: Identifier (e.g., `welcome-email`)
- **Language**: ISO 639-1 code (e.g., `en`, `fr`, `de`)
- **Category**: Organization (e.g., `notifications`, `invitations`, `alerts`)
- **Content**: Subject, HTML body, and text body
- **Placeholders**: Defined variables that can be replaced

### Placeholders

Placeholders use Mustache syntax: `{{variableName}}`

- Simple: `{{userName}}`
- Nested: `{{user.profile.name}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`

### Multi-Language

- Each language is a separate template document
- English (`en`) is the default fallback language
- System automatically falls back if user's language is unavailable
- Templates can be created all at once or one language at a time

### Email Providers

Email providers are configured through the integration system:

- Templates can specify a specific provider
- If not specified, uses tenant's default email provider
- Supports multiple providers: Azure ACS, SendGrid, Mailgun, SMTP

## Related Documentation

- [Database Implementation](./DATABASE-IMPLEMENTATION.md) - Container schema and query patterns
- [Integration System](./INTEGRATION-SYSTEM.md) - Email provider integration
- [Notification Integration](./NOTIFICATION-INTEGRATION.md) - How notifications use templates
- [API Reference](./API-IMPLEMENTATION.md) - REST API endpoints
- [Template Rendering](./TEMPLATE-RENDERING.md) - Placeholder system and rendering
- [UI Implementation](./UI-IMPLEMENTATION.md) - Frontend components and pages
- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Backend service layer
- [Multi-Language Support](./MULTI-LANGUAGE.md) - Multi-language template management
- [TipTap Editor](./TIPTAP-EDITOR.md) - WYSIWYG editor documentation

## Related Systems

- [Notifications System](../notifications/README.md) - Notification system that uses email templates
- [Integrations System](../integrations/README.md) - Integration system for email providers
- [Container Architecture](../ai-insights/CONTAINER-ARCHITECTURE.md) - HPK container patterns

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Email management system fully implemented

#### Implemented Features (✅)

- ✅ Email template management
- ✅ Placeholder system (Mustache-style)
- ✅ Multi-language support
- ✅ TipTap WYSIWYG editor
- ✅ HTML and text multipart
- ✅ Integration with notification system
- ✅ Integration with email providers
- ✅ Template categorization
- ✅ Super admin management UI

#### Known Limitations

- ⚠️ **Template Testing** - Template testing interface may not be fully implemented
- ⚠️ **Email Delivery Tracking** - Delivery tracking may be limited
- ⚠️ **Template Versioning** - Versioning may not be fully implemented

### Code References

- **Backend Services:**
  - `apps/api/src/services/email-template.service.ts` - Email template service
  - `apps/api/src/services/email-rendering.service.ts` - Email rendering service
  - `apps/api/src/repositories/email-template.repository.ts` - Email template repository

- **API Routes:**
  - `/api/v1/email-templates/*` - Email template management

- **Frontend:**
  - `apps/web/src/components/email-management/` - Email management UI

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Service implementation details
- [API Implementation](./API-IMPLEMENTATION.md) - API reference








# Notifications System

## Overview

The Notifications System is a global, application-wide service that manages all types of user notifications across the Castiel platform. It provides a unified infrastructure for displaying and storing notifications to users, with support for multiple notification types, translation, and real-time toast notifications.

**Key Features**:
- **Multiple Notification Types**: Success, Error, Warning, Information, Alert
- **Translation Support**: UI-based translation with English as default
- **Admin Creation**: Super admin and tenant admin can create notifications
- **User-Specific**: Users can only see their own notifications
- **Real-Time**: Toast notifications triggered when new notifications are created
- **Future-Ready**: Placeholder for email, Slack, Teams, and push notifications

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Notification Types](#notification-types)
4. [API Reference](#api-reference)
5. [Frontend Components](#frontend-components)
6. [Translation Support](#translation-support)
7. [Integration Points](#integration-points)
8. [Future Integrations](#future-integrations)

## Architecture

### Container Structure

- **Container Name**: `notifications`
- **Partition Key (HPK)**: `[tenantId, userId, id]` (Hierarchical Partition Key)
- **TTL**: 90 days (automatic expiration)
- **Indexing**: Optimized for queries by tenantId, userId, status, type, createdAt

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Notification System                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   System    │      │ Notification │      │   Real-Time  │  │
│  │   Service   │─────▶│   Service    │─────▶│   Service    │  │
│  │  (Any)      │      │   (Core)     │      │  (WebSocket) │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Notifications Container                      │  │
│  │              (Cosmos DB - HPK: tenantId/userId/id)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│                              │                                    │
│                              ▼                                    │
│                    ┌──────────────────┐                          │
│                    │  Frontend UI     │                          │
│                    │  - Toast         │                          │
│                    │  - List View      │                          │
│                    │  - Notification  │                          │
│                    │    Panel         │                          │
│                    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Notification Document

```typescript
interface Notification {
  id: string;                    // UUID
  tenantId: string;               // Tenant identifier
  userId: string;                 // Target user ID
  notificationId: string;         // Same as id (for HPK)
  
  // Core fields
  name: string;                   // Notification name/title
  content: string;                // Notification content/message
  link?: string;                  // Optional URL/link
  status: 'unread' | 'read';      // Read status
  
  // Type and metadata
  type: 'success' | 'error' | 'warning' | 'information' | 'alert';
  priority?: 'low' | 'medium' | 'high';  // Optional priority
  
  // Source information
  createdBy: {
    type: 'system' | 'super_admin' | 'tenant_admin';
    userId?: string;              // Admin user ID if created by admin
    name?: string;                 // Admin name for display
  };
  
  // Targeting (for admin-created notifications)
  targetType: 'user' | 'all_tenant' | 'all_system';
  targetUserIds?: string[];       // Specific user IDs (if targetType = 'user')
  
  // Translation
  // Note: Translation handled at UI level, content stored in English by default
  // UI will translate based on user language preference
  
  // Timestamps
  createdAt: string;               // ISO 8601
  readAt?: string;                 // When marked as read
  expiresAt?: string;             // TTL expiration (90 days from createdAt)
  
  // Metadata
  metadata?: {
    source?: string;               // Source system/feature (e.g., 'document_upload', 'integration_sync')
    relatedId?: string;            // Related resource ID
    [key: string]: any;            // Additional metadata
  };
}
```

### Container Configuration

```typescript
{
  id: 'notifications',
  partitionKey: {
    paths: ['/tenantId', '/userId', '/id'],
    kind: 'MultiHash',
    version: 2
  },
  defaultTtl: 7776000, // 90 days in seconds
  indexingPolicy: {
    indexingMode: 'consistent',
    automatic: true,
    includedPaths: [
      { path: '/tenantId/?' },
      { path: '/userId/?' },
      { path: '/status/?' },
      { path: '/type/?' },
      { path: '/createdAt/?' },
      { path: '/createdBy/type/?' }
    ],
    excludedPaths: [
      { path: '/content/?' },
      { path: '/metadata/*' }
    ]
  }
}
```

### Query Patterns

**Get user's notifications**:
```sql
SELECT * FROM c
WHERE c.tenantId = @tenantId
  AND c.userId = @userId
ORDER BY c.createdAt DESC
```

**Get unread notifications**:
```sql
SELECT * FROM c
WHERE c.tenantId = @tenantId
  AND c.userId = @userId
  AND c.status = 'unread'
ORDER BY c.createdAt DESC
```

**Get notifications by type**:
```sql
SELECT * FROM c
WHERE c.tenantId = @tenantId
  AND c.userId = @userId
  AND c.type = @type
ORDER BY c.createdAt DESC
```

## Notification Types

### Supported Types

| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `success` | Success notifications | ✓ | Green |
| `error` | Error notifications | ✗ | Red |
| `warning` | Warning notifications | ⚠ | Yellow |
| `information` | Informational notifications | ℹ | Blue |
| `alert` | Alert notifications | 🔔 | Orange |

### Type Configuration

```typescript
const notificationTypeConfig = {
  success: {
    icon: 'check-circle',
    color: '#10B981',
    defaultPriority: 'low'
  },
  error: {
    icon: 'x-circle',
    color: '#EF4444',
    defaultPriority: 'high'
  },
  warning: {
    icon: 'alert-triangle',
    color: '#F59E0B',
    defaultPriority: 'medium'
  },
  information: {
    icon: 'info',
    color: '#3B82F6',
    defaultPriority: 'low'
  },
  alert: {
    icon: 'bell',
    color: '#F97316',
    defaultPriority: 'high'
  }
};
```

## API Reference

### User Endpoints

#### GET /api/v1/notifications

Get user's notifications with pagination and filtering.

**Query Parameters**:
- `status` (optional): Filter by status (`unread` | `read`)
- `type` (optional): Filter by type (`success` | `error` | `warning` | `information` | `alert`)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```typescript
{
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  unreadCount: number;
}
```

#### GET /api/v1/notifications/:id

Get a specific notification by ID.

**Response**:
```typescript
Notification
```

#### PATCH /api/v1/notifications/:id

Update notification status.

**Request Body**:
```typescript
{
  status: 'read' | 'unread';
}
```

**Response**:
```typescript
Notification
```

#### DELETE /api/v1/notifications/:id

Delete a notification.

**Response**:
```typescript
{
  success: boolean;
}
```

#### POST /api/v1/notifications/mark-all-read

Mark all user's notifications as read.

**Response**:
```typescript
{
  count: number; // Number of notifications marked as read
}
```

#### GET /api/v1/notifications/unread-count

Get the count of unread notifications.

**Response**:
```typescript
{
  count: number;
}
```

### Admin Endpoints

#### POST /api/v1/admin/notifications

Create notification(s) as admin (super admin or tenant admin).

**Request Body**:
```typescript
{
  name: string;
  content: string;
  type: 'success' | 'error' | 'warning' | 'information' | 'alert';
  link?: string;
  priority?: 'low' | 'medium' | 'high';
  targetType: 'user' | 'all_tenant' | 'all_system';
  targetUserIds?: string[]; // Required if targetType = 'user'
  metadata?: Record<string, any>;
}
```

**Authorization**: Requires `super_admin` or `tenant_admin` role.

**Response**:
```typescript
{
  notifications: Notification[];
  count: number;
}
```

**Notes**:
- If `targetType = 'user'`, `targetUserIds` must be provided
- If `targetType = 'all_tenant'`, notifications are sent to all users in the tenant
- If `targetType = 'all_system'`, only super admin can use this (notifications sent to all users system-wide)

#### GET /api/v1/admin/notifications/stats

Get notification statistics for the tenant (optional endpoint).

**Response**:
```typescript
{
  totalSent: number;
  byType: Record<string, number>;
  byStatus: {
    unread: number;
    read: number;
  };
  avgDeliveryTime: number;
}
```

## Frontend Components

### Notification Bell

Header notification indicator with unread count badge.

**Location**: `apps/web/src/components/notifications/notification-bell.tsx`

**Features**:
- Bell icon with unread count badge
- Click to open notification panel
- Real-time count updates via WebSocket

### Notification Panel

Dropdown/panel component showing recent notifications.

**Location**: `apps/web/src/components/notifications/notification-panel.tsx`

**Features**:
- List of recent notifications (last 10)
- "Mark all as read" button
- "View all" link to full page
- Auto-refresh on new notifications

### Notification List

Full page list of all notifications.

**Location**: `apps/web/src/components/notifications/notification-list.tsx`

**Features**:
- Display list of notifications
- Filter by type, status
- Mark as read on click
- Delete notification
- Pagination
- Empty state

### Notification Item

Individual notification display component.

**Location**: `apps/web/src/components/notifications/notification-item.tsx`

**Features**:
- Type-based icon and color
- Name and content
- Link button (if link provided)
- Read/unread indicator
- Timestamp
- Delete button

### Admin Notification Creator

Form for admins to create notifications.

**Location**: `apps/web/src/components/notifications/admin/create-notification.tsx`

**Features**:
- Name field
- Content field (textarea)
- Type selector (Success, Error, Warning, Information, Alert)
- Link/URL field (optional)
- Target selection:
  - Radio: "Specific Users" vs "All Users in Tenant" vs "All Users (System-wide)"
  - User selector (if specific users)
- Submit button

## Translation Support

### Translation Strategy

Notifications are stored in English by default. Translation is handled at the UI level based on the user's language preference.

### Translation Keys

**Location**: `apps/web/src/locales/en/notifications.json`

```json
{
  "types": {
    "success": "Success",
    "error": "Error",
    "warning": "Warning",
    "information": "Information",
    "alert": "Alert"
  },
  "actions": {
    "markAsRead": "Mark as read",
    "markAllAsRead": "Mark all as read",
    "delete": "Delete",
    "viewAll": "View all notifications"
  },
  "empty": {
    "noNotifications": "No notifications",
    "noUnread": "No unread notifications"
  }
}
```

### Translation Hook

**Location**: `apps/web/src/hooks/use-notification-translation.ts`

The hook translates notification content based on user language preference:
- Checks user language preference
- Translates notification name and content
- Falls back to English if translation unavailable
- Uses existing i18n infrastructure (react-i18next)

## Integration Points

### Creating Notifications from Other Services

Other services can create notifications using the NotificationService:

```typescript
import { NotificationService } from '@/services/notification.service';

// In your service
const notificationService = new NotificationService();

await notificationService.createSystemNotification({
  tenantId: user.tenantId,
  userId: user.id,
  type: 'success',
  name: 'Document Uploaded',
  content: 'Your document has been successfully uploaded.',
  link: `/documents/${documentId}`,
  metadata: {
    source: 'document_upload',
    relatedId: documentId
  }
});
```

### System Notification Helper

**Location**: `apps/api/src/services/notification.service.ts`

```typescript
async createSystemNotification(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  name: string;
  content: string;
  link?: string;
  metadata?: Record<string, any>;
}): Promise<Notification>
```

This method can be called by other services (document upload, integration sync, etc.) to create system notifications.

## Future Integrations

The following integrations are planned for later stages:

### Email Notifications

- Send email notifications for important alerts
- Support HTML email templates
- Email digest mode (daily/weekly summaries)

### Slack Messages

- Leverage existing integrations system
- Send notifications to Slack channels
- Support Slack Block Kit formatting

### Teams Messages

- Leverage existing integrations system
- Send notifications to Teams channels
- Support Adaptive Cards formatting

### Push Notifications (PWA)

- Browser push notifications
- Mobile app push notifications
- Notification permissions handling

## Implementation Files

### Backend

- `apps/api/src/repositories/notification.repository.ts` - Repository layer
- `apps/api/src/services/notification.service.ts` - Business logic
- `apps/api/src/services/notification-realtime.service.ts` - WebSocket integration
- `apps/api/src/controllers/notification.controller.ts` - HTTP handlers
- `apps/api/src/routes/notification.routes.ts` - Route definitions
- `apps/api/src/types/notification.types.ts` - TypeScript interfaces
- `apps/api/src/validators/notification.validator.ts` - Request validation

### Frontend

- `apps/web/src/components/notifications/notification-list.tsx` - List component
- `apps/web/src/components/notifications/notification-item.tsx` - Item component
- `apps/web/src/components/notifications/notification-bell.tsx` - Bell indicator
- `apps/web/src/components/notifications/notification-panel.tsx` - Panel component
- `apps/web/src/components/notifications/admin/create-notification.tsx` - Admin form
- `apps/web/src/hooks/use-notifications.ts` - Notifications hook
- `apps/web/src/hooks/use-notification-translation.ts` - Translation hook
- `apps/web/src/lib/api/notifications.ts` - API client
- `apps/web/src/app/(protected)/notifications/page.tsx` - Full page view
- `apps/web/src/locales/en/notifications.json` - Translation keys

## Key Design Decisions

1. **Container Architecture**: Use dedicated `notifications` container (not shard types) for optimal performance and scalability
2. **HPK Structure**: `[tenantId, userId, id]` enables efficient user-scoped queries
3. **Translation**: UI-based translation (default English) - no multi-language storage needed initially
4. **TTL**: 90-day automatic expiration reduces storage costs
5. **Admin Targeting**: Support both specific users and bulk (all tenant/system-wide)
6. **Real-time**: WebSocket for immediate toast notifications, polling as fallback
7. **Future-Ready**: Placeholder interfaces for email, Slack, Teams, push notifications

## Related Documentation

- [Container Architecture](../ai-insights/CONTAINER-ARCHITECTURE.md) - HPK container patterns
- [Integrations System](../integrations/README.md) - For future Slack/Teams integration
- [API Documentation](../../api/README.md) - General API patterns

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Notification system fully implemented

#### Implemented Features (✅)

- ✅ Notification CRUD operations
- ✅ Multiple notification types
- ✅ Real-time toast notifications
- ✅ Notification preferences
- ✅ Notification digests
- ✅ HPK container architecture
- ✅ Translation support
- ✅ Admin notification creation
- ✅ User-specific notifications

#### Known Limitations

- ⚠️ **Future Integrations** - Email, Slack, Teams, and push notifications are placeholders
  - **Code Reference:**
    - Future integration interfaces documented but not implemented
  - **Recommendation:**
    1. Implement email notification integration
    2. Implement Slack/Teams integration
    3. Implement push notification support

### Code References

- **Backend Services:**
  - `apps/api/src/services/notification.service.ts` - Notification management (1,376 lines)
  - `apps/api/src/repositories/notification.repository.ts` - Notification repository
  - `apps/api/src/repositories/notification-preference.repository.ts` - Preference repository
  - `apps/api/src/repositories/notification-digest.repository.ts` - Digest repository

- **API Routes:**
  - `/api/v1/notifications/*` - Notification management

- **Frontend:**
  - `apps/web/src/components/notifications/` - Notification components (6 files)

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Email Management](../email-management/README.md) - Email template system

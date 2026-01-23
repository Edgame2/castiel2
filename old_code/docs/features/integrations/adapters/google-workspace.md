# Google Workspace Adapter

## Overview

The Google Workspace adapter enables bidirectional sync between Castiel and Google Workspace services. It supports OAuth 2.0 authentication and provides unified access to Gmail, Google Calendar, Google Drive, Google Contacts, Google Tasks, and Google Meet data.

---

## Configuration

### Provider Details

| Property | Value |
|----------|-------|
| Provider ID | `google_workspace` |
| Auth Type | OAuth 2.0 |
| API Version | Google Workspace APIs (various versions) |
| Base URL | `https://www.googleapis.com` |

### OAuth Configuration

```typescript
const googleWorkspaceOAuth = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  scopes: [
    // Gmail
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    
    // Calendar
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    
    // Drive
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    
    // Contacts
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/contacts',
    
    // Tasks
    'https://www.googleapis.com/auth/tasks',
    
    // People API (for user info)
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  responseType: 'code',
  grantType: 'authorization_code',
  pkce: true, // Recommended for security
  accessType: 'offline', // Required for refresh tokens
  prompt: 'consent' // Force consent screen to get refresh token
};
```

### Credential Management (Azure Key Vault)

This integration follows the tenant-based credential architecture. All credentials are stored securely in Azure Key Vault.

#### Credential Types

| Credential | Storage Location | Purpose |
|-----------|-----------------|---------|
| OAuth Client ID | Key Vault (system secret) | System-level Google OAuth app |
| OAuth Client Secret | Key Vault (system secret) | System-level Google OAuth app |
| Access Token | Key Vault (`tenant-{tenantId}-google-workspace-oauth`) | Per-tenant Google Workspace access |
| Refresh Token | Key Vault (`tenant-{tenantId}-google-workspace-oauth`) | Per-tenant token refresh |
| User Email | Key Vault (`tenant-{tenantId}-google-workspace-oauth`) | Connected Google account email |

#### How It Works

1. **System OAuth App**: A single Google OAuth application is created in Google Cloud Console and shared across all tenants. The client_id and client_secret are stored as system secrets in Key Vault.

2. **Per-Tenant Authorization**: When a tenant connects their Google Workspace account:
   - User is redirected to Google OAuth flow
   - After authorization, Google returns access_token, refresh_token, and user email
   - The `IntegrationConnectionService` encrypts and stores these in Key Vault
   - Key pattern: `tenant-{tenantId}-google-workspace-oauth`

3. **Token Usage**: When making API calls:
   - `IntegrationConnectionService.getAccessToken()` retrieves the encrypted token from Key Vault
   - Tokens are cached in Redis for performance
   - If a token is expired, it's automatically refreshed using the refresh token

4. **Token Revocation**: When a tenant disconnects:
   - Token is removed from Key Vault
   - Cache is invalidated
   - Optionally revoke token via Google API

#### Configuration

The following environment variables reference Key Vault secrets:

```bash
# These point to Key Vault secret names, not raw values
GOOGLE_WORKSPACE_CLIENT_ID=kv://castiel-keyvault/google-workspace-oauth-client-id
GOOGLE_WORKSPACE_CLIENT_SECRET=kv://castiel-keyvault/google-workspace-oauth-client-secret
```

> **Security Note**: Never store OAuth credentials in plain text or source control. All credentials must be managed through Azure Key Vault.

---

## Entity Mappings

### Google Workspace → Castiel Mappings

| Google Workspace Entity | Castiel ShardType | Description |
|------------------------|-------------------|-------------|
| Gmail Message | `c_note` (type: email) | Email messages and threads |
| Gmail Thread | `c_note` (type: email_thread) | Email conversation threads |
| Calendar Event | `c_note` (type: meeting) | Calendar events and meetings |
| Drive File | `c_document` | Files and documents |
| Google Doc | `c_document` | Google Docs documents |
| Google Sheet | `c_document` | Google Sheets spreadsheets |
| Google Slide | `c_document` | Google Slides presentations |
| Contact | `c_contact` | Google Contacts |
| Task | `c_note` (type: task) | Google Tasks |
| Meet Recording | `c_document` | Google Meet recordings (if available) |

### Detailed Entity Mappings

#### Gmail Message → c_note (email)

| Gmail Field | Castiel Field | Transform |
|-------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `threadId` | `structuredData.threadId` | Direct |
| `snippet` | `description` | Direct |
| `payload.headers` | `structuredData.headers` | Extract headers |
| `payload.body.data` | `content` | Base64 decode |
| `labelIds` | `tags` | Array of labels |
| `internalDate` | `createdAt` | Unix timestamp → Date |
| `sizeEstimate` | `structuredData.sizeBytes` | Direct |
| `historyId` | `structuredData.historyId` | For incremental sync |

#### Gmail Thread → c_note (email_thread)

| Gmail Field | Castiel Field | Transform |
|-------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `snippet` | `description` | Direct |
| `historyId` | `structuredData.historyId` | Direct |
| `messages[]` | `structuredData.messageIds` | Array of message IDs |
| `messages[].id` | Relationship to c_note (email) | Link to individual messages |

#### Calendar Event → c_note (meeting)

| Calendar Field | Castiel Field | Transform |
|----------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `summary` | `name` | Direct |
| `description` | `description` | Direct |
| `start.dateTime` | `structuredData.startTime` | ISO 8601 → Date |
| `end.dateTime` | `structuredData.endTime` | ISO 8601 → Date |
| `location` | `structuredData.location` | Direct |
| `attendees[]` | `structuredData.attendees` | Array of email addresses |
| `organizer.email` | `structuredData.organizer` | Direct |
| `hangoutLink` | `structuredData.meetUrl` | Direct |
| `recurrence` | `structuredData.recurrence` | RRULE string |
| `status` | `structuredData.status` | confirmed/tentative/cancelled |
| `created` | `createdAt` | ISO 8601 → Date |
| `updated` | `updatedAt` | ISO 8601 → Date |

#### Drive File → c_document

| Drive Field | Castiel Field | Transform |
|-------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `name` | `name` | Direct |
| `mimeType` | `structuredData.mimeType` | Direct |
| `size` | `structuredData.sizeBytes` | Direct |
| `webViewLink` | `structuredData.sourceUrl` | Direct |
| `webContentLink` | `structuredData.downloadUrl` | Direct |
| `createdTime` | `createdAt` | ISO 8601 → Date |
| `modifiedTime` | `updatedAt` | ISO 8601 → Date |
| `owners[].emailAddress` | `structuredData.ownerEmail` | First owner |
| `shared` | `structuredData.isShared` | Boolean |
| `parents[]` | `structuredData.parentFolderIds` | Array of folder IDs |
| `capabilities.canDownload` | `structuredData.canDownload` | Boolean |

#### Google Contact → c_contact

| Contact Field | Castiel Field | Transform |
|---------------|---------------|-----------|
| `resourceName` | `externalId` | Direct |
| `names[0].displayName` | `name` | Direct |
| `names[0].givenName` | `structuredData.firstName` | Direct |
| `names[0].familyName` | `structuredData.lastName` | Direct |
| `emailAddresses[0].value` | `structuredData.email` | First email |
| `phoneNumbers[0].value` | `structuredData.phone` | First phone |
| `organizations[0].name` | `structuredData.company` | First organization |
| `organizations[0].title` | `structuredData.title` | First job title |
| `addresses[0]` | `structuredData.address` | First address object |

#### Google Task → c_note (task)

| Task Field | Castiel Field | Transform |
|------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `title` | `name` | Direct |
| `notes` | `description` | Direct |
| `status` | `structuredData.status` | needsAction/completed |
| `due` | `structuredData.dueDate` | ISO 8601 → Date |
| `completed` | `structuredData.completedAt` | ISO 8601 → Date |
| `parent` | `structuredData.parentTaskId` | Direct |
| `position` | `structuredData.position` | Order in list |

---

## API Operations

### Gmail Operations

#### Fetch Messages

```typescript
// List messages with query filter
const result = await adapter.fetchRecords('gmail_message', {
  query: 'from:example@domain.com subject:meeting',
  limit: 100,
  cursor: 'nextPageToken',
  since: new Date('2025-01-01')
});

// Returns:
{
  records: [
    {
      id: 'message-id-123',
      threadId: 'thread-id-456',
      snippet: 'Email preview text...',
      headers: { from: '...', subject: '...', date: '...' },
      labelIds: ['INBOX', 'UNREAD'],
      internalDate: 1609459200000,
      sizeEstimate: 12345
    }
  ],
  hasMore: true,
  cursor: 'nextPageToken',
  totalCount: 500
}
```

#### Fetch Threads

```typescript
const result = await adapter.fetchRecords('gmail_thread', {
  query: 'is:unread',
  limit: 50
});
```

#### Get Message Content

```typescript
// Fetch full message with body
const message = await adapter.fetchRecords('gmail_message', {
  id: 'message-id-123',
  format: 'full' // Include body content
});
```

#### Send Email

```typescript
const result = await adapter.createRecord('gmail_message', {
  to: 'recipient@example.com',
  subject: 'Test Email',
  body: 'Email body text',
  bodyType: 'text', // or 'html'
  attachments: [
    {
      filename: 'document.pdf',
      content: base64EncodedContent,
      mimeType: 'application/pdf'
    }
  ]
});
```

#### Update Message (Labels)

```typescript
await adapter.updateRecord('gmail_message', 'message-id-123', {
  addLabelIds: ['IMPORTANT'],
  removeLabelIds: ['UNREAD']
});
```

### Calendar Operations

#### Fetch Events

```typescript
// List calendar events
const result = await adapter.fetchRecords('calendar_event', {
  calendarId: 'primary', // or specific calendar ID
  timeMin: new Date('2025-01-01'),
  timeMax: new Date('2025-12-31'),
  limit: 100,
  orderBy: 'startTime',
  singleEvents: true // Expand recurring events
});

// Returns:
{
  records: [
    {
      id: 'event-id-123',
      summary: 'Team Meeting',
      description: 'Weekly team sync',
      start: { dateTime: '2025-01-15T10:00:00Z' },
      end: { dateTime: '2025-01-15T11:00:00Z' },
      location: 'Conference Room A',
      attendees: [
        { email: 'user1@example.com', responseStatus: 'accepted' },
        { email: 'user2@example.com', responseStatus: 'tentative' }
      ],
      organizer: { email: 'organizer@example.com' },
      hangoutLink: 'https://meet.google.com/...',
      status: 'confirmed'
    }
  ],
  hasMore: false
}
```

#### Create Event

```typescript
const result = await adapter.createRecord('calendar_event', {
  calendarId: 'primary',
  summary: 'New Meeting',
  description: 'Meeting description',
  start: {
    dateTime: '2025-01-20T14:00:00Z',
    timeZone: 'America/New_York'
  },
  end: {
    dateTime: '2025-01-20T15:00:00Z',
    timeZone: 'America/New_York'
  },
  location: 'Conference Room B',
  attendees: [
    { email: 'attendee1@example.com' },
    { email: 'attendee2@example.com' }
  ],
  sendUpdates: 'all' // Send invites
});
```

#### Update Event

```typescript
await adapter.updateRecord('calendar_event', 'event-id-123', {
  summary: 'Updated Meeting Title',
  location: 'New Location'
});
```

#### Delete Event

```typescript
await adapter.deleteRecord('calendar_event', 'event-id-123', {
  sendUpdates: 'all' // Notify attendees
});
```

### Drive Operations

#### List Files

```typescript
// List files in Drive
const result = await adapter.fetchRecords('drive_file', {
  q: "mimeType='application/pdf' and trashed=false",
  pageSize: 100,
  fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)',
  orderBy: 'modifiedTime desc'
});

// Returns:
{
  records: [
    {
      id: 'file-id-123',
      name: 'Document.pdf',
      mimeType: 'application/pdf',
      size: '1234567',
      createdTime: '2025-01-01T00:00:00Z',
      modifiedTime: '2025-01-15T12:00:00Z',
      webViewLink: 'https://drive.google.com/...',
      webContentLink: 'https://drive.google.com/uc?export=download&id=...'
    }
  ],
  hasMore: true,
  nextPageToken: 'next-page-token'
}
```

#### Get File Metadata

```typescript
const file = await adapter.fetchRecords('drive_file', {
  id: 'file-id-123',
  fields: 'id,name,mimeType,size,owners,permissions'
});
```

#### Download File

```typescript
// Download file content
const fileContent = await adapter.fetchRecords('drive_file', {
  id: 'file-id-123',
  download: true,
  exportFormat: 'pdf' // For Google Docs/Sheets/Slides
});
```

#### Upload File

```typescript
const result = await adapter.createRecord('drive_file', {
  name: 'New Document.pdf',
  mimeType: 'application/pdf',
  parents: ['folder-id-456'], // Optional: parent folder
  body: fileContent, // Binary content
  uploadType: 'multipart'
});
```

#### Export Google Docs

```typescript
// Export Google Doc as PDF
const pdfContent = await adapter.fetchRecords('drive_file', {
  id: 'google-doc-id',
  export: true,
  mimeType: 'application/pdf'
});

// Export Google Sheet as Excel
const excelContent = await adapter.fetchRecords('drive_file', {
  id: 'google-sheet-id',
  export: true,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});
```

### Contacts Operations

#### List Contacts

```typescript
const result = await adapter.fetchRecords('contact', {
  pageSize: 100,
  pageToken: 'next-page-token',
  sortOrder: 'LAST_NAME_ASCENDING'
});

// Returns:
{
  records: [
    {
      resourceName: 'people/contact-id-123',
      names: [{
        givenName: 'John',
        familyName: 'Doe',
        displayName: 'John Doe'
      }],
      emailAddresses: [{
        value: 'john.doe@example.com',
        type: 'work'
      }],
      phoneNumbers: [{
        value: '+1-555-123-4567',
        type: 'work'
      }],
      organizations: [{
        name: 'Acme Corp',
        title: 'Software Engineer'
      }]
    }
  ],
  hasMore: true,
  nextPageToken: 'next-page-token'
}
```

#### Create Contact

```typescript
const result = await adapter.createRecord('contact', {
  names: [{
    givenName: 'Jane',
    familyName: 'Smith',
    displayName: 'Jane Smith'
  }],
  emailAddresses: [{
    value: 'jane.smith@example.com',
    type: 'work'
  }],
  phoneNumbers: [{
    value: '+1-555-987-6543',
    type: 'work'
  }],
  organizations: [{
    name: 'Tech Inc',
    title: 'Product Manager'
  }]
});
```

#### Update Contact

```typescript
await adapter.updateRecord('contact', 'people/contact-id-123', {
  emailAddresses: [{
    value: 'new.email@example.com',
    type: 'work'
  }]
});
```

#### Delete Contact

```typescript
await adapter.deleteRecord('contact', 'people/contact-id-123');
```

### Tasks Operations

#### List Tasks

```typescript
const result = await adapter.fetchRecords('task', {
  tasklist: '@default', // or specific task list ID
  showCompleted: false,
  showHidden: false,
  maxResults: 100
});

// Returns:
{
  records: [
    {
      id: 'task-id-123',
      title: 'Complete project',
      notes: 'Finish the integration',
      status: 'needsAction',
      due: '2025-01-20T00:00:00Z',
      position: '00000000000000000001'
    }
  ],
  hasMore: false
}
```

#### Create Task

```typescript
const result = await adapter.createRecord('task', {
  tasklist: '@default',
  title: 'New Task',
  notes: 'Task description',
  due: '2025-01-25T00:00:00Z',
  status: 'needsAction'
});
```

#### Update Task

```typescript
await adapter.updateRecord('task', 'task-id-123', {
  status: 'completed',
  completed: new Date().toISOString()
});
```

#### Delete Task

```typescript
await adapter.deleteRecord('task', 'task-id-123', {
  tasklist: '@default'
});
```

---

## Sync Strategies

### Pull Strategy (Google Workspace → Castiel)

#### Gmail Sync

1. **Initial Sync**: Fetch all messages/threads using query filters
2. **Incremental Sync**: Use `historyId` for delta updates
3. **Thread Grouping**: Group related messages into threads

```typescript
// Incremental sync using historyId
const lastHistoryId = await getLastHistoryId(tenantId, 'google-workspace', 'gmail');

const result = await adapter.fetchRecords('gmail_history', {
  userId: 'me',
  startHistoryId: lastHistoryId,
  historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved']
});

for (const history of result.records) {
  // Process changes
  if (history.messagesAdded) {
    for (const message of history.messagesAdded) {
      await upsertShard({
        tenantId,
        shardTypeId: 'c_note',
        externalId: message.message.id,
        name: extractSubject(message.message),
        description: message.message.snippet,
        structuredData: {
          type: 'email',
          threadId: message.message.threadId,
          headers: extractHeaders(message.message),
          // ...
        }
      });
    }
  }
}
```

#### Calendar Sync

1. **Full Sync**: Fetch all events in date range
2. **Incremental Sync**: Use `updatedMin` to get only modified events
3. **Recurring Events**: Expand recurring events for individual instances

```typescript
// Incremental calendar sync
const lastSync = await getLastSyncTime(tenantId, 'google-workspace', 'calendar');

const result = await adapter.fetchRecords('calendar_event', {
  calendarId: 'primary',
  updatedMin: lastSync.toISOString(),
  singleEvents: true,
  orderBy: 'updated'
});

for (const event of result.records) {
  await upsertShard({
    tenantId,
    shardTypeId: 'c_note',
    externalId: event.id,
    name: event.summary,
    description: event.description,
    structuredData: {
      type: 'meeting',
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      location: event.location,
      attendees: event.attendees?.map(a => a.email),
      organizer: event.organizer?.email,
      meetUrl: event.hangoutLink,
      // ...
    }
  });
}
```

#### Drive Sync

1. **Full Sync**: List all files matching query
2. **Incremental Sync**: Use `modifiedTime` filter
3. **Delta Sync**: Use Drive API changes endpoint for efficient updates

```typescript
// Delta sync using changes endpoint
const startPageToken = await getStartPageToken(tenantId, 'google-workspace', 'drive');

const result = await adapter.fetchRecords('drive_changes', {
  pageToken: startPageToken,
  includeRemoved: true
});

for (const change of result.records) {
  if (change.removed) {
    // File was deleted
    await deleteShardByExternalId(tenantId, change.fileId);
  } else {
    // File was added or modified
    const file = await adapter.fetchRecords('drive_file', { id: change.fileId });
    await upsertShard({
      tenantId,
      shardTypeId: 'c_document',
      externalId: file.id,
      name: file.name,
      structuredData: {
        mimeType: file.mimeType,
        sizeBytes: parseInt(file.size || '0'),
        sourceUrl: file.webViewLink,
        downloadUrl: file.webContentLink,
        // ...
      }
    });
  }
  
  // Store new page token
  await updateStartPageToken(tenantId, 'google-workspace', 'drive', result.newStartPageToken);
}
```

### Push Strategy (Castiel → Google Workspace)

#### Write-Back to Gmail

```typescript
// Create email from Castiel
const shard = await getShard(shardId);

if (shard.externalId) {
  // Update existing (labels only)
  await adapter.updateRecord('gmail_message', shard.externalId, {
    addLabelIds: extractLabels(shard.tags)
  });
} else {
  // Send new email
  const result = await adapter.createRecord('gmail_message', {
    to: extractRecipients(shard.structuredData),
    subject: shard.name,
    body: shard.content || shard.description,
    bodyType: 'html'
  });
  
  await updateShardExternalId(shardId, result.id);
}
```

#### Write-Back to Calendar

```typescript
const shard = await getShard(shardId);

if (shard.externalId) {
  // Update existing event
  await adapter.updateRecord('calendar_event', shard.externalId, {
    summary: shard.name,
    description: shard.description,
    start: { dateTime: shard.structuredData.startTime },
    end: { dateTime: shard.structuredData.endTime },
    location: shard.structuredData.location
  });
} else {
  // Create new event
  const result = await adapter.createRecord('calendar_event', {
    summary: shard.name,
    description: shard.description,
    start: { dateTime: shard.structuredData.startTime },
    end: { dateTime: shard.structuredData.endTime },
    location: shard.structuredData.location,
    attendees: shard.structuredData.attendees?.map(email => ({ email }))
  });
  
  await updateShardExternalId(shardId, result.id);
}
```

---

## Webhook Support

### Gmail Push Notifications

Google Workspace supports push notifications for Gmail via Google Cloud Pub/Sub.

#### Setup Process

1. **Create Pub/Sub Topic**: Create a topic in Google Cloud Console
2. **Create Subscription**: Create a subscription for the topic
3. **Configure Watch**: Register a watch on the Gmail mailbox
4. **Receive Notifications**: Pub/Sub sends notifications to Castiel webhook endpoint

```typescript
async registerWebhook(events: string[], callbackUrl: string): Promise<WebhookRegistration> {
  // Register watch on Gmail mailbox
  const watchResponse = await this.request('POST', '/gmail/v1/users/me/watch', {
    body: {
      topicName: 'projects/{project-id}/topics/{topic-name}',
      labelIds: ['INBOX'] // Watch specific labels
    }
  });
  
  return {
    webhookId: watchResponse.historyId,
    events: events,
    callbackUrl: callbackUrl,
    expiresAt: new Date(watchResponse.expiration)
  };
}
```

#### Pub/Sub Message Format

```json
{
  "message": {
    "data": "base64-encoded-history-id",
    "attributes": {
      "emailAddress": "user@example.com"
    },
    "messageId": "pubsub-message-id",
    "publishTime": "2025-01-15T12:00:00Z"
  },
  "subscription": "projects/{project-id}/subscriptions/{subscription-name}"
}
```

### Calendar Push Notifications

Google Calendar supports push notifications via webhooks.

```typescript
async registerWebhook(events: string[], callbackUrl: string): Promise<WebhookRegistration> {
  const channelResponse = await this.request('POST', '/calendar/v3/calendars/primary/events/watch', {
    body: {
      id: generateChannelId(),
      type: 'web_hook',
      address: callbackUrl,
      token: generateVerificationToken()
    }
  });
  
  return {
    webhookId: channelResponse.id,
    events: events,
    callbackUrl: callbackUrl,
    expiresAt: new Date(channelResponse.expiration)
  };
}
```

### Drive Push Notifications

Google Drive supports push notifications via webhooks.

```typescript
async registerWebhook(events: string[], callbackUrl: string): Promise<WebhookRegistration> {
  const channelResponse = await this.request('POST', '/drive/v3/changes/watch', {
    body: {
      id: generateChannelId(),
      type: 'web_hook',
      address: callbackUrl,
      token: generateVerificationToken()
    }
  });
  
  return {
    webhookId: channelResponse.id,
    events: events,
    callbackUrl: callbackUrl,
    expiresAt: new Date(channelResponse.expiration)
  };
}
```

### Webhook Validation

Google Workspace webhooks include a verification token in the request.

```typescript
validateWebhookSignature(payload: any, signature: string, secret?: string): boolean {
  // Google sends X-Goog-Channel-Token header
  const expectedToken = secret || this.webhookToken;
  return signature === expectedToken;
}
```

---

## Error Handling

### Google Workspace Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `401` | Invalid or expired token | Yes (refresh) |
| `403` | Insufficient permissions | No |
| `404` | Resource not found | No |
| `429` | Rate limit exceeded | Yes (backoff) |
| `500` | Internal server error | Yes |
| `503` | Service unavailable | Yes |

### Rate Limiting

Google Workspace APIs have the following limits:

- **Gmail API**: 1 billion quota units per day, ~250 requests/second
- **Calendar API**: 1,000,000 queries per day, ~100 requests/second
- **Drive API**: 1,000 queries per 100 seconds per user, ~10 requests/second
- **People API (Contacts)**: 90,000 queries per day, ~25 requests/second
- **Tasks API**: 50,000 queries per day, ~10 requests/second

### Error Handler

```typescript
protected handleError(error: any): AdapterError {
  if (error.response?.status === 401) {
    return new AdapterError('Token expired', 'AUTHENTICATION_FAILED', {
      retryable: true,
      shouldRefresh: true // Trigger token refresh
    });
  }
  
  if (error.response?.status === 403) {
    const reason = error.response.data?.error?.message;
    if (reason?.includes('insufficient')) {
      return new AdapterError('Insufficient permissions', 'PERMISSION_DENIED');
    }
    if (reason?.includes('quota')) {
      return new AdapterError('Quota exceeded', 'RATE_LIMIT', {
        retryable: true,
        retryAfterMs: 60000
      });
    }
  }
  
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    return new AdapterError('Rate limit exceeded', 'RATE_LIMIT', {
      retryable: true,
      retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : 60000
    });
  }
  
  if (error.response?.status >= 500) {
    return new AdapterError('Google service error', 'SERVICE_UNAVAILABLE', {
      retryable: true,
      retryAfterMs: 5000
    });
  }
  
  return new AdapterError(error.message || 'Unknown error', 'UNKNOWN_ERROR');
}
```

---

## Testing

### Sandbox Testing

Use a test Google Workspace account or personal Google account:

1. Create a Google Cloud Project
2. Enable required APIs:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - People API (Contacts)
   - Tasks API
3. Create OAuth 2.0 credentials
4. Configure OAuth consent screen
5. Store credentials in Azure Key Vault (dev environment)

### Key Vault Setup for Testing

```bash
# Store system OAuth credentials in Key Vault
az keyvault secret set --vault-name "castiel-keyvault-dev" \
  --name "google-workspace-oauth-client-id" \
  --value "your_client_id.apps.googleusercontent.com"

az keyvault secret set --vault-name "castiel-keyvault-dev" \
  --name "google-workspace-oauth-client-secret" \
  --value "your_client_secret"
```

### Test Data

```typescript
// Test Gmail message
const testMessage = {
  to: 'test@example.com',
  subject: 'Castiel Test Email',
  body: 'This is a test email from Castiel integration',
  bodyType: 'text'
};

// Test Calendar event
const testEvent = {
  summary: 'Castiel Test Meeting',
  description: 'Test meeting for integration',
  start: {
    dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    timeZone: 'America/New_York'
  },
  end: {
    dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // +1 hour
    timeZone: 'America/New_York'
  },
  location: 'Virtual',
  attendees: [{ email: 'attendee@example.com' }]
};

// Test Drive file
const testFile = {
  name: 'Castiel Test Document.txt',
  mimeType: 'text/plain',
  body: 'Test file content'
};

// Test Contact
const testContact = {
  names: [{
    givenName: 'Test',
    familyName: 'User',
    displayName: 'Test User'
  }],
  emailAddresses: [{
    value: 'test.user@example.com',
    type: 'work'
  }]
};
```

### Connection Test

```typescript
const result = await adapter.testConnection();
// Returns:
{
  success: true,
  details: {
    email: 'user@example.com',
    name: 'John Doe',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      // ...
    ],
    hasGmailAccess: true,
    hasCalendarAccess: true,
    hasDriveAccess: true,
    hasContactsAccess: true,
    hasTasksAccess: true
  }
}
```

---

## Best Practices

### 1. Scope Management

Request only the scopes needed for the specific use case. Use the least privileged scopes:
- Use `readonly` scopes when write access isn't needed
- Use `drive.file` instead of `drive` when only accessing files created by the app

### 2. Incremental Sync

Always use incremental sync mechanisms:
- Gmail: Use `historyId` for delta updates
- Calendar: Use `updatedMin` parameter
- Drive: Use changes API with `pageToken`

### 3. Rate Limit Handling

Implement exponential backoff for rate limit errors:
- Start with 1 second delay
- Double delay on each retry
- Maximum delay of 60 seconds

### 4. Batch Operations

When possible, use batch requests:
- Gmail: Batch modify labels for multiple messages
- Calendar: Batch create/update events
- Drive: Batch get file metadata

### 5. Token Refresh

Always handle token expiration gracefully:
- Check token expiration before API calls
- Refresh tokens proactively (before expiration)
- Cache refreshed tokens in Redis

### 6. Webhook Expiration

Google Workspace webhooks expire after 7 days. Implement renewal:
- Track webhook expiration dates
- Renew webhooks before expiration
- Handle missed notifications during renewal

### 7. Large File Handling

For Drive files:
- Use resumable uploads for files > 5MB
- Stream downloads for large files
- Handle export format conversions for Google Docs/Sheets/Slides

### 8. Privacy & Security

- Never store email content or attachments unless explicitly required
- Encrypt all credentials in Key Vault
- Implement proper access controls per tenant
- Log access for audit purposes

---

## Limitations

### Gmail

- **Message Size**: Maximum 25MB per message (including attachments)
- **History**: Limited to 30 days of history for push notifications
- **Labels**: Cannot create custom labels via API (only system labels)
- **Search**: Complex queries may be slow for large mailboxes

### Calendar

- **Recurring Events**: Must expand recurring events to get individual instances
- **Attendees**: Cannot modify attendee responses (read-only)
- **Conference Data**: Some conference details may not be available via API

### Drive

- **Export Limits**: Large Google Docs/Sheets may take time to export
- **Permissions**: Complex permission model, some operations require specific permissions
- **Shared Drives**: Requires additional scopes and different API endpoints

### Contacts

- **Groups**: Contact groups are not fully supported via People API
- **Custom Fields**: Limited support for custom contact fields
- **Sync**: No built-in sync mechanism, must use polling

### Tasks

- **Task Lists**: Limited to default task list and user-created lists
- **Subtasks**: Limited support for task hierarchies
- **Assignments**: Cannot assign tasks to other users

---

**Last Updated**: January 2025  
**Version**: 1.0.0








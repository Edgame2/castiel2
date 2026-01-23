# Integration Providers

## Overview

Integration Providers define the external systems that Castiel can connect to. Each provider is stored in the `integration_providers` container at the system level, specifying capabilities, authentication methods, and entity mappings.

> **Note**: Providers are stored in Cosmos DB containers, not as shard types. See [Container Architecture](./CONTAINER-ARCHITECTURE.md) for details.

---

## Table of Contents

1. [Provider Categories](#provider-categories)
2. [CRM Providers](#crm-providers)
3. [Communication Providers](#communication-providers)
4. [Storage Providers](#storage-providers)
5. [Calendar & Email](#calendar--email)
6. [Provider Schema](#provider-schema)
7. [Adding New Providers](#adding-new-providers)

---

## Provider Categories

| Category | Providers | Primary Use Case |
|----------|-----------|------------------|
| **CRM** | Salesforce, Dynamics 365, HubSpot | Customer & deal data |
| **Communication** | Teams, Zoom, Gong | Meeting notes & transcripts |
| **Storage** | Google Drive, OneDrive, Dropbox | Document sync |
| **Calendar** | Google Calendar, Outlook | Meeting scheduling |
| **Email** | Gmail, Outlook | Email integration |
| **Project Management** | Jira, Asana | Task & project sync |

---

## CRM Providers

### Salesforce

| Property | Value |
|----------|-------|
| **Provider ID** | `salesforce` |
| **Category** | CRM |
| **Auth Type** | OAuth 2.0 (Web Server Flow) |
| **Status** | Phase 1 |

#### Supported Entities

| Salesforce Entity | Castiel ShardType | Direction | Sync Support |
|-------------------|-------------------|-----------|--------------|
| Account | `c_company` | Bidirectional | Full, Incremental, Webhook |
| Contact | `c_contact` | Bidirectional | Full, Incremental, Webhook |
| Lead | `c_contact` | Bidirectional | Full, Incremental, Webhook |
| Opportunity | `c_opportunity` | Bidirectional | Full, Incremental, Webhook |
| Task | `c_note` | Inbound | Full, Incremental |
| Event | `c_note` | Inbound | Full, Incremental |
| ContentDocument | `c_document` | Inbound | Full, Incremental |
| Note | `c_note` | Inbound | Full, Incremental |

#### Field Mappings (Account → c_company)

| Salesforce Field | Shard Field | Transform |
|------------------|-------------|-----------|
| `Name` | `name` | - |
| `Industry` | `industry` | - |
| `NumberOfEmployees` | `employeeCount` | - |
| `AnnualRevenue` | `annualRevenue` | - |
| `Website` | `website` | - |
| `Description` | `description` | - |
| `BillingAddress` | `address` | `flattenAddress()` |
| `Phone` | `phone` | - |
| `Type` | `accountType` | - |
| `OwnerId` | `metadata.salesforceOwnerId` | - |

#### Query Language

**SOQL** (Salesforce Object Query Language)

```sql
SELECT Id, Name, Industry, NumberOfEmployees 
FROM Account 
WHERE LastModifiedDate > 2025-01-01T00:00:00Z
AND OwnerId = '005xxx'
LIMIT 1000
```

#### Webhook Support

- **Outbound Messages**: Legacy, limited
- **Platform Events**: Recommended
- **Change Data Capture (CDC)**: Best for real-time

---

### Dynamics 365

| Property | Value |
|----------|-------|
| **Provider ID** | `dynamics` |
| **Category** | CRM |
| **Auth Type** | OAuth 2.0 (Azure AD) |
| **Status** | Phase 1 |

#### Supported Entities

| Dynamics Entity | Castiel ShardType | Direction |
|-----------------|-------------------|-----------|
| account | `c_company` | Bidirectional |
| contact | `c_contact` | Bidirectional |
| lead | `c_contact` | Bidirectional |
| opportunity | `c_opportunity` | Bidirectional |
| task | `c_note` | Inbound |
| appointment | `c_note` | Inbound |
| annotation | `c_note` | Inbound |

#### Query Language

**OData** with FetchXML support

```
GET /api/data/v9.2/accounts?$filter=modifiedon gt 2025-01-01T00:00:00Z&$top=1000
```

#### Webhook Support

- **Webhooks**: Native support
- **Azure Service Bus**: For reliable delivery

---

### HubSpot

| Property | Value |
|----------|-------|
| **Provider ID** | `hubspot` |
| **Category** | CRM |
| **Auth Type** | OAuth 2.0 |
| **Status** | Phase 2 |

#### Supported Entities

| HubSpot Entity | Castiel ShardType | Direction |
|----------------|-------------------|-----------|
| Company | `c_company` | Bidirectional |
| Contact | `c_contact` | Bidirectional |
| Deal | `c_opportunity` | Bidirectional |
| Note | `c_note` | Inbound |
| Task | `c_note` | Inbound |

---

## Communication Providers

### Microsoft Teams

| Property | Value |
|----------|-------|
| **Provider ID** | `teams` |
| **Category** | Communication |
| **Auth Type** | OAuth 2.0 (Microsoft Identity) |
| **Status** | Phase 2 |

#### Supported Entities

| Teams Entity | Castiel ShardType | Direction |
|--------------|-------------------|-----------|
| Channel Messages | `c_note` | Inbound |
| Chat Messages | `c_note` | Inbound |
| Meeting Transcripts | `c_note` | Inbound |
| Files | `c_document` | Inbound |

#### Capabilities

| Capability | Support |
|------------|---------|
| Send Messages | ✅ Outbound |
| Read Messages | ✅ Inbound |
| Meeting Transcripts | ✅ Inbound |
| File Upload | ✅ Outbound |
| Webhooks | ✅ Real-time notifications |

#### Permissions Required

```
ChannelMessage.Read.All
Chat.Read
OnlineMeetings.Read.All
Files.Read.All
```

---

### Zoom

| Property | Value |
|----------|-------|
| **Provider ID** | `zoom` |
| **Category** | Communication |
| **Auth Type** | OAuth 2.0 |
| **Status** | Phase 2 |

#### Supported Entities

| Zoom Entity | Castiel ShardType | Direction |
|-------------|-------------------|-----------|
| Meeting | `c_note` | Inbound |
| Recording | `c_document` | Inbound |
| Transcript | `c_note` | Inbound |

#### Capabilities

| Capability | Support |
|------------|---------|
| Meeting Details | ✅ Inbound |
| Recordings | ✅ Inbound (download + store) |
| Transcripts | ✅ Inbound |
| Webhooks | ✅ Meeting events |

---

### Gong

| Property | Value |
|----------|-------|
| **Provider ID** | `gong` |
| **Category** | Communication |
| **Auth Type** | API Key |
| **Status** | Phase 2 |

#### Supported Entities

| Gong Entity | Castiel ShardType | Direction |
|-------------|-------------------|-----------|
| Call | `c_note` | Inbound |
| Call Transcript | `c_note` | Inbound |
| Call Recording | `c_document` | Inbound |
| Deal (Gong Engage) | `c_opportunity` | Inbound |

#### Capabilities

| Capability | Support |
|------------|---------|
| Call Metadata | ✅ Inbound |
| AI Transcripts | ✅ Inbound |
| Call Highlights | ✅ Inbound |
| Webhooks | ✅ Call events |

---

## Storage Providers

### Google Drive

| Property | Value |
|----------|-------|
| **Provider ID** | `google_drive` |
| **Category** | Storage |
| **Auth Type** | OAuth 2.0 / Service Account |
| **Status** | Phase 2 |

#### Supported Entities

| Drive Entity | Castiel ShardType | Direction |
|--------------|-------------------|-----------|
| File | `c_document` | Inbound |
| Folder | (metadata only) | Inbound |
| Google Docs | `c_document` | Inbound (export as PDF) |
| Google Sheets | `c_document` | Inbound (export as xlsx) |

#### Capabilities

| Capability | Support |
|------------|---------|
| File Download | ✅ Inbound |
| File Upload | ✅ Outbound |
| File Metadata | ✅ Inbound |
| Webhooks (Push) | ✅ File changes |

#### Scopes

```
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
```

---

### OneDrive / SharePoint

| Property | Value |
|----------|-------|
| **Provider ID** | `onedrive` |
| **Category** | Storage |
| **Auth Type** | OAuth 2.0 (Microsoft Identity) |
| **Status** | Phase 2 |

#### Supported Entities

| OneDrive Entity | Castiel ShardType | Direction |
|-----------------|-------------------|-----------|
| DriveItem (File) | `c_document` | Inbound |
| DriveItem (Folder) | (metadata only) | Inbound |

#### Capabilities

| Capability | Support |
|------------|---------|
| File Download | ✅ Inbound |
| File Upload | ✅ Outbound |
| Delta Sync | ✅ Incremental changes |
| Webhooks | ✅ Subscriptions |

#### Permissions

```
Files.Read.All
Files.ReadWrite.All
Sites.Read.All
```

---

## Calendar & Email

### Google Calendar

| Property | Value |
|----------|-------|
| **Provider ID** | `google_calendar` |
| **Category** | Calendar |
| **Auth Type** | OAuth 2.0 |
| **Status** | Phase 3 |

#### Supported Entities

| Calendar Entity | Castiel ShardType | Direction |
|-----------------|-------------------|-----------|
| Event | `c_note` (type: meeting) | Bidirectional |

---

### Outlook Calendar

| Property | Value |
|----------|-------|
| **Provider ID** | `outlook_calendar` |
| **Category** | Calendar |
| **Auth Type** | OAuth 2.0 (Microsoft Identity) |
| **Status** | Phase 3 |

---

### Gmail

| Property | Value |
|----------|-------|
| **Provider ID** | `gmail` |
| **Category** | Email |
| **Auth Type** | OAuth 2.0 |
| **Status** | Phase 3 |

---

### Outlook Email

| Property | Value |
|----------|-------|
| **Provider ID** | `outlook_email` |
| **Category** | Email |
| **Auth Type** | OAuth 2.0 (Microsoft Identity) |
| **Status** | Phase 3 |

---

## Provider Schema

### integration_providers Container Document Structure

```typescript
interface IntegrationProviderDocument {
  id: string;
  category: string; // Partition key (e.g., "crm", "communication", "data_source", "storage", "custom")
  name: string; // Internal name
  displayName: string; // User-friendly name
  provider: string; // Unique identifier (e.g., "salesforce")
  description?: string;
  
  // Status & Audience (Super Admin controlled)
  status: 'active' | 'beta' | 'deprecated' | 'disabled'; // Super admin can set
  audience: 'system' | 'tenant'; // Controls visibility and usage
  // audience: 'system' = not visible to tenant admins, system-level only
  // audience: 'tenant' = visible to tenant admins, they can configure per-tenant
  
  // Capabilities & Features
  capabilities: IntegrationCapability[]; // ['read', 'write', 'delete', 'search', 'realtime', 'bulk', 'attachments']
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean; // Can be used by notification system (e.g., Teams, Slack)
  supportsSearch: boolean; // Adapter provides search capability
  searchableEntities?: string[]; // Which entities can be searched (e.g., ["Account", "Contact", "Opportunity"])
  searchCapabilities?: {
    fullText: boolean; // Supports full-text search
    fieldSpecific: boolean; // Supports field-specific search
    filtered: boolean; // Supports filtered search
  };
  requiresUserScoping: boolean; // Integration requires user-level scoping (not tenant-wide)
  // When true: search and sync must be scoped to individual users
  // Examples: Gmail (user emails), Slack (user-accessible channels), Salesforce (user opportunities), GDrive (user documents)
  
  // Authentication Configuration
  authType: AuthType; // 'oauth2' | 'api_key' | 'basic' | 'custom'
  oauthConfig?: OAuthConfig;
  
  // Entity Mappings
  availableEntities: IntegrationEntity[];
  entityMappings?: EntityToShardTypeMapping[];
  
  // Metadata
  icon: string; // Icon name/identifier
  color: string;
  documentationUrl?: string;
  supportUrl?: string;
  version: string;
  
  // Pricing (if applicable)
  isPremium?: boolean;
  requiredPlan?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Super admin user ID
  updatedBy: string;
}

interface EntityDefinition {
  externalEntity: string;                // "Account"
  shardTypeId: string;                   // "c_company"
  displayName: string;                   // "Company"
  supportedDirections: ('inbound' | 'outbound')[];
  defaultFieldMappings: FieldMapping[];
  requiredFields: string[];
}

interface AuthConfig {
  // OAuth 2.0
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  
  // API Key
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  
  // Service Account
  serviceAccountFields?: string[];
}
```

---

## Adding New Providers

### Process

1. **Create Provider Definition**: Add document to `integration_providers` container
2. **Implement Adapter**: Build adapter implementing `IntegrationAdapter` interface
3. **Add Field Mappings**: Define entity and field mappings
4. **Test**: Comprehensive testing with real accounts
5. **Deploy**: Super Admin enables provider (sets `status: 'active'` and `audience: 'tenant'`)

### Provider Definition Example

```json
{
  "id": "custom-crm-provider",
  "category": "crm",
  "name": "Custom CRM",
  "displayName": "Custom CRM Integration",
  "provider": "custom_crm",
  "description": "Integration with Custom CRM system",
  
  "status": "active",
  "audience": "tenant",
  
  "capabilities": ["read", "write", "search"],
  "supportedSyncDirections": ["pull", "push", "bidirectional"],
  "supportsRealtime": true,
  "supportsWebhooks": true,
  "supportsNotifications": false,
  "supportsSearch": true,
  "searchableEntities": ["Customer", "Order"],
  "searchCapabilities": {
    "fullText": true,
    "fieldSpecific": true,
    "filtered": true
  },
  "requiresUserScoping": false,
  
  "authType": "oauth2",
  "oauthConfig": {
    "authorizationUrl": "https://customcrm.com/oauth/authorize",
    "tokenUrl": "https://customcrm.com/oauth/token",
    "scopes": ["read", "write"],
    "redirectUri": "https://castiel.com/api/integrations/oauth/callback",
    "pkce": true
  },
  
  "availableEntities": [
    {
      "name": "Customer",
      "displayName": "Customer",
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "name", "type": "string", "required": true },
        { "name": "industry", "type": "string", "required": false }
      ],
      "supportsPull": true,
      "supportsPush": true,
      "supportsDelete": false,
      "supportsWebhook": true,
      "idField": "id",
      "modifiedField": "updatedAt"
    }
  ],
  
  "entityMappings": [
    {
      "integrationEntity": "Customer",
      "supportedShardTypes": ["c_company"],
      "defaultShardType": "c_company",
      "bidirectionalSync": true
    }
  ],
  
  "icon": "custom-crm",
  "color": "#0066CC",
  "version": "1.0.0",
  "isPremium": false,
  
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "createdBy": "super-admin-user-id",
  "updatedBy": "super-admin-user-id"
}
```

### Status Field

The `status` field controls provider availability:

- **`active`**: Provider is fully available and ready for use
- **`beta`**: Provider is in beta testing, may have limitations
- **`deprecated`**: Provider is deprecated, existing integrations continue to work but new ones cannot be created
- **`disabled`**: Provider is disabled, all integrations are disabled

**Controlled by**: Super Admin only

### Audience Field

The `audience` field controls visibility and usage:

- **`system`**: Integration configured at system level only, NOT visible/usable by tenant admins
- **`tenant`**: Integration visible to tenant admins, they can configure per-tenant

**Controlled by**: Super Admin only

**Example Use Cases:**
- System integrations: Internal Castiel services, system-level webhooks
- Tenant integrations: Salesforce, Teams, Gmail (visible to tenant admins for configuration)

→ See [Adapter Development](./adapters/README.md) for implementation details  
→ See [Third-Party Extension Guide](./third-party/EXTENSION-GUIDE.md) for publishing

---

**Last Updated**: November 2025  
**Version**: 1.0.0


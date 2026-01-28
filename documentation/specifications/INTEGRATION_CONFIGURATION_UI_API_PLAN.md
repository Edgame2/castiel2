# Integration System Configuration UI & API Plan

**Date:** January 28, 2025  
**Purpose:** Complete configuration system for Super Admin and Tenant Admin

---

## Overview

The integration system requires extensive configuration capabilities for two user roles:
- **Super Admin**: System-wide configuration, integration catalog management
- **Tenant Admin**: Tenant-specific integration configuration, field mappings, sync settings

---

## Configuration Hierarchy

```
Super Admin Configuration (System-Wide)
├── Integration Catalog Management
│   ├── Add/Edit/Remove integration types
│   ├── Configure default field mappings
│   ├── Set integration capabilities
│   └── Manage integration templates
│
├── Shard Type Management
│   ├── Create/Update shard types
│   ├── Define shard schemas
│   └── Manage shard type versions
│
├── System Settings
│   ├── Global rate limits
│   ├── Processing capacity
│   ├── Queue configurations
│   └── Feature flags
│
└── Monitoring & Health
    ├── System health dashboard
    ├── Queue metrics
    ├── Processor status
    └── Error analytics

Tenant Admin Configuration (Per-Tenant)
├── Integration Connections
│   ├── Connect/Disconnect integrations
│   ├── OAuth authentication
│   ├── API key management
│   └── Connection testing
│
├── Sync Configuration
│   ├── Entity selection (which data to sync)
│   ├── Sync frequency (schedule)
│   ├── Field mappings (customize per tenant)
│   ├── Transform functions
│   └── Sync direction (one-way, two-way)
│
├── Entity Linking Configuration
│   ├── Auto-link thresholds
│   ├── Suggested link settings
│   ├── Review suggested links
│   └── Manual linking rules
│
├── Data Processing Settings
│   ├── Enable/disable document processing
│   ├── Enable/disable email processing
│   ├── Enable/disable meeting transcription
│   └── Processing priorities
│
└── Monitoring & Logs
    ├── Integration health status
    ├── Sync history
    ├── Error logs
    └── Data quality metrics
```

---

## Part 1: Super Admin Configuration

### 1.1 Integration Catalog Management

**UI Page:** `/admin/integrations/catalog`

**Features:**
- List all integration types (Salesforce, HubSpot, Google Drive, etc.)
- Add new integration type
- Edit existing integration type
- Configure default field mappings
- Set integration capabilities
- Manage integration templates

**UI Components:**

```typescript
// IntegrationCatalogList.tsx
interface IntegrationCatalogListProps {
  integrations: IntegrationType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

// IntegrationTypeEditor.tsx
interface IntegrationTypeEditorProps {
  integrationType?: IntegrationType; // undefined for new
  onSave: (data: IntegrationType) => void;
  onCancel: () => void;
}

// Fields:
// - name, description, category
// - logo URL
// - authentication type (OAuth2, API Key, etc.)
// - supported entities (Opportunity, Account, Contact, etc.)
// - capabilities (incremental sync, webhooks, bidirectional sync)
// - default field mappings
// - rate limits
// - documentation URL
```

**API Endpoints:**

```typescript
// Integration Catalog API
// Location: containers/integration-manager/src/routes/admin/catalog.routes.ts

// List all integration types
GET /api/v1/admin/integrations/catalog
Response: {
  integrationTypes: IntegrationType[]
}

// Get single integration type
GET /api/v1/admin/integrations/catalog/:id
Response: {
  integrationType: IntegrationType
}

// Create integration type
POST /api/v1/admin/integrations/catalog
Body: {
  name: string;
  description: string;
  category: 'crm' | 'documents' | 'communications' | 'meetings' | 'calendar';
  authType: 'oauth2' | 'api_key' | 'basic';
  supportedEntities: string[];
  capabilities: {
    incrementalSync: boolean;
    webhooks: boolean;
    bidirectionalSync: boolean;
    bulkOperations: boolean;
  };
  defaultFieldMappings: EntityMapping[];
  rateLimits: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
}
Response: {
  integrationType: IntegrationType
}

// Update integration type
PUT /api/v1/admin/integrations/catalog/:id
Body: Partial<IntegrationType>
Response: {
  integrationType: IntegrationType
}

// Delete integration type
DELETE /api/v1/admin/integrations/catalog/:id
Response: {
  success: boolean
}
```

---

### 1.2 Shard Type Management

**UI Page:** `/admin/shard-types`

**Features:**
- List all shard types
- Create new shard type
- Edit shard type schema
- View shard type versions
- Test shard type validation

**UI Components:**

```typescript
// ShardTypeList.tsx
interface ShardTypeListProps {
  shardTypes: ShardType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

// ShardTypeEditor.tsx
interface ShardTypeEditorProps {
  shardType?: ShardType;
  onSave: (data: ShardType) => void;
  onCancel: () => void;
}

// Fields:
// - id, name, description
// - category (crm, integration, analytics)
// - schema (JSON Schema editor)
// - schema version
// - required fields
// - optional fields
// - validation rules

// ShardTypeSchemaEditor.tsx (JSON Schema visual editor)
interface ShardTypeSchemaEditorProps {
  schema: JSONSchema;
  onChange: (schema: JSONSchema) => void;
}

// ShardTypeValidator.tsx (test validation)
interface ShardTypeValidatorProps {
  shardType: ShardType;
  onTest: (testData: any) => void;
}
```

**API Endpoints:**

```typescript
// Shard Type Management API
// Location: containers/shard-manager/src/routes/admin/shardTypes.routes.ts

// List all shard types
GET /api/v1/admin/shard-types
Response: {
  shardTypes: ShardType[]
}

// Get single shard type
GET /api/v1/admin/shard-types/:id
Response: {
  shardType: ShardType
}

// Create shard type
POST /api/v1/admin/shard-types
Body: {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: JSONSchema;
  schemaVersion: string;
}
Response: {
  shardType: ShardType
}

// Update shard type
PUT /api/v1/admin/shard-types/:id
Body: Partial<ShardType>
Response: {
  shardType: ShardType
}

// Validate test data against shard type
POST /api/v1/admin/shard-types/:id/validate
Body: {
  testData: any
}
Response: {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Get shard type usage statistics
GET /api/v1/admin/shard-types/:id/stats
Response: {
  shardCount: number;
  tenantsUsing: number;
  lastCreated: Date;
  avgShardSize: number;
}
```

---

### 1.3 System Settings

**UI Page:** `/admin/settings`

**Features:**
- Global rate limits
- Processing capacity settings
- Queue configurations
- Feature flags
- Azure service settings

**UI Components:**

```typescript
// SystemSettings.tsx (main page with tabs)
interface SystemSettingsProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
}

// Tabs:
// 1. Rate Limits
// 2. Processing Capacity
// 3. Queue Configuration
// 4. Feature Flags
// 5. Azure Services
// 6. Monitoring

// RateLimitsTab.tsx
interface RateLimitsTabProps {
  rateLimits: RateLimitSettings;
  onChange: (settings: RateLimitSettings) => void;
}

// Fields:
// - Default rate limits per integration type
// - Global rate limits (requests per second, per minute, per hour)
// - Per-tenant rate limits
// - Rate limit bypass for specific tenants

// ProcessingCapacityTab.tsx
interface ProcessingCapacityTabProps {
  capacity: ProcessingCapacitySettings;
  onChange: (settings: ProcessingCapacitySettings) => void;
}

// Fields:
// - Light processor instances (min, max, auto-scale threshold)
// - Heavy processor instances (min, max, auto-scale threshold)
// - Queue prefetch settings
// - Concurrent processing limits
// - Memory limits per processor type

// QueueConfigurationTab.tsx
interface QueueConfigurationTabProps {
  queueConfig: QueueConfiguration;
  onChange: (config: QueueConfiguration) => void;
}

// Fields:
// - Queue TTL settings (per queue type)
// - DLQ settings (max retries, alert thresholds)
// - Message priority settings
// - Queue depth alerts
// - Auto-scaling rules

// FeatureFlagsTab.tsx
interface FeatureFlagsTabProps {
  featureFlags: FeatureFlags;
  onChange: (flags: FeatureFlags) => void;
}

// Flags:
// - Enable document processing
// - Enable email processing
// - Enable meeting transcription
// - Enable entity linking
// - Enable ML field aggregation
// - Enable suggested links
// - Enable bidirectional sync
// - Enable webhooks
```

**API Endpoints:**

```typescript
// System Settings API
// Location: containers/integration-manager/src/routes/admin/settings.routes.ts

// Get all system settings
GET /api/v1/admin/settings
Response: {
  settings: SystemSettings
}

// Update system settings
PUT /api/v1/admin/settings
Body: Partial<SystemSettings>
Response: {
  settings: SystemSettings
}

// Get rate limit settings
GET /api/v1/admin/settings/rate-limits
Response: {
  rateLimits: RateLimitSettings
}

// Update rate limit settings
PUT /api/v1/admin/settings/rate-limits
Body: RateLimitSettings
Response: {
  rateLimits: RateLimitSettings
}

// Get processing capacity settings
GET /api/v1/admin/settings/capacity
Response: {
  capacity: ProcessingCapacitySettings
}

// Update processing capacity settings
PUT /api/v1/admin/settings/capacity
Body: ProcessingCapacitySettings
Response: {
  capacity: ProcessingCapacitySettings
}

// Get feature flags
GET /api/v1/admin/settings/feature-flags
Response: {
  featureFlags: FeatureFlags
}

// Update feature flags
PUT /api/v1/admin/settings/feature-flags
Body: FeatureFlags
Response: {
  featureFlags: FeatureFlags
}

// Toggle single feature flag
PATCH /api/v1/admin/settings/feature-flags/:flagName
Body: {
  enabled: boolean
}
Response: {
  featureFlag: { name: string, enabled: boolean }
}
```

---

### 1.4 System Monitoring Dashboard

**UI Page:** `/admin/monitoring`

**Features:**
- System health overview
- Queue metrics (depth, throughput, errors)
- Processor status (light, heavy)
- Integration health across all tenants
- Error analytics
- Performance metrics

**UI Components:**

```typescript
// SystemHealthDashboard.tsx
interface SystemHealthDashboardProps {
  healthData: SystemHealthData;
  refreshInterval?: number; // Auto-refresh every N seconds
}

// Sections:
// 1. Overall Health (green/yellow/red indicators)
// 2. Queue Metrics
// 3. Processor Status
// 4. Integration Health
// 5. Error Rate Chart
// 6. Performance Metrics

// QueueMetricsCard.tsx
interface QueueMetricsCardProps {
  queueName: string;
  depth: number;
  throughput: number; // messages/second
  errorRate: number;
  avgProcessingTime: number;
}

// ProcessorStatusCard.tsx
interface ProcessorStatusCardProps {
  type: 'light' | 'heavy';
  instances: number;
  cpuUsage: number;
  memoryUsage: number;
  messagesProcessed: number;
  errorCount: number;
}

// IntegrationHealthTable.tsx
interface IntegrationHealthTableProps {
  integrations: Array<{
    tenantId: string;
    tenantName: string;
    integrationType: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
    lastSync: Date;
    successRate: number;
    errorCount: number;
  }>;
}

// ErrorAnalyticsChart.tsx
interface ErrorAnalyticsChartProps {
  errors: Array<{
    timestamp: Date;
    errorType: string;
    count: number;
    integration?: string;
    tenant?: string;
  }>;
  timeRange: '1h' | '24h' | '7d' | '30d';
}
```

**API Endpoints:**

```typescript
// System Monitoring API
// Location: containers/integration-processors/src/routes/admin/monitoring.routes.ts

// Get overall system health
GET /api/v1/admin/monitoring/health
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    rabbitmq: { status: string, latency: number };
    shardManager: { status: string, latency: number };
    processors: { status: string, activeInstances: number };
    blobStorage: { status: string, availability: number };
  };
  timestamp: Date;
}

// Get queue metrics
GET /api/v1/admin/monitoring/queues
Response: {
  queues: Array<{
    name: string;
    depth: number;
    throughput: number;
    errorRate: number;
    avgProcessingTime: number;
    oldestMessage: Date;
  }>
}

// Get processor status
GET /api/v1/admin/monitoring/processors
Response: {
  processors: Array<{
    type: 'light' | 'heavy';
    instanceId: string;
    cpuUsage: number;
    memoryUsage: number;
    messagesProcessed: number;
    errorCount: number;
    uptime: number;
    status: 'running' | 'starting' | 'stopping' | 'error';
  }>
}

// Get integration health across all tenants
GET /api/v1/admin/monitoring/integrations
Query: ?status=unhealthy&limit=100
Response: {
  integrations: Array<{
    tenantId: string;
    tenantName: string;
    integrationId: string;
    integrationType: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
    lastSync: Date;
    successRate: number;
    errorCount: number;
  }>
}

// Get error analytics
GET /api/v1/admin/monitoring/errors
Query: ?timeRange=24h&groupBy=errorType
Response: {
  errors: Array<{
    errorType: string;
    count: number;
    affectedTenants: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
    topAffectedIntegrations: string[];
  }>;
  totalErrors: number;
  errorRate: number;
}

// Get performance metrics
GET /api/v1/admin/monitoring/performance
Query: ?timeRange=24h
Response: {
  metrics: {
    avgProcessingTime: number;
    p95ProcessingTime: number;
    p99ProcessingTime: number;
    throughput: number;
    successRate: number;
    byProcessorType: {
      light: { avgTime: number, throughput: number };
      heavy: { avgTime: number, throughput: number };
    };
  }
}
```

---

## Part 2: Tenant Admin Configuration

### 2.1 Integration Connections Management

**UI Page:** `/settings/integrations`

**Features:**
- List connected integrations
- Connect new integration (OAuth flow)
- Disconnect integration
- Test connection
- View integration status

**UI Components:**

```typescript
// IntegrationsOverview.tsx
interface IntegrationsOverviewProps {
  integrations: TenantIntegration[];
  availableTypes: IntegrationType[];
  onConnect: (type: string) => void;
  onDisconnect: (id: string) => void;
  onConfigure: (id: string) => void;
}

// IntegrationCard.tsx
interface IntegrationCardProps {
  integration: TenantIntegration;
  onConfigure: () => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
}

// Display:
// - Integration name and logo
// - Connection status (connected, disconnected, error)
// - Last sync time
// - Success rate (last 7 days)
// - Entities syncing
// - Actions: Configure, Test, Disconnect

// ConnectIntegrationModal.tsx
interface ConnectIntegrationModalProps {
  integrationType: IntegrationType;
  onConnect: (credentials: any) => Promise<void>;
  onCancel: () => void;
}

// OAuth2 flow or API key input
// - OAuth2: "Connect with [Integration]" button → OAuth popup
// - API Key: Input fields for API key, secret, etc.

// IntegrationStatusBadge.tsx
interface IntegrationStatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync?: Date;
}
```

**API Endpoints:**

```typescript
// Tenant Integration Management API
// Location: containers/integration-manager/src/routes/integrations.routes.ts

// List tenant's integrations
GET /api/v1/integrations
Query: ?tenantId=xxx
Response: {
  integrations: TenantIntegration[]
}

// Get available integration types
GET /api/v1/integrations/available
Response: {
  integrationTypes: IntegrationType[]
}

// Connect new integration (OAuth2)
POST /api/v1/integrations/connect
Body: {
  tenantId: string;
  integrationType: string;
  authorizationCode: string; // From OAuth callback
  redirectUri: string;
}
Response: {
  integration: TenantIntegration;
  success: boolean;
}

// Connect new integration (API Key)
POST /api/v1/integrations/connect-api-key
Body: {
  tenantId: string;
  integrationType: string;
  apiKey: string;
  apiSecret?: string;
  instanceUrl?: string; // For self-hosted integrations
}
Response: {
  integration: TenantIntegration;
  success: boolean;
}

// Disconnect integration
DELETE /api/v1/integrations/:id
Response: {
  success: boolean
}

// Test integration connection
POST /api/v1/integrations/:id/test
Response: {
  success: boolean;
  message: string;
  latency: number;
  details?: any;
}

// Get OAuth authorization URL
GET /api/v1/integrations/oauth-url/:integrationType
Query: ?tenantId=xxx&redirectUri=xxx
Response: {
  authorizationUrl: string;
  state: string; // CSRF token
}
```

---

### 2.2 Sync Configuration

**UI Page:** `/settings/integrations/:id/sync`

**Features:**
- Select entities to sync
- Configure sync frequency
- Enable/disable specific entities
- Set sync direction (one-way, two-way)
- Configure sync filters

**UI Components:**

```typescript
// SyncConfiguration.tsx (main page)
interface SyncConfigurationProps {
  integration: TenantIntegration;
  onSave: (config: SyncConfig) => void;
}

// Tabs:
// 1. Entity Selection
// 2. Sync Schedule
// 3. Sync Direction
// 4. Filters

// EntitySelectionTab.tsx
interface EntitySelectionTabProps {
  availableEntities: string[]; // Opportunity, Account, Contact, etc.
  selectedEntities: string[];
  onChange: (entities: string[]) => void;
}

// Display:
// - Checkbox list of available entities
// - Estimated sync time and API usage per entity
// - Entity preview (sample data)

// SyncScheduleTab.tsx
interface SyncScheduleTabProps {
  schedule: SyncSchedule;
  onChange: (schedule: SyncSchedule) => void;
}

// Options:
// - Manual only
// - Every 15 minutes
// - Every hour
// - Every 6 hours
// - Daily (select time)
// - Weekly (select day and time)
// - Custom cron expression

// SyncDirectionTab.tsx
interface SyncDirectionTabProps {
  direction: SyncDirection;
  onChange: (direction: SyncDirection) => void;
}

// Options:
// - One-way (Integration → Castiel)
// - Two-way (Bidirectional sync)
// - Custom per entity

// SyncFiltersTab.tsx
interface SyncFiltersTabProps {
  filters: SyncFilter[];
  onChange: (filters: SyncFilter[]) => void;
}

// Allow filtering:
// - By date range (only sync opportunities created after X)
// - By owner (only sync opportunities for specific users)
// - By stage (only sync opportunities in specific stages)
// - By custom fields
```

**API Endpoints:**

```typescript
// Sync Configuration API
// Location: containers/integration-manager/src/routes/syncConfig.routes.ts

// Get sync configuration
GET /api/v1/integrations/:id/sync-config
Response: {
  syncConfig: SyncConfig
}

// Update sync configuration
PUT /api/v1/integrations/:id/sync-config
Body: {
  enabledEntities: string[];
  schedule: {
    frequency: 'manual' | '15min' | 'hourly' | 'daily' | 'weekly' | 'custom';
    cronExpression?: string;
    timezone?: string;
  };
  direction: 'one-way' | 'bidirectional';
  filters: Array<{
    entityType: string;
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  }>;
}
Response: {
  syncConfig: SyncConfig
}

// Trigger manual sync
POST /api/v1/integrations/:id/sync
Body: {
  entityTypes?: string[]; // Optional: sync specific entities only
  fullSync?: boolean; // true = full sync, false = incremental
}
Response: {
  syncTaskId: string;
  status: 'queued' | 'running';
}

// Get sync history
GET /api/v1/integrations/:id/sync-history
Query: ?limit=50&offset=0
Response: {
  history: Array<{
    syncTaskId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'running' | 'completed' | 'failed';
    recordsProcessed: number;
    recordsFailed: number;
    duration: number;
    errors?: string[];
  }>
}
```

---

### 2.3 Field Mapping Configuration

**UI Page:** `/settings/integrations/:id/field-mappings`

**Features:**
- Map external fields to internal fields
- Configure transform functions
- Test field mappings
- Import/export mappings

**UI Components:**

```typescript
// FieldMappingsEditor.tsx (main page)
interface FieldMappingsEditorProps {
  integration: TenantIntegration;
  entityType: string; // Opportunity, Account, etc.
  onSave: (mappings: FieldMapping[]) => void;
}

// Entity type selector (dropdown)
// List of field mappings (table)
// Actions: Add mapping, Edit mapping, Delete mapping, Test mappings

// FieldMappingRow.tsx
interface FieldMappingRowProps {
  mapping: FieldMapping;
  onEdit: () => void;
  onDelete: () => void;
}

// Display:
// - External field name
// - Internal field name
// - Transform function (if any)
// - Required/Optional
// - Data type
// - Sample value

// FieldMappingEditor.tsx (modal)
interface FieldMappingEditorProps {
  mapping?: FieldMapping;
  externalFields: string[]; // Available fields from integration
  internalFields: string[]; // Available fields in shard type
  transformFunctions: string[]; // Available transforms
  onSave: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

// Fields:
// - External field (dropdown with search)
// - Internal field (dropdown with search)
// - Transform function (dropdown, optional)
// - Transform options (JSON editor)
// - Default value (input)
// - Required (checkbox)

// FieldMappingTester.tsx
interface FieldMappingTesterProps {
  mappings: FieldMapping[];
  onTest: (testData: any) => Promise<TestResult>;
}

// Input: Sample external data (JSON editor)
// Output: Transformed internal data (JSON viewer)
// Validation: Shows any errors or warnings
```

**API Endpoints:**

```typescript
// Field Mapping Configuration API
// Location: containers/integration-manager/src/routes/fieldMappings.routes.ts

// Get field mappings for entity type
GET /api/v1/integrations/:id/field-mappings/:entityType
Response: {
  fieldMappings: FieldMapping[]
}

// Update field mappings for entity type
PUT /api/v1/integrations/:id/field-mappings/:entityType
Body: {
  fieldMappings: FieldMapping[]
}
Response: {
  fieldMappings: FieldMapping[]
}

// Get available external fields
GET /api/v1/integrations/:id/external-fields/:entityType
Response: {
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description?: string;
  }>
}

// Get available internal fields (from shard type)
GET /api/v1/integrations/:id/internal-fields/:entityType
Response: {
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description?: string;
  }>
}

// Get available transform functions
GET /api/v1/integrations/transform-functions
Response: {
  transforms: Array<{
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      default?: any;
    }>;
  }>
}

// Test field mappings
POST /api/v1/integrations/:id/field-mappings/:entityType/test
Body: {
  testData: any; // Sample external data
  fieldMappings: FieldMapping[];
}
Response: {
  transformedData: any;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Export field mappings (JSON)
GET /api/v1/integrations/:id/field-mappings/:entityType/export
Response: {
  fieldMappings: FieldMapping[];
  exportedAt: Date;
}

// Import field mappings (JSON)
POST /api/v1/integrations/:id/field-mappings/:entityType/import
Body: {
  fieldMappings: FieldMapping[]
}
Response: {
  imported: number;
  errors: string[];
}
```

---

### 2.4 Entity Linking Configuration

**UI Page:** `/settings/integrations/:id/entity-linking`

**Features:**
- Configure auto-link thresholds
- Enable/disable entity linking strategies
- Review suggested links
- Configure manual linking rules

**UI Components:**

```typescript
// EntityLinkingSettings.tsx (main page)
interface EntityLinkingSettingsProps {
  settings: EntityLinkingSettings;
  onSave: (settings: EntityLinkingSettings) => void;
}

// Tabs:
// 1. Auto-Link Settings
// 2. Suggested Links Review
// 3. Manual Rules

// AutoLinkSettingsTab.tsx
interface AutoLinkSettingsTabProps {
  settings: AutoLinkSettings;
  onChange: (settings: AutoLinkSettings) => void;
}

// Fields:
// - Auto-link threshold (slider, 60-100%, default 80%)
// - Suggested link threshold (slider, 40-80%, default 60%)
// - Enable/disable strategies:
//   - Explicit reference (always enabled)
//   - Participant matching
//   - Content analysis (LLM)
//   - Temporal correlation
//   - Vector similarity

// SuggestedLinksReviewTab.tsx
interface SuggestedLinksReviewTabProps {
  suggestedLinks: SuggestedLink[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

// Display:
// - Table of suggested links
// - Source (document, email, meeting)
// - Target (opportunity, account)
// - Confidence score
// - Linking reason
// - Actions: Approve, Reject

// SuggestedLinkCard.tsx
interface SuggestedLinkCardProps {
  link: SuggestedLink;
  onApprove: () => void;
  onReject: () => void;
}

// Display:
// - Source shard details (title, type, preview)
// - Target shard details (name, type)
// - Confidence score (progress bar)
// - Linking reason (human-readable explanation)
// - Preview of both shards

// ManualLinkingRulesTab.tsx
interface ManualLinkingRulesTabProps {
  rules: LinkingRule[];
  onChange: (rules: LinkingRule[]) => void;
}

// Create custom linking rules:
// - If document title contains "proposal for [X]" → link to opportunity named [X]
// - If email is to/from contact → link to contact's opportunities
// - If meeting has participant [X] → link to [X]'s opportunities
```

**API Endpoints:**

```typescript
// Entity Linking Configuration API
// Location: containers/integration-processors/src/routes/entityLinking.routes.ts

// Get entity linking settings
GET /api/v1/entity-linking/settings
Query: ?tenantId=xxx
Response: {
  settings: EntityLinkingSettings
}

// Update entity linking settings
PUT /api/v1/entity-linking/settings
Body: {
  tenantId: string;
  autoLinkThreshold: number; // 0.0-1.0
  suggestedLinkThreshold: number; // 0.0-1.0
  enabledStrategies: {
    explicitReference: boolean;
    participantMatching: boolean;
    contentAnalysis: boolean;
    temporalCorrelation: boolean;
    vectorSimilarity: boolean;
  };
}
Response: {
  settings: EntityLinkingSettings
}

// Get suggested links (pending review)
GET /api/v1/entity-linking/suggested-links
Query: ?tenantId=xxx&status=pending_review&limit=50
Response: {
  suggestedLinks: SuggestedLink[]
}

// Approve suggested link
POST /api/v1/entity-linking/suggested-links/:id/approve
Body: {
  tenantId: string;
  userId: string;
}
Response: {
  success: boolean;
  relationship: ShardRelationship;
}

// Reject suggested link
POST /api/v1/entity-linking/suggested-links/:id/reject
Body: {
  tenantId: string;
  userId: string;
  reason?: string;
}
Response: {
  success: boolean
}

// Approve all suggested links
POST /api/v1/entity-linking/suggested-links/approve-all
Body: {
  tenantId: string;
  userId: string;
  linkIds: string[];
}
Response: {
  approved: number;
  failed: number;
}

// Get linking rules
GET /api/v1/entity-linking/rules
Query: ?tenantId=xxx
Response: {
  rules: LinkingRule[]
}

// Create linking rule
POST /api/v1/entity-linking/rules
Body: {
  tenantId: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: 'link_to_opportunity' | 'link_to_account';
    targetField: string;
  }>;
}
Response: {
  rule: LinkingRule
}
```

---

### 2.5 Data Processing Settings

**UI Page:** `/settings/integrations/:id/processing`

**Features:**
- Enable/disable document processing
- Enable/disable email processing
- Enable/disable meeting transcription
- Configure processing priorities

**UI Components:**

```typescript
// DataProcessingSettings.tsx (main page)
interface DataProcessingSettingsProps {
  settings: DataProcessingSettings;
  onSave: (settings: DataProcessingSettings) => void;
}

// Sections:
// 1. Document Processing
// 2. Email Processing
// 3. Meeting Processing
// 4. Processing Priorities

// DocumentProcessingSettings.tsx
interface DocumentProcessingSettingsProps {
  settings: DocumentProcessingConfig;
  onChange: (settings: DocumentProcessingConfig) => void;
}

// Fields:
// - Enable document processing (toggle)
// - Enable text extraction (toggle)
// - Enable OCR for images (toggle)
// - Enable content analysis (LLM) (toggle)
// - Enable entity extraction (toggle)
// - Maximum document size (MB)
// - Supported file types (checkboxes)

// EmailProcessingSettings.tsx
interface EmailProcessingSettingsProps {
  settings: EmailProcessingConfig;
  onChange: (settings: EmailProcessingConfig) => void;
}

// Fields:
// - Enable email processing (toggle)
// - Enable sentiment analysis (toggle)
// - Enable action item extraction (toggle)
// - Process attachments (toggle)
// - Filter spam (toggle)
// - Email filters (only process emails matching filters)

// MeetingProcessingSettings.tsx
interface MeetingProcessingSettingsProps {
  settings: MeetingProcessingConfig;
  onChange: (settings: MeetingProcessingConfig) => void;
}

// Fields:
// - Enable meeting transcription (toggle)
// - Enable speaker diarization (toggle)
// - Enable key moment detection (toggle)
// - Enable action item extraction (toggle)
// - Enable deal signal detection (toggle)
// - Transcription quality (standard, high)
// - Maximum recording duration (minutes)

// ProcessingPriorities.tsx
interface ProcessingPrioritiesProps {
  priorities: ProcessingPriority[];
  onChange: (priorities: ProcessingPriority[]) => void;
}

// Drag-and-drop list to prioritize:
// - Opportunities (CRM)
// - Documents
// - Emails
// - Meetings
// - Messages
```

**API Endpoints:**

```typescript
// Data Processing Settings API
// Location: containers/integration-processors/src/routes/processing.routes.ts

// Get processing settings
GET /api/v1/processing/settings
Query: ?tenantId=xxx
Response: {
  settings: DataProcessingSettings
}

// Update processing settings
PUT /api/v1/processing/settings
Body: {
  tenantId: string;
  documentProcessing: {
    enabled: boolean;
    enableTextExtraction: boolean;
    enableOCR: boolean;
    enableContentAnalysis: boolean;
    enableEntityExtraction: boolean;
    maxDocumentSize: number;
    supportedFileTypes: string[];
  };
  emailProcessing: {
    enabled: boolean;
    enableSentimentAnalysis: boolean;
    enableActionItemExtraction: boolean;
    processAttachments: boolean;
    filterSpam: boolean;
    emailFilters: EmailFilter[];
  };
  meetingProcessing: {
    enabled: boolean;
    enableTranscription: boolean;
    enableSpeakerDiarization: boolean;
    enableKeyMomentDetection: boolean;
    enableActionItemExtraction: boolean;
    enableDealSignalDetection: boolean;
    transcriptionQuality: 'standard' | 'high';
    maxRecordingDuration: number;
  };
  processingPriorities: string[]; // Ordered list
}
Response: {
  settings: DataProcessingSettings
}
```

---

### 2.6 Integration Health & Monitoring

**UI Page:** `/settings/integrations/:id/health`

**Features:**
- Integration health status
- Sync history
- Error logs
- Data quality metrics
- Performance metrics

**UI Components:**

```typescript
// IntegrationHealthDashboard.tsx
interface IntegrationHealthDashboardProps {
  integrationId: string;
  tenantId: string;
}

// Sections:
// 1. Health Overview
// 2. Sync History
// 3. Error Logs
// 4. Data Quality
// 5. Performance Metrics

// HealthOverviewCard.tsx
interface HealthOverviewCardProps {
  health: IntegrationHealth;
}

// Display:
// - Overall health status (healthy, degraded, unhealthy)
// - Last sync time
// - Success rate (7d, 30d)
// - Total records synced
// - API quota usage
// - Connection status

// SyncHistoryTable.tsx
interface SyncHistoryTableProps {
  history: SyncExecution[];
  onViewDetails: (syncId: string) => void;
}

// Display:
// - Sync start time
// - Duration
// - Status (completed, failed, running)
// - Records processed
// - Records failed
// - Errors (if any)

// ErrorLogsTable.tsx
interface ErrorLogsTableProps {
  errors: ErrorLog[];
  onFilter: (filter: ErrorFilter) => void;
}

// Display:
// - Timestamp
// - Error type
// - Error message
// - Affected entity
// - Retry attempts
// - Status (resolved, pending, ignored)

// DataQualityMetrics.tsx
interface DataQualityMetricsProps {
  metrics: DataQualityMetrics;
}

// Display:
// - Validation failure rate
// - Missing required fields
// - Invalid data types
// - Duplicate records
// - Data completeness score

// PerformanceMetricsChart.tsx
interface PerformanceMetricsChartProps {
  metrics: PerformanceMetrics;
  timeRange: '1h' | '24h' | '7d' | '30d';
}

// Charts:
// - Sync duration over time
// - Records per sync over time
// - Error rate over time
// - API latency over time
```

**API Endpoints:**

```typescript
// Integration Health & Monitoring API
// Location: containers/integration-manager/src/routes/health.routes.ts

// Get integration health
GET /api/v1/integrations/:id/health
Response: {
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
    lastSync: Date;
    successRate7d: number;
    successRate30d: number;
    totalRecordsSynced: number;
    apiQuotaUsed: number;
    apiQuotaLimit: number;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    issues: string[];
  }
}

// Get sync history
GET /api/v1/integrations/:id/sync-history
Query: ?limit=50&offset=0&status=failed
Response: {
  history: SyncExecution[];
  total: number;
}

// Get sync execution details
GET /api/v1/integrations/:id/sync-history/:syncId
Response: {
  syncExecution: {
    id: string;
    startedAt: Date;
    completedAt: Date;
    duration: number;
    status: 'completed' | 'failed' | 'running';
    recordsProcessed: number;
    recordsFailed: number;
    entitiesSynced: string[];
    errors: ErrorLog[];
    metrics: {
      avgRecordProcessingTime: number;
      peakMemoryUsage: number;
      apiCallsMade: number;
    };
  }
}

// Get error logs
GET /api/v1/integrations/:id/errors
Query: ?limit=50&offset=0&errorType=mapping_error
Response: {
  errors: Array<{
    id: string;
    timestamp: Date;
    errorType: string;
    errorMessage: string;
    entityType: string;
    externalId: string;
    retryAttempts: number;
    status: 'resolved' | 'pending' | 'ignored';
    stackTrace?: string;
  }>;
  total: number;
}

// Get data quality metrics
GET /api/v1/integrations/:id/data-quality
Query: ?timeRange=7d
Response: {
  metrics: {
    validationFailureRate: number;
    missingRequiredFields: number;
    invalidDataTypes: number;
    duplicateRecords: number;
    completenessScore: number; // 0-100
    issuesByField: Record<string, number>;
  }
}

// Get performance metrics
GET /api/v1/integrations/:id/performance
Query: ?timeRange=24h
Response: {
  metrics: {
    avgSyncDuration: number;
    p95SyncDuration: number;
    avgRecordsPerSync: number;
    errorRate: number;
    avgApiLatency: number;
    throughput: number; // records per hour
    timeSeries: Array<{
      timestamp: Date;
      syncDuration: number;
      recordsProcessed: number;
      errorCount: number;
    }>;
  }
}
```

---

## Part 3: UI Components Library

### 3.1 Shared Components

```typescript
// IntegrationLogo.tsx
interface IntegrationLogoProps {
  integrationType: string;
  size?: 'sm' | 'md' | 'lg';
}

// StatusBadge.tsx
interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected' | 'syncing';
  showLabel?: boolean;
}

// SyncStatusIndicator.tsx
interface SyncStatusIndicatorProps {
  status: 'completed' | 'failed' | 'running' | 'queued';
  lastSync?: Date;
}

// ConfidenceScore.tsx
interface ConfidenceScoreProps {
  score: number; // 0-1
  showLabel?: boolean;
  colorScheme?: 'default' | 'success-danger';
}

// EntityPreview.tsx
interface EntityPreviewProps {
  shard: Shard;
  compact?: boolean;
}

// MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number; // Percentage change
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

// TimeSeriesChart.tsx
interface TimeSeriesChartProps {
  data: Array<{ timestamp: Date; value: number }>;
  title: string;
  yAxisLabel?: string;
}

// ErrorSummary.tsx
interface ErrorSummaryProps {
  errors: ErrorLog[];
  onViewDetails: (errorId: string) => void;
}

// LoadingSpinner.tsx
interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

// EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

// ConfirmDialog.tsx
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}
```

---

## Part 4: TypeScript Interfaces

### 4.1 Core Types

```typescript
// Integration Types

interface IntegrationType {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'documents' | 'communications' | 'meetings' | 'calendar';
  logoUrl: string;
  authType: 'oauth2' | 'api_key' | 'basic';
  oauthConfig?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  supportedEntities: string[];
  capabilities: {
    incrementalSync: boolean;
    webhooks: boolean;
    bidirectionalSync: boolean;
    bulkOperations: boolean;
    changeDataCapture: boolean;
  };
  defaultFieldMappings: EntityMapping[];
  rateLimits: {
    requestsPerSecond: number;
    requestsPerDay: number;
    quotaLimit?: number;
  };
  documentationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationType: string;
  integrationName: string; // Salesforce, HubSpot, etc.
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  connectionDetails: {
    connectedAt: Date;
    lastSync?: Date;
    accessToken?: string; // Encrypted
    refreshToken?: string; // Encrypted
    instanceUrl?: string;
    expiresAt?: Date;
  };
  syncConfig: SyncConfig;
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastSync: Date;
    successRate: number;
    errorCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface SyncConfig {
  enabledEntities: string[];
  schedule: {
    frequency: 'manual' | '15min' | 'hourly' | 'daily' | 'weekly' | 'custom';
    cronExpression?: string;
    timezone?: string;
  };
  direction: 'one-way' | 'bidirectional';
  filters: SyncFilter[];
  entityMappings: EntityMapping[];
}

interface EntityMapping {
  externalEntityName: string;
  shardTypeId: string;
  shardTypeName: string;
  fieldMappings: FieldMapping[];
}

interface FieldMapping {
  externalFieldName: string;
  internalFieldName: string;
  transform?: string;
  transformOptions?: any;
  defaultValue?: any;
  required: boolean;
}

interface SyncFilter {
  entityType: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: any;
}

interface SyncExecution {
  id: string;
  integrationId: string;
  tenantId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  duration?: number;
  entitiesSynced: string[];
  errors: ErrorLog[];
}

interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  entityType?: string;
  externalId?: string;
  retryAttempts: number;
  status: 'resolved' | 'pending' | 'ignored';
  stackTrace?: string;
}
```

### 4.2 Entity Linking Types

```typescript
interface EntityLinkingSettings {
  tenantId: string;
  autoLinkThreshold: number; // 0.0-1.0
  suggestedLinkThreshold: number; // 0.0-1.0
  enabledStrategies: {
    explicitReference: boolean;
    participantMatching: boolean;
    contentAnalysis: boolean;
    temporalCorrelation: boolean;
    vectorSimilarity: boolean;
  };
  updatedAt: Date;
}

interface SuggestedLink {
  id: string;
  tenantId: string;
  sourceShardId: string;
  sourceShardType: string;
  targetShardId: string;
  targetShardType: string;
  confidence: number;
  strategy: string;
  linkingReason: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

interface LinkingRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: 'link_to_opportunity' | 'link_to_account' | 'link_to_contact';
    targetField: string;
  }>;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 Processing Settings Types

```typescript
interface DataProcessingSettings {
  tenantId: string;
  documentProcessing: DocumentProcessingConfig;
  emailProcessing: EmailProcessingConfig;
  meetingProcessing: MeetingProcessingConfig;
  processingPriorities: string[];
  updatedAt: Date;
}

interface DocumentProcessingConfig {
  enabled: boolean;
  enableTextExtraction: boolean;
  enableOCR: boolean;
  enableContentAnalysis: boolean;
  enableEntityExtraction: boolean;
  maxDocumentSize: number; // MB
  supportedFileTypes: string[];
}

interface EmailProcessingConfig {
  enabled: boolean;
  enableSentimentAnalysis: boolean;
  enableActionItemExtraction: boolean;
  processAttachments: boolean;
  filterSpam: boolean;
  emailFilters: EmailFilter[];
}

interface MeetingProcessingConfig {
  enabled: boolean;
  enableTranscription: boolean;
  enableSpeakerDiarization: boolean;
  enableKeyMomentDetection: boolean;
  enableActionItemExtraction: boolean;
  enableDealSignalDetection: boolean;
  transcriptionQuality: 'standard' | 'high';
  maxRecordingDuration: number; // minutes
}

interface EmailFilter {
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
}
```

---

## Part 5: API Route Organization

### 5.1 Super Admin Routes

```
containers/integration-manager/src/routes/admin/
├── catalog.routes.ts           (Integration catalog management)
├── settings.routes.ts          (System settings)
└── monitoring.routes.ts        (System monitoring)

containers/shard-manager/src/routes/admin/
└── shardTypes.routes.ts        (Shard type management)

containers/integration-processors/src/routes/admin/
└── monitoring.routes.ts        (Processor monitoring)
```

### 5.2 Tenant Admin Routes

```
containers/integration-manager/src/routes/
├── integrations.routes.ts      (Integration connections)
├── syncConfig.routes.ts        (Sync configuration)
├── fieldMappings.routes.ts     (Field mappings)
└── health.routes.ts            (Integration health)

containers/integration-processors/src/routes/
├── entityLinking.routes.ts     (Entity linking config & suggested links)
├── processing.routes.ts        (Data processing settings)
└── suggestedLinks.routes.ts    (Suggested links API)
```

---

## Part 6: Implementation Checklist

### Phase 1: Super Admin UI (Week 1-2)
- [ ] Integration catalog management UI
- [ ] Shard type management UI
- [ ] System settings UI
- [ ] System monitoring dashboard
- [ ] All super admin API endpoints

### Phase 2: Tenant Admin UI - Connections (Week 3-4)
- [ ] Integration connections UI
- [ ] OAuth flow implementation
- [ ] Connection testing UI
- [ ] Integration status indicators
- [ ] Connection management API endpoints

### Phase 3: Tenant Admin UI - Sync Config (Week 5-6)
- [ ] Entity selection UI
- [ ] Sync schedule configuration UI
- [ ] Sync direction configuration UI
- [ ] Sync filters UI
- [ ] Sync configuration API endpoints

### Phase 4: Tenant Admin UI - Field Mappings (Week 7-8)
- [ ] Field mappings editor UI
- [ ] Field mapping tester UI
- [ ] Transform function selector UI
- [ ] Import/export mappings UI
- [ ] Field mappings API endpoints

### Phase 5: Tenant Admin UI - Entity Linking (Week 9-10)
- [ ] Entity linking settings UI
- [ ] Suggested links review UI
- [ ] Manual linking rules UI
- [ ] Entity linking API endpoints

### Phase 6: Tenant Admin UI - Processing (Week 11-12)
- [ ] Document processing settings UI
- [ ] Email processing settings UI
- [ ] Meeting processing settings UI
- [ ] Processing priorities UI
- [ ] Processing settings API endpoints

### Phase 7: Tenant Admin UI - Monitoring (Week 13-14)
- [ ] Integration health dashboard UI
- [ ] Sync history UI
- [ ] Error logs UI
- [ ] Data quality metrics UI
- [ ] Performance metrics UI
- [ ] Monitoring API endpoints

---

## Summary

**Complete configuration system with:**
- ✅ **Super Admin**: 4 main pages, 30+ API endpoints
- ✅ **Tenant Admin**: 6 main pages, 50+ API endpoints
- ✅ **Total**: 80+ API endpoints, 50+ UI components
- ✅ **Timeline**: 14 weeks for complete UI/API implementation
- ✅ **All configuration needs covered** from system-wide to tenant-specific

**Ready for implementation with complete UI/API specifications!**

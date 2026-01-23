# Content Generation - Configuration Reference

Quick reference for all configuration options in the Content Generation Module.

---

## Environment Variables

### Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENT_GEN_ENABLED` | ❌ | `true` | Enable/disable content generation |
| `CONTENT_GEN_DEFAULT_MODEL` | ❌ | `gpt-4` | Default AI model for generation |
| `CONTENT_GEN_MAX_PAGES` | ❌ | `50` | Maximum pages per generation |
| `CONTENT_GEN_DEFAULT_TEMPERATURE` | ❌ | `0.7` | Default AI temperature |

### Rendering Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENT_GEN_SYNC_MAX_PAGES` | ❌ | `10` | Threshold for async mode (pages) |
| `CONTENT_GEN_SYNC_MAX_ELEMENTS` | ❌ | `100` | Threshold for async mode (elements) |
| `CONTENT_GEN_SYNC_TIMEOUT_MS` | ❌ | `30000` | Sync render timeout (ms) |
| `CONTENT_GEN_RENDER_QUALITY` | ❌ | `standard` | Default render quality |

### Storage Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENT_GEN_STORAGE_CONTAINER` | ❌ | `generatedContent` | Azure Blob container name |
| `CONTENT_GEN_RETENTION_DAYS` | ❌ | `180` | Default file retention (days) |
| `CONTENT_GEN_MIN_RETENTION_DAYS` | ❌ | `7` | Minimum retention (system) |
| `CONTENT_GEN_MAX_RETENTION_DAYS` | ❌ | `365` | Maximum retention (system) |

### Quota Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENT_GEN_DAILY_LIMIT` | ❌ | `100` | Default daily generations per tenant |
| `CONTENT_GEN_MONTHLY_LIMIT` | ❌ | `2000` | Default monthly generations per tenant |
| `CONTENT_GEN_MAX_FILE_SIZE_MB` | ❌ | `50` | Maximum output file size (MB) |

### Google Integration (Slides & Docs)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | ⚠️ | - | Path to service account JSON (server-to-server) |
| `GOOGLE_CLIENT_ID` | ⚠️ | - | OAuth client ID (user authentication) |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | - | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ⚠️ | - | OAuth redirect URI |
| `GOOGLE_DRIVE_FOLDER_ID` | ❌ | - | Default Drive folder for generated documents |

⚠️ Required for Google Slides/Docs placeholder extraction and generation

### Microsoft Integration (Word & PowerPoint)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_TENANT_ID` | ⚠️ | - | Azure AD tenant ID |
| `MICROSOFT_CLIENT_ID` | ⚠️ | - | Azure AD app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | ⚠️ | - | Azure AD app registration client secret |
| `MICROSOFT_REDIRECT_URI` | ⚠️ | - | OAuth redirect URI |
| `ONEDRIVE_DEFAULT_FOLDER_ID` | ❌ | - | Default OneDrive folder for generated documents |

⚠️ Required for Microsoft Word/PowerPoint placeholder extraction and generation

### Template Container Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEMPLATE_CONTAINER_NAME` | ❌ | `document-templates` | Cosmos DB container name for templates |
| `TEMPLATE_MAX_VERSIONS` | ❌ | `5` | Maximum number of template versions to keep |
| `TEMPLATE_MAX_COLORS` | ❌ | `6` | Maximum dominant colors per template |

### Azure Service Bus Settings (Async Processing)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SERVICE_BUS_CONNECTION_STRING` | ⚠️ | - | Azure Service Bus connection string |
| `CONTENT_GEN_TOPIC_NAME` | ❌ | `content-generation` | Service Bus topic name |
| `CONTENT_GEN_SUBSCRIPTION_NAME` | ❌ | `content-generation-workers` | Service Bus subscription name |
| `CONTENT_GEN_JOB_TIMEOUT_MS` | ❌ | `300000` | Job timeout (5 min) |
| `CONTENT_GEN_JOB_RETRIES` | ❌ | `3` | Number of retry attempts |
| `CONTENT_GEN_MAX_CONCURRENT_JOBS` | ❌ | `10` | Max concurrent jobs per worker |

⚠️ Required for async document generation

---

## Tenant Settings

Settings configurable per tenant (via database or API).

### Generation Settings

| Setting | Default | Editable By | Description |
|---------|---------|-------------|-------------|
| `content_generation_enabled` | `true` | Super Admin | Enable for tenant |
| `daily_generation_limit` | `100` | Super Admin | Daily limit |
| `monthly_generation_limit` | `2000` | Super Admin | Monthly limit |
| `allowed_models` | `['gpt-4', 'gpt-3.5-turbo']` | Super Admin | Allowed AI models |
| `default_model` | `gpt-4` | Tenant Admin | Default model |
| `default_assistant_id` | - | Tenant Admin | Default c_assistant |

### Rendering Settings

| Setting | Default | Editable By | Description |
|---------|---------|-------------|-------------|
| `sync_threshold_pages` | `10` | Super Admin | Async mode threshold |
| `allowed_formats` | `['google_slides', 'google_docs', 'word', 'powerpoint']` | Super Admin | Allowed output formats |
| `google_slides_enabled` | `false` | Super Admin | Enable Google Slides |
| `google_docs_enabled` | `false` | Super Admin | Enable Google Docs |
| `microsoft_word_enabled` | `false` | Super Admin | Enable Microsoft Word |
| `microsoft_powerpoint_enabled` | `false` | Super Admin | Enable Microsoft PowerPoint |
| `google_auth_mode` | `service_account` | Tenant Admin | `service_account` or `oauth` |
| `microsoft_auth_mode` | `oauth` | Tenant Admin | `oauth` or `service_principal` |

### Storage Settings

| Setting | Default | Editable By | Description |
|---------|---------|-------------|-------------|
| `retention_days` | `180` | Tenant Admin | File retention days |
| `max_file_size_mb` | `50` | Super Admin | Max output file size |

### Setting Schema

```typescript
interface TenantContentGenerationSettings {
  tenantId: string;
  
  // Generation
  enabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  allowedModels: string[];
  defaultModel: string;
  defaultAssistantId?: string;
  
  // Rendering
  syncThresholdPages: number;
  syncThresholdElements: number;
  allowedFormats: OutputFormat[];
  googleSlidesEnabled: boolean;
  googleAuthMode: 'service_account' | 'oauth';
  
  // Storage
  retentionDays: number;
  maxFileSizeMb: number;
  
  // Metadata
  updatedAt: Date;
  updatedBy: string;
}
```

---

## Quota Configuration

### Quota Structure

```typescript
interface TenantGenerationQuota {
  tenantId: string;
  
  daily: {
    limit: number;
    used: number;
    resetAt: Date;              // Daily reset time (UTC midnight)
  };
  
  monthly: {
    limit: number;
    used: number;
    resetAt: Date;              // First of month
  };
  
  // Model-specific limits (optional)
  modelLimits?: {
    [modelId: string]: {
      dailyTokens: number;
      monthlyTokens: number;
      usedDailyTokens: number;
      usedMonthlyTokens: number;
    };
  };
}
```

### Quota Defaults by Tier

| Tier | Daily | Monthly | Max Pages |
|------|-------|---------|-----------|
| **Free** | 10 | 100 | 10 |
| **Starter** | 50 | 500 | 25 |
| **Professional** | 100 | 2000 | 50 |
| **Enterprise** | 500 | 10000 | 100 |
| **Unlimited** | ∞ | ∞ | 100 |

---

## Renderer Configuration

### HTML Renderer

```typescript
interface HTMLRendererConfig {
  // Viewport
  defaultWidth: number;           // 1920
  defaultHeight: number;          // 1080
  
  // Assets
  embedImages: boolean;           // true = base64, false = URLs
  embedFonts: boolean;            // Include web fonts
  
  // Features
  enableAnimations: boolean;      // true
  enableNavigation: boolean;      // true (arrow keys, click)
  enablePrintMode: boolean;       // true
  
  // Output
  minifyHtml: boolean;           // true for production
  minifyCss: boolean;            // true for production
  minifyJs: boolean;             // true for production
}
```

### PPTX Renderer

```typescript
interface PPTXRendererConfig {
  // Slide size
  layout: '16x9' | '4x3' | 'custom';
  customWidth?: number;           // inches
  customHeight?: number;          // inches
  
  // Quality
  imageQuality: number;           // 0.8 (80%)
  maxImageDimension: number;      // 1920px
  
  // Features
  includeNotes: boolean;          // true
  includeAnimations: boolean;     // true
  compressImages: boolean;        // true
}
```

### PDF Renderer

```typescript
interface PDFRendererConfig {
  // Page size
  format: 'A4' | 'Letter' | 'presentation';
  landscape: boolean;             // auto based on documentType
  
  // Quality
  quality: 'draft' | 'standard' | 'high';
  dpi: number;                    // 72 / 150 / 300
  
  // Margins (for documents)
  margin: {
    top: string;                  // '20mm'
    right: string;                // '15mm'
    bottom: string;               // '20mm'
    left: string;                 // '15mm'
  };
  
  // Features
  displayHeaderFooter: boolean;   // for documents
  printBackground: boolean;       // true
}
```

### Google Slides Renderer

```typescript
interface GoogleSlidesRendererConfig {
  // Authentication
  authMode: 'service_account' | 'oauth';
  serviceAccountKeyPath?: string;
  
  // Presentation
  defaultSharing: 'private' | 'view' | 'comment' | 'edit';
  targetFolder?: string;          // Drive folder ID
  
  // Features
  includeNotes: boolean;          // true
  generateThumbnail: boolean;     // true
}
```

---

## Template Container Configuration

### Template Storage

Templates are stored in Azure Cosmos DB container (separate from Shards):

**Container**: `document-templates`  
**Partition Key**: `/tenantId`

### Template Structure

```typescript
interface DocumentTemplate {
  id: string;
  tenantId: string;
  name: string;
  documentFormat: 'google_slides' | 'google_docs' | 'word' | 'powerpoint';
  sourceDocumentId: string;
  dominantColors: string[];  // Max 6 hex colors
  placeholders: PlaceholderDefinition[];
  contextTemplateId?: string;  // Optional link to c_contextTemplate
  currentVersion: number;
  versions: TemplateVersion[];  // Max 5 versions
  status: 'draft' | 'active' | 'archived';
}
```

### Placeholder Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Free text with constraints | `{{product_description: text|min=50|max=200|tone=formal}}` |
| `number` | Numeric values | `{{avg_deal_size: number|min=0|max=500000}}` |
| `email` | Valid email format | `{{contact_email: email}}` |
| `domain` | Domain name | `{{vendor_domain: domain}}` |
| `list` | Bullet list or table | `{{top_industries: list|min=3|max=10}}` |
| `chart` | Chart placeholder (image) | `{{sales_chart: chart|type=bar|x=month|y=revenue}}` |
| `image` | Image placeholder (future) | `{{logo: image}}` |

### Chart Data Sources

| Source | Description | Configuration |
|--------|-------------|---------------|
| `shards` | Extract from related Shards | Link to c_contextTemplate, specify shardType/shardField |
| `manual` | Admin provides data | Manual data entry in UI |
| `api` | External API endpoint | API endpoint URL, authentication |
| `ai` | AI-generated sample data | Fallback when no data available |

### Chart Rendering

**Primary Source**: Google Charts API  
**Colors**: Use template dominant colors  
**Output**: PNG/SVG images inserted into documents

---

## Storage Configuration

### Blob Container Structure

```
Azure Blob Storage
└── generatedContent/                   # Container
    └── {tenantId}/
        └── {shardId}/
            ├── metadata.json           # Generation metadata
            └── assets/
                ├── chart-{n}.png       # Generated charts (Google Charts)
                └── image-{n}.png       # Processed images
```

**Note**: Generated documents are stored in Google Drive/OneDrive, not Azure Blob. Only chart images and assets are stored in Blob.

### Signed URL Configuration

```typescript
interface SignedUrlConfig {
  expirationHours: number;        // 24
  permissions: 'read' | 'write';  // 'read' for downloads
  ipRestriction?: string;         // Optional IP restriction
}
```

### Retention Configuration

```typescript
interface RetentionConfig {
  // System limits
  systemMinDays: number;          // 7 (can't set lower)
  systemMaxDays: number;          // 365 (can't set higher)
  
  // Default
  defaultDays: number;            // 180
  
  // Per-tenant overrides
  tenantOverrides: {
    [tenantId: string]: number;
  };
  
  // Cleanup
  cleanupBatchSize: number;       // 100 files per run
  cleanupIntervalHours: number;   // 24 (daily)
}
```

---

## Azure Service Bus Configuration

### Service Bus Settings

```typescript
interface ServiceBusConfig {
  // Connection
  connectionString: string;        // From AZURE_SERVICE_BUS_CONNECTION_STRING
  topicName: string;               // 'content-generation'
  subscriptionName: string;        // 'content-generation-workers'
  
  // Processing
  maxConcurrentJobs: number;       // 10
  prefetchCount: number;           // 5
  
  // Timeouts
  jobTimeoutMs: number;           // 300000 (5 min)
  lockDurationMs: number;         // 60000 (1 min)
  
  // Retries
  maxRetries: number;             // 3
  retryDelayMs: number;           // 5000 (5 sec)
  
  // Dead letter
  deadLetterEnabled: boolean;     // true
  maxDeliveryCount: number;       // 3
}
```

### Azure Function Worker Configuration

```typescript
interface FunctionWorkerConfig {
  // Scaling
  minInstances: number;            // 1
  maxInstances: number;            // 20
  
  // Processing
  batchSize: number;              // 1 (process one job at a time)
  
  // Health
  healthCheckIntervalMs: number;  // 30000
  maxExecutionTimeMs: number;     // 600000 (10 min)
}
```

---

## Notification Configuration

### Webhook Configuration

```typescript
interface WebhookConfig {
  // Retry
  maxRetries: number;             // 3
  retryDelayMs: number;           // 5000
  timeoutMs: number;              // 10000
  
  // Security
  signatureHeader: string;        // 'X-Castiel-Signature'
  signatureAlgorithm: string;     // 'sha256'
}
```

### WebSocket Configuration

```typescript
interface WebSocketConfig {
  // Connection
  path: string;                   // '/ws/content'
  pingIntervalMs: number;         // 30000
  
  // Events
  events: {
    jobStarted: boolean;          // true
    jobProgress: boolean;         // true
    jobCompleted: boolean;        // true
    jobFailed: boolean;           // true
  };
}
```

---

## API Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `POST /api/v1/content/templates/extract` | 10/min | Per tenant |
| `POST /api/v1/content/templates/{id}/generate` | 10/min | Per tenant |
| `PUT /api/v1/content/templates/{id}/placeholders/{id}` | 30/min | Per tenant |
| `POST /api/v1/content/templates/{id}/placeholders/{id}/test` | 20/min | Per tenant |
| `GET /api/v1/content/templates` | 60/min | Per tenant |
| `GET /api/v1/content/jobs/{id}` | 120/min | Per tenant |

---

## Monitoring Configuration

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `content_generation_total` | Counter | Total generations |
| `content_generation_success` | Counter | Successful generations |
| `content_generation_failed` | Counter | Failed generations |
| `content_generation_latency_ms` | Histogram | Generation time |
| `content_render_total` | Counter | Total renders |
| `content_render_latency_ms` | Histogram | Render time |
| `content_queue_depth` | Gauge | Queue size |
| `content_quota_usage` | Gauge | Quota utilization |

### Health Checks

| Check | Endpoint | Interval |
|-------|----------|----------|
| API Health | `/health` | 30s |
| Queue Health | `/health/queue` | 30s |
| Storage Health | `/health/storage` | 60s |
| Google API Health | `/health/google` | 60s |

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `CONTENT_GEN_ENABLE_GOOGLE_SLIDES` | `false` | Enable Google Slides placeholder system |
| `CONTENT_GEN_ENABLE_GOOGLE_DOCS` | `false` | Enable Google Docs placeholder system |
| `CONTENT_GEN_ENABLE_MICROSOFT_WORD` | `false` | Enable Microsoft Word placeholder system |
| `CONTENT_GEN_ENABLE_MICROSOFT_POWERPOINT` | `false` | Enable Microsoft PowerPoint placeholder system |
| `CONTENT_GEN_ENABLE_PREVIEW` | `true` | Enable placeholder preview/test generation |
| `CONTENT_GEN_ENABLE_VERSIONING` | `true` | Enable template version history |
| `CONTENT_GEN_ENABLE_NOTIFICATIONS` | `true` | Enable job completion notifications |

---

---

**Last Updated**: December 2025  
**Version**: 2.0.0  
**Maintainer**: Castiel Development Team


# Content Generation - Placeholder System Implementation TODO

## Overview

Complete implementation checklist for the Castiel Content Generation Placeholder System. Tasks are organized by phase with dependencies, priorities, and acceptance criteria.

**Estimated Total Effort**: 12-16 weeks  
**Team Size**: 2-4 developers  
**Prerequisites**: 
- Model Provider Integration
- Notification System
- Azure Service Bus setup
- Google/Microsoft OAuth configuration

---

## Phase Summary

| Phase | Focus | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1 | Foundation & Types | Week 1-2 | None |
| 2 | Template Container | Week 2-3 | Phase 1 |
| 3 | Placeholder Extraction | Week 3-5 | Phase 2 |
| 4 | Configuration Service | Week 5-6 | Phase 3 |
| 5 | Google Slides | Week 6-8 | Phase 4 |
| 6 | Google Docs | Week 8-9 | Phase 5 |
| 7 | Microsoft Word | Week 9-11 | Phase 5 |
| 8 | Microsoft PowerPoint | Week 11-12 | Phase 5 |
| 9 | Azure Service Bus & Functions | Week 12-13 | Phase 4-8 |
| 10 | API & Integration | Week 13-14 | All previous |
| 11 | Testing & QA | Week 14-16 | All previous |

---

## Phase 1: Foundation & Types (Week 1-2)

### Task 1.1: Core Types & Interfaces
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/types/template.types.ts`
- [ ] `src/content-generation/types/placeholder.types.ts`
- [ ] `src/content-generation/types/generation.types.ts`
- [ ] `src/content-generation/types/extraction.types.ts`

**Key Interfaces**:
```typescript
// template.types.ts
interface DocumentTemplate { ... }
interface TemplateVersion { ... }

// placeholder.types.ts
interface PlaceholderDefinition { ... }
interface PlaceholderConfiguration { ... }
interface PlaceholderLocation { ... }
type PlaceholderType = 'text' | 'number' | 'email' | 'domain' | 'list' | 'chart' | 'image';

// generation.types.ts
interface GenerationJob { ... }
interface GenerationRequest { ... }
interface GenerationResult { ... }

// extraction.types.ts
interface ExtractionRequest { ... }
interface ExtractionResult { ... }
interface PlaceholderMatch { ... }
```

**Acceptance Criteria**:
- [ ] All interfaces exported and documented
- [ ] Full alignment with database schema
- [ ] Type guards for runtime validation

---

### Task 1.2: Configuration System
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/config/content-generation.config.ts`
- [ ] `src/content-generation/config/template.config.ts`
- [ ] `src/content-generation/config/quota.config.ts`

**Configuration Areas**:
```typescript
interface ContentGenerationConfig {
  // Template container
  templateContainerName: string;
  templateMaxVersions: number;
  templateMaxColors: number;
  
  // Generation settings
  defaultModel: string;
  defaultTemperature: number;
  
  // Async processing
  serviceBusConnectionString: string;
  serviceBusTopicName: string;
  jobTimeoutMs: number;
  maxRetries: number;
  
  // Quota settings
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
}
```

**Acceptance Criteria**:
- [ ] All settings configurable via environment
- [ ] Validation on startup
- [ ] Per-tenant override support

---

### Task 1.3: Environment Setup
**Priority**: 🔴 Critical | **Effort**: 0.5 days

**Files to Update**:
- [ ] `src/config/env.ts`
- [ ] `.env.example`

**Environment Variables**:
```bash
# Content Generation
CONTENT_GEN_ENABLED=true
CONTENT_GEN_DEFAULT_MODEL=gpt-4
CONTENT_GEN_DEFAULT_TEMPERATURE=0.7

# Template Container
TEMPLATE_CONTAINER_NAME=document-templates
TEMPLATE_MAX_VERSIONS=5
TEMPLATE_MAX_COLORS=6

# Google Integration
GOOGLE_SERVICE_ACCOUNT_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_DRIVE_FOLDER_ID=

# Microsoft Integration
AZURE_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
ONEDRIVE_DEFAULT_FOLDER_ID=

# Azure Service Bus
AZURE_SERVICE_BUS_CONNECTION_STRING=
CONTENT_GEN_TOPIC_NAME=content-generation
CONTENT_GEN_SUBSCRIPTION_NAME=content-generation-workers
CONTENT_GEN_JOB_TIMEOUT_MS=300000
CONTENT_GEN_JOB_RETRIES=3

# Quotas
CONTENT_GEN_DAILY_LIMIT=100
CONTENT_GEN_MONTHLY_LIMIT=2000
```

---

## Phase 2: Template Container (Week 2-3)

### Task 2.1: Cosmos DB Container Setup
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/repositories/template.repository.ts`
- [ ] `src/content-generation/repositories/__tests__/template.repository.test.ts`

**Container Configuration**:
- Container name: `document-templates`
- Partition key: `/tenantId`
- Indexes: `id`, `status`, `documentFormat`

**Repository Methods**:
```typescript
class TemplateRepository {
  create(template: DocumentTemplate): Promise<DocumentTemplate>;
  getById(id: string, tenantId: string): Promise<DocumentTemplate | null>;
  update(id: string, tenantId: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate>;
  list(tenantId: string, filters?: TemplateFilters): Promise<DocumentTemplate[]>;
  delete(id: string, tenantId: string): Promise<void>;
  
  // Version management
  addVersion(templateId: string, tenantId: string, version: TemplateVersion): Promise<void>;
  getVersions(templateId: string, tenantId: string): Promise<TemplateVersion[]>;
  rollbackToVersion(templateId: string, tenantId: string, versionNumber: number): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Container created in Cosmos DB
- [ ] Repository methods working
- [ ] Version management (max 5 versions)
- [ ] Test coverage > 80%

---

### Task 2.2: Template Service
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/services/template.service.ts`
- [ ] `src/content-generation/services/__tests__/template.service.test.ts`

**Service Methods**:
```typescript
class TemplateService {
  // Admin operations
  createTemplate(data: CreateTemplateRequest): Promise<DocumentTemplate>;
  getTemplate(id: string, tenantId: string): Promise<DocumentTemplate>;
  updateTemplate(id: string, tenantId: string, updates: UpdateTemplateRequest): Promise<DocumentTemplate>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  activateTemplate(id: string, tenantId: string): Promise<DocumentTemplate>;
  archiveTemplate(id: string, tenantId: string): Promise<DocumentTemplate>;
  
  // User operations (list active templates)
  listActiveTemplates(
    tenantId: string, 
    filters?: { format?: string; category?: string }
  ): Promise<DocumentTemplate[]>;
  getTemplateForUser(id: string, tenantId: string): Promise<DocumentTemplate | null>; // Only active templates
  
  // Color management
  updateColors(id: string, tenantId: string, colors: string[]): Promise<DocumentTemplate>;
  
  // Version management
  createVersion(templateId: string, tenantId: string): Promise<TemplateVersion>;
  getVersions(templateId: string, tenantId: string): Promise<TemplateVersion[]>;
  rollbackToVersion(templateId: string, tenantId: string, versionNumber: number): Promise<DocumentTemplate>;
  getVersionDiff(templateId: string, tenantId: string, version1: number, version2: number): Promise<VersionDiff>;
}
```

**Acceptance Criteria**:
- [ ] All CRUD operations working
- [ ] Template activation/deactivation working
- [ ] User can only see active templates
- [ ] Color validation (max 6, hex format)
- [ ] Version management working
- [ ] Test coverage > 80%

---

## Phase 3: Placeholder Extraction (Week 3-5)

### Task 3.1: Placeholder Parser
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/services/placeholder-parser.service.ts`
- [ ] `src/content-generation/services/__tests__/placeholder-parser.test.ts`

**Parser Methods**:
```typescript
class PlaceholderParserService {
  parsePlaceholder(rawPlaceholder: string): ParsedPlaceholder;
  extractPlaceholders(text: string, location: PlaceholderLocation): PlaceholderMatch[];
  deduplicatePlaceholders(matches: PlaceholderMatch[]): PlaceholderDefinition[];
  validatePlaceholderSyntax(placeholder: string): ValidationResult;
}
```

**Parser Logic**:
- Regex: `/\{\{([^}]+)\}\}/g`
- Parse format: `{{name:type|key=value|key=value}}`
- Extract type, metadata, constraints
- Validate syntax

**Acceptance Criteria**:
- [ ] All placeholder formats parsed correctly
- [ ] Metadata extraction working
- [ ] Deduplication working
- [ ] Test coverage > 90%

---

### Task 3.2: Document Extractor Interface
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/extractors/base-extractor.ts`
- [ ] `src/content-generation/extractors/extractor.types.ts`

**Base Extractor**:
```typescript
abstract class BaseDocumentExtractor {
  abstract extractPlaceholders(documentId: string, auth: AuthToken): Promise<ExtractionResult>;
  abstract getDocumentMetadata(documentId: string, auth: AuthToken): Promise<DocumentMetadata>;
  
  protected parsePlaceholders(text: string, location: PlaceholderLocation): PlaceholderMatch[];
  protected deduplicate(matches: PlaceholderMatch[]): PlaceholderDefinition[];
}
```

**Acceptance Criteria**:
- [ ] Abstract base class defined
- [ ] Common extraction logic shared
- [ ] Format-specific extractors can extend

---

### Task 3.3: Google Slides Extractor
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/extractors/google-slides.extractor.ts`
- [ ] `src/content-generation/extractors/__tests__/google-slides.extractor.test.ts`

**Extraction Locations**:
- Text boxes
- Shapes
- Tables
- Speaker notes

**Acceptance Criteria**:
- [ ] All locations extracted
- [ ] Placeholder locations tracked
- [ ] Context captured
- [ ] Test coverage > 80%

---

### Task 3.4: Google Docs Extractor
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/extractors/google-docs.extractor.ts`
- [ ] `src/content-generation/extractors/__tests__/google-docs.extractor.test.ts`

**Extraction Locations**:
- Paragraphs
- Headers
- Tables
- Inline text

**Acceptance Criteria**:
- [ ] All locations extracted
- [ ] Placeholder locations tracked
- [ ] Test coverage > 80%

---

### Task 3.5: Microsoft Word Extractor
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/extractors/microsoft-word.extractor.ts`
- [ ] `src/content-generation/extractors/__tests__/microsoft-word.extractor.test.ts`

**Extraction Locations**:
- Paragraphs
- Headers/Footers
- Tables
- Content controls

**Acceptance Criteria**:
- [ ] All locations extracted
- [ ] Placeholder locations tracked
- [ ] Test coverage > 80%

---

### Task 3.6: Microsoft PowerPoint Extractor
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/extractors/microsoft-powerpoint.extractor.ts`
- [ ] `src/content-generation/extractors/__tests__/microsoft-powerpoint.extractor.test.ts`

**Extraction Locations**:
- Text boxes
- Shapes
- Tables
- Notes

**Acceptance Criteria**:
- [ ] All locations extracted
- [ ] Placeholder locations tracked
- [ ] Test coverage > 80%

---

## Phase 4: Configuration Service (Week 5-6)

### Task 4.1: Placeholder Configuration Service
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/services/placeholder-config.service.ts`
- [ ] `src/content-generation/services/__tests__/placeholder-config.test.ts`

**Service Methods**:
```typescript
class PlaceholderConfigService {
  updateConfiguration(
    templateId: string,
    placeholderId: string,
    tenantId: string,
    config: PlaceholderConfiguration
  ): Promise<PlaceholderDefinition>;
  
  updateChartConfig(
    templateId: string,
    placeholderId: string,
    tenantId: string,
    chartConfig: ChartConfig
  ): Promise<PlaceholderDefinition>;
  
  linkContextTemplate(
    templateId: string,
    placeholderId: string,
    tenantId: string,
    contextTemplateId: string,
    shardField?: string
  ): Promise<PlaceholderDefinition>;
  
  validateConfiguration(config: PlaceholderConfiguration): ValidationResult;
}
```

**Acceptance Criteria**:
- [ ] Configuration updates working
- [ ] Chart config validation
- [ ] Context template linking
- [ ] Test coverage > 80%

---

### Task 4.2: Preview/Test Generation
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/services/preview.service.ts`
- [ ] `src/content-generation/services/__tests__/preview.service.test.ts`

**Service Methods**:
```typescript
class PreviewService {
  testPlaceholderGeneration(
    templateId: string,
    placeholderId: string,
    tenantId: string,
    contextShardId?: string
  ): Promise<PreviewResult>;
  
  validateAllPlaceholders(
    templateId: string,
    tenantId: string
  ): Promise<ValidationResult>;
}
```

**Acceptance Criteria**:
- [ ] Single placeholder test generation
- [ ] Preview results stored
- [ ] Validation working
- [ ] Test coverage > 80%

---

## Phase 5: Google Slides (Week 6-8)

### Task 5.1: Google API Integration
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/integrations/google/auth.service.ts`
- [ ] `src/content-generation/integrations/google/slides.client.ts`
- [ ] `src/content-generation/integrations/google/drive.client.ts`

**Authentication**:
- OAuth2 flow
- Service Account support
- Token refresh handling

**Acceptance Criteria**:
- [ ] OAuth2 flow working
- [ ] Service Account working
- [ ] Token refresh working
- [ ] Error handling

---

### Task 5.2: Google Slides Document Rewriter
**Priority**: 🔴 Critical | **Effort**: 3 days

**Files to Create**:
- [ ] `src/content-generation/rewriters/google-slides.rewriter.ts`
- [ ] `src/content-generation/rewriters/__tests__/google-slides.rewriter.test.ts`

**Rewriter Methods**:
```typescript
class GoogleSlidesRewriter {
  duplicatePresentation(
    sourceId: string, 
    newName: string,
    destinationFolderId: string,
    userToken: string
  ): Promise<{ presentationId: string; url: string }>;
  replacePlaceholders(
    presentationId: string,
    template: DocumentTemplate,
    generatedValues: Record<string, any>,
    userToken: string
  ): Promise<void>;
  insertCharts(
    presentationId: string,
    template: DocumentTemplate,
    generatedCharts: Record<string, Buffer>,
    userToken: string
  ): Promise<void>;
  getDocumentUrl(presentationId: string, userToken: string): Promise<string>;
  getFolderPath(folderId: string, userToken: string): Promise<string>;
}
```

**Key Requirements**:
- Use user's OAuth token (not service account)
- Save to user's selected folder
- Return document URL and folder path
- Do NOT store file in Castiel

**Acceptance Criteria**:
- [ ] Text replacement working
- [ ] Chart insertion working
- [ ] Style preservation
- [ ] Document saved to user's folder
- [ ] Document URL retrieved
- [ ] Folder path retrieved
- [ ] Test coverage > 80%

---

### Task 5.3: Chart Generation (Google Charts)
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/services/chart-renderer.service.ts`
- [ ] `src/content-generation/services/__tests__/chart-renderer.test.ts`

**Chart Rendering**:
- Use Google Charts API
- Apply template dominant colors
- Generate PNG/SVG images
- Upload to Azure Blob Storage

**Acceptance Criteria**:
- [ ] All chart types supported
- [ ] Colors applied correctly
- [ ] Images generated and stored
- [ ] Test coverage > 80%

---

## Phase 6: Google Docs (Week 8-9)

### Task 6.1: Google Docs API Integration
**Priority**: 🟡 High | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/integrations/google/docs.client.ts`

**Acceptance Criteria**:
- [ ] Docs API client working
- [ ] Authentication working

---

### Task 6.2: Google Docs Document Rewriter
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/rewriters/google-docs.rewriter.ts`
- [ ] `src/content-generation/rewriters/__tests__/google-docs.rewriter.test.ts`

**Rewriter Methods**:
```typescript
class GoogleDocsRewriter {
  duplicateDocument(
    sourceId: string,
    newName: string,
    destinationFolderId: string,
    userToken: string
  ): Promise<{ documentId: string; url: string }>;
  // ... other methods similar to Slides
}
```

**Acceptance Criteria**:
- [ ] Text replacement working
- [ ] List insertion working
- [ ] Style preservation
- [ ] Document saved to user's folder
- [ ] Document URL retrieved
- [ ] Test coverage > 80%

---

## Phase 7: Microsoft Word (Week 9-11)

### Task 7.1: Microsoft Graph API Integration
**Priority**: 🟡 High | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/integrations/microsoft/auth.service.ts`
- [ ] `src/content-generation/integrations/microsoft/graph.client.ts`

**Authentication**:
- OAuth2 flow (Azure AD)
- Service Principal support
- Token refresh handling

**Acceptance Criteria**:
- [ ] OAuth2 flow working
- [ ] Service Principal working
- [ ] Token refresh working

---

### Task 7.2: Microsoft Word Document Rewriter
**Priority**: 🟡 High | **Effort**: 3 days

**Files to Create**:
- [ ] `src/content-generation/rewriters/microsoft-word.rewriter.ts`
- [ ] `src/content-generation/rewriters/__tests__/microsoft-word.rewriter.test.ts`

**Rewriter Methods**:
```typescript
class MicrosoftWordRewriter {
  duplicateDocument(
    sourceId: string,
    newName: string,
    destinationFolderId: string,
    userToken: string
  ): Promise<{ documentId: string; url: string }>;
  // Download, parse, replace, upload
  getDocumentUrl(documentId: string, userToken: string): Promise<string>;
  getFolderPath(folderId: string, userToken: string): Promise<string>;
}
```

**Acceptance Criteria**:
- [ ] Text replacement working
- [ ] Chart insertion working
- [ ] List insertion working
- [ ] Document saved to user's folder
- [ ] Document URL retrieved
- [ ] Test coverage > 80%

---

## Phase 8: Microsoft PowerPoint (Week 11-12)

### Task 8.1: Microsoft PowerPoint Document Rewriter
**Priority**: 🟡 High | **Effort**: 3 days

**Files to Create**:
- [ ] `src/content-generation/rewriters/microsoft-powerpoint.rewriter.ts`
- [ ] `src/content-generation/rewriters/__tests__/microsoft-powerpoint.rewriter.test.ts`

**Rewriter Methods**:
```typescript
class MicrosoftPowerPointRewriter {
  duplicatePresentation(
    sourceId: string,
    newName: string,
    destinationFolderId: string,
    userToken: string
  ): Promise<{ presentationId: string; url: string }>;
  // Download, parse, replace, upload
  getDocumentUrl(presentationId: string, userToken: string): Promise<string>;
  getFolderPath(folderId: string, userToken: string): Promise<string>;
}
```

**Acceptance Criteria**:
- [ ] Text replacement working
- [ ] Chart insertion working
- [ ] Style preservation
- [ ] Document saved to user's folder
- [ ] Document URL retrieved
- [ ] Test coverage > 80%

---

## Phase 9: Azure Service Bus & Functions (Week 12-13)

### Task 9.1: Service Bus Setup
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/queue/generation-queue.service.ts`
- [ ] `src/content-generation/queue/__tests__/generation-queue.test.ts`

**Queue Service**:
```typescript
class GenerationQueueService {
  enqueueJob(job: GenerationJob): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Service Bus topic created
- [ ] Subscription created
- [ ] Job enqueueing working
- [ ] Status tracking working

---

### Task 9.2: Azure Function Worker
**Priority**: 🔴 Critical | **Effort**: 3 days

**Files to Create**:
- [ ] `azure-functions/content-generation-worker/index.ts`
- [ ] `azure-functions/content-generation-worker/function.json`

**Function Logic**:
1. Receive job from Service Bus
2. Load template from container
3. Get user's OAuth token for Drive/OneDrive
4. Generate content for all placeholders
5. Rewrite document (save to user's selected folder)
6. Get document URL and folder path
7. Create c_document Shard (metadata only, no file)
8. Send notification (success/error with document URL)

**Generation Job Structure**:
```typescript
interface GenerationJob {
  jobId: string;
  tenantId: string;
  userId: string;
  templateId: string;
  destinationFolder: {
    provider: 'google_drive' | 'onedrive';
    folderId: string;
  };
  userToken: string;  // OAuth token for Drive/OneDrive
  contextShardId?: string;
  options?: {
    skipPlaceholders?: string[];
    overrideValues?: Record<string, any>;
  };
}
```

**Acceptance Criteria**:
- [ ] Function triggered by Service Bus
- [ ] User token used for folder access
- [ ] Document saved to user's folder
- [ ] Document URL retrieved
- [ ] c_document Shard created (metadata only)
- [ ] Error handling
- [ ] Notification integration

---

### Task 9.3: Notification Integration
**Priority**: 🟡 High | **Effort**: 1 day

**Integration Points**:
- Success notification on job completion
- Error notification on job failure
- Use existing NotificationService

**Acceptance Criteria**:
- [ ] Success notifications sent
- [ ] Error notifications sent
- [ ] Notification content correct

---

## Phase 10: API & Integration (Week 13-14)

### Task 10.1: Content Generation API
**Priority**: 🔴 Critical | **Effort**: 3 days

**Files to Create**:
- [ ] `src/content-generation/api/template.controller.ts`
- [ ] `src/content-generation/api/template.routes.ts`
- [ ] `src/content-generation/api/generation.controller.ts`
- [ ] `src/content-generation/api/generation.routes.ts`
- [ ] `src/content-generation/api/document.controller.ts`
- [ ] `src/content-generation/api/document.routes.ts`

**Endpoints**:
```typescript
// Template management (Admin)
POST   /api/v1/content/templates/extract
GET    /api/v1/content/templates                    // Admin: all, User: active only
GET    /api/v1/content/templates/:id                // Admin: all, User: active only
PUT    /api/v1/content/templates/:id                // Admin only
DELETE /api/v1/content/templates/:id                // Admin only
PUT    /api/v1/content/templates/:id/activate       // Admin only
PUT    /api/v1/content/templates/:id/archive        // Admin only
PUT    /api/v1/content/templates/:id/colors         // Admin only

// Placeholder configuration (Admin)
PUT    /api/v1/content/templates/:id/placeholders/:placeholderId
POST   /api/v1/content/templates/:id/placeholders/:placeholderId/test

// Generation (User)
POST   /api/v1/content/templates/:id/generate       // Requires destinationFolder
GET    /api/v1/content/jobs/:jobId

// Generated documents (User)
GET    /api/v1/content/documents/:id
GET    /api/v1/content/documents                    // User's generated documents
GET    /api/v1/content/documents?templateId=:id     // Filter by template

// Version management (Admin)
POST   /api/v1/content/templates/:id/rollback
GET    /api/v1/content/templates/:id/versions
GET    /api/v1/content/templates/:id/versions/:v1/diff/:v2
```

**Generation Request Body**:
```typescript
{
  destinationFolder: {
    provider: 'google_drive' | 'onedrive',
    folderId: string
  },
  contextShardId?: string,  // Optional
  options?: {
    skipPlaceholders?: string[],
    overrideValues?: Record<string, any>
  }
}
```

**Acceptance Criteria**:
- [ ] All endpoints working
- [ ] Authentication required
- [ ] Role-based access (admin vs user)
- [ ] Tenant isolation enforced
- [ ] Validation on inputs
- [ ] Folder validation (user has access)

---

### Task 10.2: Storage Integration
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/content-generation/storage/chart-storage.service.ts`

**Storage**:
- Upload chart images to Azure Blob Storage
- Generate signed URLs
- Cleanup old charts

**Acceptance Criteria**:
- [ ] Charts uploaded correctly
- [ ] Signed URLs working
- [ ] Cleanup job working

---

### Task 10.3: Folder Picker Integration
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/content-generation/integrations/google/folder-picker.service.ts`
- [ ] `src/content-generation/integrations/microsoft/folder-picker.service.ts`

**Folder Picker Services**:
```typescript
class GoogleFolderPickerService {
  getFolderPickerUrl(redirectUri: string): string;
  validateFolderAccess(folderId: string, userToken: string): Promise<boolean>;
  getFolderPath(folderId: string, userToken: string): Promise<string>;
}

class MicrosoftFolderPickerService {
  getFolderPickerUrl(redirectUri: string): string;
  validateFolderAccess(folderId: string, userToken: string): Promise<boolean>;
  getFolderPath(folderId: string, userToken: string): Promise<string>;
}
```

**Frontend Integration**:
- Google Drive folder picker component
- OneDrive folder picker component
- Display selected folder path
- Validate folder access before generation

**Acceptance Criteria**:
- [ ] Folder picker UI working
- [ ] Folder validation working
- [ ] Folder path retrieval working
- [ ] Error handling for invalid folders

---

### Task 10.4: c_document Integration
**Priority**: 🔴 Critical | **Effort**: 2 days

**Integration**:
- Create c_document Shard after generation
- **Do NOT store file** - only metadata record
- Link to template via `generated_from_template`
- Link to context Shard via `generated_for`
- Store document metadata

**c_document Shard Structure**:
```typescript
{
  structuredData: {
    name: string;                    // Generated document name
    documentType: 'presentation' | 'document';
    source: 'google_drive' | 'onedrive';
    documentUrl: string;             // URL from Drive/OneDrive
    folderId: string;                 // Folder ID where stored
    folderPath: string;               // Human-readable folder path
    templateId: string;              // Template used
    templateName: string;             // Template name (denormalized)
    generatedAt: Date;
    generatedBy: string;              // User ID
    generationMetadata: {
      model: string;
      tokensUsed: number;
      placeholdersGenerated: number;
      contextShardId?: string;        // Optional
      generationTimeMs: number;
    }
  },
  internal_relationships: [
    {
      targetShardId: templateId,
      relationshipType: 'generated_from_template'
    },
    {
      targetShardId: contextShardId,  // If provided
      relationshipType: 'generated_for'
    }
  ]
}
```

**Acceptance Criteria**:
- [ ] Shard creation working
- [ ] Relationships set correctly
- [ ] Document URL stored correctly
- [ ] Folder information stored correctly
- [ ] ACL inheritance working
- [ ] User can list their generated documents

---

## Phase 11: Testing & QA (Week 14-16)

### Task 11.1: Unit Tests
**Priority**: 🔴 Critical | **Effort**: 3 days

**Coverage Targets**:
- Services: > 80%
- Extractors: > 80%
- Rewriters: > 80%
- Parsers: > 90%

**Test Files**:
- All service test files
- All extractor test files
- All rewriter test files
- All parser test files

---

### Task 11.2: Integration Tests
**Priority**: 🔴 Critical | **Effort**: 2 days

**Test Scenarios**:
- Full extraction flow (document → placeholders)
- Full configuration flow (extract → configure → generate)
- Full generation flow (template → document)
- Version management
- Chart generation

---

### Task 11.3: E2E Tests
**Priority**: 🟡 High | **Effort**: 2 days

**Scenarios**:
- Admin extracts placeholders from Google Slides
- Admin configures placeholders
- Admin activates template
- User browses available templates
- User selects template and destination folder
- User requests generation
- User receives notification with document link
- User views generated document in Drive/OneDrive
- User views document record in Castiel
- Admin rolls back version

---

### Task 11.4: Performance Testing
**Priority**: 🟡 High | **Effort**: 1 day

**Scenarios**:
- Large document extraction (50+ placeholders)
- Concurrent generation requests
- Service Bus throughput
- Chart generation performance

---

## File Structure

```
src/content-generation/
├── types/
│   ├── template.types.ts
│   ├── placeholder.types.ts
│   ├── generation.types.ts
│   └── extraction.types.ts
├── config/
│   ├── content-generation.config.ts
│   ├── template.config.ts
│   └── quota.config.ts
├── repositories/
│   ├── template.repository.ts
│   └── __tests__/
├── services/
│   ├── template.service.ts
│   ├── placeholder-parser.service.ts
│   ├── placeholder-config.service.ts
│   ├── preview.service.ts
│   ├── chart-renderer.service.ts
│   └── __tests__/
├── extractors/
│   ├── base-extractor.ts
│   ├── google-slides.extractor.ts
│   ├── google-docs.extractor.ts
│   ├── microsoft-word.extractor.ts
│   ├── microsoft-powerpoint.extractor.ts
│   └── __tests__/
├── rewriters/
│   ├── google-slides.rewriter.ts
│   ├── google-docs.rewriter.ts
│   ├── microsoft-word.rewriter.ts
│   ├── microsoft-powerpoint.rewriter.ts
│   └── __tests__/
├── integrations/
│   ├── google/
│   │   ├── auth.service.ts
│   │   ├── slides.client.ts
│   │   ├── docs.client.ts
│   │   └── drive.client.ts
│   └── microsoft/
│       ├── auth.service.ts
│       └── graph.client.ts
├── queue/
│   ├── generation-queue.service.ts
│   └── __tests__/
├── storage/
│   └── chart-storage.service.ts
├── api/
│   ├── template.controller.ts
│   ├── template.routes.ts
│   ├── generation.controller.ts
│   └── generation.routes.ts
└── __tests__/
    ├── integration/
    └── e2e/

azure-functions/
└── content-generation-worker/
    ├── index.ts
    ├── function.json
    └── package.json
```

---

## Success Criteria

### Functional
- [ ] Placeholder extraction works for all formats
- [ ] Admin can configure all placeholder types
- [ ] AI generates valid content for all placeholder types
- [ ] Document rewriting preserves styles
- [ ] Charts generated and inserted correctly
- [ ] Version management working
- [ ] Async jobs complete successfully

### Performance
- [ ] Extraction < 5 seconds (typical document)
- [ ] Generation < 30 seconds (10 placeholders)
- [ ] Chart rendering < 10 seconds
- [ ] Document rewriting < 15 seconds

### Quality
- [ ] Test coverage > 80%
- [ ] Zero critical bugs
- [ ] Documentation complete
- [ ] All formats supported

---

**Created**: December 2025  
**Status**: Planning  
**Owner**: Castiel Development Team

# Integration Data Flow Plan - Question Answers Part 2

**Continuation from Part 1**

---

## Section 5: Integration with Current Plan

### Question 5.1: Plan Scope

**ANSWER: Already Addressed - Complete Multi-Modal Foundation (Your Choice: Option B)**

**Recommendation:**
```yaml
Implementation Scope: Complete Multi-Modal Foundation from Day 1

Phase-by-Phase Delivery:

PHASE 1 (Weeks 1-2): Foundation + CRM
- Create all shard types upfront
- Set up all RabbitMQ queues
- Implement CRM mapping consumer
- Implement ML field aggregation consumer
- Get CRM data flow working (Opportunities, Accounts, Contacts)
- Deliverable: Working CRM integration with ML fields

PHASE 2 (Weeks 2-3): Documents
- Implement Document processor consumer
- Set up Azure Blob Storage
- Set up text extraction (pdf-parse, mammoth, etc.)
- Implement entity linking (fast + deep)
- Deliverable: Google Drive, SharePoint documents linked to opportunities

PHASE 3 (Weeks 3-4): Communications
- Implement Email processor consumer
- Implement Message processor consumer  
- Implement sentiment analysis
- Implement action item extraction
- Deliverable: Emails and Slack/Teams messages linked to opportunities

PHASE 4 (Weeks 4-5): Meetings & Calendar
- Implement Meeting processor consumer
- Set up Azure Speech Services (transcription)
- Implement meeting intelligence (key moments, action items, deal signals)
- Implement Calendar Event processor
- Deliverable: Zoom/Teams meetings with transcripts linked to opportunities

PHASE 5 (Weeks 5-6): Entity Linking & Activities
- Implement EntityLinkingConsumer (deep linking)
- Implement ActivityAggregationService
- Build unified activity timeline
- Build relationship graph
- Deliverable: Complete entity linking + unified activity views

PHASE 6 (Weeks 6-7): Testing & Refinement
- End-to-end integration tests
- Performance optimization
- Confidence threshold tuning
- Documentation
- Deliverable: Production-ready system

Total Timeline: 6-7 weeks

Why Complete Foundation:
✅ Build it right from the start
✅ No architectural rework later
✅ All processors can be built in parallel (if team > 1)
✅ Consistent architecture across all data types
✅ Users see steady stream of new features (phase by phase)
✅ Each phase delivers working functionality
✅ By Week 7, have complete multi-modal system

Risk Mitigation:
- Each phase delivers independently
- Can use earlier phases while building later ones
- CRM working by Week 2 (highest priority)
- Documents working by Week 3 (high value)
- Full system by Week 7
```

---

### Question 5.2: Opportunity Event Publishing Triggers

**ANSWER: Option B - Only on Significant Changes**

**Recommendation:**
```yaml
Opportunity Event Triggering Strategy:

PUBLISH integration.opportunity.updated WHEN:

Significant CRM Field Changes:
- stage (stage change is critical)
- amount (deal size change)
- closeDate (timing change)
- probability (confidence change)
- status (open → closed, etc.)

ML Field Changes:
- documentCount (new document linked)
- emailCount (new email linked)
- meetingCount (new meeting linked)
- stakeholderCount (new stakeholder added)

DON'T PUBLISH WHEN:
- Non-material fields change:
  - description (text update)
  - notes (internal notes)
  - lastActivityDate (tracked separately)
  - metadata fields
- Suggested links created (not yet confirmed)
- Low-confidence entity links (< 80%)

Why:
✅ Reduces event volume by ~70%
✅ Risk/forecast only recalculate when meaningful
✅ Lower compute costs
✅ Avoids "recalculation storms"
❌ May miss some edge cases (acceptable)

Configuration:
Make it configurable per tenant:
- "aggressive": Trigger on all changes
- "balanced": Trigger on significant changes (default)
- "conservative": Trigger only on stage/amount/closeDate
```

**Implementation:**
```typescript
class CRMDataMappingConsumer {
  private readonly SIGNIFICANT_FIELDS = [
    'stage',
    'amount',
    'closeDate',
    'probability',
    'status'
  ];
  
  private readonly ML_FIELDS = [
    'documentCount',
    'emailCount',
    'meetingCount',
    'stakeholderCount'
  ];
  
  async processRawData(event: IntegrationDataRawEvent) {
    // ... mapping logic ...
    
    // Check if this is an update (existing shard)
    const existingShard = await this.shardManager.getShard(event.externalId);
    
    if (existingShard) {
      // UPDATE: Check if significant fields changed
      const changedFields = this.detectChangedFields(
        existingShard.structuredData,
        structuredData
      );
      
      const hasSignificantChanges = changedFields.some(
        field => this.SIGNIFICANT_FIELDS.includes(field) || this.ML_FIELDS.includes(field)
      );
      
      // Update shard
      await this.shardManager.updateShard(existingShard.id, {
        structuredData: structuredData
      });
      
      // Publish event only if significant changes
      if (hasSignificantChanges) {
        await this.eventPublisher.publish('integration.opportunity.updated', {
          opportunityId: existingShard.id,
          tenantId: event.tenantId,
          changedFields: changedFields,
          trigger: 'crm_sync'
        });
      }
    } else {
      // CREATE: Always publish for new opportunities
      const shardId = await this.shardManager.createShard({...});
      
      await this.eventPublisher.publish('integration.opportunity.created', {
        opportunityId: shardId,
        tenantId: event.tenantId
      });
    }
  }
  
  private detectChangedFields(
    oldData: any,
    newData: any
  ): string[] {
    const changedFields: string[] = [];
    
    for (const key of Object.keys(newData)) {
      if (oldData[key] !== newData[key]) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }
}
```

**Metrics:**
```typescript
// Track event volume reduction
metrics.increment('integration.opportunity.updated.triggered', {
  reason: 'significant_change'
});

metrics.increment('integration.opportunity.updated.skipped', {
  reason: 'non_significant_change'
});
```

---

### Question 5.3: Vectorization Integration

**ANSWER: Option B - Only for Specific Shard Types**

**Recommendation:**
```yaml
Vectorization Strategy:

AUTOMATICALLY VECTORIZE:
- Document shards (full text)
- Email shards (body text)
- Meeting shards (transcript)
- Message shards (text)

DON'T VECTORIZE:
- Opportunity shards (structured data, not text)
- Account shards (structured data)
- Contact shards (structured data)
- CalendarEvent shards (minimal text)
- Activity shards (aggregated data)

Why Selective:
✅ Vectorization is expensive (LLM embeddings)
✅ Structured data doesn't benefit from semantic search
✅ Only text-heavy shards need vectorization
✅ Reduces compute costs by ~60%

Implementation:
```

```typescript
// data-enrichment service (already exists, just update filter)
class VectorizationConsumer {
  private readonly VECTORIZABLE_SHARD_TYPES = [
    'Document',
    'Email',
    'Meeting',
    'Message'
  ];
  
  // Listens to: shard.created, shard.updated
  async processShardEvent(event: ShardCreatedEvent | ShardUpdatedEvent) {
    // Filter: Only vectorize specific shard types
    if (!this.VECTORIZABLE_SHARD_TYPES.includes(event.shardTypeName)) {
      this.logger.debug('Skipping vectorization for shard type', {
        shardType: event.shardTypeName
      });
      return;
    }
    
    // Get shard
    const shard = await this.shardManager.getShard(event.shardId);
    
    // Extract text for vectorization
    const text = this.extractTextForVectorization(shard);
    
    if (!text || text.length < 50) {
      this.logger.debug('Insufficient text for vectorization', {
        shardId: event.shardId,
        textLength: text?.length || 0
      });
      return;
    }
    
    // Generate embeddings
    const embeddings = await this.generateEmbeddings(text);
    
    // Store embeddings
    await this.storeEmbeddings(event.shardId, embeddings);
    
    this.logger.info('Shard vectorized', {
      shardId: event.shardId,
      shardType: event.shardTypeName
    });
  }
  
  private extractTextForVectorization(shard: Shard): string | null {
    switch (shard.shardTypeName) {
      case 'Document':
        return shard.structuredData.extractedText;
      case 'Email':
        return shard.structuredData.bodyPlainText;
      case 'Meeting':
        return shard.structuredData.fullTranscript;
      case 'Message':
        return shard.structuredData.text;
      default:
        return null;
    }
  }
}
```

**Chunking Strategy (for long documents):**
```typescript
class VectorizationConsumer {
  private readonly MAX_CHUNK_SIZE = 8000; // characters
  
  async generateEmbeddings(text: string): Promise<Embedding[]> {
    // If text is short, vectorize as single chunk
    if (text.length <= this.MAX_CHUNK_SIZE) {
      const embedding = await this.embeddingClient.generateEmbedding(text);
      return [{ embedding, chunkIndex: 0 }];
    }
    
    // Long text: Split into chunks with overlap
    const chunks = this.splitIntoChunks(text, this.MAX_CHUNK_SIZE, 200); // 200 char overlap
    
    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map((chunk, index) =>
        this.embeddingClient.generateEmbedding(chunk).then(embedding => ({
          embedding,
          chunkIndex: index,
          chunkText: chunk
        }))
      )
    );
    
    return embeddings;
  }
}
```

---

## Section 6: Infrastructure & Dependencies

### Question 6.1: Azure Blob Storage Setup

**ANSWER: Option A - Set Up in Phase 1 (Ready for Phase 2)**

**Recommendation:**
```yaml
Azure Blob Storage Setup:

WHEN: Phase 1 (Week 1) - Before document processing starts

CONTAINERS TO CREATE:
1. integration-documents
   - Purpose: Store documents from Google Drive, SharePoint, etc.
   - Access: Private (SAS tokens for download)
   - Retention: 365 days (configurable)
   - Size: Unlimited (pay per use)
   
2. integration-recordings
   - Purpose: Store meeting recordings from Zoom, Teams, Gong
   - Access: Private (SAS tokens)
   - Retention: 90 days (cost optimization)
   - Size: Unlimited
   
3. integration-attachments
   - Purpose: Store email attachments
   - Access: Private (SAS tokens)
   - Retention: 180 days
   - Size: Unlimited

CONFIGURATION:
- Storage Account: castielintegrations{env} (e.g., castielintegrationsdev)
- Region: eastus (same as other resources)
- Replication: LRS (Locally Redundant Storage) - sufficient for dev/staging
- Replication (Production): GRS (Geo-Redundant Storage) - disaster recovery
- Performance: Standard (not Premium)
- Access Tier: Hot (for documents/recordings, frequently accessed)
- Encryption: Microsoft-managed keys
- Network: Allow all networks initially (can restrict later)

TERRAFORM:
```

```hcl
resource "azurerm_storage_account" "integration_storage" {
  name                     = "castielintegrations${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  
  blob_properties {
    delete_retention_policy {
      days = 30
    }
  }
  
  tags = {
    environment = var.environment
    purpose     = "integration-data-storage"
  }
}

resource "azurerm_storage_container" "integration_documents" {
  name                  = "integration-documents"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "integration_recordings" {
  name                  = "integration-recordings"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "integration_attachments" {
  name                  = "integration-attachments"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
}
```

**Access Pattern:**
```typescript
class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  
  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  
  async uploadDocument(
    blob: Buffer,
    filename: string,
    tenantId: string
  ): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient('integration-documents');
    
    // Use tenant ID in path for isolation
    const blobName = `${tenantId}/${Date.now()}-${filename}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(blob, blob.length);
    
    return blockBlobClient.url;
  }
  
  async generateSasToken(blobUrl: string, expiryMinutes: number = 60): Promise<string> {
    const blobClient = new BlobClient(blobUrl);
    
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: blobClient.containerName,
        blobName: blobClient.name,
        permissions: BlobSASPermissions.parse("r"), // read-only
        expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000)
      },
      this.sharedKeyCredential
    ).toString();
    
    return `${blobUrl}?${sasToken}`;
  }
}
```

**Cost Estimate (Development):**
- Storage: ~$0.02/GB/month
- Expected usage: 10GB = $0.20/month
- Operations: ~$0.10/month
- **Total: ~$0.30/month** (negligible)

**Cost Estimate (Production - 100 tenants):**
- Storage: ~500GB = $10/month
- Operations: ~$5/month
- **Total: ~$15/month**

---

### Question 6.2: Azure Cognitive Services Setup

**ANSWER: Option A - Set Up in Phase 1 (Ready for All Phases)**

**Recommendation:**
```yaml
Azure Cognitive Services Setup:

WHEN: Phase 1 (Week 1) - Before any processing starts

SERVICES NEEDED:

1. Azure Computer Vision (for OCR)
   - Purpose: Extract text from images, scanned PDFs
   - Use Cases: Image OCR in documents, scanned PDFs
   - Pricing: $1.50 per 1,000 transactions
   - Tier: S1 (Standard)
   
2. Azure Speech Services (for transcription)
   - Purpose: Transcribe meeting recordings
   - Use Cases: Zoom recordings, Teams recordings
   - Pricing: $1.00 per audio hour
   - Tier: S0 (Standard)
   - Features: Speaker diarization, real-time transcription
   
3. Azure Text Analytics (optional, for sentiment)
   - Purpose: Sentiment analysis, key phrase extraction
   - Use Cases: Email sentiment, message sentiment
   - Pricing: $2.00 per 1,000 text records
   - Tier: S (Standard)
   - Note: Can use LLM instead for sentiment (already have)

TERRAFORM:
```

```hcl
# Computer Vision for OCR
resource "azurerm_cognitive_account" "computer_vision" {
  name                = "castiel-vision-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "ComputerVision"
  sku_name            = "S1"
  
  tags = {
    environment = var.environment
    purpose     = "document-ocr"
  }
}

# Speech Services for transcription
resource "azurerm_cognitive_account" "speech_services" {
  name                = "castiel-speech-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "SpeechServices"
  sku_name            = "S0"
  
  tags = {
    environment = var.environment
    purpose     = "meeting-transcription"
  }
}

# Store keys in Key Vault
resource "azurerm_key_vault_secret" "computer_vision_key" {
  name         = "computer-vision-api-key"
  value        = azurerm_cognitive_account.computer_vision.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "speech_services_key" {
  name         = "speech-services-api-key"
  value        = azurerm_cognitive_account.speech_services.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}
```

**Usage Patterns:**

**Computer Vision (OCR):**
```typescript
class OCRService {
  private computerVisionClient: ComputerVisionClient;
  
  constructor() {
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY;
    
    this.computerVisionClient = new ComputerVisionClient(
      new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': apiKey } }),
      endpoint
    );
  }
  
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    const result = await this.computerVisionClient.readInStream(imageBuffer);
    
    // Wait for operation to complete
    const operationId = result.operationLocation.split('/').pop();
    let readResult = await this.computerVisionClient.getReadResult(operationId);
    
    while (readResult.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      readResult = await this.computerVisionClient.getReadResult(operationId);
    }
    
    // Extract text
    const text = readResult.analyzeResult.readResults
      .flatMap(page => page.lines)
      .map(line => line.text)
      .join('\n');
    
    return text;
  }
}
```

**Speech Services (Transcription):**
```typescript
class TranscriptionService {
  private speechConfig: SpeechConfig;
  
  constructor() {
    const apiKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    
    this.speechConfig = SpeechConfig.fromSubscription(apiKey, region);
    this.speechConfig.speechRecognitionLanguage = 'en-US';
  }
  
  async transcribeAudio(audioUrl: string): Promise<TranscriptResult> {
    const audioConfig = AudioConfig.fromWavFileInput(audioUrl);
    const recognizer = new SpeechRecognizer(this.speechConfig, audioConfig);
    
    const transcript: string[] = [];
    const segments: TranscriptSegment[] = [];
    
    recognizer.recognized = (s, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        transcript.push(e.result.text);
        
        segments.push({
          speaker: 'Speaker',  // Basic speaker detection
          text: e.result.text,
          startTime: e.result.offset / 10000000, // Convert to seconds
          confidence: 1.0
        });
      }
    };
    
    await recognizer.recognizeOnceAsync();
    
    return {
      fullTranscript: transcript.join(' '),
      segments: segments
    };
  }
  
  // Advanced: Speaker diarization
  async transcribeWithSpeakers(audioUrl: string): Promise<TranscriptResult> {
    // Use batch transcription API for speaker diarization
    const batchClient = new SpeechBatchClient(
      this.speechConfig.subscriptionKey,
      this.speechConfig.region
    );
    
    const transcription = await batchClient.createTranscription({
      recordingsUrl: audioUrl,
      properties: {
        diarizationEnabled: true,
        wordLevelTimestampsEnabled: true
      }
    });
    
    // Wait for completion and get results
    // ...
  }
}
```

**Cost Estimates (Development):**
- Computer Vision: 100 images/month = $0.15/month
- Speech Services: 10 hours audio/month = $10/month
- **Total: ~$10/month**

**Cost Estimates (Production - 100 tenants):**
- Computer Vision: 10,000 images/month = $15/month
- Speech Services: 500 hours audio/month = $500/month
- **Total: ~$515/month**

**Cost Optimization:**
- Cache OCR results (don't re-OCR same image)
- Cache transcriptions (don't re-transcribe same recording)
- Use lower quality for non-critical transcriptions
- Batch processing for cost efficiency

---

### Question 6.3: Processing Capacity

**ANSWER: Option A - Dedicated Consumer Instances for Heavy Processing**

**Recommendation:**
```yaml
Processing Capacity Architecture:

CONSUMER DEPLOYMENT STRATEGY:

Light Consumers (Fast Processing):
- CRMDataMappingConsumer (< 100ms per record)
- EventProcessorConsumer (< 50ms per record)
- EmailProcessorConsumer (< 500ms per record)
- MessageProcessorConsumer (< 200ms per record)

Deployment: Shared pool of container instances
- Container: integration-processors-light
- Replicas: 2-3 instances
- CPU: 0.5 CPU per instance
- Memory: 1GB per instance
- Auto-scaling: Based on queue depth (scale at 1000 messages)

Heavy Consumers (Slow Processing):
- DocumentProcessorConsumer (5-30 seconds per document)
- MeetingProcessorConsumer (30-300 seconds per meeting)

Deployment: Dedicated container instances
- Container: integration-processors-heavy
- Replicas: 2-3 instances
- CPU: 2 CPU per instance (text extraction is CPU-intensive)
- Memory: 4GB per instance (large documents in memory)
- Auto-scaling: Based on queue depth (scale at 100 messages)

Why Dedicated:
✅ Heavy processing doesn't block light processing
✅ Can scale independently
✅ Better resource utilization (right-sizing)
✅ Clear performance isolation
✅ Easier troubleshooting

Container Configuration (Azure Container Apps):
```

```yaml
# Light Processors
name: integration-processors-light
containers:
  - name: light-consumer
    image: castiel/integration-processors:latest
    resources:
      cpu: 0.5
      memory: 1Gi
    env:
      - name: CONSUMER_TYPE
        value: "light"  # Runs CRM, Email, Message, Event processors
    scale:
      minReplicas: 2
      maxReplicas: 10
      rules:
        - name: rabbitmq-queue-depth
          type: rabbitmq
          metadata:
            queueName: integration_data_raw,integration_communications,integration_events
            queueLength: "1000"  # Scale when queue depth > 1000
            
# Heavy Processors
name: integration-processors-heavy
containers:
  - name: heavy-consumer
    image: castiel/integration-processors:latest
    resources:
      cpu: 2
      memory: 4Gi
    env:
      - name: CONSUMER_TYPE
        value: "heavy"  # Runs Document, Meeting processors
    scale:
      minReplicas: 2
      maxReplicas: 5
      rules:
        - name: rabbitmq-queue-depth
          type: rabbitmq
          metadata:
            queueName: integration_documents,integration_meetings
            queueLength: "100"  # Scale when queue depth > 100
```

**Cost Impact (Development):**
- Light processors: 2 instances × $30/month = $60/month
- Heavy processors: 2 instances × $80/month = $160/month
- **Total: $220/month**

**Cost Impact (Production):**
- Light processors: 5 instances × $30/month = $150/month
- Heavy processors: 3 instances × $80/month = $240/month
- **Total: $390/month**

---

## Section 7: Testing & Validation

### Question 7.1: Test Data Strategy

**ANSWER: Option C - Both (Synthetic for Unit, Real for Integration)**

**Recommendation:**
```yaml
Test Data Strategy:

UNIT TESTS (Synthetic Data):
Purpose: Test individual components in isolation
Data: Hand-crafted test fixtures
Location: tests/fixtures/
Examples:
- Mock Salesforce opportunity JSON
- Mock Google Drive document
- Mock Gmail email
- Mock Zoom meeting

Benefits:
✅ Fast (no external dependencies)
✅ Deterministic (same input → same output)
✅ No PII concerns
✅ Easy to create edge cases
✅ Can test error scenarios

INTEGRATION TESTS (Real Data - Sanitized):
Purpose: Test end-to-end data flow
Data: Real integration data with PII removed
Location: tests/integration/data/
Process:
1. Export sample data from real integrations
2. Sanitize (remove/hash PII)
3. Store in test fixtures
4. Use for integration tests

Benefits:
✅ Realistic data structure
✅ Catches edge cases synthetic data misses
✅ Tests real-world scenarios
✅ Validates field mappings with actual data

STAGING TESTS (Real Production Data):
Purpose: Pre-production validation
Data: Actual production data
Environment: Staging environment
Process:
1. Sync from production integrations
2. Run through staging pipeline
3. Validate results
4. Don't commit to production

Benefits:
✅ Highest confidence before production
✅ Catches production-specific issues
✅ Real performance characteristics
```

**Test Data Organization:**
```
tests/
├── fixtures/
│   ├── crm/
│   │   ├── salesforce-opportunity.json
│   │   ├── hubspot-deal.json
│   │   └── dynamics-opportunity.json
│   ├── documents/
│   │   ├── google-drive-pdf.json
│   │   ├── sharepoint-docx.json
│   │   └── dropbox-spreadsheet.json
│   ├── communications/
│   │   ├── gmail-email.json
│   │   ├── outlook-email.json
│   │   ├── slack-message.json
│   │   └── teams-message.json
│   └── meetings/
│       ├── zoom-meeting.json
│       ├── teams-meeting.json
│       └── gong-call.json
└── integration/
    └── data/
        ├── real-salesforce-opportunities.json (sanitized)
        ├── real-google-drive-documents.json (sanitized)
        └── real-zoom-meetings.json (sanitized)
```

**PII Sanitization Script:**
```typescript
class PIISanitizer {
  sanitize(data: any): any {
    // Replace emails
    data = this.replaceEmails(data);
    
    // Replace phone numbers
    data = this.replacePhones(data);
    
    // Replace names
    data = this.replaceNames(data);
    
    // Hash IDs (preserve referential integrity)
    data = this.hashIds(data);
    
    return data;
  }
  
  private replaceEmails(data: any): any {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return JSON.parse(
      JSON.stringify(data).replace(emailRegex, 'test@example.com')
    );
  }
  
  // ... other sanitization methods
}
```

**Unit Test Example:**
```typescript
describe('CRMDataMappingConsumer', () => {
  it('should map Salesforce opportunity to Opportunity shard', async () => {
    // Use synthetic fixture
    const rawOpportunity = require('./fixtures/crm/salesforce-opportunity.json');
    
    const consumer = new CRMDataMappingConsumer();
    const result = await consumer.processRawData({
      integrationId: 'test-integration',
      tenantId: 'test-tenant',
      entityType: 'Opportunity',
      rawData: rawOpportunity
    });
    
    expect(result.structuredData.name).toBe('Test Opportunity');
    expect(result.structuredData.amount).toBe(100000);
    expect(result.structuredData.stage).toBe('Prospecting');
  });
});
```

**Integration Test Example:**
```typescript
describe('Document Processing Integration', () => {
  it('should process Google Drive document end-to-end', async () => {
    // Use real sanitized data
    const realDocument = require('./integration/data/real-google-drive-documents.json')[0];
    
    // Publish event
    await eventPublisher.publish('integration.document.detected', realDocument);
    
    // Wait for processing
    await waitFor(() => shardExists(realDocument.externalId), 30000);
    
    // Verify shard created
    const shard = await shardManager.getShardByExternalId(realDocument.externalId);
    expect(shard).toBeDefined();
    expect(shard.structuredData.extractedText).toBeDefined();
    expect(shard.structuredData.processingStatus).toBe('completed');
  });
});
```

---

### Question 7.2: Shard Validation

**ANSWER: Option C - Validate with Configurable Strictness**

**Recommendation:**
```yaml
Shard Validation Strategy:

ALWAYS VALIDATE:
- Required fields present
- Data types correct
- Field formats valid (email, URL, date)
- Business rules (amount > 0, closeDate in future)

STRICTNESS LEVELS:

1. STRICT (Development/Staging):
   - Reject shard if validation fails
   - Throw error, send to DLQ
   - Force fix before proceeding
   - Use for: Development, staging environments

2. LENIENT (Production):
   - Log validation warnings
   - Create shard with invalid data marked
   - Allow processing to continue
   - Flag for manual review
   - Use for: Production (avoid blocking integrations)

3. AUDIT (Always On):
   - Track validation metrics
   - Alert on high validation failure rates
   - Dashboards for data quality
   - Use for: All environments

Configuration:
```

```typescript
interface ValidationConfig {
  strictness: 'strict' | 'lenient' | 'audit';
  requiredFields: string[];
  optionalFields: string[];
  customValidators?: Record<string, ValidatorFunction>;
}

class ShardValidator {
  constructor(private config: ValidationConfig) {}
  
  validate(structuredData: any, shardType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Required fields check
    for (const field of this.config.requiredFields) {
      if (structuredData[field] == null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'error'
        });
      }
    }
    
    // Data type validation
    for (const [field, value] of Object.entries(structuredData)) {
      const expectedType = this.getExpectedType(field, shardType);
      const actualType = typeof value;
      
      if (expectedType && actualType !== expectedType) {
        warnings.push({
          field,
          message: `Expected type '${expectedType}', got '${actualType}'`,
          severity: 'warning'
        });
      }
    }
    
    // Custom validators
    if (this.config.customValidators) {
      for (const [field, validator] of Object.entries(this.config.customValidators)) {
        const value = structuredData[field];
        const result = validator(value);
        
        if (!result.valid) {
          warnings.push({
            field,
            message: result.message,
            severity: 'warning'
          });
        }
      }
    }
    
    // Determine if valid based on strictness
    const isValid = this.determineValidity(errors, warnings);
    
    return {
      valid: isValid,
      errors,
      warnings
    };
  }
  
  private determineValidity(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): boolean {
    switch (this.config.strictness) {
      case 'strict':
        // Reject if any errors OR warnings
        return errors.length === 0 && warnings.length === 0;
        
      case 'lenient':
        // Reject only if critical errors
        return errors.length === 0;
        
      case 'audit':
        // Never reject, just log
        return true;
    }
  }
}
```

**Usage in Consumers:**
```typescript
class CRMDataMappingConsumer {
  private validator: ShardValidator;
  
  constructor() {
    this.validator = new ShardValidator({
      strictness: process.env.VALIDATION_STRICTNESS || 'lenient',
      requiredFields: ['name', 'amount', 'stage', 'closeDate'],
      customValidators: {
        amount: (value) => ({
          valid: value > 0,
          message: 'Amount must be positive'
        }),
        closeDate: (value) => ({
          valid: new Date(value) > new Date(),
          message: 'Close date must be in the future'
        })
      }
    });
  }
  
  async processRawData(event: IntegrationDataRawEvent) {
    // ... mapping logic ...
    
    // Validate
    const validation = this.validator.validate(structuredData, 'Opportunity');
    
    if (!validation.valid) {
      // Handle based on strictness
      if (this.validator.config.strictness === 'strict') {
        throw new ValidationError('Shard validation failed', validation.errors);
      } else {
        // Log and continue
        this.logger.warn('Shard validation warnings', {
          shardType: 'Opportunity',
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        // Mark shard as having validation issues
        structuredData._validationStatus = 'warnings';
        structuredData._validationErrors = validation.errors;
      }
    }
    
    // Create shard (even if warnings in lenient mode)
    await this.shardManager.createShard({...});
  }
}
```

**Validation Metrics:**
```typescript
// Track validation failures
metrics.increment('shard.validation.failed', {
  shardType: 'Opportunity',
  severity: 'error'
});

// Track validation warnings
metrics.increment('shard.validation.warnings', {
  shardType: 'Opportunity',
  field: 'amount'
});

// Alert if failure rate > 5%
if (failureRate > 0.05) {
  alert('High validation failure rate for Opportunity shards');
}
```

---

## Section 8: Migration & Backward Compatibility

### Question 8.1: Existing Shards Migration

**ANSWER: Option B - Lazy Migration (Update on Next Sync)**

**Recommendation:**
```yaml
Migration Strategy for Existing Shards:

APPROACH: Lazy Migration (No Upfront Backfill)

Why:
✅ No downtime required
✅ No risky mass migration script
✅ Gradual migration over time
✅ Self-healing (syncs fix stale data)
❌ Inconsistent state during transition (acceptable)

Implementation:

Step 1: Add New Fields as Optional
- All new ML fields are optional: documentCount?: number
- Existing shards continue working without changes
- No schema migration needed

Step 2: Update Mapping Consumers
- New shards get new fields populated
- Existing shards: null/undefined for new fields

Step 3: Gradual Update via Sync
- When opportunity syncs again, new fields calculated
- Over days/weeks, all active opportunities updated
- Inactive opportunities: May never get new fields (acceptable)

Step 4: Handle Missing Fields in Risk Scoring
- Risk scoring checks if field exists
- If missing, use default value or skip
- Example: documentCount ?? 0

Optional: One-Time Backfill (If Needed)
- Run once after ML field logic is stable
- Only for active opportunities (closeDate in future)
- Low priority, can skip for most cases
```

**Handling Missing Fields:**
```typescript
class RiskEvaluationService {
  async evaluateOpportunity(opportunityId: string, tenantId: string) {
    const opportunity = await this.shardManager.getShard(opportunityId);
    
    // Extract ML fields, use defaults if missing
    const features = {
      daysInStage: opportunity.structuredData.daysInStage ?? 0,
      documentCount: opportunity.structuredData.documentCount ?? 0,
      emailCount: opportunity.structuredData.emailCount ?? 0,
      meetingCount: opportunity.structuredData.meetingCount ?? 0,
      // ... other features
    };
    
    // Evaluate risk with features (handles missing gracefully)
    const risk = await this.calculateRisk(features);
    
    return risk;
  }
}
```

**Optional Backfill Script (Run Once):**
```typescript
async function backfillMLFields() {
  // Query active opportunities without ML fields
  const opportunities = await shardRepository.query({
    shardType: 'Opportunity',
    'structuredData.closeDate': { $gte: new Date() }, // Active only
    'structuredData.documentCount': { $exists: false } // Missing ML fields
  });
  
  console.log(`Found ${opportunities.length} opportunities to backfill`);
  
  // Process in batches
  for (const batch of chunk(opportunities, 100)) {
    await Promise.all(
      batch.map(async (opp) => {
        try {
          // Calculate ML fields
          const mlFields = await calculateMLFields(opp.id);
          
          // Update shard
          await shardManager.updateShard(opp.id, {
            'structuredData.documentCount': mlFields.documentCount,
            'structuredData.emailCount': mlFields.emailCount,
            'structuredData.meetingCount': mlFields.meetingCount,
            // ... other fields
          });
          
          console.log(`Backfilled opportunity ${opp.id}`);
        } catch (error) {
          console.error(`Failed to backfill ${opp.id}:`, error);
        }
      })
    );
  }
  
  console.log('Backfill complete');
}

// Run once
backfillMLFields();
```

---

### Question 8.2: Current Integration Sync Migration

**ANSWER: Refactor Immediately (You said development only, can break)**

**Recommendation:**
```yaml
Migration Strategy: Direct Refactoring (No Feature Flag)

Given: Development only, can break temporarily

APPROACH: Refactor IntegrationSyncService Immediately

Why:
✅ Clean break, no technical debt
✅ No feature flag complexity
✅ Easier to implement
✅ Faster to complete
✅ No dual code paths to maintain

Implementation Plan:

Phase 1 (Day 1): Refactor IntegrationSyncService
- Remove direct shard creation
- Add event publishing instead
- Keep same API (executeSyncTask)
- Break backward compatibility (acceptable in dev)

Phase 2 (Day 2): Implement Mapping Consumers
- CRMDataMappingConsumer
- Other consumers

Phase 3 (Day 3): Test End-to-End
- Verify sync → event → consumer → shard flow
- Fix any issues

Phase 4 (Day 4): Deploy to Development
- Deploy refactored IntegrationSyncService
- Deploy all consumers
- Verify working

Timeline: 4 days to complete migration
```

**Refactored IntegrationSyncService:**
```typescript
// BEFORE (Old - Direct shard creation)
class IntegrationSyncService {
  async executeSyncTask(syncTask: SyncTask) {
    const rawData = await this.adapter.fetchRecords(syncTask.entityType);
    
    for (const record of rawData) {
      // OLD: Direct transformation and shard creation
      const structuredData = this.transformToShard(record);
      await this.shardManager.createShard({
        structuredData,
        shardType: 'Opportunity'
      });
    }
  }
}

// AFTER (New - Event publishing)
class IntegrationSyncService {
  async executeSyncTask(syncTask: SyncTask) {
    const rawData = await this.adapter.fetchRecords(syncTask.entityType);
    
    // Determine queue and event type
    const { queue, eventType } = this.determineQueueAndEvent(syncTask.entityType);
    
    for (const record of rawData) {
      // NEW: Publish raw event (no transformation)
      await this.eventPublisher.publish(eventType, {
        integrationId: syncTask.integrationId,
        tenantId: syncTask.tenantId,
        entityType: syncTask.entityType,
        rawData: record,  // Raw, untransformed data
        externalId: record.Id || record.id,
        syncTaskId: syncTask.id
      }, { queue });
    }
  }
  
  private determineQueueAndEvent(entityType: string): { queue: string; eventType: string } {
    // CRM entities
    if (['Opportunity', 'Account', 'Contact', 'Lead'].includes(entityType)) {
      return {
        queue: 'integration_data_raw',
        eventType: 'integration.data.raw'
      };
    }
    
    // Documents
    if (entityType === 'Document' || entityType === 'File') {
      return {
        queue: 'integration_documents',
        eventType: 'integration.document.detected'
      };
    }
    
    // Emails
    if (entityType === 'Email') {
      return {
        queue: 'integration_communications',
        eventType: 'integration.email.received'
      };
    }
    
    // ... other types
    
    throw new Error(`Unknown entity type: ${entityType}`);
  }
}
```

**Migration Checklist:**
```yaml
Day 1:
- [ ] Refactor IntegrationSyncService
- [ ] Remove direct shard creation code
- [ ] Add event publishing logic
- [ ] Add queue/event type determination
- [ ] Update unit tests

Day 2:
- [ ] Implement CRMDataMappingConsumer
- [ ] Implement DocumentProcessorConsumer
- [ ] Implement EmailProcessorConsumer
- [ ] Implement other consumers
- [ ] Add consumer unit tests

Day 3:
- [ ] Integration tests (sync → event → consumer → shard)
- [ ] Verify field mappings work
- [ ] Verify ML fields calculated
- [ ] Verify entity linking works
- [ ] Fix any issues

Day 4:
- [ ] Deploy to development environment
- [ ] Run manual tests
- [ ] Verify data flow end-to-end
- [ ] Document changes
- [ ] Ready for use
```

---

## Summary

All questions answered based on your inputs:
- ✅ ML fields calculated immediately (hybrid approach)
- ✅ Complete multi-modal foundation from day 1
- ✅ All shard types created upfront
- ✅ Specialized processors per data type
- ✅ Separate queues per data type
- ✅ Dedicated instances for heavy processing
- ✅ Azure Blob Storage + Cognitive Services in Phase 1
- ✅ Conservative entity linking (80% auto, 60% suggest)
- ✅ Lazy migration for existing shards
- ✅ Direct refactoring (no feature flag needed)

**Ready to proceed with implementation!**

See Part 1 for detailed answers to Questions 1-4.

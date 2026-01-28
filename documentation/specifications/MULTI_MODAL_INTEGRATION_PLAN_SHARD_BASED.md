# Multi-Modal Integration Implementation Plan (Shard-Based Architecture)

**Date:** January 28, 2025  
**Status:** 📋 Implementation Plan  
**Purpose:** Complete implementation plan for multi-modal integrations with shard-based data storage

---

## Critical Change: All Data Stored as Shards

**IMPORTANT:** All integration data MUST be stored as shards with appropriate shard types. The `structuredData` field contains the transformed integration data. See `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` for complete shard type definitions.

---

## Updated Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Integration Sync Service                        │
│  (Publishes category-specific raw events)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─→ integration.data.raw (CRM)
                   ├─→ integration.document.detected (Files)
                   ├─→ integration.email.received (Emails)
                   ├─→ integration.message.received (Messages)
                   ├─→ integration.meeting.completed (Meetings)
                   └─→ integration.event.created (Calendar)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                  RabbitMQ Queues                             │
│  - integration_data_raw (CRM)                               │
│  - integration_documents (Documents)                         │
│  - integration_communications (Emails + Messages)            │
│  - integration_meetings (Meetings)                           │
│  - integration_events (Calendar Events)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─→ CRM Mapping Consumer → Opportunity/Account/Contact Shards
                   ├─→ Document Processor → Document Shards
                   ├─→ Email Processor → Email Shards
                   ├─→ Message Processor → Message Shards
                   ├─→ Meeting Processor → Meeting Shards
                   └─→ Event Processor → CalendarEvent Shards
                   │
┌──────────────────┴──────────────────────────────────────────┐
│              Shard Manager Service                           │
│  (Stores all shards, publishes shard.created/updated)       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─→ shard.created / shard.updated events
                   │
┌──────────────────┴──────────────────────────────────────────┐
│         Downstream Consumers                                 │
│  - Vectorization (all shard types)                          │
│  - Entity Linking (documents, emails, meetings)             │
│  - Activity Aggregation (emails, meetings, messages)        │
│  - Risk Analytics (opportunity shards)                       │
│  - Forecasting (opportunity shards)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core CRM Shards & Infrastructure (Week 1-2)

#### 1.1 Update Existing CRM Shard Types

```yaml
- id: update-opportunity-shard-type
  content: |
    Update Opportunity shard type structuredData schema:
    
    ADD FIELDS:
    - daysInStage: number (ML feature)
    - daysSinceLastActivity: number (ML feature)
    - dealVelocity: number (ML feature)
    - competitorCount: number (ML feature)
    - stakeholderCount: number (ML feature)
    - documentCount: number (ML feature)
    - emailCount: number (ML feature)
    - meetingCount: number (ML feature)
    - callCount: number (ML feature)
    - integrationSource: string (tracking)
    - externalId: string (tracking)
    - lastSyncedAt: Date (tracking)
    - syncStatus: "synced" | "pending" | "error"
    
    TASKS:
    - Update TypeScript interface in packages/shared
    - Update shard type definition in Cosmos DB
    - Update CRM mapping consumer to populate new fields
    - Calculate derived fields (counts from relationships)
    - Add validation for new fields
  status: pending
  phase: 1
  priority: critical
```

```yaml
- id: verify-account-contact-shard-types
  content: |
    Verify Account and Contact shard types have integration tracking:
    
    VERIFY FIELDS:
    - integrationSource: string
    - externalId: string
    - lastSyncedAt: Date
    - syncStatus: string
    
    ADD IF MISSING:
    - Integration tracking fields
    - Historical performance fields (for ML)
    
    TASKS:
    - Review existing shard type definitions
    - Add missing fields if needed
    - Update TypeScript interfaces
    - Update mapping consumers
  status: pending
  phase: 1
  priority: high
```

#### 1.2 Implement Multi-Queue Architecture

```yaml
- id: create-specialized-rabbitmq-queues
  content: |
    Create specialized RabbitMQ queues for each data type:
    
    QUEUES TO CREATE:
    1. integration_data_raw (CRM entities)
       - Existing queue, keep as-is
       - DLQ: integration_data_raw.dlq
    
    2. integration_documents (Documents)
       - NEW queue for document processing
       - DLQ: integration_documents.dlq
       - TTL: 24 hours
       - Prefetch: 5 (slow processing)
    
    3. integration_communications (Emails + Messages)
       - NEW queue for emails and messages
       - DLQ: integration_communications.dlq
       - TTL: 24 hours
       - Prefetch: 10 (medium processing)
    
    4. integration_meetings (Meetings)
       - NEW queue for meeting/call processing
       - DLQ: integration_meetings.dlq
       - TTL: 48 hours (large files)
       - Prefetch: 3 (very slow processing)
    
    5. integration_events (Calendar Events)
       - NEW queue for calendar events
       - DLQ: integration_events.dlq
       - TTL: 24 hours
       - Prefetch: 15 (fast processing)
    
    CONFIGURATION:
    - All queues: Durable, persistent messages
    - All queues: DLQ configured
    - All queues: Circuit breaker protection
    - All queues: Retry policies
  status: pending
  phase: 1
  priority: critical
```

#### 1.3 Refactor Integration Sync Service

```yaml
- id: refactor-integration-sync-for-multi-modal
  content: |
    Update IntegrationSyncService to route events by data type:
    
    ROUTING LOGIC:
    
    IF entityType = "Opportunity" | "Account" | "Contact" | "Lead":
      → Publish to integration_data_raw
      → Event: integration.data.raw
    
    IF entityType = "Document":
      → Publish to integration_documents
      → Event: integration.document.detected
    
    IF entityType = "Email":
      → Publish to integration_communications
      → Event: integration.email.received
    
    IF entityType = "Message" | "SlackMessage" | "TeamsMessage":
      → Publish to integration_communications
      → Event: integration.message.received
    
    IF entityType = "Meeting" | "Call":
      → Publish to integration_meetings
      → Event: integration.meeting.completed
    
    IF entityType = "CalendarEvent":
      → Publish to integration_events
      → Event: integration.event.created
    
    IMPLEMENTATION:
    - Add data type detection logic
    - Add queue routing logic
    - Update event publishers
    - Add metrics per data type
    - Add error handling per type
  status: pending
  phase: 1
  priority: critical
```

---

### Phase 2: Document Shards & Processing (Week 2-3)

#### 2.1 Create Document Shard Type

```yaml
- id: create-document-shard-type
  content: |
    Create Document shard type in Cosmos DB:
    
    SHARD TYPE: Document
    SCHEMA: See INTEGRATION_SHARD_TYPES_ARCHITECTURE.md
    
    KEY FIELDS:
    - title, documentType, mimeType, size
    - integrationSource, externalId, externalUrl
    - blobStorageUrl (Azure Blob Storage)
    - extractedText, extractedTextLength
    - summary, keyTopics, keyPhrases, entities
    - linkedOpportunityIds, linkedAccountIds, linkedContactIds
    - processingStatus, syncStatus
    
    TASKS:
    - Define TypeScript interface (DocumentStructuredData)
    - Create shard type via shard-manager API
    - Add shard type to TypeScript types
    - Create DocumentShard interface
    - Add validation schema
  status: pending
  phase: 2
  priority: critical
```

#### 2.2 Implement Document Processing Pipeline

```yaml
- id: implement-document-processor-consumer
  content: |
    Create DocumentProcessorConsumer for document processing:
    
    PROCESSING FLOW:
    1. Consume integration.document.detected event
    2. Download document from integration
    3. Upload to Azure Blob Storage
    4. Extract text (PDF, DOCX, XLSX, etc.)
    5. Analyze content (LLM-based):
       - Generate summary
       - Extract topics and key phrases
       - Extract named entities
       - Detect sentiment
       - Detect PII
    6. Entity linking:
       - Auto-link to opportunities
       - Auto-link to accounts/contacts
       - Calculate confidence scores
    7. Create Document shard via shard-manager
    8. Publish shard.created event
    9. Publish document.processed event
    
    DEPENDENCIES:
    - Azure Blob Storage client
    - Text extraction libraries:
      - pdf-parse (PDF)
      - mammoth (DOCX)
      - xlsx (Excel)
      - cheerio (HTML)
    - Azure Computer Vision (for OCR if needed)
    - LLM client for content analysis
    - Entity linking service
    
    ERROR HANDLING:
    - Virus scan failures → DLQ
    - Text extraction failures → Store with error status
    - Analysis failures → Store with partial data
    - Entity linking failures → Store without links
    
    CONFIGURATION:
    - Max document size: 50MB
    - Max processing time: 5 minutes per document
    - Blob storage container: integration-documents
    - Retry attempts: 3
  status: pending
  phase: 2
  priority: critical
```

```yaml
- id: implement-document-text-extraction
  content: |
    Implement text extraction for various document types:
    
    SUPPORTED FORMATS:
    - PDF: Use pdf-parse or Azure Form Recognizer
    - DOCX: Use mammoth.js
    - XLSX: Use xlsx library
    - PPTX: Use officegen or similar
    - Images: Use Azure Computer Vision OCR
    - HTML: Use cheerio
    - TXT: Direct read
    
    TEXT EXTRACTION STRATEGY:
    - Preserve structure where possible
    - Extract tables separately
    - Extract images and run OCR
    - Preserve metadata (author, dates, etc.)
    - Handle multi-language documents
    
    LARGE DOCUMENT HANDLING:
    - Chunk documents > 100 pages
    - Process chunks in parallel
    - Create DocumentChunk shards (optional)
    - Combine results
  status: pending
  phase: 2
  priority: high
```

---

### Phase 3: Communication Shards (Email & Messages) (Week 3-4)

#### 3.1 Create Email Shard Type

```yaml
- id: create-email-shard-type
  content: |
    Create Email shard type in Cosmos DB:
    
    SHARD TYPE: Email
    SCHEMA: See INTEGRATION_SHARD_TYPES_ARCHITECTURE.md
    
    KEY FIELDS:
    - subject, threadId, messageId
    - from, to, cc, bcc (with contact linking)
    - bodyHtml, bodyPlainText, snippet
    - attachments (link to Document shards)
    - sentiment, topics, actionItems
    - linkedOpportunityIds, linkedAccountIds, linkedContactIds
    - sentAt, receivedAt, lastSyncedAt
    
    TASKS:
    - Define TypeScript interface (EmailStructuredData)
    - Create shard type via shard-manager API
    - Create EmailShard interface
    - Add validation schema
  status: pending
  phase: 3
  priority: critical
```

#### 3.2 Implement Email Processing Pipeline

```yaml
- id: implement-email-processor-consumer
  content: |
    Create EmailProcessorConsumer for email processing:
    
    PROCESSING FLOW:
    1. Consume integration.email.received event
    2. Parse email metadata (from, to, cc, subject, body)
    3. Process attachments:
       - Download attachments
       - Create Document shards for each
       - Link attachments to email
    4. Content analysis:
       - Detect sentiment
       - Extract topics
       - Extract action items
       - Classify email type
    5. Participant matching:
       - Match email addresses to contacts
       - Link contacts to email
    6. Entity linking:
       - Auto-link to opportunities (by thread, participants, content)
       - Auto-link to accounts
       - Calculate confidence scores
    7. Create Email shard via shard-manager
    8. Publish shard.created event
    9. Publish email.processed event
    
    SPECIAL HANDLING:
    - Email threading: Track threads, link replies
    - HTML parsing: Extract plain text, preserve formatting
    - Spam filtering: Filter marketing emails
    - Privacy: Redact PII in structuredData
    
    ERROR HANDLING:
    - Attachment download failures → Store email without attachments
    - Analysis failures → Store with basic metadata
    - Entity linking failures → Store without links
  status: pending
  phase: 3
  priority: critical
```

#### 3.3 Create Message Shard Type

```yaml
- id: create-message-shard-type
  content: |
    Create Message shard type in Cosmos DB:
    
    SHARD TYPE: Message
    SCHEMA: See INTEGRATION_SHARD_TYPES_ARCHITECTURE.md
    
    KEY FIELDS:
    - messageId, threadId, parentMessageId
    - integrationSource (slack | teams)
    - channelId, channelName, channelType
    - from, text, formattedText
    - mentions, reactions
    - attachments (link to Document shards)
    - sentiment, topics
    - linkedOpportunityIds, linkedAccountIds
    
    TASKS:
    - Define TypeScript interface (MessageStructuredData)
    - Create shard type via shard-manager API
    - Create MessageShard interface
    - Add validation schema
  status: pending
  phase: 3
  priority: high
```

#### 3.4 Implement Message Processing Pipeline

```yaml
- id: implement-message-processor-consumer
  content: |
    Create MessageProcessorConsumer for Slack/Teams messages:
    
    PROCESSING FLOW:
    1. Consume integration.message.received event
    2. Parse message metadata (sender, channel, text, thread)
    3. Process attachments and links
    4. Content analysis:
       - Detect sentiment
       - Extract topics
       - Classify message type
    5. Channel classification:
       - Is it a deal-specific channel?
       - Is it a team channel?
       - Is it a DM?
    6. Entity extraction:
       - Extract company names
       - Extract deal amounts
       - Extract dates
    7. Entity linking:
       - Auto-link to opportunities (by channel, mentions, content)
       - Auto-link to accounts/contacts
    8. Create Message shard via shard-manager
    9. Publish shard.created event
    
    SPECIAL HANDLING:
    - Thread tracking: Link replies to parent
    - Reactions: Track engagement
    - Mentions: Link mentioned users
    - Formatting: Preserve markdown/rich text
  status: pending
  phase: 3
  priority: high
```

---

### Phase 4: Meeting & Calendar Shards (Week 4-5)

#### 4.1 Create Meeting Shard Type

```yaml
- id: create-meeting-shard-type
  content: |
    Create Meeting shard type in Cosmos DB:
    
    SHARD TYPE: Meeting
    SCHEMA: See INTEGRATION_SHARD_TYPES_ARCHITECTURE.md
    
    KEY FIELDS:
    - meetingId, title, description
    - integrationSource (zoom | teams | gong)
    - startTime, endTime, duration, participants
    - hasRecording, recordingUrl, recordingBlobUrl
    - hasTranscript, transcriptUrl, fullTranscript, transcriptSegments
    - meetingType, topics, keyMoments
    - actionItems, commitments, objections, nextSteps
    - engagement (score, talkTimeRatio, questionCount)
    - overallSentiment, dealSignals
    - linkedOpportunityIds, linkedAccountIds
    
    TASKS:
    - Define TypeScript interface (MeetingStructuredData)
    - Create shard type via shard-manager API
    - Create MeetingShard interface
    - Add validation schema (extensive)
  status: pending
  phase: 4
  priority: high
```

#### 4.2 Implement Meeting Processing Pipeline

```yaml
- id: implement-meeting-processor-consumer
  content: |
    Create MeetingProcessorConsumer for meeting intelligence:
    
    PROCESSING FLOW:
    1. Consume integration.meeting.completed event
    2. Download recording (if available):
       - Store in Azure Blob Storage
       - Generate SAS token
    3. Process transcript:
       - Download existing transcript OR
       - Transcribe recording (Azure Speech)
       - Speaker diarization
       - Timestamp alignment
    4. Content analysis (LLM-based):
       - Classify meeting type
       - Extract key topics
       - Identify key moments (action items, objections, commitments)
       - Extract action items
       - Detect objections and commitments
       - Calculate engagement metrics
       - Sentiment analysis (overall + per speaker)
       - Detect deal signals (positive/negative/neutral)
    5. Participant mapping:
       - Match participants to contacts
       - Identify new stakeholders
       - Track attendance and duration
    6. Entity linking:
       - Auto-link to opportunities (by participants, topics, timing)
       - Auto-link to accounts/contacts
    7. Recommendation generation:
       - Suggest follow-up actions
       - Identify coaching opportunities
       - Flag risks
    8. Create Meeting shard via shard-manager
    9. Publish shard.created event
    10. Publish meeting.processed event
    
    SPECIAL FEATURES:
    - Gong integration: Import Gong's native analytics
    - Talk time ratio: Calculate customer vs sales ratio
    - Question detection: Track engagement
    - Competitor mentions: Flag competitors
    - Pricing discussions: Track pricing talk
    
    ERROR HANDLING:
    - Recording download failures → Store meeting without recording
    - Transcription failures → Store with basic metadata
    - Analysis failures → Store with partial analysis
    
    PERFORMANCE:
    - Large recordings: Process in chunks
    - Parallel transcription: Use concurrent processing
    - Caching: Cache transcripts and analysis
  status: pending
  phase: 4
  priority: high
```

```yaml
- id: implement-meeting-transcription-service
  content: |
    Implement meeting transcription using Azure Speech Services:
    
    FEATURES:
    - Speech-to-text transcription
    - Speaker diarization (identify speakers)
    - Timestamp alignment
    - Multi-language support
    - Confidence scores
    
    IMPLEMENTATION:
    - Use Azure Speech Services API
    - Batch transcription for long recordings
    - Real-time transcription for live meetings (future)
    - Handle audio quality issues
    
    OPTIMIZATION:
    - Cache transcripts
    - Incremental transcription for long meetings
    - Parallel processing for multiple speakers
  status: pending
  phase: 4
  priority: high
```

#### 4.3 Create Calendar Event Shard Type

```yaml
- id: create-calendar-event-shard-type
  content: |
    Create CalendarEvent shard type in Cosmos DB:
    
    SHARD TYPE: CalendarEvent
    SCHEMA: See INTEGRATION_SHARD_TYPES_ARCHITECTURE.md
    
    KEY FIELDS:
    - eventId, title, description, location
    - integrationSource (google_calendar | outlook)
    - startTime, endTime, timezone, isAllDay
    - isRecurring, recurrenceRule
    - organizer, attendees (with contact linking)
    - status, visibility, transparency
    - meetingShardId (link to Meeting shard if occurred)
    - eventType, isProspectMeeting, isDealRelated
    - linkedOpportunityIds, linkedAccountIds
    
    TASKS:
    - Define TypeScript interface (CalendarEventStructuredData)
    - Create shard type via shard-manager API
    - Create CalendarEventShard interface
    - Add validation schema
  status: pending
  phase: 4
  priority: medium
```

#### 4.4 Implement Event Processing Pipeline

```yaml
- id: implement-event-processor-consumer
  content: |
    Create EventProcessorConsumer for calendar events:
    
    PROCESSING FLOW:
    1. Consume integration.event.created event
    2. Parse event metadata (title, time, location, attendees)
    3. Attendee matching:
       - Match email addresses to contacts
       - Link contacts to event
    4. Event classification:
       - Is it a prospect meeting?
       - Is it deal-related?
       - What type of event?
    5. Entity linking:
       - Auto-link to opportunities (by title, attendees, timing)
       - Auto-link to accounts/contacts
    6. Meeting linkage:
       - If meeting occurred, link to Meeting shard
       - Store conference URL for future reference
    7. Create CalendarEvent shard via shard-manager
    8. Publish shard.created event
    
    SPECIAL HANDLING:
    - Recurring events: Track series vs instances
    - Conference links: Detect Zoom/Teams URLs
    - Cancelled events: Mark status
    - Time zone handling: Normalize to UTC
  status: pending
  phase: 4
  priority: medium
```

---

### Phase 5: Entity Linking Service (Week 5-6)

```yaml
- id: implement-unified-entity-linking-service
  content: |
    Create centralized entity linking service for all data types:
    
    PURPOSE:
    Automatically link documents, emails, messages, meetings to CRM entities
    
    LINKING STRATEGIES:
    
    1. Explicit Reference (Confidence: 100%)
       - Document/email contains opportunity ID
       - Message @mentions deal name
       - Calendar event has deal in title
    
    2. Participant Matching (Confidence: 80-90%)
       - Email to/from contact in opportunity
       - Meeting participants match stakeholders
       - Message in channel with stakeholder
    
    3. Content Analysis (Confidence: 60-80%)
       - LLM extracts company names → match to accounts
       - Extract deal amounts → match to opportunity value
       - Topic similarity
    
    4. Temporal Correlation (Confidence: 40-60%)
       - Activity near opportunity close date
       - Activity during active stage
       - Activity with same participants
    
    5. Vector Similarity (Confidence: 30-50%)
       - Semantic similarity to opportunity description
       - Similar topics/keywords
       - Similar context
    
    SERVICE INTERFACE:
    ```typescript
    interface EntityLinkingService {
      linkDocument(document: DocumentShard): Promise<EntityLinks>;
      linkEmail(email: EmailShard): Promise<EntityLinks>;
      linkMessage(message: MessageShard): Promise<EntityLinks>;
      linkMeeting(meeting: MeetingShard): Promise<EntityLinks>;
      linkCalendarEvent(event: CalendarEventShard): Promise<EntityLinks>;
    }
    ```
    
    IMPLEMENTATION:
    - Apply all strategies in parallel
    - Collect candidate links
    - Deduplicate and merge
    - Sort by confidence
    - Apply confidence threshold (> 60%)
    - Create shard relationships
    - Update entity context
    
    AUTO-ATTACHMENT RULES:
    - Auto-attach if confidence > 80%
    - Suggest if confidence 60-80% (user review)
    - Ignore if confidence < 60%
    
    RELATIONSHIP CREATION:
    - Create shard relationships via shard-manager
    - Track linking strategy and confidence
    - Allow manual override
    - Learn from user feedback
  status: pending
  phase: 5
  priority: critical
```

---

### Phase 6: Activity Aggregation (Week 6)

```yaml
- id: implement-activity-aggregation-service
  content: |
    Create Activity and Interaction shards for unified tracking:
    
    ACTIVITY SHARD:
    - Aggregate all interactions into unified Activity shards
    - Source from: Email, Meeting, Message shards
    - Provide unified activity timeline
    - Enable activity-based analytics
    
    INTERACTION SHARD:
    - Track person-to-person interactions
    - Build relationship graph
    - Calculate relationship strength
    - Track interaction frequency and recency
    
    IMPLEMENTATION:
    - Listen for shard.created events (Email, Meeting, Message)
    - Create corresponding Activity shards
    - Create Interaction shards for relationships
    - Update aggregate statistics
    - Enable timeline queries
    
    BENEFITS:
    - Unified activity view across all channels
    - Relationship strength tracking
    - Engagement analytics
    - Activity-based reporting
  status: pending
  phase: 6
  priority: medium
```

---

### Phase 7: Shard Relationships & Queries (Week 6-7)

```yaml
- id: implement-shard-relationship-patterns
  content: |
    Establish standard shard relationship patterns:
    
    RELATIONSHIP TYPES:
    
    1. Document → Opportunity
       - Type: "document_for_opportunity"
       - Metadata: { autoLinked: boolean, confidence: number }
    
    2. Email → Opportunity
       - Type: "email_about_opportunity"
       - Metadata: { direction: "inbound" | "outbound" }
    
    3. Meeting → Opportunity
       - Type: "meeting_for_opportunity"
       - Metadata: { meetingType: string }
    
    4. Message → Opportunity
       - Type: "message_about_opportunity"
       - Metadata: { channel: string }
    
    5. Email → Contact
       - Type: "email_from_contact" | "email_to_contact"
    
    6. Meeting → Contact
       - Type: "meeting_with_contact"
       - Metadata: { role: "organizer" | "participant" }
    
    7. Document → Email
       - Type: "document_attached_to_email"
    
    8. Meeting → CalendarEvent
       - Type: "meeting_from_event"
    
    IMPLEMENTATION:
    - Create relationships during processing
    - Use ShardRelationshipService
    - Track relationship metadata
    - Enable bidirectional queries
    
    QUERY PATTERNS:
    - Get all documents for opportunity
    - Get all emails for contact
    - Get all meetings with stakeholder
    - Get activity timeline for opportunity
  status: pending
  phase: 7
  priority: high
```

---

### Phase 8: Testing & Validation (Week 7-8)

```yaml
- id: implement-integration-shard-tests
  content: |
    Comprehensive testing for shard-based integration system:
    
    UNIT TESTS:
    - Shard type validation
    - Field mapping logic
    - Transformation logic
    - Entity linking algorithms
    - Confidence score calculation
    
    INTEGRATION TESTS:
    - End-to-end data flow per type
    - Document: Fetch → Process → Store → Vectorize
    - Email: Receive → Process → Store → Link
    - Meeting: Complete → Transcribe → Analyze → Store
    
    SHARD VALIDATION TESTS:
    - Verify all required fields present
    - Verify data types correct
    - Verify relationships created
    - Verify indexes work
    
    PERFORMANCE TESTS:
    - Large document processing (50MB)
    - High-volume email processing (1000/hour)
    - Long meeting transcription (2 hours)
    - Concurrent processing (multiple consumers)
    
    QUERY TESTS:
    - Query shards by type
    - Query shards by relationships
    - Query shards by date range
    - Query shards with filters
  status: pending
  phase: 8
  priority: critical
```

---

## Success Criteria

### Shard-Specific Criteria

1. ✅ All shard types created in Cosmos DB
2. ✅ All TypeScript interfaces defined
3. ✅ All processor consumers implemented
4. ✅ All shards stored with correct structuredData
5. ✅ All field mappings working correctly
6. ✅ All validations passing
7. ✅ All shard relationships created
8. ✅ All queries working as expected

### Integration Flow Criteria

9. ✅ All integration data flows through RabbitMQ
10. ✅ All data types processed correctly
11. ✅ All shards created successfully
12. ✅ All entity linking working
13. ✅ All shard.created events published
14. ✅ All vectorization triggered
15. ✅ All activity aggregation working

### Quality Criteria

16. ✅ No data loss during processing
17. ✅ No duplicate shards created (idempotency)
18. ✅ All PII properly redacted
19. ✅ All errors handled gracefully
20. ✅ All DLQs monitored and alerted

---

## Timeline Summary

**Total Duration: 7-8 weeks**

- **Week 1-2:** Core CRM shards + Infrastructure
- **Week 2-3:** Document shards + Processing
- **Week 3-4:** Communication shards (Email + Messages)
- **Week 4-5:** Meeting & Calendar shards
- **Week 5-6:** Entity linking service
- **Week 6:** Activity aggregation
- **Week 6-7:** Shard relationships & Queries
- **Week 7-8:** Testing & Validation

---

## Key Architectural Decisions

1. ✅ **All data stored as shards** - No raw data storage outside shards
2. ✅ **structuredData contains transformed data** - Field mapping is critical
3. ✅ **Specialized processors per data type** - Better than generic processor
4. ✅ **Entity linking is automatic** - Manual review for low confidence
5. ✅ **Shard relationships for linking** - Not embedded references
6. ✅ **Multi-queue architecture** - Independent scaling per type
7. ✅ **Azure Blob Storage for large files** - Not in shards
8. ✅ **Activity aggregation for unified view** - Separate Activity shards

---

## Notes

- See `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` for complete shard type definitions
- All processors must validate shard data before storing
- All processors must handle failures gracefully (partial data OK)
- All processors must publish appropriate events
- Entity linking confidence thresholds are configurable
- Shard relationships are bidirectional by default
- All timestamps should be in UTC

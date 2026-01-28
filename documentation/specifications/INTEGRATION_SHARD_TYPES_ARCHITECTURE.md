# Integration Shard Types Architecture

**Date:** January 28, 2025  
**Status:** 📋 Architecture Definition  
**Purpose:** Define all shard types needed for multi-modal integration data storage

---

## Overview

All data collected from integrations MUST be stored as shards in Cosmos DB. Each integration data type requires a specific shard type with a well-defined `structuredData` schema. This document defines all required shard types for the multi-modal integration system.

---

## Shard Type Hierarchy

```
Integration Data Shard Types
│
├── CRM Data Shards (Existing - May Need Updates)
│   ├── Opportunity Shard (UPDATE REQUIRED)
│   ├── Account Shard (VERIFY)
│   ├── Contact Shard (VERIFY)
│   └── Lead Shard (VERIFY)
│
├── Document Shards (NEW)
│   ├── Document Shard
│   └── Document Chunk Shard (for large documents)
│
├── Communication Shards (NEW)
│   ├── Email Shard
│   ├── Email Thread Shard
│   ├── Message Shard (Slack/Teams)
│   └── Message Thread Shard
│
├── Meeting & Call Shards (NEW)
│   ├── Meeting Shard
│   ├── Call Recording Shard
│   └── Transcript Segment Shard
│
├── Calendar Shards (NEW)
│   └── Calendar Event Shard
│
└── Activity Shards (NEW - Aggregated)
    ├── Activity Shard (unified activity tracking)
    └── Interaction Shard (relationship tracking)
```

---

## Part 1: CRM Data Shard Types (Updates Required)

### 1.1 Opportunity Shard (UPDATE REQUIRED)

**Shard Type Name:** `Opportunity`  
**Status:** Exists - Needs ML Field Additions

**Required Updates to structuredData:**

```typescript
interface OpportunityStructuredData {
  // Existing fields (keep all)
  id: string;
  name: string;
  amount: number;
  currency: string;
  stage: string;
  probability: number;
  expectedRevenue: number;
  closeDate: Date;
  createdDate: Date;
  ownerId: string;
  accountId: string;
  
  // NEW FIELDS FOR ML (as per ML_IMPLEMENTATION_DECISIONS)
  daysInStage?: number;              // Days in current stage
  daysSinceLastActivity?: number;    // Days since last activity
  dealVelocity?: number;             // Stage progression rate
  competitorCount?: number;          // Number of competitors
  stakeholderCount?: number;         // Number of stakeholders
  documentCount?: number;            // Number of linked documents
  emailCount?: number;               // Number of linked emails
  meetingCount?: number;             // Number of linked meetings
  callCount?: number;                // Number of linked calls
  
  // NEW FIELDS FOR INTEGRATION TRACKING
  integrationSource?: string;        // "salesforce" | "hubspot" | "dynamics"
  externalId?: string;               // External CRM ID
  lastSyncedAt?: Date;              // Last sync timestamp
  syncStatus?: "synced" | "pending" | "error";
  
  // Existing fields continue...
}
```

**Update Task:**
```yaml
- id: update-opportunity-shard-type
  content: |
    Update Opportunity shard type structuredData schema:
    - Add ML fields (daysInStage, daysSinceLastActivity, etc.)
    - Add integration tracking fields
    - Update shard type definition in Cosmos DB
    - Update TypeScript interfaces
    - Update field mapper to populate new fields
  priority: critical
  phase: 1
```

### 1.2 Account Shard (VERIFY)

**Shard Type Name:** `Account`  
**Status:** Exists - Verify Fields

**Required structuredData (Verify These Exist):**

```typescript
interface AccountStructuredData {
  id: string;
  name: string;
  industry?: string;
  industryId?: string;              // For ML encoding
  revenue?: number;
  employeeCount?: number;
  website?: string;
  type?: string;
  ownerId?: string;
  
  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: Date;
  
  // Historical performance (for ML)
  historicalWinRate?: number;
  historicalDealCount?: number;
  historicalRevenue?: number;
}
```

### 1.3 Contact Shard (VERIFY)

**Shard Type Name:** `Contact`  
**Status:** Exists - Verify Fields

**Required structuredData:**

```typescript
interface ContactStructuredData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  accountId?: string;
  
  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: Date;
  
  // Engagement tracking (for ML)
  emailInteractionCount?: number;
  meetingAttendanceCount?: number;
  lastInteractionDate?: Date;
  isKeySt akeholder?: boolean;
}
```

---

## Part 2: Document Shards (NEW)

### 2.1 Document Shard (NEW - CRITICAL)

**Shard Type Name:** `Document`  
**Purpose:** Store documents from Google Drive, SharePoint, Dropbox, OneDrive

**structuredData Schema:**

```typescript
interface DocumentStructuredData {
  // Core document metadata
  id: string;
  title: string;
  description?: string;
  documentType: "pdf" | "docx" | "xlsx" | "pptx" | "txt" | "html" | "image" | "other";
  mimeType: string;
  size: number;                      // bytes
  
  // Source information
  integrationSource: "google_drive" | "sharepoint" | "dropbox" | "onedrive" | "box";
  externalId: string;                // External document ID
  externalUrl: string;               // URL in source system
  sourcePath?: string;               // Path in source system
  parentFolderId?: string;           // Parent folder ID
  parentFolderName?: string;         // Parent folder name
  
  // Storage
  blobStorageUrl: string;           // Azure Blob Storage URL
  blobStorageContainer: string;     // Container name
  blobStoragePath: string;          // Path in blob storage
  
  // Content extraction
  extractedText?: string;           // Full extracted text (for search)
  extractedTextLength?: number;     // Text length in characters
  pageCount?: number;               // Number of pages (PDF/DOCX)
  wordCount?: number;               // Word count
  language?: string;                // Detected language (ISO 639-1)
  
  // Content analysis (LLM-powered)
  summary?: string;                 // AI-generated summary
  keyTopics?: string[];             // Extracted topics
  keyPhrases?: string[];            // Important phrases
  entities?: Array<{                // Named entities
    type: "person" | "organization" | "location" | "date" | "money";
    text: string;
    confidence: number;
  }>;
  sentiment?: {                     // Sentiment analysis
    score: number;                  // -1 to 1
    label: "positive" | "neutral" | "negative";
  };
  
  // Document classification
  category?: "proposal" | "contract" | "presentation" | "report" | "email_attachment" | "other";
  confidenceLevel?: "public" | "internal" | "confidential" | "restricted";
  containsPII?: boolean;            // PII detection
  
  // Entity linking
  linkedOpportunityIds?: string[];  // Linked opportunities
  linkedAccountIds?: string[];      // Linked accounts
  linkedContactIds?: string[];      // Linked contacts
  autoLinkingConfidence?: Record<string, number>; // Confidence per link
  
  // Timestamps and ownership
  createdAt: Date;
  modifiedAt: Date;
  lastAccessedAt?: Date;
  createdBy?: string;               // Creator email/ID
  modifiedBy?: string;              // Last modifier email/ID
  ownerId?: string;                 // Document owner (Castiel user)
  
  // Sync tracking
  lastSyncedAt: Date;
  syncStatus: "synced" | "pending" | "error";
  syncError?: string;
  
  // Sharing and permissions
  isShared?: boolean;
  sharedWith?: string[];            // Email addresses
  permissionLevel?: "view" | "edit" | "owner";
  
  // Processing status
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError?: string;
  textExtractionCompleted?: boolean;
  analysisCompleted?: boolean;
  vectorizationCompleted?: boolean;
  
  // Versioning
  version?: string;                 // Document version
  isLatestVersion?: boolean;
  previousVersionId?: string;
}
```

**Creation Task:**
```yaml
- id: create-document-shard-type
  content: |
    Create Document shard type:
    - Define structuredData schema in TypeScript
    - Create shard type in Cosmos DB via shard-manager
    - Create DocumentShard interface
    - Create document processor consumer
    - Implement document-to-shard transformation
    - Add document shard validation
  priority: critical
  phase: 2
```

### 2.2 Document Chunk Shard (NEW - For Large Documents)

**Shard Type Name:** `DocumentChunk`  
**Purpose:** Store chunks of large documents for vectorization

**structuredData Schema:**

```typescript
interface DocumentChunkStructuredData {
  id: string;
  parentDocumentId: string;         // Reference to Document shard
  chunkIndex: number;               // 0, 1, 2, ... (order)
  chunkText: string;                // Text content of this chunk
  chunkSize: number;                // Size in characters
  startPage?: number;               // Starting page (for PDFs)
  endPage?: number;                 // Ending page
  
  // Context
  precedingText?: string;           // Previous 100 chars for context
  followingText?: string;           // Next 100 chars for context
  
  // Vectorization
  embeddingId?: string;             // Reference to embedding
  vectorized?: boolean;
  
  // Timestamps
  createdAt: Date;
}
```

---

## Part 3: Communication Shards (NEW)

### 3.1 Email Shard (NEW - CRITICAL)

**Shard Type Name:** `Email`  
**Purpose:** Store emails from Gmail, Outlook

**structuredData Schema:**

```typescript
interface EmailStructuredData {
  // Email metadata
  id: string;
  subject: string;
  threadId: string;                 // Email thread ID
  messageId: string;                // RFC 822 Message-ID
  
  // Source
  integrationSource: "gmail" | "outlook" | "exchange";
  externalId: string;               // External email ID
  
  // Participants
  from: {
    email: string;
    name?: string;
    contactId?: string;             // Linked contact shard
  };
  to: Array<{
    email: string;
    name?: string;
    contactId?: string;
  }>;
  cc?: Array<{
    email: string;
    name?: string;
    contactId?: string;
  }>;
  bcc?: Array<{
    email: string;
    name?: string;
    contactId?: string;
  }>;
  
  // Content
  bodyHtml?: string;                // HTML body
  bodyPlainText: string;            // Plain text body
  snippet?: string;                 // Preview snippet (first 100 chars)
  
  // Attachments
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    documentShardId?: string;       // Link to Document shard
  }>;
  
  // Email metadata
  isRead?: boolean;
  isImportant?: boolean;
  isFlagged?: boolean;
  isReply?: boolean;
  inReplyTo?: string;               // Message-ID of parent
  labels?: string[];                // Gmail labels
  categories?: string[];            // Outlook categories
  
  // Content analysis
  sentiment?: {
    score: number;
    label: "positive" | "neutral" | "negative";
  };
  topics?: string[];                // Extracted topics
  keyPhrases?: string[];            // Important phrases
  actionItems?: Array<{
    text: string;
    assignee?: string;
    dueDate?: Date;
    completed?: boolean;
  }>;
  containsPII?: boolean;
  
  // Classification
  emailType?: "intro" | "proposal" | "negotiation" | "follow_up" | "internal" | "other";
  importance?: "low" | "normal" | "high";
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;
  
  // Timestamps
  sentAt: Date;
  receivedAt?: Date;
  lastSyncedAt: Date;
  
  // Sync tracking
  syncStatus: "synced" | "pending" | "error";
  processingStatus: "pending" | "processing" | "completed" | "failed";
}
```

**Creation Task:**
```yaml
- id: create-email-shard-type
  content: |
    Create Email shard type:
    - Define structuredData schema
    - Create shard type in Cosmos DB
    - Create EmailShard interface
    - Create email processor consumer
    - Implement email-to-shard transformation
    - Add email shard validation
  priority: critical
  phase: 2
```

### 3.2 Email Thread Shard (NEW - OPTIONAL)

**Shard Type Name:** `EmailThread`  
**Purpose:** Aggregate email threads for conversation tracking

**structuredData Schema:**

```typescript
interface EmailThreadStructuredData {
  id: string;
  threadId: string;                 // External thread ID
  subject: string;
  participants: Array<{
    email: string;
    name?: string;
    contactId?: string;
    messageCount: number;
  }>;
  emailIds: string[];               // All email shard IDs in thread
  messageCount: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  
  // Thread analysis
  overallSentiment?: number;
  threadType?: "negotiation" | "support" | "discussion";
  
  // Entity linking
  linkedOpportunityIds?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Message Shard (NEW - CRITICAL)

**Shard Type Name:** `Message`  
**Purpose:** Store instant messages from Slack, Teams

**structuredData Schema:**

```typescript
interface MessageStructuredData {
  // Message metadata
  id: string;
  messageId: string;                // External message ID
  threadId?: string;                // Thread ID (if reply)
  parentMessageId?: string;         // Parent message ID
  
  // Source
  integrationSource: "slack" | "teams" | "discord";
  externalId: string;
  
  // Channel/Chat context
  channelId: string;
  channelName: string;
  channelType: "dm" | "group_dm" | "public_channel" | "private_channel";
  workspaceId?: string;             // Slack workspace / Teams team
  workspaceName?: string;
  
  // Sender
  from: {
    userId: string;
    email?: string;
    name: string;
    contactId?: string;             // Linked contact
  };
  
  // Content
  text: string;                     // Message text
  formattedText?: string;           // Rich text (HTML/Markdown)
  
  // Mentions and reactions
  mentions?: Array<{
    userId: string;
    name: string;
    contactId?: string;
  }>;
  mentionedChannels?: string[];
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  
  // Attachments
  hasAttachments: boolean;
  attachments?: Array<{
    type: "file" | "image" | "video" | "link";
    url: string;
    filename?: string;
    documentShardId?: string;       // Link to Document shard
  }>;
  
  // Message metadata
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isPinned: boolean;
  threadReplyCount?: number;
  
  // Content analysis
  sentiment?: {
    score: number;
    label: "positive" | "neutral" | "negative";
  };
  topics?: string[];
  containsPII?: boolean;
  
  // Classification
  messageType?: "question" | "announcement" | "discussion" | "decision" | "action_item";
  importance?: "low" | "normal" | "high";
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;
  
  // Timestamps
  sentAt: Date;
  lastSyncedAt: Date;
  
  // Sync tracking
  syncStatus: "synced" | "pending" | "error";
  processingStatus: "pending" | "processing" | "completed" | "failed";
}
```

**Creation Task:**
```yaml
- id: create-message-shard-type
  content: |
    Create Message shard type:
    - Define structuredData schema
    - Create shard type in Cosmos DB
    - Create MessageShard interface
    - Create message processor consumer
    - Implement message-to-shard transformation
    - Add message shard validation
  priority: high
  phase: 2
```

---

## Part 4: Meeting & Call Shards (NEW)

### 4.1 Meeting Shard (NEW - CRITICAL)

**Shard Type Name:** `Meeting`  
**Purpose:** Store meetings from Zoom, Teams, Google Meet, Gong

**structuredData Schema:**

```typescript
interface MeetingStructuredData {
  // Meeting metadata
  id: string;
  meetingId: string;                // External meeting ID
  title: string;
  description?: string;
  
  // Source
  integrationSource: "zoom" | "teams" | "google_meet" | "gong" | "chorus";
  externalId: string;
  externalUrl?: string;             // Meeting URL
  
  // Schedule
  startTime: Date;
  endTime: Date;
  duration: number;                 // minutes
  timezone?: string;
  
  // Participants
  organizer: {
    email: string;
    name: string;
    contactId?: string;
  };
  participants: Array<{
    email?: string;
    name: string;
    contactId?: string;
    isInternal: boolean;
    attended: boolean;
    joinedAt?: Date;
    leftAt?: Date;
    durationMinutes?: number;
  }>;
  participantCount: number;
  internalParticipantCount: number;
  externalParticipantCount: number;
  
  // Recording
  hasRecording: boolean;
  recordingUrl?: string;            // External recording URL
  recordingBlobUrl?: string;        // Azure Blob Storage URL
  recordingDuration?: number;       // seconds
  recordingSize?: number;           // bytes
  
  // Transcript
  hasTranscript: boolean;
  transcriptUrl?: string;           // External transcript URL
  transcriptBlobUrl?: string;       // Azure Blob Storage URL
  fullTranscript?: string;          // Full text transcript
  transcriptSegments?: Array<{
    speaker: string;
    startTime: number;              // seconds from start
    endTime: number;
    text: string;
    sentiment?: number;
  }>;
  
  // Meeting intelligence
  meetingType?: "discovery" | "demo" | "negotiation" | "follow_up" | "closing" | "internal";
  topics?: string[];                // Main topics discussed
  keyMoments?: Array<{
    timestamp: number;              // seconds from start
    type: "action_item" | "objection" | "commitment" | "question" | "pricing_discussion";
    text: string;
    speaker: string;
    importance: "low" | "medium" | "high";
  }>;
  
  // Action items
  actionItems?: Array<{
    text: string;
    assignee?: string;
    assigneeEmail?: string;
    assigneeContactId?: string;
    dueDate?: Date;
    priority: "low" | "medium" | "high";
    completed: boolean;
    source: "transcript" | "notes" | "manual";
  }>;
  
  // Commitments and objections
  commitments?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    confidence: number;
  }>;
  objections?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    type: "price" | "timing" | "features" | "competition" | "other";
    resolved: boolean;
  }>;
  
  // Next steps
  nextSteps?: string[];
  followUpDate?: Date;
  
  // Engagement metrics
  engagement?: {
    score: number;                  // 0-100
    talkTimeRatio?: number;         // customer/sales ratio
    questionCount?: number;
    monologueCount?: number;
    interruptionCount?: number;
    silenceDuration?: number;       // seconds
  };
  
  // Sentiment analysis
  overallSentiment?: {
    score: number;
    label: "positive" | "neutral" | "negative";
  };
  sentimentPerSpeaker?: Record<string, number>;
  
  // Deal signals
  dealSignals?: {
    positive: string[];             // Positive signals detected
    negative: string[];             // Red flags detected
    neutral: string[];
    score?: number;                 // Overall deal health score
  };
  
  // Competitor mentions
  competitorsMentioned?: string[];
  
  // Pricing discussions
  pricingDiscussed?: boolean;
  pricingDetails?: Array<{
    amount?: number;
    currency?: string;
    context: string;
    timestamp: number;
  }>;
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;
  
  // Recommendations
  recommendations?: Array<{
    type: "follow_up" | "content_share" | "coaching" | "escalation";
    text: string;
    priority: "low" | "medium" | "high";
    automated: boolean;
  }>;
  
  // Timestamps
  createdAt: Date;
  lastSyncedAt: Date;
  
  // Processing status
  syncStatus: "synced" | "pending" | "error";
  processingStatus: "pending" | "processing" | "completed" | "failed";
  recordingProcessed: boolean;
  transcriptProcessed: boolean;
  analysisCompleted: boolean;
}
```

**Creation Task:**
```yaml
- id: create-meeting-shard-type
  content: |
    Create Meeting shard type:
    - Define structuredData schema
    - Create shard type in Cosmos DB
    - Create MeetingShard interface
    - Create meeting processor consumer
    - Implement meeting-to-shard transformation
    - Add meeting intelligence pipeline
    - Add transcript processing
    - Add meeting shard validation
  priority: high
  phase: 3
```

### 4.2 Call Recording Shard (NEW - OPTIONAL)

**Shard Type Name:** `CallRecording`  
**Purpose:** Store standalone call recordings (alternative to embedding in Meeting)

**structuredData Schema:**

```typescript
interface CallRecordingStructuredData {
  id: string;
  meetingShardId: string;           // Parent meeting
  recordingUrl: string;
  blobStorageUrl: string;
  duration: number;
  format: string;                   // mp3, mp4, wav
  size: number;
  
  // Timestamps
  createdAt: Date;
}
```

---

## Part 5: Calendar Shards (NEW)

### 5.1 Calendar Event Shard (NEW)

**Shard Type Name:** `CalendarEvent`  
**Purpose:** Store calendar events from Google Calendar, Outlook

**structuredData Schema:**

```typescript
interface CalendarEventStructuredData {
  // Event metadata
  id: string;
  eventId: string;                  // External event ID
  title: string;
  description?: string;
  location?: string;
  
  // Source
  integrationSource: "google_calendar" | "outlook_calendar" | "exchange";
  externalId: string;
  calendarId?: string;
  calendarName?: string;
  
  // Schedule
  startTime: Date;
  endTime: Date;
  timezone?: string;
  isAllDay: boolean;
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;          // iCal RRULE
  recurrenceId?: string;            // For recurring series
  
  // Participants
  organizer: {
    email: string;
    name?: string;
    contactId?: string;
  };
  attendees: Array<{
    email: string;
    name?: string;
    contactId?: string;
    responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
    isOptional: boolean;
    isInternal: boolean;
  }>;
  attendeeCount: number;
  
  // Event metadata
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "public" | "private" | "confidential";
  transparency: "opaque" | "transparent"; // busy vs free
  
  // Meeting linkage
  meetingShardId?: string;          // Link to Meeting shard (if meeting occurred)
  hasConferenceData: boolean;
  conferenceUrl?: string;           // Zoom/Teams meeting URL
  conferencePlatform?: "zoom" | "teams" | "google_meet";
  
  // Classification
  eventType?: "meeting" | "call" | "interview" | "demo" | "training" | "personal" | "other";
  isProspectMeeting?: boolean;
  isDealRelated?: boolean;
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  lastSyncedAt: Date;
  
  // Sync tracking
  syncStatus: "synced" | "pending" | "error";
}
```

**Creation Task:**
```yaml
- id: create-calendar-event-shard-type
  content: |
    Create CalendarEvent shard type:
    - Define structuredData schema
    - Create shard type in Cosmos DB
    - Create CalendarEventShard interface
    - Create event processor consumer
    - Implement event-to-shard transformation
    - Add event classification logic
    - Add event shard validation
  priority: medium
  phase: 3
```

---

## Part 6: Activity & Interaction Shards (NEW)

### 6.1 Activity Shard (NEW - Unified Activity Tracking)

**Shard Type Name:** `Activity`  
**Purpose:** Unified activity tracking across all interaction types

**structuredData Schema:**

```typescript
interface ActivityStructuredData {
  // Activity metadata
  id: string;
  activityType: "email" | "meeting" | "call" | "message" | "document_view" | "document_share" | "other";
  activitySubtype?: string;         // More specific type
  
  // Source reference (what created this activity)
  sourceShardId: string;            // Email/Meeting/Message shard ID
  sourceShardType: string;          // "Email" | "Meeting" | "Message"
  integrationSource: string;
  
  // Participants
  primaryParticipant: {
    email?: string;
    name: string;
    contactId?: string;
    isInternal: boolean;
  };
  secondaryParticipants?: Array<{
    email?: string;
    name: string;
    contactId?: string;
    isInternal: boolean;
  }>;
  
  // Activity details
  subject?: string;
  description?: string;
  duration?: number;                // minutes
  outcome?: string;
  notes?: string;
  
  // Direction and context
  direction?: "inbound" | "outbound";
  context?: string;                 // Additional context
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  
  // Activity metadata
  activityDate: Date;
  completionStatus: "completed" | "scheduled" | "cancelled";
  importance: "low" | "normal" | "high";
  
  // Engagement metrics
  engagementScore?: number;         // 0-100
  sentiment?: number;               // -1 to 1
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}
```

**Creation Task:**
```yaml
- id: create-activity-shard-type
  content: |
    Create Activity shard type:
    - Define structuredData schema
    - Create shard type in Cosmos DB
    - Create ActivityShard interface
    - Create activity aggregation service
    - Implement activity creation from emails/meetings/messages
    - Add activity timeline views
    - Add activity shard validation
  priority: medium
  phase: 4
```

### 6.2 Interaction Shard (NEW - Relationship Tracking)

**Shard Type Name:** `Interaction`  
**Purpose:** Track interactions between people for relationship graph

**structuredData Schema:**

```typescript
interface InteractionStructuredData {
  id: string;
  
  // Participants
  fromContactId: string;
  toContactIds: string[];           // Can be multiple (group interactions)
  
  // Interaction details
  interactionType: "email" | "meeting" | "call" | "message";
  sourceActivityId: string;         // Reference to Activity shard
  
  // Interaction metrics
  interactionDate: Date;
  frequency: number;                // Interactions in last 30 days
  recency: number;                  // Days since last interaction
  strength: number;                 // Relationship strength score (0-100)
  
  // Sentiment
  sentiment?: number;               // -1 to 1
  
  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}
```

---

## Part 7: Implementation Plan

### Phase 1: Core CRM Shards (Week 1)

```yaml
- id: phase-1-crm-shard-updates
  tasks:
    - Update Opportunity shard type (add ML fields)
    - Verify Account shard type
    - Verify Contact shard type
    - Verify Lead shard type
    - Update field mapper to populate new fields
    - Update TypeScript interfaces
    - Test CRM data flow with updated shards
  deliverables:
    - Updated shard type definitions
    - Updated TypeScript interfaces
    - Verified CRM integration flow
```

### Phase 2: Document & Communication Shards (Week 2-3)

```yaml
- id: phase-2-document-communication-shards
  tasks:
    - Create Document shard type
    - Create DocumentChunk shard type (optional)
    - Create Email shard type
    - Create Message shard type
    - Create document processor consumer
    - Create email processor consumer
    - Create message processor consumer
    - Implement document-to-shard transformation
    - Implement email-to-shard transformation
    - Implement message-to-shard transformation
    - Add shard validation
  deliverables:
    - New shard type definitions
    - Document/email/message processors
    - Integration flow for documents & communications
```

### Phase 3: Meeting & Calendar Shards (Week 4-5)

```yaml
- id: phase-3-meeting-calendar-shards
  tasks:
    - Create Meeting shard type
    - Create CalendarEvent shard type
    - Create meeting processor consumer
    - Create event processor consumer
    - Implement meeting-to-shard transformation
    - Implement event-to-shard transformation
    - Add meeting intelligence pipeline
    - Add transcript processing
    - Add shard validation
  deliverables:
    - New shard type definitions
    - Meeting/event processors
    - Meeting intelligence features
```

### Phase 4: Activity & Interaction Shards (Week 6)

```yaml
- id: phase-4-activity-interaction-shards
  tasks:
    - Create Activity shard type
    - Create Interaction shard type
    - Create activity aggregation service
    - Implement activity creation from source shards
    - Build relationship graph
    - Add activity timeline views
    - Add shard validation
  deliverables:
    - New shard type definitions
    - Activity aggregation service
    - Relationship tracking
```

---

## Part 8: Shard Type Creation Process

### 8.1 Steps to Create New Shard Type

For each new shard type, follow these steps:

**Step 1: Define TypeScript Interface**
```typescript
// File: packages/shared/src/types/shards/DocumentShard.ts
export interface DocumentStructuredData {
  // ... schema definition
}

export interface DocumentShard {
  id: string;
  tenantId: string;
  shardTypeId: string;
  shardTypeName: "Document";
  structuredData: DocumentStructuredData;
  rawData?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
```

**Step 2: Create Shard Type in Cosmos DB**
```typescript
// Via shard-manager API or direct Cosmos DB
const shardType = {
  id: "document-shard-type",
  name: "Document",
  description: "Documents from integrations",
  category: "integration",
  schema: { /* JSON schema */ },
  version: "1.0.0",
  createdAt: new Date(),
  updatedAt: new Date()
};
```

**Step 3: Create Processor Consumer**
```typescript
// File: containers/integration-sync/src/consumers/DocumentProcessorConsumer.ts
export class DocumentProcessorConsumer {
  async processDocument(event: DocumentDetectedEvent) {
    // 1. Download document
    // 2. Extract text
    // 3. Analyze content
    // 4. Link to entities
    // 5. Create Document shard
    // 6. Publish events
  }
}
```

**Step 4: Create Transformation Logic**
```typescript
// File: containers/integration-sync/src/transformers/DocumentTransformer.ts
export class DocumentTransformer {
  async transformToShard(
    rawDocument: any,
    analysis: ContentAnalysis,
    links: EntityLinks
  ): Promise<DocumentStructuredData> {
    // Transform raw data to structuredData
  }
}
```

**Step 5: Add Validation**
```typescript
// File: containers/integration-sync/src/validators/DocumentShardValidator.ts
export class DocumentShardValidator {
  validate(data: DocumentStructuredData): ValidationResult {
    // Validate required fields
    // Validate data types
    // Validate business rules
  }
}
```

---

## Part 9: Shard Relationships

All shards must establish relationships via shard relationships:

```typescript
// Example: Document linked to Opportunity
await shardRelationshipService.createRelationship({
  sourceShardId: documentShardId,
  targetShardId: opportunityShardId,
  relationshipType: "document_for_opportunity",
  metadata: {
    autoLinked: true,
    confidence: 0.85,
    linkingStrategy: "participant_matching"
  }
});

// Example: Email linked to Contact
await shardRelationshipService.createRelationship({
  sourceShardId: emailShardId,
  targetShardId: contactShardId,
  relationshipType: "email_from_contact",
  metadata: {
    direction: "inbound"
  }
});
```

---

## Part 10: Query Patterns

### Query Documents for Opportunity
```typescript
const documents = await shardRepository.query({
  tenantId: tenantId,
  shardType: "Document",
  relationships: {
    targetShardId: opportunityId,
    relationshipType: "document_for_opportunity"
  }
});
```

### Query Emails for Contact
```typescript
const emails = await shardRepository.query({
  tenantId: tenantId,
  shardType: "Email",
  "structuredData.from.contactId": contactId
});
```

### Query Meetings with Transcripts
```typescript
const meetings = await shardRepository.query({
  tenantId: tenantId,
  shardType: "Meeting",
  "structuredData.hasTranscript": true,
  "structuredData.processingStatus": "completed"
});
```

---

## Success Criteria

1. ✅ All CRM shards updated with ML fields
2. ✅ All new shard types created in Cosmos DB
3. ✅ All TypeScript interfaces defined
4. ✅ All processor consumers implemented
5. ✅ All transformation logic implemented
6. ✅ All validation logic implemented
7. ✅ All shard relationships established
8. ✅ Integration tests verify shard creation
9. ✅ Query patterns documented
10. ✅ Shard versioning strategy implemented

---

## Notes

- **All data MUST go into structuredData** - never store raw integration data
- **Field mapping is critical** - transform external fields to shard schema
- **Relationships are key** - link shards to enable cross-entity queries
- **Validation is mandatory** - validate before storing
- **Versioning is important** - track shard schema versions
- **PII protection** - redact PII in structuredData where appropriate

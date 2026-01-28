# Integration Processors - Logs Events

## Overview

Events published and consumed by the Integration Processors module for multi-modal data processing (CRM, Documents, Emails, Messages, Meetings, Calendar Events). These events support audit trails, operational logging, and downstream processing.

## Published Events

### integration.document.processed

**Description**: Emitted when a document has been successfully processed (downloaded, stored, text extracted, analyzed).

**Triggered When**:
- DocumentProcessorConsumer successfully processes `integration.document.detected` event
- Document is downloaded and stored in Azure Blob Storage
- Text extraction completes (if applicable)
- Document shard is created

**Event Type**: `integration.document.processed`

**data**:
- `documentId` (string) - Document ID
- `shardId` (string) - ID of created Document shard
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string) - External system ID
- `title` (string) - Document title
- `textExtracted` (boolean) - Whether text extraction succeeded
- `textLength` (number, optional) - Length of extracted text
- `wordCount` (number, optional) - Word count
- `pageCount` (number, optional) - Page count (for PDFs)
- `blobStorageUrl` (string, optional) - Azure Blob Storage URL
- `processingStatus` (string) - `'completed'` | `'pending'` | `'failed'`
- `error` (string, optional) - Error message if processing failed

---

### integration.document.processing.failed

**Description**: Emitted when document processing fails.

**Triggered When**:
- DocumentProcessorConsumer fails to process `integration.document.detected` event
- Download fails
- Text extraction fails
- Shard creation fails

**Event Type**: `integration.document.processing.failed`

**data**:
- `documentId` (string)
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `error` (string) - Error message

---

### integration.email.processed

**Description**: Emitted when an email has been successfully processed (parsed, attachments processed, shard created).

**Triggered When**:
- EmailProcessorConsumer successfully processes `integration.email.received` event
- Email metadata is parsed
- Attachments are processed (if any)
- Email shard is created

**Event Type**: `integration.email.processed`

**data**:
- `emailId` (string) - Email ID
- `shardId` (string) - ID of created Email shard
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `subject` (string) - Email subject
- `from` (string) - Sender email
- `to` (array) - Recipient emails
- `attachmentCount` (number) - Number of attachments processed
- `snippet` (string, optional) - Email snippet/preview

---

### integration.email.processing.failed

**Description**: Emitted when email processing fails.

**Triggered When**:
- EmailProcessorConsumer fails to process `integration.email.received` event

**Event Type**: `integration.email.processing.failed`

**data**:
- `emailId` (string)
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `error` (string) - Error message

---

### integration.message.processed

**Description**: Emitted when a message has been successfully processed (parsed, attachments processed, shard created).

**Triggered When**:
- MessageProcessorConsumer successfully processes `integration.message.received` event
- Message metadata is parsed
- Attachments are processed (if any)
- Message shard is created

**Event Type**: `integration.message.processed`

**data**:
- `messageId` (string) - Message ID
- `shardId` (string) - ID of created Message shard
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `channelId` (string) - Channel ID
- `channelType` (string, optional) - `'direct'` | `'group'` | `'public'` | `'private'`
- `from` (string) - Sender
- `text` (string, optional) - Message text
- `attachmentCount` (number) - Number of attachments processed

---

### integration.message.processing.failed

**Description**: Emitted when message processing fails.

**Triggered When**:
- MessageProcessorConsumer fails to process `integration.message.received` event

**Event Type**: `integration.message.processing.failed`

**data**:
- `messageId` (string)
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `error` (string) - Error message

---

### integration.meeting.processed

**Description**: Emitted when a meeting has been successfully processed (recording downloaded, transcript processed, analysis completed, shard created).

**Triggered When**:
- MeetingProcessorConsumer successfully processes `integration.meeting.completed` event
- Recording is downloaded and stored (if available)
- Transcript is downloaded/transcribed (if available)
- Content analysis completes (if transcript available)
- Meeting shard is created

**Event Type**: `integration.meeting.processed`

**data**:
- `meetingId` (string) - Meeting ID
- `shardId` (string) - ID of created Meeting shard
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `title` (string) - Meeting title
- `startTime` (string) - ISO date-time string
- `participantCount` (number) - Number of participants
- `hasRecording` (boolean) - Whether recording was available and stored
- `hasTranscript` (boolean) - Whether transcript was available/transcribed
- `meetingType` (string, optional) - `'discovery'` | `'demo'` | `'negotiation'` | `'follow_up'` | `'closing'` | `'internal'`
- `actionItemsCount` (number, optional) - Number of action items extracted

---

### integration.meeting.processing.failed

**Description**: Emitted when meeting processing fails.

**Triggered When**:
- MeetingProcessorConsumer fails to process `integration.meeting.completed` event

**Event Type**: `integration.meeting.processing.failed`

**data**:
- `meetingId` (string)
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `error` (string) - Error message

---

### integration.event.processed

**Description**: Emitted when a calendar event has been successfully processed (parsed, classified, shard created).

**Triggered When**:
- EventProcessorConsumer successfully processes `integration.event.created` event
- Event metadata is parsed
- Event type is classified
- Attendees are classified
- CalendarEvent shard is created

**Event Type**: `integration.event.processed`

**data**:
- `eventId` (string) - Event ID
- `shardId` (string) - ID of created CalendarEvent shard
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `title` (string) - Event title
- `startTime` (string) - ISO date-time string
- `attendeeCount` (number) - Number of attendees
- `isDealRelated` (boolean) - Whether event is deal-related
- `eventType` (string, optional) - `'meeting'` | `'call'` | `'interview'` | `'demo'` | `'training'` | `'personal'` | `'other'`

---

### integration.event.processing.failed

**Description**: Emitted when calendar event processing fails.

**Triggered When**:
- EventProcessorConsumer fails to process `integration.event.created` event

**Event Type**: `integration.event.processing.failed`

**data**:
- `eventId` (string)
- `tenantId` (string)
- `integrationId` (string)
- `externalId` (string)
- `error` (string) - Error message

---

### entity.linked

**Description**: Emitted when an entity (Document, Email, Message, Meeting) is automatically linked to a CRM entity (Opportunity, Account, Contact).

**Triggered When**:
- EntityLinkingConsumer successfully links a shard to a CRM entity
- Confidence threshold is met (> 60%)
- Link is created (auto-attached if > 80%, suggested if 60-80%)

**Event Type**: `entity.linked`

**data**:
- `sourceType` (string) - Source shard type: `'Document'` | `'Email'` | `'Message'` | `'Meeting'`
- `sourceId` (string) - Source shard ID
- `targetType` (string) - Target entity type: `'Opportunity'` | `'Account'` | `'Contact'`
- `targetId` (string) - Target entity ID (shard ID or external ID)
- `tenantId` (string)
- `confidence` (number) - Confidence score (0-100)
- `strategy` (string) - Linking strategy used: `'explicit_reference'` | `'participant_matching'` | `'content_analysis'` | `'temporal_correlation'` | `'vector_similarity'`
- `autoAttached` (boolean) - Whether link was auto-attached (confidence > 80%)
- `suggested` (boolean) - Whether link was suggested (confidence 60-80%)

---

### activity.created

**Description**: Emitted when an Activity shard has been successfully created from a source shard (Email, Meeting, or Message).

**Triggered When**:
- ActivityAggregationConsumer successfully processes `shard.created` event (Email, Meeting, or Message)
- Activity shard is created
- Interaction shards are created (if applicable)

**Event Type**: `activity.created`

**data**:
- `activityId` (string) - ID of created Activity shard
- `sourceShardId` (string) - Source shard ID (Email/Meeting/Message)
- `sourceShardType` (string) - Source shard type: `'Email'` | `'Meeting'` | `'Message'`
- `interactionCount` (number) - Number of Interaction shards created
- `tenantId` (string)

---

### activity.aggregation.failed

**Description**: Emitted when activity aggregation fails.

**Triggered When**:
- ActivityAggregationConsumer fails to process `shard.created` event
- Activity shard creation fails
- Interaction shard creation fails

**Event Type**: `activity.aggregation.failed`

**data**:
- `shardId` (string) - Source shard ID
- `shardTypeName` (string) - Source shard type
- `tenantId` (string)
- `error` (string) - Error message

---

## Consumed Events

### integration.data.raw

**Description**: Raw CRM data fetched from external integration.

**Handler**: `src/consumers/CRMDataMappingConsumer.ts`

**Action**: Apply field mappings, calculate ML fields, create/update Opportunity/Account/Contact shards.

**data**: See `containers/integration-sync/logs-events.md`

---

### integration.data.raw.batch

**Description**: Batch of raw CRM data records (for large syncs).

**Handler**: `src/consumers/CRMDataMappingConsumer.ts`

**Action**: Process batch of records, apply field mappings, create/update shards.

**data**: See `containers/integration-sync/logs-events.md`

---

### integration.document.detected

**Description**: Document detected in external integration (Google Drive, SharePoint, etc.).

**Handler**: `src/consumers/DocumentProcessorConsumer.ts`

**Action**: Download document, store in Azure Blob Storage, extract text, analyze content, create Document shard.

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `documentId` (string)
- `externalId` (string)
- `externalUrl` (string) - URL to download document
- `title` (string)
- `mimeType` (string)
- `size` (number) - File size in bytes
- `integrationSource` (string) - `'google_drive'` | `'sharepoint'` | `'dropbox'` | `'onedrive'` | `'box'`
- `sourcePath` (string, optional)
- `parentFolderId` (string, optional)
- `parentFolderName` (string, optional)
- `createdBy` (string, optional)
- `modifiedBy` (string, optional)
- `createdAt` (string, optional) - ISO date-time string
- `modifiedAt` (string, optional) - ISO date-time string
- `syncTaskId` (string, optional)
- `correlationId` (string, optional)
- `metadata` (object, optional)

---

### integration.email.received

**Description**: Email received from external integration (Gmail, Outlook, etc.).

**Handler**: `src/consumers/EmailProcessorConsumer.ts`

**Action**: Parse email metadata, process attachments, create Email shard.

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `emailId` (string)
- `externalId` (string)
- `threadId` (string, optional)
- `from` (string) - Sender email
- `to` (array) - Recipient emails
- `subject` (string)
- `body` (string) - Email body (HTML or plain text)
- `attachments` (array, optional) - Array of attachment objects
- `receivedAt` (string, optional) - ISO date-time string
- `syncTaskId` (string, optional)
- `correlationId` (string, optional)
- `metadata` (object, optional)

---

### integration.message.received

**Description**: Message received from external integration (Slack, Teams, etc.).

**Handler**: `src/consumers/MessageProcessorConsumer.ts`

**Action**: Parse message metadata, process attachments, classify channel, create Message shard.

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `messageId` (string)
- `externalId` (string)
- `channelId` (string)
- `from` (string) - Sender
- `text` (string) - Message text
- `mentions` (array, optional) - Array of mentioned users
- `reactions` (array, optional) - Array of reaction objects
- `receivedAt` (string, optional) - ISO date-time string
- `syncTaskId` (string, optional)
- `correlationId` (string, optional)
- `metadata` (object, optional)

---

### integration.meeting.completed

**Description**: Meeting completed in external integration (Zoom, Teams, Google Meet, Gong).

**Handler**: `src/consumers/MeetingProcessorConsumer.ts`

**Action**: Download recording, transcribe, analyze content, create Meeting shard.

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `meetingId` (string)
- `externalId` (string)
- `title` (string)
- `description` (string, optional)
- `startTime` (string) - ISO date-time string
- `endTime` (string, optional) - ISO date-time string
- `duration` (number, optional) - Duration in minutes
- `timezone` (string, optional)
- `integrationSource` (string) - `'zoom'` | `'teams'` | `'google_meet'` | `'gong'` | `'chorus'`
- `externalUrl` (string, optional)
- `recordingUrl` (string, optional) - URL to download recording
- `transcriptUrl` (string, optional) - URL to download transcript
- `organizer` (object, optional) - `{ email: string, name: string }`
- `participants` (array, optional) - Array of participant objects
- `syncTaskId` (string, optional)
- `correlationId` (string, optional)
- `metadata` (object, optional)

---

### integration.event.created

**Description**: Calendar event created in external integration (Google Calendar, Outlook).

**Handler**: `src/consumers/EventProcessorConsumer.ts`

**Action**: Parse event metadata, classify event type, classify attendees, create CalendarEvent shard.

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `eventId` (string)
- `externalId` (string)
- `title` (string)
- `description` (string, optional)
- `startTime` (string) - ISO date-time string
- `endTime` (string, optional) - ISO date-time string
- `duration` (number, optional) - Duration in minutes
- `timezone` (string, optional)
- `isAllDay` (boolean, optional)
- `location` (string, optional)
- `locationType` (string, optional) - `'in_person'` | `'online'` | `'phone'`
- `meetingUrl` (string, optional)
- `organizer` (object) - `{ email: string, name?: string }`
- `attendees` (array, optional) - Array of attendee objects
- `recurrence` (object, optional) - Recurrence rules
- `status` (string, optional) - `'confirmed'` | `'tentative'` | `'cancelled'`
- `integrationSource` (string) - `'google_calendar'` | `'outlook'` | `'exchange'`
- `externalUrl` (string, optional)
- `syncTaskId` (string, optional)
- `correlationId` (string, optional)
- `metadata` (object, optional)

---

### shard.created

**Description**: Shard created in shard-manager (triggers entity linking and vectorization).

**Handler**: `src/consumers/EntityLinkingConsumer.ts`

**Action**: Perform deep entity linking for Document, Email, Message, Meeting shards.

**data**: See `containers/shard-manager/docs/logs-events.md`

---

### shard.updated

**Description**: Shard updated in shard-manager (triggers ML field aggregation for Opportunity shards).

**Handler**: `src/consumers/MLFieldAggregationConsumer.ts`

**Action**: Recalculate relationship counts (documentCount, emailCount, etc.) for Opportunity shards.

**data**: See `containers/shard-manager/docs/logs-events.md`

---

### activity.created

**Description**: Activity shard created (triggers activity aggregation for Email, Meeting, Message shards).

**Handler**: `src/consumers/ActivityAggregationConsumer.ts`

**Action**: Create Activity and Interaction shards from Email, Meeting, or Message shards.

**Note**: This event is consumed internally by ActivityAggregationConsumer. The consumer listens for `shard.created` events and filters for Email, Meeting, and Message shards only.

**data**: See Published Events section above

---

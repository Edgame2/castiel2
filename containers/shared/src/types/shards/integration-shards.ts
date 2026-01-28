/**
 * Integration Shard StructuredData Interfaces
 * Interfaces for Document, Email, Message, Meeting, CalendarEvent shard types
 */

/**
 * Document Shard StructuredData
 * Document from integrations (Google Drive, SharePoint, etc.)
 */
export interface DocumentStructuredData {
  // Core document metadata
  id: string;
  title: string;
  description?: string;
  documentType?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'html' | 'image' | 'other';
  mimeType: string;
  size: number; // bytes

  // Source information
  integrationSource?: 'google_drive' | 'sharepoint' | 'dropbox' | 'onedrive' | 'box';
  externalId: string;
  externalUrl?: string;
  sourcePath?: string;
  parentFolderId?: string;
  parentFolderName?: string;

  // Storage
  blobStorageUrl?: string;
  blobStorageContainer?: string;
  blobStoragePath?: string;

  // Content extraction
  extractedText?: string;
  extractedTextLength?: number;
  pageCount?: number;
  wordCount?: number;
  language?: string;

  // Content analysis
  summary?: string;
  keyTopics?: string[];
  keyPhrases?: string[];
  entities?: Array<{
    type: 'person' | 'organization' | 'location' | 'date' | 'money';
    text: string;
    confidence: number;
  }>;
  sentiment?: {
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
  };

  // Document classification
  category?: 'proposal' | 'contract' | 'presentation' | 'report' | 'email_attachment' | 'other';
  confidenceLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  containsPII?: boolean;

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;

  // Timestamps
  createdAt?: string; // ISO date-time string
  modifiedAt?: string; // ISO date-time string
  lastAccessedAt?: string; // ISO date-time string
  createdBy?: string;
  modifiedBy?: string;
  ownerId?: string;

  // Sync tracking
  lastSyncedAt?: string; // ISO date-time string
  syncStatus?: 'synced' | 'pending' | 'error';
  syncError?: string;

  // Processing status
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  textExtractionCompleted?: boolean;
  analysisCompleted?: boolean;
  vectorizationCompleted?: boolean;
}

/**
 * Email Shard StructuredData
 * Email from integrations (Gmail, Outlook)
 */
export interface EmailStructuredData {
  // Email metadata
  id: string;
  subject: string;
  threadId: string;
  messageId?: string; // RFC 822 Message-ID

  // Source
  integrationSource?: 'gmail' | 'outlook' | 'exchange';
  externalId: string;

  // Participants
  from?: {
    email: string;
    name?: string;
    contactId?: string;
  };
  to?: Array<{
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
  bodyHtml?: string;
  bodyPlainText: string;
  snippet?: string;

  // Attachments
  hasAttachments?: boolean;
  attachmentCount?: number;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    documentShardId?: string;
  }>;

  // Email metadata
  isRead?: boolean;
  isImportant?: boolean;
  isFlagged?: boolean;
  isReply?: boolean;
  inReplyTo?: string;
  labels?: string[];
  categories?: string[];

  // Content analysis
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  topics?: string[];
  keyPhrases?: string[];
  actionItems?: Array<{
    text: string;
    assignee?: string;
    dueDate?: string; // ISO date-time string
    completed?: boolean;
  }>;
  containsPII?: boolean;

  // Classification
  emailType?: 'intro' | 'proposal' | 'negotiation' | 'follow_up' | 'internal' | 'other';
  importance?: 'low' | 'normal' | 'high';

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;

  // Timestamps
  sentAt: string; // ISO date-time string
  receivedAt?: string; // ISO date-time string
  lastSyncedAt?: string; // ISO date-time string

  // Sync tracking
  syncStatus?: 'synced' | 'pending' | 'error';
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Message Shard StructuredData
 * Message from Slack/Teams
 */
export interface MessageStructuredData {
  // Message metadata
  id: string;
  messageId: string;
  threadId?: string;
  parentMessageId?: string;

  // Source
  integrationSource?: 'slack' | 'teams' | 'discord';
  externalId: string;

  // Channel/Chat context
  channelId: string;
  channelName?: string;
  channelType?: 'dm' | 'group_dm' | 'public_channel' | 'private_channel';
  workspaceId?: string;
  workspaceName?: string;

  // Sender
  from?: {
    userId: string;
    email?: string;
    name: string;
    contactId?: string;
  };

  // Content
  text: string;
  formattedText?: string;

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
  hasAttachments?: boolean;
  attachments?: Array<{
    type: 'file' | 'image' | 'video' | 'link';
    url: string;
    filename?: string;
    documentShardId?: string;
  }>;

  // Message metadata
  isEdited?: boolean;
  editedAt?: string; // ISO date-time string
  isDeleted?: boolean;
  deletedAt?: string; // ISO date-time string
  isPinned?: boolean;
  threadReplyCount?: number;

  // Content analysis
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  topics?: string[];
  containsPII?: boolean;

  // Classification
  messageType?: 'question' | 'announcement' | 'discussion' | 'decision' | 'action_item';
  importance?: 'low' | 'normal' | 'high';

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;

  // Timestamps
  sentAt: string; // ISO date-time string
  lastSyncedAt?: string; // ISO date-time string

  // Sync tracking
  syncStatus?: 'synced' | 'pending' | 'error';
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Meeting Shard StructuredData
 * Meeting recording and transcript from Zoom, Teams, Google Meet, Gong
 */
export interface MeetingStructuredData {
  // Meeting metadata
  id: string;
  meetingId: string;
  title: string;
  description?: string;

  // Source
  integrationSource?: 'zoom' | 'teams' | 'google_meet' | 'gong' | 'chorus';
  externalId: string;
  externalUrl?: string;

  // Schedule
  startTime: string; // ISO date-time string
  endTime?: string; // ISO date-time string
  duration?: number; // minutes
  timezone?: string;

  // Participants
  organizer?: {
    email: string;
    name: string;
    contactId?: string;
  };
  participants?: Array<{
    email?: string;
    name: string;
    contactId?: string;
    isInternal?: boolean;
    attended?: boolean;
    joinedAt?: string; // ISO date-time string
    leftAt?: string; // ISO date-time string
    durationMinutes?: number;
  }>;
  participantCount?: number;
  internalParticipantCount?: number;
  externalParticipantCount?: number;

  // Recording
  hasRecording?: boolean;
  recordingUrl?: string;
  recordingBlobUrl?: string;
  recordingDuration?: number; // seconds
  recordingSize?: number; // bytes

  // Transcript
  hasTranscript?: boolean;
  transcriptUrl?: string;
  transcriptBlobUrl?: string;
  fullTranscript?: string;
  transcriptSegments?: Array<{
    speaker: string;
    startTime: number; // seconds from start
    endTime: number;
    text: string;
    sentiment?: number;
  }>;

  // Meeting intelligence
  meetingType?: 'discovery' | 'demo' | 'negotiation' | 'follow_up' | 'closing' | 'internal';
  topics?: string[];
  keyMoments?: Array<{
    timestamp: number; // seconds from start
    type: 'action_item' | 'objection' | 'commitment' | 'question' | 'pricing_discussion';
    text: string;
    speaker: string;
    importance: 'low' | 'medium' | 'high';
  }>;

  // Action items
  actionItems?: Array<{
    text: string;
    assignee?: string;
    assigneeEmail?: string;
    assigneeContactId?: string;
    dueDate?: string; // ISO date-time string
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    source?: 'transcript' | 'notes' | 'manual';
  }>;

  // Objections and commitments
  objections?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    type?: 'price' | 'timing' | 'features' | 'competition' | 'other';
    resolved?: boolean;
  }>;
  commitments?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    confidence?: number;
  }>;

  // Engagement metrics
  engagementMetrics?: {
    score?: number; // 0-100
    talkTimeRatio?: number;
    questionCount?: number;
    monologueCount?: number;
    interruptionCount?: number;
    silenceDuration?: number; // seconds
  };

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];
  autoLinkingConfidence?: Record<string, number>;

  // Timestamps
  createdAt?: string; // ISO date-time string
  lastSyncedAt?: string; // ISO date-time string

  // Sync tracking
  syncStatus?: 'synced' | 'pending' | 'error';
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * CalendarEvent Shard StructuredData
 * Calendar event from integrations (Google Calendar, Outlook)
 */
export interface CalendarEventStructuredData {
  // Event metadata
  id: string;
  eventId: string;
  title: string;
  description?: string;

  // Source
  integrationSource?: 'google_calendar' | 'outlook' | 'exchange';
  externalId: string;
  externalUrl?: string;

  // Schedule
  startTime: string; // ISO date-time string
  endTime?: string; // ISO date-time string
  duration?: number; // minutes
  timezone?: string;
  isAllDay?: boolean;
  recurrence?: {
    isRecurring?: boolean;
    recurrenceRule?: string; // iCal RRULE
    recurrenceId?: string;
  };

  // Location
  location?: string;
  locationType?: 'in_person' | 'online' | 'phone';
  meetingUrl?: string;

  // Organizer and attendees
  organizer?: {
    email: string;
    name?: string;
    contactId?: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    contactId?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    isOptional?: boolean;
    isInternal?: boolean;
  }>;
  attendeeCount?: number;

  // Meeting link
  meetingShardId?: string;

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];

  // Timestamps
  createdAt?: string; // ISO date-time string
  lastSyncedAt?: string; // ISO date-time string

  // Sync tracking
  syncStatus?: 'synced' | 'pending' | 'error';
}

/**
 * Activity Shard StructuredData
 * Unified activity tracking across all interaction types (Email, Meeting, Message)
 */
export interface ActivityStructuredData {
  // Activity metadata
  id: string;
  activityType: 'email' | 'meeting' | 'call' | 'message' | 'document_view' | 'document_share' | 'other';
  activitySubtype?: string; // More specific type

  // Source reference (what created this activity)
  sourceShardId: string; // Email/Meeting/Message shard ID
  sourceShardType: string; // 'Email' | 'Meeting' | 'Message'
  integrationSource?: string;

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
  duration?: number; // minutes
  outcome?: string;
  notes?: string;

  // Direction and context
  direction?: 'inbound' | 'outbound';
  context?: string; // Additional context

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];
  linkedContactIds?: string[];

  // Activity metadata
  activityDate: string; // ISO date-time string
  completionStatus: 'completed' | 'scheduled' | 'cancelled';
  importance?: 'low' | 'normal' | 'high';

  // Engagement metrics
  engagementScore?: number; // 0-100
  sentiment?: number; // -1 to 1

  // Timestamps
  createdAt?: string; // ISO date-time string
  updatedAt?: string; // ISO date-time string
}

/**
 * Interaction Shard StructuredData
 * Track interactions between people for relationship graph
 */
export interface InteractionStructuredData {
  id: string;

  // Participants
  fromContactId: string;
  toContactIds: string[]; // Can be multiple (group interactions)

  // Interaction details
  interactionType: 'email' | 'meeting' | 'call' | 'message';
  sourceActivityId: string; // Reference to Activity shard

  // Interaction metrics
  interactionDate: string; // ISO date-time string
  frequency?: number; // Interactions in last 30 days
  recency?: number; // Days since last interaction
  strength?: number; // Relationship strength score (0-100)

  // Sentiment
  sentiment?: number; // -1 to 1

  // Entity linking
  linkedOpportunityIds?: string[];
  linkedAccountIds?: string[];

  // Timestamps
  createdAt?: string; // ISO date-time string
  updatedAt?: string; // ISO date-time string
}

/**
 * Integration Shard StructuredData Interfaces
 * Interfaces for Document, Email, Message, Meeting, CalendarEvent shard types
 */
/**
 * Document Shard StructuredData
 * Document from integrations (Google Drive, SharePoint, etc.)
 */
export interface DocumentStructuredData {
    id: string;
    title: string;
    description?: string;
    documentType?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'html' | 'image' | 'other';
    mimeType: string;
    size: number;
    integrationSource?: 'google_drive' | 'sharepoint' | 'dropbox' | 'onedrive' | 'box';
    externalId: string;
    externalUrl?: string;
    sourcePath?: string;
    parentFolderId?: string;
    parentFolderName?: string;
    blobStorageUrl?: string;
    blobStorageContainer?: string;
    blobStoragePath?: string;
    extractedText?: string;
    extractedTextLength?: number;
    pageCount?: number;
    wordCount?: number;
    language?: string;
    summary?: string;
    keyTopics?: string[];
    keyPhrases?: string[];
    entities?: Array<{
        type: 'person' | 'organization' | 'location' | 'date' | 'money';
        text: string;
        confidence: number;
    }>;
    sentiment?: {
        score: number;
        label: 'positive' | 'neutral' | 'negative';
    };
    category?: 'proposal' | 'contract' | 'presentation' | 'report' | 'email_attachment' | 'other';
    confidenceLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    containsPII?: boolean;
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    autoLinkingConfidence?: Record<string, number>;
    createdAt?: string;
    modifiedAt?: string;
    lastAccessedAt?: string;
    createdBy?: string;
    modifiedBy?: string;
    ownerId?: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
    syncError?: string;
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
    id: string;
    subject: string;
    threadId: string;
    messageId?: string;
    integrationSource?: 'gmail' | 'outlook' | 'exchange';
    externalId: string;
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
    bodyHtml?: string;
    bodyPlainText: string;
    snippet?: string;
    hasAttachments?: boolean;
    attachmentCount?: number;
    attachments?: Array<{
        filename: string;
        mimeType: string;
        size: number;
        documentShardId?: string;
    }>;
    isRead?: boolean;
    isImportant?: boolean;
    isFlagged?: boolean;
    isReply?: boolean;
    inReplyTo?: string;
    labels?: string[];
    categories?: string[];
    sentiment?: {
        score: number;
        label: 'positive' | 'neutral' | 'negative';
    };
    topics?: string[];
    keyPhrases?: string[];
    actionItems?: Array<{
        text: string;
        assignee?: string;
        dueDate?: string;
        completed?: boolean;
    }>;
    containsPII?: boolean;
    emailType?: 'intro' | 'proposal' | 'negotiation' | 'follow_up' | 'internal' | 'other';
    importance?: 'low' | 'normal' | 'high';
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    autoLinkingConfidence?: Record<string, number>;
    sentAt: string;
    receivedAt?: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}
/**
 * Message Shard StructuredData
 * Message from Slack/Teams
 */
export interface MessageStructuredData {
    id: string;
    messageId: string;
    threadId?: string;
    parentMessageId?: string;
    integrationSource?: 'slack' | 'teams' | 'discord';
    externalId: string;
    channelId: string;
    channelName?: string;
    channelType?: 'dm' | 'group_dm' | 'public_channel' | 'private_channel';
    workspaceId?: string;
    workspaceName?: string;
    from?: {
        userId: string;
        email?: string;
        name: string;
        contactId?: string;
    };
    text: string;
    formattedText?: string;
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
    hasAttachments?: boolean;
    attachments?: Array<{
        type: 'file' | 'image' | 'video' | 'link';
        url: string;
        filename?: string;
        documentShardId?: string;
    }>;
    isEdited?: boolean;
    editedAt?: string;
    isDeleted?: boolean;
    deletedAt?: string;
    isPinned?: boolean;
    threadReplyCount?: number;
    sentiment?: {
        score: number;
        label: 'positive' | 'neutral' | 'negative';
    };
    topics?: string[];
    containsPII?: boolean;
    messageType?: 'question' | 'announcement' | 'discussion' | 'decision' | 'action_item';
    importance?: 'low' | 'normal' | 'high';
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    autoLinkingConfidence?: Record<string, number>;
    sentAt: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}
/**
 * Meeting Shard StructuredData
 * Meeting recording and transcript from Zoom, Teams, Google Meet, Gong
 */
export interface MeetingStructuredData {
    id: string;
    meetingId: string;
    title: string;
    description?: string;
    integrationSource?: 'zoom' | 'teams' | 'google_meet' | 'gong' | 'chorus';
    externalId: string;
    externalUrl?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    timezone?: string;
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
        joinedAt?: string;
        leftAt?: string;
        durationMinutes?: number;
    }>;
    participantCount?: number;
    internalParticipantCount?: number;
    externalParticipantCount?: number;
    hasRecording?: boolean;
    recordingUrl?: string;
    recordingBlobUrl?: string;
    recordingDuration?: number;
    recordingSize?: number;
    hasTranscript?: boolean;
    transcriptUrl?: string;
    transcriptBlobUrl?: string;
    fullTranscript?: string;
    transcriptSegments?: Array<{
        speaker: string;
        startTime: number;
        endTime: number;
        text: string;
        sentiment?: number;
    }>;
    meetingType?: 'discovery' | 'demo' | 'negotiation' | 'follow_up' | 'closing' | 'internal';
    topics?: string[];
    keyMoments?: Array<{
        timestamp: number;
        type: 'action_item' | 'objection' | 'commitment' | 'question' | 'pricing_discussion';
        text: string;
        speaker: string;
        importance: 'low' | 'medium' | 'high';
    }>;
    actionItems?: Array<{
        text: string;
        assignee?: string;
        assigneeEmail?: string;
        assigneeContactId?: string;
        dueDate?: string;
        priority: 'low' | 'medium' | 'high';
        completed: boolean;
        source?: 'transcript' | 'notes' | 'manual';
    }>;
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
    engagementMetrics?: {
        score?: number;
        talkTimeRatio?: number;
        questionCount?: number;
        monologueCount?: number;
        interruptionCount?: number;
        silenceDuration?: number;
    };
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    autoLinkingConfidence?: Record<string, number>;
    createdAt?: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}
/**
 * CalendarEvent Shard StructuredData
 * Calendar event from integrations (Google Calendar, Outlook)
 */
export interface CalendarEventStructuredData {
    id: string;
    eventId: string;
    title: string;
    description?: string;
    integrationSource?: 'google_calendar' | 'outlook' | 'exchange';
    externalId: string;
    externalUrl?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    timezone?: string;
    isAllDay?: boolean;
    recurrence?: {
        isRecurring?: boolean;
        recurrenceRule?: string;
        recurrenceId?: string;
    };
    location?: string;
    locationType?: 'in_person' | 'online' | 'phone';
    meetingUrl?: string;
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
    meetingShardId?: string;
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    createdAt?: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
}
/**
 * Activity Shard StructuredData
 * Unified activity tracking across all interaction types (Email, Meeting, Message)
 */
export interface ActivityStructuredData {
    id: string;
    activityType: 'email' | 'meeting' | 'call' | 'message' | 'document_view' | 'document_share' | 'other';
    activitySubtype?: string;
    sourceShardId: string;
    sourceShardType: string;
    integrationSource?: string;
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
    subject?: string;
    description?: string;
    duration?: number;
    outcome?: string;
    notes?: string;
    direction?: 'inbound' | 'outbound';
    context?: string;
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    linkedContactIds?: string[];
    activityDate: string;
    completionStatus: 'completed' | 'scheduled' | 'cancelled';
    importance?: 'low' | 'normal' | 'high';
    engagementScore?: number;
    sentiment?: number;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Interaction Shard StructuredData
 * Track interactions between people for relationship graph
 */
export interface InteractionStructuredData {
    id: string;
    fromContactId: string;
    toContactIds: string[];
    interactionType: 'email' | 'meeting' | 'call' | 'message';
    sourceActivityId: string;
    interactionDate: string;
    frequency?: number;
    recency?: number;
    strength?: number;
    sentiment?: number;
    linkedOpportunityIds?: string[];
    linkedAccountIds?: string[];
    createdAt?: string;
    updatedAt?: string;
}
//# sourceMappingURL=integration-shards.d.ts.map
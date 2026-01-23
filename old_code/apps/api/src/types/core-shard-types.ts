/**
 * Core ShardType Definitions
 * System-provided ShardTypes that are available to all tenants
 */

import { ShardTypeCategory, RichSchema } from './shard-type.types.js';
// import { SecurityLevel, PIICategory, applySecurityPreset } from './field-security.types.js'; // Unused
import { RichFieldType, type RichFieldDefinition } from '@castiel/shared-types';
import type { EmbeddingTemplate } from './embedding-template.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Core ShardType names
 */
export const CORE_SHARD_TYPE_NAMES = {
  // Primary entities
  COMPANY: 'c_company',
  CONTACT: 'c_contact',
  PROJECT: 'c_project',
  OPPORTUNITY: 'c_opportunity',
  OPPORTUNITY_HISTORY: 'c_opportunityHistory',
  OPPORTUNITY_COMPETITOR: 'c_opportunityCompetitor',
  OPPORTUNITY_CONTACT_ROLE: 'c_opportunityContactRole',
  OPPORTUNITY_LINE_ITEM: 'c_opportunityLineItem',

  // Content types
  DOCUMENT: 'c_document',
  NOTE: 'c_note',
  NEWS: 'c_news',

  // Activity & communication
  TASK: 'c_task',
  EVENT: 'c_event',
  EMAIL: 'c_email',
  ACTIVITY: 'c_activity',

  // Products & services
  PRODUCT: 'c_product',

  // AI & templates
  ASSISTANT: 'c_assistant',
  CONTEXT_TEMPLATE: 'c_contextTemplate',
  CONVERSATION_TEMPLATE: 'c_conversationTemplate',
  AI_MODEL: 'c_aimodel',
  AI_CONFIG: 'c_aiconfig',
  CONVERSATION: 'c_conversation',
  CONVERSATION_MESSAGE: 'c_conversationMessage',

  // Dashboards
  DASHBOARD: 'c_dashboard',
  DASHBOARD_WIDGET: 'c_dashboardWidget',
  DASHBOARD_VERSION: 'c_dashboardVersion',

  // Web Search
  WEBPAGES: 'c_webpages',

  // Phase 2 Integration types
  ACCOUNT: 'c_account',
  LEAD: 'c_lead',
  TICKET: 'c_ticket',
  CAMPAIGN: 'c_campaign',
  QUOTE: 'c_quote',
  MEETING: 'c_meeting',
  CALENDAR: 'c_calendar',
  MESSAGE: 'c_message',
  TEAM: 'c_team',
  ATTACHMENT: 'c_attachment',
  COMPETITOR: 'c_competitor',
  CONTRACT: 'c_contract',
  ORDER: 'c_order',
  INVOICE: 'c_invoice',
  PAYMENT: 'c_payment',
  REVENUE: 'c_revenue',
  CALL: 'c_call',
  WEBINAR: 'c_webinar',
  MARKETING_ASSET: 'c_marketingAsset',
  EVENT_REGISTRATION: 'c_eventRegistration',
  LEAD_SCORE: 'c_leadScore',
  PRICE_BOOK: 'c_priceBook',
  ASSET: 'c_asset',
  FOLDER: 'c_folder',
  FILE: 'c_file',
  SP_SITE: 'c_sp_site',
  CHANNEL: 'c_channel',
  INTEGRATION_STATE: 'integration.state',
  INSIGHT_KPI: 'c_insight_kpi',
  
  // Risk Analysis types
  RISK_CATALOG: 'c_risk_catalog',
  RISK_SNAPSHOT: 'c_risk_snapshot',
  QUOTA: 'c_quota',
  RISK_SIMULATION: 'c_risk_simulation',
  BENCHMARK: 'c_benchmark',
  
  // Team Management
  USER_TEAMS: 'c_userTeams',
  
  // System shard types
  SYSTEM_METRIC: 'system.metric',
  SYSTEM_AUDIT_LOG: 'system.audit_log',
} as const;

export type CoreShardTypeName = typeof CORE_SHARD_TYPE_NAMES[keyof typeof CORE_SHARD_TYPE_NAMES];

/**
 * Core ShardType definition
 */
export interface CoreShardTypeDefinition {
  name: CoreShardTypeName;
  displayName: string;
  description: string;
  category: ShardTypeCategory;
  schema: RichSchema;
  icon?: string;
  color?: string;
  tags: string[];
}

// ============================================
// c_task - Task/Action Item
// ============================================
const taskFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Task Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'done', label: 'Done' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'todo',
    },
    design: { columns: 4 },
  },
  {
    name: 'priority',
    label: 'Priority',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      default: 'medium',
    },
    design: { columns: 4 },
  },
  {
    name: 'dueDate',
    label: 'Due Date',
    type: RichFieldType.DATE,
    design: { columns: 4 },
  },
  {
    name: 'assigneeUserId',
    label: 'Assignee',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'completedDate',
    label: 'Completed Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'estimatedHours',
    label: 'Estimated Hours',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 1000, decimalPlaces: 1 },
    design: { columns: 4 },
  },
  {
    name: 'actualHours',
    label: 'Actual Hours',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 1000, decimalPlaces: 1 },
    design: { columns: 4 },
  },
  {
    name: 'blockedReason',
    label: 'Blocked Reason',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2 },
    design: { columns: 12, conditionalVisibility: { field: 'status', value: 'blocked' } },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
];

export const TASK_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.TASK,
  displayName: 'Task',
  description: 'Task or action item with assignment and tracking',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: taskFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Task Details', fields: ['name', 'description', 'status', 'priority', 'dueDate'] },
        { id: 'assignment', label: 'Assignment', fields: ['assigneeUserId', 'completedDate'] },
        { id: 'tracking', label: 'Time Tracking', fields: ['estimatedHours', 'actualHours'] },
        { id: 'meta', label: 'Additional', fields: ['blockedReason', 'tags'] },
      ],
    },
  },
  icon: 'check-square',
  color: '#10b981',
  tags: ['task', 'action', 'assignment'],
};

// ============================================
// c_event - Calendar Event/Meeting
// ============================================
const eventFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Event Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'eventType',
    label: 'Event Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'meeting', label: 'Meeting' },
        { value: 'call', label: 'Call' },
        { value: 'webinar', label: 'Webinar' },
        { value: 'conference', label: 'Conference' },
        { value: 'other', label: 'Other' },
      ],
      default: 'meeting',
    },
    design: { columns: 4 },
  },
  {
    name: 'isAllDay',
    label: 'All Day Event',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'isCancelled',
    label: 'Cancelled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'startDateTime',
    label: 'Start',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 4 },
  },
  {
    name: 'endDateTime',
    label: 'End',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 4 },
  },
  {
    name: 'timezone',
    label: 'Timezone',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
      ],
      default: 'UTC',
    },
    design: { columns: 4 },
  },
  {
    name: 'location',
    label: 'Location',
    type: RichFieldType.TEXT,
    config: { maxLength: 300 },
    design: { columns: 6 },
  },
  {
    name: 'virtualMeetingUrl',
    label: 'Meeting URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'attendees',
    label: 'Attendees',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'reminderMinutes',
    label: 'Reminder (minutes before)',
    type: RichFieldType.INTEGER,
    config: { min: 0, max: 10080 }, // Up to 1 week
    design: { columns: 6 },
  },

  // ============================================
  // Calendar Integration Fields
  // ============================================
  {
    name: 'calendarId',
    label: 'Calendar',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_calendar',
    },
    design: { columns: 6 },
  },
  {
    name: 'calendarName',
    label: 'Calendar Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from calendarId
    design: { columns: 6 },
  },
  {
    name: 'organizerId',
    label: 'Organizer',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'organizerName',
    label: 'Organizer Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from organizerId
    design: { columns: 6 },
  },
  {
    name: 'organizerEmail',
    label: 'Organizer Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'responseStatus',
    label: 'Response Status',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'accepted', label: 'Accepted' },
        { value: 'declined', label: 'Declined' },
        { value: 'tentative', label: 'Tentative' },
        { value: 'needs_action', label: 'Needs Action' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'attendeeCount',
    label: 'Attendee Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Recurrence Fields
  // ============================================
  {
    name: 'recurrenceRule',
    label: 'Recurrence Rule',
    type: RichFieldType.TEXT,
    config: { maxLength: 500 },
    design: { columns: 6 },
  },
  {
    name: 'isRecurring',
    label: 'Is Recurring',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'recurrenceEndDate',
    label: 'Recurrence End Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Conference Data
  // ============================================
  {
    name: 'conferenceData',
    label: 'Conference Data',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['zoom', 'teams', 'google_meet', 'webex', 'other'] },
          meetingId: { type: 'string' },
          joinUrl: { type: 'string', format: 'uri' },
          dialInNumber: { type: 'string' },
          passcode: { type: 'string' },
        },
      },
    },
    design: { columns: 12 },
  },
];

export const EVENT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.EVENT,
  displayName: 'Event',
  description: 'Calendar event or meeting with attendee tracking',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: eventFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Event Details', fields: ['name', 'description', 'eventType', 'isAllDay', 'isCancelled'] },
        { id: 'timing', label: 'Date & Time', fields: ['startDateTime', 'endDateTime', 'timezone'] },
        { id: 'location', label: 'Location', fields: ['location', 'virtualMeetingUrl'] },
        { id: 'participants', label: 'Participants', fields: ['attendees', 'attendeeCount', 'reminderMinutes'] },
        { id: 'calendar', label: 'Calendar Integration', fields: ['calendarId', 'calendarName', 'organizerId', 'organizerName', 'organizerEmail', 'responseStatus'] },
        { id: 'recurrence', label: 'Recurrence', fields: ['recurrenceRule', 'isRecurring', 'recurrenceEndDate'] },
        { id: 'conference', label: 'Conference', fields: ['conferenceData'] },
      ],
    },
  },
  icon: 'calendar',
  color: '#3b82f6',
  tags: ['event', 'meeting', 'calendar'],
};

/**
 * Embedding Template for c_event
 * Used for vector search and AI insights on calendar events
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const EVENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Event Embedding Template',
  description: 'Embedding template for calendar events. Enables search and analysis of event data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'location', weight: 0.6, include: true },
    { name: 'eventType', weight: 0.5, include: true },
    { name: 'organizerName', weight: 0.5, include: true },
    { name: 'attendees', weight: 0.4, include: true },
    { name: 'virtualMeetingUrl', weight: 0.4, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Events use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_calendar',
    weight: 0.3,
    fields: ['name', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_email - Email Message
// ============================================
const emailFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Subject',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'fromName',
    label: 'From Name',
    type: RichFieldType.TEXT,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'fromEmail',
    label: 'From Email',
    type: RichFieldType.EMAIL,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'toRecipients',
    label: 'To',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'ccRecipients',
    label: 'CC',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'bccRecipients',
    label: 'BCC',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'sentAt',
    label: 'Sent At',
    type: RichFieldType.DATETIME,
    design: { columns: 4 },
  },
  {
    name: 'receivedAt',
    label: 'Received At',
    type: RichFieldType.DATETIME,
    design: { columns: 4 },
  },
  {
    name: 'threadId',
    label: 'Thread ID',
    type: RichFieldType.TEXT,
    design: { columns: 4 },
  },
  {
    name: 'body',
    label: 'Email Body',
    type: RichFieldType.RICHTEXT,
    design: { columns: 12 },
  },
  {
    name: 'hasAttachments',
    label: 'Has Attachments',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'checkbox' },
    design: { columns: 3 },
  },
  {
    name: 'isRead',
    label: 'Read',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'checkbox' },
    design: { columns: 3 },
  },
  {
    name: 'isStarred',
    label: 'Starred',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'checkbox' },
    design: { columns: 3 },
  },
  {
    name: 'labels',
    label: 'Labels',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 3 },
  },

  // ============================================
  // Email Threading Fields
  // ============================================
  {
    name: 'messageId',
    label: 'Message ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 500, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'inReplyTo',
    label: 'In Reply To',
    type: RichFieldType.TEXT,
    config: { maxLength: 500 },
    design: { columns: 6 },
  },
  {
    name: 'references',
    label: 'References',
    type: RichFieldType.TEXT,
    config: { maxLength: 2000 },
    design: { columns: 12 },
  },
  {
    name: 'threadPosition',
    label: 'Thread Position',
    type: RichFieldType.INTEGER,
    config: { min: 0, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isThreadStarter',
    label: 'Thread Starter',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'threadMessageCount',
    label: 'Thread Message Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'folder',
    label: 'Folder',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'importance',
    label: 'Importance',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
      ],
      default: 'normal',
    },
    design: { columns: 6 },
  },
  {
    name: 'sensitivity',
    label: 'Sensitivity',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'personal', label: 'Personal' },
        { value: 'private', label: 'Private' },
        { value: 'confidential', label: 'Confidential' },
      ],
      default: 'normal',
    },
    design: { columns: 6 },
  },
];

export const EMAIL_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.EMAIL,
  displayName: 'Email',
  description: 'Email message with threading support (Gmail, Outlook, Email Threading)',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: emailFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'subject', label: 'Subject', fields: ['name'] },
        { id: 'from', label: 'From', fields: ['fromName', 'fromEmail'] },
        { id: 'recipients', label: 'Recipients', fields: ['toRecipients', 'ccRecipients', 'bccRecipients'] },
        { id: 'timing', label: 'Timestamps', fields: ['sentAt', 'receivedAt', 'threadId'] },
        { id: 'content', label: 'Content', fields: ['body'] },
        { id: 'meta', label: 'Metadata', fields: ['hasAttachments', 'isRead', 'isStarred', 'labels', 'folder', 'importance', 'sensitivity'] },
        { id: 'threading', label: 'Threading', fields: ['messageId', 'inReplyTo', 'references', 'threadPosition', 'isThreadStarter', 'threadMessageCount'] },
      ],
    },
  },
  icon: 'mail',
  color: '#8b5cf6',
  tags: ['email', 'communication', 'message'],
};

/**
 * Embedding Template for c_email
 * Used for vector search and AI insights on email messages
 * CRITICAL: Uses chunking for long email bodies
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const EMAIL_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Email Embedding Template',
  description: 'Embedding template for emails. Enables search and analysis of email content with chunking for long messages.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true }, // Subject
    { name: 'body', weight: 1.0, include: true, preprocess: { maxLength: 5000, stripFormatting: true } }, // Email body (chunked)
    { name: 'fromName', weight: 0.7, include: true },
    { name: 'fromEmail', weight: 0.6, include: true },
    { name: 'toRecipients', weight: 0.5, include: true },
    { name: 'ccRecipients', weight: 0.4, include: true },
    { name: 'labels', weight: 0.5, include: true },
    { name: 'importance', weight: 0.4, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Emails use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_activity - System Activity Log
// ============================================
const activityFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Activity Description',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 300 },
    design: { columns: 12 },
  },
  {
    name: 'activityType',
    label: 'Activity Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'shard_created', label: 'Shard Created' },
        { value: 'shard_updated', label: 'Shard Updated' },
        { value: 'shard_deleted', label: 'Shard Deleted' },
        { value: 'relationship_added', label: 'Relationship Added' },
        { value: 'relationship_removed', label: 'Relationship Removed' },
        { value: 'email_sent', label: 'Email Sent' },
        { value: 'email_received', label: 'Email Received' },
        { value: 'call_logged', label: 'Call Logged' },
        { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
        { value: 'task_completed', label: 'Task Completed' },
        { value: 'note_added', label: 'Note Added' },
        { value: 'stage_changed', label: 'Stage Changed' },
        { value: 'status_changed', label: 'Status Changed' },
        { value: 'assignment_changed', label: 'Assignment Changed' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'performedBy',
    label: 'Performed By',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'performedAt',
    label: 'Performed At',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'relatedShardId',
    label: 'Related Shard',
    type: RichFieldType.SHARD,
    design: { columns: 6 },
  },
  {
    name: 'relatedShardType',
    label: 'Related Shard Type',
    type: RichFieldType.TEXT,
    design: { columns: 6 },
  },
  {
    name: 'changes',
    label: 'Changes (JSON)',
    type: RichFieldType.TEXTAREA,
    config: { rows: 5 },
    design: { columns: 12 },
  },
  {
    name: 'isSystemGenerated',
    label: 'System Generated',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'checkbox', default: true },
    design: { columns: 6 },
  },
];

export const ACTIVITY_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ACTIVITY,
  displayName: 'Activity',
  description: 'System-generated activity log entry',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: activityFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Activity', fields: ['name', 'activityType', 'performedBy', 'performedAt'] },
        { id: 'related', label: 'Related Entity', fields: ['relatedShardId', 'relatedShardType'] },
        { id: 'changes', label: 'Changes', fields: ['changes', 'isSystemGenerated'] },
      ],
    },
  },
  icon: 'activity',
  color: '#6b7280',
  tags: ['activity', 'log', 'audit', 'system'],
};

// ============================================
// c_product - Product/Service Catalog
// ============================================
const productFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Product Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 8 },
  },
  {
    name: 'sku',
    label: 'SKU',
    type: RichFieldType.TEXT,
    config: { maxLength: 50 },
    design: { columns: 4 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.RICHTEXT,
    design: { columns: 12 },
  },
  {
    name: 'category',
    label: 'Category',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'service', label: 'Service' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'subcategory',
    label: 'Subcategory',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'unitPrice',
    label: 'Unit Price',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 4 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
        { value: 'CAD', label: 'CAD' },
        { value: 'AUD', label: 'AUD' },
      ],
      default: 'USD',
    },
    design: { columns: 4 },
  },
  {
    name: 'pricingModel',
    label: 'Pricing Model',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'one_time', label: 'One-Time' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'usage_based', label: 'Usage-Based' },
        { value: 'tiered', label: 'Tiered' },
      ],
      default: 'one_time',
    },
    design: { columns: 4 },
  },
  {
    name: 'billingFrequency',
    label: 'Billing Frequency',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'annual', label: 'Annual' },
      ],
    },
    design: { columns: 6, conditionalVisibility: { field: 'pricingModel', value: 'subscription' } },
  },
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'features',
    label: 'Features',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'imageUrl',
    label: 'Image URL',
    type: RichFieldType.URL,
    design: { columns: 12 },
  },

  // ============================================
  // Product Identification
  // ============================================
  {
    name: 'productCode',
    label: 'Product Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'family',
    label: 'Product Family',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'service', label: 'Service' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'support', label: 'Support' },
        { value: 'training', label: 'Training' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },

  // ============================================
  // Inventory Fields
  // ============================================
  {
    name: 'quantityOnHand',
    label: 'Quantity On Hand',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'reorderLevel',
    label: 'Reorder Level',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'reorderQuantity',
    label: 'Reorder Quantity',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Vendor & Physical Properties
  // ============================================
  {
    name: 'vendorId',
    label: 'Vendor',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'vendorName',
    label: 'Vendor Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from vendorId
    design: { columns: 6 },
  },
  {
    name: 'weight',
    label: 'Weight',
    type: RichFieldType.FLOAT,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'dimensions',
    label: 'Dimensions',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'object',
        properties: {
          length: { type: 'number', minimum: 0 },
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['cm', 'in', 'm', 'ft'] },
        },
      },
    },
    design: { columns: 6 },
  },

  // ============================================
  // Variants & Bundles
  // ============================================
  {
    name: 'parentProductId',
    label: 'Parent Product',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_product',
    },
    design: { columns: 6 },
  },
  {
    name: 'parentProductName',
    label: 'Parent Product Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from parentProductId
    design: { columns: 6 },
  },
  {
    name: 'hasVariants',
    label: 'Has Variants',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'isBundle',
    label: 'Is Bundle',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 6 },
  },
  {
    name: 'bundleItems',
    label: 'Bundle Items',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            productName: { type: 'string' },
            quantity: { type: 'number', minimum: 1 },
            unitPrice: { type: 'number', minimum: 0 },
          },
          required: ['productId', 'quantity'],
        },
      },
    },
    design: { columns: 12 },
  },
];

export const PRODUCT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.PRODUCT,
  displayName: 'Product',
  description: 'Product or service catalog item',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: productFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'identity', label: 'Product Info', fields: ['name', 'sku', 'productCode', 'description'] },
        { id: 'categorization', label: 'Categorization', fields: ['category', 'subcategory', 'family'] },
        { id: 'pricing', label: 'Pricing', fields: ['unitPrice', 'currency', 'pricingModel', 'billingFrequency', 'isActive'] },
        { id: 'inventory', label: 'Inventory', fields: ['quantityOnHand', 'reorderLevel', 'reorderQuantity'] },
        { id: 'vendor', label: 'Vendor & Physical', fields: ['vendorId', 'vendorName', 'weight', 'dimensions'] },
        { id: 'variants', label: 'Variants & Bundles', fields: ['parentProductId', 'parentProductName', 'hasVariants', 'isBundle', 'bundleItems'] },
        { id: 'details', label: 'Details', fields: ['features', 'imageUrl'] },
      ],
    },
  },
  icon: 'package',
  color: '#f59e0b',
  tags: ['product', 'catalog', 'service'],
};

/**
 * Embedding Template for c_product
 * Used for vector search and AI insights on products
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const PRODUCT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Product Embedding Template',
  description: 'Embedding template for products. Enables search and analysis of product catalog data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'sku', weight: 0.7, include: true },
    { name: 'category', weight: 0.8, include: true },
    { name: 'subcategory', weight: 0.6, include: true },
    { name: 'family', weight: 0.5, include: true },
    { name: 'features', weight: 0.7, include: true },
    { name: 'vendorName', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Products use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_news - News Article
// ============================================
const newsFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Article Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'summary',
    label: 'Summary',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'url',
    label: 'Article URL',
    type: RichFieldType.URL,
    required: true,
    design: { columns: 12 },
  },
  {
    name: 'source',
    label: 'Source',
    type: RichFieldType.TEXT,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'sourceUrl',
    label: 'Source URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'publishedAt',
    label: 'Published At',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 4 },
  },
  {
    name: 'author',
    label: 'Author',
    type: RichFieldType.TEXT,
    design: { columns: 4 },
  },
  {
    name: 'imageUrl',
    label: 'Image URL',
    type: RichFieldType.URL,
    design: { columns: 4 },
  },
  {
    name: 'industry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'banking', label: 'Banking & Finance' },
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'energy', label: 'Energy' },
        { value: 'automation', label: 'Automation' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'topics',
    label: 'Topics',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 4 },
  },
  {
    name: 'sentiment',
    label: 'Sentiment',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'positive', label: 'Positive' },
        { value: 'negative', label: 'Negative' },
        { value: 'neutral', label: 'Neutral' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'aiSummary',
    label: 'AI Summary',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4 },
    design: { columns: 12 },
  },
  {
    name: 'keyEntities',
    label: 'Key Entities',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'relevanceScore',
    label: 'Relevance Score',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 100, decimalPlaces: 1 },
    design: { columns: 6 },
  },
];

export const NEWS_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.NEWS,
  displayName: 'News Article',
  description: 'News article from external sources with AI enrichment',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: newsFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Article', fields: ['name', 'summary', 'url'] },
        { id: 'source', label: 'Source', fields: ['source', 'sourceUrl', 'publishedAt', 'author', 'imageUrl'] },
        { id: 'categorization', label: 'Categorization', fields: ['industry', 'topics', 'sentiment'] },
        { id: 'ai', label: 'AI Enrichment', fields: ['aiSummary', 'keyEntities', 'relevanceScore'] },
      ],
    },
  },
  icon: 'newspaper',
  color: '#ef4444',
  tags: ['news', 'article', 'external', 'integration'],
};

// ============================================
// c_aimodel - AI Model Definition
// ============================================
const aiModelFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Model Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'modelId',
    label: 'Model ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'modelType',
    label: 'Model Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'llm', label: 'LLM (Large Language Model)' },
        { value: 'image_generation', label: 'Image Generation' },
        { value: 'text_to_speech', label: 'Text to Speech' },
        { value: 'speech_to_text', label: 'Speech to Text' },
        { value: 'embedding', label: 'Embedding' },
        { value: 'moderation', label: 'Moderation' },
        { value: 'vision', label: 'Vision (Image Analysis)' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'provider',
    label: 'Provider',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'azure_openai', label: 'Azure OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google' },
        { value: 'cohere', label: 'Cohere' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'meta', label: 'Meta' },
        { value: 'custom', label: 'Custom' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'hoster',
    label: 'Hoster',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'azure', label: 'Microsoft Azure' },
        { value: 'aws', label: 'AWS Bedrock' },
        { value: 'gcp', label: 'Google Cloud' },
        { value: 'self_hosted', label: 'Self-Hosted' },
        { value: 'castiel', label: 'Castiel Infrastructure' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'version',
    label: 'Version',
    type: RichFieldType.TEXT,
    config: { maxLength: 50 },
    design: { columns: 4 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'isSystemWide',
    label: 'Available System-Wide',
    type: RichFieldType.BOOLEAN,
    required: true,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'isDefault',
    label: 'Default Model',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'allowTenantCustom',
    label: 'Allow Tenant BYOK',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'contextWindow',
    label: 'Context Window (tokens)',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 4 },
  },
  {
    name: 'maxOutputTokens',
    label: 'Max Output Tokens',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 4 },
  },
  {
    name: 'inputPricePerMillion',
    label: 'Input Price ($/M tokens)',
    type: RichFieldType.FLOAT,
    config: { min: 0, decimalPlaces: 4 },
    design: { columns: 4 },
  },
  {
    name: 'outputPricePerMillion',
    label: 'Output Price ($/M tokens)',
    type: RichFieldType.FLOAT,
    config: { min: 0, decimalPlaces: 4 },
    design: { columns: 4 },
  },
  {
    name: 'supportsStreaming',
    label: 'Streaming',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3 },
  },
  {
    name: 'supportsVision',
    label: 'Vision',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3 },
  },
  {
    name: 'supportsFunctionCalling',
    label: 'Function Calling',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3 },
  },
  {
    name: 'supportsJSON',
    label: 'JSON Mode',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3 },
  },
  {
    name: 'endpoint',
    label: 'Custom Endpoint',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'deploymentName',
    label: 'Deployment Name (Azure)',
    type: RichFieldType.TEXT,
    design: { columns: 6 },
  },
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4 },
  },
  {
    name: 'isDeprecated',
    label: 'Deprecated',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4 },
  },
  {
    name: 'deprecationDate',
    label: 'Deprecation Date',
    type: RichFieldType.DATE,
    design: { columns: 4 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
];

export const AI_MODEL_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.AI_MODEL,
  displayName: 'AI Model',
  description: 'AI model definition for LLM, image generation, TTS, and other AI capabilities',
  category: ShardTypeCategory.CONFIGURATION,
  schema: {
    format: 'rich',
    fields: aiModelFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'identity', label: 'Model Identity', fields: ['name', 'modelId', 'modelType', 'provider', 'hoster', 'version'] },
        { id: 'description', label: 'Description', fields: ['description'] },
        { id: 'availability', label: 'Availability', fields: ['isSystemWide', 'isDefault', 'allowTenantCustom'] },
        { id: 'limits', label: 'Limits & Pricing', fields: ['contextWindow', 'maxOutputTokens', 'inputPricePerMillion', 'outputPricePerMillion'] },
        { id: 'capabilities', label: 'Capabilities', fields: ['supportsStreaming', 'supportsVision', 'supportsFunctionCalling', 'supportsJSON'] },
        { id: 'deployment', label: 'Deployment', fields: ['endpoint', 'deploymentName'] },
        { id: 'status', label: 'Status', fields: ['isActive', 'isDeprecated', 'deprecationDate', 'tags'] },
      ],
    },
    // No embedding for AI model definitions
    embedding: {
      enabled: false,
    },
  },
  icon: 'cpu',
  color: '#8b5cf6',
  tags: ['ai', 'model', 'configuration', 'system'],
};

// ============================================
// c_conversation - AI Conversation
// ============================================
const conversationFields: RichFieldDefinition[] = [
  {
    name: 'title',
    label: 'Title',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 8 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
        { value: 'deleted', label: 'Deleted' },
      ],
      default: 'active',
    },
    design: { columns: 4 },
  },
  {
    name: 'visibility',
    label: 'Visibility',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'private', label: 'Private (Owner Only)' },
        { value: 'shared', label: 'Shared (Team)' },
        { value: 'public', label: 'Public (Tenant)' },
      ],
      default: 'private',
    },
    design: { columns: 4 },
  },
  {
    name: 'assistantId',
    label: 'AI Assistant',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_assistant' },
    design: { columns: 4 },
  },
  {
    name: 'templateId',
    label: 'Context Template',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_contextTemplate' },
    design: { columns: 4 },
  },
  {
    name: 'defaultModelId',
    label: 'Default Model',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_aimodel' },
    design: { columns: 4 },
  },
  {
    name: 'summary',
    label: 'AI Summary',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  // Note: participants and messages are complex arrays stored directly in structuredData
  // They are not defined as RichFieldDefinition but are validated via JSON Schema
  {
    name: 'participantCount',
    label: 'Participants',
    type: RichFieldType.INTEGER,
    config: { min: 1 },
    design: { columns: 3 },
  },
  {
    name: 'messageCount',
    label: 'Messages',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 3 },
  },
  {
    name: 'totalTokens',
    label: 'Total Tokens',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 3 },
  },
  {
    name: 'totalCost',
    label: 'Total Cost ($)',
    type: RichFieldType.FLOAT,
    config: { min: 0, decimalPlaces: 4 },
    design: { columns: 3 },
  },
  {
    name: 'lastActivityAt',
    label: 'Last Activity',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
];

export const CONVERSATION_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CONVERSATION,
  displayName: 'AI Conversation',
  description: 'AI conversation with messages, participants, context sources, and feedback',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: conversationFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Conversation', fields: ['title', 'status', 'visibility'] },
        { id: 'ai', label: 'AI Configuration', fields: ['assistantId', 'templateId', 'defaultModelId'] },
        { id: 'summary', label: 'Summary', fields: ['summary'] },
        { id: 'stats', label: 'Statistics', fields: ['participantCount', 'messageCount', 'totalTokens', 'totalCost', 'lastActivityAt', 'tags'] },
      ],
    },
    // Embedding on summary only
    embedding: {
      enabled: true,
      fields: ['title', 'summary'],
    },
  },
  icon: 'message-square',
  color: '#6366f1',
  tags: ['conversation', 'ai', 'chat', 'messages'],
};

// ============================================
// c_conversationMessage - Archived Conversation Messages
// ============================================
const conversationMessageFields: RichFieldDefinition[] = [
  {
    name: 'conversationId',
    label: 'Conversation ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'messageCount',
    label: 'Message Count',
    type: RichFieldType.INTEGER,
    required: true,
    config: { min: 1 },
    design: { columns: 4 },
  },
  {
    name: 'archivedAt',
    label: 'Archived At',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 4 },
  },
  {
    name: 'archivedBy',
    label: 'Archived By',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 4 },
  },
  {
    name: 'firstMessageId',
    label: 'First Message ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'lastMessageId',
    label: 'Last Message ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  // Note: messages array is stored directly in structuredData
  // It is not defined as RichFieldDefinition but is validated via JSON Schema
];

export const CONVERSATION_MESSAGE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CONVERSATION_MESSAGE,
  displayName: 'Archived Conversation Messages',
  description: 'Archived messages from conversations (for large conversation management)',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: conversationMessageFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Archive Info', fields: ['conversationId', 'messageCount', 'archivedAt', 'archivedBy'] },
        { id: 'range', label: 'Message Range', fields: ['firstMessageId', 'lastMessageId'] },
      ],
    },
    // No embedding for archived messages (they're just storage)
    embedding: {
      enabled: false,
    },
  },
  icon: 'archive',
  color: '#94a3b8',
  tags: ['conversation', 'archive', 'messages', 'system'],
};

// ============================================
// c_conversationTemplate - Conversation Starter Templates
// ============================================
const conversationTemplateFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Template Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 100 },
    design: { columns: 8 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'category',
    label: 'Category',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'general', label: 'General' },
        { value: 'project', label: 'Project-Specific' },
        { value: 'sales', label: 'Sales' },
        { value: 'support', label: 'Support' },
        { value: 'analysis', label: 'Analysis' },
        { value: 'custom', label: 'Custom' },
      ],
      default: 'general',
    },
    design: { columns: 4 },
  },
  {
    name: 'isPublic',
    label: 'Public Template',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 4 },
  },
  {
    name: 'isSystem',
    label: 'System Template',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 4 },
  },
  {
    name: 'initialMessage',
    label: 'Initial Message',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { rows: 4, maxLength: 2000 },
    design: { columns: 12 },
  },
  {
    name: 'titleSuggestion',
    label: 'Title Suggestion',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'assistantId',
    label: 'Default Assistant',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_assistant' },
    design: { columns: 6 },
  },
  {
    name: 'defaultModelId',
    label: 'Default Model',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_aimodel' },
    design: { columns: 6 },
  },
  {
    name: 'contextTemplateId',
    label: 'Context Template',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_contextTemplate' },
    design: { columns: 6 },
  },
  {
    name: 'defaultTags',
    label: 'Default Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'projectScope',
    label: 'Project Scope',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'none', label: 'No Project Scope' },
        { value: 'optional', label: 'Optional Project' },
        { value: 'required', label: 'Required Project' },
      ],
      default: 'none',
    },
    design: { columns: 4 },
  },
  {
    name: 'variables',
    label: 'Template Variables',
    type: RichFieldType.JSON,
    config: { 
      description: 'Variables that can be filled in when using the template (e.g., {{projectName}}, {{userName}})' 
    },
    design: { columns: 12 },
  },
];

export const CONVERSATION_TEMPLATE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CONVERSATION_TEMPLATE,
  displayName: 'Conversation Template',
  description: 'Pre-defined conversation starters with initial messages, settings, and project-specific templates',
  category: ShardTypeCategory.CONFIGURATION,
  schema: {
    format: 'rich',
    fields: conversationTemplateFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Template Info', fields: ['name', 'description', 'category', 'isPublic', 'isSystem'] },
        { id: 'content', label: 'Template Content', fields: ['initialMessage', 'titleSuggestion'] },
        { id: 'ai', label: 'AI Configuration', fields: ['assistantId', 'defaultModelId', 'contextTemplateId'] },
        { id: 'scope', label: 'Scope & Tags', fields: ['projectScope', 'defaultTags'] },
        { id: 'variables', label: 'Variables', fields: ['variables'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'initialMessage'],
    },
  },
  icon: 'message-square-plus',
  color: '#8b5cf6', // Purple
  tags: ['conversation', 'template', 'starter', 'ai'],
};

// ============================================
// c_aiconfig - AI Configuration
// ============================================
const aiConfigFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Configuration Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 100 },
    design: { columns: 8 },
  },
  {
    name: 'scope',
    label: 'Scope',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'system', label: 'System (Global Default)' },
        { value: 'tenant', label: 'Tenant Override' },
        { value: 'assistant', label: 'Assistant Specific' },
      ],
      default: 'tenant',
    },
    design: { columns: 4 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2 },
    design: { columns: 12 },
  },
  // Persona Configuration
  {
    name: 'personaName',
    label: 'Persona Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6, group: 'persona' },
  },
  {
    name: 'personaRole',
    label: 'Persona Role',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6, group: 'persona' },
  },
  {
    name: 'personaTraits',
    label: 'Personality Traits',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'analytical', label: 'Analytical' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'professional', label: 'Professional' },
        { value: 'creative', label: 'Creative' },
        { value: 'supportive', label: 'Supportive' },
        { value: 'direct', label: 'Direct' },
        { value: 'cautious', label: 'Cautious' },
        { value: 'enthusiastic', label: 'Enthusiastic' },
      ],
      allowCustom: true,
    },
    design: { columns: 6, group: 'persona' },
  },
  {
    name: 'personaExpertise',
    label: 'Areas of Expertise',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 6, group: 'persona' },
  },
  {
    name: 'personaTone',
    label: 'Tone',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'formal', label: 'Formal' },
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'casual', label: 'Casual' },
      ],
      default: 'professional',
    },
    design: { columns: 4, group: 'persona' },
  },
  {
    name: 'personaVerbosity',
    label: 'Verbosity',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'concise', label: 'Concise' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'detailed', label: 'Detailed' },
      ],
      default: 'balanced',
    },
    design: { columns: 4, group: 'persona' },
  },
  {
    name: 'personaCreativity',
    label: 'Creativity (0-1)',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 1, decimalPlaces: 2 },
    design: { columns: 4, group: 'persona' },
  },
  // Style Configuration
  {
    name: 'styleDefaultFormat',
    label: 'Default Response Format',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'paragraph', label: 'Paragraphs' },
        { value: 'bullets', label: 'Bullet Points' },
        { value: 'structured', label: 'Structured' },
        { value: 'conversational', label: 'Conversational' },
      ],
      default: 'structured',
    },
    design: { columns: 4, group: 'style' },
  },
  {
    name: 'stylePreferredLength',
    label: 'Preferred Length',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'brief', label: 'Brief' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'detailed', label: 'Detailed' },
      ],
      default: 'moderate',
    },
    design: { columns: 4, group: 'style' },
  },
  {
    name: 'styleCitationStyle',
    label: 'Citation Style',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'inline', label: 'Inline [1]' },
        { value: 'footnote', label: 'Footnotes' },
        { value: 'endnote', label: 'End Notes' },
        { value: 'none', label: 'None' },
      ],
      default: 'inline',
    },
    design: { columns: 4, group: 'style' },
  },
  {
    name: 'styleUseMarkdown',
    label: 'Use Markdown',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 3, group: 'style' },
  },
  {
    name: 'styleUseEmoji',
    label: 'Use Emoji',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3, group: 'style' },
  },
  {
    name: 'styleShowConfidence',
    label: 'Show Confidence',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 3, group: 'style' },
  },
  {
    name: 'styleIncludeSummary',
    label: 'Include Summary',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 3, group: 'style' },
  },
  // Tool Configuration
  {
    name: 'toolsEnabled',
    label: 'Enabled Tools',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'web_search', label: 'Web Search' },
        { value: 'calculator', label: 'Calculator' },
        { value: 'code_interpreter', label: 'Code Interpreter' },
        { value: 'image_generation', label: 'Image Generation' },
        { value: 'document_search', label: 'Document Search' },
        { value: 'calendar', label: 'Calendar' },
        { value: 'email_draft', label: 'Email Draft' },
        { value: 'data_visualization', label: 'Data Visualization' },
      ],
    },
    design: { columns: 12, group: 'tools' },
  },
  {
    name: 'toolsMaxCalls',
    label: 'Max Tool Calls',
    type: RichFieldType.INTEGER,
    config: { min: 1, max: 20, default: 5 },
    design: { columns: 4, group: 'tools' },
  },
  {
    name: 'toolsTimeout',
    label: 'Tool Timeout (seconds)',
    type: RichFieldType.INTEGER,
    config: { min: 5, max: 120, default: 30 },
    design: { columns: 4, group: 'tools' },
  },
  {
    name: 'toolsParallelExecution',
    label: 'Parallel Execution',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'tools' },
  },
  // Web Search Configuration
  {
    name: 'webSearchEnabled',
    label: 'Web Search Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4, group: 'webSearch' },
  },
  {
    name: 'webSearchAutoSearch',
    label: 'Auto Search',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4, group: 'webSearch' },
  },
  {
    name: 'webSearchMaxResults',
    label: 'Max Results',
    type: RichFieldType.INTEGER,
    config: { min: 1, max: 20, default: 5 },
    design: { columns: 4, group: 'webSearch' },
  },
  {
    name: 'webSearchTriggers',
    label: 'Search Triggers',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'latest', label: 'Latest' },
        { value: 'news', label: 'News' },
        { value: 'current', label: 'Current' },
        { value: 'today', label: 'Today' },
        { value: 'recent', label: 'Recent' },
      ],
      allowCustom: true,
    },
    design: { columns: 6, group: 'webSearch' },
  },
  {
    name: 'webSearchMaxAge',
    label: 'Max Age',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: '1d', label: '1 Day' },
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '30 Days' },
        { value: '90d', label: '90 Days' },
        { value: '1y', label: '1 Year' },
      ],
      default: '30d',
    },
    design: { columns: 6, group: 'webSearch' },
  },
  // Domain Knowledge Configuration
  {
    name: 'domainIndustry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance & Banking' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'legal', label: 'Legal' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6, group: 'domain' },
  },
  {
    name: 'domainFrameworks',
    label: 'Frameworks',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'MEDDIC', label: 'MEDDIC' },
        { value: 'BANT', label: 'BANT' },
        { value: 'SPIN', label: 'SPIN Selling' },
        { value: 'Challenger', label: 'Challenger Sale' },
        { value: 'SWOT', label: 'SWOT Analysis' },
        { value: 'OKR', label: 'OKRs' },
      ],
      allowCustom: true,
    },
    design: { columns: 6, group: 'domain' },
  },
  {
    name: 'domainGuidelines',
    label: 'Custom Guidelines',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4 },
    design: { columns: 12, group: 'domain' },
  },
  // Safety Configuration
  {
    name: 'safetyContentFiltering',
    label: 'Content Filtering',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'strict', label: 'Strict' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'minimal', label: 'Minimal' },
      ],
      default: 'balanced',
    },
    design: { columns: 4, group: 'safety' },
  },
  {
    name: 'safetyDisclosureLevel',
    label: 'AI Disclosure',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'full', label: 'Full (Always identify as AI)' },
        { value: 'minimal', label: 'Minimal' },
        { value: 'none', label: 'None' },
      ],
      default: 'full',
    },
    design: { columns: 4, group: 'safety' },
  },
  {
    name: 'safetyPiiHandling',
    label: 'PII Handling',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'mask', label: 'Mask' },
        { value: 'redact', label: 'Redact' },
        { value: 'allow', label: 'Allow' },
      ],
      default: 'mask',
    },
    design: { columns: 4, group: 'safety' },
  },
  {
    name: 'safetyAdmitUncertainty',
    label: 'Admit Uncertainty',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'safety' },
  },
  {
    name: 'safetyRetainConversations',
    label: 'Retain Conversations',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'safety' },
  },
  {
    name: 'safetyBlockedTopics',
    label: 'Blocked Topics',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 4, group: 'safety' },
  },
  // Localization Configuration
  {
    name: 'localeDefaultLanguage',
    label: 'Default Language',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'ja', label: 'Japanese' },
        { value: 'zh', label: 'Chinese' },
      ],
      default: 'en',
    },
    design: { columns: 4, group: 'locale' },
  },
  {
    name: 'localeAutoDetect',
    label: 'Auto-Detect Language',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'locale' },
  },
  {
    name: 'localeDateFormat',
    label: 'Date Format',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
      ],
      default: 'YYYY-MM-DD',
    },
    design: { columns: 4, group: 'locale' },
  },
  // Customization Control
  {
    name: 'allowPersonaOverride',
    label: 'Allow Persona Override',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'customization' },
  },
  {
    name: 'allowStyleOverride',
    label: 'Allow Style Override',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'customization' },
  },
  {
    name: 'allowToolOverride',
    label: 'Allow Tool Override',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'customization' },
  },
  {
    name: 'allowSafetyOverride',
    label: 'Allow Safety Override',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4, group: 'customization' },
  },
  {
    name: 'allowDomainOverride',
    label: 'Allow Domain Override',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'customization' },
  },
  // Status
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 4, group: 'status' },
  },
  {
    name: 'isDefault',
    label: 'Default Configuration',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 4, group: 'status' },
  },
  {
    name: 'version',
    label: 'Version',
    type: RichFieldType.INTEGER,
    config: { min: 1, default: 1 },
    design: { columns: 4, group: 'status' },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12, group: 'status' },
  },
];

export const AI_CONFIG_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.AI_CONFIG,
  displayName: 'AI Configuration',
  description: 'AI prompt configuration including persona, style, tools, safety, and localization settings',
  category: ShardTypeCategory.CONFIGURATION,
  schema: {
    format: 'rich',
    fields: aiConfigFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Configuration', fields: ['name', 'scope', 'description'] },
        { id: 'persona', label: 'Persona', fields: ['personaName', 'personaRole', 'personaTraits', 'personaExpertise', 'personaTone', 'personaVerbosity', 'personaCreativity'] },
        { id: 'style', label: 'Response Style', fields: ['styleDefaultFormat', 'stylePreferredLength', 'styleCitationStyle', 'styleUseMarkdown', 'styleUseEmoji', 'styleShowConfidence', 'styleIncludeSummary'] },
        { id: 'tools', label: 'Tools', fields: ['toolsEnabled', 'toolsMaxCalls', 'toolsTimeout', 'toolsParallelExecution'] },
        { id: 'webSearch', label: 'Web Search', fields: ['webSearchEnabled', 'webSearchAutoSearch', 'webSearchMaxResults', 'webSearchTriggers', 'webSearchMaxAge'] },
        { id: 'domain', label: 'Domain Knowledge', fields: ['domainIndustry', 'domainFrameworks', 'domainGuidelines'] },
        { id: 'safety', label: 'Safety', fields: ['safetyContentFiltering', 'safetyDisclosureLevel', 'safetyPiiHandling', 'safetyAdmitUncertainty', 'safetyRetainConversations', 'safetyBlockedTopics'] },
        { id: 'locale', label: 'Localization', fields: ['localeDefaultLanguage', 'localeAutoDetect', 'localeDateFormat'] },
        { id: 'customization', label: 'Customization Control', fields: ['allowPersonaOverride', 'allowStyleOverride', 'allowToolOverride', 'allowSafetyOverride', 'allowDomainOverride'] },
        { id: 'status', label: 'Status', fields: ['isActive', 'isDefault', 'version', 'tags'] },
      ],
    },
    // No embedding for configuration shards
    embedding: {
      enabled: false,
    },
  },
  icon: 'settings',
  color: '#f59e0b',
  tags: ['ai', 'config', 'configuration', 'prompt', 'system'],
};

export const DASHBOARD_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.DASHBOARD,
  displayName: 'Dashboard',
  description: 'Customizable dashboards with drag-and-drop widgets',
  category: ShardTypeCategory.SYSTEM,
  schema: {
    format: 'rich',
    fields: [
      {
        id: 'name',
        name: 'name',
        label: 'Dashboard Name',
        type: RichFieldType.TEXT,
        required: true,
        design: { columns: 12 },
      },
      {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: RichFieldType.TEXTAREA,
        design: { columns: 12 },
      },
    ],
  },
  icon: 'layout-dashboard',
  color: '#6366f1',
  tags: ['dashboard', 'widgets', 'analytics', 'system'],
};

export const DASHBOARD_WIDGET_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.DASHBOARD_WIDGET,
  displayName: 'Dashboard Widget',
  description: 'Widget component for dashboards',
  category: ShardTypeCategory.SYSTEM,
  schema: {
    format: 'rich',
    fields: [
      {
        id: 'name',
        name: 'name',
        label: 'Widget Name',
        type: RichFieldType.TEXT,
        required: true,
        design: { columns: 12 },
      },
    ],
  },
  icon: 'layout-grid',
  color: '#6366f1',
  tags: ['dashboard', 'widget', 'system'],
};

export const DASHBOARD_VERSION_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.DASHBOARD_VERSION,
  displayName: 'Dashboard Version',
  description: 'Version history for dashboards',
  category: ShardTypeCategory.SYSTEM,
  schema: {
    format: 'rich',
    fields: [],
  },
  icon: 'history',
  color: '#6366f1',
  tags: ['dashboard', 'version', 'system'],
};

// ============================================
// c_project - Project
// ============================================
const projectFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Project Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'planned', label: 'Planned' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'planned',
    },
    design: { columns: 4 },
  },
  {
    name: 'priority',
    label: 'Priority',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      default: 'medium',
    },
    design: { columns: 4 },
  },
  {
    name: 'startDate',
    label: 'Start Date',
    type: RichFieldType.DATE,
    design: { columns: 4 },
  },
  {
    name: 'targetDate',
    label: 'Target Date',
    type: RichFieldType.DATE,
    design: { columns: 4 },
  },
  {
    name: 'managerId',
    label: 'Project Manager',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 4 },
  },
  {
    name: 'teamIds',
    label: 'Team Members',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true }, // Using allowCustom as a proxy for user multiselect if specific type isn't available, but 'user' type usually handles single. For multiselect users, we might need a specific config or just use multiselect with dynamic options if supported. 
    // Assuming 'multiselect' type can handle user IDs if we provide options or if it's a specific 'user_multi' type. 
    // Based on existing types, 'multiselect' with 'allowCustom' is used for tags. 
    // Let's check if there is a 'users' type. 'user' is single. 
    // For now, I'll use 'multiselect' and assume the UI handles user selection for this field name or we might need to enhance the type system later.
    // Actually, looking at `taskFields`, `assigneeUserId` is type `user`. 
    // Let's use `multiselect` for now as requested in the plan.
    design: { columns: 12 },
  },
  {
    name: 'companyId',
    label: 'Company',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_company' },
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_opportunity' },
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
];

export const PROJECT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.PROJECT,
  displayName: 'Project',
  description: 'Project is a collaborative workspace where multiple users can collaborate.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: projectFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Project Details', fields: ['name', 'description', 'status', 'priority'] },
        { id: 'dates', label: 'Timeline', fields: ['startDate', 'targetDate'] },
        { id: 'people', label: 'Team', fields: ['managerId', 'teamIds'] },
        { id: 'links', label: 'Linked Entities', fields: ['companyId', 'opportunityId'] },
        { id: 'meta', label: 'Metadata', fields: ['tags'] },
      ],
    },
  },
  icon: 'briefcase',
  color: '#3b82f6',
  tags: ['project', 'collaboration', 'management'],
};

// ============================================
// c_webpages - Web Pages (Deep Search Results)
// ============================================
const webpagesFields: RichFieldDefinition[] = [
  {
    name: 'url',
    label: 'URL',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 2048 },
    design: { columns: 12 },
  },
  {
    name: 'title',
    label: 'Page Title',
    type: RichFieldType.TEXT,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'sourceQuery',
    label: 'Source Query',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'searchType',
    label: 'Search Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'web', label: 'Web' },
        { value: 'news', label: 'News' },
        { value: 'finance', label: 'Finance' },
        { value: 'bing', label: 'Bing' },
      ],
      default: 'web',
    },
    design: { columns: 6 },
  },
  {
    name: 'projectId',
    label: 'Project',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_project' },
    design: { columns: 6 },
  },
  {
    name: 'textContent',
    label: 'Content',
    type: RichFieldType.TEXTAREA,
    config: { rows: 10, readOnly: true },
    design: { columns: 12 },
  },
  {
    name: 'scrapedAt',
    label: 'Scraped At',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'chunkCount',
    label: 'Chunk Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'conversationId',
    label: 'Conversation',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_conversation' },
    design: { columns: 6 },
  },
  {
    name: 'recurringSearchId',
    label: 'Recurring Search',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
];

export const WEBPAGES_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.WEBPAGES,
  displayName: 'Web Page',
  description: 'Scraped web page content from deep search with semantic chunks and embeddings',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: webpagesFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Page Information', fields: ['url', 'title', 'sourceQuery', 'searchType'] },
        { id: 'content', label: 'Content', fields: ['textContent'] },
        { id: 'metadata', label: 'Metadata', fields: ['scrapedAt', 'chunkCount'] },
        { id: 'relationships', label: 'Relationships', fields: ['projectId', 'conversationId', 'recurringSearchId'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['title', 'textContent'],
    },
  },
  icon: 'globe',
  color: '#10b981',
  tags: ['web', 'search', 'scraping', 'deep-search', 'ai-insights'],
};

// ============================================
// Phase 2 Integration Shard Types
// ============================================

// c_opportunity - Salesforce Opportunity
// ============================================
// c_opportunity - Sales Opportunity/Deal
// ============================================
// CRITICAL: This is the most important shard type in the application
// Used for vector search, AI insights, chats, and risk analysis
const opportunityFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'opportunityNumber',
    label: 'Opportunity Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 50, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'type',
    label: 'Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'new_business', label: 'New Business' },
        { value: 'existing_business', label: 'Existing Business' },
        { value: 'renewal', label: 'Renewal' },
        { value: 'upsell', label: 'Upsell' },
        { value: 'cross_sell', label: 'Cross-Sell' },
        { value: 'expansion', label: 'Expansion' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Stage & Status Fields
  // ============================================
  {
    name: 'stage',
    label: 'Stage',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'needs_analysis', label: 'Needs Analysis' },
        { value: 'value_proposition', label: 'Value Proposition' },
        { value: 'id_decision_makers', label: 'Id. Decision Makers' },
        { value: 'perception_analysis', label: 'Perception Analysis' },
        { value: 'proposal_price_quote', label: 'Proposal/Price Quote' },
        { value: 'negotiation_review', label: 'Negotiation/Review' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' },
      ],
      default: 'prospecting',
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'open', label: 'Open' },
        { value: 'won', label: 'Won' },
        { value: 'lost', label: 'Lost' },
      ],
      default: 'open',
    },
    design: { columns: 6 },
  },
  {
    name: 'isWon',
    label: 'Is Won',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isClosed',
    label: 'Is Closed',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lostReason',
    label: 'Lost Reason',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'price', label: 'Price' },
        { value: 'competition', label: 'Competition' },
        { value: 'no_budget', label: 'No Budget' },
        { value: 'no_decision', label: 'No Decision' },
        { value: 'timing', label: 'Timing' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'lostReasonDetail',
    label: 'Lost Reason Detail',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 1000 },
    design: { columns: 6 },
  },

  // ============================================
  // Financial Fields
  // ============================================
  {
    name: 'amount',
    label: 'Amount',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'expectedRevenue',
    label: 'Expected Revenue',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0, decimalPlaces: 2, readOnly: false }, // Stored, calculated on save/update
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'SGD', label: 'SGD - Singapore Dollar' },
        { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
        { value: 'NZD', label: 'NZD - New Zealand Dollar' },
        { value: 'ZAR', label: 'ZAR - South African Rand' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },
  {
    name: 'probability',
    label: 'Probability (%)',
    type: RichFieldType.INTEGER,
    required: true,
    config: { 
      min: 0, 
      max: 100,
      // Auto-calculated based on stage (tenant admin configures in integration adapter)
      // Manual override allowed
    },
    design: { columns: 6 },
  },

  // ============================================
  // Date Fields
  // ============================================
  {
    name: 'closeDate',
    label: 'Close Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'createdDate',
    label: 'Created Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedDate',
    label: 'Last Modified Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastActivityDate',
    label: 'Last Activity Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'fiscalYear',
    label: 'Fiscal Year',
    type: RichFieldType.INTEGER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'fiscalQuarter',
    label: 'Fiscal Quarter',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 1, max: 4 },
    design: { columns: 6 },
  },

  // ============================================
  // Relationship Fields (with Auto-Generated Name Fields)
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_account' },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Primary Contact',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_contact' },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Primary Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'leadId',
    label: 'Lead',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_lead' },
    design: { columns: 6 },
  },
  {
    name: 'leadName',
    label: 'Lead Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from leadId
    design: { columns: 6 },
  },
  {
    name: 'campaignId',
    label: 'Campaign',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_campaign' },
    design: { columns: 6 },
  },
  {
    name: 'campaignName',
    label: 'Campaign Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from campaignId
    design: { columns: 6 },
  },
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'createdById',
    label: 'Created By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdByName',
    label: 'Created By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from createdById
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedById',
    label: 'Last Modified By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedByName',
    label: 'Last Modified By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from lastModifiedById
    design: { columns: 6 },
  },

  // ============================================
  // Related Entities (Direct References)
  // ============================================
  {
    name: 'competitorIds',
    label: 'Competitors',
    type: RichFieldType.MULTISELECT,
    config: {
      // References to c_opportunityCompetitor shards
      // Also tracked via internal_relationships
    },
    design: { columns: 12 },
  },
  {
    name: 'contactRoleIds',
    label: 'Contact Roles',
    type: RichFieldType.MULTISELECT,
    config: {
      // References to c_opportunityContactRole shards
      // Also tracked via internal_relationships
    },
    design: { columns: 12 },
  },
  {
    name: 'lineItemIds',
    label: 'Line Items',
    type: RichFieldType.MULTISELECT,
    config: {
      // References to c_opportunityLineItem shards
      // Also tracked via internal_relationships
    },
    design: { columns: 12 },
  },

  // ============================================
  // Forecasting Fields
  // ============================================
  {
    name: 'forecastCategory',
    label: 'Forecast Category',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'pipeline', label: 'Pipeline' },
        { value: 'best_case', label: 'Best Case' },
        { value: 'commit', label: 'Commit' },
        { value: 'closed', label: 'Closed' },
        { value: 'omitted', label: 'Omitted' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'forecastCategoryName',
    label: 'Forecast Category Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isExcludedFromForecast',
    label: 'Excluded from Forecast',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },

  // ============================================
  // Lead Source & Marketing Fields
  // ============================================
  {
    name: 'leadSource',
    label: 'Lead Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'web', label: 'Web' },
        { value: 'phone_inquiry', label: 'Phone Inquiry' },
        { value: 'partner_referral', label: 'Partner Referral' },
        { value: 'purchased_list', label: 'Purchased List' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'hasOpportunityLineItem',
    label: 'Has Opportunity Line Items',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Description & Notes Fields
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 32000 },
    design: { columns: 12 },
  },
  {
    name: 'nextStep',
    label: 'Next Step',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'nextStepDate',
    label: 'Next Step Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Opportunity Splits / Revenue Sharing
  // ============================================
  {
    name: 'hasOpportunitySplits',
    label: 'Has Opportunity Splits',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'totalOpportunityQuantity',
    label: 'Total Opportunity Quantity',
    type: RichFieldType.FLOAT,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'totalPrice',
    label: 'Total Price',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2, readOnly: true }, // Computed from line items
    design: { columns: 6 },
  },

  // ============================================
  // Additional Metadata Fields
  // ============================================
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: {
      // Tags are typically free-form, but can be configured with options
      allowCustom: true,
    },
    design: { columns: 12 },
  },
  {
    name: 'rating',
    label: 'Rating',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'hot', label: 'Hot' },
        { value: 'warm', label: 'Warm' },
        { value: 'cold', label: 'Cold' },
      ],
    },
    design: { columns: 6 },
  },
];

export const OPPORTUNITY_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
  displayName: 'Opportunity',
  description: 'Sales opportunity or CRM deal. CRITICAL: Most important shard type in the application. Used for vector search, AI insights, chats, and risk analysis.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: opportunityFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Opportunity Information',
          fields: ['name', 'opportunityNumber', 'type', 'stage', 'status'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['amount', 'expectedRevenue', 'currency', 'probability', 'totalPrice', 'totalOpportunityQuantity'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['closeDate', 'nextStepDate', 'createdDate', 'lastModifiedDate', 'lastActivityDate', 'fiscalYear', 'fiscalQuarter'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: [
            'accountId', 'accountName',
            'contactId', 'contactName',
            'leadId', 'leadName',
            'campaignId', 'campaignName',
            'ownerId', 'ownerName',
          ],
        },
        {
          id: 'related_entities',
          label: 'Related Entities',
          fields: ['competitorIds', 'contactRoleIds', 'lineItemIds'],
        },
        {
          id: 'forecast',
          label: 'Forecasting',
          fields: ['forecastCategory', 'forecastCategoryName', 'isExcludedFromForecast', 'isWon', 'isClosed'],
        },
        {
          id: 'marketing',
          label: 'Marketing & Lead Source',
          fields: ['leadSource', 'hasOpportunityLineItem', 'hasOpportunitySplits'],
        },
        {
          id: 'loss',
          label: 'Loss Information',
          fields: ['lostReason', 'lostReasonDetail'],
        },
        {
          id: 'content',
          label: 'Description & Next Steps',
          fields: ['description', 'nextStep'],
        },
        {
          id: 'metadata',
          label: 'Additional Information',
          fields: ['tags', 'rating', 'createdById', 'createdByName', 'lastModifiedById', 'lastModifiedByName'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'nextStep'],
    },
  },
  icon: 'trending-up',
  color: '#3b82f6',
  tags: ['crm', 'salesforce', 'opportunity', 'deal', 'sales', 'critical'],
};

/**
 * Embedding Template for c_opportunity
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const OPPORTUNITY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Opportunity Embedding Template',
  description: 'High-precision embedding template for opportunities. Critical for risk analysis and AI insights.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'stage', weight: 0.9, include: true },
    { name: 'amount', weight: 0.9, include: true, preprocess: { maxLength: 50 } },
    { name: 'expectedRevenue', weight: 0.9, include: true, preprocess: { maxLength: 50 } },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'accountName', weight: 0.7, include: true },
    { name: 'contactName', weight: 0.7, include: true },
    { name: 'ownerName', weight: 0.6, include: true },
    { name: 'leadSource', weight: 0.5, include: true },
    { name: 'nextStep', weight: 0.6, include: true },
    { name: 'type', weight: 0.5, include: true },
    { name: 'forecastCategory', weight: 0.6, include: true },
    { name: 'lostReason', weight: 0.5, include: true },
    { name: 'lostReasonDetail', weight: 0.6, include: true, preprocess: { maxLength: 500, stripFormatting: true } },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'quality', // CRITICAL: Use quality model for risk analysis
    modelId: 'text-embedding-3-large',
    fallbackModelId: 'text-embedding-3-small',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// c_account - Salesforce Account
// ============================================
// c_account - Account/Company (CRM)
// ============================================
// CRITICAL: Used for vector search, AI insights, chats, and risk analysis
const accountFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'accountNumber',
    label: 'Account Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'type',
    label: 'Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'competitor', label: 'Competitor' },
        { value: 'partner', label: 'Partner' },
        { value: 'prospect', label: 'Prospect' },
        { value: 'reseller', label: 'Reseller' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'industry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'education', label: 'Education' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'energy', label: 'Energy' },
        { value: 'telecommunications', label: 'Telecommunications' },
        { value: 'media', label: 'Media' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'government', label: 'Government' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'rating',
    label: 'Rating',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'hot', label: 'Hot' },
        { value: 'warm', label: 'Warm' },
        { value: 'cold', label: 'Cold' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'ownership',
    label: 'Ownership',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
        { value: 'subsidiary', label: 'Subsidiary' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Financial Fields
  // ============================================
  {
    name: 'annualRevenue',
    label: 'Annual Revenue',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'numberOfEmployees',
    label: 'Number of Employees',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'tickerSymbol',
    label: 'Ticker Symbol',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'yearStarted',
    label: 'Year Started',
    type: RichFieldType.TEXT,
    config: { maxLength: 4 },
    design: { columns: 6 },
  },

  // ============================================
  // Contact Information
  // ============================================
  {
    name: 'phone',
    label: 'Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'fax',
    label: 'Fax',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'website',
    label: 'Website',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'site',
    label: 'Site',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },

  // ============================================
  // Billing Address Fields
  // ============================================
  {
    name: 'billingStreet',
    label: 'Billing Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'billingCity',
    label: 'Billing City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'billingState',
    label: 'Billing State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'billingPostalCode',
    label: 'Billing Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'billingCountry',
    label: 'Billing Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'billingStateCode',
    label: 'Billing State Code',
    type: RichFieldType.SELECT,
    config: {
      // ISO 3166-2 state codes - extensive list would go here
      // For now, allow custom values
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'billingCountryCode',
    label: 'Billing Country Code',
    type: RichFieldType.SELECT,
    config: {
      // ISO 3166-1 alpha-2 country codes
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'IT', label: 'Italy' },
        { value: 'ES', label: 'Spain' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'AT', label: 'Austria' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'IE', label: 'Ireland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'AR', label: 'Argentina' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'HK', label: 'Hong Kong' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'billingLatitude',
    label: 'Billing Latitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'billingLongitude',
    label: 'Billing Longitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'billingGeocodeAccuracy',
    label: 'Billing Geocode Accuracy',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Address', label: 'Address' },
        { value: 'NearAddress', label: 'Near Address' },
        { value: 'Block', label: 'Block' },
        { value: 'Street', label: 'Street' },
        { value: 'ExtendedZip', label: 'Extended Zip' },
        { value: 'Zip', label: 'Zip' },
        { value: 'City', label: 'City' },
        { value: 'County', label: 'County' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'billingAddress',
    label: 'Billing Address',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Computed compound field
    design: { columns: 12 },
  },

  // ============================================
  // Shipping Address Fields
  // ============================================
  {
    name: 'shippingStreet',
    label: 'Shipping Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'shippingCity',
    label: 'Shipping City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'shippingState',
    label: 'Shipping State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'shippingPostalCode',
    label: 'Shipping Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'shippingCountry',
    label: 'Shipping Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'shippingStateCode',
    label: 'Shipping State Code',
    type: RichFieldType.SELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'shippingCountryCode',
    label: 'Shipping Country Code',
    type: RichFieldType.SELECT,
    config: {
      // Same options as billingCountryCode
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'IT', label: 'Italy' },
        { value: 'ES', label: 'Spain' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'AT', label: 'Austria' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'IE', label: 'Ireland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'AR', label: 'Argentina' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'HK', label: 'Hong Kong' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'shippingLatitude',
    label: 'Shipping Latitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'shippingLongitude',
    label: 'Shipping Longitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'shippingGeocodeAccuracy',
    label: 'Shipping Geocode Accuracy',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Address', label: 'Address' },
        { value: 'NearAddress', label: 'Near Address' },
        { value: 'Block', label: 'Block' },
        { value: 'Street', label: 'Street' },
        { value: 'ExtendedZip', label: 'Extended Zip' },
        { value: 'Zip', label: 'Zip' },
        { value: 'City', label: 'City' },
        { value: 'County', label: 'County' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'shippingAddress',
    label: 'Shipping Address',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Computed compound field
    design: { columns: 12 },
  },

  // ============================================
  // Relationship Fields (with Auto-Generated Name Fields)
  // ============================================
  {
    name: 'parentId',
    label: 'Parent Account',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_account' },
    design: { columns: 6 },
  },
  {
    name: 'parentName',
    label: 'Parent Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from parentId
    design: { columns: 6 },
  },
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'recordTypeId',
    label: 'Record Type',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_recordType' }, // Generic record type reference
    design: { columns: 6 },
  },
  {
    name: 'recordTypeName',
    label: 'Record Type Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from recordTypeId
    design: { columns: 6 },
  },
  {
    name: 'operatingHoursId',
    label: 'Operating Hours',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_operatingHours' }, // Generic operating hours reference
    design: { columns: 6 },
  },
  {
    name: 'operatingHoursName',
    label: 'Operating Hours Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from operatingHoursId
    design: { columns: 6 },
  },
  {
    name: 'createdById',
    label: 'Created By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdByName',
    label: 'Created By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from createdById
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedById',
    label: 'Last Modified By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedByName',
    label: 'Last Modified By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from lastModifiedById
    design: { columns: 6 },
  },

  // ============================================
  // Data.com Fields
  // ============================================
  {
    name: 'dunsNumber',
    label: 'D-U-N-S Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 9 },
    design: { columns: 6 },
  },
  {
    name: 'naicsCode',
    label: 'NAICS Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 8 },
    design: { columns: 6 },
  },
  {
    name: 'naicsDesc',
    label: 'NAICS Description',
    type: RichFieldType.TEXT,
    config: { maxLength: 120 },
    design: { columns: 6 },
  },
  {
    name: 'sic',
    label: 'SIC Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'sicDesc',
    label: 'SIC Description',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'jigsaw',
    label: 'Data.com Key',
    type: RichFieldType.TEXT,
    config: { maxLength: 20, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'jigsawCompanyId',
    label: 'Data.com Company ID',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'cleanStatus',
    label: 'Clean Status',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'matched', label: 'Matched' },
        { value: 'different', label: 'Different' },
        { value: 'acknowledged', label: 'Acknowledged' },
        { value: 'not_found', label: 'Not Found' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
        { value: 'select_match', label: 'Select Match' },
        { value: 'skipped', label: 'Skipped' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'tradestyle',
    label: 'Tradestyle',
    type: RichFieldType.TEXT,
    config: { maxLength: 255 },
    design: { columns: 6 },
  },

  // ============================================
  // Person Account Fields (when IsPersonAccount = true)
  // ============================================
  {
    name: 'firstName',
    label: 'First Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'middleName',
    label: 'Middle Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'suffix',
    label: 'Suffix',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'salutation',
    label: 'Salutation',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Mr.', label: 'Mr.' },
        { value: 'Ms.', label: 'Ms.' },
        { value: 'Mrs.', label: 'Mrs.' },
        { value: 'Dr.', label: 'Dr.' },
        { value: 'Prof.', label: 'Prof.' },
        { value: 'Rev.', label: 'Rev.' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'personEmail',
    label: 'Person Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'personMobilePhone',
    label: 'Person Mobile Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'personHomePhone',
    label: 'Person Home Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'personOtherPhone',
    label: 'Person Other Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'personAssistantName',
    label: 'Person Assistant Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'personAssistantPhone',
    label: 'Person Assistant Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'personBirthDate',
    label: 'Person Birth Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'personDepartment',
    label: 'Person Department',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'personTitle',
    label: 'Person Title',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'personLeadSource',
    label: 'Person Lead Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'web', label: 'Web' },
        { value: 'phone_inquiry', label: 'Phone Inquiry' },
        { value: 'partner_referral', label: 'Partner Referral' },
        { value: 'purchased_list', label: 'Purchased List' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'personGenderIdentity',
    label: 'Person Gender Identity',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non_binary', label: 'Non-Binary' },
        { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'personPronouns',
    label: 'Person Pronouns',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'he_him', label: 'He/Him' },
        { value: 'she_her', label: 'She/Her' },
        { value: 'they_them', label: 'They/Them' },
        { value: 'he_they', label: 'He/They' },
        { value: 'she_they', label: 'She/They' },
        { value: 'not_listed', label: 'Not Listed' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'personHasOptedOutOfEmail',
    label: 'Person Has Opted Out of Email',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'personEmailBouncedDate',
    label: 'Person Email Bounced Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'personEmailBouncedReason',
    label: 'Person Email Bounced Reason',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  // Person mailing address fields (PersonMailing*)
  {
    name: 'personMailingStreet',
    label: 'Person Mailing Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'personMailingCity',
    label: 'Person Mailing City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'personMailingState',
    label: 'Person Mailing State',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'personMailingPostalCode',
    label: 'Person Mailing Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'personMailingCountry',
    label: 'Person Mailing Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  // Person other address fields (PersonOther*)
  {
    name: 'personOtherStreet',
    label: 'Person Other Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'personOtherCity',
    label: 'Person Other City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'personOtherState',
    label: 'Person Other State',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'personOtherPostalCode',
    label: 'Person Other Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'personOtherCountry',
    label: 'Person Other Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },

  // ============================================
  // Boolean Flags
  // ============================================
  {
    name: 'isPersonAccount',
    label: 'Is Person Account',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isCustomerPortal',
    label: 'Is Customer Portal',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'isPartner',
    label: 'Is Partner',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'isBuyer',
    label: 'Is Buyer',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isPriorityRecord',
    label: 'Is Priority Record',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isExcludedFromTerritory2Filter',
    label: 'Excluded from Territory2 Filter',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },

  // ============================================
  // Activity/Date Fields
  // ============================================
  {
    name: 'lastActivityDate',
    label: 'Last Activity Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastReferencedDate',
    label: 'Last Referenced Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastViewedDate',
    label: 'Last Viewed Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdDate',
    label: 'Created Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedDate',
    label: 'Last Modified Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Additional Fields
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 32000 },
    design: { columns: 12 },
  },
  {
    name: 'photoUrl',
    label: 'Photo URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'channelProgramName',
    label: 'Channel Program Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'channelProgramLevelName',
    label: 'Channel Program Level Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
];

export const ACCOUNT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ACCOUNT,
  displayName: 'Account',
  description: 'CRM account or company. CRITICAL: Used for vector search, AI insights, chats, and risk analysis.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: accountFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Account Information',
          fields: ['name', 'accountNumber', 'type', 'industry', 'rating', 'ownership'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['annualRevenue', 'numberOfEmployees', 'tickerSymbol', 'yearStarted'],
        },
        {
          id: 'contact',
          label: 'Contact Information',
          fields: ['phone', 'fax', 'website', 'site'],
        },
        {
          id: 'billing_address',
          label: 'Billing Address',
          fields: [
            'billingStreet', 'billingCity', 'billingState', 'billingPostalCode', 'billingCountry',
            'billingStateCode', 'billingCountryCode', 'billingLatitude', 'billingLongitude',
            'billingGeocodeAccuracy', 'billingAddress',
          ],
        },
        {
          id: 'shipping_address',
          label: 'Shipping Address',
          fields: [
            'shippingStreet', 'shippingCity', 'shippingState', 'shippingPostalCode', 'shippingCountry',
            'shippingStateCode', 'shippingCountryCode', 'shippingLatitude', 'shippingLongitude',
            'shippingGeocodeAccuracy', 'shippingAddress',
          ],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: [
            'parentId', 'parentName',
            'ownerId', 'ownerName',
            'recordTypeId', 'recordTypeName',
            'operatingHoursId', 'operatingHoursName',
          ],
        },
        {
          id: 'person_account',
          label: 'Person Account Information',
          fields: [
            'salutation', 'firstName', 'middleName', 'lastName', 'suffix',
            'personEmail', 'personMobilePhone', 'personHomePhone', 'personOtherPhone',
            'personAssistantName', 'personAssistantPhone', 'personBirthDate',
            'personDepartment', 'personTitle', 'personLeadSource',
            'personGenderIdentity', 'personPronouns',
            'personHasOptedOutOfEmail', 'personEmailBouncedDate', 'personEmailBouncedReason',
          ],
        },
        {
          id: 'person_mailing_address',
          label: 'Person Mailing Address',
          fields: [
            'personMailingStreet', 'personMailingCity', 'personMailingState',
            'personMailingPostalCode', 'personMailingCountry',
          ],
        },
        {
          id: 'person_other_address',
          label: 'Person Other Address',
          fields: [
            'personOtherStreet', 'personOtherCity', 'personOtherState',
            'personOtherPostalCode', 'personOtherCountry',
          ],
        },
        {
          id: 'datacom',
          label: 'Data.com Information',
          fields: [
            'dunsNumber', 'naicsCode', 'naicsDesc', 'sic', 'sicDesc',
            'jigsaw', 'jigsawCompanyId', 'cleanStatus', 'tradestyle',
          ],
        },
        {
          id: 'flags',
          label: 'Account Flags',
          fields: [
            'isPersonAccount', 'isCustomerPortal', 'isPartner', 'isBuyer',
            'isPriorityRecord', 'isExcludedFromTerritory2Filter',
          ],
        },
        {
          id: 'activity',
          label: 'Activity & Dates',
          fields: [
            'lastActivityDate', 'lastReferencedDate', 'lastViewedDate',
            'createdDate', 'lastModifiedDate',
            'createdById', 'createdByName', 'lastModifiedById', 'lastModifiedByName',
          ],
        },
        {
          id: 'additional',
          label: 'Additional Information',
          fields: ['description', 'photoUrl', 'channelProgramName', 'channelProgramLevelName'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'building',
  color: '#10b981',
  tags: ['crm', 'salesforce', 'account', 'company', 'critical'],
};

/**
 * Embedding Template for c_account
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const ACCOUNT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Account Embedding Template',
  description: 'High-precision embedding template for accounts. Critical for company matching and AI insights.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'industry', weight: 0.7, include: true },
    { name: 'type', weight: 0.6, include: true },
    { name: 'website', weight: 0.5, include: true },
    { name: 'billingCity', weight: 0.4, include: true },
    { name: 'billingCountry', weight: 0.4, include: true },
    { name: 'rating', weight: 0.5, include: true },
    { name: 'ownership', weight: 0.4, include: true },
    { name: 'tickerSymbol', weight: 0.4, include: true },
    { name: 'parentName', weight: 0.6, include: true },
    { name: 'ownerName', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'quality', // CRITICAL: Use quality model for risk analysis
    modelId: 'text-embedding-3-large',
    fallbackModelId: 'text-embedding-3-small',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_contact - Contact/Person (CRM)
// ============================================
// CRITICAL: Used for vector search, AI insights, chats, and risk analysis
const contactFields: RichFieldDefinition[] = [
  // ============================================
  // Core Name Fields
  // ============================================
  {
    name: 'name',
    label: 'Full Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255, readOnly: true }, // Computed from FirstName + MiddleName + LastName + Suffix
    design: { columns: 12 },
  },
  {
    name: 'salutation',
    label: 'Salutation',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Mr.', label: 'Mr.' },
        { value: 'Ms.', label: 'Ms.' },
        { value: 'Mrs.', label: 'Mrs.' },
        { value: 'Dr.', label: 'Dr.' },
        { value: 'Prof.', label: 'Prof.' },
        { value: 'Rev.', label: 'Rev.' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'firstName',
    label: 'First Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'middleName',
    label: 'Middle Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'suffix',
    label: 'Suffix',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },

  // ============================================
  // Account Relationship
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: { shardTypeId: 'c_account' },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },

  // ============================================
  // Contact Information
  // ============================================
  {
    name: 'email',
    label: 'Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'phone',
    label: 'Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'mobilePhone',
    label: 'Mobile Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'homePhone',
    label: 'Home Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'otherPhone',
    label: 'Other Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'fax',
    label: 'Fax',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'assistantName',
    label: 'Assistant Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'assistantPhone',
    label: 'Assistant Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },

  // ============================================
  // Mailing Address Fields
  // ============================================
  {
    name: 'mailingStreet',
    label: 'Mailing Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'mailingCity',
    label: 'Mailing City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'mailingState',
    label: 'Mailing State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'mailingPostalCode',
    label: 'Mailing Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'mailingCountry',
    label: 'Mailing Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'mailingStateCode',
    label: 'Mailing State Code',
    type: RichFieldType.SELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'mailingCountryCode',
    label: 'Mailing Country Code',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'IT', label: 'Italy' },
        { value: 'ES', label: 'Spain' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'AT', label: 'Austria' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'IE', label: 'Ireland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'AR', label: 'Argentina' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'HK', label: 'Hong Kong' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'mailingLatitude',
    label: 'Mailing Latitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'mailingLongitude',
    label: 'Mailing Longitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'mailingGeocodeAccuracy',
    label: 'Mailing Geocode Accuracy',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Address', label: 'Address' },
        { value: 'NearAddress', label: 'Near Address' },
        { value: 'Block', label: 'Block' },
        { value: 'Street', label: 'Street' },
        { value: 'ExtendedZip', label: 'Extended Zip' },
        { value: 'Zip', label: 'Zip' },
        { value: 'City', label: 'City' },
        { value: 'County', label: 'County' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'mailingAddress',
    label: 'Mailing Address',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Computed compound field
    design: { columns: 12 },
  },

  // ============================================
  // Other Address Fields
  // ============================================
  {
    name: 'otherStreet',
    label: 'Other Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'otherCity',
    label: 'Other City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'otherState',
    label: 'Other State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'otherPostalCode',
    label: 'Other Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'otherCountry',
    label: 'Other Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'otherStateCode',
    label: 'Other State Code',
    type: RichFieldType.SELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'otherCountryCode',
    label: 'Other Country Code',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'IT', label: 'Italy' },
        { value: 'ES', label: 'Spain' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'AT', label: 'Austria' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'IE', label: 'Ireland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'AR', label: 'Argentina' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'HK', label: 'Hong Kong' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'otherLatitude',
    label: 'Other Latitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'otherLongitude',
    label: 'Other Longitude',
    type: RichFieldType.FLOAT,
    config: { decimalPlaces: 6 },
    design: { columns: 6 },
  },
  {
    name: 'otherGeocodeAccuracy',
    label: 'Other Geocode Accuracy',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Address', label: 'Address' },
        { value: 'NearAddress', label: 'Near Address' },
        { value: 'Block', label: 'Block' },
        { value: 'Street', label: 'Street' },
        { value: 'ExtendedZip', label: 'Extended Zip' },
        { value: 'Zip', label: 'Zip' },
        { value: 'City', label: 'City' },
        { value: 'County', label: 'County' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'otherAddress',
    label: 'Other Address',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Computed compound field
    design: { columns: 12 },
  },

  // ============================================
  // Reference Fields (with Auto-Generated Name Fields)
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'reportsToId',
    label: 'Reports To',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_contact' },
    design: { columns: 6 },
  },
  {
    name: 'reportsToName',
    label: 'Reports To Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from reportsToId
    design: { columns: 6 },
  },
  {
    name: 'recordTypeId',
    label: 'Record Type',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_recordType' },
    design: { columns: 6 },
  },
  {
    name: 'recordTypeName',
    label: 'Record Type Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from recordTypeId
    design: { columns: 6 },
  },
  {
    name: 'individualId',
    label: 'Individual',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_individual' },
    design: { columns: 6 },
  },
  {
    name: 'individualName',
    label: 'Individual Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from individualId
    design: { columns: 6 },
  },

  // ============================================
  // Additional Information
  // ============================================
  {
    name: 'title',
    label: 'Title',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'department',
    label: 'Department',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 32000 },
    design: { columns: 12 },
  },
  {
    name: 'birthdate',
    label: 'Birthdate',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'leadSource',
    label: 'Lead Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'web', label: 'Web' },
        { value: 'phone_inquiry', label: 'Phone Inquiry' },
        { value: 'partner_referral', label: 'Partner Referral' },
        { value: 'purchased_list', label: 'Purchased List' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'contactSource',
    label: 'Contact Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'auto_create', label: 'Auto Create' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'photoUrl',
    label: 'Photo URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Buyer Relationship Map Fields
  // ============================================
  {
    name: 'buyerAttributes',
    label: 'Buyer Attributes',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'business_user', label: 'Business User' },
        { value: 'buyer', label: 'Buyer' },
        { value: 'champion', label: 'Champion' },
        { value: 'decision_maker', label: 'Decision Maker' },
        { value: 'detractor', label: 'Detractor' },
        { value: 'evaluator', label: 'Evaluator' },
        { value: 'executive_sponsor', label: 'Executive Sponsor' },
        { value: 'technical_expert', label: 'Technical Expert' },
      ],
    },
    design: { columns: 12 },
  },
  {
    name: 'departmentGroup',
    label: 'Department Group',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'chief_executive', label: 'Chief Executive' },
        { value: 'customer_success', label: 'Customer Success' },
        { value: 'finance', label: 'Finance' },
        { value: 'human_resources', label: 'Human Resources' },
        { value: 'legal', label: 'Legal' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'other', label: 'Other' },
        { value: 'sales', label: 'Sales' },
        { value: 'support', label: 'Support' },
        { value: 'tech', label: 'Tech' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'titleType',
    label: 'Title Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'ceo', label: 'CEO' },
        { value: 'director_or_manager', label: 'Director or Manager' },
        { value: 'executive', label: 'Executive' },
        { value: 'individual_contributor', label: 'Individual Contributor' },
        { value: 'vp', label: 'VP' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Email Preferences
  // ============================================
  {
    name: 'hasOptedOutOfEmail',
    label: 'Has Opted Out of Email',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'hasOptedOutOfFax',
    label: 'Has Opted Out of Fax',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'doNotCall',
    label: 'Do Not Call',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'isEmailBounced',
    label: 'Is Email Bounced',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'emailBouncedDate',
    label: 'Email Bounced Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'emailBouncedReason',
    label: 'Email Bounced Reason',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Identity Fields
  // ============================================
  {
    name: 'genderIdentity',
    label: 'Gender Identity',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non_binary', label: 'Non-Binary' },
        { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'pronouns',
    label: 'Pronouns',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'he_him', label: 'He/Him' },
        { value: 'he_they', label: 'He/They' },
        { value: 'not_listed', label: 'Not Listed' },
        { value: 'she_her', label: 'She/Her' },
        { value: 'she_they', label: 'She/They' },
        { value: 'they_them', label: 'They/Them' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Data.com Fields
  // ============================================
  {
    name: 'jigsaw',
    label: 'Data.com Key',
    type: RichFieldType.TEXT,
    config: { maxLength: 20, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'jigsawContactId',
    label: 'Data.com Contact ID',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'cleanStatus',
    label: 'Clean Status',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'matched', label: 'Matched' },
        { value: 'different', label: 'Different' },
        { value: 'acknowledged', label: 'Acknowledged' },
        { value: 'not_found', label: 'Not Found' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
        { value: 'select_match', label: 'Select Match' },
        { value: 'skipped', label: 'Skipped' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Sales Engagement Fields
  // ============================================
  {
    name: 'actionCadenceId',
    label: 'Action Cadence',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_actionCadence', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'actionCadenceName',
    label: 'Action Cadence Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from actionCadenceId
    design: { columns: 6 },
  },
  {
    name: 'actionCadenceAssigneeId',
    label: 'Action Cadence Assignee',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_user', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'actionCadenceAssigneeName',
    label: 'Action Cadence Assignee Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from actionCadenceAssigneeId
    design: { columns: 6 },
  },
  {
    name: 'actionCadenceState',
    label: 'Action Cadence State',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'complete', label: 'Complete' },
        { value: 'error', label: 'Error' },
        { value: 'initializing', label: 'Initializing' },
        { value: 'paused', label: 'Paused' },
        { value: 'processing', label: 'Processing' },
        { value: 'running', label: 'Running' },
      ],
      readOnly: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'activeTrackerCount',
    label: 'Active Tracker Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'firstCallDateTime',
    label: 'First Call Date/Time',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'firstEmailDateTime',
    label: 'First Email Date/Time',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'scheduledResumeDateTime',
    label: 'Scheduled Resume Date/Time',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Boolean Flags
  // ============================================
  {
    name: 'canAllowPortalSelfReg',
    label: 'Can Allow Portal Self Registration',
    type: RichFieldType.BOOLEAN,
    design: { columns: 6 },
  },
  {
    name: 'isPersonAccount',
    label: 'Is Person Account',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isPriorityRecord',
    label: 'Is Priority Record',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Activity/Date Fields
  // ============================================
  {
    name: 'lastActivityDate',
    label: 'Last Activity Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastReferencedDate',
    label: 'Last Referenced Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastViewedDate',
    label: 'Last Viewed Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdDate',
    label: 'Created Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedDate',
    label: 'Last Modified Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdById',
    label: 'Created By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdByName',
    label: 'Created By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from createdById
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedById',
    label: 'Last Modified By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedByName',
    label: 'Last Modified By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from lastModifiedById
    design: { columns: 6 },
  },
];

export const CONTACT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CONTACT,
  displayName: 'Contact',
  description: 'CRM contact or person. CRITICAL: Used for vector search, AI insights, chats, and risk analysis.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: contactFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'name',
          label: 'Name',
          fields: ['salutation', 'firstName', 'middleName', 'lastName', 'suffix', 'name'],
        },
        {
          id: 'account',
          label: 'Account',
          fields: ['accountId', 'accountName', 'ownerId', 'ownerName'],
        },
        {
          id: 'contact_info',
          label: 'Contact Information',
          fields: ['email', 'phone', 'mobilePhone', 'homePhone', 'otherPhone', 'fax', 'assistantName', 'assistantPhone'],
        },
        {
          id: 'mailing_address',
          label: 'Mailing Address',
          fields: [
            'mailingStreet', 'mailingCity', 'mailingState', 'mailingPostalCode', 'mailingCountry',
            'mailingStateCode', 'mailingCountryCode', 'mailingLatitude', 'mailingLongitude',
            'mailingGeocodeAccuracy', 'mailingAddress',
          ],
        },
        {
          id: 'other_address',
          label: 'Other Address',
          fields: [
            'otherStreet', 'otherCity', 'otherState', 'otherPostalCode', 'otherCountry',
            'otherStateCode', 'otherCountryCode', 'otherLatitude', 'otherLongitude',
            'otherGeocodeAccuracy', 'otherAddress',
          ],
        },
        {
          id: 'additional',
          label: 'Additional Information',
          fields: ['title', 'department', 'birthdate', 'description', 'leadSource', 'contactSource', 'photoUrl'],
        },
        {
          id: 'preferences',
          label: 'Email Preferences',
          fields: ['hasOptedOutOfEmail', 'hasOptedOutOfFax', 'doNotCall', 'isEmailBounced', 'emailBouncedDate', 'emailBouncedReason'],
        },
        {
          id: 'buyer_map',
          label: 'Buyer Relationship Map',
          fields: ['buyerAttributes', 'departmentGroup', 'titleType'],
        },
        {
          id: 'identity',
          label: 'Identity',
          fields: ['genderIdentity', 'pronouns'],
        },
        {
          id: 'datacom',
          label: 'Data.com Information',
          fields: ['jigsaw', 'jigsawContactId', 'cleanStatus'],
        },
        {
          id: 'sales_engagement',
          label: 'Sales Engagement',
          fields: [
            'actionCadenceId', 'actionCadenceName',
            'actionCadenceAssigneeId', 'actionCadenceAssigneeName',
            'actionCadenceState', 'activeTrackerCount',
            'firstCallDateTime', 'firstEmailDateTime', 'scheduledResumeDateTime',
          ],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: [
            'reportsToId', 'reportsToName',
            'recordTypeId', 'recordTypeName',
            'individualId', 'individualName',
          ],
        },
        {
          id: 'flags',
          label: 'Contact Flags',
          fields: ['canAllowPortalSelfReg', 'isPersonAccount', 'isPriorityRecord'],
        },
        {
          id: 'activity',
          label: 'Activity & Dates',
          fields: [
            'lastActivityDate', 'lastReferencedDate', 'lastViewedDate',
            'createdDate', 'lastModifiedDate',
            'createdById', 'createdByName', 'lastModifiedById', 'lastModifiedByName',
          ],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'user',
  color: '#06b6d4',
  tags: ['crm', 'salesforce', 'contact', 'person', 'critical'],
};

/**
 * Embedding Template for c_contact
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const CONTACT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Contact Embedding Template',
  description: 'High-precision embedding template for contacts. Critical for people matching and AI insights.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'firstName', weight: 0.9, include: true },
    { name: 'lastName', weight: 0.9, include: true },
    { name: 'email', weight: 0.8, include: true },
    { name: 'title', weight: 0.7, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'department', weight: 0.6, include: true },
    { name: 'accountName', weight: 0.7, include: true },
    { name: 'phone', weight: 0.4, include: true },
    { name: 'leadSource', weight: 0.5, include: true },
    { name: 'buyerAttributes', weight: 0.6, include: true },
    { name: 'departmentGroup', weight: 0.5, include: true },
    { name: 'titleType', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'quality', // CRITICAL: Use quality model for risk analysis
    modelId: 'text-embedding-3-large',
    fallbackModelId: 'text-embedding-3-small',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_lead - Lead (CRM)
// ============================================
// Generic lead fields that work across Salesforce, HubSpot, Dynamics
const leadFields: RichFieldDefinition[] = [
  // ============================================
  // Core Name Fields
  // ============================================
  {
    name: 'name',
    label: 'Lead Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'firstName',
    label: 'First Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'title',
    label: 'Title',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },

  // ============================================
  // Contact Information
  // ============================================
  {
    name: 'email',
    label: 'Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'phone',
    label: 'Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'mobilePhone',
    label: 'Mobile Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },

  // ============================================
  // Company Information
  // ============================================
  {
    name: 'company',
    label: 'Company',
    type: RichFieldType.TEXT,
    config: { maxLength: 255 },
    design: { columns: 6 },
  },
  {
    name: 'companyId',
    label: 'Company Account',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_account' },
    design: { columns: 6 },
  },
  {
    name: 'companyName',
    label: 'Company Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from companyId
    design: { columns: 6 },
  },
  {
    name: 'industry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'education', label: 'Education' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'energy', label: 'Energy' },
        { value: 'telecommunications', label: 'Telecommunications' },
        { value: 'media', label: 'Media' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'government', label: 'Government' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },

  // ============================================
  // Lead Status & Scoring
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'unqualified', label: 'Unqualified' },
        { value: 'nurturing', label: 'Nurturing' },
        { value: 'converted', label: 'Converted' },
        { value: 'lost', label: 'Lost' },
      ],
      default: 'new',
    },
    design: { columns: 6 },
  },
  {
    name: 'rating',
    label: 'Rating',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'hot', label: 'Hot' },
        { value: 'warm', label: 'Warm' },
        { value: 'cold', label: 'Cold' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'score',
    label: 'Lead Score',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'leadSource',
    label: 'Lead Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'web', label: 'Web' },
        { value: 'phone_inquiry', label: 'Phone Inquiry' },
        { value: 'partner_referral', label: 'Partner Referral' },
        { value: 'purchased_list', label: 'Purchased List' },
        { value: 'event', label: 'Event' },
        { value: 'social', label: 'Social Media' },
        { value: 'advertisement', label: 'Advertisement' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Relationship Fields (with Auto-Generated Name Fields)
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Conversion Fields
  // ============================================
  {
    name: 'convertedOpportunityId',
    label: 'Converted Opportunity',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_opportunity', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'convertedOpportunityName',
    label: 'Converted Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from convertedOpportunityId
    design: { columns: 6 },
  },
  {
    name: 'convertedAccountId',
    label: 'Converted Account',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_account', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'convertedAccountName',
    label: 'Converted Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from convertedAccountId
    design: { columns: 6 },
  },
  {
    name: 'convertedContactId',
    label: 'Converted Contact',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_contact', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'convertedContactName',
    label: 'Converted Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from convertedContactId
    design: { columns: 6 },
  },
  {
    name: 'convertedDate',
    label: 'Converted Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'isConverted',
    label: 'Is Converted',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Address Fields
  // ============================================
  {
    name: 'street',
    label: 'Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'city',
    label: 'City',
    type: RichFieldType.TEXT,
    config: { maxLength: 40 },
    design: { columns: 6 },
  },
  {
    name: 'state',
    label: 'State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'postalCode',
    label: 'Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'country',
    label: 'Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 80 },
    design: { columns: 6 },
  },
  {
    name: 'stateCode',
    label: 'State Code',
    type: RichFieldType.SELECT,
    config: { allowCustom: true },
    design: { columns: 6 },
  },
  {
    name: 'countryCode',
    label: 'Country Code',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'IT', label: 'Italy' },
        { value: 'ES', label: 'Spain' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'AT', label: 'Austria' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'IE', label: 'Ireland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'AR', label: 'Argentina' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'HK', label: 'Hong Kong' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },

  // ============================================
  // Additional Fields
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 32000 },
    design: { columns: 12 },
  },
  {
    name: 'website',
    label: 'Website',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'numberOfEmployees',
    label: 'Number of Employees',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'annualRevenue',
    label: 'Annual Revenue',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },

  // ============================================
  // System Fields
  // ============================================
  {
    name: 'createdDate',
    label: 'Created Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedDate',
    label: 'Last Modified Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastActivityDate',
    label: 'Last Activity Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdById',
    label: 'Created By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'createdByName',
    label: 'Created By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from createdById
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedById',
    label: 'Last Modified By',
    type: RichFieldType.USER,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedByName',
    label: 'Last Modified By Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from lastModifiedById
    design: { columns: 6 },
  },
];

export const LEAD_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.LEAD,
  displayName: 'Lead',
  description: 'Sales lead or prospect. Generic fields that work across Salesforce, HubSpot, and Dynamics.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: leadFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'name',
          label: 'Name',
          fields: ['firstName', 'lastName', 'name', 'title'],
        },
        {
          id: 'contact',
          label: 'Contact Information',
          fields: ['email', 'phone', 'mobilePhone'],
        },
        {
          id: 'company',
          label: 'Company Information',
          fields: ['company', 'companyId', 'companyName', 'industry', 'website', 'numberOfEmployees', 'annualRevenue'],
        },
        {
          id: 'status',
          label: 'Status & Scoring',
          fields: ['status', 'rating', 'score', 'leadSource'],
        },
        {
          id: 'conversion',
          label: 'Conversion',
          fields: [
            'convertedOpportunityId', 'convertedOpportunityName',
            'convertedAccountId', 'convertedAccountName',
            'convertedContactId', 'convertedContactName',
            'convertedDate', 'isConverted',
          ],
        },
        {
          id: 'address',
          label: 'Address',
          fields: ['street', 'city', 'state', 'postalCode', 'country', 'stateCode', 'countryCode'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'activity',
          label: 'Activity & Dates',
          fields: [
            'lastActivityDate', 'createdDate', 'lastModifiedDate',
            'createdById', 'createdByName', 'lastModifiedById', 'lastModifiedByName',
          ],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'company', 'email', 'description'],
    },
  },
  icon: 'user-plus',
  color: '#8b5cf6',
  tags: ['crm', 'salesforce', 'hubspot', 'dynamics', 'lead', 'prospect'],
};

/**
 * Embedding Template for c_lead
 * Used for vector search, AI insights, and lead qualification
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const LEAD_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Lead Embedding Template',
  description: 'Embedding template for leads. Enables search and analysis of lead data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'company', weight: 0.9, include: true },
    { name: 'email', weight: 0.8, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'title', weight: 0.7, include: true },
    { name: 'industry', weight: 0.6, include: true },
    { name: 'leadSource', weight: 0.5, include: true },
    { name: 'companyName', weight: 0.7, include: true },
    { name: 'ownerName', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Leads use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_company - Company/Organization (Generic)
// ============================================
// Generic company entity that works across all systems
// Note: c_company is generic, c_account is CRM-specific
const companyFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Company Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'legalName',
    label: 'Legal Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 5000 },
    design: { columns: 12 },
  },

  // ============================================
  // Industry & Type
  // ============================================
  {
    name: 'industry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'education', label: 'Education' },
        { value: 'government', label: 'Government' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'media', label: 'Media' },
        { value: 'energy', label: 'Energy' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'construction', label: 'Construction' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'industrySubcategory',
    label: 'Industry Subcategory',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'companyType',
    label: 'Company Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
        { value: 'startup', label: 'Startup' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'smb', label: 'SMB' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'government', label: 'Government' },
        { value: 'subsidiary', label: 'Subsidiary' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Contact Information
  // ============================================
  {
    name: 'website',
    label: 'Website',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'email',
    label: 'Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'phone',
    label: 'Phone',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },

  // ============================================
  // Address Fields
  // ============================================
  {
    name: 'street',
    label: 'Street',
    type: RichFieldType.TEXTAREA,
    config: { rows: 2, maxLength: 255 },
    design: { columns: 12 },
  },
  {
    name: 'city',
    label: 'City',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'state',
    label: 'State/Province',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'postalCode',
    label: 'Postal Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 20 },
    design: { columns: 6 },
  },
  {
    name: 'country',
    label: 'Country',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },

  // ============================================
  // Business Metrics
  // ============================================
  {
    name: 'employeeCount',
    label: 'Employee Count',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: '1', label: '1' },
        { value: '2-10', label: '2-10' },
        { value: '11-50', label: '11-50' },
        { value: '51-200', label: '51-200' },
        { value: '201-500', label: '201-500' },
        { value: '501-1000', label: '501-1000' },
        { value: '1001-5000', label: '1001-5000' },
        { value: '5000+', label: '5000+' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'annualRevenue',
    label: 'Annual Revenue',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'revenueCurrency',
    label: 'Revenue Currency',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'SGD', label: 'SGD - Singapore Dollar' },
        { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
        { value: 'NZD', label: 'NZD - New Zealand Dollar' },
        { value: 'ZAR', label: 'ZAR - South African Rand' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },
  {
    name: 'foundedYear',
    label: 'Founded Year',
    type: RichFieldType.INTEGER,
    config: { min: 1800, max: 2100 },
    design: { columns: 6 },
  },
  {
    name: 'stockTicker',
    label: 'Stock Ticker',
    type: RichFieldType.TEXT,
    config: { maxLength: 10 },
    design: { columns: 6 },
  },

  // ============================================
  // Social Media & Online Presence
  // ============================================
  {
    name: 'linkedInUrl',
    label: 'LinkedIn URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'twitterHandle',
    label: 'Twitter Handle',
    type: RichFieldType.TEXT,
    config: { maxLength: 15 },
    design: { columns: 6 },
  },

  // ============================================
  // Status & Classification
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'prospect', label: 'Prospect' },
        { value: 'lead', label: 'Lead' },
        { value: 'customer', label: 'Customer' },
        { value: 'partner', label: 'Partner' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'competitor', label: 'Competitor' },
        { value: 'churned', label: 'Churned' },
        { value: 'inactive', label: 'Inactive' },
      ],
      default: 'prospect',
    },
    design: { columns: 6 },
  },
  {
    name: 'tier',
    label: 'Tier',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'strategic', label: 'Strategic' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'mid_market', label: 'Mid Market' },
        { value: 'smb', label: 'SMB' },
        { value: 'startup', label: 'Startup' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: {
      allowCustom: true,
    },
    design: { columns: 12 },
  },
];

export const COMPANY_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.COMPANY,
  displayName: 'Company',
  description: 'Generic company or organization entity. Works across all systems. Note: c_company is generic, c_account is CRM-specific.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: companyFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Company Information',
          fields: ['name', 'legalName', 'description'],
        },
        {
          id: 'industry',
          label: 'Industry & Type',
          fields: ['industry', 'industrySubcategory', 'companyType'],
        },
        {
          id: 'contact',
          label: 'Contact Information',
          fields: ['website', 'email', 'phone'],
        },
        {
          id: 'address',
          label: 'Address',
          fields: ['street', 'city', 'state', 'postalCode', 'country'],
        },
        {
          id: 'metrics',
          label: 'Business Metrics',
          fields: ['employeeCount', 'annualRevenue', 'revenueCurrency', 'foundedYear', 'stockTicker'],
        },
        {
          id: 'social',
          label: 'Social Media',
          fields: ['linkedInUrl', 'twitterHandle'],
        },
        {
          id: 'classification',
          label: 'Status & Classification',
          fields: ['status', 'tier', 'tags'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'building-2',
  color: '#8b5cf6',
  tags: ['company', 'organization', 'generic', 'critical'],
};

/**
 * Embedding Template for c_company
 * Used for vector search and AI insights on company data
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const COMPANY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Company Embedding Template',
  description: 'Embedding template for companies. Enables search and analysis of company data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'industry', weight: 0.7, include: true },
    { name: 'companyType', weight: 0.6, include: true },
    { name: 'website', weight: 0.5, include: true },
    { name: 'status', weight: 0.6, include: true },
    { name: 'tier', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Companies use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_note - Note/Memo/Activity Record
// ============================================
// Notes, memos, meeting notes, call logs, and other activity records
// Captures conversations, decisions, and observations for AI insights
const noteFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'name',
    label: 'Note Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'noteType',
    label: 'Note Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'general', label: 'General' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'call', label: 'Call' },
        { value: 'email_summary', label: 'Email Summary' },
        { value: 'decision', label: 'Decision' },
        { value: 'idea', label: 'Idea' },
        { value: 'reminder', label: 'Reminder' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'research', label: 'Research' },
        { value: 'status_update', label: 'Status Update' },
        { value: 'risk', label: 'Risk' },
        { value: 'blocker', label: 'Blocker' },
      ],
      default: 'general',
    },
    design: { columns: 6 },
  },
  {
    name: 'content',
    label: 'Content',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'summary',
    label: 'Summary',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 1000 },
    design: { columns: 12 },
  },

  // ============================================
  // Date & Duration
  // ============================================
  {
    name: 'date',
    label: 'Date',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'duration',
    label: 'Duration (minutes)',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Attendees & Participants
  // ============================================
  {
    name: 'attendees',
    label: 'Attendees',
    type: RichFieldType.MULTISELECT,
    config: {
      allowCustom: true,
    },
    design: { columns: 12 },
  },

  // ============================================
  // Action Items & Decisions
  // ============================================
  {
    name: 'actionItems',
    label: 'Action Items',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            assignee: { type: 'string' },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            completedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'description', 'status'],
        },
      },
    },
    design: { columns: 12 },
  },
  {
    name: 'decisions',
    label: 'Decisions',
    type: RichFieldType.MULTISELECT,
    config: {
      allowCustom: true,
    },
    design: { columns: 12 },
  },

  // ============================================
  // Sentiment & Priority
  // ============================================
  {
    name: 'sentiment',
    label: 'Sentiment',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'positive', label: 'Positive' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'negative', label: 'Negative' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'urgent', label: 'Urgent' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'priority',
    label: 'Priority',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      default: 'medium',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Flags & Metadata
  // ============================================
  {
    name: 'isPinned',
    label: 'Pinned',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 6 },
  },
  {
    name: 'isPrivate',
    label: 'Private',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 6 },
  },
  {
    name: 'followUpDate',
    label: 'Follow-up Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: {
      allowCustom: true,
    },
    design: { columns: 12 },
  },
];

export const NOTE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.NOTE,
  displayName: 'Note',
  description: 'Note, memo, meeting notes, call logs, and other activity records. Captures conversations, decisions, and observations for AI insights.',
  category: ShardTypeCategory.DOCUMENT,
  schema: {
    format: 'rich',
    fields: noteFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Note Information',
          fields: ['name', 'noteType', 'content', 'summary'],
        },
        {
          id: 'timing',
          label: 'Date & Duration',
          fields: ['date', 'duration'],
        },
        {
          id: 'participants',
          label: 'Attendees',
          fields: ['attendees'],
        },
        {
          id: 'outcomes',
          label: 'Action Items & Decisions',
          fields: ['actionItems', 'decisions'],
        },
        {
          id: 'classification',
          label: 'Sentiment & Priority',
          fields: ['sentiment', 'priority'],
        },
        {
          id: 'metadata',
          label: 'Flags & Metadata',
          fields: ['isPinned', 'isPrivate', 'followUpDate', 'tags'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'content', 'summary', 'decisions'],
    },
  },
  icon: 'sticky-note',
  color: '#eab308',
  tags: ['note', 'memo', 'activity', 'meeting', 'call'],
};

/**
 * Embedding Template for c_note
 * Used for vector search and AI insights on notes
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const NOTE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Note Embedding Template',
  description: 'Embedding template for notes. Enables search and analysis of notes, meeting notes, and activity records.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 0.8, include: true },
    { name: 'content', weight: 1.0, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'summary', weight: 0.9, include: true, preprocess: { maxLength: 1000, stripFormatting: true } },
    { name: 'noteType', weight: 0.6, include: true },
    { name: 'decisions', weight: 0.8, include: true },
    { name: 'actionItems', weight: 0.7, include: true },
    { name: 'sentiment', weight: 0.5, include: true },
    { name: 'priority', weight: 0.5, include: true },
    { name: 'attendees', weight: 0.4, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Notes use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.3,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_opportunityCompetitor - Opportunity Competitor
// ============================================
// Tracks competitors for opportunities
// Separate shard type enables independent vector search and AI insights
const opportunityCompetitorFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'competitorName',
    label: 'Competitor Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255 },
    design: { columns: 6 },
  },
  {
    name: 'competitorId',
    label: 'Competitor Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_company',
    },
    design: { columns: 6 },
  },
  {
    name: 'competitorAccountName',
    label: 'Competitor Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from competitorId
    design: { columns: 6 },
  },
  {
    name: 'strength',
    label: 'Strength',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'Strong', label: 'Strong' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Weak', label: 'Weak' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'isPrimary',
    label: 'Primary Competitor',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 6 },
  },
  {
    name: 'notes',
    label: 'Notes',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'winLossReason',
    label: 'Win/Loss Reason',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 2000 },
    design: { columns: 12 },
  },
];

export const OPPORTUNITY_COMPETITOR_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY_COMPETITOR,
  displayName: 'Opportunity Competitor',
  description: 'Tracks competitors for opportunities. Separate shard type enables independent vector search and AI insights.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: opportunityCompetitorFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Competitor Information',
          fields: ['opportunityId', 'opportunityName', 'competitorName', 'competitorId', 'competitorAccountName'],
        },
        {
          id: 'details',
          label: 'Details',
          fields: ['strength', 'isPrimary', 'notes'],
        },
        {
          id: 'winloss',
          label: 'Win/Loss Information',
          fields: ['winLossReason'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['competitorName', 'notes'],
    },
  },
  icon: 'users',
  color: '#ef4444',
  tags: ['opportunity', 'competitor', 'sales'],
};

/**
 * Embedding Template for c_opportunityCompetitor
 * Used for vector search and AI insights on competitors
 */
export const OPPORTUNITY_COMPETITOR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Opportunity Competitor Embedding Template',
  description: 'Embedding template for opportunity competitors. Enables search and analysis of competitor data.',
  isDefault: true,
  fields: [
    { name: 'competitorName', weight: 1.0, include: true },
    { name: 'notes', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'winLossReason', weight: 0.7, include: true, preprocess: { maxLength: 1000, stripFormatting: true } },
    { name: 'strength', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Competitors use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_opportunityContactRole - Opportunity Contact Role
// ============================================
// Tracks contact roles in opportunities
// Separate shard type enables independent vector search and AI insights
const opportunityContactRoleFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'role',
    label: 'Role',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'Decision Maker', label: 'Decision Maker' },
        { value: 'Economic Buyer', label: 'Economic Buyer' },
        { value: 'Evaluator', label: 'Evaluator' },
        { value: 'Executive Sponsor', label: 'Executive Sponsor' },
        { value: 'Influencer', label: 'Influencer' },
        { value: 'Technical Buyer', label: 'Technical Buyer' },
        { value: 'User', label: 'User' },
        { value: 'Other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'isPrimary',
    label: 'Primary Contact',
    type: RichFieldType.BOOLEAN,
    config: { default: false },
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const OPPORTUNITY_CONTACT_ROLE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY_CONTACT_ROLE,
  displayName: 'Opportunity Contact Role',
  description: 'Tracks contact roles in opportunities. Separate shard type enables independent vector search and AI insights.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: opportunityContactRoleFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Contact Role Information',
          fields: ['opportunityId', 'opportunityName', 'contactId', 'contactName', 'role'],
        },
        {
          id: 'details',
          label: 'Details',
          fields: ['isPrimary', 'description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['contactName', 'role', 'description'],
    },
  },
  icon: 'user-check',
  color: '#3b82f6',
  tags: ['opportunity', 'contact', 'role', 'sales'],
};

/**
 * Embedding Template for c_opportunityContactRole
 * Used for vector search and AI insights on contact roles
 */
export const OPPORTUNITY_CONTACT_ROLE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Opportunity Contact Role Embedding Template',
  description: 'Embedding template for opportunity contact roles. Enables search and analysis of contact involvement.',
  isDefault: true,
  fields: [
    { name: 'contactName', weight: 1.0, include: true },
    { name: 'role', weight: 0.8, include: true },
    { name: 'description', weight: 0.7, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Contact roles use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_opportunityLineItem - Opportunity Line Item
// ============================================
// Tracks products/services in opportunities
// Separate shard type enables independent vector search and AI insights
const opportunityLineItemFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'productId',
    label: 'Product',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_product',
    },
    design: { columns: 6 },
  },
  {
    name: 'productName',
    label: 'Product Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 255 },
    design: { columns: 6 },
  },
  {
    name: 'productCode',
    label: 'Product Code',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'quantity',
    label: 'Quantity',
    type: RichFieldType.FLOAT,
    required: true,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'unitPrice',
    label: 'Unit Price',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'listPrice',
    label: 'List Price',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'discount',
    label: 'Discount (%)',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 100, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'totalPrice',
    label: 'Total Price',
    type: RichFieldType.CURRENCY,
    config: { readOnly: true, computed: true }, // Calculated: quantity * unitPrice
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'serviceDate',
    label: 'Service Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'sortOrder',
    label: 'Sort Order',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'hasRevenueSchedule',
    label: 'Has Revenue Schedule',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
];

export const OPPORTUNITY_LINE_ITEM_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY_LINE_ITEM,
  displayName: 'Opportunity Line Item',
  description: 'Tracks products/services in opportunities. Separate shard type enables independent vector search and AI insights.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: opportunityLineItemFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Product Information',
          fields: ['opportunityId', 'opportunityName', 'productId', 'productName', 'productCode'],
        },
        {
          id: 'pricing',
          label: 'Pricing',
          fields: ['quantity', 'unitPrice', 'listPrice', 'discount', 'totalPrice'],
        },
        {
          id: 'details',
          label: 'Details',
          fields: ['description', 'serviceDate', 'sortOrder', 'hasRevenueSchedule'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['productName', 'description'],
    },
  },
  icon: 'package',
  color: '#10b981',
  tags: ['opportunity', 'product', 'line-item', 'sales'],
};

/**
 * Embedding Template for c_opportunityLineItem
 * Used for vector search and AI insights on line items
 */
export const OPPORTUNITY_LINE_ITEM_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Opportunity Line Item Embedding Template',
  description: 'Embedding template for opportunity line items. Enables search and analysis of product-related queries.',
  isDefault: true,
  fields: [
    { name: 'productName', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'productCode', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Line items use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_ticket - Support Case/Ticket
// ============================================
// Support cases/tickets (Salesforce Cases, Zendesk Tickets, ServiceNow Incidents)
// Generic ticket entity that works across all support systems
const ticketFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Subject',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'ticketNumber',
    label: 'Ticket Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 100, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'new', label: 'New' },
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'pending', label: 'Pending' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'new',
    },
    design: { columns: 6 },
  },
  {
    name: 'priority',
    label: 'Priority',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'type',
    label: 'Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'question', label: 'Question' },
        { value: 'problem', label: 'Problem' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'bug', label: 'Bug' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'compliment', label: 'Compliment' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },

  // ============================================
  // Relationship Fields
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'assignedToId',
    label: 'Assigned To',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'assignedToName',
    label: 'Assigned To Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from assignedToId
    design: { columns: 6 },
  },

  // ============================================
  // Content Fields
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },
  {
    name: 'resolution',
    label: 'Resolution',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },

  // ============================================
  // SLA & Dates
  // ============================================
  {
    name: 'slaTargetDate',
    label: 'SLA Target Date',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'firstResponseDate',
    label: 'First Response Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'closedDate',
    label: 'Closed Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'slaViolated',
    label: 'SLA Violated',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
];

export const TICKET_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.TICKET,
  displayName: 'Ticket',
  description: 'Support case or ticket. Generic ticket entity that works across all support systems (Salesforce Cases, Zendesk Tickets, ServiceNow Incidents).',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: ticketFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Ticket Information',
          fields: ['name', 'ticketNumber', 'status', 'priority', 'type'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'contactId', 'contactName', 'ownerId', 'ownerName', 'assignedToId', 'assignedToName'],
        },
        {
          id: 'content',
          label: 'Content',
          fields: ['description', 'resolution'],
        },
        {
          id: 'sla',
          label: 'SLA & Dates',
          fields: ['slaTargetDate', 'firstResponseDate', 'closedDate', 'slaViolated'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'resolution'],
    },
  },
  icon: 'ticket',
  color: '#f59e0b',
  tags: ['ticket', 'support', 'case', 'incident'],
};

/**
 * Embedding Template for c_ticket
 * Used for vector search and AI insights on support tickets
 */
export const TICKET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Ticket Embedding Template',
  description: 'Embedding template for support tickets. Enables search and analysis of ticket data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'resolution', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'type', weight: 0.6, include: true },
    { name: 'priority', weight: 0.5, include: true },
    { name: 'status', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Tickets use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_account',
    weight: 0.3,
    fields: ['name', 'status'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_campaign - Marketing Campaign
// ============================================
// Marketing campaigns (Salesforce, HubSpot, Marketo)
// Generic campaign entity that works across all marketing systems
const campaignFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Campaign Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'type',
    label: 'Campaign Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'email', label: 'Email' },
        { value: 'social', label: 'Social Media' },
        { value: 'webinar', label: 'Webinar' },
        { value: 'event', label: 'Event' },
        { value: 'advertising', label: 'Advertising' },
        { value: 'content', label: 'Content Marketing' },
        { value: 'seo', label: 'SEO' },
        { value: 'ppc', label: 'PPC' },
        { value: 'retargeting', label: 'Retargeting' },
        { value: 'other', label: 'Other' },
      ],
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'planned', label: 'Planned' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'paused', label: 'Paused' },
      ],
      default: 'planned',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Dates
  // ============================================
  {
    name: 'startDate',
    label: 'Start Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'endDate',
    label: 'End Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Budget & Revenue
  // ============================================
  {
    name: 'budget',
    label: 'Budget',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'expectedRevenue',
    label: 'Expected Revenue',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'actualCost',
    label: 'Actual Cost',
    type: RichFieldType.CURRENCY,
    config: { readOnly: true, min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'expectedResponse',
    label: 'Expected Response',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'actualResponse',
    label: 'Actual Response',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Performance Metrics (Read-only, Calculated)
  // ============================================
  {
    name: 'totalSent',
    label: 'Total Sent',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'totalOpened',
    label: 'Total Opened',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'totalClicked',
    label: 'Total Clicked',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'totalConverted',
    label: 'Total Converted',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'openRate',
    label: 'Open Rate (%)',
    type: RichFieldType.FLOAT,
    config: { readOnly: true, min: 0, max: 100, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'clickRate',
    label: 'Click Rate (%)',
    type: RichFieldType.FLOAT,
    config: { readOnly: true, min: 0, max: 100, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'conversionRate',
    label: 'Conversion Rate (%)',
    type: RichFieldType.FLOAT,
    config: { readOnly: true, min: 0, max: 100, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'roi',
    label: 'ROI (%)',
    type: RichFieldType.FLOAT,
    config: { readOnly: true, decimalPlaces: 2 },
    design: { columns: 6 },
  },

  // ============================================
  // Owner & Description
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const CAMPAIGN_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CAMPAIGN,
  displayName: 'Campaign',
  description: 'Marketing campaign. Generic campaign entity that works across all marketing systems (Salesforce, HubSpot, Marketo).',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: campaignFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Campaign Information',
          fields: ['name', 'type', 'status', 'ownerId', 'ownerName'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['startDate', 'endDate'],
        },
        {
          id: 'budget',
          label: 'Budget & Revenue',
          fields: ['budget', 'expectedRevenue', 'actualCost', 'expectedResponse', 'actualResponse'],
        },
        {
          id: 'performance',
          label: 'Performance Metrics',
          fields: ['totalSent', 'totalOpened', 'totalClicked', 'totalConverted', 'openRate', 'clickRate', 'conversionRate', 'roi'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'megaphone',
  color: '#8b5cf6',
  tags: ['campaign', 'marketing', 'performance'],
};

/**
 * Embedding Template for c_campaign
 * Used for vector search and AI insights on marketing campaigns
 */
export const CAMPAIGN_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Campaign Embedding Template',
  description: 'Embedding template for marketing campaigns. Enables search and analysis of campaign data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'type', weight: 0.6, include: true },
    { name: 'status', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Campaigns use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_quote - Sales Quote/Proposal
// ============================================
// Sales quotes/proposals (Salesforce, HubSpot, Dynamics)
// Generic quote entity that works across all CRM systems
const quoteFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Quote Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'quoteNumber',
    label: 'Quote Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 100, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'in_review', label: 'In Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Relationship Fields
  // ============================================
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Pricing Fields
  // ============================================
  {
    name: 'subtotal',
    label: 'Subtotal',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'discount',
    label: 'Discount (%)',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 100, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'tax',
    label: 'Tax',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'total',
    label: 'Total',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'SGD', label: 'SGD - Singapore Dollar' },
        { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
        { value: 'NZD', label: 'NZD - New Zealand Dollar' },
        { value: 'ZAR', label: 'ZAR - South African Rand' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Dates
  // ============================================
  {
    name: 'expirationDate',
    label: 'Expiration Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Content Fields
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'terms',
    label: 'Terms & Conditions',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },
];

export const QUOTE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.QUOTE,
  displayName: 'Quote',
  description: 'Sales quote or proposal. Generic quote entity that works across all CRM systems (Salesforce, HubSpot, Dynamics).',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: quoteFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Quote Information',
          fields: ['name', 'quoteNumber', 'status', 'opportunityId', 'opportunityName'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'contactId', 'contactName', 'ownerId', 'ownerName'],
        },
        {
          id: 'pricing',
          label: 'Pricing',
          fields: ['subtotal', 'discount', 'tax', 'total', 'currency'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['expirationDate'],
        },
        {
          id: 'content',
          label: 'Content',
          fields: ['description', 'terms'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'terms'],
    },
  },
  icon: 'file-text',
  color: '#10b981',
  tags: ['quote', 'proposal', 'sales'],
};

/**
 * Embedding Template for c_quote
 * Used for vector search and AI insights on quotes
 */
export const QUOTE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Quote Embedding Template',
  description: 'Embedding template for sales quotes. Enables search and analysis of quote data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'terms', weight: 0.8, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'status', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Quotes use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_opportunityHistory - Opportunity History Tracking
// ============================================
// Tracks historical changes to opportunity fields (stage, amount, close date, etc.)
const opportunityHistoryFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    required: true,
    config: { shardTypeId: 'c_opportunity' },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'stageName',
    label: 'Stage Name',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'needs_analysis', label: 'Needs Analysis' },
        { value: 'value_proposition', label: 'Value Proposition' },
        { value: 'id_decision_makers', label: 'Id. Decision Makers' },
        { value: 'perception_analysis', label: 'Perception Analysis' },
        { value: 'proposal_price_quote', label: 'Proposal/Price Quote' },
        { value: 'negotiation_review', label: 'Negotiation/Review' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'amount',
    label: 'Amount',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'closeDate',
    label: 'Close Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'probability',
    label: 'Probability (%)',
    type: RichFieldType.INTEGER,
    config: { min: 0, max: 100 },
    design: { columns: 6 },
  },
  {
    name: 'expectedRevenue',
    label: 'Expected Revenue',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'forecastCategory',
    label: 'Forecast Category',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'best_case', label: 'Best Case' },
        { value: 'closed', label: 'Closed' },
        { value: 'forecast', label: 'Forecast' },
        { value: 'most_likely', label: 'Most Likely' },
        { value: 'omitted', label: 'Omitted' },
        { value: 'pipeline', label: 'Pipeline' },
      ],
      readOnly: true,
    },
    design: { columns: 6 },
  },

  // ============================================
  // Previous Values (API 50.0+)
  // ============================================
  {
    name: 'prevAmount',
    label: 'Previous Amount',
    type: RichFieldType.CURRENCY,
    config: { min: 0, decimalPlaces: 2, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'prevCloseDate',
    label: 'Previous Close Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // System Fields
  // ============================================
  {
    name: 'createdDate',
    label: 'Created Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'lastModifiedDate',
    label: 'Last Modified Date',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
];

export const OPPORTUNITY_HISTORY_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.OPPORTUNITY_HISTORY,
  displayName: 'Opportunity History',
  description: 'Historical tracking of opportunity field changes (stage, amount, close date, etc.)',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: opportunityHistoryFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'opportunity',
          label: 'Opportunity',
          fields: ['opportunityId', 'opportunityName'],
        },
        {
          id: 'stage',
          label: 'Stage',
          fields: ['stageName'],
        },
        {
          id: 'amount',
          label: 'Amount',
          fields: ['amount', 'prevAmount'],
        },
        {
          id: 'close_date',
          label: 'Close Date',
          fields: ['closeDate', 'prevCloseDate'],
        },
        {
          id: 'forecast',
          label: 'Forecast',
          fields: ['probability', 'expectedRevenue', 'forecastCategory'],
        },
        {
          id: 'system',
          label: 'System Information',
          fields: ['createdDate', 'lastModifiedDate'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['opportunityName', 'stageName'],
    },
  },
  icon: 'history',
  color: '#6b7280',
  tags: ['crm', 'salesforce', 'opportunity', 'history', 'tracking'],
};

/**
 * Embedding Template for c_opportunityHistory
 * Used for vector search and AI insights on opportunity history
 * 
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export const OPPORTUNITY_HISTORY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Opportunity History Embedding Template',
  description: 'Embedding template for opportunity history records. Enables search and analysis of opportunity changes over time.',
  isDefault: true,
  fields: [
    { name: 'opportunityName', weight: 1.0, include: true },
    { name: 'stageName', weight: 0.9, include: true },
    { name: 'amount', weight: 0.7, include: true, preprocess: { maxLength: 50 } },
    { name: 'expectedRevenue', weight: 0.7, include: true, preprocess: { maxLength: 50 } },
    { name: 'forecastCategory', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // History records use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

const folderFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Folder Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'provider',
    label: 'Provider',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'gdrive', label: 'Google Drive' },
        { value: 'sharepoint', label: 'SharePoint' },
        { value: 'onedrive', label: 'OneDrive' },
        { value: 'dropbox', label: 'Dropbox' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'path',
    label: 'Path',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 12 },
  },
  {
    name: 'parentExternalId',
    label: 'Parent Folder ID',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'owner',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },

  // ============================================
  // Drive Integration Fields
  // ============================================
  {
    name: 'driveId',
    label: 'Drive ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'webUrl',
    label: 'Web URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'permissions',
    label: 'Permissions',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'object',
        properties: {
          canView: { type: 'boolean' },
          canEdit: { type: 'boolean' },
          canDelete: { type: 'boolean' },
          canShare: { type: 'boolean' },
          sharedWith: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                userName: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['viewer', 'editor', 'owner'] },
              },
            },
          },
        },
      },
    },
    design: { columns: 12 },
  },
];

export const FOLDER_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.FOLDER,
  displayName: 'Folder',
  description: 'Folder from Google Drive, SharePoint, OneDrive, or Dropbox',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: folderFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Folder Information', fields: ['name', 'provider', 'externalId', 'path'] },
        { id: 'hierarchy', label: 'Hierarchy', fields: ['parentExternalId'] },
        { id: 'ownership', label: 'Ownership', fields: ['owner'] },
        { id: 'description', label: 'Description', fields: ['description'] },
        { id: 'drive', label: 'Drive Integration', fields: ['driveId', 'webUrl', 'permissions'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'folder',
  color: '#f59e0b',
  tags: ['storage', 'gdrive', 'sharepoint', 'folder'],
};

// c_file - Google Drive/SharePoint File
const fileFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'File Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'provider',
    label: 'Provider',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'gdrive', label: 'Google Drive' },
        { value: 'sharepoint', label: 'SharePoint' },
        { value: 'onedrive', label: 'OneDrive' },
        { value: 'dropbox', label: 'Dropbox' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'mimeType',
    label: 'MIME Type',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'size',
    label: 'Size (bytes)',
    type: RichFieldType.INTEGER,
    config: { min: 0, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'checksum',
    label: 'Checksum',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'sourceUrl',
    label: 'Source URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'parentFolderExternalId',
    label: 'Parent Folder ID',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'owner',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'lastModified',
    label: 'Last Modified',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Drive Integration Fields
  // ============================================
  {
    name: 'driveId',
    label: 'Drive ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'webUrl',
    label: 'Web URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'downloadUrl',
    label: 'Download URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'thumbnailUrl',
    label: 'Thumbnail URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'permissions',
    label: 'Permissions',
    type: RichFieldType.JSON,
    config: {
      schema: {
        type: 'object',
        properties: {
          canView: { type: 'boolean' },
          canEdit: { type: 'boolean' },
          canDelete: { type: 'boolean' },
          canShare: { type: 'boolean' },
          sharedWith: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                userName: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['viewer', 'editor', 'owner'] },
              },
            },
          },
        },
      },
    },
    design: { columns: 12 },
  },
];

export const FILE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.FILE,
  displayName: 'File',
  description: 'File from Google Drive, SharePoint, OneDrive, or Dropbox',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: fileFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'File Information', fields: ['name', 'provider', 'externalId'] },
        { id: 'details', label: 'File Details', fields: ['mimeType', 'size', 'checksum', 'sourceUrl'] },
        { id: 'hierarchy', label: 'Location', fields: ['parentFolderExternalId'] },
        { id: 'metadata', label: 'Metadata', fields: ['owner', 'lastModified'] },
        { id: 'drive', label: 'Drive Integration', fields: ['driveId', 'webUrl', 'downloadUrl', 'thumbnailUrl', 'permissions'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name'],
    },
  },
  icon: 'file',
  color: '#ef4444',
  tags: ['storage', 'gdrive', 'sharepoint', 'file'],
};

// c_sp_site - SharePoint Site
const spSiteFields: RichFieldDefinition[] = [
  {
    name: 'siteId',
    label: 'Site ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'siteUrl',
    label: 'Site URL',
    type: RichFieldType.URL,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'name',
    label: 'Site Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4 },
    design: { columns: 12 },
  },
  {
    name: 'owner',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'collections',
    label: 'Collections',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, readOnly: true },
    design: { columns: 6 },
  },
];

export const SP_SITE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.SP_SITE,
  displayName: 'SharePoint Site',
  description: 'SharePoint site or site collection',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: spSiteFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Site Information', fields: ['siteId', 'siteUrl', 'name'] },
        { id: 'description', label: 'Description', fields: ['description'] },
        { id: 'ownership', label: 'Ownership', fields: ['owner'] },
        { id: 'collections', label: 'Collections', fields: ['collections'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'globe',
  color: '#0078d4',
  tags: ['sharepoint', 'site', 'storage'],
};

// c_channel - Slack/Teams Channel
const channelFields: RichFieldDefinition[] = [
  {
    name: 'platform',
    label: 'Platform',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'slack', label: 'Slack' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'discord', label: 'Discord' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'name',
    label: 'Channel Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'teamExternalId',
    label: 'Team ID',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'topic',
    label: 'Topic',
    type: RichFieldType.TEXT,
    config: { maxLength: 250 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'isPrivate',
    label: 'Private Channel',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch' },
    design: { columns: 6 },
  },
  {
    name: 'members',
    label: 'Members',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'type',
    label: 'Channel Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
        { value: 'direct', label: 'Direct Message' },
        { value: 'group', label: 'Group' },
      ],
      default: 'public',
    },
    design: { columns: 6 },
  },
  {
    name: 'memberCount',
    label: 'Member Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'isArchived',
    label: 'Archived',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'purpose',
    label: 'Purpose',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 1000 },
    design: { columns: 12 },
  },
];

export const CHANNEL_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CHANNEL,
  displayName: 'Channel',
  description: 'Slack, Teams, or Discord channel',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: channelFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Channel Information', fields: ['platform', 'name', 'externalId', 'teamExternalId', 'type'] },
        { id: 'details', label: 'Details', fields: ['topic', 'description', 'purpose'] },
        { id: 'settings', label: 'Settings', fields: ['isPrivate', 'isArchived', 'memberCount', 'members'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'topic', 'description'],
    },
  },
  icon: 'message-square',
  color: '#6366f1',
  tags: ['messaging', 'slack', 'teams', 'channel'],
};

// ============================================
// c_meeting - Video/Audio Meeting
// ============================================
// Video/audio meetings (Zoom, Teams, Google Meet, Webex)
// Separate from c_event because meetings have platform-specific data, recordings, and transcripts
const meetingFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Meeting Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'meetingType',
    label: 'Meeting Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'webinar', label: 'Webinar' },
        { value: 'conference', label: 'Conference' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'platform',
    label: 'Platform',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'zoom', label: 'Zoom' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'google_meet', label: 'Google Meet' },
        { value: 'webex', label: 'Webex' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_show', label: 'No Show' },
      ],
      default: 'scheduled',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Meeting Information
  // ============================================
  {
    name: 'meetingId',
    label: 'Meeting ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'meetingNumber',
    label: 'Meeting Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'meetingUrl',
    label: 'Meeting URL',
    type: RichFieldType.URL,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'joinUrl',
    label: 'Join URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'passcode',
    label: 'Passcode',
    type: RichFieldType.TEXT,
    config: { maxLength: 50 },
    design: { columns: 6 },
  },

  // ============================================
  // Schedule
  // ============================================
  {
    name: 'startDateTime',
    label: 'Start Date & Time',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'endDateTime',
    label: 'End Date & Time',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'timezone',
    label: 'Timezone',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
      ],
      default: 'UTC',
    },
    design: { columns: 6 },
  },
  {
    name: 'duration',
    label: 'Duration (minutes)',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'isRecurring',
    label: 'Is Recurring',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'recurrenceRule',
    label: 'Recurrence Rule',
    type: RichFieldType.TEXT,
    config: { maxLength: 500 },
    design: { columns: 6 },
  },

  // ============================================
  // Organizer
  // ============================================
  {
    name: 'organizerId',
    label: 'Organizer',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'organizerName',
    label: 'Organizer Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from organizerId
    design: { columns: 6 },
  },
  {
    name: 'organizerEmail',
    label: 'Organizer Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },

  // ============================================
  // Content
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'agenda',
    label: 'Agenda',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },

  // ============================================
  // Meeting Settings
  // ============================================
  {
    name: 'isPasswordProtected',
    label: 'Password Protected',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'isWaitingRoomEnabled',
    label: 'Waiting Room Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'isRecordingEnabled',
    label: 'Recording Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'allowJoinBeforeHost',
    label: 'Allow Join Before Host',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'muteOnEntry',
    label: 'Mute On Entry',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },

  // ============================================
  // Recording & Transcript
  // ============================================
  {
    name: 'recordingUrl',
    label: 'Recording URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'recordingAvailable',
    label: 'Recording Available',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'transcriptAvailable',
    label: 'Transcript Available',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'transcriptUrl',
    label: 'Transcript URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Attendance
  // ============================================
  {
    name: 'attendeeCount',
    label: 'Attendee Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'expectedAttendeeCount',
    label: 'Expected Attendee Count',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
];

export const MEETING_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.MEETING,
  displayName: 'Meeting',
  description: 'Video/audio meeting (Zoom, Teams, Google Meet, Webex). Separate from c_event because meetings have platform-specific data, recordings, and transcripts.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: meetingFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Meeting Information',
          fields: ['name', 'meetingType', 'platform', 'status'],
        },
        {
          id: 'meeting_info',
          label: 'Meeting Details',
          fields: ['meetingId', 'meetingNumber', 'meetingUrl', 'joinUrl', 'passcode'],
        },
        {
          id: 'schedule',
          label: 'Schedule',
          fields: ['startDateTime', 'endDateTime', 'timezone', 'duration', 'isRecurring', 'recurrenceRule'],
        },
        {
          id: 'organizer',
          label: 'Organizer',
          fields: ['organizerId', 'organizerName', 'organizerEmail'],
        },
        {
          id: 'content',
          label: 'Content',
          fields: ['description', 'agenda'],
        },
        {
          id: 'settings',
          label: 'Meeting Settings',
          fields: ['isPasswordProtected', 'isWaitingRoomEnabled', 'isRecordingEnabled', 'allowJoinBeforeHost', 'muteOnEntry'],
        },
        {
          id: 'recording',
          label: 'Recording & Transcript',
          fields: ['recordingUrl', 'recordingAvailable', 'transcriptAvailable', 'transcriptUrl'],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          fields: ['attendeeCount', 'expectedAttendeeCount'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'agenda'],
    },
  },
  icon: 'video',
  color: '#8b5cf6',
  tags: ['meeting', 'video', 'audio', 'zoom', 'teams', 'webex'],
};

/**
 * Embedding Template for c_meeting
 * Used for vector search and AI insights on meetings
 */
export const MEETING_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Meeting Embedding Template',
  description: 'Embedding template for video/audio meetings. Enables search and analysis of meeting data, recordings, and transcripts.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'agenda', weight: 0.9, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'platform', weight: 0.6, include: true },
    { name: 'meetingType', weight: 0.5, include: true },
    { name: 'status', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Meetings use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_event',
    weight: 0.3,
    fields: ['name', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_calendar - Calendar Container
// ============================================
// Calendar containers (Google Calendar, Outlook Calendar, iCal)
// c_event shards link to c_calendar via calendarId reference field
const calendarFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Calendar Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'calendarType',
    label: 'Calendar Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'shared', label: 'Shared' },
        { value: 'resource', label: 'Resource' },
        { value: 'group', label: 'Group' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'provider',
    label: 'Provider',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'google', label: 'Google Calendar' },
        { value: 'outlook', label: 'Outlook' },
        { value: 'ical', label: 'iCal' },
        { value: 'apple', label: 'Apple Calendar' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Settings
  // ============================================
  {
    name: 'timezone',
    label: 'Timezone',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
      ],
      default: 'UTC',
    },
    design: { columns: 6 },
  },
  {
    name: 'color',
    label: 'Color',
    type: RichFieldType.TEXT,
    config: { maxLength: 7, pattern: '^#[0-9A-Fa-f]{6}$' },
    design: { columns: 6 },
  },
  {
    name: 'isPrimary',
    label: 'Primary Calendar',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'isVisible',
    label: 'Visible',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'isReadOnly',
    label: 'Read Only',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
  {
    name: 'ownerEmail',
    label: 'Owner Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },
  {
    name: 'accessLevel',
    label: 'Access Level',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'owner', label: 'Owner' },
        { value: 'writer', label: 'Writer' },
        { value: 'reader', label: 'Reader' },
        { value: 'freebusy', label: 'Free/Busy' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Sync
  // ============================================
  {
    name: 'syncEnabled',
    label: 'Sync Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'lastSyncedAt',
    label: 'Last Synced At',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const CALENDAR_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CALENDAR,
  displayName: 'Calendar',
  description: 'Calendar container (Google Calendar, Outlook Calendar, iCal). c_event shards link to c_calendar via calendarId reference field.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: calendarFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Calendar Information',
          fields: ['name', 'calendarType', 'provider', 'externalId'],
        },
        {
          id: 'settings',
          label: 'Settings',
          fields: ['timezone', 'color', 'isPrimary', 'isVisible', 'isReadOnly'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName', 'ownerEmail', 'accessLevel'],
        },
        {
          id: 'sync',
          label: 'Sync',
          fields: ['syncEnabled', 'lastSyncedAt'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'calendar-days',
  color: '#3b82f6',
  tags: ['calendar', 'google', 'outlook', 'ical'],
};

/**
 * Embedding Template for c_calendar
 * Used for vector search and AI insights on calendars
 */
export const CALENDAR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Calendar Embedding Template',
  description: 'Embedding template for calendar containers. Enables search and analysis of calendar data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'provider', weight: 0.6, include: true },
    { name: 'calendarType', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Calendars use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_message - Message (Slack, Teams, Discord)
// ============================================
// Messages from Slack, Teams, Discord
// Separate shard type enables independent vector search and AI insights
const messageFields: RichFieldDefinition[] = [
  // ============================================
  // Core Fields
  // ============================================
  {
    name: 'name',
    label: 'Message Preview',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'content',
    label: 'Content',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },
  {
    name: 'channelId',
    label: 'Channel',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_channel',
    },
    design: { columns: 6 },
  },
  {
    name: 'channelName',
    label: 'Channel Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from channelId
    design: { columns: 6 },
  },

  // ============================================
  // Threading
  // ============================================
  {
    name: 'threadId',
    label: 'Thread ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'parentMessageId',
    label: 'Parent Message',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_message',
    },
    design: { columns: 6 },
  },
  {
    name: 'parentMessageName',
    label: 'Parent Message Preview',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from parentMessageId
    design: { columns: 6 },
  },

  // ============================================
  // Author
  // ============================================
  {
    name: 'authorId',
    label: 'Author',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'authorName',
    label: 'Author Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'authorEmail',
    label: 'Author Email',
    type: RichFieldType.EMAIL,
    design: { columns: 6 },
  },

  // ============================================
  // Timestamps & Status
  // ============================================
  {
    name: 'sentAt',
    label: 'Sent At',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'editedAt',
    label: 'Edited At',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'isEdited',
    label: 'Is Edited',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'isPinned',
    label: 'Pinned',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },

  // ============================================
  // Engagement Metrics
  // ============================================
  {
    name: 'reactionCount',
    label: 'Reaction Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'replyCount',
    label: 'Reply Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'hasAttachments',
    label: 'Has Attachments',
    type: RichFieldType.BOOLEAN,
    config: { readOnly: true, default: false },
    design: { columns: 6 },
  },
  {
    name: 'messageType',
    label: 'Message Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'message', label: 'Message' },
        { value: 'file_share', label: 'File Share' },
        { value: 'thread_starter', label: 'Thread Starter' },
        { value: 'reply', label: 'Reply' },
        { value: 'system', label: 'System' },
        { value: 'bot', label: 'Bot' },
      ],
      default: 'message',
    },
    design: { columns: 6 },
  },
];

export const MESSAGE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.MESSAGE,
  displayName: 'Message',
  description: 'Message from Slack, Teams, or Discord. Separate shard type enables independent vector search and AI insights.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: messageFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Message Information',
          fields: ['name', 'content', 'channelId', 'channelName'],
        },
        {
          id: 'threading',
          label: 'Threading',
          fields: ['threadId', 'parentMessageId', 'parentMessageName'],
        },
        {
          id: 'author',
          label: 'Author',
          fields: ['authorId', 'authorName', 'authorEmail'],
        },
        {
          id: 'metadata',
          label: 'Timestamps & Status',
          fields: ['sentAt', 'editedAt', 'isEdited', 'isPinned'],
        },
        {
          id: 'engagement',
          label: 'Engagement Metrics',
          fields: ['reactionCount', 'replyCount', 'hasAttachments', 'messageType'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'content'],
    },
  },
  icon: 'message-square',
  color: '#6366f1',
  tags: ['message', 'slack', 'teams', 'discord', 'communication'],
};

/**
 * Embedding Template for c_message
 * Used for vector search and AI insights on messages
 */
export const MESSAGE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Message Embedding Template',
  description: 'Embedding template for messages. Enables search and analysis of message content.',
  isDefault: true,
  fields: [
    { name: 'content', weight: 1.0, include: true, preprocess: { maxLength: 4000, stripFormatting: true } },
    { name: 'name', weight: 0.8, include: true },
    { name: 'authorName', weight: 0.5, include: true },
    { name: 'messageType', weight: 0.4, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Messages use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_channel',
    weight: 0.3,
    fields: ['name', 'topic', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_team - Team/Workspace Container
// ============================================
// Team/workspace containers (Slack Workspace, Teams Team, Discord Server)
// c_channel shards link to c_team via teamId reference
const teamFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Team/Workspace Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'platform',
    label: 'Platform',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'slack', label: 'Slack' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'discord', label: 'Discord' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'domain',
    label: 'Domain',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Statistics
  // ============================================
  {
    name: 'memberCount',
    label: 'Member Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'channelCount',
    label: 'Channel Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Settings
  // ============================================
  {
    name: 'isArchived',
    label: 'Archived',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'plan',
    label: 'Plan',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'business', label: 'Business' },
        { value: 'enterprise', label: 'Enterprise' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const TEAM_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.TEAM,
  displayName: 'Team',
  description: 'Team/workspace container (Slack Workspace, Teams Team, Discord Server). c_channel shards link to c_team via teamId reference.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: teamFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Team Information',
          fields: ['name', 'platform', 'externalId', 'domain'],
        },
        {
          id: 'stats',
          label: 'Statistics',
          fields: ['memberCount', 'channelCount'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'settings',
          label: 'Settings',
          fields: ['isArchived', 'plan'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'users',
  color: '#6366f1',
  tags: ['team', 'workspace', 'slack', 'teams', 'discord'],
};

/**
 * Embedding Template for c_team
 * Used for vector search and AI insights on teams
 */
export const TEAM_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Team Embedding Template',
  description: 'Embedding template for team/workspace containers. Enables search and analysis of team data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'platform', weight: 0.6, include: true },
    { name: 'domain', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Teams use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_project',
    weight: 0.25,
    fields: ['name', 'tags', 'summary'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_attachment - File Attachment
// ============================================
// File attachments (Email attachments, Message attachments, Note attachments)
// Polymorphic: Can link to various parent types (email, message, note, document, etc.)
const attachmentFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Attachment Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'fileName',
    label: 'File Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 500 },
    design: { columns: 12 },
  },
  {
    name: 'mimeType',
    label: 'MIME Type',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'size',
    label: 'Size (bytes)',
    type: RichFieldType.INTEGER,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // File Links
  // ============================================
  {
    name: 'fileUrl',
    label: 'File URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'thumbnailUrl',
    label: 'Thumbnail URL',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'checksum',
    label: 'Checksum',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Parent Relationship (Polymorphic)
  // ============================================
  {
    name: 'parentType',
    label: 'Parent Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'email', label: 'Email' },
        { value: 'message', label: 'Message' },
        { value: 'note', label: 'Note' },
        { value: 'document', label: 'Document' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'parentId',
    label: 'Parent ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'parentName',
    label: 'Parent Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from parentId
    design: { columns: 6 },
  },

  // ============================================
  // Email-Specific Fields
  // ============================================
  {
    name: 'isInline',
    label: 'Inline Attachment',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },
  {
    name: 'contentId',
    label: 'Content ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 2000 },
    design: { columns: 12 },
  },
];

export const ATTACHMENT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ATTACHMENT,
  displayName: 'Attachment',
  description: 'File attachment. Polymorphic: Can link to various parent types (email, message, note, document, etc.). Attachments are separate shards linked to parent via relationships.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: attachmentFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'File Information',
          fields: ['name', 'fileName', 'mimeType', 'size'],
        },
        {
          id: 'links',
          label: 'File Links',
          fields: ['fileUrl', 'thumbnailUrl', 'checksum'],
        },
        {
          id: 'parent',
          label: 'Parent Relationship',
          fields: ['parentType', 'parentId', 'parentName'],
        },
        {
          id: 'email',
          label: 'Email-Specific',
          fields: ['isInline', 'contentId'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'fileName', 'description'],
    },
  },
  icon: 'paperclip',
  color: '#6b7280',
  tags: ['attachment', 'file', 'email', 'message'],
};

/**
 * Embedding Template for c_attachment
 * Used for vector search and AI insights on attachments
 */
export const ATTACHMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Attachment Embedding Template',
  description: 'Embedding template for file attachments. Enables search and analysis of attachment data.',
  isDefault: true,
  fields: [
    { name: 'fileName', weight: 1.0, include: true },
    { name: 'name', weight: 0.9, include: true },
    { name: 'description', weight: 0.7, include: true, preprocess: { maxLength: 1000, stripFormatting: true } },
    { name: 'mimeType', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Attachments use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_email',
    weight: 0.3,
    fields: ['name', 'subject'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_competitor - Standalone Competitor Entity
// ============================================
// Standalone competitor tracking entity
// c_opportunityCompetitor references c_competitor via competitorId
const competitorFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Competitor Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'legalName',
    label: 'Legal Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'website',
    label: 'Website',
    type: RichFieldType.URL,
    design: { columns: 6 },
  },
  {
    name: 'industry',
    label: 'Industry',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'education', label: 'Education' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Competitive Analysis
  // ============================================
  {
    name: 'strengths',
    label: 'Strengths',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'weaknesses',
    label: 'Weaknesses',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'differentiators',
    label: 'Differentiators',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },

  // ============================================
  // Market Positioning
  // ============================================
  {
    name: 'pricingModel',
    label: 'Pricing Model',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'premium', label: 'Premium' },
        { value: 'value', label: 'Value' },
        { value: 'freemium', label: 'Freemium' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'one_time', label: 'One-Time' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'marketPosition',
    label: 'Market Position',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'leader', label: 'Leader' },
        { value: 'challenger', label: 'Challenger' },
        { value: 'follower', label: 'Follower' },
        { value: 'niche', label: 'Niche' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'threatLevel',
    label: 'Threat Level',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'companyId',
    label: 'Company',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_company',
    },
    design: { columns: 6 },
  },
  {
    name: 'companyName',
    label: 'Company Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from companyId
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const COMPETITOR_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.COMPETITOR,
  displayName: 'Competitor',
  description: 'Standalone competitor tracking entity. c_opportunityCompetitor references c_competitor via competitorId.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: competitorFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Competitor Information',
          fields: ['name', 'legalName', 'website', 'industry'],
        },
        {
          id: 'analysis',
          label: 'Competitive Analysis',
          fields: ['strengths', 'weaknesses', 'differentiators'],
        },
        {
          id: 'positioning',
          label: 'Market Positioning',
          fields: ['pricingModel', 'marketPosition', 'threatLevel'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'companyId', 'companyName'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'strengths', 'weaknesses', 'differentiators'],
    },
  },
  icon: 'target',
  color: '#ef4444',
  tags: ['competitor', 'competitive', 'analysis', 'market'],
};

/**
 * Embedding Template for c_competitor
 * Used for vector search and AI insights on competitors
 */
export const COMPETITOR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Competitor Embedding Template',
  description: 'Embedding template for competitor entities. Enables search and analysis of competitive intelligence.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'strengths', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'weaknesses', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'differentiators', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'marketPosition', weight: 0.6, include: true },
    { name: 'pricingModel', weight: 0.5, include: true },
    { name: 'threatLevel', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Competitors use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_opportunity',
    weight: 0.3,
    fields: ['name', 'stage', 'amount'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_contract - Sales Contract
// ============================================
// Sales contracts/agreements (Salesforce, HubSpot, Dynamics)
const contractFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Contract Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'contractNumber',
    label: 'Contract Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'in_review', label: 'In Review' },
        { value: 'activated', label: 'Activated' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },
  {
    name: 'startDate',
    label: 'Start Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'endDate',
    label: 'End Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'contractTerm',
    label: 'Contract Term (months)',
    type: RichFieldType.INTEGER,
    config: { min: 1 },
    design: { columns: 6 },
  },

  // ============================================
  // Financial Information
  // ============================================
  {
    name: 'totalValue',
    label: 'Total Value',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Renewal Information
  // ============================================
  {
    name: 'renewalTerm',
    label: 'Renewal Term (months)',
    type: RichFieldType.INTEGER,
    config: { min: 1 },
    design: { columns: 6 },
  },
  {
    name: 'autoRenewal',
    label: 'Auto Renewal',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Description & Terms
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'terms',
    label: 'Contract Terms & Conditions',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },
];

export const CONTRACT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CONTRACT,
  displayName: 'Contract',
  description: 'Sales contract or agreement. Supports Salesforce, HubSpot, and Dynamics CRM systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: contractFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Contract Information',
          fields: ['name', 'contractNumber', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'opportunityId', 'opportunityName', 'contactId', 'contactName'],
        },
        {
          id: 'dates',
          label: 'Dates & Term',
          fields: ['startDate', 'endDate', 'contractTerm'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['totalValue', 'currency'],
        },
        {
          id: 'renewal',
          label: 'Renewal Information',
          fields: ['renewalTerm', 'autoRenewal'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'content',
          label: 'Description & Terms',
          fields: ['description', 'terms'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'terms'],
    },
  },
  icon: 'file-text',
  color: '#10b981',
  tags: ['contract', 'sales', 'agreement', 'crm'],
};

/**
 * Embedding Template for c_contract
 * Used for vector search and AI insights on contracts
 */
export const CONTRACT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Contract Embedding Template',
  description: 'Embedding template for sales contracts. Enables search and analysis of contract data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'terms', weight: 0.8, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'contractNumber', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Contracts use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_account',
    weight: 0.3,
    fields: ['name', 'industry'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_order - Sales Order
// ============================================
// Sales orders (Salesforce, HubSpot, Dynamics)
const orderFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Order Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'orderNumber',
    label: 'Order Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'quoteId',
    label: 'Quote',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_quote',
    },
    design: { columns: 6 },
  },
  {
    name: 'quoteName',
    label: 'Quote Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from quoteId
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },
  {
    name: 'orderDate',
    label: 'Order Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'shipDate',
    label: 'Ship Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'deliveryDate',
    label: 'Delivery Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Financial Information
  // ============================================
  {
    name: 'totalAmount',
    label: 'Total Amount',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Addresses
  // ============================================
  {
    name: 'billingAddress',
    label: 'Billing Address',
    type: RichFieldType.JSON,
    design: { columns: 6 },
  },
  {
    name: 'shippingAddress',
    label: 'Shipping Address',
    type: RichFieldType.JSON,
    design: { columns: 6 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const ORDER_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ORDER,
  displayName: 'Order',
  description: 'Sales order. Supports Salesforce, HubSpot, and Dynamics CRM systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: orderFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Order Information',
          fields: ['name', 'orderNumber', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'opportunityId', 'opportunityName', 'quoteId', 'quoteName'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['orderDate', 'shipDate', 'deliveryDate'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['totalAmount', 'currency'],
        },
        {
          id: 'addresses',
          label: 'Addresses',
          fields: ['billingAddress', 'shippingAddress'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'shopping-cart',
  color: '#3b82f6',
  tags: ['order', 'sales', 'crm'],
};

/**
 * Embedding Template for c_order
 * Used for vector search and AI insights on orders
 */
export const ORDER_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Order Embedding Template',
  description: 'Embedding template for sales orders. Enables search and analysis of order data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'orderNumber', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Orders use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_account',
    weight: 0.3,
    fields: ['name', 'industry'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_invoice - Invoice
// ============================================
// Invoices (Salesforce, QuickBooks, NetSuite)
const invoiceFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Invoice Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'invoiceNumber',
    label: 'Invoice Number',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'orderId',
    label: 'Order',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_order',
    },
    design: { columns: 6 },
  },
  {
    name: 'orderName',
    label: 'Order Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from orderId
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'void', label: 'Void' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },
  {
    name: 'invoiceDate',
    label: 'Invoice Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'dueDate',
    label: 'Due Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'paidDate',
    label: 'Paid Date',
    type: RichFieldType.DATE,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Financial Information
  // ============================================
  {
    name: 'subtotal',
    label: 'Subtotal',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'tax',
    label: 'Tax',
    type: RichFieldType.CURRENCY,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'total',
    label: 'Total Amount',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'amountPaid',
    label: 'Amount Paid',
    type: RichFieldType.CURRENCY,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'balance',
    label: 'Balance',
    type: RichFieldType.CURRENCY,
    config: { readOnly: true }, // Calculated: total - amountPaid
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Billing Address
  // ============================================
  {
    name: 'billingAddress',
    label: 'Billing Address',
    type: RichFieldType.JSON,
    design: { columns: 12 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Description & Terms
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'terms',
    label: 'Payment Terms',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, maxLength: 2000 },
    design: { columns: 12 },
  },
];

export const INVOICE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.INVOICE,
  displayName: 'Invoice',
  description: 'Invoice. Supports Salesforce, QuickBooks, and NetSuite systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: invoiceFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Invoice Information',
          fields: ['name', 'invoiceNumber', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'orderId', 'orderName', 'opportunityId', 'opportunityName'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['invoiceDate', 'dueDate', 'paidDate'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['subtotal', 'tax', 'total', 'amountPaid', 'balance', 'currency'],
        },
        {
          id: 'billing',
          label: 'Billing Address',
          fields: ['billingAddress'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'content',
          label: 'Description & Terms',
          fields: ['description', 'terms'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'terms'],
    },
  },
  icon: 'file-invoice',
  color: '#8b5cf6',
  tags: ['invoice', 'billing', 'payment', 'accounting'],
};

/**
 * Embedding Template for c_invoice
 * Used for vector search and AI insights on invoices
 */
export const INVOICE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Invoice Embedding Template',
  description: 'Embedding template for invoices. Enables search and analysis of invoice data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'terms', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'invoiceNumber', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Invoices use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_account',
    weight: 0.3,
    fields: ['name', 'industry'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_payment - Payment
// ============================================
// Payments (Salesforce, QuickBooks, Stripe)
const paymentFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Payment Reference',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'paymentNumber',
    label: 'Payment Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'invoiceId',
    label: 'Invoice',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_invoice',
    },
    design: { columns: 6 },
  },
  {
    name: 'invoiceName',
    label: 'Invoice Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from invoiceId
    design: { columns: 6 },
  },
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },

  // ============================================
  // Payment Information
  // ============================================
  {
    name: 'paymentMethod',
    label: 'Payment Method',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'check', label: 'Check' },
        { value: 'cash', label: 'Cash' },
        { value: 'wire_transfer', label: 'Wire Transfer' },
        { value: 'ach', label: 'ACH' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'paymentType',
    label: 'Payment Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'full', label: 'Full Payment' },
        { value: 'partial', label: 'Partial Payment' },
        { value: 'refund', label: 'Refund' },
        { value: 'chargeback', label: 'Chargeback' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'pending',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Dates & Financial
  // ============================================
  {
    name: 'paymentDate',
    label: 'Payment Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'amount',
    label: 'Amount',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },
  {
    name: 'transactionId',
    label: 'Transaction ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const PAYMENT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.PAYMENT,
  displayName: 'Payment',
  description: 'Payment. Supports Salesforce, QuickBooks, and Stripe systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: paymentFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Payment Information',
          fields: ['name', 'paymentNumber', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['invoiceId', 'invoiceName', 'accountId', 'accountName'],
        },
        {
          id: 'payment_details',
          label: 'Payment Details',
          fields: ['paymentMethod', 'paymentType', 'paymentDate'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['amount', 'currency', 'transactionId'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'credit-card',
  color: '#10b981',
  tags: ['payment', 'transaction', 'billing', 'accounting'],
};

/**
 * Embedding Template for c_payment
 * Used for vector search and AI insights on payments
 */
export const PAYMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Payment Embedding Template',
  description: 'Embedding template for payments. Enables search and analysis of payment data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'paymentMethod', weight: 0.5, include: true },
    { name: 'paymentNumber', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Payments use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_invoice',
    weight: 0.3,
    fields: ['name', 'invoiceNumber'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_revenue - Revenue Recognition
// ============================================
// Revenue recognition (Salesforce Revenue Cloud, NetSuite)
const revenueFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Revenue Recognition Entry',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'contractId',
    label: 'Contract',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contract',
    },
    design: { columns: 6 },
  },
  {
    name: 'contractName',
    label: 'Contract Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contractId
    design: { columns: 6 },
  },
  {
    name: 'orderId',
    label: 'Order',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_order',
    },
    design: { columns: 6 },
  },
  {
    name: 'orderName',
    label: 'Order Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from orderId
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },

  // ============================================
  // Revenue Type & Recognition Method
  // ============================================
  {
    name: 'revenueType',
    label: 'Revenue Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'recurring', label: 'Recurring' },
        { value: 'one_time', label: 'One-Time' },
        { value: 'usage_based', label: 'Usage-Based' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'recognitionMethod',
    label: 'Recognition Method',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'ratable', label: 'Ratable' },
        { value: 'point_in_time', label: 'Point in Time' },
        { value: 'milestone', label: 'Milestone' },
        { value: 'percentage_of_completion', label: 'Percentage of Completion' },
        { value: 'completed_contract', label: 'Completed Contract' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'recognized', label: 'Recognized' },
        { value: 'deferred', label: 'Deferred' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'scheduled',
    },
    design: { columns: 6 },
  },
  {
    name: 'recognitionDate',
    label: 'Recognition Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },

  // ============================================
  // Financial Information
  // ============================================
  {
    name: 'amount',
    label: 'Amount',
    type: RichFieldType.CURRENCY,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const REVENUE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.REVENUE,
  displayName: 'Revenue Recognition',
  description: 'Revenue recognition entry. Supports Salesforce Revenue Cloud and NetSuite systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: revenueFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Revenue Information',
          fields: ['name', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['contractId', 'contractName', 'orderId', 'orderName', 'opportunityId', 'opportunityName', 'accountId', 'accountName'],
        },
        {
          id: 'recognition',
          label: 'Recognition Details',
          fields: ['revenueType', 'recognitionMethod', 'recognitionDate'],
        },
        {
          id: 'financial',
          label: 'Financial Information',
          fields: ['amount', 'currency'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'trending-up',
  color: '#10b981',
  tags: ['revenue', 'recognition', 'accounting', 'finance'],
};

/**
 * Embedding Template for c_revenue
 * Used for vector search and AI insights on revenue recognition
 */
export const REVENUE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Revenue Embedding Template',
  description: 'Embedding template for revenue recognition. Enables search and analysis of revenue data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'revenueType', weight: 0.7, include: true },
    { name: 'recognitionMethod', weight: 0.6, include: true },
    { name: 'status', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Revenue uses default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_contract',
    weight: 0.3,
    fields: ['name', 'totalValue'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_call - Phone Call
// ============================================
// Phone calls (Salesforce, HubSpot, RingCentral, Aircall)
// Separate from c_meeting because calls are typically 1-on-1 phone conversations
const callFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Call Subject',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },

  // ============================================
  // Call Details
  // ============================================
  {
    name: 'callDirection',
    label: 'Call Direction',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'incoming', label: 'Incoming' },
        { value: 'outgoing', label: 'Outgoing' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'no_answer', label: 'No Answer' },
        { value: 'busy', label: 'Busy' },
        { value: 'failed', label: 'Failed' },
        { value: 'missed', label: 'Missed' },
      ],
      default: 'completed',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Timing
  // ============================================
  {
    name: 'startTime',
    label: 'Start Time',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'endTime',
    label: 'End Time',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'duration',
    label: 'Duration (seconds)',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },

  // ============================================
  // Phone Numbers
  // ============================================
  {
    name: 'fromNumber',
    label: 'From Number',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'toNumber',
    label: 'To Number',
    type: RichFieldType.PHONE,
    design: { columns: 6 },
  },
  {
    name: 'fromName',
    label: 'From Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'toName',
    label: 'To Name',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'leadId',
    label: 'Lead',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_lead',
    },
    design: { columns: 6 },
  },
  {
    name: 'leadName',
    label: 'Lead Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from leadId
    design: { columns: 6 },
  },
  {
    name: 'opportunityId',
    label: 'Opportunity',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_opportunity',
    },
    design: { columns: 6 },
  },
  {
    name: 'opportunityName',
    label: 'Opportunity Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from opportunityId
    design: { columns: 6 },
  },

  // ============================================
  // Recording & Content
  // ============================================
  {
    name: 'recordingUrl',
    label: 'Recording URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'transcript',
    label: 'Transcript',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },

  // ============================================
  // Ownership
  // ============================================
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Call Notes',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const CALL_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.CALL,
  displayName: 'Call',
  description: 'Phone call. Separate from c_meeting because calls are typically 1-on-1 phone conversations, while meetings are multi-party video/audio sessions. Supports Salesforce, HubSpot, RingCentral, and Aircall.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: callFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Call Information',
          fields: ['name', 'callDirection', 'status'],
        },
        {
          id: 'timing',
          label: 'Timing',
          fields: ['startTime', 'endTime', 'duration'],
        },
        {
          id: 'phone_numbers',
          label: 'Phone Numbers',
          fields: ['fromNumber', 'toNumber', 'fromName', 'toName'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['accountId', 'accountName', 'contactId', 'contactName', 'leadId', 'leadName', 'opportunityId', 'opportunityName'],
        },
        {
          id: 'recording',
          label: 'Recording & Transcript',
          fields: ['recordingUrl', 'transcript'],
        },
        {
          id: 'ownership',
          label: 'Ownership',
          fields: ['ownerId', 'ownerName'],
        },
        {
          id: 'notes',
          label: 'Call Notes',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'transcript'],
    },
  },
  icon: 'phone',
  color: '#3b82f6',
  tags: ['call', 'phone', 'communication', 'crm'],
};

/**
 * Embedding Template for c_call
 * Used for vector search and AI insights on calls
 */
export const CALL_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Call Embedding Template',
  description: 'Embedding template for phone calls. Enables search and analysis of call data and transcripts.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'transcript', weight: 0.9, include: true, preprocess: { maxLength: 4000, stripFormatting: true } },
    { name: 'description', weight: 0.8, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'callDirection', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Calls use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_contact',
    weight: 0.3,
    fields: ['name', 'phone'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_webinar - Webinar
// ============================================
// Webinars (Zoom, GoToWebinar, HubSpot)
const webinarFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Webinar Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'webinarId',
    label: 'Webinar ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'platform',
    label: 'Platform',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'zoom', label: 'Zoom' },
        { value: 'gotowebinar', label: 'GoToWebinar' },
        { value: 'hubspot', label: 'HubSpot' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'webinarUrl',
    label: 'Webinar URL',
    type: RichFieldType.URL,
    required: true,
    design: { columns: 12 },
  },

  // ============================================
  // Timing
  // ============================================
  {
    name: 'startDateTime',
    label: 'Start Date/Time',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'endDateTime',
    label: 'End Date/Time',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'duration',
    label: 'Duration (minutes)',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'scheduled',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Content
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'agenda',
    label: 'Agenda',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },

  // ============================================
  // Metrics
  // ============================================
  {
    name: 'registrationCount',
    label: 'Registration Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'attendeeCount',
    label: 'Attendee Count',
    type: RichFieldType.INTEGER,
    config: { readOnly: true, min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'recordingUrl',
    label: 'Recording URL',
    type: RichFieldType.URL,
    config: { readOnly: true },
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'organizerId',
    label: 'Organizer',
    type: RichFieldType.USER,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'organizerName',
    label: 'Organizer Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from organizerId
    design: { columns: 6 },
  },
  {
    name: 'campaignId',
    label: 'Campaign',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_campaign',
    },
    design: { columns: 6 },
  },
  {
    name: 'campaignName',
    label: 'Campaign Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from campaignId
    design: { columns: 6 },
  },
];

export const WEBINAR_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.WEBINAR,
  displayName: 'Webinar',
  description: 'Webinar. Supports Zoom, GoToWebinar, and HubSpot platforms.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: webinarFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Webinar Information',
          fields: ['name', 'webinarId', 'platform', 'webinarUrl'],
        },
        {
          id: 'timing',
          label: 'Timing',
          fields: ['startDateTime', 'endDateTime', 'duration', 'status'],
        },
        {
          id: 'content',
          label: 'Content',
          fields: ['description', 'agenda'],
        },
        {
          id: 'metrics',
          label: 'Metrics',
          fields: ['registrationCount', 'attendeeCount', 'recordingUrl'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['organizerId', 'organizerName', 'campaignId', 'campaignName'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'agenda'],
    },
  },
  icon: 'video',
  color: '#8b5cf6',
  tags: ['webinar', 'marketing', 'event'],
};

/**
 * Embedding Template for c_webinar
 * Used for vector search and AI insights on webinars
 */
export const WEBINAR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Webinar Embedding Template',
  description: 'Embedding template for webinars. Enables search and analysis of webinar data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'agenda', weight: 0.8, include: true, preprocess: { maxLength: 3000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'platform', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Webinars use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_campaign',
    weight: 0.3,
    fields: ['name', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_marketingAsset - Marketing Asset
// ============================================
// Marketing materials/content (HubSpot, Marketo, Salesforce)
const marketingAssetFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Asset Name/Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'assetType',
    label: 'Asset Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'whitepaper', label: 'Whitepaper' },
        { value: 'ebook', label: 'eBook' },
        { value: 'blog_post', label: 'Blog Post' },
        { value: 'video', label: 'Video' },
        { value: 'infographic', label: 'Infographic' },
        { value: 'case_study', label: 'Case Study' },
        { value: 'webinar_recording', label: 'Webinar Recording' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },

  // ============================================
  // Content
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
  {
    name: 'content',
    label: 'Content/Summary',
    type: RichFieldType.TEXTAREA,
    config: { rows: 6, maxLength: 10000 },
    design: { columns: 12 },
  },
  {
    name: 'url',
    label: 'Asset URL',
    type: RichFieldType.URL,
    design: { columns: 12 },
  },

  // ============================================
  // File Reference
  // ============================================
  {
    name: 'fileId',
    label: 'File',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_file',
    },
    design: { columns: 6 },
  },
  {
    name: 'fileName',
    label: 'File Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from fileId
    design: { columns: 6 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'campaignId',
    label: 'Campaign',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_campaign',
    },
    design: { columns: 6 },
  },
  {
    name: 'campaignName',
    label: 'Campaign Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from campaignId
    design: { columns: 6 },
  },

  // ============================================
  // Tags & Ownership
  // ============================================
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'ownerId',
    label: 'Owner',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'ownerName',
    label: 'Owner Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from ownerId
    design: { columns: 6 },
  },
];

export const MARKETING_ASSET_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.MARKETING_ASSET,
  displayName: 'Marketing Asset',
  description: 'Marketing materials and content. Supports HubSpot, Marketo, and Salesforce systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: marketingAssetFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Asset Information',
          fields: ['name', 'assetType', 'status'],
        },
        {
          id: 'content',
          label: 'Content',
          fields: ['description', 'content', 'url'],
        },
        {
          id: 'file',
          label: 'File Reference',
          fields: ['fileId', 'fileName'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['campaignId', 'campaignName'],
        },
        {
          id: 'metadata',
          label: 'Tags & Ownership',
          fields: ['tags', 'ownerId', 'ownerName'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'content'],
    },
  },
  icon: 'file-text',
  color: '#8b5cf6',
  tags: ['marketing', 'asset', 'content'],
};

/**
 * Embedding Template for c_marketingAsset
 * Used for vector search and AI insights on marketing assets
 */
export const MARKETING_ASSET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Marketing Asset Embedding Template',
  description: 'Embedding template for marketing assets. Enables search and analysis of marketing content.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'content', weight: 0.9, include: true, preprocess: { maxLength: 4000, stripFormatting: true } },
    { name: 'assetType', weight: 0.6, include: true },
    { name: 'status', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Marketing assets use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_campaign',
    weight: 0.3,
    fields: ['name', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_eventRegistration - Event Registration
// ============================================
// Event registrations (Eventbrite, HubSpot, Salesforce)
const eventRegistrationFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Registration Identifier',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },

  // ============================================
  // Event Relationship
  // ============================================
  {
    name: 'eventId',
    label: 'Event',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_event',
    },
    design: { columns: 6 },
  },
  {
    name: 'eventName',
    label: 'Event Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from eventId
    design: { columns: 6 },
  },

  // ============================================
  // Registrant Information
  // ============================================
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'leadId',
    label: 'Lead',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_lead',
    },
    design: { columns: 6 },
  },
  {
    name: 'leadName',
    label: 'Lead Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from leadId
    design: { columns: 6 },
  },
  {
    name: 'email',
    label: 'Email',
    type: RichFieldType.EMAIL,
    required: true,
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'registered', label: 'Registered' },
        { value: 'attended', label: 'Attended' },
        { value: 'no_show', label: 'No Show' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      default: 'registered',
    },
    design: { columns: 6 },
  },
  {
    name: 'registrationDate',
    label: 'Registration Date',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'checkInTime',
    label: 'Check-In Time',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },

  // ============================================
  // Ticket Information
  // ============================================
  {
    name: 'ticketType',
    label: 'Ticket Type',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'ticketPrice',
    label: 'Ticket Price',
    type: RichFieldType.CURRENCY,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },

  // ============================================
  // Notes
  // ============================================
  {
    name: 'notes',
    label: 'Notes',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const EVENT_REGISTRATION_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.EVENT_REGISTRATION,
  displayName: 'Event Registration',
  description: 'Event registration. Supports Eventbrite, HubSpot, and Salesforce systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: eventRegistrationFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Registration Information',
          fields: ['name', 'eventId', 'eventName'],
        },
        {
          id: 'registrant',
          label: 'Registrant Information',
          fields: ['contactId', 'contactName', 'leadId', 'leadName', 'email'],
        },
        {
          id: 'status_dates',
          label: 'Status & Dates',
          fields: ['status', 'registrationDate', 'checkInTime'],
        },
        {
          id: 'ticket',
          label: 'Ticket Information',
          fields: ['ticketType', 'ticketPrice', 'currency'],
        },
        {
          id: 'notes',
          label: 'Notes',
          fields: ['notes'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'email', 'notes'],
    },
  },
  icon: 'calendar-check',
  color: '#8b5cf6',
  tags: ['event', 'registration', 'marketing'],
};

/**
 * Embedding Template for c_eventRegistration
 * Used for vector search and AI insights on event registrations
 */
export const EVENT_REGISTRATION_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Event Registration Embedding Template',
  description: 'Embedding template for event registrations. Enables search and analysis of registration data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'email', weight: 0.8, include: true },
    { name: 'notes', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'status', weight: 0.6, include: true },
    { name: 'ticketType', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Event registrations use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_event',
    weight: 0.3,
    fields: ['name', 'description'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_leadScore - Lead Score
// ============================================
// Lead scoring models (HubSpot, Marketo, Salesforce)
const leadScoreFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Score Name/Model Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },

  // ============================================
  // Lead Relationship
  // ============================================
  {
    name: 'leadId',
    label: 'Lead',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_lead',
    },
    design: { columns: 6 },
  },
  {
    name: 'leadName',
    label: 'Lead Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from leadId
    design: { columns: 6 },
  },

  // ============================================
  // Score Information
  // ============================================
  {
    name: 'score',
    label: 'Score',
    type: RichFieldType.INTEGER,
    required: true,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'scoreType',
    label: 'Score Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'behavioral', label: 'Behavioral' },
        { value: 'fit', label: 'Fit' },
        { value: 'engagement', label: 'Engagement' },
        { value: 'composite', label: 'Composite' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'modelVersion',
    label: 'Model Version',
    type: RichFieldType.TEXT,
    config: { maxLength: 100 },
    design: { columns: 6 },
  },
  {
    name: 'calculatedDate',
    label: 'Calculated Date',
    type: RichFieldType.DATETIME,
    required: true,
    design: { columns: 6 },
  },

  // ============================================
  // Scoring Factors
  // ============================================
  {
    name: 'factors',
    label: 'Scoring Factors',
    type: RichFieldType.JSON,
    design: { columns: 12 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const LEAD_SCORE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.LEAD_SCORE,
  displayName: 'Lead Score',
  description: 'Lead scoring model entry. Supports HubSpot, Marketo, and Salesforce systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: leadScoreFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Score Information',
          fields: ['name', 'leadId', 'leadName'],
        },
        {
          id: 'score_details',
          label: 'Score Details',
          fields: ['score', 'scoreType', 'modelVersion', 'calculatedDate'],
        },
        {
          id: 'factors',
          label: 'Scoring Factors',
          fields: ['factors'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'trending-up',
  color: '#8b5cf6',
  tags: ['lead', 'score', 'scoring', 'marketing'],
};

/**
 * Embedding Template for c_leadScore
 * Used for vector search and AI insights on lead scores
 */
export const LEAD_SCORE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Lead Score Embedding Template',
  description: 'Embedding template for lead scores. Enables search and analysis of scoring data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'scoreType', weight: 0.7, include: true },
    { name: 'modelVersion', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Lead scores use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_lead',
    weight: 0.3,
    fields: ['name', 'email', 'company'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_priceBook - Price Book
// ============================================
// Price books (Salesforce, HubSpot)
// Price book entries (c_priceBookEntry) would link products to price books with specific prices
const priceBookFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Price Book Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    required: true,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'isStandard',
    label: 'Standard Price Book',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },

  // ============================================
  // Currency & Validity
  // ============================================
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
        { value: 'CHF', label: 'CHF - Swiss Franc' },
        { value: 'CNY', label: 'CNY - Chinese Yuan' },
        { value: 'INR', label: 'INR - Indian Rupee' },
        { value: 'BRL', label: 'BRL - Brazilian Real' },
        { value: 'MXN', label: 'MXN - Mexican Peso' },
        { value: 'other', label: 'Other' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'validFrom',
    label: 'Valid From',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'validTo',
    label: 'Valid To',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
];

export const PRICE_BOOK_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.PRICE_BOOK,
  displayName: 'Price Book',
  description: 'Price book. Price book entries (c_priceBookEntry) would link products to price books with specific prices. Supports Salesforce and HubSpot systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: priceBookFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Price Book Information',
          fields: ['name', 'isActive', 'isStandard'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
        {
          id: 'currency_validity',
          label: 'Currency & Validity',
          fields: ['currency', 'validFrom', 'validTo'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'book',
  color: '#10b981',
  tags: ['price', 'book', 'pricing', 'product'],
};

/**
 * Embedding Template for c_priceBook
 * Used for vector search and AI insights on price books
 */
export const PRICE_BOOK_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Price Book Embedding Template',
  description: 'Embedding template for price books. Enables search and analysis of pricing data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'currency', weight: 0.5, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Price books use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_product',
    weight: 0.25,
    fields: ['name', 'category'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// c_asset - Installed Product/Asset
// ============================================
// Installed products/assets (Salesforce, HubSpot)
const assetFields: RichFieldDefinition[] = [
  // ============================================
  // Core Identification Fields
  // ============================================
  {
    name: 'name',
    label: 'Asset Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },

  // ============================================
  // Relationships
  // ============================================
  {
    name: 'productId',
    label: 'Product',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_product',
    },
    design: { columns: 6 },
  },
  {
    name: 'productName',
    label: 'Product Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from productId
    design: { columns: 6 },
  },
  {
    name: 'accountId',
    label: 'Account',
    type: RichFieldType.REFERENCE,
    required: true,
    config: {
      targetShardType: 'c_account',
    },
    design: { columns: 6 },
  },
  {
    name: 'accountName',
    label: 'Account Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from accountId
    design: { columns: 6 },
  },
  {
    name: 'contactId',
    label: 'Contact',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_contact',
    },
    design: { columns: 6 },
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from contactId
    design: { columns: 6 },
  },
  {
    name: 'orderId',
    label: 'Order',
    type: RichFieldType.REFERENCE,
    config: {
      targetShardType: 'c_order',
    },
    design: { columns: 6 },
  },
  {
    name: 'orderName',
    label: 'Order Name',
    type: RichFieldType.TEXT,
    config: { readOnly: true }, // Auto-generated from orderId
    design: { columns: 6 },
  },

  // ============================================
  // Status & Dates
  // ============================================
  {
    name: 'status',
    label: 'Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'purchased', label: 'Purchased' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'installed', label: 'Installed' },
        { value: 'obsolete', label: 'Obsolete' },
      ],
      default: 'purchased',
    },
    design: { columns: 6 },
  },
  {
    name: 'purchaseDate',
    label: 'Purchase Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },
  {
    name: 'installDate',
    label: 'Install Date',
    type: RichFieldType.DATE,
    design: { columns: 6 },
  },

  // ============================================
  // Quantity & Pricing
  // ============================================
  {
    name: 'quantity',
    label: 'Quantity',
    type: RichFieldType.INTEGER,
    required: true,
    config: { min: 1 },
    design: { columns: 6 },
  },
  {
    name: 'price',
    label: 'Price',
    type: RichFieldType.CURRENCY,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'serialNumber',
    label: 'Serial Number',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },

  // ============================================
  // Description
  // ============================================
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, maxLength: 5000 },
    design: { columns: 12 },
  },
];

export const ASSET_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ASSET,
  displayName: 'Asset',
  description: 'Installed product or asset. Supports Salesforce and HubSpot systems.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: assetFields,
    formLayout: {
      columns: 12,
      groups: [
        {
          id: 'main',
          label: 'Asset Information',
          fields: ['name', 'status'],
        },
        {
          id: 'relationships',
          label: 'Relationships',
          fields: ['productId', 'productName', 'accountId', 'accountName', 'contactId', 'contactName', 'orderId', 'orderName'],
        },
        {
          id: 'dates',
          label: 'Dates',
          fields: ['purchaseDate', 'installDate'],
        },
        {
          id: 'quantity_pricing',
          label: 'Quantity & Pricing',
          fields: ['quantity', 'price', 'serialNumber'],
        },
        {
          id: 'description',
          label: 'Description',
          fields: ['description'],
        },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description', 'serialNumber'],
    },
  },
  icon: 'package',
  color: '#10b981',
  tags: ['asset', 'product', 'installed'],
};

/**
 * Embedding Template for c_asset
 * Used for vector search and AI insights on assets
 */
export const ASSET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Asset Embedding Template',
  description: 'Embedding template for installed products/assets. Enables search and analysis of asset data.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'serialNumber', weight: 0.7, include: true },
    { name: 'status', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default', // Assets use default model (cost-effective)
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  parentContext: {
    mode: 'whenScoped',
    sourceShardType: 'c_account',
    weight: 0.3,
    fields: ['name', 'industry'],
    asContextPrefix: true,
    separator: ' — ',
    maxLength: 120,
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// integration.state - Integration State Shard Type (Phase 2)
const integrationStateFields: RichFieldDefinition[] = [
  {
    name: 'integrationId',
    label: 'Integration ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'integrationType',
    label: 'Integration Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'salesforce', label: 'Salesforce' },
        { value: 'gdrive', label: 'Google Drive' },
        { value: 'slack', label: 'Slack' },
        { value: 'sharepoint', label: 'SharePoint' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'cursor',
    label: 'Sync Cursor/Token',
    type: RichFieldType.TEXT,
    config: { maxLength: 1000 },
    design: { columns: 12 },
  },
  {
    name: 'lastSyncAt',
    label: 'Last Sync At',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'lastSyncStatus',
    label: 'Last Sync Status',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'success', label: 'Success' },
        { value: 'failed', label: 'Failed' },
        { value: 'partial', label: 'Partial' },
      ],
      default: 'success',
    },
    design: { columns: 6 },
  },
  {
    name: 'errorMessage',
    label: 'Error Message',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12, conditionalVisibility: { field: 'lastSyncStatus', value: 'failed' } },
  },
  {
    name: 'nextSyncAt',
    label: 'Next Sync At',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'metadata',
    label: 'Metadata',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4 },
    design: { columns: 6 },
  },
];

export const INTEGRATION_STATE_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.INTEGRATION_STATE,
  displayName: 'Integration State',
  description: 'Store integration cursors, tokens, sync state, and metadata',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: integrationStateFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Integration Information', fields: ['integrationId', 'integrationType'] },
        { id: 'sync', label: 'Sync State', fields: ['cursor', 'lastSyncAt', 'lastSyncStatus', 'errorMessage', 'nextSyncAt'] },
        { id: 'metadata', label: 'Metadata', fields: ['metadata'] },
      ],
    },
    embedding: {
      enabled: false,
    },
  },
  icon: 'settings',
  color: '#6b7280',
  tags: ['integration', 'state', 'sync', 'system'],
};

// system.metric - System Metric Shard Type (Phase 2)
const systemMetricFields: RichFieldDefinition[] = [
  {
    name: 'metricType',
    label: 'Metric Type',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'value',
    label: 'Value',
    type: RichFieldType.FLOAT,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'timestamp',
    label: 'Timestamp',
    type: RichFieldType.DATETIME,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'period',
    label: 'Period',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'minute', label: 'Minute' },
        { value: 'hour', label: 'Hour' },
        { value: 'day', label: 'Day' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'metadata',
    label: 'Metadata',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
];

export const SYSTEM_METRIC_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.SYSTEM_METRIC,
  displayName: 'System Metric',
  description: 'Observability metric stored as a shard for historical analysis',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: systemMetricFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Metric Information', fields: ['metricType', 'value', 'timestamp', 'period'] },
        { id: 'metadata', label: 'Metadata', fields: ['metadata'] },
      ],
    },
    embedding: {
      enabled: false,
    },
  },
  icon: 'bar-chart',
  color: '#6b7280',
  tags: ['system', 'metric', 'observability'],
};

// system.audit_log - System Audit Log Shard Type (Phase 2)
const systemAuditLogFields: RichFieldDefinition[] = [
  {
    name: 'eventType',
    label: 'Event Type',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'targetShardId',
    label: 'Target Shard ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'targetShardTypeId',
    label: 'Target Shard Type',
    type: RichFieldType.TEXT,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'action',
    label: 'Action',
    type: RichFieldType.TEXT,
    required: true,
    config: { readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'changes',
    label: 'Changes',
    type: RichFieldType.TEXTAREA,
    config: { rows: 4, readOnly: true },
    design: { columns: 12 },
  },
  {
    name: 'metadata',
    label: 'Metadata',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3, readOnly: true },
    design: { columns: 12 },
  },
];

export const SYSTEM_AUDIT_LOG_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.SYSTEM_AUDIT_LOG,
  displayName: 'Audit Log',
  description: 'Audit trail entry stored as a shard for compliance and governance',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: systemAuditLogFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Audit Information', fields: ['eventType', 'targetShardId', 'targetShardTypeId', 'action'] },
        { id: 'details', label: 'Details', fields: ['changes', 'metadata'] },
      ],
    },
    embedding: {
      enabled: false,
    },
  },
  icon: 'file-text',
  color: '#6b7280',
  tags: ['system', 'audit', 'governance', 'compliance'],
};

// c_insight_kpi - KPI Insight Shard Type (Phase 2)
const insightKpiFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'KPI Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'value',
    label: 'Value',
    type: RichFieldType.FLOAT,
    required: true,
    config: { decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'trend',
    label: 'Trend',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'up', label: 'Up' },
        { value: 'down', label: 'Down' },
        { value: 'stable', label: 'Stable' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'period',
    label: 'Period',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'unit',
    label: 'Unit',
    type: RichFieldType.TEXT,
    config: { maxLength: 50 },
    design: { columns: 6 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { rows: 3 },
    design: { columns: 12 },
  },
];

export const INSIGHT_KPI_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.INSIGHT_KPI,
  displayName: 'KPI Insight',
  description: 'Key Performance Indicator with value, trend, and provenance',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: insightKpiFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'KPI Information', fields: ['name', 'value', 'trend', 'period', 'unit'] },
        { id: 'description', label: 'Description', fields: ['description'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'trending-up',
  color: '#10b981',
  tags: ['insight', 'kpi', 'metrics', 'analytics'],
};

// ============================================
// Risk Analysis Shard Types
// ============================================

// c_risk_catalog - Risk Catalog Definition
const riskCatalogFields: RichFieldDefinition[] = [
  {
    name: 'catalogType',
    label: 'Catalog Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'global', label: 'Global' },
        { value: 'industry', label: 'Industry' },
        { value: 'tenant', label: 'Tenant' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'industryId',
    label: 'Industry ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 4 },
  },
  {
    name: 'riskId',
    label: 'Risk ID',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 4 },
  },
  {
    name: 'name',
    label: 'Risk Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { rows: 4 },
    design: { columns: 12 },
  },
  {
    name: 'category',
    label: 'Category',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'Commercial', label: 'Commercial' },
        { value: 'Technical', label: 'Technical' },
        { value: 'Legal', label: 'Legal' },
        { value: 'Financial', label: 'Financial' },
        { value: 'Competitive', label: 'Competitive' },
        { value: 'Operational', label: 'Operational' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'defaultPonderation',
    label: 'Default Weight',
    type: RichFieldType.FLOAT,
    required: true,
    config: { min: 0, max: 1, decimalPlaces: 3 },
    design: { columns: 6 },
  },
  {
    name: 'sourceShardTypes',
    label: 'Source Shard Types',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: false },
    design: { columns: 12 },
  },
  {
    name: 'explainabilityTemplate',
    label: 'Explainability Template',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    required: true,
    config: { default: true },
    design: { columns: 6 },
  },
];

export const RISK_CATALOG_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.RISK_CATALOG,
  displayName: 'Risk Catalog',
  description: 'Risk catalog definition (global, industry, or tenant-specific)',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: riskCatalogFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Catalog Information', fields: ['catalogType', 'industryId', 'riskId', 'name', 'description'] },
        { id: 'configuration', label: 'Configuration', fields: ['category', 'defaultPonderation', 'sourceShardTypes'] },
        { id: 'explainability', label: 'Explainability', fields: ['explainabilityTemplate'] },
        { id: 'status', label: 'Status', fields: ['isActive'] },
      ],
    },
    embedding: {
      enabled: true,
      fields: ['name', 'description'],
    },
  },
  icon: 'alert-triangle',
  color: '#ef4444',
  tags: ['risk', 'catalog', 'analysis'],
};

// c_risk_snapshot - Historical Risk Snapshot
const riskSnapshotFields: RichFieldDefinition[] = [
  {
    name: 'opportunityId',
    label: 'Opportunity ID',
    type: RichFieldType.REFERENCE,
    required: true,
    config: { shardTypeId: 'c_opportunity' },
    design: { columns: 12 },
  },
  {
    name: 'snapshotDate',
    label: 'Snapshot Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 6 },
  },
  {
    name: 'riskScore',
    label: 'Risk Score',
    type: RichFieldType.FLOAT,
    required: true,
    config: { min: 0, max: 1, decimalPlaces: 3 },
    design: { columns: 6 },
  },
  {
    name: 'revenueAtRisk',
    label: 'Revenue at Risk',
    type: RichFieldType.FLOAT,
    required: true,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
];

export const RISK_SNAPSHOT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT,
  displayName: 'Risk Snapshot',
  description: 'Immutable historical snapshot of risk evaluation',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: riskSnapshotFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Snapshot Information', fields: ['opportunityId', 'snapshotDate', 'riskScore', 'revenueAtRisk'] },
      ],
    },
  },
  icon: 'camera',
  color: '#6b7280',
  tags: ['risk', 'snapshot', 'history'],
};

// c_quota - Quota Definition
const quotaFields: RichFieldDefinition[] = [
  {
    name: 'quotaType',
    label: 'Quota Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'individual', label: 'Individual' },
        { value: 'team', label: 'Team' },
        { value: 'tenant', label: 'Tenant' },
      ],
    },
    design: { columns: 4 },
  },
  {
    name: 'targetUserId',
    label: 'Target User ID',
    type: RichFieldType.USER,
    design: { columns: 4 },
  },
  {
    name: 'teamId',
    label: 'Team ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 4 },
  },
  {
    name: 'periodType',
    label: 'Period Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'startDate',
    label: 'Start Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 3 },
  },
  {
    name: 'endDate',
    label: 'End Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 3 },
  },
  {
    name: 'targetAmount',
    label: 'Target Amount',
    type: RichFieldType.FLOAT,
    required: true,
    config: { min: 0, decimalPlaces: 2 },
    design: { columns: 6 },
  },
  {
    name: 'currency',
    label: 'Currency',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
        { value: 'JPY', label: 'JPY' },
        { value: 'CAD', label: 'CAD' },
        { value: 'AUD', label: 'AUD' },
      ],
      default: 'USD',
    },
    design: { columns: 6 },
  },
  {
    name: 'targetOpportunityCount',
    label: 'Target Opportunity Count',
    type: RichFieldType.INTEGER,
    config: { min: 0 },
    design: { columns: 6 },
  },
  {
    name: 'parentQuotaId',
    label: 'Parent Quota ID',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_quota' },
    design: { columns: 6 },
  },
];

export const QUOTA_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.QUOTA,
  displayName: 'Quota',
  description: 'Quota definition and tracking',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: quotaFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Quota Information', fields: ['quotaType', 'targetUserId', 'teamId'] },
        { id: 'period', label: 'Period', fields: ['periodType', 'startDate', 'endDate'] },
        { id: 'target', label: 'Target', fields: ['targetAmount', 'currency', 'targetOpportunityCount'] },
        { id: 'hierarchy', label: 'Hierarchy', fields: ['parentQuotaId'] },
      ],
    },
  },
  icon: 'target',
  color: '#3b82f6',
  tags: ['quota', 'sales', 'forecast'],
};

// c_risk_simulation - Risk Simulation Scenario
const riskSimulationFields: RichFieldDefinition[] = [
  {
    name: 'opportunityId',
    label: 'Opportunity ID',
    type: RichFieldType.REFERENCE,
    required: true,
    config: { shardTypeId: 'c_opportunity' },
    design: { columns: 12 },
  },
  {
    name: 'scenarioName',
    label: 'Scenario Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
];

export const RISK_SIMULATION_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.RISK_SIMULATION,
  displayName: 'Risk Simulation',
  description: 'Risk simulation scenario',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: riskSimulationFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Simulation Information', fields: ['opportunityId', 'scenarioName'] },
      ],
    },
  },
  icon: 'flask-conical',
  color: '#8b5cf6',
  tags: ['risk', 'simulation', 'scenario'],
};

// c_benchmark - Benchmark Data
const benchmarkFields: RichFieldDefinition[] = [
  {
    name: 'benchmarkType',
    label: 'Benchmark Type',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'win_rate', label: 'Win Rate' },
        { value: 'closing_time', label: 'Closing Time' },
        { value: 'deal_size', label: 'Deal Size' },
        { value: 'renewal', label: 'Renewal' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'scope',
    label: 'Scope',
    type: RichFieldType.SELECT,
    required: true,
    config: {
      options: [
        { value: 'tenant', label: 'Tenant' },
        { value: 'industry', label: 'Industry' },
        { value: 'peer', label: 'Peer' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'industryId',
    label: 'Industry ID',
    type: RichFieldType.TEXT,
    config: { maxLength: 200 },
    design: { columns: 6 },
  },
  {
    name: 'periodStartDate',
    label: 'Period Start Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 3 },
  },
  {
    name: 'periodEndDate',
    label: 'Period End Date',
    type: RichFieldType.DATE,
    required: true,
    design: { columns: 3 },
  },
];

export const BENCHMARK_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.BENCHMARK,
  displayName: 'Benchmark',
  description: 'Historical analytics and benchmarks',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: benchmarkFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Benchmark Information', fields: ['benchmarkType', 'scope', 'industryId'] },
        { id: 'period', label: 'Period', fields: ['periodStartDate', 'periodEndDate'] },
      ],
    },
  },
  icon: 'bar-chart',
  color: '#10b981',
  tags: ['benchmark', 'analytics', 'metrics'],
};

// ============================================
// c_userTeams - User Teams (Sales Teams)
// ============================================
const userTeamsFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Team Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'manager',
    label: 'Manager',
    type: RichFieldType.JSON,
    required: true,
    config: {
      schema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          lastname: { type: 'string' },
          firstname: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['userId', 'email'],
      },
    },
    design: { columns: 12 },
  },
  {
    name: 'members',
    label: 'Team Members',
    type: RichFieldType.JSON,
    required: false,
    config: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            lastname: { type: 'string' },
            firstname: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            function: { type: 'string' },
          },
          required: ['userId', 'email'],
        },
      },
    },
    design: { columns: 12 },
  },
  {
    name: 'parentTeamId',
    label: 'Parent Team',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_userTeams' },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID (SSO)',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'externalSource',
    label: 'External Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'azure_ad', label: 'Azure AD' },
        { value: 'okta', label: 'Okta' },
        { value: 'google', label: 'Google Workspace' },
        { value: 'manual', label: 'Manual' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'syncEnabled',
    label: 'SSO Sync Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'isManuallyEdited',
    label: 'Manually Edited',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'syncedAt',
    label: 'Last Synced',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
];

export const USER_TEAMS_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.USER_TEAMS,
  displayName: 'User Team',
  description: 'Sales team with manager and members. Supports hierarchical teams and SSO integration.',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: userTeamsFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Team Information', fields: ['name', 'manager'] },
        { id: 'members', label: 'Team Members', fields: ['members'] },
        { id: 'hierarchy', label: 'Hierarchy', fields: ['parentTeamId'] },
        { id: 'sso', label: 'SSO Integration', fields: ['externalId', 'externalSource', 'syncEnabled', 'isManuallyEdited', 'syncedAt'] },
      ],
    },
  },
  icon: 'users',
  color: '#6366f1',
  tags: ['team', 'sales', 'management', 'hierarchy'],
};

// ============================================
// c_document - Document
// ============================================
const documentFields: RichFieldDefinition[] = [
  {
    name: 'title',
    label: 'Title',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 300 },
    design: { columns: 12 },
  },
  {
    name: 'content',
    label: 'Content',
    type: RichFieldType.RICHTEXT,
    config: { toolbar: 'standard', maxSize: 1024000 },
    design: { columns: 12 },
  },
  {
    name: 'contentType',
    label: 'Content Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'markdown', label: 'Markdown' },
        { value: 'html', label: 'HTML' },
        { value: 'plain', label: 'Plain Text' },
        { value: 'rich', label: 'Rich Text' },
      ],
      default: 'markdown',
    },
    design: { columns: 6 },
  },
  {
    name: 'documentType',
    label: 'Document Type',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'note', label: 'Note' },
        { value: 'article', label: 'Article' },
        { value: 'report', label: 'Report' },
        { value: 'specification', label: 'Specification' },
        { value: 'manual', label: 'Manual' },
        { value: 'template', label: 'Template' },
        { value: 'other', label: 'Other' },
      ],
      default: 'note',
    },
    design: { columns: 6 },
  },
  {
    name: 'summary',
    label: 'Summary',
    type: RichFieldType.TEXTAREA,
    config: { maxLength: 500, rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'author',
    label: 'Author',
    type: RichFieldType.USER,
    design: { columns: 6 },
  },
  {
    name: 'publishedAt',
    label: 'Published At',
    type: RichFieldType.DATETIME,
    design: { columns: 6 },
  },
  {
    name: 'language',
    label: 'Language',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
      ],
      default: 'en',
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'visibility',
    label: 'Visibility',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'private', label: 'Private' },
        { value: 'shared', label: 'Shared' },
        { value: 'published', label: 'Published' },
      ],
      default: 'draft',
    },
    design: { columns: 6 },
  },
  {
    name: 'wordCount',
    label: 'Word Count',
    type: RichFieldType.INTEGER,
    config: { min: 0, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'readingTime',
    label: 'Reading Time (minutes)',
    type: RichFieldType.INTEGER,
    config: { min: 0, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'version',
    label: 'Version',
    type: RichFieldType.TEXT,
    config: { maxLength: 20, default: '1.0' },
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
];

export const DOCUMENT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.DOCUMENT,
  displayName: 'Document',
  description: 'Documents, files, and rich text content',
  category: ShardTypeCategory.DOCUMENT,
  schema: {
    format: 'rich',
    fields: documentFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Document Information', fields: ['title', 'documentType', 'summary', 'content'] },
        { id: 'metadata', label: 'Metadata', fields: ['author', 'publishedAt', 'language', 'visibility'] },
        { id: 'stats', label: 'Statistics', fields: ['wordCount', 'readingTime', 'version'] },
        { id: 'tags', label: 'Tags', fields: ['tags'] },
      ],
    },
  },
  icon: 'file-text',
  color: '#3b82f6',
  tags: ['document', 'file', 'content', 'text'],
};

// ============================================
// c_assistant - AI Assistant
// ============================================
const assistantFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Assistant Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 100 },
    design: { columns: 8 },
  },
  {
    name: 'isActive',
    label: 'Active',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 2 },
  },
  {
    name: 'isDefault',
    label: 'Default',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: false },
    design: { columns: 2 },
  },
  {
    name: 'description',
    label: 'Description',
    type: RichFieldType.TEXTAREA,
    config: { maxLength: 1000, rows: 3 },
    design: { columns: 12 },
  },
  {
    name: 'systemPrompt',
    label: 'System Prompt',
    type: RichFieldType.TEXTAREA,
    required: true,
    config: { maxLength: 10000, rows: 10 },
    design: { columns: 12 },
  },
  {
    name: 'personality',
    label: 'Personality',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'formal', label: 'Formal' },
        { value: 'casual', label: 'Casual' },
        { value: 'analytical', label: 'Analytical' },
        { value: 'creative', label: 'Creative' },
        { value: 'supportive', label: 'Supportive' },
        { value: 'direct', label: 'Direct' },
      ],
      default: 'professional',
    },
    design: { columns: 6 },
  },
  {
    name: 'tone',
    label: 'Tone',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'neutral', label: 'Neutral' },
        { value: 'enthusiastic', label: 'Enthusiastic' },
        { value: 'empathetic', label: 'Empathetic' },
        { value: 'confident', label: 'Confident' },
        { value: 'cautious', label: 'Cautious' },
        { value: 'encouraging', label: 'Encouraging' },
        { value: 'informative', label: 'Informative' },
      ],
      default: 'neutral',
    },
    design: { columns: 6 },
  },
  {
    name: 'language',
    label: 'Language',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
      ],
      default: 'en',
      allowCustom: true,
    },
    design: { columns: 6 },
  },
  {
    name: 'capabilities',
    label: 'Capabilities',
    type: RichFieldType.MULTISELECT,
    config: {
      options: [
        { value: 'summarization', label: 'Summarization' },
        { value: 'analysis', label: 'Analysis' },
        { value: 'recommendations', label: 'Recommendations' },
        { value: 'writing', label: 'Writing' },
        { value: 'research', label: 'Research' },
        { value: 'forecasting', label: 'Forecasting' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'q_and_a', label: 'Q&A' },
        { value: 'data_extraction', label: 'Data Extraction' },
        { value: 'translation', label: 'Translation' },
      ],
    },
    design: { columns: 12 },
  },
  {
    name: 'focusAreas',
    label: 'Focus Areas',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'constraints',
    label: 'Constraints',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
  {
    name: 'responseFormat',
    label: 'Response Format',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'conversational', label: 'Conversational' },
        { value: 'structured', label: 'Structured' },
        { value: 'bullet_points', label: 'Bullet Points' },
        { value: 'detailed', label: 'Detailed' },
        { value: 'concise', label: 'Concise' },
      ],
      default: 'conversational',
    },
    design: { columns: 6 },
  },
  {
    name: 'maxTokens',
    label: 'Max Tokens',
    type: RichFieldType.INTEGER,
    config: { min: 100, max: 8000, default: 2000 },
    design: { columns: 3 },
  },
  {
    name: 'temperature',
    label: 'Temperature',
    type: RichFieldType.FLOAT,
    config: { min: 0, max: 1, decimalPlaces: 2, default: 0.7 },
    design: { columns: 3 },
  },
  {
    name: 'model',
    label: 'AI Model',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_aimodel' },
    design: { columns: 6 },
  },
  {
    name: 'contextTemplateId',
    label: 'Context Template',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_contextTemplate' },
    design: { columns: 6 },
  },
  {
    name: 'configId',
    label: 'AI Config',
    type: RichFieldType.REFERENCE,
    config: { shardTypeId: 'c_aiconfig' },
    design: { columns: 6 },
  },
  {
    name: 'tags',
    label: 'Tags',
    type: RichFieldType.MULTISELECT,
    config: { allowCustom: true },
    design: { columns: 12 },
  },
];

export const ASSISTANT_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.ASSISTANT,
  displayName: 'AI Assistant',
  description: 'AI assistant configurations defining personality, instructions, capabilities, and behavior',
  category: ShardTypeCategory.CONFIGURATION,
  schema: {
    format: 'rich',
    fields: assistantFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Basic Information', fields: ['name', 'isActive', 'isDefault', 'description'] },
        { id: 'prompt', label: 'System Prompt', fields: ['systemPrompt'] },
        { id: 'personality', label: 'Personality & Tone', fields: ['personality', 'tone', 'language'] },
        { id: 'capabilities', label: 'Capabilities', fields: ['capabilities', 'focusAreas', 'constraints'] },
        { id: 'response', label: 'Response Configuration', fields: ['responseFormat', 'maxTokens', 'temperature'] },
        { id: 'ai', label: 'AI Configuration', fields: ['model', 'contextTemplateId', 'configId'] },
        { id: 'tags', label: 'Tags', fields: ['tags'] },
      ],
    },
  },
  icon: 'bot',
  color: '#a855f7',
  tags: ['ai', 'assistant', 'configuration', 'personality'],
};

/**
 * Embedding Template for c_document
 * Used for vector search and AI insights on documents
 */
export const DOCUMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Document Embedding Template',
  description: 'Embedding template for documents. Enables search and analysis of document content.',
  isDefault: true,
  fields: [
    { name: 'title', weight: 1.0, include: true },
    { name: 'content', weight: 0.95, include: true, preprocess: { maxLength: 5000, stripFormatting: true } },
    { name: 'summary', weight: 0.8, include: true },
    { name: 'documentType', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default',
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  storeInShard: true,
  enableVectorSearch: true,
};

/**
 * Embedding Template for c_assistant
 * Used for vector search and AI insights on assistant configurations
 */
export const ASSISTANT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> = {
  version: 1,
  name: 'Assistant Embedding Template',
  description: 'Embedding template for AI assistants. Enables search and analysis of assistant configurations.',
  isDefault: true,
  fields: [
    { name: 'name', weight: 1.0, include: true },
    { name: 'description', weight: 0.9, include: true },
    { name: 'systemPrompt', weight: 0.85, include: true, preprocess: { maxLength: 2000, stripFormatting: true } },
    { name: 'focusAreas', weight: 0.7, include: true },
    { name: 'capabilities', weight: 0.6, include: true },
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100,
      maxChunkSize: 1000,
    },
    removeStopWords: false,
    normalize: false,
  },
  normalization: {
    l2Normalize: true,
    minMaxScale: false,
    removeOutliers: false,
    reduction: {
      enabled: false,
    },
  },
  modelConfig: {
    strategy: 'default',
    modelId: 'text-embedding-3-small',
    fallbackModelId: 'text-embedding-ada-002',
  },
  storeInShard: true,
  enableVectorSearch: true,
};

// ============================================
// Export all core types
// ============================================
export const CORE_SHARD_TYPES: CoreShardTypeDefinition[] = [
  PROJECT_SHARD_TYPE,
  TASK_SHARD_TYPE,
  EVENT_SHARD_TYPE,
  EMAIL_SHARD_TYPE,
  ACTIVITY_SHARD_TYPE,
  PRODUCT_SHARD_TYPE,
  NEWS_SHARD_TYPE,
  DOCUMENT_SHARD_TYPE,
  AI_MODEL_SHARD_TYPE,
  AI_CONFIG_SHARD_TYPE,
  ASSISTANT_SHARD_TYPE,
  CONVERSATION_SHARD_TYPE,
  CONVERSATION_MESSAGE_SHARD_TYPE,
  CONVERSATION_TEMPLATE_SHARD_TYPE,
  DASHBOARD_SHARD_TYPE,
  DASHBOARD_WIDGET_SHARD_TYPE,
  DASHBOARD_VERSION_SHARD_TYPE,
  WEBPAGES_SHARD_TYPE,
  // Phase 2 Integration types
  OPPORTUNITY_SHARD_TYPE,
  OPPORTUNITY_HISTORY_SHARD_TYPE,
  OPPORTUNITY_COMPETITOR_SHARD_TYPE,
  OPPORTUNITY_CONTACT_ROLE_SHARD_TYPE,
  OPPORTUNITY_LINE_ITEM_SHARD_TYPE,
  ACCOUNT_SHARD_TYPE,
  CONTACT_SHARD_TYPE,
  COMPANY_SHARD_TYPE,
  NOTE_SHARD_TYPE,
  LEAD_SHARD_TYPE,
  TICKET_SHARD_TYPE,
  CAMPAIGN_SHARD_TYPE,
  QUOTE_SHARD_TYPE,
  MEETING_SHARD_TYPE,
  CALENDAR_SHARD_TYPE,
  MESSAGE_SHARD_TYPE,
  TEAM_SHARD_TYPE,
  ATTACHMENT_SHARD_TYPE,
  COMPETITOR_SHARD_TYPE,
  CONTRACT_SHARD_TYPE,
  ORDER_SHARD_TYPE,
  INVOICE_SHARD_TYPE,
  PAYMENT_SHARD_TYPE,
  REVENUE_SHARD_TYPE,
  CALL_SHARD_TYPE,
  WEBINAR_SHARD_TYPE,
  MARKETING_ASSET_SHARD_TYPE,
  EVENT_REGISTRATION_SHARD_TYPE,
  LEAD_SCORE_SHARD_TYPE,
  PRICE_BOOK_SHARD_TYPE,
  ASSET_SHARD_TYPE,
  FOLDER_SHARD_TYPE,
  FILE_SHARD_TYPE,
  SP_SITE_SHARD_TYPE,
  CHANNEL_SHARD_TYPE,
  INTEGRATION_STATE_SHARD_TYPE,
  INSIGHT_KPI_SHARD_TYPE,
  // Risk Analysis types
  RISK_CATALOG_SHARD_TYPE,
  RISK_SNAPSHOT_SHARD_TYPE,
  QUOTA_SHARD_TYPE,
  RISK_SIMULATION_SHARD_TYPE,
  BENCHMARK_SHARD_TYPE,
  // Team Management
  USER_TEAMS_SHARD_TYPE,
  // System shard types
  SYSTEM_METRIC_SHARD_TYPE,
  SYSTEM_AUDIT_LOG_SHARD_TYPE,
];

/**
 * Get core ShardType definition by name
 */
export function getCoreShardType(name: CoreShardTypeName): CoreShardTypeDefinition | undefined {
  return CORE_SHARD_TYPES.find(t => t.name === name);
}

/**
 * Mapping from shard type names to their embedding templates
 * Used by CoreTypesSeederService to include embedding templates when creating ShardTypes
 */
export const EMBEDDING_TEMPLATE_MAP: Record<CoreShardTypeName, Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> | undefined> = {
  [CORE_SHARD_TYPE_NAMES.OPPORTUNITY]: OPPORTUNITY_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.ACCOUNT]: ACCOUNT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.CONTACT]: CONTACT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.LEAD]: LEAD_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.COMPANY]: COMPANY_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.NOTE]: NOTE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.OPPORTUNITY_COMPETITOR]: OPPORTUNITY_COMPETITOR_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.OPPORTUNITY_CONTACT_ROLE]: OPPORTUNITY_CONTACT_ROLE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.OPPORTUNITY_LINE_ITEM]: OPPORTUNITY_LINE_ITEM_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.OPPORTUNITY_HISTORY]: OPPORTUNITY_HISTORY_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.TICKET]: TICKET_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.CAMPAIGN]: CAMPAIGN_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.QUOTE]: QUOTE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.MEETING]: MEETING_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.CALENDAR]: CALENDAR_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.MESSAGE]: MESSAGE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.TEAM]: TEAM_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.USER_TEAMS]: undefined, // User Teams don't need embedding templates
  [CORE_SHARD_TYPE_NAMES.ATTACHMENT]: ATTACHMENT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.COMPETITOR]: COMPETITOR_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.CONTRACT]: CONTRACT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.ORDER]: ORDER_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.INVOICE]: INVOICE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.PAYMENT]: PAYMENT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.REVENUE]: REVENUE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.CALL]: CALL_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.WEBINAR]: WEBINAR_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.MARKETING_ASSET]: MARKETING_ASSET_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.EVENT_REGISTRATION]: EVENT_REGISTRATION_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.LEAD_SCORE]: LEAD_SCORE_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.PRICE_BOOK]: PRICE_BOOK_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.ASSET]: ASSET_EMBEDDING_TEMPLATE,
  // Shard types without embedding templates (undefined)
  [CORE_SHARD_TYPE_NAMES.PROJECT]: undefined,
  [CORE_SHARD_TYPE_NAMES.TASK]: undefined,
  [CORE_SHARD_TYPE_NAMES.EVENT]: EVENT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.EMAIL]: EMAIL_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.ACTIVITY]: undefined,
  [CORE_SHARD_TYPE_NAMES.DOCUMENT]: DOCUMENT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.ASSISTANT]: ASSISTANT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.PRODUCT]: PRODUCT_EMBEDDING_TEMPLATE,
  [CORE_SHARD_TYPE_NAMES.NEWS]: undefined,
  [CORE_SHARD_TYPE_NAMES.CONTEXT_TEMPLATE]: undefined,
  [CORE_SHARD_TYPE_NAMES.CONVERSATION_TEMPLATE]: undefined,
  [CORE_SHARD_TYPE_NAMES.AI_MODEL]: undefined,
  [CORE_SHARD_TYPE_NAMES.AI_CONFIG]: undefined,
  [CORE_SHARD_TYPE_NAMES.CONVERSATION]: undefined,
  [CORE_SHARD_TYPE_NAMES.CONVERSATION_MESSAGE]: undefined,
  [CORE_SHARD_TYPE_NAMES.DASHBOARD]: undefined,
  [CORE_SHARD_TYPE_NAMES.DASHBOARD_WIDGET]: undefined,
  [CORE_SHARD_TYPE_NAMES.DASHBOARD_VERSION]: undefined,
  [CORE_SHARD_TYPE_NAMES.WEBPAGES]: undefined,
  [CORE_SHARD_TYPE_NAMES.FOLDER]: undefined,
  [CORE_SHARD_TYPE_NAMES.FILE]: undefined,
  [CORE_SHARD_TYPE_NAMES.SP_SITE]: undefined,
  [CORE_SHARD_TYPE_NAMES.CHANNEL]: undefined,
  [CORE_SHARD_TYPE_NAMES.INTEGRATION_STATE]: undefined,
  [CORE_SHARD_TYPE_NAMES.INSIGHT_KPI]: undefined,
  [CORE_SHARD_TYPE_NAMES.RISK_CATALOG]: undefined,
  [CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT]: undefined,
  [CORE_SHARD_TYPE_NAMES.QUOTA]: undefined,
  [CORE_SHARD_TYPE_NAMES.RISK_SIMULATION]: undefined,
  [CORE_SHARD_TYPE_NAMES.BENCHMARK]: undefined,
  [CORE_SHARD_TYPE_NAMES.SYSTEM_METRIC]: undefined,
  [CORE_SHARD_TYPE_NAMES.SYSTEM_AUDIT_LOG]: undefined,
};

/**
 * Check if a ShardType name is a core type
 */
export function isCoreShardType(name: string): boolean {
  return Object.values(CORE_SHARD_TYPE_NAMES).includes(name as CoreShardTypeName);
}


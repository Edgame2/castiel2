// @ts-nocheck
/**
 * Core Shard Types Seed Data
 * 
 * Defines the built-in shard types for common use cases
 */

import type { ShardType } from '../types/shard-type.types.js';

/**
 * c_task - Task/Todo Shard Type
 */
export const TASK_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_task',
  displayName: 'Task',
  description: 'Tasks, todos, and action items with due dates, priorities, and assignments',
  category: 'productivity',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'check-square',
  color: '#10b981', // Emerald
  tags: ['task', 'todo', 'action', 'productivity'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['title', 'status'],
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        description: 'Task title or summary',
        minLength: 1,
        maxLength: 200,
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Detailed description of the task',
        maxLength: 5000,
      },
      status: {
        type: 'string',
        title: 'Status',
        enum: ['todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled'],
        default: 'todo',
      },
      priority: {
        type: 'string',
        title: 'Priority',
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
      },
      dueDate: {
        type: 'string',
        format: 'date-time',
        title: 'Due Date',
        description: 'When the task should be completed',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        title: 'Start Date',
        description: 'When work on the task should begin',
      },
      completedAt: {
        type: 'string',
        format: 'date-time',
        title: 'Completed At',
        description: 'When the task was completed',
      },
      assignees: {
        type: 'array',
        title: 'Assignees',
        description: 'Users assigned to this task',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
      estimatedHours: {
        type: 'number',
        title: 'Estimated Hours',
        description: 'Estimated time to complete',
        minimum: 0,
      },
      actualHours: {
        type: 'number',
        title: 'Actual Hours',
        description: 'Actual time spent',
        minimum: 0,
      },
      projectId: {
        type: 'string',
        title: 'Project',
        description: 'Associated project ID',
      },
      labels: {
        type: 'array',
        title: 'Labels',
        items: { type: 'string' },
      },
      checklist: {
        type: 'array',
        title: 'Checklist',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            completed: { type: 'boolean', default: false },
          },
        },
      },
      recurrence: {
        type: 'object',
        title: 'Recurrence',
        properties: {
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
          interval: { type: 'integer', minimum: 1 },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    status: { 'ui:widget': 'select' },
    priority: { 'ui:widget': 'radio' },
    dueDate: { 'ui:widget': 'datetime' },
    'ui:order': ['title', 'description', 'status', 'priority', 'dueDate', 'assignees', '*'],
  },
};

/**
 * c_event - Calendar Event Shard Type
 */
export const EVENT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_event',
  displayName: 'Event',
  description: 'Calendar events, meetings, and scheduled activities',
  category: 'productivity',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'calendar',
  color: '#6366f1', // Indigo
  tags: ['event', 'calendar', 'meeting', 'schedule'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['title', 'startTime'],
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        description: 'Event title',
        minLength: 1,
        maxLength: 200,
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Event details and agenda',
        maxLength: 5000,
      },
      eventType: {
        type: 'string',
        title: 'Event Type',
        enum: ['meeting', 'call', 'webinar', 'workshop', 'conference', 'reminder', 'deadline', 'other'],
        default: 'meeting',
      },
      startTime: {
        type: 'string',
        format: 'date-time',
        title: 'Start Time',
      },
      endTime: {
        type: 'string',
        format: 'date-time',
        title: 'End Time',
      },
      allDay: {
        type: 'boolean',
        title: 'All Day Event',
        default: false,
      },
      timezone: {
        type: 'string',
        title: 'Timezone',
        description: 'IANA timezone identifier',
      },
      location: {
        type: 'object',
        title: 'Location',
        properties: {
          type: { type: 'string', enum: ['physical', 'virtual', 'hybrid'] },
          address: { type: 'string' },
          room: { type: 'string' },
          meetingUrl: { type: 'string', format: 'uri' },
          dialIn: { type: 'string' },
          coordinates: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
        },
      },
      organizer: {
        type: 'object',
        title: 'Organizer',
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
      attendees: {
        type: 'array',
        title: 'Attendees',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'accepted', 'declined', 'tentative'] },
            required: { type: 'boolean', default: true },
          },
        },
      },
      recurrence: {
        type: 'object',
        title: 'Recurrence',
        properties: {
          rrule: { type: 'string', description: 'iCal RRULE format' },
          exceptions: { type: 'array', items: { type: 'string', format: 'date' } },
        },
      },
      reminders: {
        type: 'array',
        title: 'Reminders',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['email', 'push', 'sms'] },
            minutesBefore: { type: 'integer', minimum: 0 },
          },
        },
      },
      status: {
        type: 'string',
        title: 'Status',
        enum: ['confirmed', 'tentative', 'cancelled'],
        default: 'confirmed',
      },
      visibility: {
        type: 'string',
        title: 'Visibility',
        enum: ['public', 'private', 'confidential'],
        default: 'public',
      },
      conferenceData: {
        type: 'object',
        title: 'Conference Data',
        properties: {
          provider: { type: 'string', enum: ['zoom', 'teams', 'meet', 'webex', 'other'] },
          meetingId: { type: 'string' },
          password: { type: 'string' },
          joinUrl: { type: 'string', format: 'uri' },
        },
      },
      attachments: {
        type: 'array',
        title: 'Attachments',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            mimeType: { type: 'string' },
          },
        },
      },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    startTime: { 'ui:widget': 'datetime' },
    endTime: { 'ui:widget': 'datetime' },
    'ui:order': ['title', 'eventType', 'startTime', 'endTime', 'allDay', 'location', 'description', '*'],
  },
};

/**
 * c_email - Email Thread Shard Type
 */
export const EMAIL_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_email',
  displayName: 'Email',
  description: 'Email messages and threads for communication tracking',
  category: 'communication',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'mail',
  color: '#f59e0b', // Amber
  tags: ['email', 'communication', 'message', 'thread'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['subject', 'from'],
    properties: {
      messageId: {
        type: 'string',
        title: 'Message ID',
        description: 'Unique email message identifier',
      },
      threadId: {
        type: 'string',
        title: 'Thread ID',
        description: 'Email thread/conversation identifier',
      },
      subject: {
        type: 'string',
        title: 'Subject',
        description: 'Email subject line',
        maxLength: 500,
      },
      from: {
        type: 'object',
        title: 'From',
        required: ['email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      to: {
        type: 'array',
        title: 'To',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
      },
      cc: {
        type: 'array',
        title: 'CC',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
      },
      bcc: {
        type: 'array',
        title: 'BCC',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
      },
      replyTo: {
        type: 'object',
        title: 'Reply To',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      date: {
        type: 'string',
        format: 'date-time',
        title: 'Date',
        description: 'When the email was sent',
      },
      receivedAt: {
        type: 'string',
        format: 'date-time',
        title: 'Received At',
        description: 'When the email was received',
      },
      bodyText: {
        type: 'string',
        title: 'Body (Plain Text)',
        description: 'Plain text version of the email body',
      },
      bodyHtml: {
        type: 'string',
        title: 'Body (HTML)',
        description: 'HTML version of the email body',
      },
      snippet: {
        type: 'string',
        title: 'Snippet',
        description: 'Preview snippet of the email',
        maxLength: 300,
      },
      labels: {
        type: 'array',
        title: 'Labels',
        items: { type: 'string' },
      },
      folder: {
        type: 'string',
        title: 'Folder',
        enum: ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive', 'custom'],
      },
      isRead: {
        type: 'boolean',
        title: 'Read',
        default: false,
      },
      isStarred: {
        type: 'boolean',
        title: 'Starred',
        default: false,
      },
      isImportant: {
        type: 'boolean',
        title: 'Important',
        default: false,
      },
      isDraft: {
        type: 'boolean',
        title: 'Draft',
        default: false,
      },
      hasAttachments: {
        type: 'boolean',
        title: 'Has Attachments',
        default: false,
      },
      attachments: {
        type: 'array',
        title: 'Attachments',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'integer' },
            url: { type: 'string', format: 'uri' },
          },
        },
      },
      headers: {
        type: 'object',
        title: 'Headers',
        description: 'Email headers',
        additionalProperties: { type: 'string' },
      },
      inReplyTo: {
        type: 'string',
        title: 'In Reply To',
        description: 'Message ID this email replies to',
      },
      references: {
        type: 'array',
        title: 'References',
        description: 'Message IDs in the thread',
        items: { type: 'string' },
      },
      priority: {
        type: 'string',
        title: 'Priority',
        enum: ['low', 'normal', 'high'],
        default: 'normal',
      },
      provider: {
        type: 'string',
        title: 'Email Provider',
        enum: ['gmail', 'outlook', 'imap', 'other'],
      },
      externalId: {
        type: 'string',
        title: 'External ID',
        description: 'ID from the email provider',
      },
    },
  },
  uiSchema: {
    bodyText: { 'ui:widget': 'textarea', 'ui:options': { rows: 10 } },
    bodyHtml: { 'ui:widget': 'hidden' },
    headers: { 'ui:widget': 'hidden' },
    'ui:order': ['subject', 'from', 'to', 'cc', 'date', 'snippet', 'bodyText', '*'],
  },
};

/**
 * c_project - Project Shard Type
 */
export const PROJECT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_project',
  displayName: 'Project',
  description: 'Projects for organizing tasks, events, and resources',
  category: 'productivity',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'folder-kanban',
  color: '#8b5cf6', // Violet
  tags: ['project', 'organization', 'planning'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'status'],
    properties: {
      name: {
        type: 'string',
        title: 'Project Name',
        minLength: 1,
        maxLength: 200,
      },
      description: {
        type: 'string',
        title: 'Description',
        maxLength: 5000,
      },
      status: {
        type: 'string',
        title: 'Status',
        enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
        default: 'planning',
      },
      priority: {
        type: 'string',
        title: 'Priority',
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      startDate: {
        type: 'string',
        format: 'date',
        title: 'Start Date',
      },
      targetDate: {
        type: 'string',
        format: 'date',
        title: 'Target Completion Date',
      },
      completedDate: {
        type: 'string',
        format: 'date',
        title: 'Actual Completion Date',
      },
      owner: {
        type: 'object',
        title: 'Project Owner',
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
      team: {
        type: 'array',
        title: 'Team Members',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
      budget: {
        type: 'object',
        title: 'Budget',
        properties: {
          allocated: { type: 'number' },
          spent: { type: 'number' },
          currency: { type: 'string', default: 'USD' },
        },
      },
      progress: {
        type: 'integer',
        title: 'Progress',
        description: 'Completion percentage',
        minimum: 0,
        maximum: 100,
        default: 0,
      },
      milestones: {
        type: 'array',
        title: 'Milestones',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            dueDate: { type: 'string', format: 'date' },
            completed: { type: 'boolean' },
          },
        },
      },
      labels: {
        type: 'array',
        title: 'Labels',
        items: { type: 'string' },
      },
      color: {
        type: 'string',
        title: 'Color',
        description: 'Project color for UI',
      },
      visibility: {
        type: 'string',
        title: 'Visibility',
        enum: ['private', 'team', 'organization', 'public'],
        default: 'team',
      },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    progress: { 'ui:widget': 'range' },
    color: { 'ui:widget': 'color' },
    'ui:order': ['name', 'description', 'status', 'priority', 'startDate', 'targetDate', 'owner', 'progress', '*'],
  },
};

/**
 * c_document - Document Shard Type
 */
export const DOCUMENT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_document',
  displayName: 'Document',
  description: 'Documents, files, and rich text content',
  category: 'content',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'file-text',
  color: '#3b82f6', // Blue
  tags: ['document', 'file', 'content', 'text'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        minLength: 1,
        maxLength: 300,
      },
      content: {
        type: 'string',
        title: 'Content',
        description: 'Document content (markdown or HTML)',
      },
      contentType: {
        type: 'string',
        title: 'Content Type',
        enum: ['markdown', 'html', 'plain', 'rich'],
        default: 'markdown',
      },
      summary: {
        type: 'string',
        title: 'Summary',
        description: 'Brief summary or abstract',
        maxLength: 500,
      },
      documentType: {
        type: 'string',
        title: 'Document Type',
        enum: ['note', 'article', 'report', 'specification', 'manual', 'template', 'other'],
        default: 'note',
      },
      author: {
        type: 'object',
        title: 'Author',
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      contributors: {
        type: 'array',
        title: 'Contributors',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            contribution: { type: 'string' },
          },
        },
      },
      publishedAt: {
        type: 'string',
        format: 'date-time',
        title: 'Published At',
      },
      version: {
        type: 'string',
        title: 'Version',
        default: '1.0',
      },
      wordCount: {
        type: 'integer',
        title: 'Word Count',
        minimum: 0,
      },
      readingTime: {
        type: 'integer',
        title: 'Reading Time (minutes)',
        minimum: 0,
      },
      language: {
        type: 'string',
        title: 'Language',
        description: 'ISO 639-1 language code',
        default: 'en',
      },
      visibility: {
        type: 'string',
        title: 'Visibility',
        enum: ['draft', 'private', 'shared', 'published'],
        default: 'draft',
      },
      tableOfContents: {
        type: 'array',
        title: 'Table of Contents',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            level: { type: 'integer' },
          },
        },
      },
      fileAttachment: {
        type: 'object',
        title: 'File Attachment',
        description: 'Attached file details',
        properties: {
          url: { type: 'string', format: 'uri' },
          filename: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
        },
      },
    },
  },
  uiSchema: {
    content: { 'ui:widget': 'textarea', 'ui:options': { rows: 20 } },
    summary: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    'ui:order': ['title', 'documentType', 'summary', 'content', 'author', 'visibility', '*'],
  },
};

/**
 * c_opportunity - Salesforce Opportunity Shard Type (Phase 2)
 */
export const OPPORTUNITY_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_opportunity',
  displayName: 'Opportunity',
  description: 'Salesforce opportunity or CRM deal',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'trending-up',
  color: '#3b82f6',
  tags: ['crm', 'salesforce', 'opportunity', 'deal', 'sales'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'stage'],
    properties: {
      name: { type: 'string', title: 'Opportunity Name', maxLength: 200 },
      stage: {
        type: 'string',
        title: 'Stage',
        enum: ['prospecting', 'qualification', 'needs_analysis', 'value_proposition', 'id_decision_makers', 'perception_analysis', 'proposal_price_quote', 'negotiation_review', 'closed_won', 'closed_lost'],
        default: 'prospecting',
      },
      value: { type: 'number', title: 'Value', minimum: 0 },
      currency: { type: 'string', title: 'Currency', enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'], default: 'USD' },
      accountId: { type: 'string', title: 'Account ID' },
      ownerId: { type: 'string', title: 'Owner ID' },
      probability: { type: 'integer', title: 'Probability (%)', minimum: 0, maximum: 100 },
      closeDate: { type: 'string', format: 'date', title: 'Close Date' },
      expectedRevenue: { type: 'number', title: 'Expected Revenue', minimum: 0 },
      description: { type: 'string', title: 'Description', maxLength: 5000 },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    'ui:order': ['name', 'stage', 'value', 'currency', 'accountId', 'ownerId', 'probability', 'closeDate', 'expectedRevenue', 'description', '*'],
  },
};

/**
 * c_account - Salesforce Account Shard Type (Phase 2)
 */
export const ACCOUNT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_account',
  displayName: 'Account',
  description: 'Salesforce account or CRM company',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'building',
  color: '#8b5cf6',
  tags: ['crm', 'salesforce', 'account', 'company'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', title: 'Account Name', maxLength: 200 },
      industry: { type: 'string', title: 'Industry' },
      revenue: { type: 'number', title: 'Annual Revenue', minimum: 0 },
      employees: { type: 'integer', title: 'Number of Employees', minimum: 0 },
      website: { type: 'string', format: 'uri', title: 'Website' },
      description: { type: 'string', title: 'Description', maxLength: 5000 },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    website: { 'ui:widget': 'uri' },
    'ui:order': ['name', 'industry', 'revenue', 'employees', 'website', 'description', '*'],
  },
};

/**
 * c_folder - Google Drive/SharePoint Folder Shard Type (Phase 2)
 */
export const FOLDER_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_folder',
  displayName: 'Folder',
  description: 'Google Drive or SharePoint folder',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'folder',
  color: '#f59e0b',
  tags: ['storage', 'gdrive', 'sharepoint', 'folder'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'provider', 'externalId'],
    properties: {
      name: { type: 'string', title: 'Folder Name', maxLength: 200 },
      provider: { type: 'string', title: 'Provider', enum: ['gdrive', 'sharepoint'] },
      externalId: { type: 'string', title: 'External ID' },
      path: { type: 'string', title: 'Path' },
      parentExternalId: { type: 'string', title: 'Parent Folder ID' },
      owner: { type: 'string', title: 'Owner' },
      description: { type: 'string', title: 'Description', maxLength: 5000 },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    'ui:order': ['name', 'provider', 'externalId', 'path', 'parentExternalId', 'owner', 'description', '*'],
  },
};

/**
 * c_file - Google Drive/SharePoint File Shard Type (Phase 2)
 */
export const FILE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_file',
  displayName: 'File',
  description: 'Google Drive or SharePoint file',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'file',
  color: '#ef4444',
  tags: ['storage', 'gdrive', 'sharepoint', 'file'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'provider', 'externalId'],
    properties: {
      name: { type: 'string', title: 'File Name', maxLength: 200 },
      provider: { type: 'string', title: 'Provider', enum: ['gdrive', 'sharepoint'] },
      externalId: { type: 'string', title: 'External ID' },
      mimeType: { type: 'string', title: 'MIME Type' },
      size: { type: 'integer', title: 'Size (bytes)', minimum: 0 },
      checksum: { type: 'string', title: 'Checksum' },
      sourceUrl: { type: 'string', format: 'uri', title: 'Source URL' },
      parentFolderExternalId: { type: 'string', title: 'Parent Folder ID' },
      owner: { type: 'string', title: 'Owner' },
      lastModified: { type: 'string', format: 'date-time', title: 'Last Modified' },
    },
  },
  uiSchema: {
    sourceUrl: { 'ui:widget': 'uri' },
    lastModified: { 'ui:widget': 'datetime' },
    'ui:order': ['name', 'provider', 'externalId', 'mimeType', 'size', 'checksum', 'sourceUrl', 'parentFolderExternalId', 'owner', 'lastModified', '*'],
  },
};

/**
 * c_sp_site - SharePoint Site Shard Type (Phase 2)
 */
export const SP_SITE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_sp_site',
  displayName: 'SharePoint Site',
  description: 'SharePoint site or site collection',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'globe',
  color: '#0078d4',
  tags: ['sharepoint', 'site', 'storage'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['siteId', 'siteUrl', 'name'],
    properties: {
      siteId: { type: 'string', title: 'Site ID' },
      siteUrl: { type: 'string', format: 'uri', title: 'Site URL' },
      name: { type: 'string', title: 'Site Name', maxLength: 200 },
      description: { type: 'string', title: 'Description', maxLength: 5000 },
      owner: { type: 'string', title: 'Owner' },
      collections: { type: 'string', title: 'Collections' },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    collections: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    siteUrl: { 'ui:widget': 'uri' },
    'ui:order': ['siteId', 'siteUrl', 'name', 'description', 'owner', 'collections', '*'],
  },
};

/**
 * c_channel - Slack/Teams Channel Shard Type (Phase 2)
 */
export const CHANNEL_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_channel',
  displayName: 'Channel',
  description: 'Slack or Teams channel',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'message-square',
  color: '#6366f1',
  tags: ['messaging', 'slack', 'teams', 'channel'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['platform', 'name', 'externalId'],
    properties: {
      platform: { type: 'string', title: 'Platform', enum: ['slack', 'teams'] },
      name: { type: 'string', title: 'Channel Name', maxLength: 200 },
      externalId: { type: 'string', title: 'External ID' },
      teamExternalId: { type: 'string', title: 'Team ID' },
      topic: { type: 'string', title: 'Topic', maxLength: 250 },
      description: { type: 'string', title: 'Description', maxLength: 5000 },
      isPrivate: { type: 'boolean', title: 'Private Channel', default: false },
      members: { type: 'string', title: 'Members' },
    },
  },
  uiSchema: {
    description: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    members: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    isPrivate: { 'ui:widget': 'checkbox' },
    'ui:order': ['platform', 'name', 'externalId', 'teamExternalId', 'topic', 'description', 'isPrivate', 'members', '*'],
  },
};

/**
 * integration.state - Integration State Shard Type (Phase 2)
 */
export const INTEGRATION_STATE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'integration.state',
  displayName: 'Integration State',
  description: 'Store integration cursors, tokens, sync state, and metadata',
  category: 'data',
  version: 1,
  isSystem: true,
  isGlobal: false, // Tenant-specific
  isActive: true,
  icon: 'settings',
  color: '#6b7280',
  tags: ['integration', 'state', 'sync', 'system'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['integrationId', 'integrationType', 'lastSyncStatus'],
    properties: {
      integrationId: { type: 'string', title: 'Integration ID', maxLength: 200 },
      integrationType: {
        type: 'string',
        title: 'Integration Type',
        enum: ['salesforce', 'gdrive', 'slack', 'sharepoint'],
      },
      cursor: { type: 'string', title: 'Sync Cursor/Token', maxLength: 1000 },
      lastSyncAt: { type: 'string', format: 'date-time', title: 'Last Sync At' },
      lastSyncStatus: {
        type: 'string',
        title: 'Last Sync Status',
        enum: ['success', 'failed', 'partial'],
        default: 'success',
      },
      errorMessage: { type: 'string', title: 'Error Message', maxLength: 5000 },
      nextSyncAt: { type: 'string', format: 'date-time', title: 'Next Sync At' },
      metadata: { type: 'object', title: 'Metadata', additionalProperties: true },
    },
  },
  uiSchema: {
    errorMessage: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
    metadata: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    lastSyncAt: { 'ui:widget': 'datetime' },
    nextSyncAt: { 'ui:widget': 'datetime' },
    'ui:order': ['integrationId', 'integrationType', 'cursor', 'lastSyncAt', 'lastSyncStatus', 'errorMessage', 'nextSyncAt', 'metadata', '*'],
  },
};

/**
 * Get all core shard types
 */
export function getCoreShardTypes() {
  return [
    TASK_SHARD_TYPE,
    EVENT_SHARD_TYPE,
    EMAIL_SHARD_TYPE,
    PROJECT_SHARD_TYPE,
    DOCUMENT_SHARD_TYPE,
    // Phase 2 Integration types
    OPPORTUNITY_SHARD_TYPE,
    ACCOUNT_SHARD_TYPE,
    FOLDER_SHARD_TYPE,
    FILE_SHARD_TYPE,
    SP_SITE_SHARD_TYPE,
    CHANNEL_SHARD_TYPE,
    INTEGRATION_STATE_SHARD_TYPE,
  ];
}

/**
 * Get shard type by name
 */
export function getCoreShardTypeByName(name: string) {
  const types = getCoreShardTypes();
  return types.find((t) => t.name === name);
}


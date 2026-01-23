# c_note - Note ShardType

## Overview

The `c_note` ShardType represents notes, memos, meeting notes, call logs, and other activity records. Notes capture conversations, decisions, and observations, serving as a rich activity log that provides context for AI insights.

> **AI Role**: Activity and context source—notes provide temporal context, decisions made, and communication history for comprehensive AI analysis.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_note` |
| **Display Name** | Note |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `StickyNote` |
| **Color** | `#eab308` (Yellow) |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Note title |
| `noteType` | enum | No | Type of note |
| `content` | string | No | Note content (short form) |
| `summary` | string | No | Brief summary |
| `date` | datetime | No | When the activity occurred |
| `duration` | number | No | Duration in minutes |
| `attendees` | string[] | No | People involved |
| `actionItems` | object[] | No | Action items |
| `decisions` | string[] | No | Decisions made |
| `sentiment` | enum | No | Overall sentiment |
| `priority` | enum | No | Priority level |
| `isPinned` | boolean | No | Pin to top |
| `isPrivate` | boolean | No | Private note flag |
| `followUpDate` | date | No | Follow-up date |
| `tags` | string[] | No | Custom tags |

### Field Details

#### `noteType`
```typescript
enum NoteType {
  GENERAL = 'general',
  MEETING = 'meeting',
  CALL = 'call',
  EMAIL_SUMMARY = 'email_summary',
  DECISION = 'decision',
  IDEA = 'idea',
  REMINDER = 'reminder',
  FEEDBACK = 'feedback',
  RESEARCH = 'research',
  STATUS_UPDATE = 'status_update',
  RISK = 'risk',
  BLOCKER = 'blocker'
}
```

#### `sentiment`
```typescript
enum NoteSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  MIXED = 'mixed',
  URGENT = 'urgent'
}
```

#### `priority`
```typescript
enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}
```

#### `actionItems`
```typescript
interface ActionItem {
  id: string;
  description: string;
  assignee?: string;           // Name or user ID
  dueDate?: string;            // ISO date
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_note.json",
  "title": "Note",
  "description": "Note, memo, or activity record",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Note title"
    },
    "noteType": {
      "type": "string",
      "enum": ["general", "meeting", "call", "email_summary", "decision", "idea", "reminder", "feedback", "research", "status_update", "risk", "blocker"],
      "default": "general",
      "description": "Type of note"
    },
    "content": {
      "type": "string",
      "maxLength": 5000,
      "description": "Note content (short form)"
    },
    "summary": {
      "type": "string",
      "maxLength": 500,
      "description": "Brief summary"
    },
    "date": {
      "type": "string",
      "format": "date-time",
      "description": "When the activity occurred"
    },
    "duration": {
      "type": "integer",
      "minimum": 0,
      "description": "Duration in minutes"
    },
    "attendees": {
      "type": "array",
      "items": { "type": "string" },
      "description": "People involved"
    },
    "actionItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "assignee": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "status": { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] },
          "completedAt": { "type": "string", "format": "date-time" }
        },
        "required": ["id", "description", "status"]
      },
      "description": "Action items"
    },
    "decisions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Decisions made"
    },
    "sentiment": {
      "type": "string",
      "enum": ["positive", "neutral", "negative", "mixed", "urgent"],
      "description": "Overall sentiment"
    },
    "priority": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low"],
      "default": "medium",
      "description": "Priority level"
    },
    "isPinned": {
      "type": "boolean",
      "default": false,
      "description": "Pin to top"
    },
    "isPrivate": {
      "type": "boolean",
      "default": false,
      "description": "Private note flag"
    },
    "followUpDate": {
      "type": "string",
      "format": "date",
      "description": "Follow-up date"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Custom tags"
    }
  },
  "required": ["name"]
}
```

---

## Unstructured Data

Notes can use `unstructuredData` for longer content:

```typescript
interface NoteUnstructuredData {
  text?: string;              // Full note content (long form)
  files?: FileReference[];    // Attached files (recordings, screenshots)
  rawData?: {
    transcript?: string;      // Meeting/call transcript
    originalSource?: string;  // Where note came from
  };
}
```

---

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `note_for` | `c_project` | Note about project |
| `note_for` | `c_company` | Note about company |
| `note_for` | `c_contact` | Note about person |
| `note_for` | `c_opportunity` | Note about deal |
| `references` | `c_document` | Referenced document |
| `follow_up_to` | `c_note` | Previous note |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `has_note` | Project's notes |
| `c_opportunity` | `has_note` | Deal's notes |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| `messaging` | Slack, Teams | Original message |
| `email` | Gmail, Outlook | Email thread |
| `calendar` | Google Calendar, Outlook | Meeting event |
| `crm` | Salesforce Activity | CRM activity log |

---

## AI Context Role

### Activity Log

`c_note` provides crucial temporal context:

- **Recent activity**: What happened lately
- **Decision history**: Key decisions made
- **Sentiment tracking**: How conversations are going
- **Action items**: What needs to be done
- **Follow-ups**: What's pending

### AI Prompt Fragment

```
Recent Activity ({noteType}):
Date: {date} | Duration: {duration} minutes
Attendees: {attendees.join(", ")}
Sentiment: {sentiment}

Summary: {summary}

Content:
{content}

Decisions Made:
{decisions.map(d => "- " + d).join("\n")}

Action Items:
{actionItems.map(ai => `- ${ai.description} (${ai.assignee}, due: ${ai.dueDate}) - ${ai.status}`).join("\n")}
```

### Timeline Assembly

When generating insights, notes are ordered chronologically:

```
Project Alpha - Activity Timeline

[2025-01-15] Meeting: Kickoff with Acme (positive)
  - Agreed on 12-week timeline
  - Budget confirmed at $500K
  Action: Send SOW by Jan 20 (John)

[2025-01-18] Call: Technical Requirements (neutral)
  - Discussed integration needs
  - Security review required
  Action: Schedule security call (Jane)

[2025-01-22] Decision: Approved Phase 1 Scope (positive)
  - Signed off on requirements doc
  - Green light to proceed
```

---

## Examples

### Example: Meeting Note

```json
{
  "id": "note-001-uuid",
  "shardTypeId": "c_note-type-uuid",
  "structuredData": {
    "name": "Kickoff Meeting - Acme Enterprise Implementation",
    "noteType": "meeting",
    "summary": "Successful kickoff meeting with Acme team. Aligned on timeline and budget, identified key stakeholders.",
    "date": "2025-01-15T10:00:00Z",
    "duration": 60,
    "attendees": [
      "John Smith (Acme, CTO)",
      "Jane Doe (Acme, PM)",
      "Mike Johnson (Castiel, Sales)",
      "Sarah Lee (Castiel, CS)"
    ],
    "actionItems": [
      {
        "id": "ai-1",
        "description": "Send Statement of Work",
        "assignee": "Mike Johnson",
        "dueDate": "2025-01-20",
        "status": "completed",
        "completedAt": "2025-01-18T14:00:00Z"
      },
      {
        "id": "ai-2",
        "description": "Schedule technical deep-dive",
        "assignee": "Sarah Lee",
        "dueDate": "2025-01-22",
        "status": "pending"
      },
      {
        "id": "ai-3",
        "description": "Provide data migration questionnaire",
        "assignee": "Jane Doe",
        "dueDate": "2025-01-25",
        "status": "pending"
      }
    ],
    "decisions": [
      "Go-live target date set for March 15",
      "Budget confirmed at $500,000",
      "Phase 1 scope includes core modules only",
      "Weekly status calls on Thursdays at 2pm"
    ],
    "sentiment": "positive",
    "priority": "high",
    "isPinned": true,
    "isPrivate": false,
    "followUpDate": "2025-01-22",
    "tags": ["kickoff", "milestone", "acme"]
  },
  "unstructuredData": {
    "text": "# Kickoff Meeting Notes\n\n## Attendees\n- John Smith (CTO, Acme)\n- Jane Doe (PM, Acme)\n- Mike Johnson (Sales, Castiel)\n- Sarah Lee (CS, Castiel)\n\n## Agenda\n1. Introductions\n2. Project overview\n3. Timeline discussion\n4. Resource allocation\n5. Next steps\n\n## Discussion\n\nJohn opened by expressing excitement about the partnership. He mentioned that the board approved the $500K budget last week and they're eager to begin.\n\nWe reviewed the high-level project plan:\n- Phase 1 (Jan-Feb): Data migration and core setup\n- Phase 2 (Feb-Mar): Training and customization\n- Phase 3 (Mar): Go-live and support\n\nJane raised concerns about data quality that we need to address in Phase 1. Agreed to include data cleanup in scope.\n\n## Key Decisions\n- Go-live: March 15\n- Budget: $500K confirmed\n- Scope: Core modules first, advanced features in Phase 2\n- Cadence: Weekly status on Thursdays\n\n## Action Items\n- [ ] Mike: Send SOW by Jan 20\n- [ ] Sarah: Schedule tech deep-dive\n- [ ] Jane: Provide data migration questionnaire\n\n## Next Meeting\nJan 22 - Technical Requirements Deep-dive"
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "project-acme-uuid",
      "targetShardTypeId": "c_project-type-uuid",
      "relationshipType": "note_for",
      "label": "Project Note",
      "createdAt": "2025-01-15T11:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-2",
      "targetShardId": "contact-john-uuid",
      "targetShardTypeId": "c_contact-type-uuid",
      "relationshipType": "note_for",
      "label": "Meeting with John Smith",
      "createdAt": "2025-01-15T11:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "google-calendar",
      "systemType": "calendar",
      "externalId": "event123abc",
      "externalUrl": "https://calendar.google.com/event/event123abc",
      "label": "Calendar Event",
      "syncStatus": "synced",
      "createdAt": "2025-01-15T11:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "metadata": {
    "enrichment": {
      "sentiment": {
        "sentiment": "positive",
        "score": 0.8,
        "confidence": 0.92
      },
      "keyPhrases": {
        "phrases": [
          { "text": "budget approved", "score": 0.95 },
          { "text": "March 15 go-live", "score": 0.92 },
          { "text": "data migration", "score": 0.88 }
        ]
      }
    }
  },
  "status": "active",
  "createdAt": "2025-01-15T11:00:00Z",
  "updatedAt": "2025-01-18T14:30:00Z"
}
```

### Example: Quick Note

```json
{
  "id": "note-002-uuid",
  "shardTypeId": "c_note-type-uuid",
  "structuredData": {
    "name": "Call with Jane - Budget Concern",
    "noteType": "call",
    "content": "Quick call with Jane. She mentioned internal pushback on the $500K budget from finance. May need to revisit scope or payment terms. Follow up next week.",
    "date": "2025-01-20T15:30:00Z",
    "duration": 15,
    "attendees": ["Jane Doe"],
    "sentiment": "mixed",
    "priority": "high",
    "followUpDate": "2025-01-27",
    "tags": ["budget", "risk", "follow-up"]
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "opportunity-uuid",
      "targetShardTypeId": "c_opportunity-type-uuid",
      "relationshipType": "note_for",
      "label": "Deal Note",
      "createdAt": "2025-01-20T15:45:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

---

## Display Configuration

```json
{
  "titleField": "name",
  "subtitleField": "noteType",
  "iconField": null,
  "searchableFields": ["name", "content", "summary", "decisions", "tags"],
  "sortableFields": ["name", "noteType", "date", "sentiment", "priority"],
  "defaultSortField": "date",
  "defaultSortOrder": "desc"
}
```

---

## Workflow Configuration

Notes don't have a complex workflow—they use the base Shard status:

```json
{
  "statusField": "status",
  "statuses": [
    { "value": "active", "label": "Active", "color": "#10b981", "order": 1 },
    { "value": "archived", "label": "Archived", "color": "#9ca3af", "order": 2 }
  ],
  "defaultStatus": "active"
}
```

---

## Enrichment Configuration

```json
{
  "enabled": true,
  "fields": [
    {
      "fieldName": "sentiment",
      "enrichmentType": "sentiment",
      "sourceFields": ["content", "unstructuredData.text"],
      "autoApply": true
    },
    {
      "fieldName": "keyPhrases",
      "enrichmentType": "extract",
      "sourceFields": ["content", "unstructuredData.text"],
      "autoApply": true
    },
    {
      "fieldName": "actionItemsExtracted",
      "enrichmentType": "extract",
      "prompt": "Extract action items with assignee and due date",
      "sourceFields": ["unstructuredData.text"],
      "autoApply": false
    }
  ],
  "frequency": "on_create"
}
```

---

## Best Practices

1. **Be timely**: Create notes promptly after meetings/calls
2. **Capture decisions**: Always record decisions made
3. **Track action items**: Include clear, assigned action items
4. **Link appropriately**: Connect to relevant projects, deals, contacts
5. **Use note types**: Categorize notes for filtering
6. **Record sentiment**: Capture the tone of interactions
7. **Follow up**: Set follow-up dates for important notes
8. **Keep searchable**: Use descriptive titles and tags

---

**Last Updated**: November 2025  
**Version**: 1.0.0







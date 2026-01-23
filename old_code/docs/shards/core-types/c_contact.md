# c_contact - Contact ShardType

## Overview

The `c_contact` ShardType represents people—customers, prospects, stakeholders, or any individuals relevant to business relationships. Contacts are typically linked to companies and involved in projects and opportunities.

> **AI Role**: Provides stakeholder context—roles, relationships, and communication preferences for personalized AI insights.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_contact` |
| **Display Name** | Contact |
| **Category** | DATA |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `User` |
| **Color** | `#06b6d4` (Cyan) |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Full name (auto-computed or manual) |
| `firstName` | string | No | First name |
| `lastName` | string | No | Last name |
| `email` | string (email) | No | Primary email address |
| `emailSecondary` | string (email) | No | Secondary email |
| `phone` | string | No | Primary phone |
| `phoneSecondary` | string | No | Secondary phone |
| `jobTitle` | string | No | Job title/position |
| `department` | string | No | Department |
| `role` | enum | No | Business role type |
| `seniorityLevel` | enum | No | Seniority level |
| `linkedInUrl` | string (url) | No | LinkedIn profile |
| `twitterHandle` | string | No | Twitter/X handle |
| `address` | object | No | Mailing address |
| `timezone` | string | No | IANA timezone |
| `preferredContactMethod` | enum | No | How to contact |
| `doNotContact` | boolean | No | Opt-out flag |
| `status` | enum | No | Contact status |
| `source` | enum | No | Lead source |
| `birthday` | date | No | Birthday |
| `notes` | string | No | Free-form notes |
| `tags` | string[] | No | Custom tags |

### Field Details

#### `role` (Business Role)
```typescript
enum ContactRole {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  CHAMPION = 'champion',
  END_USER = 'end_user',
  GATEKEEPER = 'gatekeeper',
  TECHNICAL = 'technical',
  EXECUTIVE = 'executive',
  PROCUREMENT = 'procurement',
  LEGAL = 'legal',
  OTHER = 'other'
}
```

#### `seniorityLevel`
```typescript
enum SeniorityLevel {
  C_LEVEL = 'c_level',
  VP = 'vp',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  SENIOR = 'senior',
  MID = 'mid',
  JUNIOR = 'junior',
  INTERN = 'intern'
}
```

#### `preferredContactMethod`
```typescript
enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  LINKEDIN = 'linkedin',
  SLACK = 'slack',
  TEAMS = 'teams',
  IN_PERSON = 'in_person'
}
```

#### `status`
```typescript
enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
  ARCHIVED = 'archived'
}
```

#### `source`
```typescript
enum LeadSource {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  REFERRAL = 'referral',
  EVENT = 'event',
  WEBSITE = 'website',
  SOCIAL = 'social',
  PARTNER = 'partner',
  ADVERTISEMENT = 'advertisement',
  COLD_CALL = 'cold_call',
  OTHER = 'other'
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_contact.json",
  "title": "Contact",
  "description": "Person/individual contact record",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Full name"
    },
    "firstName": {
      "type": "string",
      "maxLength": 100,
      "description": "First name"
    },
    "lastName": {
      "type": "string",
      "maxLength": 100,
      "description": "Last name"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Primary email"
    },
    "emailSecondary": {
      "type": "string",
      "format": "email",
      "description": "Secondary email"
    },
    "phone": {
      "type": "string",
      "pattern": "^[+]?[0-9\\s\\-()]+$",
      "description": "Primary phone"
    },
    "phoneSecondary": {
      "type": "string",
      "pattern": "^[+]?[0-9\\s\\-()]+$",
      "description": "Secondary phone"
    },
    "jobTitle": {
      "type": "string",
      "maxLength": 200,
      "description": "Job title"
    },
    "department": {
      "type": "string",
      "maxLength": 200,
      "description": "Department"
    },
    "role": {
      "type": "string",
      "enum": ["decision_maker", "influencer", "champion", "end_user", "gatekeeper", "technical", "executive", "procurement", "legal", "other"],
      "description": "Business role"
    },
    "seniorityLevel": {
      "type": "string",
      "enum": ["c_level", "vp", "director", "manager", "senior", "mid", "junior", "intern"],
      "description": "Seniority level"
    },
    "linkedInUrl": {
      "type": "string",
      "format": "uri",
      "pattern": "linkedin\\.com",
      "description": "LinkedIn profile URL"
    },
    "twitterHandle": {
      "type": "string",
      "pattern": "^@?[A-Za-z0-9_]{1,15}$",
      "description": "Twitter/X handle"
    },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "street2": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "postalCode": { "type": "string" },
        "country": { "type": "string" }
      },
      "description": "Mailing address"
    },
    "timezone": {
      "type": "string",
      "description": "IANA timezone (e.g., America/New_York)"
    },
    "preferredContactMethod": {
      "type": "string",
      "enum": ["email", "phone", "sms", "linkedin", "slack", "teams", "in_person"],
      "default": "email",
      "description": "Preferred contact method"
    },
    "doNotContact": {
      "type": "boolean",
      "default": false,
      "description": "Do not contact flag"
    },
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "bounced", "unsubscribed", "archived"],
      "default": "active",
      "description": "Contact status"
    },
    "source": {
      "type": "string",
      "enum": ["inbound", "outbound", "referral", "event", "website", "social", "partner", "advertisement", "cold_call", "other"],
      "description": "Lead source"
    },
    "birthday": {
      "type": "string",
      "format": "date",
      "description": "Birthday"
    },
    "notes": {
      "type": "string",
      "maxLength": 5000,
      "description": "Free-form notes"
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

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `belongs_to` | `c_company` | Works at this company |
| `manages` | `c_contact[]` | Direct reports |
| `reports_to` | `c_contact` | Manager |
| `related_to` | `c_contact[]` | Related contacts |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `has_stakeholder` | Involved in project |
| `c_opportunity` | `has_stakeholder` | Involved in deal |
| `c_company` | `has_contact` | Employee of company |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| `crm` | Salesforce (Contact/Lead), HubSpot | CRM record |
| `email` | Gmail, Outlook | Email thread history |
| `messaging` | LinkedIn, Slack | Direct messaging |
| `calendar` | Google Calendar, Outlook | Meeting history |

---

## AI Context Role

### Stakeholder Intelligence

`c_contact` provides critical stakeholder context:

- **Influence mapping**: Understand decision-making power
- **Communication style**: Tailor messaging to seniority/role
- **Relationship history**: Consider past interactions
- **Preferences**: Respect contact preferences

### AI Prompt Fragment

```
Stakeholder: {name}
Title: {jobTitle} at {company.name}
Role: {role} | Seniority: {seniorityLevel}
Email: {email} | Phone: {phone}
Preferred Contact: {preferredContactMethod}
Timezone: {timezone}
Notes: {notes}
```

### Relationship Context

When linked to a project:
```
Project Stakeholder: {name} ({jobTitle})
- Role in project: {relationship.label}
- Decision maker: {role === 'decision_maker' ? 'Yes' : 'No'}
- Seniority: {seniorityLevel}
```

---

## Examples

### Example: Executive Contact

```json
{
  "id": "contact-001-uuid",
  "shardTypeId": "c_contact-type-uuid",
  "structuredData": {
    "name": "John Smith",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@acme.com",
    "phone": "+1-555-123-4567",
    "jobTitle": "Chief Technology Officer",
    "department": "Technology",
    "role": "decision_maker",
    "seniorityLevel": "c_level",
    "linkedInUrl": "https://linkedin.com/in/johnsmith",
    "twitterHandle": "@johnsmith",
    "timezone": "America/New_York",
    "preferredContactMethod": "email",
    "doNotContact": false,
    "status": "active",
    "source": "referral",
    "notes": "Met at TechConf 2024. Very interested in AI capabilities. Prefers morning calls.",
    "tags": ["vip", "technical-buyer", "early-adopter"]
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "company-acme-uuid",
      "targetShardTypeId": "c_company-type-uuid",
      "relationshipType": "belongs_to",
      "label": "Works at Acme Corporation",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "salesforce",
      "systemType": "crm",
      "externalId": "003XXXXXXXXXXXX",
      "externalUrl": "https://org.salesforce.com/003XXXXXXXXXXXX",
      "label": "Salesforce Contact",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-01-20T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "ext-2",
      "system": "linkedin",
      "systemType": "crm",
      "externalId": "johnsmith",
      "externalUrl": "https://linkedin.com/in/johnsmith",
      "label": "LinkedIn Profile",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-20T10:30:00Z"
}
```

---

## Display Configuration

```json
{
  "titleField": "name",
  "subtitleField": "jobTitle",
  "iconField": null,
  "searchableFields": ["name", "firstName", "lastName", "email", "jobTitle", "department"],
  "sortableFields": ["name", "jobTitle", "seniorityLevel", "status"],
  "defaultSortField": "name",
  "defaultSortOrder": "asc"
}
```

---

## Workflow Configuration

```json
{
  "statusField": "status",
  "statuses": [
    { "value": "active", "label": "Active", "color": "#10b981", "order": 1 },
    { "value": "inactive", "label": "Inactive", "color": "#6b7280", "order": 2 },
    { "value": "bounced", "label": "Bounced", "color": "#ef4444", "order": 3 },
    { "value": "unsubscribed", "label": "Unsubscribed", "color": "#f59e0b", "order": 4 },
    { "value": "archived", "label": "Archived", "color": "#9ca3af", "order": 5 }
  ],
  "transitions": [
    { "from": "active", "to": ["inactive", "bounced", "unsubscribed", "archived"] },
    { "from": "inactive", "to": ["active", "archived"] },
    { "from": "bounced", "to": ["active", "archived"] },
    { "from": "unsubscribed", "to": ["archived"] },
    { "from": "archived", "to": ["active"] }
  ],
  "defaultStatus": "active"
}
```

---

## Name Computation

The `name` field can be auto-computed from `firstName` and `lastName`:

```typescript
function computeContactName(contact: Contact): string {
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`;
  }
  if (contact.firstName) return contact.firstName;
  if (contact.lastName) return contact.lastName;
  return contact.name || 'Unknown';
}
```

---

## Best Practices

1. **Complete profiles**: Include job title, role, and seniority for AI context
2. **Link to company**: Always associate with their `c_company`
3. **Track roles**: Use role field to understand influence
4. **Respect preferences**: Honor `doNotContact` and `preferredContactMethod`
5. **Keep updated**: Sync with CRM for current information
6. **Add notes**: Capture personal details and conversation history

---

**Last Updated**: November 2025  
**Version**: 1.0.0







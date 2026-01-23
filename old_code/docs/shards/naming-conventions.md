# Naming Conventions

## Overview

Consistent naming ensures clarity, prevents conflicts, and enables proper access control in Castiel. This document defines naming rules for ShardTypes, Shards, and related entities.

---

## Table of Contents

1. [The `c_` Prefix](#the-c_-prefix)
2. [ShardType Naming](#shardtype-naming)
3. [Shard Naming](#shard-naming)
4. [Field Naming](#field-naming)
5. [Relationship Type Naming](#relationship-type-naming)
6. [Tag Naming](#tag-naming)
7. [Reserved Names](#reserved-names)

---

## The `c_` Prefix

### Definition

The `c_` prefix stands for **"Core"** and identifies system-level ShardTypes that are:

- **Global**: Available to all tenants
- **Protected**: Only Super Admins can create, modify, or delete
- **Foundational**: Form the core data model for AI insights

### Rules

| Rule | Description |
|------|-------------|
| **Super Admin Only** | Only Super Admins can create ShardTypes with `c_` prefix |
| **Tenant Restriction** | Regular tenants **CANNOT** create ShardTypes starting with `c_` |
| **Global Scope** | All `c_` types have `isGlobal: true` and `isBuiltIn: true` |
| **AI Priority** | `c_` types receive priority in AI context assembly |

### Validation

The system MUST enforce these rules:

```typescript
function validateShardTypeName(name: string, userRole: string): boolean {
  // Rule: c_ prefix requires Super Admin
  if (name.startsWith('c_')) {
    if (userRole !== 'super_admin') {
      throw new Error('Only Super Admins can create core (c_) ShardTypes');
    }
  }
  return true;
}
```

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Tenant tries to create `c_*` | `"ShardType names starting with 'c_' are reserved for system types. Please choose a different name."` |
| Non-Super Admin creates `c_*` | `"Only Super Admins can create core ShardTypes (c_ prefix)."` |
| Tenant tries to modify `c_*` | `"Core ShardTypes cannot be modified by tenants."` |

### Core ShardTypes

These are the official `c_` prefixed types:

| Name | Purpose |
|------|---------|
| `c_project` | Central hub for AI insights |
| `c_company` | Organizations/Companies |
| `c_contact` | People/Contacts |
| `c_opportunity` | Sales opportunities |
| `c_document` | Documents and files |
| `c_assistant` | AI Assistant configurations |
| `c_note` | Notes and memos |

→ See [Core Types](./core-types/README.md) for detailed documentation.

---

## ShardType Naming

### Format

```
{prefix}_{entity_name}
```

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Lowercase** | All lowercase letters | `c_project` ✅, `C_Project` ❌ |
| **Snake Case** | Words separated by underscores | `sales_lead` ✅, `salesLead` ❌ |
| **No Spaces** | No whitespace | `customer_record` ✅, `customer record` ❌ |
| **Alphanumeric** | Letters, numbers, underscores only | `lead_v2` ✅, `lead-v2` ❌ |
| **Min Length** | At least 2 characters | `ab` ✅, `a` ❌ |
| **Max Length** | Maximum 50 characters | Keep it reasonable |
| **Descriptive** | Name should describe the entity | `invoice` ✅, `inv` ❌ |

### Prefix Categories

| Prefix | Meaning | Who Can Create | Example |
|--------|---------|----------------|---------|
| `c_` | Core/System type | Super Admin only | `c_project` |
| `t_` | Tenant-specific | Tenant Admins | `t_custom_report` |
| (none) | Standard tenant type | Tenant Admins | `invoice`, `employee` |

### Examples

```
✅ Valid ShardType Names:
- c_project
- c_company
- customer_record
- sales_lead
- invoice_v2
- support_ticket
- product_catalog

❌ Invalid ShardType Names:
- c_MyProject      (uppercase)
- customer-record  (hyphen)
- Customer Record  (spaces, uppercase)
- 123_type         (starts with number)
- _hidden          (starts with underscore)
- c_custom         (c_ used by non-super-admin)
```

### JSON Schema for Validation

```json
{
  "name": {
    "type": "string",
    "pattern": "^[a-z][a-z0-9_]{1,49}$",
    "description": "ShardType name: lowercase, alphanumeric with underscores, 2-50 chars"
  }
}
```

---

## Shard Naming

### The Required `name` Field

Every Shard MUST have a `name` field in `structuredData`. This is the human-readable identifier.

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Required** | Cannot be empty | `"Acme Corp"` ✅, `""` ❌ |
| **Human Readable** | Should make sense to users | `"Q1 Sales Project"` ✅ |
| **Searchable** | Used in search results | Keep it descriptive |
| **Max Length** | 500 characters | Reasonable titles |

### Format by ShardType

| ShardType | Name Format | Example |
|-----------|-------------|---------|
| `c_project` | Project title | `"Enterprise Implementation Q1 2025"` |
| `c_company` | Company name | `"Acme Corporation"` |
| `c_contact` | Full name | `"John Smith"` |
| `c_opportunity` | Opportunity title | `"Acme - Enterprise License Deal"` |
| `c_document` | Document title | `"Technical Specification v2.1"` |
| `c_assistant` | Assistant name | `"Sales Coach AI"` |
| `c_note` | Note title/summary | `"Meeting Notes - Jan 15 Kickoff"` |

### Best Practices

```typescript
// ✅ Good: Clear, descriptive names
{ name: "Acme Corporation - Enterprise Onboarding Project" }
{ name: "Technical Requirements Document v2.1" }
{ name: "John Smith" }

// ❌ Bad: Vague, unhelpful names
{ name: "Project 1" }
{ name: "Doc" }
{ name: "J.S." }
```

---

## Field Naming

### Format

```
camelCase
```

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| **camelCase** | First word lowercase, subsequent capitalized | `firstName` ✅ |
| **Descriptive** | Name describes the content | `emailAddress` ✅, `e` ❌ |
| **No Abbreviations** | Avoid unclear abbreviations | `customerNumber` ✅, `custNo` ❌ |
| **No Underscores** | Use camelCase, not snake_case | `dateOfBirth` ✅, `date_of_birth` ❌ |

### Standard Field Names

Use these standard names when applicable:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required** - Primary identifier |
| `description` | string | Detailed description |
| `email` | string (email) | Email address |
| `phone` | string | Phone number |
| `website` | string (url) | Website URL |
| `address` | object | Physical address |
| `status` | string (enum) | Current status |
| `priority` | string (enum) | Priority level |
| `startDate` | string (date) | Start date |
| `endDate` | string (date) | End date |
| `dueDate` | string (date) | Due date |
| `amount` | number | Monetary amount |
| `currency` | string | Currency code |
| `notes` | string | Free-form notes |

### Address Object Standard

```json
{
  "address": {
    "street": "123 Main St",
    "street2": "Suite 100",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "USA"
  }
}
```

### Examples

```typescript
// ✅ Good field names
{
  name: "Acme Corp",
  firstName: "John",
  lastName: "Smith",
  emailAddress: "john@acme.com",
  phoneNumber: "+1-555-123-4567",
  websiteUrl: "https://acme.com",
  annualRevenue: 5000000,
  employeeCount: 250,
  foundedDate: "2010-05-15",
  isPrimaryContact: true
}

// ❌ Bad field names
{
  n: "Acme Corp",           // Too short
  first_name: "John",       // Snake case
  LASTNAME: "Smith",        // All caps
  email_addr: "john@...",   // Inconsistent
  rev: 5000000,             // Unclear abbreviation
}
```

---

## Relationship Type Naming

### Format

```
{verb}_{noun}  or  {verb}
```

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Snake Case** | Lowercase with underscores | `belongs_to` ✅ |
| **Verb-Based** | Describes the relationship action | `has_stakeholder` ✅ |
| **Direction Clear** | Meaning is clear from source perspective | `parent_of` (from parent) |

### Standard Types

| Type | Format | Description |
|------|--------|-------------|
| Hierarchical | `parent_of`, `child_of`, `belongs_to` | Parent-child relationships |
| Ownership | `has_owner`, `owned_by` | Ownership relationships |
| Association | `related_to`, `references` | General associations |
| Role-Based | `has_stakeholder`, `assigned_to` | People relationships |
| Process | `follows`, `blocks`, `depends_on` | Process flow |

### Examples

```typescript
// ✅ Good relationship types
"belongs_to"
"has_stakeholder"
"opportunity_for"
"mentioned_in"
"depends_on"

// ❌ Bad relationship types
"belongsTo"        // Not snake_case
"BELONGS_TO"       // All caps
"link"             // Too vague
"rel1"             // Meaningless
```

---

## Tag Naming

### Format

```
lowercase-with-hyphens
```

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Lowercase** | All lowercase | `high-priority` ✅ |
| **Hyphen Separated** | Use hyphens for multi-word | `follow-up` ✅ |
| **Short** | Keep tags concise | `urgent` ✅, `this-is-a-very-important-item` ❌ |
| **No Spaces** | No whitespace | `new-lead` ✅, `new lead` ❌ |

### Standard Tags

| Category | Tags |
|----------|------|
| Priority | `urgent`, `high-priority`, `low-priority` |
| Status | `follow-up`, `needs-review`, `on-hold`, `archived` |
| Source | `inbound`, `outbound`, `referral`, `website` |
| Team | `sales`, `marketing`, `engineering`, `support` |
| Stage | `new`, `qualified`, `proposal`, `negotiation`, `closed` |

### Examples

```typescript
// ✅ Good tags
["urgent", "enterprise", "q1-2025", "west-region", "follow-up"]

// ❌ Bad tags
["Urgent", "ENTERPRISE", "Q1 2025", "west_region"]
```

---

## Reserved Names

### System-Reserved ShardType Names

These names are reserved and cannot be used:

```
c_*              // All c_ prefixed names (Super Admin only)
system_*         // System internal types
_*               // Underscore-prefixed names
test_*           // Reserved for testing
tmp_*            // Reserved for temporary types
```

### Reserved Field Names

These field names have special meaning and should be used consistently:

```
id               // System-managed ID
name             // Required identifier
tenantId         // Partition key
userId           // Owner
shardTypeId      // Type reference
parentShardId    // Parent reference
createdAt        // Creation timestamp
updatedAt        // Update timestamp
deletedAt        // Deletion timestamp
status           // Lifecycle status
```

---

## Validation Summary

### ShardType Name Validation

```typescript
function isValidShardTypeName(name: string): boolean {
  // Pattern: lowercase letter, then lowercase letters/numbers/underscores
  const pattern = /^[a-z][a-z0-9_]{1,49}$/;
  return pattern.test(name);
}

function canUserCreateShardType(name: string, role: string): boolean {
  if (name.startsWith('c_') && role !== 'super_admin') {
    return false;
  }
  if (name.startsWith('system_') || name.startsWith('_')) {
    return false;
  }
  return isValidShardTypeName(name);
}
```

### Shard Name Validation

```typescript
function isValidShardName(name: string): boolean {
  return typeof name === 'string' 
    && name.length >= 1 
    && name.length <= 500;
}
```

### Field Name Validation

```typescript
function isValidFieldName(name: string): boolean {
  // camelCase pattern
  const pattern = /^[a-z][a-zA-Z0-9]*$/;
  return pattern.test(name);
}
```

---

## Quick Reference

| Entity | Format | Example |
|--------|--------|---------|
| Core ShardType | `c_` + snake_case | `c_project` |
| Tenant ShardType | snake_case | `sales_lead` |
| Shard name | Human readable | `"Acme Corporation"` |
| Field name | camelCase | `firstName` |
| Relationship type | snake_case verb | `belongs_to` |
| Tag | lowercase-hyphen | `high-priority` |

---

## Next Steps

→ Continue to [Core Types](./core-types/README.md) to explore the built-in `c_` ShardTypes.

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team







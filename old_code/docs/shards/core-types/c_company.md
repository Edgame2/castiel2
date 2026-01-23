# c_company - Company ShardType

## Overview

The `c_company` ShardType represents organizations, businesses, and companies. It serves as a key entity for customer relationship management, linking projects, contacts, and opportunities.

> **AI Role**: Provides organizational context - industry, size, and company background for AI insights.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_company` |
| **Display Name** | Company |
| **Category** | DATA |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `Building2` |
| **Color** | `#8b5cf6` (Purple) |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Company name |
| `legalName` | string | No | Legal/registered name |
| `description` | string | No | Company description |
| `industry` | enum | No | Primary industry |
| `industrySubcategory` | string | No | Industry subcategory |
| `companyType` | enum | No | Type of company |
| `website` | string (url) | No | Company website |
| `email` | string (email) | No | General contact email |
| `phone` | string | No | Main phone number |
| `address` | object | No | Headquarters address |
| `employeeCount` | enum | No | Employee count range |
| `annualRevenue` | number | No | Annual revenue |
| `revenueCurrency` | string | No | Revenue currency |
| `foundedYear` | number | No | Year founded |
| `stockTicker` | string | No | Stock exchange ticker |
| `linkedInUrl` | string (url) | No | LinkedIn company page |
| `twitterHandle` | string | No | Twitter/X handle |
| `status` | enum | No | Relationship status |
| `tier` | enum | No | Customer tier |
| `tags` | string[] | No | Custom tags |

### Field Details

#### `industry`
```typescript
enum Industry {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  EDUCATION = 'education',
  GOVERNMENT = 'government',
  NONPROFIT = 'nonprofit',
  PROFESSIONAL_SERVICES = 'professional_services',
  REAL_ESTATE = 'real_estate',
  MEDIA = 'media',
  ENERGY = 'energy',
  TRANSPORTATION = 'transportation',
  HOSPITALITY = 'hospitality',
  AGRICULTURE = 'agriculture',
  CONSTRUCTION = 'construction',
  OTHER = 'other'
}
```

#### `companyType`
```typescript
enum CompanyType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  STARTUP = 'startup',
  ENTERPRISE = 'enterprise',
  SMB = 'smb',
  NONPROFIT = 'nonprofit',
  GOVERNMENT = 'government',
  SUBSIDIARY = 'subsidiary'
}
```

#### `employeeCount`
```typescript
enum EmployeeRange {
  SOLO = '1',
  MICRO = '2-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-500',
  ENTERPRISE = '501-1000',
  LARGE_ENTERPRISE = '1001-5000',
  MEGA = '5000+'
}
```

#### `status` (Relationship Status)
```typescript
enum CompanyStatus {
  PROSPECT = 'prospect',
  LEAD = 'lead',
  CUSTOMER = 'customer',
  PARTNER = 'partner',
  VENDOR = 'vendor',
  COMPETITOR = 'competitor',
  CHURNED = 'churned',
  INACTIVE = 'inactive'
}
```

#### `tier`
```typescript
enum CustomerTier {
  STRATEGIC = 'strategic',
  ENTERPRISE = 'enterprise',
  MID_MARKET = 'mid_market',
  SMB = 'smb',
  STARTUP = 'startup'
}
```

#### `address`
```typescript
interface Address {
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_company.json",
  "title": "Company",
  "description": "Organization or business entity",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Company name"
    },
    "legalName": {
      "type": "string",
      "maxLength": 500,
      "description": "Legal/registered name"
    },
    "description": {
      "type": "string",
      "maxLength": 5000,
      "description": "Company description"
    },
    "industry": {
      "type": "string",
      "enum": ["technology", "healthcare", "finance", "manufacturing", "retail", "education", "government", "nonprofit", "professional_services", "real_estate", "media", "energy", "transportation", "hospitality", "agriculture", "construction", "other"],
      "description": "Primary industry"
    },
    "industrySubcategory": {
      "type": "string",
      "maxLength": 200,
      "description": "Industry subcategory"
    },
    "companyType": {
      "type": "string",
      "enum": ["public", "private", "startup", "enterprise", "smb", "nonprofit", "government", "subsidiary"],
      "description": "Type of company"
    },
    "website": {
      "type": "string",
      "format": "uri",
      "description": "Company website"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "General contact email"
    },
    "phone": {
      "type": "string",
      "pattern": "^[+]?[0-9\\s\\-()]+$",
      "description": "Main phone number"
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
      "description": "Headquarters address"
    },
    "employeeCount": {
      "type": "string",
      "enum": ["1", "2-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"],
      "description": "Employee count range"
    },
    "annualRevenue": {
      "type": "number",
      "minimum": 0,
      "description": "Annual revenue"
    },
    "revenueCurrency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$",
      "default": "USD",
      "description": "Revenue currency (ISO 4217)"
    },
    "foundedYear": {
      "type": "integer",
      "minimum": 1800,
      "maximum": 2100,
      "description": "Year founded"
    },
    "stockTicker": {
      "type": "string",
      "pattern": "^[A-Z]{1,5}$",
      "description": "Stock ticker symbol"
    },
    "linkedInUrl": {
      "type": "string",
      "format": "uri",
      "pattern": "linkedin\\.com",
      "description": "LinkedIn company page"
    },
    "twitterHandle": {
      "type": "string",
      "pattern": "^@?[A-Za-z0-9_]{1,15}$",
      "description": "Twitter/X handle"
    },
    "status": {
      "type": "string",
      "enum": ["prospect", "lead", "customer", "partner", "vendor", "competitor", "churned", "inactive"],
      "default": "prospect",
      "description": "Relationship status"
    },
    "tier": {
      "type": "string",
      "enum": ["strategic", "enterprise", "mid_market", "smb", "startup"],
      "description": "Customer tier"
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
| `has_contact` | `c_contact[]` | Employees/contacts at this company |
| `has_opportunity` | `c_opportunity[]` | Sales opportunities with this company |
| `has_project` | `c_project[]` | Projects for this company |
| `parent_company_of` | `c_company[]` | Subsidiaries |
| `subsidiary_of` | `c_company` | Parent company |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_contact` | `belongs_to` | Contact works at company |
| `c_opportunity` | `opportunity_for` | Deal with company |
| `c_project` | `has_client` | Project for company |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| `crm` | Salesforce (Account), HubSpot | CRM account record |
| `erp` | SAP, NetSuite | ERP customer record |
| `messaging` | LinkedIn | LinkedIn company page |

---

## AI Context Role

### Context Provider

`c_company` provides organizational context for AI insights:

- **Industry knowledge**: AI understands industry-specific concerns
- **Company size**: Tailors recommendations to company scale
- **Relationship history**: Considers customer/prospect status
- **Financial context**: Budget expectations based on revenue

### AI Prompt Fragment

```
Company: {name}
Type: {companyType} | Industry: {industry}
Size: {employeeCount} employees | Revenue: {revenueCurrency} {annualRevenue}
Status: {status} | Tier: {tier}
Location: {address.city}, {address.country}
Website: {website}
```

---

## Examples

### Example: Enterprise Technology Company

```json
{
  "id": "company-001-uuid",
  "shardTypeId": "c_company-type-uuid",
  "structuredData": {
    "name": "Acme Corporation",
    "legalName": "Acme Corporation Inc.",
    "description": "Leading enterprise software company specializing in cloud solutions for the financial services industry.",
    "industry": "technology",
    "industrySubcategory": "Enterprise Software",
    "companyType": "enterprise",
    "website": "https://acme.com",
    "email": "info@acme.com",
    "phone": "+1-555-123-4567",
    "address": {
      "street": "100 Tech Boulevard",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA"
    },
    "employeeCount": "501-1000",
    "annualRevenue": 150000000,
    "revenueCurrency": "USD",
    "foundedYear": 2010,
    "stockTicker": "ACME",
    "linkedInUrl": "https://linkedin.com/company/acme",
    "twitterHandle": "@AcmeCorp",
    "status": "customer",
    "tier": "enterprise",
    "tags": ["technology", "fintech", "west-coast"]
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "contact-john-uuid",
      "targetShardTypeId": "c_contact-type-uuid",
      "relationshipType": "has_contact",
      "label": "CTO",
      "metadata": { "isPrimary": true },
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "salesforce",
      "systemType": "crm",
      "externalId": "001XXXXXXXXXXXX",
      "externalUrl": "https://org.salesforce.com/001XXXXXXXXXXXX",
      "label": "Salesforce Account",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-01-20T08:00:00Z",
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
  "subtitleField": "industry",
  "iconField": null,
  "searchableFields": ["name", "legalName", "description", "industry", "website"],
  "sortableFields": ["name", "industry", "employeeCount", "annualRevenue", "status"],
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
    { "value": "prospect", "label": "Prospect", "color": "#6b7280", "order": 1 },
    { "value": "lead", "label": "Lead", "color": "#f59e0b", "order": 2 },
    { "value": "customer", "label": "Customer", "color": "#10b981", "order": 3 },
    { "value": "partner", "label": "Partner", "color": "#3b82f6", "order": 4 },
    { "value": "vendor", "label": "Vendor", "color": "#8b5cf6", "order": 5 },
    { "value": "competitor", "label": "Competitor", "color": "#ef4444", "order": 6 },
    { "value": "churned", "label": "Churned", "color": "#dc2626", "order": 7 },
    { "value": "inactive", "label": "Inactive", "color": "#9ca3af", "order": 8 }
  ],
  "transitions": [
    { "from": "prospect", "to": ["lead", "customer", "inactive"] },
    { "from": "lead", "to": ["customer", "prospect", "inactive"] },
    { "from": "customer", "to": ["churned", "partner", "inactive"] },
    { "from": "churned", "to": ["customer", "prospect"] }
  ],
  "defaultStatus": "prospect"
}
```

---

## Best Practices

1. **Complete profiles**: Fill in industry, size, and revenue for better AI context
2. **Link contacts**: Associate key contacts with the company
3. **Track status**: Keep relationship status current
4. **External sync**: Connect to CRM for data consistency
5. **Use tiers**: Classify customers for prioritization

---

**Last Updated**: November 2025  
**Version**: 1.0.0







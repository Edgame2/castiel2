# ShardType Feature - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [What are ShardTypes?](#what-are-shardtypes)
3. [Creating Your First ShardType](#creating-your-first-shardtype)
4. [Using the Schema Builder](#using-the-schema-builder)
5. [Global vs Tenant ShardTypes](#global-vs-tenant-shardtypes)
6. [Best Practices](#best-practices)
7. [Common Use Cases](#common-use-cases)

---

## Introduction

ShardTypes define the structure and behavior of Shards in your Castiel application. They act as templates that ensure data consistency and enable dynamic form generation.

### Key Features
- **Visual Schema Builder**: Create schemas without writing JSON
- **Code Editor**: Direct JSON Schema editing with validation
- **Type Inheritance**: Extend existing types
- **UI Customization**: Control how forms are rendered
- **Global Types**: System-wide types available to all tenants

---

## What are ShardTypes?

ShardTypes are blueprints that define:
- **Data Structure**: What fields a Shard contains (via JSON Schema)
- **Validation Rules**: Required fields, data types, constraints
- **UI Presentation**: How forms should be displayed (via UI Schema)
- **Metadata**: Category, tags, icons, colors for organization

### ShardType Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Document** | Text-based content | Articles, Notes, Reports |
| **Data** | Structured data records | Contacts, Inventory, Metrics |
| **Media** | Rich media content | Images, Videos, Audio files |
| **Configuration** | System settings | App configs, User preferences |
| **Custom** | User-defined types | Any custom use case |

---

## Creating Your First ShardType

### Prerequisites
- Admin or Super Admin role
- Access to the Shard Types section

### Step-by-Step Guide

#### 1. Navigate to Shard Types
- Click **"Shard Types"** in the sidebar navigation
- Or access from Dashboard > **"Create Shard Type"** quick action

#### 2. Click "Create ShardType"
- Located in the top-right of the Shard Types list page

#### 3. Fill in Basic Information

**Name** (required)
- Use lowercase letters, numbers, and hyphens only
- Must be unique within your tenant
- Example: `customer-record`, `blog-post-v2`

**Display Name** (required)
- Human-readable name shown in the UI
- Example: "Customer Record", "Blog Post v2"

**Description** (optional)
- Explain what this ShardType is used for
- Shown in tooltips and detail views

**Category** (required)
- Select from: Document, Data, Media, Configuration, or Custom
- Used for filtering and organization

#### 4. Define the Schema

Choose between two modes:

##### Visual Builder Mode (Recommended for Beginners)
1. Click **"Add Field"**
2. Enter field name (e.g., "title", "email")
3. Select field type:
   - **String**: Text input
   - **Number**: Numeric values
   - **Boolean**: True/false checkbox
   - **Date**: Date picker
   - **Enum**: Dropdown with predefined options
   - **Array**: List of items
   - **Object**: Nested structure
4. Set constraints:
   - Required checkbox
   - Min/Max length or value
   - Pattern (regex)
   - Default value
5. Click **"Add"**

##### Code Editor Mode (For Advanced Users)
- Write JSON Schema directly
- Get syntax highlighting and validation
- Use intellisense for JSON Schema keywords

**Example Schema:**
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "number",
      "minimum": 0,
      "maximum": 120
    },
    "isActive": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["title", "email"]
}
```

#### 5. Customize Visual Identity (Optional)

**Icon**
- Select from 100+ Lucide icons
- Helps identify the type visually

**Color**
- Choose a hex color (e.g., #3b82f6)
- Used for badges and cards

#### 6. Add Tags (Optional)
- Organize types with searchable tags
- Example: "crm", "customer-facing", "v2"

#### 7. Preview Your ShardType
- Click **"Preview"** to see how forms will look
- Test validation rules
- Generate sample data

#### 8. Save
- Click **"Create ShardType"**
- Redirects to the detail page
- Now ready to use when creating Shards

---

## Using the Schema Builder

### Visual Builder Tips

#### Field Naming Conventions
- Use camelCase: `firstName`, `emailAddress`
- Or snake_case: `first_name`, `email_address`
- Avoid spaces and special characters

#### Field Types Guide

**String Fields**
- Text input by default
- Add `format: "email"` for email validation
- Add `format: "uri"` for URLs
- Use `pattern` for custom regex validation
- Set `minLength` and `maxLength` for constraints

**Number Fields**
- Use `"integer"` for whole numbers
- Use `"number"` for decimals
- Set `minimum` and `maximum` for ranges
- Set `multipleOf` for step increments

**Boolean Fields**
- Renders as checkbox
- Set `default: true` for pre-checked state

**Enum Fields**
- Create dropdown select
- Define options in `enum` array:
  ```json
  {
    "type": "string",
    "enum": ["option1", "option2", "option3"]
  }
  ```

**Array Fields**
- List of items
- Define item type in `items`:
  ```json
  {
    "type": "array",
    "items": {
      "type": "string"
    },
    "minItems": 1,
    "maxItems": 10
  }
  ```

**Object Fields (Nested)**
- Create complex structures
- Define properties recursively:
  ```json
  {
    "type": "object",
    "properties": {
      "address": {
        "type": "object",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" },
          "zipCode": { "type": "string" }
        }
      }
    }
  }
  ```

### Code Editor Tips

#### JSON Schema Version
- Castiel uses JSON Schema Draft 7
- Reference: https://json-schema.org/draft-07/schema

#### Common Keywords
- `type`: Data type (string, number, boolean, array, object)
- `properties`: Object field definitions
- `required`: Array of required field names
- `enum`: Allowed values for dropdown
- `format`: Built-in validation (email, uri, date, etc.)
- `pattern`: Regex validation
- `minimum/maximum`: Number constraints
- `minLength/maxLength`: String constraints
- `items`: Array item definition
- `default`: Default value

#### Validation
- Real-time syntax checking
- Hover for error details
- Format on save (Ctrl/Cmd + S)

---

## Global vs Tenant ShardTypes

### Tenant ShardTypes (Default)
- **Scope**: Available only to your tenant
- **Created by**: Admins
- **Use case**: Organization-specific types
- **Examples**: "Our Customer Record", "Internal Report"

### Global ShardTypes (System-wide)
- **Scope**: Available to all tenants
- **Created by**: Super Admins only
- **Use case**: Common, reusable types
- **Examples**: "Standard Contact", "Generic Document"
- **Badge**: Marked with "Global" badge

### When to Use Each

**Use Tenant ShardTypes when:**
- The structure is specific to your organization
- You need full control and customization
- Data fields are unique to your workflow

**Use Global ShardTypes when:**
- Following industry standards
- Sharing types across departments
- Ensuring consistency across the platform

---

## Best Practices

### Schema Design

#### 1. Start Simple
- Begin with essential fields
- Add complexity gradually
- Use type inheritance for variations

#### 2. Use Descriptive Names
```json
// ❌ Bad
{"x": "string", "y": "number"}

// ✅ Good
{"title": "string", "quantity": "number"}
```

#### 3. Provide Defaults
```json
{
  "status": {
    "type": "string",
    "enum": ["draft", "published"],
    "default": "draft"
  }
}
```

#### 4. Add Validation
```json
{
  "email": {
    "type": "string",
    "format": "email",
    "minLength": 5
  }
}
```

#### 5. Document with Descriptions
```json
{
  "customerScore": {
    "type": "number",
    "description": "Customer satisfaction score from 1-10",
    "minimum": 1,
    "maximum": 10
  }
}
```

### Organization

#### Use Categories Effectively
- **Document**: Long-form content with rich text
- **Data**: Structured records for analysis
- **Media**: Files and rich media references
- **Configuration**: Settings and preferences
- **Custom**: Anything that doesn't fit above

#### Tag Strategically
- Use tags for filtering: `"v2"`, `"legacy"`, `"deprecated"`
- Group by feature: `"crm"`, `"reporting"`, `"public-api"`
- Indicate ownership: `"sales-team"`, `"engineering"`

#### Choose Icons Thoughtfully
- Icons aid visual scanning
- Pick icons that represent the content type
- Be consistent across similar types

### Maintenance

#### Version Your Types
- Use semantic naming: `customer-v1`, `customer-v2`
- Don't modify in-use types drastically
- Consider type inheritance for updates

#### Test Before Publishing
- Use Preview to validate forms
- Generate sample data
- Check all validation rules work

#### Monitor Usage
- Check Usage tab before deleting
- Coordinate with team on breaking changes
- Provide migration paths

---

## Common Use Cases

### 1. Customer Record (CRM)

**Category**: Data

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "minLength": 1
    },
    "lastName": {
      "type": "string",
      "minLength": 1
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "phone": {
      "type": "string",
      "pattern": "^[+]?[0-9]{10,15}$"
    },
    "company": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": ["lead", "prospect", "customer", "inactive"],
      "default": "lead"
    },
    "lifetimeValue": {
      "type": "number",
      "minimum": 0
    }
  },
  "required": ["firstName", "lastName", "email"]
}
```

### 2. Blog Post (Content)

**Category**: Document

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "slug": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "excerpt": {
      "type": "string",
      "maxLength": 500
    },
    "content": {
      "type": "string",
      "minLength": 1
    },
    "author": {
      "type": "string"
    },
    "publishDate": {
      "type": "string",
      "format": "date"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "default": "draft"
    }
  },
  "required": ["title", "slug", "content"]
}
```

### 3. Product Inventory (Data)

**Category**: Data

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "sku": {
      "type": "string",
      "pattern": "^[A-Z0-9-]+$"
    },
    "name": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": "string"
    },
    "price": {
      "type": "number",
      "minimum": 0
    },
    "quantity": {
      "type": "integer",
      "minimum": 0
    },
    "category": {
      "type": "string",
      "enum": ["electronics", "clothing", "food", "other"]
    },
    "inStock": {
      "type": "boolean",
      "default": true
    },
    "supplier": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "contact": { "type": "string" }
      }
    }
  },
  "required": ["sku", "name", "price", "quantity"]
}
```

---

## Troubleshooting

### Common Issues

**"Name already exists"**
- ShardType names must be unique per tenant
- Try adding a version suffix: `-v2`, `-new`

**"Invalid JSON Schema"**
- Check for syntax errors in Code Editor
- Ensure all brackets are matched
- Use the Visual Builder if unsure

**"Cannot delete ShardType"**
- Check Usage tab for dependent Shards
- Migrate Shards to another type first
- Or archive the type (set status to Deprecated)

**Preview form doesn't show fields**
- Ensure schema has `"type": "object"`
- Check `properties` are defined
- Verify no validation errors in schema

---

## Next Steps

- Explore the [Admin Guide](./admin-guide.md) for advanced features
- Learn about [Type Inheritance](./inheritance.md)
- Check [API Documentation](./api-reference.md) for programmatic access

---

**Need Help?**
- Contact your system administrator
- Visit the Castiel documentation portal
- Submit feedback through the Help menu

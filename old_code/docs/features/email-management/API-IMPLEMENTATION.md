# Email Templates API Implementation

## Overview

This document describes the REST API endpoints for managing email templates. All endpoints require super admin authentication and authorization.

---

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Request/Response Schemas](#requestresponse-schemas)
5. [Error Handling](#error-handling)

---

## Base URL

All endpoints are prefixed with:

```
/api/admin/email-templates
```

---

## Authentication

All endpoints require:

- **Authentication**: Valid JWT token in `Authorization` header
- **Authorization**: Super admin role (`requireSuperAdmin` middleware)

```typescript
Authorization: Bearer <jwt-token>
```

---

## Endpoints

### 1. Create Template

Create a new email template.

**Endpoint**: `POST /api/admin/email-templates`

**Request Body**:
```typescript
{
  name: string;                   // Unique template name
  language: string;               // ISO 639-1 language code (e.g., "en")
  displayName: string;            // User-friendly name
  category: string;               // e.g., "notifications", "invitations", "alerts"
  description?: string;           // Optional description
  subject: string;                // Subject line with placeholders
  htmlBody: string;               // HTML version with placeholders
  textBody: string;               // Plain text version
  fromEmail?: string;             // Optional from email override
  fromName?: string;              // Optional from name override
  replyTo?: string;               // Optional reply-to address
  placeholders: Array<{           // Placeholder definitions
    name: string;
    description: string;
    example: string;
    required: boolean;
  }>;
  emailProviderId?: string;       // Optional specific provider
  isBaseTemplate?: boolean;       // Default: true if language is "en"
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  tenantId: string;
  name: string;
  language: string;
  displayName: string;
  category: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  placeholders: PlaceholderDefinition[];
  emailProviderId?: string;
  isBaseTemplate: boolean;
  fallbackLanguage: string;
  createdBy: {
    type: 'super_admin';
    userId: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

**Example**:
```bash
curl -X POST /api/admin/email-templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome-email",
    "language": "en",
    "displayName": "Welcome Email",
    "category": "notifications",
    "subject": "Welcome to {{tenantName}}!",
    "htmlBody": "<h1>Welcome {{userName}}!</h1>",
    "textBody": "Welcome {{userName}}!",
    "placeholders": [
      {
        "name": "userName",
        "description": "User'\''s full name",
        "example": "John Doe",
        "required": true
      }
    ]
  }'
```

---

### 2. List Templates

List email templates with optional filters.

**Endpoint**: `GET /api/admin/email-templates`

**Query Parameters**:
- `tenantId` (optional): Filter by tenant ID
- `category` (optional): Filter by category
- `language` (optional): Filter by language
- `isActive` (optional): Filter by active status (default: true)
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `search` (optional): Search by name or displayName

**Response**: `200 OK`
```typescript
{
  templates: EmailTemplateDocument[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

**Example**:
```bash
curl -X GET "/api/admin/email-templates?category=notifications&language=en&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### 3. Get Template by ID

Get a specific template by its ID.

**Endpoint**: `GET /api/admin/email-templates/:id`

**Response**: `200 OK`
```typescript
EmailTemplateDocument
```

**Example**:
```bash
curl -X GET /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

---

### 4. Get Template by Name and Language

Get a template by its name and language.

**Endpoint**: `GET /api/admin/email-templates/:name/:language`

**Path Parameters**:
- `name`: Template name (e.g., "welcome-email")
- `language`: ISO 639-1 language code (e.g., "en")

**Response**: `200 OK`
```typescript
EmailTemplateDocument
```

**Example**:
```bash
curl -X GET /api/admin/email-templates/welcome-email/en \
  -H "Authorization: Bearer <token>"
```

---

### 5. Get All Language Variants

Get all language variants of a template.

**Endpoint**: `GET /api/admin/email-templates/:name/languages`

**Path Parameters**:
- `name`: Template name

**Response**: `200 OK`
```typescript
{
  templateName: string;
  languages: Array<{
    language: string;
    templateId: string;
    displayName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

**Example**:
```bash
curl -X GET /api/admin/email-templates/welcome-email/languages \
  -H "Authorization: Bearer <token>"
```

---

### 6. Update Template

Update an existing template.

**Endpoint**: `PATCH /api/admin/email-templates/:id`

**Request Body**:
```typescript
{
  displayName?: string;
  category?: string;
  description?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  placeholders?: PlaceholderDefinition[];
  emailProviderId?: string;
  isActive?: boolean;
}
```

**Response**: `200 OK`
```typescript
EmailTemplateDocument
```

**Example**:
```bash
curl -X PATCH /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Updated: Welcome to {{tenantName}}!",
    "isActive": true
  }'
```

---

### 7. Delete Template

Delete a template or specific language variant.

**Endpoint**: `DELETE /api/admin/email-templates/:id`

**Response**: `204 No Content`

**Example**:
```bash
curl -X DELETE /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

---

### 8. Test Template Rendering

Test rendering a template with sample placeholder values.

**Endpoint**: `POST /api/admin/email-templates/:id/test`

**Request Body**:
```typescript
{
  placeholders: Record<string, any>;  // Placeholder values for testing
}
```

**Response**: `200 OK`
```typescript
{
  subject: string;        // Rendered subject
  htmlBody: string;      // Rendered HTML body
  textBody: string;      // Rendered text body
  placeholders: {
    provided: string[];   // Placeholders that were provided
    missing: string[];   // Required placeholders that were missing
    unused: string[];    // Placeholders provided but not used
  };
}
```

**Example**:
```bash
curl -X POST /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "placeholders": {
      "userName": "John Doe",
      "tenantName": "Acme Corp",
      "loginUrl": "https://app.castiel.io/login"
    }
  }'
```

---

### 9. Enable/Disable Template

Enable or disable a template without deleting it.

**Endpoint**: `PATCH /api/admin/email-templates/:id/status`

**Request Body**:
```typescript
{
  isActive: boolean;
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  isActive: boolean;
  updatedAt: string;
}
```

**Example**:
```bash
curl -X PATCH /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

---

### 10. Duplicate Template to Another Language

Duplicate an existing template to create a new language variant.

**Endpoint**: `POST /api/admin/email-templates/:id/duplicate`

**Request Body**:
```typescript
{
  language: string;              // Target language code
  displayName?: string;          // Optional new display name
  translate?: boolean;           // Whether to attempt translation (future feature)
}
```

**Response**: `201 Created`
```typescript
EmailTemplateDocument  // New language variant
```

**Example**:
```bash
curl -X POST /api/admin/email-templates/550e8400-e29b-41d4-a716-446655440000/duplicate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "fr",
    "displayName": "Email de bienvenue"
  }'
```

---

## Request/Response Schemas

### Zod Validation Schemas

```typescript
import { z } from 'zod';

// Placeholder Definition Schema
const PlaceholderDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  example: z.string().max(200),
  required: z.boolean()
});

// Create Template Schema
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  language: z.string().length(2).regex(/^[a-z]{2}$/),
  displayName: z.string().min(1).max(200),
  category: z.enum(['notifications', 'invitations', 'alerts', 'system']),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().min(1),
  fromEmail: z.string().email().optional(),
  fromName: z.string().max(200).optional(),
  replyTo: z.string().email().optional(),
  placeholders: z.array(PlaceholderDefinitionSchema).min(0),
  emailProviderId: z.string().uuid().optional(),
  isBaseTemplate: z.boolean().optional()
});

// Update Template Schema
const UpdateTemplateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  category: z.enum(['notifications', 'invitations', 'alerts', 'system']).optional(),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlBody: z.string().min(1).optional(),
  textBody: z.string().min(1).optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().max(200).optional(),
  replyTo: z.string().email().optional(),
  placeholders: z.array(PlaceholderDefinitionSchema).optional(),
  emailProviderId: z.string().uuid().optional(),
  isActive: z.boolean().optional()
});

// Test Template Schema
const TestTemplateSchema = z.object({
  placeholders: z.record(z.string(), z.any())
});

// Duplicate Template Schema
const DuplicateTemplateSchema = z.object({
  language: z.string().length(2).regex(/^[a-z]{2}$/),
  displayName: z.string().min(1).max(200).optional(),
  translate: z.boolean().optional()
});
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```typescript
{
  error: {
    code: string;           // Error code
    message: string;        // Human-readable message
    details?: any;          // Additional error details
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User does not have super admin role |
| `NOT_FOUND` | 404 | Template not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_TEMPLATE` | 409 | Template with same name and language already exists |
| `MISSING_REQUIRED_PLACEHOLDER` | 400 | Required placeholder missing in test |
| `INVALID_LANGUAGE` | 400 | Invalid language code format |
| `TEMPLATE_IN_USE` | 409 | Cannot delete template that is in use |

### Example Error Responses

**401 Unauthorized**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Template not found",
    "details": {
      "templateId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**409 Duplicate Template**:
```json
{
  "error": {
    "code": "DUPLICATE_TEMPLATE",
    "message": "Template with name 'welcome-email' and language 'en' already exists",
    "details": {
      "name": "welcome-email",
      "language": "en",
      "existingTemplateId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:

- **Create/Update/Delete**: 100 requests per minute per user
- **List/Get**: 200 requests per minute per user
- **Test**: 50 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## Related Documentation

- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Service layer details
- [Template Rendering](./TEMPLATE-RENDERING.md) - Rendering logic
- [Database Implementation](./DATABASE-IMPLEMENTATION.md) - Database schema








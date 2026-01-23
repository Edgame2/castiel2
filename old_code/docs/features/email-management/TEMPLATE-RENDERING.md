# Email Template Rendering

## Overview

This document describes the placeholder system and template rendering logic used by the Email Management System. Templates use Mustache-style syntax for dynamic content replacement.

---

## Table of Contents

1. [Placeholder System](#placeholder-system)
2. [Rendering Service](#rendering-service)
3. [Placeholder Syntax](#placeholder-syntax)
4. [Rendering Examples](#rendering-examples)
5. [Error Handling](#error-handling)

---

## Placeholder System

### Overview

The placeholder system uses Mustache-style syntax (`{{variableName}}`) for dynamic content replacement. Placeholders are defined in the template document and validated during rendering.

### Placeholder Definition

Each template includes placeholder definitions:

```typescript
interface PlaceholderDefinition {
  name: string;                   // Placeholder name (e.g., "userName")
  description: string;            // What this placeholder represents
  example: string;                // Example value
  required: boolean;              // Whether placeholder must be provided
}
```

### Placeholder Validation

Before rendering, the system validates:

1. **Required Placeholders**: All required placeholders must be provided
2. **Placeholder Names**: Only defined placeholders can be used
3. **Type Safety**: Placeholder values are validated against expected types

---

## Rendering Service

### EmailTemplateService.renderTemplate()

The main rendering method:

```typescript
async renderTemplate(
  template: EmailTemplateDocument,
  placeholders: Record<string, any>
): Promise<RenderedTemplate> {
  // 1. Validate placeholders
  this.validatePlaceholders(template, placeholders);

  // 2. Render subject
  const renderedSubject = this.renderString(template.subject, placeholders);

  // 3. Render HTML body
  const renderedHtmlBody = this.renderString(template.htmlBody, placeholders);

  // 4. Render text body
  const renderedTextBody = this.renderString(template.textBody, placeholders);

  return {
    subject: renderedSubject,
    htmlBody: renderedHtmlBody,
    textBody: renderedTextBody
  };
}
```

### Validation

```typescript
private validatePlaceholders(
  template: EmailTemplateDocument,
  placeholders: Record<string, any>
): void {
  const requiredPlaceholders = template.placeholders
    .filter(p => p.required)
    .map(p => p.name);

  const missing = requiredPlaceholders.filter(
    name => !(name in placeholders) || placeholders[name] === undefined
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required placeholders: ${missing.join(', ')}`
    );
  }
}
```

---

## Placeholder Syntax

### Simple Placeholders

Basic variable replacement:

```
{{variableName}}
```

**Example**:
```
Template: "Welcome {{userName}}!"
Placeholders: { userName: "John Doe" }
Result: "Welcome John Doe!"
```

### Nested Objects

Access nested object properties:

```
{{user.profile.name}}
{{tenant.settings.brandName}}
```

**Example**:
```
Template: "Hello {{user.profile.firstName}}!"
Placeholders: { user: { profile: { firstName: "John" } } }
Result: "Hello John!"
```

### Conditionals

Conditional blocks:

```
{{#if condition}}
  Content shown if condition is truthy
{{/if}}

{{#unless condition}}
  Content shown if condition is falsy
{{/unless}}
```

**Example**:
```
Template: "{{#if isNewUser}}Welcome!{{/if}}"
Placeholders: { isNewUser: true }
Result: "Welcome!"
```

### Loops

Iterate over arrays:

```
{{#each items}}
  Item: {{this}}
{{/each}}

{{#each users}}
  User: {{name}} ({{email}})
{{/each}}
```

**Example**:
```
Template: "{{#each tasks}}Task: {{name}}\n{{/each}}"
Placeholders: { tasks: [{ name: "Task 1" }, { name: "Task 2" }] }
Result: "Task: Task 1\nTask: Task 2\n"
```

### Escaping

HTML escaping (default):
```
{{variableName}}  <!-- Escaped -->
```

Unescaped HTML:
```
{{{variableName}}}  <!-- Not escaped -->
```

**Example**:
```
Template: "<p>{{htmlContent}}</p>"
Placeholders: { htmlContent: "<strong>Bold</strong>" }
Result: "<p>&lt;strong&gt;Bold&lt;/strong&gt;</p>"

Template: "<p>{{{htmlContent}}}</p>"
Placeholders: { htmlContent: "<strong>Bold</strong>" }
Result: "<p><strong>Bold</strong></p>"
```

### Comments

Comments are ignored:

```
{{! This is a comment }}
{{!-- This is also a comment --}}
```

---

## Rendering Examples

### Example 1: Simple Welcome Email

**Template**:
```html
Subject: Welcome to {{tenantName}}!

HTML Body:
<h1>Welcome {{userName}}!</h1>
<p>You've been invited to join {{tenantName}}.</p>
<p><a href="{{loginUrl}}">Click here to login</a></p>

Text Body:
Welcome {{userName}}!
You've been invited to join {{tenantName}}.
Login at: {{loginUrl}}
```

**Placeholders**:
```typescript
{
  userName: "John Doe",
  tenantName: "Acme Corp",
  loginUrl: "https://app.castiel.io/login"
}
```

**Rendered**:
```html
Subject: Welcome to Acme Corp!

HTML Body:
<h1>Welcome John Doe!</h1>
<p>You've been invited to join Acme Corp.</p>
<p><a href="https://app.castiel.io/login">Click here to login</a></p>

Text Body:
Welcome John Doe!
You've been invited to join Acme Corp.
Login at: https://app.castiel.io/login
```

### Example 2: Conditional Content

**Template**:
```html
Subject: {{#if isUrgent}}URGENT: {{/if}}{{taskName}}

HTML Body:
<h1>{{taskName}}</h1>
{{#if isUrgent}}
  <p style="color: red;">This task is urgent!</p>
{{/if}}
<p>Assigned to: {{assigneeName}}</p>
{{#if dueDate}}
  <p>Due: {{dueDate}}</p>
{{/if}}
```

**Placeholders**:
```typescript
{
  isUrgent: true,
  taskName: "Complete project proposal",
  assigneeName: "Jane Smith",
  dueDate: "2024-01-20"
}
```

**Rendered**:
```html
Subject: URGENT: Complete project proposal

HTML Body:
<h1>Complete project proposal</h1>
<p style="color: red;">This task is urgent!</p>
<p>Assigned to: Jane Smith</p>
<p>Due: 2024-01-20</p>
```

### Example 3: Loops

**Template**:
```html
Subject: You have {{tasks.length}} new tasks

HTML Body:
<h1>Your Tasks</h1>
<ul>
{{#each tasks}}
  <li>
    <strong>{{name}}</strong>
    {{#if dueDate}} - Due: {{dueDate}}{{/if}}
  </li>
{{/each}}
</ul>
```

**Placeholders**:
```typescript
{
  tasks: [
    { name: "Task 1", dueDate: "2024-01-20" },
    { name: "Task 2", dueDate: null },
    { name: "Task 3", dueDate: "2024-01-22" }
  ]
}
```

**Rendered**:
```html
Subject: You have 3 new tasks

HTML Body:
<h1>Your Tasks</h1>
<ul>
  <li>
    <strong>Task 1</strong> - Due: 2024-01-20
  </li>
  <li>
    <strong>Task 2</strong>
  </li>
  <li>
    <strong>Task 3</strong> - Due: 2024-01-22
  </li>
</ul>
```

### Example 4: Nested Objects

**Template**:
```html
Subject: Security Alert for {{user.profile.name}}

HTML Body:
<h1>Security Alert</h1>
<p>Hello {{user.profile.firstName}},</p>
<p>A new device was used to access your account:</p>
<ul>
  <li>Device: {{device.name}}</li>
  <li>Location: {{device.location.city}}, {{device.location.country}}</li>
  <li>IP Address: {{device.ipAddress}}</li>
</ul>
<p>If this wasn't you, please <a href="{{securityUrl}}">secure your account</a>.</p>
```

**Placeholders**:
```typescript
{
  user: {
    profile: {
      name: "John Doe",
      firstName: "John"
    }
  },
  device: {
    name: "Chrome on Windows",
    location: {
      city: "New York",
      country: "US"
    },
    ipAddress: "192.168.1.1"
  },
  securityUrl: "https://app.castiel.io/security"
}
```

**Rendered**:
```html
Subject: Security Alert for John Doe

HTML Body:
<h1>Security Alert</h1>
<p>Hello John,</p>
<p>A new device was used to access your account:</p>
<ul>
  <li>Device: Chrome on Windows</li>
  <li>Location: New York, US</li>
  <li>IP Address: 192.168.1.1</li>
</ul>
<p>If this wasn't you, please <a href="https://app.castiel.io/security">secure your account</a>.</p>
```

---

## Error Handling

### Missing Required Placeholder

```typescript
try {
  await renderTemplate(template, placeholders);
} catch (error) {
  if (error.code === 'MISSING_REQUIRED_PLACEHOLDER') {
    console.error('Missing placeholder:', error.placeholder);
    // Handle error
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "MISSING_REQUIRED_PLACEHOLDER",
    "message": "Missing required placeholder: userName",
    "details": {
      "placeholder": "userName",
      "requiredPlaceholders": ["userName", "tenantName"],
      "providedPlaceholders": ["tenantName"]
    }
  }
}
```

### Invalid Placeholder Syntax

```typescript
// Template with invalid syntax
const template = {
  subject: "Welcome {{userName"  // Missing closing braces
};

// Rendering will fail
try {
  await renderTemplate(template, placeholders);
} catch (error) {
  if (error.code === 'INVALID_PLACEHOLDER_SYNTAX') {
    console.error('Invalid syntax:', error.details);
  }
}
```

### Undefined Placeholder

```typescript
// Using undefined placeholder
const template = {
  subject: "Welcome {{undefinedPlaceholder}}!"
};

// Rendering will use empty string or throw error based on configuration
const result = await renderTemplate(template, {});
// Result: "Welcome !" (empty string)
```

---

## Rendering Implementation

### Mustache Library

The system uses a Mustache-compatible library (e.g., `mustache` or `handlebars`):

```typescript
import Mustache from 'mustache';

class EmailRenderingService {
  renderString(template: string, placeholders: Record<string, any>): string {
    try {
      return Mustache.render(template, placeholders);
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }
}
```

### Custom Helpers (Optional)

For advanced features, custom helpers can be added:

```typescript
// Date formatting helper
Mustache.registerHelper('formatDate', (date: string, format: string) => {
  return formatDate(date, format);
});

// Template usage
{{formatDate createdAt "MMM DD, YYYY"}}
```

---

## Best Practices

### 1. Always Define Placeholders

```typescript
// Good: Define all placeholders
placeholders: [
  { name: "userName", description: "User's name", example: "John Doe", required: true },
  { name: "tenantName", description: "Tenant name", example: "Acme Corp", required: true }
]

// Bad: Undefined placeholders
// Template uses {{undefinedVar}} but not defined in placeholders
```

### 2. Use Descriptive Names

```typescript
// Good: Clear and descriptive
{{userFullName}}
{{tenantOrganizationName}}
{{passwordResetUrl}}

// Bad: Unclear
{{u}}
{{tn}}
{{url}}
```

### 3. Handle Missing Values

```typescript
// Use conditionals for optional content
{{#if optionalField}}
  Optional content: {{optionalField}}
{{/if}}

// Or provide defaults
{{optionalField}}  // Will be empty string if not provided
```

### 4. Escape HTML Properly

```typescript
// Good: Escaped by default
<p>{{userInput}}</p>  // Safe, HTML is escaped

// Only use unescaped when you control the content
<p>{{{trustedHtml}}}</p>  // Not escaped, use with caution
```

---

## Related Documentation

- [Email Templates README](./README.md) - Overview
- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Service layer
- [API Implementation](./API-IMPLEMENTATION.md) - API endpoints








# Email Templates Service Implementation

## Overview

This document describes the service layer architecture for the email management system, including the EmailTemplateService, EmailRenderingService, and their integration with the integration system for email providers.

---

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [EmailTemplateService](#emailtemplateservice)
3. [EmailRenderingService](#emailrenderingservice)
4. [Integration with Email Providers](#integration-with-email-providers)
5. [Error Handling](#error-handling)

---

## Service Architecture

### Service Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Controllers                           │
│              (EmailTemplateController)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Services                             │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ EmailTemplate    │  │ EmailRendering   │         │
│  │ Service          │  │ Service          │         │
│  └────────┬─────────┘  └────────┬─────────┘         │
│           │                      │                     │
│           └──────────┬───────────┘                     │
│                      │                                  │
│                      ▼                                  │
│           ┌─────────────────────┐                      │
│           │ Integration Service │                      │
│           │ (Email Providers)   │                      │
│           └─────────────────────┘                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Repositories                            │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ EmailTemplate    │  │ Integration      │         │
│  │ Repository       │  │ Repository       │         │
│  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

---

## EmailTemplateService

### Overview

The `EmailTemplateService` handles all business logic for email templates, including CRUD operations, language management, and email sending.

### Methods

#### createTemplate()

Create a new email template.

```typescript
async createTemplate(
  data: CreateTemplateInput,
  userId: string,
  userName: string
): Promise<EmailTemplateDocument> {
  // 1. Validate template data
  this.validateTemplateData(data);

  // 2. Check for duplicate (name + language)
  const existing = await this.repository.findByNameAndLanguage(
    data.name,
    data.language,
    data.tenantId
  );
  if (existing) {
    throw new Error('Template with this name and language already exists');
  }

  // 3. Set base template flag
  const isBaseTemplate = data.language === 'en' || data.isBaseTemplate === true;

  // 4. Create template document
  const template: EmailTemplateDocument = {
    id: generateUUID(),
    tenantId: data.tenantId || 'system',
    name: data.name,
    language: data.language,
    displayName: data.displayName,
    category: data.category,
    description: data.description,
    subject: data.subject,
    htmlBody: data.htmlBody,
    textBody: data.textBody,
    fromEmail: data.fromEmail,
    fromName: data.fromName,
    replyTo: data.replyTo,
    placeholders: data.placeholders,
    emailProviderId: data.emailProviderId,
    isBaseTemplate,
    fallbackLanguage: 'en',
    createdBy: {
      type: 'super_admin',
      userId,
      name: userName
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  };

  // 5. Save to repository
  return await this.repository.create(template);
}
```

#### updateTemplate()

Update an existing template.

```typescript
async updateTemplate(
  id: string,
  updates: UpdateTemplateInput,
  userId: string,
  userName: string
): Promise<EmailTemplateDocument> {
  // 1. Get existing template
  const template = await this.repository.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }

  // 2. Validate updates
  this.validateTemplateUpdates(updates);

  // 3. Update template
  const updated: EmailTemplateDocument = {
    ...template,
    ...updates,
    updatedBy: {
      userId,
      name: userName
    },
    updatedAt: new Date().toISOString()
  };

  // 4. Save to repository
  return await this.repository.update(id, updated);
}
```

#### deleteTemplate()

Delete a template or language variant.

```typescript
async deleteTemplate(id: string): Promise<void> {
  // 1. Get template
  const template = await this.repository.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }

  // 2. Check if template is in use (optional validation)
  const inUse = await this.checkTemplateInUse(template.name);
  if (inUse) {
    throw new Error('Template is in use and cannot be deleted');
  }

  // 3. Delete from repository
  await this.repository.delete(id);
}
```

#### getTemplate()

Get template by ID.

```typescript
async getTemplate(id: string): Promise<EmailTemplateDocument> {
  const template = await this.repository.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }
  return template;
}
```

#### getTemplateByLanguage()

Get template by name and language with fallback.

```typescript
async getTemplateByLanguage(
  name: string,
  language: string,
  tenantId: string
): Promise<EmailTemplateDocument> {
  // 1. Try requested language
  let template = await this.repository.findByNameAndLanguage(
    name,
    language,
    tenantId
  );

  // 2. Fallback to English if not found
  if (!template && language !== 'en') {
    template = await this.repository.findByNameAndLanguage(
      name,
      'en',
      tenantId
    );
  }

  if (!template) {
    throw new Error(`Template '${name}' not found`);
  }

  return template;
}
```

#### getTemplateLanguages()

Get all language variants of a template.

```typescript
async getTemplateLanguages(
  name: string,
  tenantId: string
): Promise<Array<{ language: string; templateId: string; isActive: boolean }>> {
  const templates = await this.repository.findByName(name, tenantId);
  
  return templates.map(t => ({
    language: t.language,
    templateId: t.id,
    displayName: t.displayName,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }));
}
```

#### listTemplates()

List templates with filters.

```typescript
async listTemplates(
  filters: TemplateFilters,
  pagination: PaginationOptions
): Promise<PaginatedResult<EmailTemplateDocument>> {
  return await this.repository.list(filters, pagination);
}
```

#### renderTemplate()

Render template with placeholders.

```typescript
async renderTemplate(
  template: EmailTemplateDocument,
  placeholders: Record<string, any>
): Promise<RenderedTemplate> {
  return await this.renderingService.render(template, placeholders);
}
```

#### sendEmail()

Send email using template and provider.

```typescript
async sendEmail(params: {
  template: EmailTemplateDocument;
  rendered: RenderedTemplate;
  to: string | string[];
  tenantId: string;
  userId?: string;
}): Promise<EmailSendResult> {
  // 1. Get email provider
  const provider = await this.getEmailProvider(
    params.template.emailProviderId,
    params.tenantId
  );

  // 2. Get provider adapter
  const adapter = await this.adapterManager.getAdapter(
    provider.providerName,
    provider.integration,
    params.userId
  );

  // 3. Send email via adapter
  return await adapter.sendEmail({
    to: params.to,
    subject: params.rendered.subject,
    htmlBody: params.rendered.htmlBody,
    textBody: params.rendered.textBody,
    from: params.template.fromEmail || provider.fromEmail,
    fromName: params.template.fromName || provider.fromName,
    replyTo: params.template.replyTo
  });
}
```

#### testTemplate()

Test template rendering with sample data.

```typescript
async testTemplate(
  templateId: string,
  placeholders: Record<string, any>
): Promise<TestResult> {
  // 1. Get template
  const template = await this.getTemplate(templateId);

  // 2. Render template
  const rendered = await this.renderTemplate(template, placeholders);

  // 3. Validate placeholders
  const validation = this.validatePlaceholders(template, placeholders);

  return {
    subject: rendered.subject,
    htmlBody: rendered.htmlBody,
    textBody: rendered.textBody,
    placeholders: {
      provided: Object.keys(placeholders),
      missing: validation.missing,
      unused: validation.unused
    }
  };
}
```

#### duplicateTemplate()

Duplicate template to another language.

```typescript
async duplicateTemplate(
  sourceTemplateId: string,
  targetLanguage: string,
  displayName?: string
): Promise<EmailTemplateDocument> {
  // 1. Get source template
  const source = await this.getTemplate(sourceTemplateId);

  // 2. Check if target language already exists
  const existing = await this.repository.findByNameAndLanguage(
    source.name,
    targetLanguage,
    source.tenantId
  );
  if (existing) {
    throw new Error(`Template already exists for language: ${targetLanguage}`);
  }

  // 3. Create duplicate
  const duplicate: EmailTemplateDocument = {
    ...source,
    id: generateUUID(),
    language: targetLanguage,
    displayName: displayName || source.displayName,
    isBaseTemplate: targetLanguage === 'en',
    baseTemplateName: source.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 4. Save duplicate
  return await this.repository.create(duplicate);
}
```

---

## EmailRenderingService

### Overview

The `EmailRenderingService` handles template rendering using Mustache syntax.

### Methods

#### render()

Render template with placeholders.

```typescript
import Mustache from 'mustache';

async render(
  template: EmailTemplateDocument,
  placeholders: Record<string, any>
): Promise<RenderedTemplate> {
  // 1. Validate placeholders
  this.validatePlaceholders(template, placeholders);

  // 2. Render subject
  const subject = Mustache.render(template.subject, placeholders);

  // 3. Render HTML body
  const htmlBody = Mustache.render(template.htmlBody, placeholders);

  // 4. Render text body
  const textBody = Mustache.render(template.textBody, placeholders);

  return {
    subject,
    htmlBody,
    textBody
  };
}
```

#### validatePlaceholders()

Validate placeholder values.

```typescript
private validatePlaceholders(
  template: EmailTemplateDocument,
  placeholders: Record<string, any>
): ValidationResult {
  const required = template.placeholders
    .filter(p => p.required)
    .map(p => p.name);

  const missing = required.filter(
    name => !(name in placeholders) || placeholders[name] === undefined
  );

  const provided = Object.keys(placeholders);
  const defined = template.placeholders.map(p => p.name);
  const unused = provided.filter(name => !defined.includes(name));

  return {
    valid: missing.length === 0,
    missing,
    unused
  };
}
```

---

## Integration with Email Providers

### getEmailProvider()

Get email provider from integration system.

```typescript
private async getEmailProvider(
  providerId: string | undefined,
  tenantId: string
): Promise<EmailProvider> {
  // 1. If template specifies provider, use it
  if (providerId) {
    const integration = await this.integrationService.getIntegration(providerId);
    return {
      integration,
      fromEmail: integration.settings?.fromEmail,
      fromName: integration.settings?.fromName
    };
  }

  // 2. Get tenant default email provider
  const defaultProvider = await this.integrationService.getTenantDefaultEmailProvider(tenantId);
  if (defaultProvider) {
    return {
      integration: defaultProvider,
      fromEmail: defaultProvider.settings?.fromEmail,
      fromName: defaultProvider.settings?.fromName
    };
  }

  // 3. Fallback to system default
  const systemDefault = await this.integrationService.getSystemDefaultEmailProvider();
  if (!systemDefault) {
    throw new Error('No email provider configured');
  }

  return {
    integration: systemDefault,
    fromEmail: systemDefault.settings?.fromEmail,
    fromName: systemDefault.settings?.fromName
  };
}
```

### sendViaProvider()

Send email through provider adapter.

```typescript
private async sendViaProvider(
  provider: EmailProvider,
  emailParams: EmailParams,
  userId?: string
): Promise<EmailSendResult> {
  // 1. Get adapter
  const adapter = await this.adapterManager.getAdapter(
    provider.integration.providerName,
    provider.integration,
    userId
  );

  // 2. Send email
  try {
    return await adapter.sendEmail(emailParams);
  } catch (error) {
    // Log error and throw
    console.error('Email send failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
```

---

## Error Handling

### Error Types

```typescript
enum EmailTemplateError {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  DUPLICATE_TEMPLATE = 'DUPLICATE_TEMPLATE',
  MISSING_REQUIRED_PLACEHOLDER = 'MISSING_REQUIRED_PLACEHOLDER',
  INVALID_PLACEHOLDER_SYNTAX = 'INVALID_PLACEHOLDER_SYNTAX',
  TEMPLATE_IN_USE = 'TEMPLATE_IN_USE',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED'
}
```

### Error Handling Example

```typescript
try {
  await emailTemplateService.sendEmail(/* ... */);
} catch (error) {
  if (error.code === 'PROVIDER_NOT_FOUND') {
    // Try fallback provider
    await sendEmailWithFallback(/* ... */);
  } else if (error.code === 'EMAIL_SEND_FAILED') {
    // Log error, notification still created
    console.error('Email send failed:', error);
  } else {
    throw error;
  }
}
```

---

## Related Documentation

- [API Implementation](./API-IMPLEMENTATION.md) - API endpoints
- [Template Rendering](./TEMPLATE-RENDERING.md) - Rendering details
- [Integration System](./INTEGRATION-SYSTEM.md) - Email provider integration








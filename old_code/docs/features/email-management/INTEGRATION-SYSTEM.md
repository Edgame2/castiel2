# Email Management Integration System

## Overview

The Email Management System integrates with the existing Integration System to leverage configured email providers for sending emails. Email providers are configured as integration providers in the integration system, allowing tenants to choose and configure their preferred email service.

---

## Table of Contents

1. [Email Provider Integration](#email-provider-integration)
2. [Provider Selection Flow](#provider-selection-flow)
3. [Integration Points](#integration-points)
4. [Supported Providers](#supported-providers)
5. [Provider Configuration](#provider-configuration)
6. [Usage Examples](#usage-examples)

---

## Email Provider Integration

### Overview

Email providers are configured as integration providers in the integration system:

- **Category**: `"email"` or `"communication"`
- **Provider Type**: Integration provider with email sending capabilities
- **Tenant Configuration**: Each tenant can configure their email provider integration
- **Template Override**: Templates can optionally specify a specific provider

### Integration Provider Document

Email providers are stored as `IntegrationProviderDocument` in the `integration_providers` container:

```typescript
interface IntegrationProviderDocument {
  id: string;
  category: 'email' | 'communication';
  provider: string; // e.g., "azure-acs", "sendgrid", "mailgun", "smtp"
  displayName: string;
  description?: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant';
  
  // Email-specific capabilities
  capabilities: ['send'];
  supportsNotifications: true; // Can be used by notification system
  
  // Authentication
  authType: 'api_key' | 'oauth2' | 'basic' | 'connection_string';
  // ... other provider fields
}
```

### Integration Connection

Email provider credentials are stored in the `integration-connections` container:

```typescript
interface IntegrationConnection {
  id: string;
  integrationId: string; // Reference to integration instance
  tenantId: string;
  scope: 'system' | 'tenant' | 'user';
  
  // Email provider credentials
  authType: 'api_key' | 'oauth2' | 'basic' | 'connection_string';
  // Credentials stored in Azure Key Vault
  keyVaultSecretName: string;
  
  status: 'connected' | 'disconnected' | 'error';
  // ... other connection fields
}
```

---

## Provider Selection Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│           Email Template Send Request                    │
└────────────────────┬────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Check Template       │
         │  emailProviderId      │
         └────────┬───────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐      ┌──────────────┐
   │ Template│      │ Use Tenant   │
   │ Specific│      │ Default      │
   │ Provider│      │ Provider     │
   └────┬────┘      └──────┬───────┘
        │                  │
        └──────────┬───────┘
                   │
                   ▼
      ┌────────────────────────┐
      │  Get Provider from     │
      │  Integration System   │
      └──────────┬─────────────┘
                 │
                 ▼
      ┌────────────────────────┐
      │  Retrieve Credentials   │
      │  from Key Vault        │
      └──────────┬─────────────┘
                 │
                 ▼
      ┌────────────────────────┐
      │  Get Provider Adapter  │
      └──────────┬─────────────┘
                 │
                 ▼
      ┌────────────────────────┐
      │  Send Email via        │
      │  Provider Adapter      │
      └────────────────────────┘
```

### Step-by-Step Process

1. **Check Template Provider**:
   ```typescript
   if (template.emailProviderId) {
     // Use template-specific provider
     providerId = template.emailProviderId;
   } else {
     // Use tenant's default email provider
     providerId = await getTenantDefaultEmailProvider(tenantId);
   }
   ```

2. **Get Integration Instance**:
   ```typescript
   const integration = await integrationService.getIntegration(providerId);
   ```

3. **Get Connection**:
   ```typescript
   const connection = await connectionService.getConnection(
     integration.id,
     tenantId
   );
   ```

4. **Retrieve Credentials**:
   ```typescript
   const credentials = await keyVaultService.getSecret(
     connection.keyVaultSecretName
   );
   ```

5. **Get Provider Adapter**:
   ```typescript
   const adapter = await adapterManager.getAdapter(
     integration.providerName,
     integration,
     userId // For user-scoped connections
   );
   ```

6. **Send Email**:
   ```typescript
   await adapter.sendEmail({
     to: recipientEmail,
     subject: renderedSubject,
     htmlBody: renderedHtmlBody,
     textBody: renderedTextBody,
     from: template.fromEmail || integration.fromEmail,
     fromName: template.fromName || integration.fromName,
     replyTo: template.replyTo
   });
   ```

---

## Integration Points

### 1. IntegrationProviderDocument

Email providers are defined as integration providers:

```typescript
// Example: Azure Communication Services provider
{
  id: "azure-acs-email",
  category: "email",
  provider: "azure-acs",
  displayName: "Azure Communication Services",
  status: "active",
  audience: "tenant",
  capabilities: ["send"],
  supportsNotifications: true,
  authType: "connection_string"
}
```

### 2. IntegrationConnection

Email provider connections store credentials:

```typescript
// Example: Tenant's Azure ACS connection
{
  id: "connection-123",
  integrationId: "integration-azure-acs",
  tenantId: "tenant-456",
  scope: "tenant",
  authType: "connection_string",
  keyVaultSecretName: "tenant-456-azure-acs-email-connection",
  status: "connected"
}
```

### 3. Adapter Pattern

Email providers use the adapter pattern for sending:

```typescript
interface EmailProviderAdapter {
  sendEmail(params: {
    to: string | string[];
    subject: string;
    htmlBody: string;
    textBody: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<EmailSendResult>;
}
```

---

## Supported Providers

### Azure Communication Services

- **Provider ID**: `azure-acs`
- **Category**: `email`
- **Auth Type**: `connection_string`
- **Key Vault Secret**: Connection string for Azure ACS
- **Capabilities**: Send email, track delivery

### SendGrid

- **Provider ID**: `sendgrid`
- **Category**: `email`
- **Auth Type**: `api_key`
- **Key Vault Secret**: SendGrid API key
- **Capabilities**: Send email, templates, analytics

### Mailgun

- **Provider ID**: `mailgun`
- **Category**: `email`
- **Auth Type**: `api_key`
- **Key Vault Secret**: Mailgun API key
- **Capabilities**: Send email, tracking, webhooks

### SMTP

- **Provider ID**: `smtp`
- **Category**: `email`
- **Auth Type**: `basic`
- **Key Vault Secret**: SMTP credentials (username, password, host, port)
- **Capabilities**: Send email via SMTP server

---

## Provider Configuration

### Tenant Default Provider

Each tenant can configure a default email provider:

```typescript
// Set tenant default email provider
await integrationService.setTenantDefaultEmailProvider(
  tenantId,
  integrationId
);
```

### Template-Specific Provider

Templates can override the tenant default:

```typescript
// Create template with specific provider
const template = {
  name: "welcome-email",
  language: "en",
  emailProviderId: "integration-sendgrid", // Override tenant default
  // ... other template fields
};
```

### Provider Selection Priority

1. Template-specific provider (`template.emailProviderId`)
2. Tenant default email provider
3. System default email provider (fallback)

---

## Usage Examples

### Example 1: Send Email Using Template

```typescript
import { EmailTemplateService } from '@/services/email-template.service';
import { IntegrationService } from '@/services/integration.service';

const emailTemplateService = new EmailTemplateService();
const integrationService = new IntegrationService();

// Get template
const template = await emailTemplateService.getTemplateByLanguage(
  'welcome-email',
  'en',
  tenantId
);

// Render template
const rendered = await emailTemplateService.renderTemplate(
  template,
  {
    userName: 'John Doe',
    tenantName: 'Acme Corp',
    loginUrl: 'https://app.castiel.io/login'
  }
);

// Get email provider
let providerId = template.emailProviderId;
if (!providerId) {
  providerId = await integrationService.getTenantDefaultEmailProvider(tenantId);
}

// Send email
await emailTemplateService.sendEmail({
  template,
  rendered,
  to: 'user@example.com',
  providerId
});
```

### Example 2: Configure Tenant Email Provider

```typescript
// 1. Create integration instance
const integration = await integrationService.createIntegration({
  tenantId: 'tenant-123',
  providerName: 'sendgrid',
  name: 'SendGrid Email',
  status: 'active'
});

// 2. Create connection with credentials
const connection = await connectionService.createTenantConnection({
  integrationId: integration.id,
  tenantId: 'tenant-123',
  credentials: {
    apiKey: 'SG.xxxxx' // Stored in Key Vault
  }
});

// 3. Set as default
await integrationService.setTenantDefaultEmailProvider(
  'tenant-123',
  integration.id
);
```

### Example 3: Fallback Provider

```typescript
async function sendEmailWithFallback(
  template: EmailTemplateDocument,
  recipient: string,
  placeholders: Record<string, any>
) {
  try {
    // Try template-specific provider
    if (template.emailProviderId) {
      return await sendViaProvider(template.emailProviderId, template, recipient, placeholders);
    }
    
    // Try tenant default
    const tenantDefault = await getTenantDefaultEmailProvider(template.tenantId);
    if (tenantDefault) {
      return await sendViaProvider(tenantDefault, template, recipient, placeholders);
    }
    
    // Fallback to system default
    const systemDefault = await getSystemDefaultEmailProvider();
    return await sendViaProvider(systemDefault, template, recipient, placeholders);
    
  } catch (error) {
    // Log error and retry with fallback
    console.error('Email send failed:', error);
    throw error;
  }
}
```

---

## Error Handling

### Provider Connection Errors

```typescript
try {
  await sendEmail(/* ... */);
} catch (error) {
  if (error.code === 'PROVIDER_CONNECTION_ERROR') {
    // Retry with fallback provider
    await sendEmailWithFallback(/* ... */);
  } else if (error.code === 'INVALID_CREDENTIALS') {
    // Notify tenant admin
    await notifyTenantAdmin(tenantId, 'Email provider credentials invalid');
  }
}
```

### Provider Unavailable

```typescript
// Check provider status before sending
const provider = await getEmailProvider(providerId);
if (provider.status !== 'active') {
  // Use fallback provider
  providerId = await getFallbackProvider(tenantId);
}
```

---

## Related Documentation

- [Integrations System](../integrations/README.md) - Integration system overview
- [Integration Providers](../integrations/PROVIDERS.md) - Available providers
- [Credentials Management](../integrations/CREDENTIALS.md) - Key Vault integration
- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Email template service








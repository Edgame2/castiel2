# Multi-Language Email Template Support

## Overview

The Email Management System supports multi-language templates through separate template documents per language. Each language variant is stored as an independent template document, allowing for flexible translation management and independent updates.

---

## Table of Contents

1. [Language Storage Strategy](#language-storage-strategy)
2. [Language Selection](#language-selection)
3. [Template Retrieval](#template-retrieval)
4. [Language Management](#language-management)
5. [Default Language and Fallback](#default-language-and-fallback)
6. [Notification Integration](#notification-integration)

---

## Language Storage Strategy

### Separate Documents Per Language

Each language variant is stored as a complete, independent template document:

```
EmailTemplates Container:
├── welcome-email-en (English)
├── welcome-email-fr (French)
├── welcome-email-de (German)
└── welcome-email-es (Spanish)
```

### Document Structure

Each language variant has the same structure but different content:

```typescript
// English version
{
  id: "template-en-123",
  name: "welcome-email",
  language: "en",
  subject: "Welcome to {{tenantName}}!",
  htmlBody: "<h1>Welcome {{userName}}!</h1>",
  // ...
}

// French version
{
  id: "template-fr-456",
  name: "welcome-email",
  language: "fr",
  subject: "Bienvenue chez {{tenantName}}!",
  htmlBody: "<h1>Bienvenue {{userName}}!</h1>",
  // ...
}
```

### Language Code Format

Languages use ISO 639-1 format (2-letter codes):

- `en` - English
- `fr` - French
- `de` - German
- `es` - Spanish
- `it` - Italian
- `pt` - Portuguese
- `ja` - Japanese
- `zh` - Chinese
- etc.

### Base Template Concept

The first template created (usually English) is considered the base template:

```typescript
{
  name: "welcome-email",
  language: "en",
  isBaseTemplate: true,  // First template is base
  baseTemplateName: undefined  // No base for base template
}

// Language variants reference base
{
  name: "welcome-email",
  language: "fr",
  isBaseTemplate: false,
  baseTemplateName: "welcome-email"  // References base
}
```

---

## Language Selection

### Creating Templates

Super admins can create templates in multiple ways:

#### Option 1: All at Once

Create all language variants simultaneously using a multi-tab or multi-section form:

```
┌─────────────────────────────────────────┐
│  Create Template                        │
├─────────────────────────────────────────┤
│  Basic Info (shared)                    │
│  ┌───────────────────────────────────┐ │
│  │ Name: welcome-email               │ │
│  │ Category: notifications           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Languages                              │
│  [en] [fr] [de] [es]                   │
│  ┌───────────────────────────────────┐ │
│  │ English                            │ │
│  │ Subject: [Welcome to...]           │ │
│  │ HTML: [TipTap Editor]              │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Option 2: One at a Time

Create base template first, then add language variants later:

1. Create English template (`welcome-email-en`)
2. Click "Add Language" button
3. Select target language (e.g., French)
4. Option to duplicate from English
5. Translate content
6. Save new language variant

### Language Selector

The template form includes a language selector:

```typescript
<LanguageSelector
  selectedLanguage={language}
  availableLanguages={['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'zh']}
  onLanguageChange={setLanguage}
  onCreateAll={() => setMode('create-all')}
/>
```

### Duplicating to New Language

Existing templates can be duplicated to create new language variants:

```typescript
// Duplicate English template to French
await emailTemplateService.duplicateTemplate(
  sourceTemplateId: 'template-en-123',
  targetLanguage: 'fr',
  displayName: 'Email de bienvenue'
);
```

---

## Template Retrieval

### By Name and Language

Get a specific template by name and language:

```typescript
const template = await emailTemplateService.getTemplateByLanguage(
  'welcome-email',
  'fr',
  tenantId
);
```

### Language Fallback

If the requested language is not available, the system automatically falls back to English:

```typescript
async getTemplateByLanguage(
  name: string,
  language: string,
  tenantId: string
): Promise<EmailTemplateDocument> {
  // 1. Try requested language
  let template = await repository.findByNameAndLanguage(name, language, tenantId);

  // 2. Fallback to English if not found
  if (!template && language !== 'en') {
    template = await repository.findByNameAndLanguage(name, 'en', tenantId);
  }

  if (!template) {
    throw new Error(`Template '${name}' not found`);
  }

  return template;
}
```

### Get All Language Variants

Get all language versions of a template:

```typescript
const languages = await emailTemplateService.getTemplateLanguages(
  'welcome-email',
  tenantId
);

// Returns:
// [
//   { language: 'en', templateId: '...', isActive: true },
//   { language: 'fr', templateId: '...', isActive: true },
//   { language: 'de', templateId: '...', isActive: false }
// ]
```

---

## Language Management

### List View

The template list shows language badges for each template:

```
┌─────────────────────────────────────┐
│ Welcome Email        [en][fr][de]  │
│ Task Alert          [en]            │
│ Security Alert      [en][fr]        │
└─────────────────────────────────────┘
```

### Language Completion Status

Show which languages are available for each template:

```typescript
interface LanguageStatus {
  templateName: string;
  languages: Array<{
    language: string;
    available: boolean;
    isActive: boolean;
  }>;
  completion: number; // Percentage of supported languages
}
```

### Filtering by Language

Filter templates by language:

```typescript
// Get all English templates
const englishTemplates = await emailTemplateService.listTemplates({
  language: 'en',
  isActive: true
});
```

### Warning Indicators

Show warnings for missing translations:

```
⚠️ Template "welcome-email" missing translations: de, es, it
```

---

## Default Language and Fallback

### English as Default

English (`en`) is the default and fallback language:

- All templates must have an English version
- System uses English if user's preferred language is not available
- English is always created first (base template)

### Fallback Mechanism

The fallback mechanism ensures emails are always sent, even if translation is missing:

```
User Language: fr
  ↓
Template Request: welcome-email-fr
  ↓
Not Found?
  ↓
Fallback: welcome-email-en
  ↓
Send Email
```

### Fallback Configuration

Templates can specify a custom fallback language:

```typescript
{
  name: "welcome-email",
  language: "fr",
  fallbackLanguage: "en",  // Default fallback
  // ...
}
```

---

## Notification Integration

### User Language Preference

The notification system uses the user's preferred language:

```typescript
// Get user's preferred language
const user = await getUser(userId);
const language = user.preferredLanguage || 'en';

// Get template in user's language
const template = await emailTemplateService.getTemplateByLanguage(
  'welcome-email',
  language,
  user.tenantId
);

// Render and send email
const rendered = await emailTemplateService.renderTemplate(template, placeholders);
await emailTemplateService.sendEmail({ template, rendered, to: user.email });
```

### Language Preference Storage

User language preference is stored in the user profile:

```typescript
interface User {
  id: string;
  email: string;
  preferredLanguage: string; // e.g., "en", "fr", "de"
  // ...
}
```

### Fallback in Notifications

If user's language is not available, system falls back to English:

```typescript
async sendEmailNotification(
  userId: string,
  templateName: string,
  placeholders: Record<string, any>
): Promise<void> {
  const user = await getUser(userId);
  const language = user.preferredLanguage || 'en';

  // Get template (with automatic fallback to English)
  const template = await emailTemplateService.getTemplateByLanguage(
    templateName,
    language,
    user.tenantId
  );

  // Send email
  await sendEmail(template, placeholders, user.email);
}
```

---

## Best Practices

### 1. Always Create English First

```typescript
// Good: Create English first
await createTemplate({ name: 'welcome-email', language: 'en', ... });
await createTemplate({ name: 'welcome-email', language: 'fr', ... });

// Bad: Create other languages without English
await createTemplate({ name: 'welcome-email', language: 'fr', ... });
// Missing English fallback!
```

### 2. Keep Placeholders Consistent

```typescript
// Good: Same placeholders across all languages
// English: "Welcome {{userName}}!"
// French: "Bienvenue {{userName}}!"
// Same placeholder: userName

// Bad: Different placeholders
// English: "Welcome {{userName}}!"
// French: "Bienvenue {{nomUtilisateur}}!"
// Different placeholders cause errors
```

### 3. Maintain Translation Quality

- Use professional translation services
- Review translations for accuracy
- Test rendered emails in each language
- Keep translations up to date

### 4. Track Language Completion

```typescript
// Monitor which templates need translations
const templates = await listTemplates();
const incomplete = templates.filter(t => 
  t.languages.length < supportedLanguages.length
);
```

---

## Related Documentation

- [Email Templates README](./README.md) - Overview
- [Database Implementation](./DATABASE-IMPLEMENTATION.md) - Storage details
- [API Implementation](./API-IMPLEMENTATION.md) - Language endpoints
- [Notification Integration](./NOTIFICATION-INTEGRATION.md) - Language usage








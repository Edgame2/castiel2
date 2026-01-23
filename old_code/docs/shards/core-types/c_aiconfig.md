# c_aiconfig - AI Configuration

## Overview

The `c_aiconfig` ShardType stores AI prompt configurations, including persona settings, style preferences, tool configurations, domain knowledge, and safety guardrails. It enables Super Admins to manage system-wide AI behavior and Tenant Admins to customize their organization's AI experience.

> **Purpose**: Make AI behavior configurable and auditable through the standard Shard system.

---

## Schema Definition

```typescript
const AI_CONFIG_SHARD_TYPE: ShardType = {
  id: 'c_aiconfig',
  name: 'AI Configuration',
  description: 'Stores AI prompt configurations for system, tenant, or assistant level',
  category: ShardTypeCategory.CONFIGURATION,
  
  schema: {
    type: 'object',
    properties: aiConfigFields,
  },
  
  format: 'rich',
  
  // AI configurations should not be embedded
  embedding: {
    enabled: false,
  },
  
  // Core type - cannot be deleted
  isCore: true,
  isSystem: true,
  
  // Permissions
  permissions: {
    create: ['super_admin', 'tenant_admin'],
    read: ['super_admin', 'tenant_admin', 'admin'],
    update: ['super_admin', 'tenant_admin'],
    delete: ['super_admin'],
  },
};
```

---

## Field Definitions

### Identity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Configuration name (e.g., "System Default", "Sales Team Config") |
| `description` | `string` | No | Description of this configuration |
| `configType` | `enum` | Yes | `system` \| `tenant` \| `assistant` |
| `isDefault` | `boolean` | Yes | Whether this is the default config for its scope |
| `isActive` | `boolean` | Yes | Whether this config is currently active |
| `version` | `string` | Yes | Configuration version for migrations |

### Scope Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | `string` | Conditional | Required for `tenant` and `assistant` types |
| `assistantId` | `string` | Conditional | Required for `assistant` type |
| `inheritFrom` | `string` | No | Parent config ID to inherit from |

### Persona Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `persona.name` | `string` | Yes | AI persona name (default: "Castiel") |
| `persona.description` | `string` | No | What the AI is |
| `persona.personality` | `string[]` | No | Personality traits |
| `persona.expertise` | `string[]` | No | Areas of expertise |
| `persona.customInstructions` | `string` | No | Free-form custom instructions |

### Style Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `style.tone` | `enum` | Yes | `professional` \| `friendly` \| `formal` \| `casual` \| `adaptive` |
| `style.defaultLength` | `enum` | Yes | `concise` \| `standard` \| `detailed` |
| `style.useEmojis` | `enum` | Yes | `never` \| `sparingly` \| `freely` |
| `style.preferredFormat` | `enum` | Yes | `bullets` \| `prose` \| `adaptive` |
| `style.actionSuggestions` | `enum` | Yes | `always` \| `when_relevant` \| `only_if_asked` |
| `style.roleAdaptation` | `object` | No | Role-based style rules |

### Tools Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tools.enabledTools` | `string[]` | Yes | List of enabled tool IDs |
| `tools.disabledTools` | `string[]` | No | Explicitly disabled tools |
| `tools.customTools` | `CustomTool[]` | No | Custom tool definitions |
| `tools.toolPermissions` | `object` | No | Per-tool permission overrides |

### Web Search Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webSearch.enabled` | `boolean` | Yes | Whether web search is enabled |
| `webSearch.triggers` | `string[]` | No | When to trigger web search |
| `webSearch.maxSearchesPerQuery` | `number` | No | Max searches per query |
| `webSearch.allowedDomains` | `string[]` | No | Whitelist of domains |
| `webSearch.blockedDomains` | `string[]` | No | Blacklist of domains |

### Domain Knowledge Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domainKnowledge.enabled` | `boolean` | Yes | Whether domain knowledge is enabled |
| `domainKnowledge.industry` | `string` | No | Industry context |
| `domainKnowledge.enabledFrameworks` | `string[]` | No | Enabled framework IDs |
| `domainKnowledge.customFrameworks` | `Framework[]` | No | Custom framework definitions |
| `domainKnowledge.terminology` | `object` | No | Custom terminology mappings |
| `domainKnowledge.bestPractices` | `string[]` | No | Best practices to include |

### Safety Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `safety.refuseTopics` | `string[]` | No | Topics AI should refuse |
| `safety.cautionTopics` | `string[]` | No | Topics requiring caution |
| `safety.requireApprovalTopics` | `string[]` | No | Topics requiring user approval |
| `safety.piiHandling.maskInResponses` | `boolean` | Yes | Mask PII in responses |
| `safety.piiHandling.warnAboutPII` | `boolean` | Yes | Warn before showing PII |
| `safety.piiHandling.piiFields` | `string[]` | No | Fields considered PII |
| `safety.hallucination.strictness` | `enum` | Yes | `strict` \| `moderate` \| `lenient` |
| `safety.hallucination.requireCitations` | `boolean` | Yes | Require citations |
| `safety.maxResponseLength` | `number` | No | Max response length in chars |

### Localization Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localization.enabled` | `boolean` | Yes | Enable localization |
| `localization.defaultLanguage` | `string` | Yes | Default language code |
| `localization.supportedLanguages` | `string[]` | No | Supported language codes |
| `localization.detectUserLanguage` | `boolean` | No | Auto-detect user language |
| `localization.dateFormat` | `string` | No | Date format or 'localized' |
| `localization.timezone` | `string` | No | Timezone or 'user' |

### Customization Control (System Config Only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customization.tenantCustomizableFields` | `string[]` | No | Fields tenants can customize |
| `customization.lockedFields` | `string[]` | No | Fields locked from customization |
| `customization.allowCustomTools` | `boolean` | No | Allow tenants to add tools |
| `customization.allowCustomFrameworks` | `boolean` | No | Allow tenants to add frameworks |

---

## Rich Field Definitions

```typescript
const aiConfigFields: RichFieldDefinition[] = [
  // Identity
  {
    id: 'name',
    name: 'Configuration Name',
    type: 'TEXT',
    required: true,
    validation: { minLength: 1, maxLength: 100 },
    design: { columns: 6, order: 1 },
  },
  {
    id: 'description',
    name: 'Description',
    type: 'TEXTAREA',
    required: false,
    design: { columns: 6, order: 2 },
  },
  {
    id: 'configType',
    name: 'Configuration Type',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'system', label: 'System (Global Default)' },
        { value: 'tenant', label: 'Tenant (Organization)' },
        { value: 'assistant', label: 'Assistant (Specialized)' },
      ],
    },
    design: { columns: 4, order: 3 },
  },
  {
    id: 'isDefault',
    name: 'Is Default',
    type: 'BOOLEAN',
    required: true,
    defaultValue: false,
    design: { columns: 4, order: 4, displayAs: 'switch' },
  },
  {
    id: 'isActive',
    name: 'Is Active',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 4, order: 5, displayAs: 'switch' },
  },
  
  // Persona Group
  {
    id: 'persona',
    name: 'Persona',
    type: 'GROUP',
    design: { columns: 12, order: 10, collapsible: true },
  },
  {
    id: 'persona.name',
    name: 'Persona Name',
    type: 'TEXT',
    required: true,
    defaultValue: 'Castiel',
    validation: { minLength: 1, maxLength: 50 },
    design: { columns: 6, order: 11, group: 'persona' },
  },
  {
    id: 'persona.description',
    name: 'Persona Description',
    type: 'TEXT',
    required: false,
    defaultValue: 'An intelligent business assistant',
    design: { columns: 6, order: 12, group: 'persona' },
  },
  {
    id: 'persona.personality',
    name: 'Personality Traits',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'helpful', label: 'Helpful' },
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'insightful', label: 'Insightful' },
        { value: 'proactive', label: 'Proactive' },
        { value: 'concise', label: 'Concise' },
        { value: 'thorough', label: 'Thorough' },
        { value: 'empathetic', label: 'Empathetic' },
      ],
      allowCustom: true,
    },
    defaultValue: ['helpful', 'professional', 'insightful', 'proactive'],
    design: { columns: 6, order: 13, group: 'persona' },
  },
  {
    id: 'persona.expertise',
    name: 'Areas of Expertise',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'business_analysis', label: 'Business Analysis' },
        { value: 'project_management', label: 'Project Management' },
        { value: 'sales_operations', label: 'Sales Operations' },
        { value: 'data_interpretation', label: 'Data Interpretation' },
        { value: 'customer_success', label: 'Customer Success' },
        { value: 'financial_analysis', label: 'Financial Analysis' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'hr', label: 'Human Resources' },
      ],
      allowCustom: true,
    },
    defaultValue: ['business_analysis', 'project_management', 'sales_operations', 'data_interpretation'],
    design: { columns: 6, order: 14, group: 'persona' },
  },
  {
    id: 'persona.customInstructions',
    name: 'Custom Instructions',
    type: 'TEXTAREA',
    required: false,
    design: { columns: 12, order: 15, group: 'persona', rows: 4 },
    helpText: 'Additional instructions to include in the system prompt',
  },
  
  // Style Group
  {
    id: 'style',
    name: 'Communication Style',
    type: 'GROUP',
    design: { columns: 12, order: 20, collapsible: true },
  },
  {
    id: 'style.tone',
    name: 'Default Tone',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'adaptive', label: 'Adaptive (adjusts to context)' },
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'formal', label: 'Formal' },
        { value: 'casual', label: 'Casual' },
      ],
    },
    defaultValue: 'adaptive',
    design: { columns: 4, order: 21, group: 'style' },
  },
  {
    id: 'style.defaultLength',
    name: 'Default Response Length',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'concise', label: 'Concise (2-3 sentences)' },
        { value: 'standard', label: 'Standard (1-2 paragraphs)' },
        { value: 'detailed', label: 'Detailed (comprehensive)' },
      ],
    },
    defaultValue: 'standard',
    design: { columns: 4, order: 22, group: 'style' },
  },
  {
    id: 'style.useEmojis',
    name: 'Emoji Usage',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'never', label: 'Never' },
        { value: 'sparingly', label: 'Sparingly (for emphasis)' },
        { value: 'freely', label: 'Freely' },
      ],
    },
    defaultValue: 'sparingly',
    design: { columns: 4, order: 23, group: 'style' },
  },
  {
    id: 'style.preferredFormat',
    name: 'Preferred Format',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'adaptive', label: 'Adaptive (based on content)' },
        { value: 'bullets', label: 'Bullet Points' },
        { value: 'prose', label: 'Prose' },
      ],
    },
    defaultValue: 'adaptive',
    design: { columns: 6, order: 24, group: 'style' },
  },
  {
    id: 'style.actionSuggestions',
    name: 'Action Suggestions',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'always', label: 'Always include' },
        { value: 'when_relevant', label: 'When relevant' },
        { value: 'only_if_asked', label: 'Only if asked' },
      ],
    },
    defaultValue: 'when_relevant',
    design: { columns: 6, order: 25, group: 'style' },
  },
  
  // Tools Group
  {
    id: 'tools',
    name: 'Tools & Capabilities',
    type: 'GROUP',
    design: { columns: 12, order: 30, collapsible: true },
  },
  {
    id: 'tools.enabledTools',
    name: 'Enabled Tools',
    type: 'MULTISELECT',
    required: true,
    options: {
      items: [
        { value: 'create_task', label: 'Create Task' },
        { value: 'schedule_meeting', label: 'Schedule Meeting' },
        { value: 'draft_email', label: 'Draft Email' },
        { value: 'navigate_to_shard', label: 'Navigate to Shard' },
        { value: 'web_search', label: 'Web Search' },
        { value: 'update_shard', label: 'Update Shard' },
        { value: 'create_shard', label: 'Create Shard' },
      ],
      searchable: true,
    },
    defaultValue: ['create_task', 'schedule_meeting', 'draft_email', 'navigate_to_shard', 'web_search'],
    design: { columns: 12, order: 31, group: 'tools' },
  },
  
  // Web Search Group
  {
    id: 'webSearch',
    name: 'Web Search',
    type: 'GROUP',
    design: { columns: 12, order: 40, collapsible: true },
  },
  {
    id: 'webSearch.enabled',
    name: 'Enable Web Search',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 4, order: 41, group: 'webSearch', displayAs: 'switch' },
  },
  {
    id: 'webSearch.maxSearchesPerQuery',
    name: 'Max Searches Per Query',
    type: 'NUMBER',
    required: false,
    defaultValue: 3,
    validation: { min: 1, max: 10 },
    design: { columns: 4, order: 42, group: 'webSearch' },
  },
  {
    id: 'webSearch.triggers',
    name: 'Search Triggers',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'user_requests_search', label: 'User explicitly requests' },
        { value: 'needs_current_information', label: 'Needs current information' },
        { value: 'company_research', label: 'Company research' },
        { value: 'news_lookup', label: 'News lookup' },
        { value: 'competitor_analysis', label: 'Competitor analysis' },
      ],
    },
    defaultValue: ['user_requests_search', 'needs_current_information', 'company_research', 'news_lookup'],
    design: { columns: 12, order: 43, group: 'webSearch' },
  },
  
  // Domain Knowledge Group
  {
    id: 'domainKnowledge',
    name: 'Domain Knowledge',
    type: 'GROUP',
    design: { columns: 12, order: 50, collapsible: true },
  },
  {
    id: 'domainKnowledge.enabled',
    name: 'Enable Domain Knowledge',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 4, order: 51, group: 'domainKnowledge', displayAs: 'switch' },
  },
  {
    id: 'domainKnowledge.industry',
    name: 'Industry Context',
    type: 'SELECT',
    required: false,
    options: {
      items: [
        { value: 'sales', label: 'Sales' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'legal', label: 'Legal' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'technology', label: 'Technology' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'custom', label: 'Custom' },
      ],
    },
    design: { columns: 4, order: 52, group: 'domainKnowledge' },
  },
  {
    id: 'domainKnowledge.enabledFrameworks',
    name: 'Enabled Frameworks',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'meddic', label: 'MEDDIC (Sales)' },
        { value: 'bant', label: 'BANT (Sales)' },
        { value: 'spin', label: 'SPIN Selling' },
        { value: 'challenger', label: 'Challenger Sale' },
        { value: 'agile', label: 'Agile/Scrum' },
        { value: 'waterfall', label: 'Waterfall' },
        { value: 'okr', label: 'OKRs' },
        { value: 'kpi', label: 'KPIs' },
      ],
      searchable: true,
    },
    design: { columns: 12, order: 53, group: 'domainKnowledge' },
  },
  
  // Safety Group
  {
    id: 'safety',
    name: 'Safety & Guardrails',
    type: 'GROUP',
    design: { columns: 12, order: 60, collapsible: true },
  },
  {
    id: 'safety.hallucination.strictness',
    name: 'Accuracy Strictness',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'strict', label: 'Strict (only verified facts)' },
        { value: 'moderate', label: 'Moderate (cite sources, flag uncertainty)' },
        { value: 'lenient', label: 'Lenient (helpful even with incomplete data)' },
      ],
    },
    defaultValue: 'moderate',
    design: { columns: 6, order: 61, group: 'safety' },
  },
  {
    id: 'safety.hallucination.requireCitations',
    name: 'Require Citations',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 3, order: 62, group: 'safety', displayAs: 'switch' },
  },
  {
    id: 'safety.piiHandling.maskInResponses',
    name: 'Mask PII',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 3, order: 63, group: 'safety', displayAs: 'switch' },
  },
  {
    id: 'safety.refuseTopics',
    name: 'Refuse Topics',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'illegal_activities', label: 'Illegal Activities' },
        { value: 'harmful_content', label: 'Harmful Content' },
        { value: 'medical_diagnosis', label: 'Medical Diagnosis' },
        { value: 'legal_advice', label: 'Legal Advice' },
        { value: 'financial_advice', label: 'Financial Advice' },
      ],
      allowCustom: true,
    },
    defaultValue: ['illegal_activities', 'harmful_content', 'medical_diagnosis', 'legal_advice'],
    design: { columns: 12, order: 64, group: 'safety' },
  },
  {
    id: 'safety.maxResponseLength',
    name: 'Max Response Length',
    type: 'NUMBER',
    required: false,
    defaultValue: 4000,
    validation: { min: 500, max: 10000 },
    design: { columns: 6, order: 65, group: 'safety' },
    helpText: 'Maximum characters in AI responses',
  },
  
  // Localization Group
  {
    id: 'localization',
    name: 'Localization',
    type: 'GROUP',
    design: { columns: 12, order: 70, collapsible: true },
  },
  {
    id: 'localization.enabled',
    name: 'Enable Localization',
    type: 'BOOLEAN',
    required: true,
    defaultValue: true,
    design: { columns: 4, order: 71, group: 'localization', displayAs: 'switch' },
  },
  {
    id: 'localization.defaultLanguage',
    name: 'Default Language',
    type: 'SELECT',
    required: true,
    options: {
      items: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'ja', label: 'Japanese' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ko', label: 'Korean' },
      ],
    },
    defaultValue: 'en',
    design: { columns: 4, order: 72, group: 'localization' },
  },
  {
    id: 'localization.detectUserLanguage',
    name: 'Auto-detect Language',
    type: 'BOOLEAN',
    required: false,
    defaultValue: true,
    design: { columns: 4, order: 73, group: 'localization', displayAs: 'switch' },
  },
  
  // Customization Control (System Only)
  {
    id: 'customization',
    name: 'Tenant Customization Control',
    type: 'GROUP',
    design: { 
      columns: 12, 
      order: 80, 
      collapsible: true,
      conditionalVisibility: {
        field: 'configType',
        operator: 'equals',
        value: 'system',
      },
    },
  },
  {
    id: 'customization.tenantCustomizableFields',
    name: 'Fields Tenants Can Customize',
    type: 'MULTISELECT',
    required: false,
    options: {
      items: [
        { value: 'persona.name', label: 'Persona Name' },
        { value: 'persona.description', label: 'Persona Description' },
        { value: 'persona.personality', label: 'Personality Traits' },
        { value: 'persona.customInstructions', label: 'Custom Instructions' },
        { value: 'style.*', label: 'All Style Settings' },
        { value: 'tools.enabledTools', label: 'Enabled Tools' },
        { value: 'webSearch.*', label: 'Web Search Settings' },
        { value: 'domainKnowledge.*', label: 'Domain Knowledge' },
        { value: 'safety.cautionTopics', label: 'Caution Topics' },
        { value: 'localization.*', label: 'Localization' },
      ],
      searchable: true,
    },
    defaultValue: [
      'persona.name', 'persona.description', 'persona.personality', 'persona.customInstructions',
      'style.*', 'tools.enabledTools', 'domainKnowledge.*', 'localization.*',
    ],
    design: { columns: 12, order: 81, group: 'customization' },
    helpText: 'Select which fields tenant admins are allowed to customize',
  },
  {
    id: 'customization.allowCustomTools',
    name: 'Allow Custom Tools',
    type: 'BOOLEAN',
    required: false,
    defaultValue: true,
    design: { columns: 6, order: 82, group: 'customization', displayAs: 'switch' },
  },
  {
    id: 'customization.allowCustomFrameworks',
    name: 'Allow Custom Frameworks',
    type: 'BOOLEAN',
    required: false,
    defaultValue: true,
    design: { columns: 6, order: 83, group: 'customization', displayAs: 'switch' },
  },
];
```

---

## Relationships

```typescript
const AI_CONFIG_RELATIONSHIPS = {
  // Config can belong to a tenant
  tenant: {
    type: 'belongs_to',
    targetType: 'c_tenant',
    foreignKey: 'tenantId',
    required: false, // Only for tenant/assistant configs
  },
  
  // Config can belong to an assistant
  assistant: {
    type: 'belongs_to',
    targetType: 'c_assistant',
    foreignKey: 'assistantId',
    required: false, // Only for assistant configs
  },
  
  // Config can inherit from another config
  parent: {
    type: 'belongs_to',
    targetType: 'c_aiconfig',
    foreignKey: 'inheritFrom',
    required: false,
  },
  
  // Config can have child configs
  children: {
    type: 'has_many',
    targetType: 'c_aiconfig',
    foreignKey: 'inheritFrom',
  },
};
```

---

## Usage Examples

### System Default Configuration

```json
{
  "id": "aiconfig-system-default",
  "shardTypeId": "c_aiconfig",
  "structuredData": {
    "name": "System Default",
    "description": "Default AI configuration for all tenants",
    "configType": "system",
    "isDefault": true,
    "isActive": true,
    "version": "1.0.0",
    
    "persona": {
      "name": "Castiel",
      "description": "An intelligent business assistant",
      "personality": ["helpful", "professional", "insightful", "proactive"],
      "expertise": ["business_analysis", "project_management", "sales_operations"]
    },
    
    "style": {
      "tone": "adaptive",
      "defaultLength": "standard",
      "useEmojis": "sparingly",
      "preferredFormat": "adaptive",
      "actionSuggestions": "when_relevant"
    },
    
    "tools": {
      "enabledTools": ["create_task", "schedule_meeting", "draft_email", "navigate_to_shard", "web_search"]
    },
    
    "webSearch": {
      "enabled": true,
      "maxSearchesPerQuery": 3,
      "triggers": ["user_requests_search", "needs_current_information", "company_research"]
    },
    
    "domainKnowledge": {
      "enabled": true,
      "enabledFrameworks": ["meddic", "bant", "agile"]
    },
    
    "safety": {
      "hallucination": {
        "strictness": "moderate",
        "requireCitations": true
      },
      "piiHandling": {
        "maskInResponses": true,
        "warnAboutPII": true
      },
      "refuseTopics": ["illegal_activities", "harmful_content", "medical_diagnosis", "legal_advice"]
    },
    
    "localization": {
      "enabled": true,
      "defaultLanguage": "en",
      "detectUserLanguage": true
    },
    
    "customization": {
      "tenantCustomizableFields": ["persona.*", "style.*", "tools.enabledTools", "domainKnowledge.*"],
      "allowCustomTools": true,
      "allowCustomFrameworks": true
    }
  }
}
```

### Tenant Configuration (Sales Organization)

```json
{
  "id": "aiconfig-tenant-acme",
  "shardTypeId": "c_aiconfig",
  "tenantId": "tenant-acme",
  "structuredData": {
    "name": "Acme Corp Sales Configuration",
    "description": "Customized for Acme's sales team",
    "configType": "tenant",
    "isDefault": true,
    "isActive": true,
    "version": "1.0.0",
    "inheritFrom": "aiconfig-system-default",
    
    "persona": {
      "name": "Alex",
      "description": "Your Acme sales assistant",
      "customInstructions": "Always mention our Q4 promotion when discussing pricing."
    },
    
    "style": {
      "tone": "friendly",
      "defaultLength": "concise"
    },
    
    "domainKnowledge": {
      "enabled": true,
      "industry": "sales",
      "enabledFrameworks": ["meddic", "challenger"],
      "terminology": {
        "Enterprise": "Deals over $100K",
        "SMB": "Deals under $100K",
        "Blue Bird": "Inbound qualified lead"
      }
    }
  }
}
```

### Assistant Configuration (Executive Briefing)

```json
{
  "id": "aiconfig-assistant-exec",
  "shardTypeId": "c_aiconfig",
  "tenantId": "tenant-acme",
  "assistantId": "assistant-exec-briefing",
  "structuredData": {
    "name": "Executive Briefing Assistant",
    "description": "Optimized for executive-level summaries",
    "configType": "assistant",
    "isDefault": false,
    "isActive": true,
    "version": "1.0.0",
    "inheritFrom": "aiconfig-tenant-acme",
    
    "style": {
      "tone": "formal",
      "defaultLength": "concise",
      "preferredFormat": "bullets",
      "actionSuggestions": "always"
    },
    
    "persona": {
      "customInstructions": "Focus on strategic implications and key metrics. Avoid technical details unless specifically asked."
    }
  }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai-config` | Get merged config for current user |
| `GET` | `/api/ai-config/system` | Get system config (Super Admin) |
| `GET` | `/api/ai-config/tenant/:tenantId` | Get tenant config |
| `GET` | `/api/ai-config/assistant/:assistantId` | Get assistant config |
| `PUT` | `/api/ai-config/system` | Update system config (Super Admin) |
| `PUT` | `/api/ai-config/tenant/:tenantId` | Update tenant config (Tenant Admin) |
| `PUT` | `/api/ai-config/assistant/:assistantId` | Update assistant config |
| `POST` | `/api/ai-config/preview` | Preview merged config |

---

## Related Documentation

- [Prompt Engineering Guide](../../features/ai-insights/PROMPT-ENGINEERING.md)
- [AI Insights Overview](../../features/ai-insights/README.md)
- [c_assistant](./c_assistant.md)
- [c_aimodel](./c_aimodel.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0












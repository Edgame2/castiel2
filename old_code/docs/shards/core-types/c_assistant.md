# c_assistant - AI Assistant ShardType

## Overview

The `c_assistant` ShardType represents AI assistant configurations. Assistants define the personality, instructions, capabilities, and behavior of AI interactions within Castiel, enabling customized AI experiences per project, team, or use case.

> **AI Role**: Defines AI behavior—personality, tone, instructions, and capabilities that shape how AI generates insights and interacts.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_assistant` |
| **Display Name** | AI Assistant |
| **Category** | CONFIGURATION |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `Bot` |
| **Color** | `#a855f7` (Purple) |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Assistant name |
| `description` | string | No | Assistant description |
| `systemPrompt` | string | **Yes** | Base system instructions |
| `personality` | enum | No | Personality type |
| `tone` | enum | No | Communication tone |
| `language` | string | No | Primary language |
| `capabilities` | string[] | No | Enabled capabilities |
| `focusAreas` | string[] | No | Areas of expertise |
| `constraints` | string[] | No | Things to avoid |
| `responseFormat` | enum | No | Preferred response format |
| `maxTokens` | number | No | Max response length |
| `temperature` | number | No | Creativity level (0-1) |
| `model` | string | No | AI model to use |
| `isActive` | boolean | No | Active status |
| `isDefault` | boolean | No | Default assistant flag |
| `tags` | string[] | No | Custom tags |

### Field Details

#### `personality`
```typescript
enum AssistantPersonality {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CASUAL = 'casual',
  ANALYTICAL = 'analytical',
  CREATIVE = 'creative',
  SUPPORTIVE = 'supportive',
  DIRECT = 'direct'
}
```

#### `tone`
```typescript
enum AssistantTone {
  NEUTRAL = 'neutral',
  ENTHUSIASTIC = 'enthusiastic',
  EMPATHETIC = 'empathetic',
  CONFIDENT = 'confident',
  CAUTIOUS = 'cautious',
  ENCOURAGING = 'encouraging',
  INFORMATIVE = 'informative'
}
```

#### `capabilities`
```typescript
enum AssistantCapability {
  SUMMARIZATION = 'summarization',
  ANALYSIS = 'analysis',
  RECOMMENDATIONS = 'recommendations',
  WRITING = 'writing',
  RESEARCH = 'research',
  FORECASTING = 'forecasting',
  COACHING = 'coaching',
  Q_AND_A = 'q_and_a',
  DATA_EXTRACTION = 'data_extraction',
  TRANSLATION = 'translation'
}
```

#### `responseFormat`
```typescript
enum ResponseFormat {
  CONVERSATIONAL = 'conversational',
  STRUCTURED = 'structured',
  BULLET_POINTS = 'bullet_points',
  DETAILED = 'detailed',
  CONCISE = 'concise'
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_assistant.json",
  "title": "AI Assistant",
  "description": "AI assistant configuration",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Assistant name"
    },
    "description": {
      "type": "string",
      "maxLength": 1000,
      "description": "Assistant description"
    },
    "systemPrompt": {
      "type": "string",
      "minLength": 10,
      "maxLength": 10000,
      "description": "Base system instructions"
    },
    "personality": {
      "type": "string",
      "enum": ["professional", "friendly", "formal", "casual", "analytical", "creative", "supportive", "direct"],
      "default": "professional",
      "description": "Personality type"
    },
    "tone": {
      "type": "string",
      "enum": ["neutral", "enthusiastic", "empathetic", "confident", "cautious", "encouraging", "informative"],
      "default": "neutral",
      "description": "Communication tone"
    },
    "language": {
      "type": "string",
      "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
      "default": "en",
      "description": "Primary language"
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["summarization", "analysis", "recommendations", "writing", "research", "forecasting", "coaching", "q_and_a", "data_extraction", "translation"]
      },
      "description": "Enabled capabilities"
    },
    "focusAreas": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Areas of expertise"
    },
    "constraints": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Things to avoid"
    },
    "responseFormat": {
      "type": "string",
      "enum": ["conversational", "structured", "bullet_points", "detailed", "concise"],
      "default": "conversational",
      "description": "Preferred response format"
    },
    "maxTokens": {
      "type": "integer",
      "minimum": 100,
      "maximum": 8000,
      "default": 2000,
      "description": "Maximum response tokens"
    },
    "temperature": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "default": 0.7,
      "description": "Creativity level (0=deterministic, 1=creative)"
    },
    "model": {
      "type": "string",
      "default": "gpt-4",
      "description": "AI model identifier"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "Whether assistant is active"
    },
    "isDefault": {
      "type": "boolean",
      "default": false,
      "description": "Default assistant for tenant"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Custom tags"
    }
  },
  "required": ["name", "systemPrompt"]
}
```

---

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `assigned_to` | `c_project` | Project's dedicated assistant |
| `created_for` | `c_company` | Company-specific assistant |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `uses_assistant` | Project using this assistant |

### External Relationships

Typically none—assistants are Castiel-internal configurations.

---

## AI Context Role

### Behavior Configuration

`c_assistant` shapes how AI operates:

1. **System Prompt**: Base instructions for all interactions
2. **Personality/Tone**: Communication style
3. **Capabilities**: What the AI can do
4. **Constraints**: What to avoid
5. **Focus Areas**: Domain expertise

### How Assistants Are Used

```
User Request: "Give me insights on Project Alpha"
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│            ASSISTANT SELECTION                   │
│                                                  │
│  1. Check if project has assigned assistant      │
│  2. Fall back to tenant default assistant        │
│  3. Fall back to system default                  │
│                                                  │
│  Selected: "Sales Coach" (c_assistant)           │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│            PROMPT CONSTRUCTION                   │
│                                                  │
│  System: {assistant.systemPrompt}               │
│  Personality: {assistant.personality}            │
│  Tone: {assistant.tone}                          │
│  Format: {assistant.responseFormat}              │
│  Constraints: {assistant.constraints}            │
│                                                  │
│  Context: [Project data, related shards...]     │
│                                                  │
│  User: "Give me insights on Project Alpha"       │
└─────────────────────────────────────────────────┘
                    │
                    ▼
            AI RESPONSE
      (shaped by assistant config)
```

### System Prompt Template

```
You are {name}, an AI assistant with the following characteristics:

Personality: {personality}
Tone: {tone}
Focus Areas: {focusAreas.join(", ")}

{systemPrompt}

Guidelines:
- Respond in a {personality}, {tone} manner
- Format responses as {responseFormat}
- Focus on: {focusAreas.join(", ")}

Constraints:
{constraints.map(c => "- " + c).join("\n")}
```

---

## Examples

### Example: Sales Coach Assistant

```json
{
  "id": "assistant-001-uuid",
  "shardTypeId": "c_assistant-type-uuid",
  "structuredData": {
    "name": "Sales Coach",
    "description": "AI assistant specialized in sales strategy, deal coaching, and opportunity analysis",
    "systemPrompt": "You are an expert sales coach with 20 years of enterprise B2B sales experience. Your role is to help sales professionals close deals by providing strategic advice, identifying risks, and suggesting next steps.\n\nWhen analyzing deals:\n1. Assess the current stage and identify gaps\n2. Evaluate stakeholder engagement\n3. Identify competitive threats\n4. Recommend specific next actions\n5. Highlight potential risks and objections\n\nAlways be actionable and specific. Avoid generic advice.",
    "personality": "professional",
    "tone": "confident",
    "language": "en",
    "capabilities": [
      "analysis",
      "recommendations",
      "coaching",
      "forecasting"
    ],
    "focusAreas": [
      "Enterprise B2B sales",
      "Deal strategy",
      "Stakeholder management",
      "Competitive positioning",
      "Negotiation tactics",
      "Pipeline management"
    ],
    "constraints": [
      "Never make up specific numbers or statistics",
      "Don't claim to have access to external data sources",
      "Avoid overly aggressive sales tactics",
      "Don't provide legal or financial advice"
    ],
    "responseFormat": "structured",
    "maxTokens": 2000,
    "temperature": 0.7,
    "model": "gpt-4",
    "isActive": true,
    "isDefault": false,
    "tags": ["sales", "coaching", "enterprise"]
  },
  "internal_relationships": [],
  "external_relationships": [],
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### Example: Technical Analyst Assistant

```json
{
  "id": "assistant-002-uuid",
  "shardTypeId": "c_assistant-type-uuid",
  "structuredData": {
    "name": "Technical Analyst",
    "description": "AI assistant for technical documentation analysis and requirements gathering",
    "systemPrompt": "You are a senior technical analyst specializing in software requirements and technical documentation. Your role is to help teams understand technical specifications, identify requirements gaps, and ensure technical alignment.\n\nWhen reviewing documents:\n1. Extract key technical requirements\n2. Identify potential integration challenges\n3. Highlight security considerations\n4. Note scalability concerns\n5. Suggest clarifying questions",
    "personality": "analytical",
    "tone": "informative",
    "capabilities": [
      "analysis",
      "data_extraction",
      "summarization",
      "q_and_a"
    ],
    "focusAreas": [
      "Technical requirements",
      "System architecture",
      "API integrations",
      "Security analysis",
      "Performance considerations"
    ],
    "constraints": [
      "Don't write actual code",
      "Don't make security guarantees",
      "Recommend professional review for critical decisions"
    ],
    "responseFormat": "detailed",
    "maxTokens": 3000,
    "temperature": 0.3,
    "model": "gpt-4",
    "isActive": true,
    "isDefault": false,
    "tags": ["technical", "analysis", "requirements"]
  }
}
```

---

## Display Configuration

```json
{
  "titleField": "name",
  "subtitleField": "description",
  "iconField": null,
  "searchableFields": ["name", "description", "focusAreas"],
  "sortableFields": ["name", "isActive", "isDefault"],
  "defaultSortField": "name",
  "defaultSortOrder": "asc"
}
```

---

## Preset Assistants

Castiel includes preset assistants for common use cases:

| Name | Personality | Use Case |
|------|-------------|----------|
| General Assistant | Professional/Neutral | Default, general-purpose |
| Sales Coach | Professional/Confident | Sales teams |
| Technical Analyst | Analytical/Informative | Technical teams |
| Customer Success | Supportive/Empathetic | Customer-facing |
| Executive Briefer | Formal/Concise | Leadership summaries |
| Creative Writer | Creative/Enthusiastic | Content creation |

---

## Temperature Guide

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0 - 0.3 | Deterministic, consistent | Data analysis, extraction |
| 0.3 - 0.5 | Balanced | Most business use cases |
| 0.5 - 0.7 | Moderate creativity | Recommendations, coaching |
| 0.7 - 1.0 | High creativity | Creative writing, brainstorming |

---

## Best Practices

1. **Clear system prompt**: Be specific about role and expectations
2. **Define constraints**: Explicitly state what to avoid
3. **Match temperature to task**: Lower for analysis, higher for creativity
4. **Test thoroughly**: Validate responses match expectations
5. **Iterate on prompts**: Refine based on output quality
6. **Use focus areas**: Guide the AI's domain expertise
7. **Set appropriate limits**: Use maxTokens to control response length

---

**Last Updated**: November 2025  
**Version**: 1.0.0







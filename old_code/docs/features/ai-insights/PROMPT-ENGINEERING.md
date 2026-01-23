# Prompt Engineering Guide

## Overview

This guide documents how system prompts are constructed for AI Insights. Castiel uses a **layered, configurable prompt system** where Super Admins set global defaults and Tenant Admins customize for their organization.

> **Philosophy**: "One size doesn't fit all—let organizations shape their AI experience."

---

## Table of Contents

1. [Prompt Architecture](#prompt-architecture)
2. [Configuration Hierarchy](#configuration-hierarchy)
3. [System Prompt Components](#system-prompt-components)
4. [Insight-Type Prompts](#insight-type-prompts)
5. [Tool Calling](#tool-calling)
6. [Web Search Integration](#web-search-integration)
7. [Domain Knowledge & Frameworks](#domain-knowledge--frameworks)
8. [Safety & Guardrails](#safety--guardrails)
9. [Localization](#localization)
10. [Configuration Schema](#configuration-schema)

---

## Prompt Architecture

### Layered Prompt Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT COMPOSITION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: SYSTEM IDENTITY                                            │   │
│  │  • AI persona name (default: "Castiel")                              │   │
│  │  • Core identity and purpose                                         │   │
│  │  • Global behavior rules                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: TENANT CUSTOMIZATION                                       │   │
│  │  • Industry context (sales, consulting, legal, etc.)                 │   │
│  │  • Company-specific terminology                                      │   │
│  │  • Tone and style preferences                                        │   │
│  │  • Domain frameworks (MEDDIC, BANT, Agile)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: ASSISTANT CUSTOMIZATION                                    │   │
│  │  • c_assistant specific instructions                                 │   │
│  │  • Specialized behavior                                              │   │
│  │  • Custom tools enabled                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 4: INSIGHT-TYPE INSTRUCTIONS                                  │   │
│  │  • Summary/Analysis/Comparison/etc. specific                         │   │
│  │  • Output format requirements                                        │   │
│  │  • Grounding rules                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 5: USER CONTEXT                                               │   │
│  │  • User role (exec, manager, analyst)                                │   │
│  │  • User preferences                                                  │   │
│  │  • Conversation history                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 6: SAFETY & GUARDRAILS                                        │   │
│  │  • Global safety rules                                               │   │
│  │  • Tenant-specific restrictions                                      │   │
│  │  • PII handling                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 7: TOOLS & CAPABILITIES                                       │   │
│  │  • Available tools (create task, schedule, email, web search)        │   │
│  │  • Tool usage instructions                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 8: CONTEXT DATA                                               │   │
│  │  • Assembled context from c_contextTemplate                          │   │
│  │  • RAG chunks                                                        │   │
│  │  • Metadata                                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 9: USER MESSAGE                                               │   │
│  │  • Current query                                                     │   │
│  │  • Conversation context                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Hierarchy

### Admin Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUPER ADMIN (System-wide)                                                  │
│  ├── Set global defaults                                                    │
│  ├── Define what tenants CAN customize                                      │
│  ├── Add/remove available tools                                             │
│  ├── Add/remove domain frameworks                                           │
│  ├── Set global safety rules                                                │
│  └── Override any tenant setting                                            │
│                                                                             │
│       ▼                                                                     │
│                                                                             │
│  TENANT ADMIN (Organization-level)                                          │
│  ├── Customize allowed settings                                             │
│  ├── Set industry/domain context                                            │
│  ├── Enable/disable available tools                                         │
│  ├── Select domain frameworks                                               │
│  ├── Add company-specific terminology                                       │
│  └── Set tenant-level safety rules                                          │
│                                                                             │
│       ▼                                                                     │
│                                                                             │
│  ASSISTANT (c_assistant)                                                    │
│  ├── Specialized purpose and instructions                                   │
│  ├── Subset of tenant tools                                                 │
│  └── Custom persona (optional)                                              │
│                                                                             │
│       ▼                                                                     │
│                                                                             │
│  USER PREFERENCES                                                           │
│  ├── Response length preference                                             │
│  ├── Detail level preference                                                │
│  └── Language preference                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuration Merging

```typescript
interface PromptConfiguration {
  // Identity
  persona: PersonaConfig;
  
  // Style
  style: StyleConfig;
  
  // Capabilities
  tools: ToolConfig[];
  webSearch: WebSearchConfig;
  
  // Knowledge
  domainKnowledge: DomainKnowledgeConfig;
  frameworks: FrameworkConfig[];
  
  // Safety
  safety: SafetyConfig;
  
  // Localization
  localization: LocalizationConfig;
}

function mergeConfigurations(
  systemDefault: PromptConfiguration,
  tenantOverride: Partial<PromptConfiguration>,
  assistantOverride: Partial<PromptConfiguration>,
  userPreferences: Partial<PromptConfiguration>
): PromptConfiguration {
  // Deep merge with priority: user > assistant > tenant > system
  return deepMerge(
    systemDefault,
    tenantOverride,
    assistantOverride,
    userPreferences
  );
}
```

---

## Model-Aware Prompting

### AI Model Selection Impact on Prompts

Different AI models have different capabilities, context windows, and strengths. The prompt construction must adapt based on the selected model.

#### Model Selection Process

Before constructing prompts, the system selects an optimal model:

```typescript
// 1. Get model connection with credentials
const connectionWithCreds = await modelSelectionService.selectOptimalModel(
  tenantId,
  {
    insightType: intent.insightType,
    contextTokens: context.metadata.totalTokens,
    requiresVision: false,
    requiresFunctions: request.options?.toolsEnabled || false,
    requiresStreaming: true,
    maxCost: tenantBudget?.maxCostPerInsight,
  }
);

const model = connectionWithCreds.model;

// 2. Build prompts with model-specific optimizations
const { systemPrompt, userPrompt } = buildPromptsForModel(
  intent,
  context,
  model,
  config
);
```

#### Model-Specific Prompt Adaptations

| Model Type | Context Window | Prompt Strategy |
|------------|----------------|-----------------|
| **GPT-4o** | 128k tokens | • Include full context<br>• Use structured output<br>• Enable function calling<br>• Detailed instructions |
| **GPT-4 Turbo** | 128k tokens | • Similar to GPT-4o<br>• More explicit instructions<br>• JSON mode for structured data |
| **GPT-3.5 Turbo** | 16k tokens | • Concise context<br>• Simpler instructions<br>• Focus on primary task<br>• Avoid complex reasoning |
| **Claude 3 Opus** | 200k tokens | • Very detailed context<br>• Chain-of-thought enabled<br>• Long-form instructions<br>• Multiple examples |
| **Claude 3 Sonnet** | 200k tokens | • Balanced context<br>• Clear task definition<br>• Moderate examples |
| **Claude 3 Haiku** | 200k tokens | • Brief context<br>• Direct instructions<br>• Single task focus |

#### Capability-Aware Instructions

```typescript
function buildModelAwareInstructions(
  model: AIModel,
  insightType: InsightType
): string {
  let instructions = '';

  // Vision capability
  if (model.vision && hasImages(context)) {
    instructions += `
You have vision capabilities. When analyzing images:
- Describe visual elements relevant to the query
- Extract text from images when helpful
- Note visual trends or patterns
    `;
  }

  // Function calling capability
  if (model.functions && toolsEnabled) {
    instructions += `
You have access to these tools:
${formatToolDefinitions(availableTools)}

Use tools when they help provide better answers:
- create_task: To create actionable tasks
- search_shards: To find specific information
- calculate: For mathematical operations
- send_notification: To alert stakeholders
    `;
  } else if (!model.functions && toolsEnabled) {
    // Model doesn't support functions - use text-based tool simulation
    instructions += `
To use tools, respond with JSON in this format:
{
  "thought": "Why I need this tool",
  "tool": "tool_name",
  "arguments": { "arg1": "value1" }
}
    `;
  }

  // JSON mode capability
  if (model.jsonMode && requiresStructuredOutput) {
    instructions += `
Respond ONLY with valid JSON matching this schema:
${JSON.stringify(outputSchema, null, 2)}

Do not include any text outside the JSON object.
    `;
  } else if (!model.jsonMode && requiresStructuredOutput) {
    instructions += `
Respond with JSON wrapped in triple backticks:
\`\`\`json
{your response here}
\`\`\`
    `;
  }

  // Streaming considerations
  if (model.streaming) {
    instructions += `
Structure your response for streaming:
- Start with the most important information
- Use clear paragraph breaks
- Provide citations as you reference sources
    `;
  }

  return instructions;
}
```

#### Context Window Management

```typescript
function optimizeContextForModel(
  context: AssembledContext,
  model: AIModel,
  systemPrompt: string
): AssembledContext {
  const systemPromptTokens = estimateTokens(systemPrompt);
  const reservedForOutput = 4000; // Reserve tokens for response
  const availableForContext = model.contextWindow - systemPromptTokens - reservedForOutput;

  if (context.metadata.totalTokens <= availableForContext) {
    // Context fits - use as is
    return context;
  }

  // Context too large - prioritize and truncate
  const optimized = {
    ...context,
    formattedContext: '',
  };

  let currentTokens = 0;

  // 1. Always include primary shard (highest priority)
  if (context.primary) {
    const primaryText = formatShard(context.primary);
    const tokens = estimateTokens(primaryText);
    if (currentTokens + tokens <= availableForContext) {
      optimized.formattedContext += primaryText + '\n\n';
      currentTokens += tokens;
    }
  }

  // 2. Include RAG chunks by relevance score
  const sortedRAG = context.ragChunks
    .sort((a, b) => b.score - a.score)
    .filter(chunk => {
      const tokens = chunk.tokenCount;
      if (currentTokens + tokens <= availableForContext) {
        currentTokens += tokens;
        return true;
      }
      return false;
    });

  optimized.ragChunks = sortedRAG;
  optimized.formattedContext += sortedRAG
    .map(chunk => formatRAGChunk(chunk))
    .join('\n\n');

  // 3. Include related shards by relevance
  const sortedRelated = context.related
    .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
    .filter(chunk => {
      const tokens = estimateTokens(formatShard(chunk));
      if (currentTokens + tokens <= availableForContext) {
        currentTokens += tokens;
        return true;
      }
      return false;
    });

  optimized.related = sortedRelated;

  // Update metadata
  optimized.metadata.totalTokens = currentTokens;
  optimized.metadata.truncated = true;
  optimized.metadata.truncationReason = 'context_window_limit';

  return optimized;
}
```

#### Model-Specific Prompt Templates

```typescript
const MODEL_PROMPT_TEMPLATES = {
  'gpt-4o': {
    systemPrefix: `You are ${persona.name}, ${persona.description}.`,
    outputFormat: 'markdown',
    citationStyle: 'inline',
    reasoningEnabled: true,
  },
  
  'gpt-3.5-turbo': {
    systemPrefix: `You are ${persona.name}. Keep responses concise.`,
    outputFormat: 'simple',
    citationStyle: 'end',
    reasoningEnabled: false,
  },
  
  'claude-3-opus': {
    systemPrefix: `You are ${persona.name}, ${persona.description}.\n\nYou think step-by-step and explain your reasoning.`,
    outputFormat: 'markdown',
    citationStyle: 'detailed',
    reasoningEnabled: true,
  },
  
  'claude-3-haiku': {
    systemPrefix: `You are ${persona.name}. Be direct and efficient.`,
    outputFormat: 'simple',
    citationStyle: 'inline',
    reasoningEnabled: false,
  },
};

function getPromptTemplate(modelIdentifier: string) {
  // Find matching template
  for (const [key, template] of Object.entries(MODEL_PROMPT_TEMPLATES)) {
    if (modelIdentifier.includes(key)) {
      return template;
    }
  }
  
  // Default template
  return MODEL_PROMPT_TEMPLATES['gpt-4o'];
}
```

#### Cost-Aware Prompting

```typescript
function buildCostOptimizedPrompt(
  intent: IntentAnalysisResult,
  context: AssembledContext,
  model: AIModel,
  maxCost: number
): { systemPrompt: string; userPrompt: string } {
  // Estimate cost of full prompt
  const fullPrompt = buildFullPrompt(intent, context, model);
  const estimatedCost = estimateLLMCost(
    fullPrompt,
    model.pricing,
    4000 // Expected output tokens
  );

  if (estimatedCost <= maxCost) {
    // Within budget - use full prompt
    return fullPrompt;
  }

  // Reduce context to fit budget
  const targetTokenReduction = calculateTokenReduction(
    estimatedCost,
    maxCost,
    model.pricing
  );

  const reducedContext = reduceContext(context, targetTokenReduction);
  
  return buildFullPrompt(intent, reducedContext, model);
}

function estimateLLMCost(
  prompt: { systemPrompt: string; userPrompt: string },
  pricing: { inputPricePerMillion: number; outputPricePerMillion: number },
  expectedOutputTokens: number
): number {
  const inputTokens = 
    estimateTokens(prompt.systemPrompt) + 
    estimateTokens(prompt.userPrompt);
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (expectedOutputTokens / 1_000_000) * pricing.outputPricePerMillion;
  
  return inputCost + outputCost;
}
```

#### Example: Building Model-Aware System Prompt

```typescript
async function buildSystemPrompt(
  config: MergedAIConfig,
  intent: IntentAnalysisResult,
  model: AIModel,
  context: AssembledContext
): Promise<string> {
  const template = getPromptTemplate(model.modelIdentifier);
  
  let prompt = template.systemPrefix + '\n\n';
  
  // Add model-specific capabilities
  prompt += buildModelAwareInstructions(model, intent.insightType) + '\n\n';
  
  // Add role and style
  prompt += buildRoleInstructions(config.style, intent.userRole) + '\n\n';
  
  // Add insight-type specific instructions
  prompt += getInsightTypeInstructions(intent.insightType, template.outputFormat) + '\n\n';
  
  // Add grounding instructions
  if (context.ragChunks.length > 0 || context.related.length > 0) {
    prompt += buildGroundingInstructions(template.citationStyle) + '\n\n';
  }
  
  // Add safety rules
  prompt += buildSafetyInstructions(config.safety) + '\n\n';
  
  // Add output format
  prompt += buildOutputFormatInstructions(
    intent.format,
    template.outputFormat,
    model.jsonMode
  );
  
  return prompt;
}
```

### Key Takeaways

1. **Adapt to Model Capabilities**: Use vision, functions, JSON mode when available
2. **Optimize Context Window**: Prioritize and truncate context for smaller models
3. **Cost Management**: Reduce verbosity for expensive models
4. **Model-Specific Templates**: Different models need different instruction styles
5. **Progressive Enhancement**: Degrade gracefully when capabilities are missing

---

## System Prompt Components

### 1. Persona Configuration

```typescript
interface PersonaConfig {
  name: string;                         // Default: "Castiel"
  description: string;                  // What the AI is
  personality: string[];                // Personality traits
  expertise: string[];                  // Areas of expertise
}

const DEFAULT_PERSONA: PersonaConfig = {
  name: "Castiel",
  description: "An intelligent business assistant",
  personality: [
    "helpful",
    "professional",
    "insightful",
    "proactive",
  ],
  expertise: [
    "business analysis",
    "project management",
    "sales operations",
    "data interpretation",
  ],
};
```

**Persona Prompt Template**:

```handlebars
You are {{persona.name}}, {{persona.description}}.

Your personality traits:
{{#each persona.personality}}
- {{this}}
{{/each}}

Your areas of expertise:
{{#each persona.expertise}}
- {{this}}
{{/each}}
```

### 2. Style Configuration

```typescript
interface StyleConfig {
  // Tone
  tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'adaptive';
  
  // Response format
  defaultLength: 'concise' | 'standard' | 'detailed';
  useEmojis: 'never' | 'sparingly' | 'freely';
  preferredFormat: 'bullets' | 'prose' | 'adaptive';
  
  // Actions
  actionSuggestions: 'always' | 'when_relevant' | 'only_if_asked';
  
  // Role-based adaptation
  roleAdaptation: {
    enabled: boolean;
    rules: RoleAdaptationRule[];
  };
}

interface RoleAdaptationRule {
  role: string;                         // e.g., 'executive', 'analyst'
  tone: string;
  length: string;
  focus: string[];
}

const DEFAULT_STYLE: StyleConfig = {
  tone: 'adaptive',
  defaultLength: 'standard',
  useEmojis: 'sparingly',
  preferredFormat: 'adaptive',
  actionSuggestions: 'when_relevant',
  
  roleAdaptation: {
    enabled: true,
    rules: [
      {
        role: 'executive',
        tone: 'formal',
        length: 'concise',
        focus: ['key metrics', 'strategic implications', 'recommendations'],
      },
      {
        role: 'manager',
        tone: 'professional',
        length: 'standard',
        focus: ['team performance', 'blockers', 'next steps'],
      },
      {
        role: 'analyst',
        tone: 'professional',
        length: 'detailed',
        focus: ['data analysis', 'trends', 'methodology'],
      },
      {
        role: 'sales_rep',
        tone: 'friendly',
        length: 'concise',
        focus: ['deal status', 'action items', 'talking points'],
      },
    ],
  },
};
```

**Style Prompt Template**:

```handlebars
## Communication Style

{{#if (eq style.tone 'adaptive')}}
Adapt your tone based on the context and user's role:
{{#each style.roleAdaptation.rules}}
- For {{role}}s: Be {{tone}}, keep responses {{length}}, focus on {{join focus ', '}}.
{{/each}}
{{else}}
Use a {{style.tone}} tone in all responses.
{{/if}}

Response format preferences:
- Default length: {{style.defaultLength}}
{{#if (eq style.useEmojis 'never')}}
- Do NOT use emojis
{{else if (eq style.useEmojis 'sparingly')}}
- Use emojis sparingly for emphasis (✓, ⚠️, 📊)
{{else}}
- Feel free to use emojis to enhance communication
{{/if}}

{{#if (eq style.preferredFormat 'bullets')}}
- Prefer bullet points for clarity
{{else if (eq style.preferredFormat 'prose')}}
- Use prose for natural flow
{{else}}
- Choose bullets or prose based on content type
{{/if}}

{{#if (eq style.actionSuggestions 'always')}}
- Always include suggested next actions
{{else if (eq style.actionSuggestions 'when_relevant')}}
- Suggest next actions when relevant to the user's goal
{{else}}
- Only suggest actions if explicitly asked
{{/if}}
```

---

## Insight-Type Prompts

### Base Insight Instructions

```typescript
interface InsightTypePrompt {
  type: InsightType;
  description: string;
  instructions: string;
  outputFormat: string;
  groundingRules: string;
  examples?: string[];
}
```

### Summary Insight

```handlebars
## SUMMARY INSIGHT INSTRUCTIONS

You are generating a summary of {{scope.type}}: "{{scope.name}}".

### Goal
Provide a clear, comprehensive overview that captures the essential information.

### Structure
1. **Executive Summary** (1-2 sentences)
   - The most important takeaway
   
2. **Key Points** (3-5 bullets)
   - Critical information the user needs to know
   
3. **Current Status**
   - Where things stand right now
   
4. **Recent Activity** (if relevant)
   - What's happened recently

### Grounding Rules
- Every fact must come from the provided context
- If information is incomplete, say "Based on available data..."
- Include timeframes: "As of [date]..." or "In the past [X] days..."

### Output Format
{{#if (eq requestedFormat 'brief')}}
Keep response under 150 words. Focus on the most critical 2-3 points.
{{else if (eq requestedFormat 'detailed')}}
Provide comprehensive coverage, up to 500 words. Include supporting details.
{{else}}
Standard summary: 200-300 words with balanced coverage.
{{/if}}
```

### Analysis Insight

```handlebars
## ANALYSIS INSIGHT INSTRUCTIONS

You are performing a {{analysisType}} analysis on {{scope.type}}: "{{scope.name}}".

### Goal
{{#if (eq analysisType 'risk')}}
Identify potential risks, threats, and concerns that could impact success.
{{else if (eq analysisType 'opportunity')}}
Identify growth opportunities, upsell potential, and areas for expansion.
{{else if (eq analysisType 'trend')}}
Identify patterns over time and predict where things are heading.
{{else if (eq analysisType 'sentiment')}}
Analyze the emotional tone and sentiment in communications and interactions.
{{else if (eq analysisType 'gap')}}
Identify missing information, incomplete data, or areas needing attention.
{{else if (eq analysisType 'performance')}}
Evaluate performance against goals, benchmarks, or expectations.
{{/if}}

### Structure
1. **Assessment Summary**
   - Your overall assessment in 1-2 sentences
   
2. **Key Findings** (3-5 items)
   {{#if (eq analysisType 'risk')}}
   For each risk:
   - Description of the risk
   - Severity: High/Medium/Low
   - Evidence from context [cite source]
   - Potential impact
   {{else if (eq analysisType 'opportunity')}}
   For each opportunity:
   - Description of the opportunity
   - Potential value: High/Medium/Low
   - Evidence or signals [cite source]
   - Suggested action
   {{/if}}
   
3. **Recommendations**
   - Specific, actionable next steps
   
4. **Confidence Level**
   - State your confidence (High/Medium/Low) and why

### Grounding Rules
- Support every finding with specific evidence from context
- Use citations: "According to [source]..." or "[1]"
- Distinguish facts from inferences: "The data shows..." vs "This suggests..."
- If making predictions, clearly label as such

### Analysis Depth
{{#if (eq depth 'quick')}}
Quick scan: Focus on top 2-3 most significant findings.
{{else if (eq depth 'comprehensive')}}
Deep dive: Cover all relevant findings with detailed evidence.
{{else}}
Standard analysis: Balance coverage with actionability.
{{/if}}
```

### Comparison Insight

```handlebars
## COMPARISON INSIGHT INSTRUCTIONS

You are comparing: {{#each subjects}}{{name}}{{#unless @last}} vs {{/unless}}{{/each}}

### Comparison Type: {{comparisonType}}

{{#if (eq comparisonType 'versus')}}
### Goal
Compare these items head-to-head across key dimensions.

### Structure
| Dimension | {{#each subjects}}{{name}}{{#unless @last}} | {{/unless}}{{/each}} |
|-----------|{{#each subjects}}---{{#unless @last}}|{{/unless}}{{/each}}|
{{#each dimensions}}
| {{this}} | [Value] | [Value] |
{{/each}}

### Analysis
- Key differences
- Similarities
- Winner by dimension (if applicable)
- Overall recommendation

{{else if (eq comparisonType 'temporal')}}
### Goal
Compare {{periods.current.label}} vs {{periods.previous.label}}.

### Structure
| Metric | {{periods.previous.label}} | {{periods.current.label}} | Change |
|--------|---------------------------|--------------------------|--------|
| [Metric] | [Value] | [Value] | [+/-X%] |

### Analysis
- Trends identified
- Notable changes
- Contributing factors
- Outlook

{{else if (eq comparisonType 'ranking')}}
### Goal
Rank items by {{sortBy}}.

### Structure
| Rank | Name | {{sortBy}} | Key Factor |
|------|------|-----------|------------|
| 1 | [Name] | [Value] | [Why] |
| 2 | ... | ... | ... |

{{/if}}

### Grounding Rules
- All comparison values must come from context data
- If data is missing, indicate with "N/A" or "Data not available"
- Explain the basis for any rankings or assessments
```

### Recommendation Insight

```handlebars
## RECOMMENDATION INSIGHT INSTRUCTIONS

You are providing {{recommendationType}} recommendations for {{user.name}} ({{user.role}}).

### Goal
{{#if (eq recommendationType 'next_action')}}
Identify the most important action(s) to take right now.
{{else if (eq recommendationType 'priority')}}
Help prioritize among competing demands.
{{else if (eq recommendationType 'strategy')}}
Suggest strategic approaches to achieve goals.
{{else if (eq recommendationType 'resource')}}
Recommend people or resources to involve.
{{else if (eq recommendationType 'timing')}}
Advise on optimal timing for actions.
{{/if}}

### User Context
- Role: {{user.role}}
- Focus areas: {{join user.focusAreas ', '}}
- Current workload: {{user.activeItems}} active items
{{#if constraints}}
- Constraints: {{join constraints ', '}}
{{/if}}

### Structure
1. **Top Recommendation**
   - What to do
   - Why (evidence-based reasoning)
   - Expected impact
   
2. **Additional Recommendations** ({{subtract numberOfRecommendations 1}} more)
   - Priority order
   - Brief rationale for each
   
3. **Considerations**
   - Risks of inaction
   - Dependencies or blockers

### Personalization
{{#if user.roleAdaptation}}
Tailor recommendations for a {{user.role}}:
{{#with (lookup roleAdaptations user.role)}}
- Focus on: {{join focus ', '}}
- Level of detail: {{length}}
{{/with}}
{{/if}}

### Grounding Rules
- Base recommendations on actual data, not assumptions
- Consider user's capacity and current workload
- Prioritize high-impact, actionable items
```

### Prediction Insight

```handlebars
## PREDICTION INSIGHT INSTRUCTIONS

You are making a {{predictionType}} prediction about {{target.name}}.

### Goal
{{#if (eq predictionType 'outcome')}}
Predict the likely outcome (success/failure, win/loss).
{{else if (eq predictionType 'timeline')}}
Predict when something will happen.
{{else if (eq predictionType 'value')}}
Predict the likely value or magnitude.
{{else if (eq predictionType 'risk')}}
Predict what could go wrong.
{{else if (eq predictionType 'trend')}}
Predict where this is heading.
{{/if}}

### Structure
1. **Prediction**
   - Clear statement of predicted outcome
   - Timeframe (if applicable)
   
2. **Confidence: {{confidenceLevel}}%**
   - Why this confidence level
   
3. **Key Factors** (supporting the prediction)
   {{#each supportingFactors}}
   - {{this}} [cite evidence]
   {{/each}}
   
4. **Risks to Prediction**
   - What could change this outcome
   
{{#if showAlternatives}}
5. **Alternative Scenarios**
   - Best case: [description]
   - Worst case: [description]
{{/if}}

### Grounding Rules
- Predictions MUST be based on patterns in the data
- Clearly state the evidence supporting your prediction
- Express uncertainty appropriately
- Do NOT claim certainty about future events
- Use language like "Based on current trends..." or "If patterns continue..."
```

### Extraction Insight

```handlebars
## EXTRACTION INSIGHT INSTRUCTIONS

You are extracting {{extractionType}} from the provided context.

### Goal
{{#if (eq extractionType 'action_items')}}
Extract tasks, follow-ups, and action items.
{{else if (eq extractionType 'key_points')}}
Extract main takeaways and important points.
{{else if (eq extractionType 'decisions')}}
Extract decisions that were made.
{{else if (eq extractionType 'questions')}}
Extract open questions that need answers.
{{else if (eq extractionType 'entities')}}
Extract mentioned people, companies, and products.
{{else if (eq extractionType 'dates')}}
Extract dates, deadlines, and timeframes.
{{else if (eq extractionType 'numbers')}}
Extract financial figures, metrics, and quantities.
{{/if}}

### Structure
{{#if (eq extractionType 'action_items')}}
| # | Action Item | Owner | Due Date | Source |
|---|-------------|-------|----------|--------|
| 1 | [Task description] | [Person] | [Date] | [From: Note/Meeting] |

{{else if (eq extractionType 'key_points')}}
**Key Points:**
1. [Point] - [Source]
2. [Point] - [Source]

{{else if (eq extractionType 'decisions')}}
| Decision | Made By | Date | Context |
|----------|---------|------|---------|
| [Decision] | [Person] | [Date] | [Source] |

{{/if}}

### Rules
- Extract ONLY items explicitly stated in the context
- Do NOT infer or create items not in the source
- Always cite the source document/note
- If owner/date is unclear, mark as "Unspecified"
```

### Generation Insight

```handlebars
## GENERATION INSIGHT INSTRUCTIONS

You are generating a {{generationType}}.

{{#if (eq generationType 'email')}}
### Email Generation

**Context:**
- To: {{emailConfig.to}}
- Purpose: {{emailConfig.purpose}}
- Tone: {{style.tone}}

**Generate:**
```
Subject: [Compelling subject line]

[Greeting],

[Body - 2-3 paragraphs max]

[Call to action]

[Closing],
[Signature placeholder]
```

**Guidelines:**
- Use context data for personalization
- Reference specific details from the account/project
- Keep professional but personable
- Include clear next step

{{else if (eq generationType 'talking_points')}}
### Talking Points Generation

**For: {{context.meetingWith}}**
**About: {{context.topic}}**

**Generate:**
1. **Opening** (icebreaker based on context)
2. **Key Discussion Points** (3-5 bullets)
   - Point with supporting data
3. **Questions to Ask**
4. **Objection Handling** (if relevant)
5. **Closing/Next Steps**

{{else if (eq generationType 'report')}}
### Report Generation

**Type: {{reportType}}**
**Period: {{period}}**

**Generate structured report:**
1. Executive Summary
2. Key Metrics
3. Highlights
4. Concerns
5. Recommendations

{{/if}}

### Grounding Rules
- Use actual data from context for personalization
- Do NOT invent facts or statistics
- If referencing data, it must be from the context
- Mark placeholders clearly: [PLACEHOLDER]
```

### Search Insight

```handlebars
## SEARCH INSIGHT INSTRUCTIONS

You are helping the user find information.

**Query:** "{{query}}"

### Goal
Find and present relevant information matching the user's query.

### Response Structure
1. **Direct Answer** (if a specific answer exists)
   
2. **Relevant Results**
   {{#each results}}
   - **{{shardName}}** ({{shardType}})
     - Relevant excerpt: "{{excerpt}}"
     - Match reason: {{matchReason}}
   {{/each}}

3. **Additional Context**
   - Related information that might be helpful

4. **Suggestions**
   - Related queries the user might want to explore

### Rules
- Highlight the most relevant matches first
- Explain WHY each result is relevant
- If no good matches, say so clearly
- Suggest how to refine the search
```

---

## Tool Calling

### Available Tools

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  
  // Permissions
  enabledByDefault: boolean;
  requiresPermission?: string;
  
  // Configuration
  superAdminManaged: boolean;
  tenantCustomizable: boolean;
}

const SYSTEM_TOOLS: Tool[] = [
  {
    id: 'create_task',
    name: 'Create Task',
    description: 'Create a new task in the system',
    parameters: [
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'dueDate', type: 'date', required: false },
      { name: 'assignee', type: 'string', required: false },
      { name: 'priority', type: 'enum', values: ['high', 'medium', 'low'], required: false },
      { name: 'relatedShardId', type: 'string', required: false },
    ],
    enabledByDefault: true,
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'schedule_meeting',
    name: 'Schedule Meeting',
    description: 'Schedule a meeting with participants',
    parameters: [
      { name: 'title', type: 'string', required: true },
      { name: 'participants', type: 'array', required: true },
      { name: 'suggestedTimes', type: 'array', required: false },
      { name: 'duration', type: 'number', required: false },
      { name: 'agenda', type: 'string', required: false },
    ],
    enabledByDefault: true,
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'draft_email',
    name: 'Draft Email',
    description: 'Draft an email for the user to review',
    parameters: [
      { name: 'to', type: 'array', required: true },
      { name: 'cc', type: 'array', required: false },
      { name: 'subject', type: 'string', required: true },
      { name: 'body', type: 'string', required: true },
    ],
    enabledByDefault: true,
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'navigate_to_shard',
    name: 'Navigate to Shard',
    description: 'Navigate the user to a specific shard',
    parameters: [
      { name: 'shardId', type: 'string', required: true },
      { name: 'highlight', type: 'string', required: false },
    ],
    enabledByDefault: true,
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Search the web for real-time information',
    parameters: [
      { name: 'query', type: 'string', required: true },
      { name: 'searchType', type: 'enum', values: ['general', 'news', 'company'], required: false },
      { name: 'timeRange', type: 'enum', values: ['day', 'week', 'month', 'year'], required: false },
    ],
    enabledByDefault: true,
    requiresPermission: 'ai.web_search',
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'update_shard',
    name: 'Update Shard',
    description: 'Update a field on a shard',
    parameters: [
      { name: 'shardId', type: 'string', required: true },
      { name: 'field', type: 'string', required: true },
      { name: 'value', type: 'any', required: true },
    ],
    enabledByDefault: false,
    requiresPermission: 'shard.update',
    superAdminManaged: true,
    tenantCustomizable: true,
  },
  {
    id: 'create_shard',
    name: 'Create Shard',
    description: 'Create a new shard of specified type',
    parameters: [
      { name: 'shardTypeId', type: 'string', required: true },
      { name: 'data', type: 'object', required: true },
    ],
    enabledByDefault: false,
    requiresPermission: 'shard.create',
    superAdminManaged: true,
    tenantCustomizable: true,
  },
];
```

### Tool Calling Prompt

```handlebars
## AVAILABLE TOOLS

You have access to the following tools to help the user:

{{#each enabledTools}}
### {{name}}
{{description}}

Parameters:
{{#each parameters}}
- `{{name}}` ({{type}}{{#if required}}, required{{/if}}): {{description}}
{{/each}}

{{/each}}

## TOOL USAGE GUIDELINES

1. **Only use tools when appropriate**
   - Don't force tool usage if the user just wants information
   - Suggest tools when they would save the user time

2. **Confirm before executing**
   - For create/update actions, confirm with user first
   - Example: "Would you like me to create a task for this?"

3. **Provide context**
   - Explain why you're suggesting a tool
   - Show what will be created/updated

4. **Handle errors gracefully**
   - If a tool fails, explain what happened
   - Suggest alternatives

## TOOL CALL FORMAT

When you need to call a tool, use this format:

<tool_call>
<tool_name>{{tool_name}}</tool_name>
<parameters>
{
  "param1": "value1",
  "param2": "value2"
}
</parameters>
</tool_call>
```

---

## Web Search Integration

### Web Search Configuration

```typescript
interface WebSearchConfig {
  enabled: boolean;
  
  // When to use
  triggers: WebSearchTrigger[];
  
  // Search providers
  providers: ('bing' | 'google' | 'custom')[];
  
  // Restrictions
  restrictions: {
    maxSearchesPerQuery: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
    contentTypes: ('web' | 'news' | 'company_info')[];
  };
  
  // Result handling
  resultHandling: {
    maxResults: number;
    includeSnippets: boolean;
    verifyFacts: boolean;
  };
}

const DEFAULT_WEB_SEARCH_CONFIG: WebSearchConfig = {
  enabled: true,
  
  triggers: [
    'user_requests_search',
    'needs_current_information',
    'company_research',
    'news_lookup',
  ],
  
  providers: ['bing'],
  
  restrictions: {
    maxSearchesPerQuery: 3,
    allowedDomains: undefined, // Allow all
    blockedDomains: ['reddit.com', 'quora.com'], // Example
    contentTypes: ['web', 'news', 'company_info'],
  },
  
  resultHandling: {
    maxResults: 5,
    includeSnippets: true,
    verifyFacts: true,
  },
};
```

### Web Search Prompt

```handlebars
## WEB SEARCH CAPABILITY

You can search the web for real-time information when needed.

### When to Use Web Search
{{#each webSearch.triggers}}
- {{this}}
{{/each}}

### How to Search
Use the `web_search` tool with:
- `query`: Your search query
- `searchType`: "general", "news", or "company"
- `timeRange`: "day", "week", "month", or "year"

### Guidelines

1. **Search strategically**
   - Formulate specific, targeted queries
   - Use multiple searches for complex topics
   - Combine internal context with web results

2. **Verify and cite**
   - Cross-reference web results with internal data
   - Always cite web sources: "According to [Source]..."
   - Note when information is from the web vs internal data

3. **Handle web results**
   - Summarize relevant findings
   - Highlight conflicts with internal data
   - Present uncertainty clearly

4. **Privacy considerations**
   - Do NOT search for personal information
   - Do NOT include customer names in public searches
   - Use general terms for competitive research

### Example Web Search Flow

User: "What's the latest news about Acme Corp's funding?"

<tool_call>
<tool_name>web_search</tool_name>
<parameters>
{
  "query": "Acme Corp funding news 2025",
  "searchType": "news",
  "timeRange": "month"
}
</parameters>
</tool_call>

Then synthesize web results with internal context about Acme Corp.
```

---

## Domain Knowledge & Frameworks

### Domain Knowledge Configuration

```typescript
interface DomainKnowledgeConfig {
  enabled: boolean;
  
  // Industry context
  industry: Industry | null;
  
  // Enabled frameworks
  frameworks: FrameworkConfig[];
  
  // Custom terminology
  terminology: Record<string, string>;
  
  // Best practices
  bestPractices: string[];
}

type Industry = 
  | 'sales'
  | 'consulting'
  | 'legal'
  | 'healthcare'
  | 'finance'
  | 'technology'
  | 'manufacturing'
  | 'retail'
  | 'custom';

interface FrameworkConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Framework details
  components: FrameworkComponent[];
  
  // When to apply
  applicableTo: string[];              // Insight types or shard types
}
```

### Built-in Frameworks

#### MEDDIC (Sales)

```typescript
const MEDDIC_FRAMEWORK: FrameworkConfig = {
  id: 'meddic',
  name: 'MEDDIC',
  description: 'Sales qualification framework',
  enabled: true,
  
  components: [
    {
      letter: 'M',
      name: 'Metrics',
      description: 'Quantifiable measures of success the customer expects',
      questions: [
        'What are the customer\'s success metrics?',
        'How will ROI be measured?',
      ],
    },
    {
      letter: 'E',
      name: 'Economic Buyer',
      description: 'Person with final budget authority',
      questions: [
        'Who controls the budget?',
        'Have we engaged the economic buyer?',
      ],
    },
    {
      letter: 'D',
      name: 'Decision Criteria',
      description: 'Formal criteria used to evaluate options',
      questions: [
        'What criteria will drive the decision?',
        'How are we positioned against criteria?',
      ],
    },
    {
      letter: 'D',
      name: 'Decision Process',
      description: 'How the decision will be made',
      questions: [
        'What is the evaluation process?',
        'Who else needs to approve?',
      ],
    },
    {
      letter: 'I',
      name: 'Identify Pain',
      description: 'Business problems driving the initiative',
      questions: [
        'What pain is the customer trying to solve?',
        'What happens if they don\'t solve it?',
      ],
    },
    {
      letter: 'C',
      name: 'Champion',
      description: 'Internal advocate who sells on our behalf',
      questions: [
        'Do we have a champion?',
        'Can they influence the decision?',
      ],
    },
  ],
  
  applicableTo: ['c_opportunity', 'analysis_risk', 'recommendation'],
};
```

#### BANT (Sales)

```typescript
const BANT_FRAMEWORK: FrameworkConfig = {
  id: 'bant',
  name: 'BANT',
  description: 'Lead qualification framework',
  enabled: true,
  
  components: [
    {
      letter: 'B',
      name: 'Budget',
      description: 'Does the prospect have budget?',
      scoreRange: [0, 25],
    },
    {
      letter: 'A',
      name: 'Authority',
      description: 'Are we talking to the decision maker?',
      scoreRange: [0, 25],
    },
    {
      letter: 'N',
      name: 'Need',
      description: 'Is there a genuine need for our solution?',
      scoreRange: [0, 25],
    },
    {
      letter: 'T',
      name: 'Timeline',
      description: 'Is there urgency or a defined timeline?',
      scoreRange: [0, 25],
    },
  ],
  
  applicableTo: ['c_opportunity', 'c_lead', 'analysis'],
};
```

#### Agile (Project Management)

```typescript
const AGILE_FRAMEWORK: FrameworkConfig = {
  id: 'agile',
  name: 'Agile/Scrum',
  description: 'Agile project management methodology',
  enabled: true,
  
  components: [
    {
      name: 'Sprint',
      description: 'Time-boxed development iteration',
    },
    {
      name: 'Backlog',
      description: 'Prioritized list of work items',
    },
    {
      name: 'Velocity',
      description: 'Team\'s capacity measured in story points',
    },
    {
      name: 'Burndown',
      description: 'Progress visualization',
    },
    {
      name: 'Retrospective',
      description: 'Team improvement reflection',
    },
  ],
  
  applicableTo: ['c_project', 'c_task', 'summary', 'analysis_performance'],
};
```

### Framework Prompt Template

```handlebars
## DOMAIN KNOWLEDGE

{{#if domainKnowledge.industry}}
### Industry Context: {{domainKnowledge.industry}}
Apply {{domainKnowledge.industry}} industry best practices and terminology.
{{/if}}

{{#if domainKnowledge.frameworks.length}}
### Active Frameworks

{{#each domainKnowledge.frameworks}}
{{#if enabled}}
#### {{name}}
{{description}}

{{#if (eq id 'meddic')}}
When analyzing opportunities, consider MEDDIC criteria:
{{#each components}}
- **{{letter}} - {{name}}**: {{description}}
{{/each}}

Use this to assess deal health and identify gaps.
{{/if}}

{{#if (eq id 'bant')}}
For lead/opportunity qualification, use BANT scoring:
{{#each components}}
- **{{letter}} - {{name}}** (0-25 points): {{description}}
{{/each}}

Total score out of 100 indicates qualification level.
{{/if}}

{{#if (eq id 'agile')}}
For project analysis, consider Agile metrics:
{{#each components}}
- **{{name}}**: {{description}}
{{/each}}
{{/if}}

{{/if}}
{{/each}}
{{/if}}

{{#if domainKnowledge.terminology}}
### Custom Terminology
Use these terms as defined:
{{#each domainKnowledge.terminology}}
- **{{@key}}**: {{this}}
{{/each}}
{{/if}}

{{#if domainKnowledge.bestPractices}}
### Best Practices
{{#each domainKnowledge.bestPractices}}
- {{this}}
{{/each}}
{{/if}}
```

---

## Safety & Guardrails

### Safety Configuration

```typescript
interface SafetyConfig {
  // Content restrictions
  contentRestrictions: {
    refuseTopics: string[];
    cautionTopics: string[];
    requireApproval: string[];
  };
  
  // PII handling
  piiHandling: {
    maskInResponses: boolean;
    warnAboutPII: boolean;
    piiFields: string[];
  };
  
  // Hallucination prevention
  hallucination: {
    strictness: 'strict' | 'moderate' | 'lenient';
    requireCitations: boolean;
    flagUncertainty: boolean;
  };
  
  // Output safety
  outputSafety: {
    maxResponseLength: number;
    preventCodeExecution: boolean;
    sanitizeLinks: boolean;
  };
  
  // Audit
  audit: {
    logAllInteractions: boolean;
    flagSensitiveTopics: boolean;
  };
}

const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  contentRestrictions: {
    refuseTopics: [
      'illegal activities',
      'harmful content',
      'medical diagnosis',
      'legal advice',
    ],
    cautionTopics: [
      'competitor analysis',
      'personnel decisions',
      'financial projections',
    ],
    requireApproval: [
      'bulk operations',
      'data deletion',
      'external communications',
    ],
  },
  
  piiHandling: {
    maskInResponses: true,
    warnAboutPII: true,
    piiFields: ['ssn', 'taxId', 'bankAccount', 'personalEmail', 'homeAddress'],
  },
  
  hallucination: {
    strictness: 'moderate',
    requireCitations: true,
    flagUncertainty: true,
  },
  
  outputSafety: {
    maxResponseLength: 4000,
    preventCodeExecution: true,
    sanitizeLinks: true,
  },
  
  audit: {
    logAllInteractions: true,
    flagSensitiveTopics: true,
  },
};
```

### Safety Prompt Template

```handlebars
## SAFETY GUIDELINES

### Content Restrictions

**Never discuss or provide:**
{{#each safety.contentRestrictions.refuseTopics}}
- {{this}}
{{/each}}

**Exercise caution with:**
{{#each safety.contentRestrictions.cautionTopics}}
- {{this}} - Include appropriate disclaimers
{{/each}}

**Require user confirmation for:**
{{#each safety.contentRestrictions.requireApproval}}
- {{this}}
{{/each}}

### PII Handling

{{#if safety.piiHandling.maskInResponses}}
- MASK sensitive information in responses (show only last 4 digits, etc.)
{{/if}}
{{#if safety.piiHandling.warnAboutPII}}
- WARN users before displaying PII
{{/if}}

Protected fields: {{join safety.piiHandling.piiFields ', '}}

### Accuracy & Grounding

{{#if (eq safety.hallucination.strictness 'strict')}}
**STRICT MODE:**
- Only state facts that can be directly cited from context
- If uncertain, say "I don't have enough information to answer that"
- Never speculate or make assumptions
{{else if (eq safety.hallucination.strictness 'moderate')}}
**MODERATE MODE:**
- Support all factual claims with citations
- Clearly distinguish facts from inferences
- Express uncertainty when appropriate
{{else}}
**LENIENT MODE:**
- Provide helpful responses even with incomplete data
- Mark uncertain statements clearly
{{/if}}

{{#if safety.hallucination.requireCitations}}
- Include [citations] for all factual claims
{{/if}}

{{#if safety.hallucination.flagUncertainty}}
- Use phrases like "I'm not certain, but..." or "Based on limited data..."
{{/if}}

### Response Safety

- Keep responses under {{safety.outputSafety.maxResponseLength}} characters
{{#if safety.outputSafety.preventCodeExecution}}
- Do NOT generate executable code
{{/if}}
{{#if safety.outputSafety.sanitizeLinks}}
- Verify all links before including
{{/if}}

### When Uncertain

If you're unsure about something:
1. Acknowledge the uncertainty
2. Explain what information would help
3. Offer to search for more information (if web search enabled)
4. Suggest asking a human expert
```

---

## Localization

### Localization Configuration

```typescript
interface LocalizationConfig {
  enabled: boolean;
  
  // Language handling
  language: {
    default: string;                    // 'en'
    supported: string[];                // ['en', 'es', 'fr', 'de', 'ja', ...]
    detectFromUser: boolean;
    respectUserPreference: boolean;
  };
  
  // Formatting
  formatting: {
    dateFormat: string;                 // 'MM/DD/YYYY' or localized
    numberFormat: string;               // '1,234.56' or localized
    currencyFormat: string;             // '$1,234' or localized
    timezone: string;                   // 'UTC' or user timezone
  };
  
  // Cultural adaptation
  culturalAdaptation: {
    enabled: boolean;
    formality: 'formal' | 'informal' | 'auto';
  };
}

const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
  enabled: true,
  
  language: {
    default: 'en',
    supported: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ko'],
    detectFromUser: true,
    respectUserPreference: true,
  },
  
  formatting: {
    dateFormat: 'localized',
    numberFormat: 'localized',
    currencyFormat: 'localized',
    timezone: 'user',
  },
  
  culturalAdaptation: {
    enabled: true,
    formality: 'auto',
  },
};
```

### Localization Prompt Template

```handlebars
## LOCALIZATION

{{#if localization.enabled}}
### Language
{{#if localization.language.detectFromUser}}
- Detect user's language from their message
- Respond in the same language as the user
{{else}}
- Default language: {{localization.language.default}}
{{/if}}

Supported languages: {{join localization.language.supported ', '}}

### Formatting
{{#if (eq localization.formatting.dateFormat 'localized')}}
- Format dates according to user's locale
{{else}}
- Use date format: {{localization.formatting.dateFormat}}
{{/if}}

{{#if (eq localization.formatting.timezone 'user')}}
- Display times in user's timezone: {{user.timezone}}
{{else}}
- Display times in: {{localization.formatting.timezone}}
{{/if}}

### Cultural Adaptation
{{#if localization.culturalAdaptation.enabled}}
- Adapt formality based on culture and context
- Use appropriate honorifics when relevant
- Be mindful of cultural differences in directness
{{/if}}
{{/if}}
```

---

## Configuration Schema

### Full Configuration Type

```typescript
interface AIPromptSystemConfig {
  // Version for migrations
  version: string;
  
  // Identity
  persona: PersonaConfig;
  
  // Communication style
  style: StyleConfig;
  
  // Capabilities
  tools: {
    enabled: Tool[];
    customTools: CustomTool[];
  };
  webSearch: WebSearchConfig;
  
  // Knowledge
  domainKnowledge: DomainKnowledgeConfig;
  
  // Safety
  safety: SafetyConfig;
  
  // Localization
  localization: LocalizationConfig;
  
  // Insight-specific overrides
  insightOverrides: Record<InsightType, Partial<AIPromptSystemConfig>>;
  
  // Metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}
```

### Database Schema

```typescript
// System-wide configuration (Super Admin)
interface SystemAIConfig {
  id: 'system_ai_config';
  type: 'system';
  config: AIPromptSystemConfig;
  
  // What tenants can customize
  tenantCustomizableFields: string[];
  
  // Locked fields (cannot be changed by tenants)
  lockedFields: string[];
}

// Tenant-specific configuration
interface TenantAIConfig {
  id: string;
  type: 'tenant';
  tenantId: string;
  
  // Only the overridden values
  configOverrides: Partial<AIPromptSystemConfig>;
  
  // Tenant-specific additions
  customTerminology: Record<string, string>;
  customFrameworks: FrameworkConfig[];
  customTools: CustomTool[];
}

// Assistant-specific configuration
interface AssistantAIConfig {
  id: string;
  type: 'assistant';
  assistantId: string;
  tenantId: string;
  
  // Assistant overrides
  configOverrides: Partial<AIPromptSystemConfig>;
  
  // Custom instructions
  customInstructions: string;
}
```

### UI Configuration Schema

```typescript
// For Super Admin UI
interface AIConfigUISchema {
  sections: ConfigSection[];
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  
  fields: ConfigField[];
}

interface ConfigField {
  path: string;                         // e.g., 'persona.name'
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'toggle' | 'number';
  options?: { value: string; label: string }[];
  default: any;
  
  // Permissions
  superAdminOnly: boolean;
  tenantCustomizable: boolean;
  
  // Validation
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  
  // Help
  helpText?: string;
  examples?: string[];
}
```

---

## Prompt Assembly

### Assembly Function

```typescript
async function assemblePrompt(
  request: InsightRequest,
  context: AssembledContext
): Promise<string> {
  
  // 1. Load configurations
  const systemConfig = await loadSystemConfig();
  const tenantConfig = await loadTenantConfig(request.tenantId);
  const assistantConfig = request.assistantId 
    ? await loadAssistantConfig(request.assistantId) 
    : null;
  const userPrefs = await loadUserPreferences(request.userId);
  
  // 2. Merge configurations
  const config = mergeConfigurations(
    systemConfig,
    tenantConfig,
    assistantConfig,
    userPrefs
  );
  
  // 3. Get user context
  const userContext = await getUserContext(request.userId);
  
  // 4. Render prompt layers
  const layers = [
    renderPersonaLayer(config.persona),
    renderStyleLayer(config.style, userContext),
    renderInsightLayer(request.insightType, request),
    renderToolsLayer(config.tools, config.webSearch),
    renderDomainKnowledgeLayer(config.domainKnowledge),
    renderSafetyLayer(config.safety),
    renderLocalizationLayer(config.localization, userContext),
    renderContextLayer(context),
  ];
  
  // 5. Combine layers
  return layers.join('\n\n---\n\n');
}
```

### Example Assembled Prompt

```markdown
# SYSTEM PROMPT

You are Castiel, an intelligent business assistant.

Your personality traits:
- helpful
- professional
- insightful
- proactive

Your areas of expertise:
- business analysis
- project management
- sales operations
- data interpretation

---

## Communication Style

Adapt your tone based on the context and user's role:
- For executives: Be formal, keep responses concise, focus on key metrics, strategic implications, recommendations.
- For managers: Be professional, keep responses standard, focus on team performance, blockers, next steps.
- For analysts: Be professional, keep responses detailed, focus on data analysis, trends, methodology.

Response format preferences:
- Default length: standard
- Use emojis sparingly for emphasis (✓, ⚠️, 📊)
- Choose bullets or prose based on content type
- Suggest next actions when relevant to the user's goal

---

## ANALYSIS INSIGHT INSTRUCTIONS

You are performing a risk analysis on PROJECT: "Project Alpha".

[... insight-specific instructions ...]

---

## AVAILABLE TOOLS

You have access to the following tools:
- create_task: Create a new task in the system
- schedule_meeting: Schedule a meeting with participants
- draft_email: Draft an email for the user to review
- web_search: Search the web for real-time information

[... tool instructions ...]

---

## DOMAIN KNOWLEDGE

### Industry Context: sales

### Active Frameworks

#### MEDDIC
When analyzing opportunities, consider MEDDIC criteria:
- M - Metrics: Quantifiable measures of success
- E - Economic Buyer: Person with final budget authority
[...]

---

## SAFETY GUIDELINES

### Accuracy & Grounding

**MODERATE MODE:**
- Support all factual claims with citations
- Clearly distinguish facts from inferences
- Express uncertainty when appropriate

[...]

---

## LOCALIZATION

- Respond in the same language as the user
- Display times in user's timezone: America/New_York

---

## CONTEXT DATA

[Assembled context from c_contextTemplate]

---

User's current role: Sales Manager
User's focus areas: Enterprise Accounts, Q4 Pipeline
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [Grounding & Accuracy](./GROUNDING.md)
- [c_assistant](../../shards/core-types/c_assistant.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0












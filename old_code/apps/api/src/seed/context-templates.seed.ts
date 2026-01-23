// @ts-nocheck
/**
 * Context Template Seed Data
 * 
 * Seeds the c_contextTemplate ShardType and initial AI context templates
 */

import type { ShardType } from '../types/shard-type.types.js';

/**
 * c_contextTemplate ShardType Definition
 * 
 * Context templates define how AI assistants interact with shards
 */
export const CONTEXT_TEMPLATE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'c_contextTemplate',
  displayName: 'AI Context Template',
  description: 'Templates that define AI context and behavior for shard operations',
  category: 'system',
  version: 1,
  isSystem: true,
  isGlobal: true,
  isActive: true,
  icon: 'sparkles',
  color: '#8b5cf6', // Purple
  tags: ['ai', 'context', 'template', 'system'],
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'templateType', 'prompt'],
    properties: {
      name: {
        type: 'string',
        title: 'Template Name',
        description: 'Unique identifier for this template',
        minLength: 1,
        maxLength: 100,
      },
      templateType: {
        type: 'string',
        title: 'Template Type',
        description: 'The type of AI operation this template supports',
        enum: [
          'summarization',
          'extraction',
          'classification',
          'generation',
          'analysis',
          'transformation',
          'qa',
          'custom',
        ],
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Human-readable description of what this template does',
        maxLength: 500,
      },
      prompt: {
        type: 'string',
        title: 'System Prompt',
        description: 'The main prompt template with variable placeholders',
        minLength: 10,
      },
      variables: {
        type: 'array',
        title: 'Variables',
        description: 'Variables that can be interpolated into the prompt',
        items: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] },
            required: { type: 'boolean' },
            default: {},
            description: { type: 'string' },
          },
        },
      },
      outputSchema: {
        type: 'object',
        title: 'Output Schema',
        description: 'JSON schema defining the expected output structure',
      },
      modelConfig: {
        type: 'object',
        title: 'Model Configuration',
        description: 'AI model settings for this template',
        properties: {
          preferredModel: { type: 'string' },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          maxTokens: { type: 'integer', minimum: 1 },
          topP: { type: 'number', minimum: 0, maximum: 1 },
          stopSequences: { type: 'array', items: { type: 'string' } },
        },
      },
      targetShardTypes: {
        type: 'array',
        title: 'Target Shard Types',
        description: 'ShardType IDs this template applies to (empty = all)',
        items: { type: 'string' },
      },
      examples: {
        type: 'array',
        title: 'Examples',
        description: 'Example inputs and outputs for few-shot learning',
        items: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            output: { type: 'string' },
          },
        },
      },
      isDefault: {
        type: 'boolean',
        title: 'Is Default',
        description: 'Whether this is the default template for its type',
        default: false,
      },
    },
  },
  uiSchema: {
    prompt: {
      'ui:widget': 'textarea',
      'ui:options': { rows: 10 },
    },
    outputSchema: {
      'ui:widget': 'json',
    },
  },
};

/**
 * Default Context Templates
 */
export const DEFAULT_CONTEXT_TEMPLATES = [
  {
    name: 'default_summarization',
    templateType: 'summarization',
    description: 'Generate concise summaries of shard content',
    prompt: `You are an expert summarization assistant. Analyze the following content and provide a clear, concise summary.

Content:
{{content}}

Guidelines:
- Focus on key points and main ideas
- Keep the summary to {{maxLength}} words or less
- Maintain factual accuracy
- Use clear, professional language

Provide your summary:`,
    variables: [
      { name: 'content', type: 'string', required: true, description: 'The content to summarize' },
      { name: 'maxLength', type: 'number', required: false, default: 150, description: 'Maximum word count' },
    ],
    modelConfig: {
      temperature: 0.3,
      maxTokens: 500,
    },
    isDefault: true,
  },
  {
    name: 'default_extraction',
    templateType: 'extraction',
    description: 'Extract structured data from unstructured content',
    prompt: `You are a data extraction specialist. Extract structured information from the following content according to the specified schema.

Content:
{{content}}

Target Fields:
{{targetFields}}

Instructions:
- Extract only factual information present in the content
- Return null for fields that cannot be determined
- Maintain original formatting for names, dates, etc.
- Provide confidence scores where applicable

Return the extracted data as valid JSON:`,
    variables: [
      { name: 'content', type: 'string', required: true, description: 'Content to extract from' },
      { name: 'targetFields', type: 'array', required: true, description: 'Fields to extract' },
    ],
    outputSchema: {
      type: 'object',
      additionalProperties: true,
    },
    modelConfig: {
      temperature: 0.1,
      maxTokens: 1000,
    },
    isDefault: true,
  },
  {
    name: 'default_classification',
    templateType: 'classification',
    description: 'Classify content into predefined categories',
    prompt: `You are a content classification expert. Analyze the following content and classify it into the most appropriate category.

Content:
{{content}}

Available Categories:
{{categories}}

Instructions:
- Choose the single most appropriate category
- Provide a confidence score (0-1)
- Briefly explain your reasoning

Respond in JSON format:
{
  "category": "selected_category",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`,
    variables: [
      { name: 'content', type: 'string', required: true, description: 'Content to classify' },
      { name: 'categories', type: 'array', required: true, description: 'Available categories' },
    ],
    outputSchema: {
      type: 'object',
      required: ['category', 'confidence'],
      properties: {
        category: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
      },
    },
    modelConfig: {
      temperature: 0.2,
      maxTokens: 300,
    },
    isDefault: true,
  },
  {
    name: 'default_qa',
    templateType: 'qa',
    description: 'Answer questions based on shard context',
    prompt: `You are a helpful AI assistant with access to specific context. Answer the user's question based ONLY on the provided context. If the answer cannot be found in the context, say so clearly.

Context:
{{context}}

Question: {{question}}

Instructions:
- Answer based solely on the provided context
- Be concise but comprehensive
- If uncertain, indicate your confidence level
- Quote relevant parts of the context when helpful

Answer:`,
    variables: [
      { name: 'context', type: 'string', required: true, description: 'Context information' },
      { name: 'question', type: 'string', required: true, description: 'User question' },
    ],
    modelConfig: {
      temperature: 0.3,
      maxTokens: 800,
    },
    isDefault: true,
  },
  {
    name: 'default_analysis',
    templateType: 'analysis',
    description: 'Perform deep analysis of shard content',
    prompt: `You are an analytical expert. Perform a comprehensive analysis of the following content.

Content:
{{content}}

Analysis Focus: {{focusArea}}

Provide your analysis covering:
1. Key Themes and Patterns
2. Notable Insights
3. Potential Issues or Concerns
4. Recommendations
5. Related Topics to Explore

Be thorough but concise in your analysis:`,
    variables: [
      { name: 'content', type: 'string', required: true, description: 'Content to analyze' },
      { name: 'focusArea', type: 'string', required: false, default: 'general', description: 'Specific area to focus on' },
    ],
    modelConfig: {
      temperature: 0.5,
      maxTokens: 1500,
    },
    isDefault: true,
  },
  {
    name: 'contact_enrichment',
    templateType: 'extraction',
    description: 'Enrich contact data with additional information',
    prompt: `You are a contact data enrichment specialist. Based on the provided contact information, extract and structure any additional details you can infer.

Contact Data:
{{contactData}}

Extract and return:
- Full name components (first, last, prefix, suffix)
- Company/organization information
- Role/title normalization
- Email domain analysis
- Phone number formatting
- Social profile indicators
- Industry classification

Return as structured JSON:`,
    variables: [
      { name: 'contactData', type: 'object', required: true, description: 'Raw contact data' },
    ],
    targetShardTypes: ['c_contact'],
    modelConfig: {
      temperature: 0.2,
      maxTokens: 800,
    },
    isDefault: false,
  },
  {
    name: 'note_tagging',
    templateType: 'classification',
    description: 'Auto-generate tags for notes',
    prompt: `You are a content tagging specialist. Analyze the following note and suggest relevant tags.

Note Content:
{{content}}

Note Title: {{title}}

Generate 3-7 relevant tags that:
- Capture the main topics
- Include action items if present
- Note any people, projects, or deadlines mentioned
- Are concise (1-3 words each)

Return as JSON array:
["tag1", "tag2", "tag3"]`,
    variables: [
      { name: 'content', type: 'string', required: true },
      { name: 'title', type: 'string', required: false },
    ],
    targetShardTypes: ['c_note'],
    outputSchema: {
      type: 'array',
      items: { type: 'string' },
    },
    modelConfig: {
      temperature: 0.4,
      maxTokens: 200,
    },
    isDefault: false,
  },
  {
    name: 'relationship_suggestion',
    templateType: 'analysis',
    description: 'Suggest relationships between shards',
    prompt: `You are a knowledge graph expert. Analyze the following two shards and determine if they should be related.

Shard A:
{{shardA}}

Shard B:
{{shardB}}

Determine:
1. Should these shards be related? (yes/no)
2. What type of relationship? (references, relatedTo, partOf, precedes, etc.)
3. Relationship strength (0-1)
4. Brief justification

Return as JSON:
{
  "shouldRelate": true,
  "relationshipType": "references",
  "strength": 0.8,
  "justification": "Brief explanation",
  "bidirectional": true
}`,
    variables: [
      { name: 'shardA', type: 'object', required: true },
      { name: 'shardB', type: 'object', required: true },
    ],
    modelConfig: {
      temperature: 0.3,
      maxTokens: 400,
    },
    isDefault: false,
  },
];

/**
 * Get seeding function
 */
export function getContextTemplateSeedData() {
  return {
    shardType: CONTEXT_TEMPLATE_SHARD_TYPE,
    templates: DEFAULT_CONTEXT_TEMPLATES,
  };
}


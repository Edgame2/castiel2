# AI Insights - Complete Implementation Plan

**Project**: Castiel AI Insights System  
**Date**: December 20, 2025  
**Status**: 65% Complete → 100% Target  
**Timeline**: 12 weeks to feature-complete

---

## Executive Summary

This plan details the implementation of missing features across 5 AI Insights components:
1. **Embeddings** - Automatic generation and processing
2. **Vector Search** - RAG integration and optimization
3. **AI Chat** - Memory management and function calling
4. **User Intent** - ML-based classification
5. **Prompt Management** - System prompts and A/B testing

**Key Leverage Points**:
- ✅ Existing `EmbeddingTemplateService` (395 lines)
- ✅ Existing `VectorSearchService` (600+ lines)
- ✅ Existing `InsightsService` (852 lines)
- ✅ Existing `IntentAnalyzerService` with pattern matching
- ✅ Existing `PromptRepository` with full CRUD
- ✅ Azure Service Bus infrastructure configured
- ✅ Cosmos DB containers ready

**Clarified Scope: Global vs Project Chat**
- Project chat is explicitly scoped with `scope: 'project'` and a provided `projectId` (the `c_project` shardId); global chat uses `scope: 'global'`.
- Project context gathers shards from `internal_relationships` of the `c_project` (types: `c_document`, `c_documentChunk`, `c_note`) plus a small allowance of unlinked docs.
- Vector search: filter-first on project-linked shards; allow up to ~20% of context tokens for high-similarity unlinked documents (tenant-wide) to enrich answers.
- Context priority: project shards first, then unlinked docs if token budget remains; dedupe by shardId.
- Token budgets (best practice): target ~1500–2000 tokens for context and ~500–800 for the answer; truncate per model window.

---

## Phase 1: Critical Foundations (Weeks 1-2)

### 1.1 Seed System Prompts ⚡ URGENT
**Impact**: Blocks all AI insights functionality  
**Effort**: 2 days  
**Files to Create**:
- `scripts/seed-system-prompts.ts`
- `data/prompts/system-prompts.json`

**Implementation**:

```typescript
// scripts/seed-system-prompts.ts
import { CosmosClient } from '@azure/cosmos';
import systemPrompts from '../data/prompts/system-prompts.json';

interface SystemPrompt {
  name: string;
  scope: 'system';
  insightType: string;
  version: number;
  template: string;
  metadata: {
    description: string;
    modelRecommendation: string;
    maxTokens: number;
  };
}

async function seedSystemPrompts() {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT!,
    key: process.env.COSMOS_DB_KEY!,
  });

  const container = client
    .database(process.env.COSMOS_DB_DATABASE!)
    .container('prompts');

  for (const prompt of systemPrompts.prompts as SystemPrompt[]) {
    const id = `system-${prompt.insightType}-v${prompt.version}`;
    
    await container.items.upsert({
      id,
      ...prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ Seeded: ${prompt.name}`);
  }
}

seedSystemPrompts().catch(console.error);
```

```json
// data/prompts/system-prompts.json
{
  "prompts": [
    {
      "name": "Summarization System Prompt",
      "scope": "system",
      "insightType": "summarization",
      "version": 1,
      "template": "You are an expert summarization assistant for Castiel, a knowledge management system.\n\nYour task is to create concise, accurate summaries of documents and content.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide a clear, structured summary that:\n1. Captures key points and main ideas\n2. Uses bullet points for readability\n3. Maintains factual accuracy\n4. Stays within {{maxLength}} words\n\nFormat your response in markdown.",
      "metadata": {
        "description": "System prompt for document summarization",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1000
      }
    },
    {
      "name": "Analysis System Prompt",
      "scope": "system",
      "insightType": "analysis",
      "version": 1,
      "template": "You are an expert analytical assistant for Castiel.\n\nYour task is to provide deep analysis of documents, identifying patterns, insights, and relationships.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide a structured analysis that includes:\n1. **Key Themes**: Main topics and patterns\n2. **Insights**: Notable findings and connections\n3. **Implications**: What this means for the user\n4. **Recommendations**: Actionable next steps\n\nUse markdown formatting with headings and bullet points.",
      "metadata": {
        "description": "System prompt for document analysis",
        "modelRecommendation": "gpt-4",
        "maxTokens": 2000
      }
    },
    {
      "name": "Comparison System Prompt",
      "scope": "system",
      "insightType": "comparison",
      "version": 1,
      "template": "You are an expert comparison assistant for Castiel.\n\nYour task is to compare multiple documents or concepts, highlighting similarities and differences.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide a structured comparison:\n\n## Similarities\n- List common elements\n\n## Differences\n- Highlight key distinctions\n\n## Analysis\n- Explain significance of similarities/differences\n\n## Conclusion\n- Summarize key takeaways",
      "metadata": {
        "description": "System prompt for comparing documents",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1500
      }
    },
    {
      "name": "Question Answering System Prompt",
      "scope": "system",
      "insightType": "question_answering",
      "version": 1,
      "template": "You are a precise question-answering assistant for Castiel.\n\nAnswer questions based ONLY on the provided context. If the answer is not in the context, say \"I don't have enough information to answer that question.\"\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nQuestion: {{query}}\n\nProvide:\n1. **Direct Answer**: Clear, concise response\n2. **Supporting Evidence**: Quotes or references from context\n3. **Confidence**: High/Medium/Low based on context quality\n\nBe factual and cite specific sources when possible.",
      "metadata": {
        "description": "System prompt for answering questions",
        "modelRecommendation": "gpt-4",
        "maxTokens": 800
      }
    },
    {
      "name": "Extraction System Prompt",
      "scope": "system",
      "insightType": "extraction",
      "version": 1,
      "template": "You are a precise data extraction assistant for Castiel.\n\nYour task is to extract specific information from documents.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nExtraction Request: {{query}}\n\nExtract the requested information and format as:\n\n```json\n{\n  \"extracted_data\": [],\n  \"confidence\": \"high|medium|low\",\n  \"source_references\": []\n}\n```\n\nOnly extract information explicitly present in the context.",
      "metadata": {
        "description": "System prompt for data extraction",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1000
      }
    },
    {
      "name": "Risk Analysis System Prompt",
      "scope": "system",
      "insightType": "risk_analysis",
      "version": 1,
      "template": "You are a risk analysis expert for Castiel.\n\nAnalyze the provided context for potential risks, vulnerabilities, and concerns.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide a structured risk analysis:\n\n## High Priority Risks\n- List critical risks with severity\n\n## Medium Priority Risks\n- List moderate concerns\n\n## Mitigation Strategies\n- Recommend specific actions\n\n## Overall Risk Assessment\n- Summary and priority recommendations\n\nUse severity levels: CRITICAL, HIGH, MEDIUM, LOW",
      "metadata": {
        "description": "System prompt for risk analysis",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1500
      }
    },
    {
      "name": "Trend Analysis System Prompt",
      "scope": "system",
      "insightType": "trend_analysis",
      "version": 1,
      "template": "You are a trend analysis expert for Castiel.\n\nIdentify patterns, trends, and trajectories in the provided data.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide:\n\n## Observed Trends\n- List key patterns with direction (↑ increasing, ↓ decreasing, → stable)\n\n## Supporting Data\n- Evidence for each trend\n\n## Projections\n- Likely future developments\n\n## Recommendations\n- Strategic actions based on trends",
      "metadata": {
        "description": "System prompt for trend analysis",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1500
      }
    },
    {
      "name": "Recommendation System Prompt",
      "scope": "system",
      "insightType": "recommendation",
      "version": 1,
      "template": "You are a strategic recommendation assistant for Castiel.\n\nProvide actionable recommendations based on the provided context.\n\nContext:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nUser Query: {{query}}\n\nProvide:\n\n## Top Recommendations\n1. **[Action]**: Description and rationale\n2. **[Action]**: Description and rationale\n3. **[Action]**: Description and rationale\n\n## Implementation Steps\n- Specific actions for each recommendation\n\n## Expected Outcomes\n- Benefits and impact of implementation\n\n## Considerations\n- Risks or challenges to be aware of\n\nPrioritize practicality and actionability.",
      "metadata": {
        "description": "System prompt for generating recommendations",
        "modelRecommendation": "gpt-4",
        "maxTokens": 1500
      }
    },
    {
      "name": "General Chat System Prompt",
      "scope": "system",
      "insightType": "chat",
      "version": 1,
      "template": "You are Castiel AI, an intelligent assistant for knowledge management and insights.\n\nYou have access to the user's knowledge base and can help with:\n- Answering questions about their documents\n- Summarizing and analyzing content\n- Finding related information\n- Providing insights and recommendations\n\nContext from knowledge base:\n{{#context}}\n- {{type}}: {{content}}\n{{/context}}\n\nConversation History:\n{{#history}}\n{{role}}: {{content}}\n{{/history}}\n\nUser: {{query}}\n\nRespond naturally and helpfully. If you need to search for information, explain what you're looking for. Be concise but thorough.",
      "metadata": {
        "description": "System prompt for general chat interactions",
        "modelRecommendation": "gpt-4",
        "maxTokens": 2000
      }
    }
  ]
}
```

**Integration**:
```typescript
// Add to package.json scripts
{
  "seed:prompts": "tsx scripts/seed-system-prompts.ts"
}
```

**Testing**:
```bash
pnpm run seed:prompts
# Verify: GET /api/prompts?scope=system
```

---

### 1.2 Implement RAG Retrieval in Context Assembly ⚡ CRITICAL
**Impact**: Core insight quality depends on this  
**Effort**: 3 days  
**Files to Modify**:
- `apps/api/src/services/ai-insights/insights.service.ts`
- (if preferred) augment `ContextTemplateService` wrapper for project/global routing

**Project vs Global Rules**
- Add `scope: 'project' | 'global'` and `projectId` (c_project shardId) to requests.
- Project mode: gather linked shards via `internal_relationships` (types: `c_document`, `c_documentChunk`, `c_note`).
- Vector search: filter-first on project shardIds; allow up to ~20% of context tokens for high-similarity unlinked docs (tenant-wide) to enrich context.
- Context priority: project shards first, then unlinked docs if budget remains; dedupe by shardId; truncate to ~1500–2000 context tokens.

**Implementation**:

```typescript
// Add to InsightsService class

/**
 * Perform RAG (Retrieval-Augmented Generation) to get relevant context
 */
private async performRAGRetrieval(
  params: {
    query: string;
    tenantId: string;
    userId: string;
    shardTypeFilter?: string[];
    maxResults?: number;
  }
): Promise<Array<{ type: string; content: string; score: number; shardId: string }>> {
  const { query, tenantId, userId, shardTypeFilter, maxResults = 5 } = params;

  try {
    // Use VectorSearchService for semantic search
    const searchResults = await this.vectorSearchService.semanticSearch({
      queryText: query,
      tenantId,
      userId,
      topK: maxResults,
      shardTypeFilter,
      includeContent: true,
      minSimilarity: 0.7, // Only include relevant results
    });

    // Transform results into context format
    return searchResults.map(result => ({
      type: result.shardType || 'document',
      content: this.truncateContent(result.content, 500), // Limit context size
      score: result.score,
      shardId: result.shardId,
    }));
  } catch (error) {
    this.logger.error('RAG retrieval failed', { error, query });
    return []; // Graceful degradation
  }
}

/**
 * Truncate content to max length while preserving word boundaries
 */
private truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/**
 * Assemble context from multiple sources
 */
private async assembleContext(params: {
  query: string;
  tenantId: string;
  userId: string;
  insightType: string;
  shardIds?: string[];
}): Promise<Array<{ type: string; content: string }>> {
  const { query, tenantId, userId, insightType, shardIds } = params;
  const context: Array<{ type: string; content: string }> = [];

  // 1. If specific shardIds provided, fetch those first
  if (shardIds && shardIds.length > 0) {
    for (const shardId of shardIds) {
      try {
        const shard = await this.shardRepository.findById(shardId, tenantId);
        if (shard && this.hasAccess(userId, shard)) {
          context.push({
            type: shard.shardType || 'document',
            content: JSON.stringify(shard.data),
          });
        }
      } catch (error) {
        this.logger.warn('Failed to fetch shard for context', { shardId, error });
      }
    }
  }

  // 2. Perform RAG retrieval for additional relevant context
  const ragResults = await this.performRAGRetrieval({
    query,
    tenantId,
    userId,
    maxResults: 5,
    shardTypeFilter: this.getRelevantShardTypes(insightType),
  });

  // Add RAG results to context (avoid duplicates)
  const existingShardIds = new Set(shardIds || []);
  for (const result of ragResults) {
    if (!existingShardIds.has(result.shardId)) {
      context.push({
        type: result.type,
        content: result.content,
      });
      existingShardIds.add(result.shardId);
    }
  }

  // 3. If context is still empty, use conversation history
  if (context.length === 0) {
    this.logger.info('No context found via RAG, using query only');
  }

  return context;
}

/**
 * Get relevant shard types based on insight type
 */
private getRelevantShardTypes(insightType: string): string[] | undefined {
  const mapping: Record<string, string[]> = {
    risk_analysis: ['risk', 'issue', 'audit', 'compliance'],
    trend_analysis: ['metric', 'analytics', 'report'],
    comparison: ['document', 'report', 'analysis'],
    question_answering: undefined, // Search all types
    summarization: ['document', 'article', 'report'],
    extraction: ['document', 'form', 'contract'],
  };

  return mapping[insightType];
}

/**
 * Check if user has access to shard (ACL check)
 */
private hasAccess(userId: string, shard: any): boolean {
  // If no ACL, assume public
  if (!shard.acl) return true;
  
  // Check if user is in allowed list
  return shard.acl.allowedUsers?.includes(userId) ?? false;
}
```

**Update existing generateInsight method**:

```typescript
async generateInsight(params: GenerateInsightParams): Promise<InsightResult> {
  const { query, insightType, tenantId, userId, shardIds, conversationId } = params;

  // Assemble context using RAG
  const context = await this.assembleContext({
    query,
    tenantId,
    userId,
    insightType,
    shardIds,
  });

  // Get system prompt
  const prompt = await this.promptResolver.resolvePrompt({
    insightType,
    tenantId,
    userId,
  });

  // Render prompt with context
  const renderedPrompt = await this.promptRenderer.render({
    template: prompt.template,
    variables: {
      query,
      context,
      maxLength: 500,
    },
  });

  // Call AI service
  const response = await this.unifiedAIClient.generateCompletion({
    prompt: renderedPrompt,
    model: prompt.metadata?.modelRecommendation || 'gpt-4',
    maxTokens: prompt.metadata?.maxTokens || 1000,
    temperature: 0.7,
  });

  return {
    insightId: uuidv4(),
    insightType,
    query,
    response: response.content,
    metadata: {
      model: response.model,
      tokensUsed: response.usage?.totalTokens,
      contextSources: context.length,
      timestamp: new Date().toISOString(),
    },
  };
}
```

---

### 1.3 ML-Based Intent Classification ⚡ HIGH PRIORITY
**Impact**: Improves accuracy from ~70% to ~95%  
**Effort**: 4 days  
**Files to Modify**:
- `apps/api/src/services/ai-insights/insights.service.ts`

**Implementation**:

```typescript
// Add to IntentAnalyzerService class

/**
 * Classify intent using LLM (zero-shot classification)
 */
private async classifyIntentWithLLM(query: string): Promise<{
  intent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
}> {
  const classificationPrompt = `You are an intent classifier for a knowledge management system.

Available intent types:
- summarization: User wants a summary of documents
- analysis: User wants deep analysis or insights
- comparison: User wants to compare multiple items
- question_answering: User has a specific question
- extraction: User wants to extract specific data
- risk_analysis: User wants to identify risks
- trend_analysis: User wants to identify trends
- recommendation: User wants actionable recommendations

Query: "${query}"

Respond in JSON format:
{
  "intent": "<intent_type>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>",
  "entities": [
    {"type": "document_type", "value": "contract"},
    {"type": "date_range", "value": "last quarter"}
  ]
}`;

  try {
    const response = await this.unifiedAIClient.generateCompletion({
      prompt: classificationPrompt,
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.1, // Low temperature for consistent classification
      responseFormat: 'json',
    });

    const result = JSON.parse(response.content);
    
    return {
      intent: result.intent,
      confidence: result.confidence,
      entities: result.entities || [],
    };
  } catch (error) {
    this.logger.error('LLM intent classification failed', { error, query });
    // Fallback to pattern-based classification
    return this.classifyIntentWithPatterns(query);
  }
}

/**
 * Existing pattern-based classification as fallback
 */
private classifyIntentWithPatterns(query: string): {
  intent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
} {
  const lowerQuery = query.toLowerCase();
  
  // Pattern matching logic (existing)
  if (lowerQuery.includes('summarize') || lowerQuery.includes('summary')) {
    return { intent: 'summarization', confidence: 0.8, entities: [] };
  }
  
  if (lowerQuery.includes('compare') || lowerQuery.includes('difference')) {
    return { intent: 'comparison', confidence: 0.8, entities: [] };
  }
  
  if (lowerQuery.includes('risk') || lowerQuery.includes('vulnerability')) {
    return { intent: 'risk_analysis', confidence: 0.8, entities: [] };
  }
  
  if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
    return { intent: 'trend_analysis', confidence: 0.8, entities: [] };
  }
  
  if (lowerQuery.match(/^(what|who|when|where|why|how)/)) {
    return { intent: 'question_answering', confidence: 0.7, entities: [] };
  }
  
  // Default to question_answering with low confidence
  return { intent: 'question_answering', confidence: 0.5, entities: [] };
}

/**
 * Main analyze method (updated)
 */
async analyzeIntent(query: string, conversationHistory?: Message[]): Promise<{
  intent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
  shouldClarify: boolean;
}> {
  // Use LLM-based classification
  const result = await this.classifyIntentWithLLM(query);
  
  // Determine if clarification is needed
  const shouldClarify = result.confidence < 0.7;
  
  return {
    ...result,
    shouldClarify,
  };
}
```

---

### 1.4 Setup Cosmos DB Change Feed for Embeddings ⚡ CRITICAL
**Impact**: Enables automatic embedding generation  
**Effort**: 3 days  
**Files to Create**:
- `apps/api/src/services/change-feed-processor.service.ts`
- `apps/api/src/workers/embedding-worker.ts`

**Implementation**:

```typescript
// apps/api/src/services/change-feed-processor.service.ts
import { ChangeFeedProcessor, ChangeFeedProcessorBuilder } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { injectable } from 'tsyringe';

@injectable()
export class ChangeFeedProcessorService {
  private processor?: ChangeFeedProcessor;
  private serviceBusClient: ServiceBusClient;

  constructor(
    private cosmosClient: CosmosClient,
    private logger: Logger
  ) {
    this.serviceBusClient = new ServiceBusClient(
      process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!
    );
  }

  /**
   * Start listening to shard changes
   */
  async start(): Promise<void> {
    const database = this.cosmosClient.database(process.env.COSMOS_DB_DATABASE!);
    const monitoredContainer = database.container(process.env.COSMOS_DB_SHARDS_CONTAINER!);
    const leaseContainer = database.container('leases'); // Create this container

    this.processor = await new ChangeFeedProcessorBuilder()
      .hostName('embedding-processor')
      .feedContainer(monitoredContainer)
      .leaseContainer(leaseContainer)
      .handleChanges(async (changes, context) => {
        await this.handleShardChanges(changes);
      })
      .buildChangeFeedProcessor();

    await this.processor.start();
    this.logger.info('Change Feed Processor started');
  }

  /**
   * Handle shard changes
   */
  private async handleShardChanges(changes: any[]): Promise<void> {
    const sender = this.serviceBusClient.createSender(
      process.env.AZURE_SERVICE_BUS_EMBEDDING_QUEUE!
    );

    const ignoredTypes = (process.env.EMBEDDING_JOB_IGNORED_SHARD_TYPES || '')
      .split(',')
      .map(t => t.trim());

    for (const shard of changes) {
      // Skip if shard type is in ignore list
      if (ignoredTypes.includes(shard.shardType)) {
        continue;
      }

      // Skip if already has embedding
      if (shard.embeddingVector && shard.embeddingVector.length > 0) {
        continue;
      }

      // Queue for embedding generation
      try {
        await sender.sendMessages({
          body: {
            shardId: shard.id,
            tenantId: shard.tenantId,
            shardType: shard.shardType,
            operation: 'generate_embedding',
            timestamp: new Date().toISOString(),
          },
          messageId: `${shard.id}-${Date.now()}`,
        });

        this.logger.info('Queued shard for embedding', { shardId: shard.id });
      } catch (error) {
        this.logger.error('Failed to queue shard for embedding', { 
          shardId: shard.id, 
          error 
        });
      }
    }

    await sender.close();
  }

  /**
   * Stop the processor
   */
  async stop(): Promise<void> {
    if (this.processor) {
      await this.processor.stop();
      this.logger.info('Change Feed Processor stopped');
    }
    await this.serviceBusClient.close();
  }
}
```

```typescript
// apps/api/src/workers/embedding-worker.ts
import { ServiceBusClient, ServiceBusReceivedMessage } from '@azure/service-bus';
import { injectable } from 'tsyringe';
import { ShardEmbeddingService } from '../services/shard-embedding.service';

@injectable()
export class EmbeddingWorker {
  private client: ServiceBusClient;
  private isProcessing = false;

  constructor(
    private embeddingService: ShardEmbeddingService,
    private logger: Logger
  ) {
    this.client = new ServiceBusClient(
      process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!
    );
  }

  /**
   * Start processing embedding jobs
   */
  async start(): Promise<void> {
    const receiver = this.client.createReceiver(
      process.env.AZURE_SERVICE_BUS_EMBEDDING_QUEUE!,
      {
        maxConcurrentCalls: 5, // Process 5 messages concurrently
        autoCompleteMessages: false,
      }
    );

    this.isProcessing = true;

    receiver.subscribe({
      processMessage: async (message: ServiceBusReceivedMessage) => {
        await this.processEmbeddingJob(message, receiver);
      },
      processError: async (error) => {
        this.logger.error('Service Bus receiver error', { error });
      },
    });

    this.logger.info('Embedding Worker started');
  }

  /**
   * Process a single embedding job
   */
  private async processEmbeddingJob(
    message: ServiceBusReceivedMessage,
    receiver: any
  ): Promise<void> {
    const { shardId, tenantId, shardType } = message.body;

    try {
      this.logger.info('Processing embedding job', { shardId, tenantId });

      // Generate and save embedding
      await this.embeddingService.generateAndSaveEmbedding({
        shardId,
        tenantId,
      });

      // Complete the message
      await receiver.completeMessage(message);
      
      this.logger.info('Embedding job completed', { shardId });
    } catch (error) {
      this.logger.error('Embedding job failed', { shardId, error });

      // Check retry count
      const retryCount = (message.applicationProperties?.retryCount as number) || 0;
      
      if (retryCount < 3) {
        // Retry with exponential backoff
        await receiver.abandonMessage(message, {
          retryCount: retryCount + 1,
        });
      } else {
        // Move to dead letter queue after 3 retries
        await receiver.deadLetterMessage(message, {
          deadLetterReason: 'MaxRetriesExceeded',
          deadLetterErrorDescription: error.message,
        });
      }
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    await this.client.close();
    this.logger.info('Embedding Worker stopped');
  }
}
```

**Integration in main app**:

```typescript
// apps/api/src/index.ts
import { ChangeFeedProcessorService } from './services/change-feed-processor.service';
import { EmbeddingWorker } from './workers/embedding-worker';

// Add after server starts
if (process.env.EMBEDDING_JOB_ENABLED === 'true') {
  const changeFeedProcessor = container.resolve(ChangeFeedProcessorService);
  const embeddingWorker = container.resolve(EmbeddingWorker);

  await changeFeedProcessor.start();
  await embeddingWorker.start();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await changeFeedProcessor.stop();
    await embeddingWorker.stop();
  });
}
```

**Create leases container**:
```typescript
// scripts/init-cosmos-db.ts - add this container
await database.containers.createIfNotExists({
  id: 'leases',
  partitionKey: '/id',
});
```

---

## Phase 2: High Priority Features (Weeks 3-4)

### 2.1 Conversation Memory Management
**Impact**: Better chat UX, prevents context overflow  
**Effort**: 3 days  
**Files to Modify**:
- `apps/api/src/services/ai-insights/insights.service.ts`

**Implementation**:

```typescript
// Add to ConversationService class

interface ConversationMemory {
  conversationId: string;
  messages: Message[];
  summary?: string;
  tokenCount: number;
  lastUpdated: string;
}

/**
 * Manage conversation memory with token limits
 */
private async manageConversationMemory(
  conversationId: string,
  maxTokens: number = 4000
): Promise<Message[]> {
  const conversation = await this.getConversation(conversationId);
  const messages = conversation.messages;

  // Calculate total tokens
  let totalTokens = this.estimateTokens(messages);

  // If under limit, return as-is
  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Strategy: Keep system prompt + recent messages + summary of old messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  // Keep last 10 messages
  const recentMessages = userMessages.slice(-10);
  const oldMessages = userMessages.slice(0, -10);

  // Summarize old messages if needed
  let summary = '';
  if (oldMessages.length > 0) {
    summary = await this.summarizeMessages(oldMessages);
  }

  // Construct optimized message list
  const optimizedMessages: Message[] = [
    ...systemMessages,
  ];

  if (summary) {
    optimizedMessages.push({
      role: 'system',
      content: `Previous conversation summary: ${summary}`,
      timestamp: new Date().toISOString(),
    });
  }

  optimizedMessages.push(...recentMessages);

  return optimizedMessages;
}

/**
 * Estimate token count for messages
 */
private estimateTokens(messages: Message[]): number {
  // Rough estimate: 1 token ≈ 4 characters
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
}

/**
 * Summarize old messages to preserve context
 */
private async summarizeMessages(messages: Message[]): Promise<string> {
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const summaryPrompt = `Summarize this conversation history in 2-3 sentences, preserving key context:

${conversationText}

Summary:`;

  const response = await this.unifiedAIClient.generateCompletion({
    prompt: summaryPrompt,
    model: 'gpt-4',
    maxTokens: 150,
    temperature: 0.3,
  });

  return response.content;
}
```

---

### 2.2 Embedding Job Status Tracking
**Impact**: Visibility into processing pipeline  
**Effort**: 2 days  
**Files to Create**:
- `apps/api/src/models/embedding-job.model.ts`
- `apps/api/src/routes/embedding-jobs.routes.ts`

**Implementation**:

```typescript
// apps/api/src/models/embedding-job.model.ts
export interface EmbeddingJob {
  id: string;
  tenantId: string;
  shardId: string;
  shardType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: {
    embeddingModel: string;
    vectorDimensions: number;
    processingTimeMs: number;
  };
}

// apps/api/src/repositories/embedding-job.repository.ts
@injectable()
export class EmbeddingJobRepository {
  private container: Container;

  constructor(private cosmosClient: CosmosClient) {
    const database = this.cosmosClient.database(process.env.COSMOS_DB_DATABASE!);
    this.container = database.container('embedding-jobs');
  }

  async create(job: EmbeddingJob): Promise<EmbeddingJob> {
    const { resource } = await this.container.items.create(job);
    return resource as EmbeddingJob;
  }

  async update(jobId: string, updates: Partial<EmbeddingJob>): Promise<EmbeddingJob> {
    const { resource: existing } = await this.container.item(jobId, jobId).read();
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { resource } = await this.container.item(jobId, jobId).replace(updated);
    return resource as EmbeddingJob;
  }

  async findByStatus(status: string, tenantId: string): Promise<EmbeddingJob[]> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.status = @status AND c.tenantId = @tenantId',
      parameters: [
        { name: '@status', value: status },
        { name: '@tenantId', value: tenantId },
      ],
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();
    return resources as EmbeddingJob[];
  }

  async getStats(tenantId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const querySpec = {
      query: `SELECT 
        COUNT(c.id) as total,
        c.status
      FROM c 
      WHERE c.tenantId = @tenantId 
      GROUP BY c.status`,
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();
    
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    resources.forEach((r: any) => {
      stats[r.status] = r.total;
    });

    return stats;
  }
}
```

**Update embedding worker**:

```typescript
// In embedding-worker.ts
private async processEmbeddingJob(
  message: ServiceBusReceivedMessage,
  receiver: any
): Promise<void> {
  const { shardId, tenantId, shardType } = message.body;
  const startTime = Date.now();

  // Create job record
  const job = await this.jobRepository.create({
    id: `job-${shardId}-${Date.now()}`,
    tenantId,
    shardId,
    shardType,
    status: 'processing',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    // Generate embedding
    const result = await this.embeddingService.generateAndSaveEmbedding({
      shardId,
      tenantId,
    });

    // Update job as completed
    await this.jobRepository.update(job.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      metadata: {
        embeddingModel: result.model,
        vectorDimensions: result.dimensions,
        processingTimeMs: Date.now() - startTime,
      },
    });

    await receiver.completeMessage(message);
  } catch (error) {
    // Update job as failed
    await this.jobRepository.update(job.id, {
      status: 'failed',
      error: error.message,
    });

    // Handle retry logic...
  }
}
```

---

### 2.3 Follow-Up Intent Handling
**Impact**: Natural multi-turn conversations  
**Effort**: 3 days  
**Files to Modify**:
- `apps/api/src/services/ai-insights/insights.service.ts`

**Implementation**:

```typescript
// Add to IntentAnalyzerService

/**
 * Resolve pronouns and references using conversation history
 */
private resolveReferences(
  query: string,
  conversationHistory: Message[]
): string {
  if (conversationHistory.length === 0) {
    return query;
  }

  const lastUserMessage = conversationHistory
    .filter(m => m.role === 'user')
    .slice(-1)[0];

  const lastAssistantMessage = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-1)[0];

  // Detect follow-up patterns
  const followUpPatterns = [
    /^(what about|how about|and|also)\s/i,
    /\b(it|that|this|they|them)\b/i,
  ];

  const isFollowUp = followUpPatterns.some(pattern => pattern.test(query));

  if (!isFollowUp) {
    return query;
  }

  // Use LLM to resolve references
  const resolutionPrompt = `Given this conversation history, rewrite the follow-up query to be standalone.

Previous User Query: ${lastUserMessage?.content || 'N/A'}
Assistant Response: ${lastAssistantMessage?.content || 'N/A'}

Follow-up Query: ${query}

Rewritten Query (standalone, with context):`;

  try {
    const response = await this.unifiedAIClient.generateCompletion({
      prompt: resolutionPrompt,
      model: 'gpt-4',
      maxTokens: 100,
      temperature: 0.2,
    });

    return response.content.trim();
  } catch (error) {
    this.logger.error('Reference resolution failed', { error });
    return query; // Fallback to original
  }
}

/**
 * Analyze intent with conversation context
 */
async analyzeIntent(
  query: string,
  conversationHistory?: Message[]
): Promise<{
  intent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
  shouldClarify: boolean;
  resolvedQuery: string;
}> {
  // Resolve references if this is a follow-up
  const resolvedQuery = conversationHistory
    ? await this.resolveReferences(query, conversationHistory)
    : query;

  // Classify intent
  const result = await this.classifyIntentWithLLM(resolvedQuery);

  return {
    ...result,
    shouldClarify: result.confidence < 0.7,
    resolvedQuery,
  };
}
```

---

### 2.4 Prompt A/B Testing Framework
**Impact**: Data-driven prompt optimization  
**Effort**: 4 days  
**Files to Create**:
- `apps/api/src/services/prompt-ab-test.service.ts`
- `apps/api/src/models/prompt-experiment.model.ts`

**Implementation**:

```typescript
// apps/api/src/models/prompt-experiment.model.ts
export interface PromptExperiment {
  id: string;
  name: string;
  tenantId: string;
  insightType: string;
  status: 'draft' | 'active' | 'completed';
  variants: Array<{
    variantId: string;
    promptId: string;
    trafficPercentage: number; // 0-100
  }>;
  metrics: {
    [variantId: string]: {
      impressions: number;
      successfulResponses: number;
      averageTokens: number;
      averageLatencyMs: number;
      userFeedbackScore: number; // 0-5
    };
  };
  startDate: string;
  endDate?: string;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
}

// apps/api/src/services/prompt-ab-test.service.ts
@injectable()
export class PromptABTestService {
  constructor(
    private experimentRepository: ExperimentRepository,
    private promptRepository: PromptRepository,
    private logger: Logger
  ) {}

  /**
   * Select a prompt variant based on traffic allocation
   */
  async selectVariant(params: {
    insightType: string;
    tenantId: string;
    userId: string;
  }): Promise<{ promptId: string; variantId: string; experimentId?: string }> {
    const { insightType, tenantId, userId } = params;

    // Check for active experiment
    const experiment = await this.experimentRepository.findActive({
      insightType,
      tenantId,
    });

    if (!experiment) {
      // No experiment, use default prompt
      const defaultPrompt = await this.promptRepository.findByType({
        insightType,
        tenantId,
        scope: 'system',
      });
      
      return {
        promptId: defaultPrompt.id,
        variantId: 'default',
      };
    }

    // Deterministic variant selection based on userId
    const hash = this.hashString(`${userId}-${experiment.id}`);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.trafficPercentage;
      if (bucket < cumulative) {
        return {
          promptId: variant.promptId,
          variantId: variant.variantId,
          experimentId: experiment.id,
        };
      }
    }

    // Fallback to first variant
    return {
      promptId: experiment.variants[0].promptId,
      variantId: experiment.variants[0].variantId,
      experimentId: experiment.id,
    };
  }

  /**
   * Record experiment metrics
   */
  async recordMetric(params: {
    experimentId: string;
    variantId: string;
    metric: {
      success: boolean;
      tokensUsed: number;
      latencyMs: number;
      userFeedback?: number;
    };
  }): Promise<void> {
    const { experimentId, variantId, metric } = params;

    const experiment = await this.experimentRepository.findById(experimentId);
    if (!experiment) return;

    const metrics = experiment.metrics[variantId] || {
      impressions: 0,
      successfulResponses: 0,
      averageTokens: 0,
      averageLatencyMs: 0,
      userFeedbackScore: 0,
    };

    // Update metrics
    const newImpressions = metrics.impressions + 1;
    metrics.impressions = newImpressions;

    if (metric.success) {
      metrics.successfulResponses++;
    }

    // Running averages
    metrics.averageTokens = this.updateAverage(
      metrics.averageTokens,
      metric.tokensUsed,
      newImpressions
    );

    metrics.averageLatencyMs = this.updateAverage(
      metrics.averageLatencyMs,
      metric.latencyMs,
      newImpressions
    );

    if (metric.userFeedback) {
      metrics.userFeedbackScore = this.updateAverage(
        metrics.userFeedbackScore,
        metric.userFeedback,
        newImpressions
      );
    }

    experiment.metrics[variantId] = metrics;
    await this.experimentRepository.update(experimentId, { metrics: experiment.metrics });
  }

  /**
   * Analyze experiment results and determine winner
   */
  async analyzeExperiment(experimentId: string): Promise<{
    winnerId: string;
    confidence: number;
    analysis: string;
  }> {
    const experiment = await this.experimentRepository.findById(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    // Calculate composite score for each variant
    const scores: Array<{ variantId: string; score: number }> = [];

    for (const variant of experiment.variants) {
      const metrics = experiment.metrics[variant.variantId];
      if (!metrics || metrics.impressions < 30) {
        continue; // Need minimum sample size
      }

      // Composite score: 40% success rate, 30% user feedback, 20% speed, 10% cost
      const successRate = metrics.successfulResponses / metrics.impressions;
      const normalizedFeedback = metrics.userFeedbackScore / 5;
      const normalizedLatency = 1 - Math.min(metrics.averageLatencyMs / 10000, 1);
      const normalizedTokens = 1 - Math.min(metrics.averageTokens / 2000, 1);

      const score =
        successRate * 0.4 +
        normalizedFeedback * 0.3 +
        normalizedLatency * 0.2 +
        normalizedTokens * 0.1;

      scores.push({ variantId: variant.variantId, score });
    }

    if (scores.length === 0) {
      throw new Error('Insufficient data to analyze experiment');
    }

    // Find winner
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];
    const runnerUp = scores[1];

    const confidence = runnerUp
      ? Math.min((winner.score - runnerUp.score) / runnerUp.score, 1)
      : 1;

    return {
      winnerId: winner.variantId,
      confidence,
      analysis: `Variant ${winner.variantId} scored ${(winner.score * 100).toFixed(1)}% with ${(confidence * 100).toFixed(0)}% confidence`,
    };
  }

  /**
   * Calculate running average
   */
  private updateAverage(
    currentAvg: number,
    newValue: number,
    count: number
  ): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

**Integration in InsightsService**:

```typescript
async generateInsight(params: GenerateInsightParams): Promise<InsightResult> {
  const { query, insightType, tenantId, userId } = params;

  // Select prompt variant (with A/B testing)
  const { promptId, variantId, experimentId } = 
    await this.abTestService.selectVariant({
      insightType,
      tenantId,
      userId,
    });

  const startTime = Date.now();

  try {
    // Generate insight using selected prompt...
    const result = await this.generateWithPrompt(promptId, params);

    // Record successful metric
    if (experimentId) {
      await this.abTestService.recordMetric({
        experimentId,
        variantId,
        metric: {
          success: true,
          tokensUsed: result.metadata.tokensUsed,
          latencyMs: Date.now() - startTime,
        },
      });
    }

    return result;
  } catch (error) {
    // Record failed metric
    if (experimentId) {
      await this.abTestService.recordMetric({
        experimentId,
        variantId,
        metric: {
          success: false,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
        },
      });
    }

    throw error;
  }
}
```

---

## Phase 3: Medium Priority Features (Weeks 5-8)

### 3.1 Function Calling Integration
### 3.2 Multi-Intent Detection
### 3.3 Cost Attribution System
### 3.4 Integration Test Suite
### 3.5 Embedding Content Hash Cache
### 3.6 Semantic Reranking
### 3.7 Template-Aware Query Processing
### 3.8 Chat Session Persistence

---

## Phase 4: Polish & Optimization (Weeks 9-12)

### 4.1 Telemetry Dashboard (Grafana)
### 4.2 Rate Limiting Per Tenant
### 4.3 Prompt Templates Library
### 4.4 Prompt Analytics Dashboard
### 4.5 Multi-Modal Support
### 4.6 Error Recovery UI
### 4.7 Per-ShardType Search Optimization

---

## Implementation Checklist

### Week 1-2 (Critical Path)
- [x] Create Cosmos DB `prompts` container
- [x] Create Cosmos DB `leases` container
- [x] Seed system prompts (8 prompts)
- [x] Test prompt resolution via API
- [x] Add `scope: 'project' | 'global'` and `projectId` to AI chat/insight APIs
- [x] Implement project-aware context assembly (pull linked shards via `internal_relationships` for `c_project`; include `c_document`, `c_documentChunk`, `c_note`)
- [x] Implement RAG retrieval with project shard filters and 20% unlinked-doc allowance (wired in `InsightService`)
- [x] Implement context assembly priority: project shards first; then unlinked docs if tokens remain; dedupe & truncate to ~1500–2000 context tokens
- [x] Test RAG integration end-to-end
- [x] Implement `classifyIntentWithLLM()` method (with safe fallback and parser tests)
 - [x] Test intent classification accuracy
- [x] Create `ChangeFeedProcessorService`
- [x] Create `EmbeddingWorker`
- [x] Deploy change feed processor
- [x] Test automatic embedding generation

### Week 3-4 (High Priority)
- [ ] Implement conversation memory management
- [ ] Test token limit handling
- [x] Create `embedding-jobs` container
- [x] Implement job status tracking
- [x] Build embedding jobs dashboard
- [ ] Implement reference resolution
- [ ] Test follow-up query handling
- [ ] Create prompt experiment model
- [ ] Implement A/B test service
- [ ] Create experiment management API
- [ ] Test variant selection

### Week 5-8 (Medium Priority)
- [ ] Define function calling schema
- [ ] Implement function executors
- [ ] Test function calling workflows
- [ ] Implement multi-intent detection
- [ ] Test intent decomposition
- [ ] Implement cost tracking service
- [ ] Build billing integration
- [ ] Write integration test suite
- [ ] Setup CI/CD for tests

### Week 9-12 (Polish)
- [ ] Setup Grafana dashboards
- [ ] Configure Application Insights
- [ ] Implement rate limiting
- [ ] Build prompt library UI
- [ ] Create prompt analytics
- [ ] Add multi-modal support
- [ ] Improve error handling UX

---

## Testing Strategy

### Unit Tests
```bash
# Test individual services
pnpm test:unit src/services/ai-insights/
pnpm test:unit src/services/vector-search.service.test.ts
pnpm test:unit src/services/prompt-ab-test.service.test.ts
```

### Integration Tests
```bash
# Test end-to-end workflows
pnpm test:integration tests/ai-insights/
pnpm test:integration tests/embedding-pipeline.test.ts
pnpm test:integration tests/rag-retrieval.test.ts
```

### Load Tests
```bash
# Test scalability
artillery run tests/load/ai-insights.yml
artillery run tests/load/vector-search.yml
```

---

## Monitoring & Observability

### Key Metrics
1. **Embedding Pipeline**
   - Queue depth (Service Bus)
   - Processing rate (embeddings/minute)
   - Success rate (%)
   - Average latency (ms)

2. **Vector Search**
   - Query latency (p50, p95, p99)
   - Cache hit rate (%)
   - Results relevance score

3. **AI Insights**
   - Insight generation latency
   - Token usage per request
   - Intent classification accuracy
   - User feedback scores

4. **Prompt A/B Tests**
   - Active experiments count
   - Variant performance metrics
   - Confidence intervals

### Alerts
- [ ] Queue depth > 1000 items
- [ ] Embedding failure rate > 5%
- [ ] Vector search latency > 2s (p95)
- [ ] AI insight error rate > 3%
- [ ] Cost per tenant > threshold

---

## Deployment Plan

### Prerequisites
```bash
# Create new Cosmos DB containers
pnpm run init:cosmos-db

# Seed system prompts
pnpm run seed:prompts

# Verify Service Bus queues exist
az servicebus queue show --name shards-to-vectorize --namespace-name summito

# Configure Azure App Service environment variables
```

### Deployment Steps
1. Deploy Phase 1 features (Week 2)
2. Monitor embedding pipeline for 48h
3. Deploy Phase 2 features (Week 4)
4. Run A/B tests on prompts (2 weeks)
5. Deploy Phase 3 features (Week 8)
6. Full system load test
7. Deploy Phase 4 features (Week 12)
8. Production release

---

## Success Criteria

### Phase 1 Complete ✅
- ✅ 8 system prompts seeded and tested
- ✅ RAG retrieval returns relevant results (>0.7 similarity)
- ✅ Intent classification accuracy >90%
- ✅ Embeddings auto-generated within 5 minutes
- ✅ Embedding job tracking with status persistence

### Phase 2 Complete
- ✅ Conversations maintain context for 20+ turns
- ✅ Embedding jobs tracked with <1% data loss
- ✅ Follow-up queries resolved correctly >85%
- ✅ A/B tests show statistical significance (p<0.05)

### Phase 3 Complete
- ✅ Function calling executes 10+ tools
- ✅ Multi-intent queries decomposed accurately
- ✅ Cost attribution tracks 100% of usage
- ✅ Integration tests cover 80%+ of workflows

### Phase 4 Complete
- ✅ Dashboards show real-time metrics
- ✅ Rate limits prevent abuse
- ✅ Prompt library has 50+ templates
- ✅ Error recovery provides helpful UX

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cosmos DB change feed lag | High | Monitor lag, scale throughput |
| Service Bus throttling | Medium | Use batch processing, monitor quotas |
| OpenAI API rate limits | High | Implement exponential backoff, caching |
| Vector search latency | Medium | Pre-warm cache, optimize indexes |
| Prompt token overflow | Medium | Implement token counting, truncation |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| High AI costs | High | Cost attribution, usage quotas |
| Poor insight quality | High | A/B testing, user feedback |
| Slow adoption | Medium | User training, documentation |
| Competitive pressure | Medium | Fast iteration, unique features |

---

## Estimated Costs

### Development
- 12 weeks × 1 developer = **12 weeks effort**
- Azure services (dev): **$500/month**
- OpenAI API (testing): **$200/month**

### Production (Monthly)
- Azure Cosmos DB: **$200-500** (depends on RU/s)
- Azure Service Bus: **$50-100**
- Azure OpenAI: **$1000-5000** (depends on usage)
- Redis Cache: **$100**
- Application Insights: **$50**

**Total Monthly Operating Cost**: **$1,400 - $5,750**

---

## Next Steps

1. **Review & Approve Plan** (1 day)
   - Stakeholder sign-off
   - Prioritization confirmation

2. **Setup Development Environment** (1 day)
   - Create Cosmos DB containers
   - Configure Service Bus queues
   - Setup monitoring

3. **Begin Phase 1** (2 weeks)
   - Start with prompt seeding
   - Parallel work on RAG integration
   - Daily standups to track progress

4. **Weekly Reviews**
   - Demo completed features
   - Adjust priorities based on feedback
   - Track against timeline

---

**Document Version**: 1.0  
**Last Updated**: December 20, 2025  
**Owner**: AI Insights Team  
**Status**: Ready for Implementation

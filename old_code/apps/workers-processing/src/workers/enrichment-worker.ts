/**
 * Enrichment Worker
 * 
 * Consumes enrichment jobs and enriches shards by:
 * 1. Extracting entities (company, contact, person) from source shards
 * 2. Creating entity shards (c_account, c_contact)
 * 3. Linking via internal_relationships with confidence scores
 */

import { Job } from 'bullmq';
import { QueueName, BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { EnrichmentJobMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis, Cluster } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface EnrichmentWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  openaiEndpoint?: string;
  openaiKey?: string;
  openaiDeploymentName?: string;
}

/**
 * Confidence policy by source type
 */
const CONFIDENCE_POLICY: Record<string, number> = {
  crm: 0.9,        // High confidence for structured CRM data
  llm: 0.6,        // Moderate confidence for LLM inference
  messaging: 0.5,  // Lower confidence for messaging data
  manual: 1.0,     // Highest confidence for manual links
};

export class EnrichmentWorker extends BaseWorker<EnrichmentJobMessage> {
  private cosmosClient: CosmosClient;
  private config: EnrichmentWorkerConfig;

  constructor(
    config: EnrichmentWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('enrichment-jobs', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.ENRICHMENT_CONCURRENCY || '5', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.ENRICHMENT_JOBS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        rateLimiter: workerConfig.rateLimiter,
        workerName: 'enrichment-worker',
      },
      async (job: Job<EnrichmentJobMessage>) => {
        return this.processEnrichment(job);
      }
    );

    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
  }

  private async processEnrichment(
    job: Job<EnrichmentJobMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId } = job.data;

    try {
      this.monitoring.trackEvent('enrichment-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
      });

      // Get the shard from Cosmos DB
      const shard = await this.getShard(shardId, tenantId);
      if (!shard) {
        this.monitoring.trackEvent('enrichment-worker.shard_not_found', {
          jobId: job.id,
          shardId,
          tenantId,
        });
        return;
      }

      // Extract entities based on shard type
      const entities = await this.extractEntities(shard);

      // Create entity shards and relationships
      const relationships = await this.createEntityShardsAndRelationships(
        shard,
        entities,
        tenantId
      );

      // Update source shard with relationships
      await this.updateShardRelationships(shard, relationships);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('enrichment-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration,
        relationshipsCreated: relationships.length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.processEnrichment',
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Get shard by ID
   */
  private async getShard(shardId: string, tenantId: string): Promise<any | null> {
    try {
      const database = this.cosmosClient.database(this.config.databaseId);
      const shardsContainer = database.container('shards');

      const { resource } = await shardsContainer.item(shardId, tenantId).read();
      return resource || null;
    } catch (error: any) {
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.getShard',
        shardId,
        tenantId,
      });
      return null;
    }
  }

  /**
   * Extract entities from shard based on shard type
   */
  private async extractEntities(shard: any): Promise<any[]> {
    const entities: any[] = [];
    const structuredData = shard.structuredData || {};

    switch (shard.shardTypeId) {
      case 'c_opportunity':
        // Extract account relationship
        if (structuredData.accountId) {
          entities.push({
            type: 'account',
            externalId: structuredData.accountId,
            confidence: CONFIDENCE_POLICY.crm,
            source: 'crm',
            extractionMethod: 'structured-field',
          });
        }
        // Extract contact from description (LLM-based)
        if (structuredData.description) {
          const contacts = await this.extractContactsFromText(structuredData.description);
          entities.push(...contacts);
        }
        break;

      case 'c_account':
        // Account is already an entity, no extraction needed
        break;

      case 'c_file':
      case 'c_folder':
        // Extract company/account mentions from file/folder names
        if (structuredData.name) {
          const accounts = await this.extractAccountsFromText(structuredData.name);
          entities.push(...accounts);
        }
        break;

      case 'c_channel':
        // Extract mentions from channel topic/description
        const text = `${structuredData.topic || ''} ${structuredData.description || ''}`;
        if (text.trim()) {
          const extracted = await this.extractEntitiesFromText(text);
          entities.push(...extracted);
        }
        break;
    }

    return entities;
  }

  /**
   * Extract contacts from text using LLM
   */
  private async extractContactsFromText(text: string): Promise<any[]> {
    if (!this.config.openaiEndpoint || !this.config.openaiKey) {
      return [];
    }

    try {
      const prompt = `Extract person names, email addresses, and contact information from the following text. Return a JSON array of contacts with fields: name, email (if found), type (person/contact), and confidence (0-1).

Text:
${text.substring(0, 2000)} // Limit to 2000 chars

Return only the JSON array, no additional text. Example format:
[{"name": "John Doe", "email": "john@example.com", "type": "person", "confidence": 0.9}]`;

      const entities = await this.callAzureOpenAI(prompt);
      return entities.map((e: any) => ({
        type: 'contact',
        externalId: e.email || e.name,
        name: e.name,
        email: e.email,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm,
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.extractContactsFromText',
      });
      return [];
    }
  }

  /**
   * Extract accounts from text
   */
  private async extractAccountsFromText(text: string): Promise<any[]> {
    if (!this.config.openaiEndpoint || !this.config.openaiKey) {
      return [];
    }

    try {
      const prompt = `Extract company names and organization names from the following text. Return a JSON array of accounts with fields: name, type (company/organization), and confidence (0-1).

Text:
${text.substring(0, 2000)}

Return only the JSON array, no additional text. Example format:
[{"name": "Acme Corp", "type": "company", "confidence": 0.9}]`;

      const entities = await this.callAzureOpenAI(prompt);
      return entities.map((e: any) => ({
        type: 'account',
        externalId: e.name,
        name: e.name,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm,
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.extractAccountsFromText',
      });
      return [];
    }
  }

  /**
   * Extract entities from text (generic)
   */
  private async extractEntitiesFromText(text: string): Promise<any[]> {
    if (!this.config.openaiEndpoint || !this.config.openaiKey) {
      return [];
    }

    try {
      const prompt = `Extract named entities from the following text. Focus on: person names, company names, locations, dates, and products. Return a JSON array with fields: text, type (person/organization/location/date/product/other), and confidence (0-1).

Text:
${text.substring(0, 2000)}

Return only the JSON array, no additional text.`;

      const entities = await this.callAzureOpenAI(prompt);
      return entities.map((e: any) => ({
        type: e.type === 'organization' ? 'account' : e.type === 'person' ? 'contact' : 'other',
        externalId: e.text,
        name: e.text,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm,
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.extractEntitiesFromText',
      });
      return [];
    }
  }

  /**
   * Call Azure OpenAI chat completions API
   */
  private async callAzureOpenAI(prompt: string): Promise<any[]> {
    if (!this.config.openaiEndpoint || !this.config.openaiKey) {
      return [];
    }

    const deploymentName = this.config.openaiDeploymentName || 'gpt-4o';
    const apiVersion = '2024-02-15-preview';
    
    // Normalize endpoint
    let endpoint = this.config.openaiEndpoint.trim();
    if (endpoint.endsWith('/openai/')) {
      endpoint = endpoint.slice(0, -8);
    } else if (endpoint.endsWith('/openai')) {
      endpoint = endpoint.slice(0, -7);
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.openaiKey!,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured data from text. Always return valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as { error?: { message?: string } };
      throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse JSON from response (might have markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      // Remove markdown code blocks
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    try {
      const entities = JSON.parse(jsonContent);
      return Array.isArray(entities) ? entities : [];
    } catch (parseError) {
      this.monitoring.trackException(parseError as Error, {
        context: 'EnrichmentWorker.callAzureOpenAI',
        responsePreview: jsonContent.substring(0, 200),
      });
      return [];
    }
  }

  /**
   * Create entity shards and relationships
   */
  private async createEntityShardsAndRelationships(
    sourceShard: any,
    entities: any[],
    tenantId: string
  ): Promise<any[]> {
    const database = this.cosmosClient.database(this.config.databaseId);
    const shardsContainer = database.container('shards');
    const relationships: any[] = [];

    for (const entity of entities) {
      try {
        // Determine shard type for entity
        let entityShardTypeId: string;
        let entityStructuredData: any;

        if (entity.type === 'account') {
          entityShardTypeId = 'c_account';
          // Try to find existing account shard by external ID
          const existing = await this.findEntityShard(
            tenantId,
            'c_account',
            entity.externalId
          );

          if (existing) {
            // Link to existing account
            relationships.push({
              shardId: existing.id,
              shardTypeId: 'c_account',
              shardTypeName: 'Account',
              shardName: existing.structuredData?.name || 'Account',
              createdAt: new Date().toISOString(),
              metadata: {
                confidence: entity.confidence,
                source: entity.source,
                extractionMethod: entity.extractionMethod,
                extractedAt: new Date().toISOString(),
              },
            });
            continue;
          }

          // Create new account shard (minimal data)
          entityStructuredData = {
            name: entity.name || 'Unknown Account',
            externalId: entity.externalId,
          };
        } else if (entity.type === 'contact') {
          entityShardTypeId = 'c_contact';
          // Similar logic for contacts
          // For now, skip contact creation (would need c_contact shard type)
          continue;
        } else {
          continue;
        }

        // Create new entity shard with all required fields
        const entityShard = {
          id: uuidv4(),
          tenantId,
          userId: 'system',
          shardTypeId: entityShardTypeId,
          structuredData: entityStructuredData,
          external_relationships: [],
          internal_relationships: [],
          acl: [],
          vectors: [], // Required: empty vectors array
          schemaVersion: 1, // Required: default schema version
          lastActivityAt: new Date().toISOString(), // Required: initial activity timestamp
          status: 'active',
          source: 'integration',
          sourceDetails: {
            integrationName: 'enrichment',
            originalId: entity.externalId,
            syncedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revisionId: uuidv4(),
          revisionNumber: 1,
        };

        await shardsContainer.items.create(entityShard);

        // Create relationship
        relationships.push({
          shardId: entityShard.id,
          shardTypeId: entityShardTypeId,
          shardTypeName: entityShardTypeId === 'c_account' ? 'Account' : 'Contact',
          shardName: entityStructuredData.name,
          createdAt: new Date().toISOString(),
          metadata: {
            confidence: entity.confidence,
            source: entity.source,
            extractionMethod: entity.extractionMethod,
            extractedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        this.monitoring.trackException(error as Error, {
          context: 'EnrichmentWorker.createEntityShardsAndRelationships',
          entityType: entity.type,
        });
        // Continue with other entities
      }
    }

    return relationships;
  }

  /**
   * Find existing entity shard by external ID
   */
  private async findEntityShard(
    tenantId: string,
    shardTypeId: string,
    externalId: string
  ): Promise<any | null> {
    try {
      const database = this.cosmosClient.database(this.config.databaseId);
      const shardsContainer = database.container('shards');

      // Try to find by external_relationships
      const { resources } = await shardsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId AND ARRAY_CONTAINS(c.external_relationships, {externalId: @externalId}, true)`,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@shardTypeId', value: shardTypeId },
            { name: '@externalId', value: externalId },
          ],
        })
        .fetchAll();

      return resources[0] || null;
    } catch (error: any) {
      this.monitoring.trackException(error as Error, {
        context: 'EnrichmentWorker.findEntityShard',
        tenantId,
        shardTypeId,
        externalId,
      });
      return null;
    }
  }

  /**
   * Update shard with relationships
   */
  private async updateShardRelationships(
    shard: any,
    relationships: any[]
  ): Promise<void> {
    if (relationships.length === 0) return;

    const database = this.cosmosClient.database(this.config.databaseId);
    const shardsContainer = database.container('shards');

    // Merge with existing relationships
    const existingRelationships = shard.internal_relationships || [];
    const newRelationships = [...existingRelationships, ...relationships];

    // Deduplicate by shardId
    const uniqueRelationships = Array.from(
      new Map(newRelationships.map(r => [r.shardId, r])).values()
    );

    await shardsContainer.item(shard.id, shard.tenantId).replace({
      ...shard,
      internal_relationships: uniqueRelationships,
      updatedAt: new Date().toISOString(),
      revisionNumber: (shard.revisionNumber || 0) + 1,
      revisionId: uuidv4(),
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


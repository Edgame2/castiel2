/**
 * Enrichment Processor Function (Phase 2)
 * 
 * Consumes shard-emission messages and enriches shards by:
 * 1. Extracting entities (company, contact, person) from source shards
 * 2. Creating entity shards (c_account, c_contact)
 * 3. Linking via internal_relationships with confidence scores
 * 
 * Trigger: Service Bus queue (shard-emission or enrichment-jobs)
 * Output: Updated shards with relationships
 */

import { app, ServiceBusMessage } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { v4 as uuidv4 } from 'uuid';

interface ShardEmissionMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  normalized: boolean;
  correlationId: string;
}

interface EnrichmentProcessorConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  serviceBusConnectionString: string;
  enrichmentJobsQueueName?: string;
  azureOpenAIEndpoint?: string;
  azureOpenAIKey?: string;
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

class EnrichmentProcessorFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient | null;
  private config: EnrichmentProcessorConfig;

  constructor(config: EnrichmentProcessorConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    this.serviceBusClient = config.serviceBusConnectionString
      ? new ServiceBusClient(config.serviceBusConnectionString)
      : null;
  }

  /**
   * Service Bus trigger handler
   */
  async handleMessage(message: ServiceBusMessage, context: any): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    try {
      const emissionMessage: ShardEmissionMessage = message.body as ShardEmissionMessage;
      context.log(`[${executionId}] Processing enrichment for shard: ${emissionMessage.shardId}`);

      // Get the shard
      const shard = await this.getShard(emissionMessage.shardId, emissionMessage.tenantId, context);
      if (!shard) {
        context.log.warn(`[${executionId}] Shard not found: ${emissionMessage.shardId}`);
        return;
      }

      // Extract entities based on shard type
      const entities = await this.extractEntities(shard, context);

      // Create entity shards and relationships
      const relationships = await this.createEntityShardsAndRelationships(
        shard,
        entities,
        emissionMessage.tenantId,
        context
      );

      // Update source shard with relationships
      await this.updateShardRelationships(shard, relationships, context);

      const duration = Date.now() - startTime;
      context.log(`[${executionId}] Enrichment completed in ${duration}ms, created ${relationships.length} relationships`);
    } catch (error: any) {
      context.log.error(`[${executionId}] Error processing enrichment: ${error.message}`);
      throw error; // Will trigger retry/DLQ
    }
  }

  /**
   * Extract entities from shard based on shard type
   */
  private async extractEntities(shard: any, context: any): Promise<any[]> {
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
          const contacts = await this.extractContactsFromText(structuredData.description, context);
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
          const accounts = await this.extractAccountsFromText(structuredData.name, context);
          entities.push(...accounts);
        }
        break;

      case 'c_channel':
        // Extract mentions from channel topic/description
        const text = `${structuredData.topic || ''} ${structuredData.description || ''}`;
        if (text.trim()) {
          const extracted = await this.extractEntitiesFromText(text, context);
          entities.push(...extracted);
        }
        break;
    }

    return entities;
  }

  /**
   * Extract contacts from text using LLM
   */
  private async extractContactsFromText(text: string, context: any): Promise<any[]> {
    if (!this.config.azureOpenAIEndpoint || !this.config.azureOpenAIKey) {
      context.log.warn('Azure OpenAI not configured, skipping LLM extraction');
      return [];
    }

    try {
      const prompt = `Extract person names, email addresses, and contact information from the following text. Return a JSON array of contacts with fields: name, email (if found), type (person/contact), and confidence (0-1).

Text:
${text.substring(0, 2000)} // Limit to 2000 chars

Return only the JSON array, no additional text. Example format:
[{"name": "John Doe", "email": "john@example.com", "type": "person", "confidence": 0.9}]`;

      const entities = await this.callAzureOpenAI(prompt, context);
      return entities.map((e: any) => ({
        type: 'contact',
        externalId: e.email || e.name,
        name: e.name,
        email: e.email,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm, // Scale by LLM confidence policy
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      context.log.error(`Error extracting contacts: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract accounts from text
   */
  private async extractAccountsFromText(text: string, context: any): Promise<any[]> {
    if (!this.config.azureOpenAIEndpoint || !this.config.azureOpenAIKey) {
      context.log.warn('Azure OpenAI not configured, skipping LLM extraction');
      return [];
    }

    try {
      const prompt = `Extract company names and organization names from the following text. Return a JSON array of accounts with fields: name, type (company/organization), and confidence (0-1).

Text:
${text.substring(0, 2000)}

Return only the JSON array, no additional text. Example format:
[{"name": "Acme Corp", "type": "company", "confidence": 0.9}]`;

      const entities = await this.callAzureOpenAI(prompt, context);
      return entities.map((e: any) => ({
        type: 'account',
        externalId: e.name,
        name: e.name,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm,
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      context.log.error(`Error extracting accounts: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract entities from text (generic)
   */
  private async extractEntitiesFromText(text: string, context: any): Promise<any[]> {
    if (!this.config.azureOpenAIEndpoint || !this.config.azureOpenAIKey) {
      context.log.warn('Azure OpenAI not configured, skipping LLM extraction');
      return [];
    }

    try {
      const prompt = `Extract named entities from the following text. Focus on: person names, company names, locations, dates, and products. Return a JSON array with fields: text, type (person/organization/location/date/product/other), and confidence (0-1).

Text:
${text.substring(0, 2000)}

Return only the JSON array, no additional text.`;

      const entities = await this.callAzureOpenAI(prompt, context);
      return entities.map((e: any) => ({
        type: e.type === 'organization' ? 'account' : e.type === 'person' ? 'contact' : 'other',
        externalId: e.text,
        name: e.text,
        confidence: (e.confidence || 0.6) * CONFIDENCE_POLICY.llm,
        source: 'llm',
        extractionMethod: 'llm-ner',
      }));
    } catch (error: any) {
      context.log.error(`Error extracting entities: ${error.message}`);
      return [];
    }
  }

  /**
   * Call Azure OpenAI chat completions API
   */
  private async callAzureOpenAI(prompt: string, context: any): Promise<any[]> {
    if (!this.config.azureOpenAIEndpoint || !this.config.azureOpenAIKey) {
      return [];
    }

    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
    const apiVersion = '2024-02-15-preview';
    
    // Normalize endpoint
    let endpoint = this.config.azureOpenAIEndpoint.trim();
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
        'api-key': this.config.azureOpenAIKey,
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
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

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
      context.log.warn(`Failed to parse LLM response: ${jsonContent.substring(0, 200)}`);
      return [];
    }
  }

  /**
   * Create entity shards and relationships
   */
  private async createEntityShardsAndRelationships(
    sourceShard: any,
    entities: any[],
    tenantId: string,
    context: any
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
            entity.externalId,
            context
          );

          if (existing) {
            // Link to existing account
            relationships.push({
              shardId: existing.id,
              shardTypeId: 'c_account',
              shardTypeName: 'Account',
              shardName: existing.structuredData?.name || 'Account',
              createdAt: new Date(),
              metadata: {
                confidence: entity.confidence,
                source: entity.source,
                extractionMethod: entity.extractionMethod,
                extractedAt: new Date(),
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
          context.log.warn(`Unknown entity type: ${entity.type}`);
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
          lastActivityAt: new Date(), // Required: initial activity timestamp
          status: 'active',
          source: 'integration',
          sourceDetails: {
            integrationName: 'enrichment',
            originalId: entity.externalId,
            syncedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
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
          createdAt: new Date(),
          metadata: {
            confidence: entity.confidence,
            source: entity.source,
            extractionMethod: entity.extractionMethod,
            extractedAt: new Date(),
          },
        });
      } catch (error: any) {
        context.log.error(`Error creating entity shard: ${error.message}`);
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
    externalId: string,
    context: any
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
      context.log.error(`Error finding entity shard: ${error.message}`);
      return null;
    }
  }

  /**
   * Update shard with relationships
   */
  private async updateShardRelationships(
    shard: any,
    relationships: any[],
    context: any
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
      updatedAt: new Date(),
      revisionNumber: (shard.revisionNumber || 0) + 1,
      revisionId: uuidv4(),
    });
  }

  /**
   * Get shard by ID
   */
  private async getShard(shardId: string, tenantId: string, context: any): Promise<any | null> {
    try {
      const database = this.cosmosClient.database(this.config.databaseId);
      const shardsContainer = database.container('shards');

      const { resource } = await shardsContainer.item(shardId, tenantId).read();
      return resource || null;
    } catch (error: any) {
      context.log.error(`Error getting shard: ${error.message}`);
      return null;
    }
  }
}

// Initialize function with config from environment
const config: EnrichmentProcessorConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || 'castiel',
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  enrichmentJobsQueueName: process.env.AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE || 'enrichment-jobs',
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
};

const processor = new EnrichmentProcessorFunction(config);

// Register Service Bus trigger (can listen to shard-emission or enrichment-jobs)
const queueName = process.env.AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE || 'shard-emission';

app.serviceBusQueue('enrichment-processor', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName,
  handler: (message, context) => processor.handleMessage(message, context),
});


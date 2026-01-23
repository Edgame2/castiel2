import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
} from '@castiel/api-core';
import { Shard } from '../types/shard.types.js';
import {
  ContextTemplateStructuredData,
  RelationshipConfig,
  FieldConfig,
  FieldSelection,
  AssembledContext,
  AssemblyMetadata,
  AssemblyDebugInfo,
  ContextAssemblyOptions,
  ContextAssemblyResult,
  TemplateSelectionOptions,
  TemplateCategory,
  ContextFormat,
  RAGConfiguration,
  SYSTEM_TEMPLATES,
} from '../types/context-template.types.js';

// Context template ShardType ID (system type)
const CONTEXT_TEMPLATE_TYPE_NAME = 'c_contextTemplate';

// Average tokens per character (approximate)
const TOKENS_PER_CHAR = 0.25;

/**
 * Context Template Service
 * Handles template resolution, selection, and context assembly
 */
export class ContextTemplateService {
  private shardRepository: ShardRepository;
  private shardTypeRepository: ShardTypeRepository;
  private relationshipService: ShardRelationshipService;
  private monitoring: IMonitoringProvider;
  private redis?: Redis;
  private aclService?: any; // ACLService - optional, for permission checks

  // Cache for system templates
  private systemTemplateCache: Map<string, Shard> = new Map();

  private unifiedAIClient?: any; // UnifiedAIClient - optional for LLM-based query understanding
  private aiConnectionService?: any; // AIConnectionService - optional for LLM-based query understanding
  private vectorSearchService?: any; // VectorSearchService - optional for RAG retrieval

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    shardTypeRepository: ShardTypeRepository,
    relationshipService: ShardRelationshipService,
    redis?: Redis,
    unifiedAIClient?: any, // Optional: for LLM-based query understanding
    aiConnectionService?: any, // Optional: for LLM-based query understanding
    vectorSearchService?: any, // Optional: for RAG retrieval
    aclService?: any // Optional: for ACL permission checks
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.shardTypeRepository = shardTypeRepository;
    this.relationshipService = relationshipService;
    this.redis = redis;
    this.unifiedAIClient = unifiedAIClient;
    this.aiConnectionService = aiConnectionService;
    this.vectorSearchService = vectorSearchService;
    this.aclService = aclService;
  }

  /**
   * Assemble context for a shard using a template
   */
  async assembleContext(
    shardId: string,
    tenantId: string,
    options: ContextAssemblyOptions = {}
  ): Promise<ContextAssemblyResult> {
    const startTime = Date.now();

    try {
      // Get the target shard
      const shard = await this.shardRepository.findById(shardId, tenantId);
      if (!shard) {
        return { success: false, context: null as any, error: 'Shard not found' };
      }

      // Get shard type info
      const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
      const shardTypeName = shardType?.name || shard.shardTypeId;

      // Select appropriate template
      const templateShard = await this.selectTemplate(tenantId, {
        preferredTemplateId: options.templateId,
        assistantId: options.assistantId,
        shardTypeName,
      });

      if (!templateShard) {
        return { success: false, context: null as any, error: `No template found for ${shardTypeName}` };
      }

      const template = templateShard.structuredData as ContextTemplateStructuredData;

      // Verify template applies to this shard type
      // Check if the template's primary source matches the shard type
      if (template.sources?.primary?.shardTypeId !== shardTypeName) {
        return {
          success: false,
          context: null as any,
          error: `Template "${template.name}" not applicable to ${shardTypeName}`,
        };
      }

      // Check cache if enabled
      if (!options.skipCache && template.cacheTTLSeconds && this.redis) {
        const cached = await this.getCachedContext(shardId, templateShard.id, tenantId);
        if (cached) {
          return { success: true, context: cached };
        }
      }

      // Initialize context
      const context: AssembledContext = {
        templateId: templateShard.id,
        templateName: template.name,
        self: null,
        related: {},
        metadata: {
          totalShards: 0,
          tokenEstimate: 0,
          truncated: false,
        },
      };

      const debug: AssemblyDebugInfo = {
        relationshipsTraversed: {},
        fieldsSelected: {},
        tokenBreakdown: {},
        executionTimeMs: 0,
      };

      // Include self if configured
      // Support both new structure (sources.primary) and old structure (includeSelf)
      const includeSelf = template.includeSelf ?? template.sources?.primary?.required ?? false;
      if (includeSelf) {
        const selfConfig = template.fieldSelection?.[shardTypeName];
        const selfFields = template.selfFields;
        // selectFields expects FieldSelection, not FieldSelection[]
        const fieldConfig = Array.isArray(selfConfig) ? selfConfig[0] : selfConfig;
        context.self = this.selectFields(shard.structuredData, fieldConfig, selfFields);
        context.metadata.totalShards++;

        if (options.debug) {
          debug.fieldsSelected[shardTypeName] = Object.keys(context.self);
          debug.tokenBreakdown['self'] = this.estimateTokens(context.self);
        }
      }

      // Traverse relationships
      // Support both new structure (sources.relationships) and old structure (relationships)
      const relationships = template.relationships ?? template.sources?.relationships ?? [];
      for (const relConfig of relationships) {
        // Convert fieldSelection from Record<string, FieldSelection[]> to Record<string, FieldSelection>
        const fieldSelectionMap: Record<string, FieldSelection> = {};
        if (template.fieldSelection) {
          for (const [key, value] of Object.entries(template.fieldSelection)) {
            if (Array.isArray(value) && value.length > 0) {
              fieldSelectionMap[key] = value[0]; // Use first field selection
            } else if (!Array.isArray(value)) {
              fieldSelectionMap[key] = value;
            }
          }
        }
        const relatedData = await this.traverseRelationship(
          shard,
          tenantId,
          relConfig,
          fieldSelectionMap
        );

        // Filter by ACL permissions if userId and ACLService are available
        let filteredShards = relatedData.shards;
        if (options.userId && this.aclService && relatedData.shards.length > 0) {
          try {
            const permissionChecks = await Promise.all(
              relatedData.shards.map(async (shardItem: any) => {
                const shardId = shardItem.shardId || shardItem.id;
                if (!shardId) return { shardItem, hasAccess: false };
                
                const checkResult = await this.aclService.checkPermission({
                  userId: options.userId!,
                  shardId,
                  tenantId,
                  requiredPermission: 'read' as any,
                  checkInheritance: true,
                });
                return { shardItem, hasAccess: checkResult.hasAccess };
              })
            );

            // Filter to only include shards user has access to
            filteredShards = permissionChecks
              .filter(({ hasAccess }) => hasAccess)
              .map(({ shardItem }) => shardItem);

            this.monitoring.trackEvent('context-template.acl-filtered', {
              shardId,
              relationshipType: relConfig.relationshipType,
              originalCount: relatedData.shards.length,
              filteredCount: filteredShards.length,
            });
          } catch (aclError) {
            // Log ACL check failure but continue without filtering
            this.monitoring.trackException(aclError as Error, {
              operation: 'context-template.acl-check',
              shardId,
              relationshipType: relConfig.relationshipType,
            });
            // Continue without ACL filtering if ACL service fails
          }
        }

        context.related[relConfig.relationshipType] = filteredShards;
        context.metadata.totalShards += filteredShards.length;

        if (options.debug) {
          debug.relationshipsTraversed[relConfig.relationshipType] = {
            found: relatedData.totalFound,
            included: relatedData.shards.length,
            filtered: relatedData.filtered,
          };
          debug.tokenBreakdown[relConfig.relationshipType] = this.estimateTokens(relatedData.shards);
        }

        // Check for required relationships (backward compatibility)
        const isRequired = (relConfig as any).required ?? false;
        if (isRequired && relatedData.shards.length === 0) {
          return {
            success: false,
            context: null as any,
            error: `Required relationship ${relConfig.relationshipType} not found`,
          };
        }
      }

      // Perform RAG retrieval if enabled and vector search service available
      // Support both new structure (sources.rag) and old structure (rag)
      const ragConfig = template.rag ?? template.sources?.rag;
      let ragChunks: any[] = [];
      if (ragConfig?.enabled && this.vectorSearchService && options.query) {
        try {
          ragChunks = await this.performRAGRetrieval(
            options.query!,
            ragConfig!,
            tenantId,
            shardId,
            context
          );
          
          // Add RAG chunks to context metadata
          if (ragChunks.length > 0) {
            context.metadata.ragChunksCount = ragChunks.length;
            context.metadata.ragTokens = this.estimateRAGTokens(ragChunks);
          }
        } catch (ragError) {
          // Log error but continue without RAG (graceful degradation)
          this.monitoring.trackException(ragError as Error, {
            operation: 'contextTemplate.ragRetrieval',
            shardId,
            tenantId,
          });
        }
      }

      // Estimate total tokens (including RAG)
      context.metadata.tokenEstimate = this.estimateTokens(context) + (context.metadata.ragTokens || 0);

      // Truncate if over limit
      // Support both new structure (limits.maxTotalTokens) and old structure (maxTokens)
      const maxTokens = options.maxTokensOverride || template.maxTokens || template.limits?.maxTotalTokens || 8000;
      if (maxTokens && context.metadata.tokenEstimate > maxTokens) {
        this.truncateContext(context, maxTokens, ragChunks);
        context.metadata.truncated = true;
      }

      // Format output (including RAG chunks)
      // Support both new structure (output.format) and old structure (format)
      const format: ContextFormat = (template.format || template.output?.format || 'structured') as ContextFormat;
      context.formatted = this.formatContext(context, format, ragChunks);

      // Cache if enabled
      if (!options.skipCache && template.cacheTTLSeconds && this.redis) {
        const cachedUntil = new Date(Date.now() + template.cacheTTLSeconds * 1000);
        context.metadata.cachedUntil = cachedUntil;
        await this.cacheContext(shardId, templateShard.id, tenantId, context, template.cacheTTLSeconds);
      }

      context.metadata.executionTimeMs = Date.now() - startTime;
      debug.executionTimeMs = Date.now() - startTime;

      this.monitoring.trackEvent('contextTemplate.assembled', {
        templateId: templateShard.id,
        templateName: template.name,
        shardId,
        tenantId,
        totalShards: context.metadata.totalShards,
        tokenEstimate: context.metadata.tokenEstimate,
        truncated: context.metadata.truncated,
      });

      return {
        success: true,
        context,
        debug: options.debug ? debug : undefined,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'contextTemplate.assembleContext',
        shardId,
        tenantId,
      });

      return {
        success: false,
        context: null as any,
        error: error.message,
      };
    }
  }

  /**
   * Select the appropriate template using hierarchy
   * Enhanced to support intent-based and scope-based selection
   */
  async selectTemplate(
    tenantId: string,
    options: TemplateSelectionOptions
  ): Promise<Shard | null> {
    // 1. User-specified template
    if (options.preferredTemplateId) {
      const template = await this.getTemplateById(options.preferredTemplateId, tenantId);
      if (template) {return template;}
    }

    // 2. Assistant's linked template
    if (options.assistantId) {
      const assistantTemplates = await this.relationshipService.getRelatedShards(
        tenantId,
        options.assistantId,
        'incoming',
        { relationshipType: 'template_for' }
      );
      if (assistantTemplates.length > 0) {
        return assistantTemplates[0].shard;
      }
    }

    // 3. Intent + scope-based template selection (with optional query understanding)
    if (options.insightType && options.shardTypeName) {
      const intentBasedTemplate = await this.selectTemplateByIntent(
        tenantId,
        options.insightType,
        options.shardTypeName,
        options.scopeMode,
        options.query // Pass query for enhanced matching
      );
      if (intentBasedTemplate) {
        return intentBasedTemplate;
      }
    }

    // 4. System template for shard type
    if (options.shardTypeName) {
      return this.getSystemTemplateForType(options.shardTypeName, tenantId);
    }

    return null;
  }

  /**
   * Select template based on intent type and shard type
   * Maps insight types to template categories
   * Optionally uses query text for enhanced matching
   */
  private async selectTemplateByIntent(
    tenantId: string,
    insightType: string,
    shardTypeName: string,
    scopeMode?: 'global' | 'project',
    query?: string // Optional query text for enhanced template matching
  ): Promise<Shard | null> {
    // Map insight types to template categories
    const insightToCategory: Record<string, TemplateCategory> = {
      'summary': 'summary',
      'analysis': 'analysis',
      'comparison': 'comparison',
      'extraction': 'extraction',
      'generation': 'generation',
      'chat': 'summary', // Chat uses summary templates
      'recommendation': 'analysis',
      'prediction': 'analysis',
    };

    const targetCategory = insightToCategory[insightType] || 'summary';

    // Query for templates matching category and shard type
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId: CONTEXT_TEMPLATE_TYPE_NAME,
      },
      limit: 100,
    });

    // Score templates by relevance
    const scoredTemplates: Array<{ template: Shard; score: number }> = [];

    for (const templateShard of result.shards) {
      const template = templateShard.structuredData as ContextTemplateStructuredData;
      
      if (!template.isActive) {continue;}

      let score = 0;

      // Category match (high weight)
      if (template.category === targetCategory) {
        score += 10;
      }

      // Shard type match (check primary source shard type)
      if (template.sources?.primary?.shardTypeId === shardTypeName) {
        score += 5;
      }

      // Scope match (prefer project templates for project scope)
      if (scopeMode === 'project' && template.category === 'summary') {
        score += 2;
      }

      // System templates get slight boost
      if (template.scope === 'system') {
        score += 1;
      }

      // Query-based matching (if query provided)
      if (query && template.description) {
        const queryLower = query.toLowerCase();
        const descLower = template.description.toLowerCase();
        const nameLower = template.name.toLowerCase();

        // Check if query keywords match template description or name
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3); // Filter short words
        let queryMatches = 0;
        for (const word of queryWords) {
          if (descLower.includes(word) || nameLower.includes(word)) {
            queryMatches++;
          }
        }
        if (queryMatches > 0) {
          score += queryMatches * 0.5; // Add bonus for query matches
        }

        // Check for specific keywords that indicate template type
        const keywordMatches: Record<string, string[]> = {
          'summary': ['summarize', 'summary', 'overview', 'brief', 'recap'],
          'analysis': ['analyze', 'analysis', 'examine', 'evaluate', 'assess'],
          'comparison': ['compare', 'comparison', 'versus', 'vs', 'difference'],
          'extraction': ['extract', 'find', 'get', 'list', 'show'],
        };
        
        for (const [category, keywords] of Object.entries(keywordMatches)) {
          if (template.category === category) {
            for (const keyword of keywords) {
              if (queryLower.includes(keyword)) {
                score += 1; // Bonus for category keyword match
                break;
              }
            }
          }
        }
      }

      if (score > 0) {
        scoredTemplates.push({ template: templateShard, score });
      }
    }

    // If query provided and we have LLM services, use LLM-based selection for top candidates
    if (query && scoredTemplates.length > 0 && this.unifiedAIClient && this.aiConnectionService) {
      try {
        const topCandidates = scoredTemplates
          .sort((a, b) => b.score - a.score)
          .slice(0, 5); // Top 5 candidates

        if (topCandidates.length > 1) {
          // Use LLM to select best template from top candidates
          const llmSelected = await this.selectTemplateWithLLM(
            tenantId,
            query,
            topCandidates.map(c => c.template),
            insightType,
            shardTypeName
          );
          if (llmSelected) {
            this.monitoring.trackEvent('template.llm-selection', {
              tenantId,
              insightType,
              selectedTemplate: llmSelected.id,
            });
            return llmSelected;
          }
        }
      } catch (error) {
        // Fall back to scoring-based selection if LLM fails
        this.monitoring.trackException(error as Error, {
          operation: 'template.llm-selection',
          tenantId,
        });
      }
    }

    // Return highest scoring template
    if (scoredTemplates.length > 0) {
      scoredTemplates.sort((a, b) => b.score - a.score);
      return scoredTemplates[0].template;
    }

    return null;
  }

  /**
   * Use LLM to select the best template from candidates based on query understanding
   */
  private async selectTemplateWithLLM(
    tenantId: string,
    query: string,
    candidateTemplates: Shard[],
    insightType: string,
    shardTypeName: string
  ): Promise<Shard | null> {
    if (!this.unifiedAIClient || !this.aiConnectionService || candidateTemplates.length === 0) {
      return null;
    }

    try {
      // Get a lightweight model for template selection
      const connectionResult = await this.aiConnectionService.getConnectionWithCredentialsForModel(
        'gpt-4o-mini', // Use lightweight model for template selection
        tenantId
      );

      if (!connectionResult) {
        return null; // Fall back to scoring-based selection
      }

      const { connection, apiKey } = connectionResult;

      // Build template descriptions for LLM
      const templateDescriptions = candidateTemplates.map((templateShard, index) => {
        const template = templateShard.structuredData as ContextTemplateStructuredData;
        return `${index + 1}. ${template.name} (${template.category}): ${template.description || 'No description'}`;
      }).join('\n');

      const selectionPrompt = `You are a template selection assistant. Given a user query and available templates, select the most appropriate template.

User Query: "${query}"
Insight Type: ${insightType}
Shard Type: ${shardTypeName}

Available Templates:
${templateDescriptions}

Respond with ONLY the number (1-${candidateTemplates.length}) of the best matching template.`;

      const result = await this.unifiedAIClient.chat(
        connection,
        apiKey,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a template selection assistant. Respond with only a number.',
            },
            {
              role: 'user',
              content: selectionPrompt,
            },
          ],
          maxTokens: 10,
          temperature: 0.2, // Low temperature for consistent selection
        }
      );

      const selectedIndex = parseInt(result.content.trim()) - 1;
      if (selectedIndex >= 0 && selectedIndex < candidateTemplates.length) {
        return candidateTemplates[selectedIndex];
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.llm-selection',
        tenantId,
      });
    }

    return null;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, tenantId: string): Promise<Shard | null> {
    const template = await this.shardRepository.findById(templateId, tenantId);
    if (!template) {return null;}

    // Verify it's a context template
    const shardType = await this.shardTypeRepository.findById(template.shardTypeId, tenantId);
    if (shardType?.name !== CONTEXT_TEMPLATE_TYPE_NAME) {
      return null;
    }

    return template;
  }

  /**
   * Get system template for a shard type
   */
  async getSystemTemplateForType(shardTypeName: string, tenantId: string): Promise<Shard | null> {
    // Check cache first
    const cacheKey = `${tenantId}:${shardTypeName}`;
    if (this.systemTemplateCache.has(cacheKey)) {
      return this.systemTemplateCache.get(cacheKey)!;
    }

    // Query for system templates
    // Note: SYSTEM_TEMPLATES is a const object mapping names to IDs, not an array
    // We'll query for templates that match the shard type
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId: CONTEXT_TEMPLATE_TYPE_NAME,
      },
      limit: 100,
    });

    // Find a system template that applies to this shard type
    // Check if template's primary source matches the shard type, or use backward compatibility
    const templateShard = result.shards.find(s => {
      const data = s.structuredData as ContextTemplateStructuredData;
      // Check if it's a system template and applies to this shard type
      const isSystemTemplate = data.scope === 'system' || (data as any).isSystemTemplate;
      if (!isSystemTemplate) {return false;}
      
      // Check if template applies to this shard type
      // New structure: check sources.primary.shardTypeId
      if (data.sources?.primary?.shardTypeId === shardTypeName) {
        return true;
      }
      
      // Backward compatibility: check applicableShardTypes if present
      if ((data as any).applicableShardTypes?.includes(shardTypeName)) {
        return true;
      }
      
      return false;
    });

    if (templateShard) {
      this.systemTemplateCache.set(cacheKey, templateShard);
    }

    return templateShard || null;
  }

  /**
   * List all templates available for a tenant
   */
  async listTemplates(
    tenantId: string,
    options?: {
      category?: string;
      applicableShardType?: string;
      includeSystem?: boolean;
    }
  ): Promise<Shard[]> {
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId: CONTEXT_TEMPLATE_TYPE_NAME,
      },
      limit: 100,
    });

    let templates = result.shards;

    // Filter by category
    if (options?.category) {
      templates = templates.filter(t => 
        (t.structuredData as ContextTemplateStructuredData).category === options.category
      );
    }

    // Filter by applicable shard type
    if (options?.applicableShardType) {
      templates = templates.filter(t => {
        const data = t.structuredData as ContextTemplateStructuredData;
        // Check new structure (sources.primary.shardTypeId) or backward compatibility (applicableShardTypes)
        const applicableShardTypes = (data as any).applicableShardTypes ?? (data.sources?.primary?.shardTypeId ? [data.sources.primary.shardTypeId] : []);
        return applicableShardTypes.includes(options.applicableShardType!);
      });
    }

    // Filter system templates
    if (options?.includeSystem === false) {
      templates = templates.filter(t => {
        const data = t.structuredData as ContextTemplateStructuredData;
        // Check new structure (scope === 'system') or backward compatibility (isSystemTemplate)
        return data.scope !== 'system' && !(data as any).isSystemTemplate;
      });
    }

    return templates;
  }

  /**
   * Traverse a relationship and get related shards
   */
  private async traverseRelationship(
    shard: Shard,
    tenantId: string,
    config: RelationshipConfig,
    fieldSelection: Record<string, FieldConfig>
  ): Promise<{
    shards: Record<string, any>[];
    totalFound: number;
    filtered: number;
  }> {
    // Get related shards via relationship service
    // Support both maxCount (backward compatibility) and limit (new structure)
    const relationshipLimit = (config as any).maxCount ?? config.limit ?? 10;
    const related = await this.relationshipService.getRelatedShards(
      tenantId,
      shard.id,
      'both',
      { relationshipType: config.relationshipType, limit: relationshipLimit * 2 }
    );

    let shards = related.map(r => r.shard);
    const totalFound = shards.length;

    // Apply filters (support both new filters array and old filter object)
    const filters = config.filters ?? ((config as any).filter ? [(config as any).filter] : []);
    if (filters.length > 0) {
      for (const filter of filters) {
        shards = shards.filter(s => this.matchesFilter(s.structuredData, filter));
      }
    }

    // Sort (support both new orderBy object and old orderDirection)
    const orderBy = config.orderBy ?? ((config as any).orderDirection ? { field: (config as any).orderBy?.field ?? 'createdAt', direction: (config as any).orderDirection } : undefined);
    if (orderBy) {
      shards.sort((a, b) => {
        const aVal = a.structuredData?.[orderBy.field] ?? (a as any)[orderBy.field];
        const bVal = b.structuredData?.[orderBy.field] ?? (b as any)[orderBy.field];
        
        if (aVal < bVal) {return orderBy.direction === 'asc' ? -1 : 1;}
        if (aVal > bVal) {return orderBy.direction === 'asc' ? 1 : -1;}
        return 0;
      });
    }

    // Limit results (support both maxCount and limit)
    if (relationshipLimit) {
      shards = shards.slice(0, relationshipLimit);
    }

    // Select fields
    const result = shards.map(s => {
      const typeName = s.shardTypeId; // Use type ID as fallback
      const fieldConfig = fieldSelection[typeName];
      return {
        id: s.id,
        shardTypeId: s.shardTypeId,
        ...this.selectFields(s.structuredData, fieldConfig),
      };
    });

    return {
      shards: result,
      totalFound,
      filtered: totalFound - shards.length,
    };
  }

  /**
   * Check if data matches a filter
   */
  private matchesFilter(data: Record<string, any>, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const dataValue = data[key];

      if (Array.isArray(value)) {
        // Check if dataValue is in the array
        if (!value.includes(dataValue)) {return false;}
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like $contains, $in, $gte, etc.
        if ('$contains' in value) {
          if (!Array.isArray(dataValue) || !dataValue.includes(value.$contains)) {return false;}
        }
        if ('$in' in value) {
          if (!value.$in.includes(dataValue)) {return false;}
        }
        // Add more operators as needed
      } else {
        // Direct comparison
        if (dataValue !== value) {return false;}
      }
    }
    return true;
  }

  /**
   * Select specific fields from data
   */
  private selectFields(
    data: Record<string, any>,
    config?: FieldConfig,
    specificFields?: string[]
  ): Record<string, any> {
    if (!data) {return {};}

    // Use specific fields if provided
    const fieldsToUse = specificFields || config?.include;

    let result: Record<string, any> = {};

    if (fieldsToUse) {
      // Whitelist mode
      for (const field of fieldsToUse) {
        if (field in data) {
          result[field] = data[field];
        }
      }
    } else if (config?.exclude) {
      // Blacklist mode
      result = { ...data };
      for (const field of config.exclude) {
        delete result[field];
      }
    } else {
      // No config - include all
      result = { ...data };
    }

    // Apply transforms
    if (config?.transform) {
      for (const [from, to] of Object.entries(config.transform)) {
        if (from in result) {
          result[to] = result[from];
          delete result[from];
        }
      }
    }

    return result;
  }

  /**
   * Estimate token count for data
   */
  private estimateTokens(data: any): number {
    const json = JSON.stringify(data);
    return Math.ceil(json.length * TOKENS_PER_CHAR);
  }

  /**
   * Perform RAG retrieval using vector search
   */
  private async performRAGRetrieval(
    query: string,
    ragConfig: RAGConfiguration,
    tenantId: string,
    primaryShardId: string,
    context: AssembledContext
  ): Promise<any[]> {
    if (!this.vectorSearchService) {
      return [];
    }

    try {
      // Build filter for RAG search
      const filter: any = {
        tenantId,
      };

      // Apply shard type filter if specified
      if (ragConfig.shardTypeIds && ragConfig.shardTypeIds.length > 0) {
        filter.shardTypeIds = ragConfig.shardTypeIds;
      }

      // Exclude primary shard and already included shards
      const excludeShardIds = [
        primaryShardId,
        ...(ragConfig.excludeShardIds || []),
        ...(context.related ? Object.values(context.related).flat().map((s: any) => s.shardId || s.id) : []),
      ];
      if (excludeShardIds.length > 0) {
        filter.excludeShardIds = excludeShardIds;
      }

      // Perform semantic search
      const searchResults = await this.vectorSearchService.semanticSearch(
        {
          query,
          topK: ragConfig.maxChunks || 10,
          minScore: ragConfig.minScore || 0.7,
          filter,
        },
        'system' // Internal system user for RAG
      );

      // Convert to RAG chunks format
      const ragChunks = searchResults.results.map((result: any) => ({
        id: result.shardId + (result.chunkIndex !== undefined ? `-chunk-${result.chunkIndex}` : ''),
        shardId: result.shardId,
        shardName: result.shard?.name || 'Unknown',
        shardTypeId: result.shardTypeId,
        content: result.content,
        score: result.score,
        chunkIndex: result.chunkIndex,
        field: result.field,
        source: {
          type: result.shardTypeId,
          id: result.shardId,
          field: result.field,
          chunkIndex: result.chunkIndex,
        },
      }));

      this.monitoring.trackEvent('contextTemplate.ragRetrieved', {
        tenantId,
        primaryShardId,
        chunksRetrieved: ragChunks.length,
        queryLength: query.length,
      });

      return ragChunks;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'contextTemplate.performRAGRetrieval',
        tenantId,
        primaryShardId,
      });
      return [];
    }
  }

  /**
   * Estimate tokens for RAG chunks
   */
  private estimateRAGTokens(ragChunks: any[]): number {
    return ragChunks.reduce((total, chunk) => {
      const content = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
      return total + Math.ceil(content.length * TOKENS_PER_CHAR);
    }, 0);
  }

  /**
   * Truncate context to fit within token limit
   */
  private truncateContext(context: AssembledContext, maxTokens: number, ragChunks?: any[]): void {
    const currentTokens = this.estimateTokens(context) + (ragChunks ? this.estimateRAGTokens(ragChunks) : 0);
    if (currentTokens <= maxTokens) {return;}

    const reductionNeeded = currentTokens - maxTokens;
    let reduced = 0;

    // Strategy: Remove items from largest relationship collections first
    const relationshipSizes = Object.entries(context.related)
      .map(([type, items]) => ({
        type,
        count: items.length,
        tokens: this.estimateTokens(items),
      }))
      .sort((a, b) => b.tokens - a.tokens);

    for (const rel of relationshipSizes) {
      if (reduced >= reductionNeeded) {break;}

      const items = context.related[rel.type];
      while (items.length > 1 && reduced < reductionNeeded) {
        const removed = items.pop();
        reduced += this.estimateTokens(removed);
      }
    }

    // If still over limit and RAG chunks provided, truncate RAG chunks
    if (ragChunks && ragChunks.length > 0) {
      const remainingReduction = reductionNeeded - reduced;
      if (remainingReduction > 0) {
        // Remove RAG chunks starting from lowest score
        const sortedChunks = [...ragChunks].sort((a, b) => (a.score || 0) - (b.score || 0));
        while (sortedChunks.length > 0 && reduced < reductionNeeded) {
          const chunk = sortedChunks.shift();
          if (chunk) {
            const chunkTokens = this.estimateRAGTokens([chunk]);
            reduced += chunkTokens;
            const index = ragChunks.indexOf(chunk);
            if (index > -1) {
              ragChunks.splice(index, 1);
            }
          }
        }
      }
    }

    // Update token estimate
    context.metadata.tokenEstimate = this.estimateTokens(context) + (ragChunks ? this.estimateRAGTokens(ragChunks) : 0);
  }

  /**
   * Format context for output
   */
  private formatContext(context: AssembledContext, format: ContextFormat, ragChunks?: any[]): string {
    switch (format) {
      case 'json':
        return JSON.stringify({ 
          self: context.self, 
          related: context.related,
          ragChunks: ragChunks || []
        }, null, 2);

      case 'minimal':
        return this.formatMinimal(context, ragChunks);

      case 'prose':
        return this.formatProse(context, ragChunks);

      case 'structured':
      default:
        return this.formatStructured(context, ragChunks);
    }
  }

  /**
   * Format as minimal key-value pairs
   */
  private formatMinimal(context: AssembledContext, ragChunks?: any[]): string {
    const lines: string[] = [];

    if (context.self) {
      for (const [key, value] of Object.entries(context.self)) {
        lines.push(`${key}: ${this.formatValue(value)}`);
      }
    }

    for (const [relType, items] of Object.entries(context.related)) {
      lines.push(`\n[${relType}]`);
      for (const item of items) {
        const summary = item.name || item.title || item.id;
        lines.push(`- ${summary}`);
      }
    }

    // Add RAG chunks if available
    if (ragChunks && ragChunks.length > 0) {
      lines.push(`\n[Relevant Content]`);
      for (const chunk of ragChunks.slice(0, 5)) { // Limit to top 5 for minimal format
        const content = typeof chunk.content === 'string' ? chunk.content.substring(0, 100) : JSON.stringify(chunk.content).substring(0, 100);
        lines.push(`- ${chunk.shardName}: ${content}...`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format as structured sections
   */
  private formatStructured(context: AssembledContext, ragChunks?: any[]): string {
    const sections: string[] = [];

    if (context.self) {
      sections.push('## Overview');
      for (const [key, value] of Object.entries(context.self)) {
        sections.push(`- **${this.formatKey(key)}**: ${this.formatValue(value)}`);
      }
    }

    for (const [relType, items] of Object.entries(context.related)) {
      if (items.length === 0) {continue;}

      sections.push(`\n## ${this.formatKey(relType)}`);
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        sections.push(`\n### ${i + 1}. ${item.name || item.title || item.id}`);
        for (const [key, value] of Object.entries(item)) {
          if (key === 'id' || key === 'shardTypeId' || key === 'name' || key === 'title') {continue;}
          sections.push(`- **${this.formatKey(key)}**: ${this.formatValue(value)}`);
        }
      }
    }

    // Add RAG chunks section if available
    if (ragChunks && ragChunks.length > 0) {
      sections.push(`\n## Relevant Content`);
      for (const chunk of ragChunks.slice(0, 10)) { // Limit to top 10 for structured format
        const content = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
        sections.push(`\n### ${chunk.shardName} (Score: ${chunk.score?.toFixed(2) || 'N/A'})`);
        sections.push(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      }
    }

    return sections.join('\n');
  }

  /**
   * Format as natural language prose
   */
  private formatProse(context: AssembledContext, ragChunks?: any[]): string {
    const paragraphs: string[] = [];

    if (context.self) {
      const name = context.self.name || context.self.title || 'This item';
      let selfDesc = `${name}`;
      
      const details: string[] = [];
      for (const [key, value] of Object.entries(context.self)) {
        if (key === 'name' || key === 'title') {continue;}
        if (value && typeof value !== 'object') {
          details.push(`${this.formatKey(key).toLowerCase()}: ${value}`);
        }
      }
      
      if (details.length > 0) {
        selfDesc += ` (${details.slice(0, 5).join(', ')})`;
      }
      
      paragraphs.push(selfDesc);
    }

    for (const [relType, items] of Object.entries(context.related)) {
      if (items.length === 0) {continue;}

      const relName = this.formatKey(relType).toLowerCase();
      const itemNames = items.map(i => i.name || i.title || 'unknown').slice(0, 5);
      
      if (items.length === 1) {
        paragraphs.push(`${relName.replace('has ', 'Has ')}: ${itemNames[0]}.`);
      } else {
        paragraphs.push(`${relName.replace('has ', 'Has ')} ${items.length} ${relName.replace('has_', '')}: ${itemNames.join(', ')}${items.length > 5 ? ', and more' : ''}.`);
      }
    }

    // Add RAG chunks if available
    if (ragChunks && ragChunks.length > 0) {
      paragraphs.push(`\n\nRelevant information from related documents:`);
      for (const chunk of ragChunks.slice(0, 5)) { // Limit to top 5 for prose format
        const content = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
        paragraphs.push(`From ${chunk.shardName}: ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`);
      }
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Format a key for display
   */
  private formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format a value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {return '-';}
    if (Array.isArray(value)) {return value.join(', ');}
    if (typeof value === 'object') {return JSON.stringify(value);}
    if (value instanceof Date) {return value.toISOString().split('T')[0];}
    return String(value);
  }

  /**
   * Cache assembled context
   */
  private async cacheContext(
    shardId: string,
    templateId: string,
    tenantId: string,
    context: AssembledContext,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.redis) {return;}

    const key = `context:${tenantId}:${shardId}:${templateId}`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(context));
  }

  /**
   * Get cached context
   */
  private async getCachedContext(
    shardId: string,
    templateId: string,
    tenantId: string
  ): Promise<AssembledContext | null> {
    if (!this.redis) {return null;}

    const key = `context:${tenantId}:${shardId}:${templateId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * Invalidate cached context
   */
  async invalidateCache(shardId: string, tenantId: string): Promise<void> {
    if (!this.redis) {return;}

    const pattern = `context:${tenantId}:${shardId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get system templates
   */
  getSystemTemplates(): ContextTemplateStructuredData[] {
    // SYSTEM_TEMPLATES is a const object, not an array
    // Return empty array for now - system templates should be queried from database
    return [];
  }
}












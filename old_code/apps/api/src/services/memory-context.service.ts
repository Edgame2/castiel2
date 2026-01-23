/**
 * Memory & Long-Term Context Service
 * Stores and retrieves user preferences, entity facts, and conversation history
 * for personalized AI interactions
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuid } from 'uuid';

// ============================================
// Types
// ============================================

export interface UserMemory {
  userId: string;
  tenantId: string;
  
  // User preferences
  preferences: UserPreferences;
  
  // Learned facts about the user
  facts: MemoryFact[];
  
  // Interaction patterns
  patterns: InteractionPattern[];
  
  // Recent context
  recentTopics: string[];
  recentShards: string[];
  
  // Statistics
  stats: UserStats;
  
  updatedAt: Date;
}

export interface UserPreferences {
  // Response preferences
  responseLength: 'brief' | 'standard' | 'detailed';
  responseStyle: 'formal' | 'casual' | 'technical';
  includeExamples: boolean;
  includeVisuals: boolean;
  
  // Focus areas
  primaryFocusAreas: string[];
  excludeTopics: string[];
  
  // Formatting
  preferredFormat: 'text' | 'markdown' | 'bullet_list';
  language: string;
  timezone: string;
  
  // AI behavior
  proactiveInsights: boolean;
  dailyBriefing: boolean;
  followUpSuggestions: boolean;
}

export interface MemoryFact {
  id: string;
  category: FactCategory;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: 'explicit' | 'inferred' | 'system';
  createdAt: Date;
  expiresAt?: Date;
  usageCount: number;
}

export type FactCategory =
  | 'role'           // User's role/job function
  | 'expertise'      // User's areas of expertise
  | 'interest'       // Topics user is interested in
  | 'responsibility' // User's responsibilities
  | 'preference'     // User's stated preferences
  | 'relationship'   // User's relationships with entities
  | 'context'        // Contextual information
  | 'custom';

export interface InteractionPattern {
  pattern: string;
  frequency: number;
  lastOccurred: Date;
  confidence: number;
}

export interface UserStats {
  totalQueries: number;
  averageQueryLength: number;
  mostUsedFeatures: string[];
  peakActivityHours: number[];
  preferredModels: string[];
  averageSatisfaction: number;
}

export interface EntityMemory {
  entityId: string;     // Shard ID
  tenantId: string;
  entityType: string;   // Shard type
  entityName: string;
  
  // Facts about the entity
  facts: EntityFact[];
  
  // Relationships
  relationships: EntityRelationship[];
  
  // Context history
  mentionHistory: EntityMention[];
  
  // Summary (AI-generated)
  summary?: string;
  summaryGeneratedAt?: Date;
  
  updatedAt: Date;
}

export interface EntityFact {
  id: string;
  key: string;
  value: string;
  source: 'data' | 'inferred' | 'user_stated';
  confidence: number;
  createdAt: Date;
}

export interface EntityRelationship {
  relatedEntityId: string;
  relatedEntityName: string;
  relationshipType: string;
  strength: number;
  bidirectional: boolean;
}

export interface EntityMention {
  conversationId: string;
  messageId: string;
  timestamp: Date;
  context: string;
}

export interface ConversationMemory {
  conversationId: string;
  tenantId: string;
  userId: string;
  
  // Summary
  summary: string;
  
  // Key points discussed
  keyPoints: string[];
  
  // Entities mentioned
  entitiesMentioned: string[];
  
  // Decisions/conclusions
  decisions: string[];
  
  // Follow-up items
  followUps: string[];
  
  // Mood/sentiment
  sentiment: 'positive' | 'neutral' | 'negative';
  
  createdAt: Date;
}

// ============================================
// Service
// ============================================

export class MemoryContextService {
  private readonly USER_MEMORY_KEY = 'memory:user:';
  private readonly ENTITY_MEMORY_KEY = 'memory:entity:';
  private readonly CONVERSATION_MEMORY_KEY = 'memory:conversation:';
  
  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider
  ) {}

  // ============================================
  // User Memory
  // ============================================

  /**
   * Get or create user memory
   */
  async getUserMemory(userId: string, tenantId: string): Promise<UserMemory> {
    const key = `${this.USER_MEMORY_KEY}${tenantId}:${userId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }

    // Create default memory
    const memory: UserMemory = {
      userId,
      tenantId,
      preferences: this.getDefaultPreferences(),
      facts: [],
      patterns: [],
      recentTopics: [],
      recentShards: [],
      stats: {
        totalQueries: 0,
        averageQueryLength: 0,
        mostUsedFeatures: [],
        peakActivityHours: [],
        preferredModels: [],
        averageSatisfaction: 0,
      },
      updatedAt: new Date(),
    };

    await this.saveUserMemory(memory);
    return memory;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserMemory> {
    const memory = await this.getUserMemory(userId, tenantId);
    
    memory.preferences = {
      ...memory.preferences,
      ...preferences,
    };
    memory.updatedAt = new Date();

    await this.saveUserMemory(memory);
    return memory;
  }

  /**
   * Add a fact about the user
   */
  async addUserFact(
    userId: string,
    tenantId: string,
    fact: Omit<MemoryFact, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<MemoryFact> {
    const memory = await this.getUserMemory(userId, tenantId);
    
    const newFact: MemoryFact = {
      ...fact,
      id: `fact_${uuid()}`,
      createdAt: new Date(),
      usageCount: 0,
    };

    // Check for duplicate/conflicting facts
    const existingIndex = memory.facts.findIndex(
      f => f.subject === fact.subject && f.predicate === fact.predicate
    );

    if (existingIndex >= 0) {
      // Update existing fact if new one has higher confidence
      if (fact.confidence > memory.facts[existingIndex].confidence) {
        memory.facts[existingIndex] = newFact;
      }
    } else {
      memory.facts.push(newFact);
    }

    // Keep only most relevant facts (max 100)
    if (memory.facts.length > 100) {
      memory.facts = memory.facts
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 100);
    }

    memory.updatedAt = new Date();
    await this.saveUserMemory(memory);

    this.monitoring.trackEvent('memory.fact-added', {
      tenantId,
      userId,
      category: fact.category,
    });

    return newFact;
  }

  /**
   * Record user interaction
   */
  async recordInteraction(
    userId: string,
    tenantId: string,
    query: string,
    shardIds: string[],
    topics: string[]
  ): Promise<void> {
    const memory = await this.getUserMemory(userId, tenantId);

    // Update recent topics
    memory.recentTopics = [...new Set([...topics, ...memory.recentTopics])].slice(0, 20);

    // Update recent shards
    memory.recentShards = [...new Set([...shardIds, ...memory.recentShards])].slice(0, 50);

    // Update stats
    memory.stats.totalQueries++;
    memory.stats.averageQueryLength = (
      (memory.stats.averageQueryLength * (memory.stats.totalQueries - 1) + query.length) /
      memory.stats.totalQueries
    );

    // Track peak hours
    const hour = new Date().getHours();
    if (!memory.stats.peakActivityHours.includes(hour)) {
      memory.stats.peakActivityHours.push(hour);
      memory.stats.peakActivityHours = memory.stats.peakActivityHours.slice(-10);
    }

    // Detect patterns
    await this.detectPatterns(memory, query, topics);

    memory.updatedAt = new Date();
    await this.saveUserMemory(memory);
  }

  /**
   * Get relevant context for a query
   */
  async getRelevantContext(
    userId: string,
    tenantId: string,
    query: string
  ): Promise<{
    preferences: UserPreferences;
    relevantFacts: MemoryFact[];
    recentContext: { topics: string[]; shards: string[] };
    patterns: InteractionPattern[];
  }> {
    const memory = await this.getUserMemory(userId, tenantId);
    const queryLower = query.toLowerCase();

    // Find relevant facts
    const relevantFacts = memory.facts
      .filter(fact => {
        const factText = `${fact.subject} ${fact.predicate} ${fact.object}`.toLowerCase();
        return factText.includes(queryLower) || 
               queryLower.includes(fact.subject.toLowerCase()) ||
               fact.category === 'preference';
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Update usage counts for used facts
    for (const fact of relevantFacts) {
      const factIndex = memory.facts.findIndex(f => f.id === fact.id);
      if (factIndex >= 0) {
        memory.facts[factIndex].usageCount++;
      }
    }
    await this.saveUserMemory(memory);

    return {
      preferences: memory.preferences,
      relevantFacts,
      recentContext: {
        topics: memory.recentTopics.slice(0, 5),
        shards: memory.recentShards.slice(0, 10),
      },
      patterns: memory.patterns.slice(0, 5),
    };
  }

  // ============================================
  // Entity Memory
  // ============================================

  /**
   * Get or create entity memory
   */
  async getEntityMemory(
    entityId: string,
    tenantId: string
  ): Promise<EntityMemory | null> {
    const key = `${this.ENTITY_MEMORY_KEY}${tenantId}:${entityId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update entity memory
   */
  async updateEntityMemory(
    entityId: string,
    tenantId: string,
    entityType: string,
    entityName: string,
    updates: {
      facts?: EntityFact[];
      relationships?: EntityRelationship[];
      summary?: string;
    }
  ): Promise<EntityMemory> {
    let memory = await this.getEntityMemory(entityId, tenantId);

    if (!memory) {
      memory = {
        entityId,
        tenantId,
        entityType,
        entityName,
        facts: [],
        relationships: [],
        mentionHistory: [],
        updatedAt: new Date(),
      };
    }

    if (updates.facts) {
      memory.facts = [...memory.facts, ...updates.facts];
    }

    if (updates.relationships) {
      // Merge relationships, avoiding duplicates
      for (const rel of updates.relationships) {
        const existing = memory.relationships.find(
          r => r.relatedEntityId === rel.relatedEntityId && r.relationshipType === rel.relationshipType
        );
        if (!existing) {
          memory.relationships.push(rel);
        }
      }
    }

    if (updates.summary) {
      memory.summary = updates.summary;
      memory.summaryGeneratedAt = new Date();
    }

    memory.updatedAt = new Date();
    await this.saveEntityMemory(memory);

    return memory;
  }

  /**
   * Record entity mention in conversation
   */
  async recordEntityMention(
    entityId: string,
    tenantId: string,
    conversationId: string,
    messageId: string,
    context: string
  ): Promise<void> {
    const memory = await this.getEntityMemory(entityId, tenantId);
    if (!memory) {return;}

    memory.mentionHistory.push({
      conversationId,
      messageId,
      timestamp: new Date(),
      context: context.slice(0, 200),
    });

    // Keep only recent mentions
    memory.mentionHistory = memory.mentionHistory.slice(-50);
    memory.updatedAt = new Date();

    await this.saveEntityMemory(memory);
  }

  // ============================================
  // Conversation Memory
  // ============================================

  /**
   * Store conversation summary
   */
  async storeConversationMemory(
    memory: Omit<ConversationMemory, 'createdAt'>
  ): Promise<ConversationMemory> {
    const fullMemory: ConversationMemory = {
      ...memory,
      createdAt: new Date(),
    };

    const key = `${this.CONVERSATION_MEMORY_KEY}${memory.tenantId}:${memory.conversationId}`;
    await this.redis.setex(key, 90 * 24 * 60 * 60, JSON.stringify(fullMemory)); // 90 days

    return fullMemory;
  }

  /**
   * Get conversation memory
   */
  async getConversationMemory(
    conversationId: string,
    tenantId: string
  ): Promise<ConversationMemory | null> {
    const key = `${this.CONVERSATION_MEMORY_KEY}${tenantId}:${conversationId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get user's recent conversation memories
   */
  async getRecentConversations(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<ConversationMemory[]> {
    const pattern = `${this.CONVERSATION_MEMORY_KEY}${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    const memories: ConversationMemory[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const memory = JSON.parse(data) as ConversationMemory;
        if (memory.userId === userId) {
          memories.push(memory);
        }
      }
    }

    return memories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // ============================================
  // Token Estimation Helpers
  // ============================================

  /**
   * Estimate token count for a message or text
   * Uses rough estimate: ~4 characters per token
   */
  estimateTokens(data: unknown): number {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return Math.ceil(str.length / 4);
  }

  /**
   * Estimate total tokens for an array of messages
   */
  estimateMessageTokens(messages: Array<{ content: string; role?: string }>): number {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content);
    }, 0);
  }

  // ============================================
  // Pattern Detection
  // ============================================

  private async detectPatterns(
    memory: UserMemory,
    query: string,
    _topics: string[]
  ): Promise<void> {
    // Simple pattern detection - would use ML in production
    const queryPatterns = this.extractQueryPatterns(query);

    for (const pattern of queryPatterns) {
      const existing = memory.patterns.find(p => p.pattern === pattern);
      if (existing) {
        existing.frequency++;
        existing.lastOccurred = new Date();
        existing.confidence = Math.min(1, existing.frequency / 10);
      } else {
        memory.patterns.push({
          pattern,
          frequency: 1,
          lastOccurred: new Date(),
          confidence: 0.1,
        });
      }
    }

    // Keep top patterns
    memory.patterns = memory.patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  private extractQueryPatterns(query: string): string[] {
    const patterns: string[] = [];
    const lower = query.toLowerCase();

    // Question type patterns
    if (lower.startsWith('what')) {patterns.push('what_questions');}
    if (lower.startsWith('how')) {patterns.push('how_questions');}
    if (lower.startsWith('why')) {patterns.push('why_questions');}
    if (lower.includes('compare')) {patterns.push('comparison_requests');}
    if (lower.includes('summary') || lower.includes('summarize')) {patterns.push('summary_requests');}
    if (lower.includes('recommend') || lower.includes('suggest')) {patterns.push('recommendation_requests');}
    if (lower.includes('analyze') || lower.includes('analysis')) {patterns.push('analysis_requests');}

    return patterns;
  }

  // ============================================
  // Helpers
  // ============================================

  private getDefaultPreferences(): UserPreferences {
    return {
      responseLength: 'standard',
      responseStyle: 'casual',
      includeExamples: true,
      includeVisuals: false,
      primaryFocusAreas: [],
      excludeTopics: [],
      preferredFormat: 'markdown',
      language: 'en',
      timezone: 'UTC',
      proactiveInsights: true,
      dailyBriefing: false,
      followUpSuggestions: true,
    };
  }

  private async saveUserMemory(memory: UserMemory): Promise<void> {
    const key = `${this.USER_MEMORY_KEY}${memory.tenantId}:${memory.userId}`;
    await this.redis.set(key, JSON.stringify(memory));
  }

  private async saveEntityMemory(memory: EntityMemory): Promise<void> {
    const key = `${this.ENTITY_MEMORY_KEY}${memory.tenantId}:${memory.entityId}`;
    await this.redis.set(key, JSON.stringify(memory));
  }

  /**
   * Remove a specific fact (forget)
   */
  async removeUserFact(
    userId: string,
    tenantId: string,
    factId: string
  ): Promise<boolean> {
    const memory = await this.getUserMemory(userId, tenantId);
    const initialLength = memory.facts.length;
    
    memory.facts = memory.facts.filter(f => f.id !== factId);
    
    if (memory.facts.length < initialLength) {
      memory.updatedAt = new Date();
      await this.saveUserMemory(memory);
      
      this.monitoring.trackEvent('memory.fact-removed', {
        tenantId,
        userId,
        factId,
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Search user memory
   */
  async searchUserMemory(
    userId: string,
    tenantId: string,
    query: string,
    options?: {
      category?: string;
      limit?: number;
    }
  ): Promise<MemoryFact[]> {
    const memory = await this.getUserMemory(userId, tenantId);
    const queryLower = query.toLowerCase();
    const limit = options?.limit || 20;
    
    let results = memory.facts.filter(fact => {
      // Filter by category if specified
      if (options?.category && fact.category !== options.category) {
        return false;
      }
      
      // Search in subject, predicate, and object
      const factText = `${fact.subject} ${fact.predicate} ${fact.object}`.toLowerCase();
      return factText.includes(queryLower);
    });
    
    // Sort by relevance (confidence and usage count)
    results = results.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + Math.min(a.usageCount / 10, 1) * 0.3;
      const scoreB = b.confidence * 0.7 + Math.min(b.usageCount / 10, 1) * 0.3;
      return scoreB - scoreA;
    });
    
    return results.slice(0, limit);
  }

  /**
   * Remember explicit information (explicit memory management)
   * Extracts structured information from natural language
   */
  async remember(
    userId: string,
    tenantId: string,
    information: string,
    options?: {
      subject?: string;
      category?: string;
      confidence?: number;
    }
  ): Promise<MemoryFact> {
    // Parse information into structured fact
    // For now, simple parsing - could be enhanced with AI
    const subject = options?.subject || 'user';
    const category = options?.category || 'general';
    const confidence = options?.confidence || 0.9; // High confidence for explicit remember
    
    // Try to extract predicate and object from information
    // Simple pattern: "I like X" -> predicate: "likes", object: "X"
    // "My name is X" -> predicate: "name", object: "X"
    let predicate = 'has';
    let object = information;
    
    const patterns = [
      { pattern: /my name is (.+)/i, predicate: 'name', extract: (m: RegExpMatchArray) => m[1] },
      { pattern: /i like (.+)/i, predicate: 'likes', extract: (m: RegExpMatchArray) => m[1] },
      { pattern: /i work (?:at|for) (.+)/i, predicate: 'works_at', extract: (m: RegExpMatchArray) => m[1] },
      { pattern: /i am (.+)/i, predicate: 'is', extract: (m: RegExpMatchArray) => m[1] },
      { pattern: /i have (.+)/i, predicate: 'has', extract: (m: RegExpMatchArray) => m[1] },
    ];
    
    for (const { pattern, predicate: p, extract } of patterns) {
      const match = information.match(pattern);
      if (match) {
        predicate = p;
        object = extract(match);
        break;
      }
    }
    
    const fact = await this.addUserFact(userId, tenantId, {
      subject,
      predicate,
      object: object.trim(),
      category: category as any,
      confidence,
      source: 'explicit',
    });
    
    this.monitoring.trackEvent('memory.remember', {
      tenantId,
      userId,
      factId: fact.id,
    });
    
    return fact;
  }

  /**
   * Forget specific information (explicit memory management)
   */
  async forget(
    userId: string,
    tenantId: string,
    query: string
  ): Promise<{ removed: number; facts: MemoryFact[] }> {
    // Search for matching facts
    const matchingFacts = await this.searchUserMemory(userId, tenantId, query, { limit: 100 });
    
    // Remove all matching facts
    let removed = 0;
    for (const fact of matchingFacts) {
      const success = await this.removeUserFact(userId, tenantId, fact.id);
      if (success) {
        removed++;
      }
    }
    
    this.monitoring.trackEvent('memory.forget', {
      tenantId,
      userId,
      query,
      removed,
    });
    
    return {
      removed,
      facts: matchingFacts,
    };
  }

  /**
   * List all user facts (for memory management UI)
   */
  async listUserFacts(
    userId: string,
    tenantId: string,
    options?: {
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    facts: MemoryFact[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const memory = await this.getUserMemory(userId, tenantId);
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    let facts = memory.facts;
    
    // Filter by category if specified
    if (options?.category) {
      facts = facts.filter(f => f.category === options.category);
    }
    
    // Sort by confidence and usage
    facts = facts.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + Math.min(a.usageCount / 10, 1) * 0.3;
      const scoreB = b.confidence * 0.7 + Math.min(b.usageCount / 10, 1) * 0.3;
      return scoreB - scoreA;
    });
    
    const total = facts.length;
    const paginatedFacts = facts.slice(offset, offset + limit);
    
    return {
      facts: paginatedFacts,
      total,
      limit,
      offset,
    };
  }

  /**
   * Clear user memory (for privacy/GDPR)
   */
  async clearUserMemory(userId: string, tenantId: string): Promise<void> {
    const key = `${this.USER_MEMORY_KEY}${tenantId}:${userId}`;
    await this.redis.del(key);

    this.monitoring.trackEvent('memory.cleared', { tenantId, userId });
  }
}

// ============================================
// Factory
// ============================================

export function createMemoryContextService(
  redis: Redis,
  monitoring: IMonitoringProvider
): MemoryContextService {
  return new MemoryContextService(redis, monitoring);
}












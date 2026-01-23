/**
 * Memory & Long-Term Context Service
 * Stores and retrieves user preferences, entity facts, and conversation history
 * for personalized AI interactions
 */
import { v4 as uuid } from 'uuid';
// ============================================
// Service
// ============================================
export class MemoryContextService {
    redis;
    monitoring;
    USER_MEMORY_KEY = 'memory:user:';
    ENTITY_MEMORY_KEY = 'memory:entity:';
    CONVERSATION_MEMORY_KEY = 'memory:conversation:';
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // User Memory
    // ============================================
    /**
     * Get or create user memory
     */
    async getUserMemory(userId, tenantId) {
        const key = `${this.USER_MEMORY_KEY}${tenantId}:${userId}`;
        const data = await this.redis.get(key);
        if (data) {
            return JSON.parse(data);
        }
        // Create default memory
        const memory = {
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
    async updateUserPreferences(userId, tenantId, preferences) {
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
    async addUserFact(userId, tenantId, fact) {
        const memory = await this.getUserMemory(userId, tenantId);
        const newFact = {
            ...fact,
            id: `fact_${uuid()}`,
            createdAt: new Date(),
            usageCount: 0,
        };
        // Check for duplicate/conflicting facts
        const existingIndex = memory.facts.findIndex(f => f.subject === fact.subject && f.predicate === fact.predicate);
        if (existingIndex >= 0) {
            // Update existing fact if new one has higher confidence
            if (fact.confidence > memory.facts[existingIndex].confidence) {
                memory.facts[existingIndex] = newFact;
            }
        }
        else {
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
    async recordInteraction(userId, tenantId, query, shardIds, topics) {
        const memory = await this.getUserMemory(userId, tenantId);
        // Update recent topics
        memory.recentTopics = [...new Set([...topics, ...memory.recentTopics])].slice(0, 20);
        // Update recent shards
        memory.recentShards = [...new Set([...shardIds, ...memory.recentShards])].slice(0, 50);
        // Update stats
        memory.stats.totalQueries++;
        memory.stats.averageQueryLength = ((memory.stats.averageQueryLength * (memory.stats.totalQueries - 1) + query.length) /
            memory.stats.totalQueries);
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
    async getRelevantContext(userId, tenantId, query) {
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
    async getEntityMemory(entityId, tenantId) {
        const key = `${this.ENTITY_MEMORY_KEY}${tenantId}:${entityId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Update entity memory
     */
    async updateEntityMemory(entityId, tenantId, entityType, entityName, updates) {
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
                const existing = memory.relationships.find(r => r.relatedEntityId === rel.relatedEntityId && r.relationshipType === rel.relationshipType);
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
    async recordEntityMention(entityId, tenantId, conversationId, messageId, context) {
        const memory = await this.getEntityMemory(entityId, tenantId);
        if (!memory) {
            return;
        }
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
    async storeConversationMemory(memory) {
        const fullMemory = {
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
    async getConversationMemory(conversationId, tenantId) {
        const key = `${this.CONVERSATION_MEMORY_KEY}${tenantId}:${conversationId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Get user's recent conversation memories
     */
    async getRecentConversations(userId, tenantId, limit = 10) {
        const pattern = `${this.CONVERSATION_MEMORY_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        const memories = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const memory = JSON.parse(data);
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
    estimateTokens(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return Math.ceil(str.length / 4);
    }
    /**
     * Estimate total tokens for an array of messages
     */
    estimateMessageTokens(messages) {
        return messages.reduce((total, msg) => {
            return total + this.estimateTokens(msg.content);
        }, 0);
    }
    // ============================================
    // Pattern Detection
    // ============================================
    async detectPatterns(memory, query, _topics) {
        // Simple pattern detection - would use ML in production
        const queryPatterns = this.extractQueryPatterns(query);
        for (const pattern of queryPatterns) {
            const existing = memory.patterns.find(p => p.pattern === pattern);
            if (existing) {
                existing.frequency++;
                existing.lastOccurred = new Date();
                existing.confidence = Math.min(1, existing.frequency / 10);
            }
            else {
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
    extractQueryPatterns(query) {
        const patterns = [];
        const lower = query.toLowerCase();
        // Question type patterns
        if (lower.startsWith('what')) {
            patterns.push('what_questions');
        }
        if (lower.startsWith('how')) {
            patterns.push('how_questions');
        }
        if (lower.startsWith('why')) {
            patterns.push('why_questions');
        }
        if (lower.includes('compare')) {
            patterns.push('comparison_requests');
        }
        if (lower.includes('summary') || lower.includes('summarize')) {
            patterns.push('summary_requests');
        }
        if (lower.includes('recommend') || lower.includes('suggest')) {
            patterns.push('recommendation_requests');
        }
        if (lower.includes('analyze') || lower.includes('analysis')) {
            patterns.push('analysis_requests');
        }
        return patterns;
    }
    // ============================================
    // Helpers
    // ============================================
    getDefaultPreferences() {
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
    async saveUserMemory(memory) {
        const key = `${this.USER_MEMORY_KEY}${memory.tenantId}:${memory.userId}`;
        await this.redis.set(key, JSON.stringify(memory));
    }
    async saveEntityMemory(memory) {
        const key = `${this.ENTITY_MEMORY_KEY}${memory.tenantId}:${memory.entityId}`;
        await this.redis.set(key, JSON.stringify(memory));
    }
    /**
     * Remove a specific fact (forget)
     */
    async removeUserFact(userId, tenantId, factId) {
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
    async searchUserMemory(userId, tenantId, query, options) {
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
    async remember(userId, tenantId, information, options) {
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
            { pattern: /my name is (.+)/i, predicate: 'name', extract: (m) => m[1] },
            { pattern: /i like (.+)/i, predicate: 'likes', extract: (m) => m[1] },
            { pattern: /i work (?:at|for) (.+)/i, predicate: 'works_at', extract: (m) => m[1] },
            { pattern: /i am (.+)/i, predicate: 'is', extract: (m) => m[1] },
            { pattern: /i have (.+)/i, predicate: 'has', extract: (m) => m[1] },
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
            category: category,
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
    async forget(userId, tenantId, query) {
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
    async listUserFacts(userId, tenantId, options) {
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
    async clearUserMemory(userId, tenantId) {
        const key = `${this.USER_MEMORY_KEY}${tenantId}:${userId}`;
        await this.redis.del(key);
        this.monitoring.trackEvent('memory.cleared', { tenantId, userId });
    }
}
// ============================================
// Factory
// ============================================
export function createMemoryContextService(redis, monitoring) {
    return new MemoryContextService(redis, monitoring);
}
//# sourceMappingURL=memory-context.service.js.map
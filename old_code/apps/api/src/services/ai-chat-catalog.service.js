/**
 * AI Chat Catalog Service
 * Manages project chat question templates and tenant configurations
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, Logger } from '@nestjs/common';
const CACHE_TTL = 3600; // 1 hour
let AIChatCatalogService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AIChatCatalogService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AIChatCatalogService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cosmosDb;
        cache;
        logger = new Logger(AIChatCatalogService.name);
        constructor(cosmosDb, cache) {
            this.cosmosDb = cosmosDb;
            this.cache = cache;
        }
        /**
         * Create a new chat question (super admin only)
         */
        async createQuestion(input, createdBy) {
            const now = new Date();
            const question = {
                id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                question: input.question,
                description: input.description,
                category: input.category,
                estimatedTokens: input.estimatedTokens,
                isActive: input.isActive,
                tags: input.tags || [],
                createdAt: now,
                createdBy,
                updatedAt: now,
                updatedBy: createdBy,
                version: 1,
            };
            try {
                const container = this.cosmosDb.getContainer('ai-chat-catalog');
                await container.items.create(question);
                // Invalidate catalog cache
                await this.cache.delete('ai-catalog:all-questions');
                this.logger.log(`Created chat question ${question.id}`);
                return question;
            }
            catch (error) {
                this.logger.error('Failed to create chat question', error);
                throw error;
            }
        }
        /**
         * Update a chat question
         */
        async updateQuestion(questionId, input, updatedBy) {
            try {
                const container = this.cosmosDb.getContainer('ai-chat-catalog');
                const { resource: current } = await container.item(questionId).read();
                if (!current) {
                    throw new Error(`Question ${questionId} not found`);
                }
                const updated = {
                    ...current,
                    ...input,
                    version: current.version + 1,
                    updatedAt: new Date(),
                    updatedBy,
                    id: current.id,
                    createdAt: current.createdAt,
                    createdBy: current.createdBy,
                };
                await container.item(questionId).replace(updated);
                // Invalidate caches
                await this.cache.delete('ai-catalog:all-questions');
                this.logger.log(`Updated chat question ${questionId}`);
                return updated;
            }
            catch (error) {
                this.logger.error(`Failed to update chat question ${questionId}`, error);
                throw error;
            }
        }
        /**
         * Get all active questions
         */
        async getAllQuestions() {
            // Try cache
            const cached = await this.cache.get('ai-catalog:all-questions');
            if (cached) {
                return cached;
            }
            try {
                const container = this.cosmosDb.getContainer('ai-chat-catalog');
                const { resources } = await container.items
                    .query({
                    query: `SELECT * FROM c WHERE c.isActive = true AND NOT IS_DEFINED(c.deprecated) ORDER BY c.category, c.question`,
                })
                    .fetchAll();
                const questions = resources;
                await this.cache.set('ai-catalog:all-questions', questions, CACHE_TTL);
                return questions;
            }
            catch (error) {
                this.logger.error('Failed to get all questions', error);
                return [];
            }
        }
        /**
         * Get questions by category
         */
        async getQuestionsByCategory(category) {
            const all = await this.getAllQuestions();
            return all.filter((q) => q.category === category);
        }
        /**
         * Delete a question (soft delete by marking deprecated)
         */
        async deleteQuestion(questionId, updatedBy) {
            await this.updateQuestion(questionId, {
                deprecated: true,
                isActive: false,
            }, updatedBy);
        }
        /**
         * Get tenant chat catalog configuration
         */
        async getTenantCatalogConfig(tenantId) {
            // Try cache
            const cacheKey = `tenant-chat-config:${tenantId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            try {
                const container = this.cosmosDb.getContainer('tenant-configs');
                const { resources } = await container.items
                    .query({
                    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.configType = @type',
                    parameters: [
                        { name: '@tenantId', value: tenantId },
                        { name: '@type', value: 'chat-catalog-config' },
                    ],
                })
                    .fetchAll();
                if (resources.length > 0) {
                    const config = resources[0];
                    await this.cache.set(cacheKey, config, CACHE_TTL);
                    return config;
                }
                // Return default
                return this.getDefaultTenantCatalogConfig(tenantId);
            }
            catch (error) {
                this.logger.error(`Failed to get tenant chat config for ${tenantId}`, error);
                return this.getDefaultTenantCatalogConfig(tenantId);
            }
        }
        /**
         * Update tenant catalog configuration
         */
        async updateTenantCatalogConfig(tenantId, input, updatedBy) {
            const current = await this.getTenantCatalogConfig(tenantId);
            const updated = {
                ...current,
                ...input,
                updatedAt: new Date(),
                updatedBy,
            };
            try {
                const container = this.cosmosDb.getContainer('tenant-configs');
                await container.items.upsert({
                    id: `${tenantId}-chat-catalog-config`,
                    tenantId,
                    configType: 'chat-catalog-config',
                    ...updated,
                });
                await this.cache.delete(`tenant-chat-config:${tenantId}`);
                this.logger.log(`Updated tenant chat config for ${tenantId}`);
                return updated;
            }
            catch (error) {
                this.logger.error(`Failed to update tenant chat config for ${tenantId}`, error);
                throw error;
            }
        }
        /**
         * Get enabled questions for a tenant
         */
        async getTenantEnabledQuestions(tenantId) {
            const config = await this.getTenantCatalogConfig(tenantId);
            const allQuestions = await this.getAllQuestions();
            // Filter to enabled questions + custom questions
            const enabled = allQuestions.filter((q) => config.enabledQuestionIds.includes(q.id));
            return [...enabled, ...config.customQuestions];
        }
        /**
         * Create custom question for tenant
         */
        async createCustomQuestion(tenantId, input, createdBy) {
            const config = await this.getTenantCatalogConfig(tenantId);
            if (config.customQuestions.length >= config.maxCustomQuestions) {
                throw new Error(`Tenant custom question limit (${config.maxCustomQuestions}) reached`);
            }
            const now = new Date();
            const question = {
                id: `custom-${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                question: input.question,
                description: input.description,
                category: input.category,
                estimatedTokens: input.estimatedTokens,
                isActive: input.isActive,
                tags: input.tags || [],
                createdAt: now,
                createdBy,
                updatedAt: now,
                updatedBy: createdBy,
                version: 1,
            };
            config.customQuestions.push(question);
            config.updatedAt = now;
            config.updatedBy = createdBy;
            try {
                const container = this.cosmosDb.getContainer('tenant-configs');
                await container.items.upsert({
                    id: `${tenantId}-chat-catalog-config`,
                    tenantId,
                    configType: 'chat-catalog-config',
                    ...config,
                });
                await this.cache.delete(`tenant-chat-config:${tenantId}`);
                this.logger.log(`Created custom question for tenant ${tenantId}`);
                return question;
            }
            catch (error) {
                this.logger.error(`Failed to create custom question for tenant ${tenantId}`, error);
                throw error;
            }
        }
        /**
         * Get default tenant catalog configuration
         */
        getDefaultTenantCatalogConfig(tenantId) {
            return {
                tenantId,
                enabledQuestionIds: [], // Will be populated with default questions
                enabledCategories: ['status', 'risks', 'timeline', 'resources'],
                customQuestions: [],
                maxCustomQuestions: 20,
                selectionMode: 'auto',
                updatedAt: new Date(),
                updatedBy: 'system',
            };
        }
    };
    return AIChatCatalogService = _classThis;
})();
export { AIChatCatalogService };
//# sourceMappingURL=ai-chat-catalog.service.js.map
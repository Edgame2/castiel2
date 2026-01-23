// @ts-nocheck
import {
  AIRecommendationRequest,
  AIRecommendationResponse,
  RecommendationType,
  IRecommendationHandler,
  RateLimitState,
  RateLimitConfig,
  CostTrackingEntry,
} from '@castiel/shared-types';
import { AzureOpenAIService } from '../azure-openai.service.js';
import { PromptResolverService } from './prompt-resolver.service.js';
import { PromptRendererService } from './prompt-renderer.service.js';
import { MonitoringService } from '@castiel/monitoring';
import { SchemaRecommendationHandler } from './recommendation-handlers/schema-handler.js';
import { EmbeddingTemplateRecommendationHandler } from './recommendation-handlers/embedding-template-handler.js';

/**
 * Unified AI Recommendation Service
 * 
 * Orchestrates all recommendation types using specialized handlers.
 * Provides rate limiting, cost tracking, and unified interface.
 */
export class AIRecommendationService {
  private handlers: Map<RecommendationType, IRecommendationHandler>;
  private rateLimitStates: Map<string, RateLimitState>;
  private costTracking: CostTrackingEntry[];
  private rateLimitConfig: RateLimitConfig;

  constructor(
    private azureOpenAI: AzureOpenAIService,
    private promptResolver: PromptResolverService,
    private promptRenderer: PromptRendererService,
    private monitoring: MonitoringService
  ) {
    this.handlers = new Map();
    this.rateLimitStates = new Map();
    this.costTracking = [];

    // Default rate limit configuration
    this.rateLimitConfig = {
      perUser: {
        maxRequests: 20,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
      perTenant: {
        maxRequests: 100,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
      costTracking: {
        budgetPerTenant: 100, // $100/month
        alertThreshold: 80, // Alert at 80%
      },
    };

    // Register handlers
    this.registerHandlers();
  }

  /**
   * Register all recommendation handlers
   */
  private registerHandlers(): void {
    const schemaHandler = new SchemaRecommendationHandler(
      this.azureOpenAI,
      this.promptResolver,
      this.promptRenderer,
      this.monitoring
    );

    const embeddingTemplateHandler = new EmbeddingTemplateRecommendationHandler(
      this.azureOpenAI,
      this.promptResolver,
      this.promptRenderer,
      this.monitoring
    );

    this.handlers.set(schemaHandler.type, schemaHandler);
    this.handlers.set(embeddingTemplateHandler.type, embeddingTemplateHandler);

    // TODO: Register additional handlers as they are implemented
    // this.handlers.set('uiSchemaRecommendation', new UISchemaRecommendationHandler(...));
    // this.handlers.set('computedFieldRecommendation', new ComputedFieldRecommendationHandler(...));
    // etc.
  }

  /**
   * Generate a recommendation
   */
  async generate(request: AIRecommendationRequest): Promise<AIRecommendationResponse> {
    const { type, context, options } = request;

    // 1. Check rate limits
    await this.checkRateLimits(context.tenantId, context.userId);

    // 2. Get handler for this type
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for recommendation type: ${type}`);
    }

    // 3. Generate recommendation
    const response = await handler.generate(context, options);

    // 4. Track cost
    this.trackCost({
      tenantId: context.tenantId,
      userId: context.userId,
      recommendationType: type,
      tokens: response.metadata.tokens,
      estimatedCost: this.estimateCost(response.metadata.tokens.total),
      timestamp: new Date(),
    });

    // 5. Check budget alerts
    await this.checkBudgetAlerts(context.tenantId);

    return response;
  }

  /**
   * Check if a recommendation should auto-apply
   */
  shouldAutoApply(response: AIRecommendationResponse, optionIndex: number = 0): boolean {
    const handler = this.handlers.get(response.type);
    if (!handler) {
      return false;
    }

    const option = response.options[optionIndex];
    if (!option) {
      return false;
    }

    // Extract context from metadata (limited info available)
    const context = {
      tenantId: '', // These would need to be passed separately or stored in response
      userId: '',
      userPreferences: {},
    };

    return handler.shouldAutoApply(option, context as any);
  }

  /**
   * Get list of supported recommendation types
   */
  getSupportedTypes(): RecommendationType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a recommendation type is supported
   */
  isSupported(type: RecommendationType): boolean {
    return this.handlers.has(type);
  }

  /**
   * Configure rate limits
   */
  configureRateLimits(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = {
      ...this.rateLimitConfig,
      ...config,
    };
  }

  /**
   * Get rate limit status for user
   */
  getRateLimitStatus(tenantId: string, userId?: string): RateLimitState {
    const key = userId ? `user:${userId}` : `tenant:${tenantId}`;
    const state = this.rateLimitStates.get(key);

    if (!state) {
      return {
        tenantId,
        userId,
        requests: 0,
        resetAt: new Date(Date.now() + this.rateLimitConfig.perUser.windowMs),
        exceeded: false,
      };
    }

    return state;
  }

  /**
   * Get cost tracking data for tenant
   */
  getCostTracking(tenantId: string, startDate?: Date, endDate?: Date): CostTrackingEntry[] {
    let entries = this.costTracking.filter((entry) => entry.tenantId === tenantId);

    if (startDate) {
      entries = entries.filter((entry) => entry.timestamp >= startDate);
    }

    if (endDate) {
      entries = entries.filter((entry) => entry.timestamp <= endDate);
    }

    return entries;
  }

  /**
   * Get total cost for tenant in current month
   */
  getMonthlyTotal(tenantId: string): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const entries = this.getCostTracking(tenantId, startOfMonth);
    return entries.reduce((sum, entry) => sum + entry.estimatedCost, 0);
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(tenantId: string, userId: string): Promise<void> {
    // Check user rate limit
    const userKey = `user:${userId}`;
    const userState = this.rateLimitStates.get(userKey);

    if (userState) {
      if (userState.resetAt < new Date()) {
        // Reset window
        this.rateLimitStates.delete(userKey);
      } else if (userState.requests >= this.rateLimitConfig.perUser.maxRequests) {
        throw new Error(
          `Rate limit exceeded for user. Resets at ${userState.resetAt.toISOString()}`
        );
      }
    }

    // Check tenant rate limit
    const tenantKey = `tenant:${tenantId}`;
    const tenantState = this.rateLimitStates.get(tenantKey);

    if (tenantState) {
      if (tenantState.resetAt < new Date()) {
        this.rateLimitStates.delete(tenantKey);
      } else if (tenantState.requests >= this.rateLimitConfig.perTenant.maxRequests) {
        throw new Error(
          `Rate limit exceeded for tenant. Resets at ${tenantState.resetAt.toISOString()}`
        );
      }
    }

    // Increment counters
    this.incrementRateLimit(userKey, tenantId, userId);
    this.incrementRateLimit(tenantKey, tenantId, undefined);
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(key: string, tenantId: string, userId?: string): void {
    const existing = this.rateLimitStates.get(key);
    const isUser = key.startsWith('user:');

    if (existing) {
      existing.requests++;
    } else {
      this.rateLimitStates.set(key, {
        tenantId,
        userId,
        requests: 1,
        resetAt: new Date(
          Date.now() +
            (isUser
              ? this.rateLimitConfig.perUser.windowMs
              : this.rateLimitConfig.perTenant.windowMs)
        ),
        exceeded: false,
      });
    }
  }

  /**
   * Track cost
   */
  private trackCost(entry: CostTrackingEntry): void {
    this.costTracking.push(entry);

    // Prune old entries (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.costTracking = this.costTracking.filter((e) => e.timestamp >= thirtyDaysAgo);
  }

  /**
   * Estimate cost based on token usage
   * Using GPT-4o pricing: $2.50 / 1M input tokens, $10.00 / 1M output tokens
   */
  private estimateCost(totalTokens: number): number {
    // Rough estimate: assume 30% prompt, 70% completion
    const promptTokens = Math.floor(totalTokens * 0.3);
    const completionTokens = Math.floor(totalTokens * 0.7);

    const promptCost = (promptTokens / 1_000_000) * 2.5;
    const completionCost = (completionTokens / 1_000_000) * 10.0;

    return promptCost + completionCost;
  }

  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(tenantId: string): Promise<void> {
    const monthlyTotal = this.getMonthlyTotal(tenantId);
    const budget = this.rateLimitConfig.costTracking.budgetPerTenant;

    if (!budget) {
      return;
    }

    const percentUsed = (monthlyTotal / budget) * 100;
    const threshold = this.rateLimitConfig.costTracking.alertThreshold || 80;

    if (percentUsed >= threshold) {
      this.monitoring.trackEvent('aiRecommendation.budgetAlert', {
        tenantId,
        monthlyTotal,
        budget,
        percentUsed,
        threshold,
      });

      // TODO: Send notification to tenant admin
    }
  }
}

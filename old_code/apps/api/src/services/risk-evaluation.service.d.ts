/**
 * Risk Evaluation Service
 * Core service for evaluating opportunities and detecting risks
 * Combines rule-based, AI-powered, and historical pattern matching
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { RiskCatalogService } from './risk-catalog.service.js';
import { VectorSearchService } from './vector-search.service.js';
import { InsightService } from './insight.service.js';
import { QueueService } from './queue.service.js';
import type { RiskEvaluation, DetectedRisk, HistoricalPattern, RiskCategory } from '../types/risk-analysis.types.js';
import type { Shard } from '../types/shard.types.js';
export declare class RiskEvaluationService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private relationshipService;
    private riskCatalogService;
    private vectorSearchService?;
    private insightService?;
    private serviceBusService?;
    private readonly CACHE_TTL;
    private evaluationCache;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, riskCatalogService: RiskCatalogService, vectorSearchService?: VectorSearchService | undefined, insightService?: InsightService | undefined, serviceBusService?: QueueService | undefined);
    /**
     * Queue risk evaluation for async processing
     */
    queueRiskEvaluation(opportunityId: string, tenantId: string, userId: string, trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual', priority?: 'high' | 'normal' | 'low', options?: {
        includeHistorical?: boolean;
        includeAI?: boolean;
        includeSemanticDiscovery?: boolean;
    }): Promise<void>;
    /**
     * Main evaluation method - evaluates an opportunity for risks
     */
    evaluateOpportunity(opportunityId: string, tenantId: string, userId: string, options?: {
        forceRefresh?: boolean;
        includeHistorical?: boolean;
        includeAI?: boolean;
        includeSemanticDiscovery?: boolean;
    }): Promise<RiskEvaluation>;
    /**
     * Detect risks using rule-based, AI-powered, and historical pattern matching
     */
    private detectRisks;
    /**
     * Rule-based risk detection (fast, deterministic)
     */
    private detectRisksByRules;
    /**
     * Historical pattern-based risk detection
     */
    private detectRisksByHistoricalPatterns;
    /**
     * AI-powered risk detection
     */
    private detectRisksByAI;
    /**
     * Extract risks from natural language text (fallback parser)
     */
    private extractRisksFromText;
    /**
     * Get historical patterns for similar opportunities
     */
    getHistoricalPatterns(opportunity: Shard, tenantId: string, userId?: string): Promise<HistoricalPattern[]>;
    /**
     * Calculate aggregate risk score from detected risks
     * Returns both global score and category scores
     * Public method for use by other services (e.g., SimulationService)
     */
    calculateRiskScore(risks: DetectedRisk[], tenantId: string, opportunity: Shard): Promise<{
        globalScore: number;
        categoryScores: Record<RiskCategory, number>;
    }>;
    /**
     * Calculate risk scores per category
     */
    private calculateCategoryScores;
    /**
     * Calculate revenue at risk (basic calculation)
     */
    private calculateRevenueAtRisk;
    /**
     * Evaluate a condition against data (simplified)
     */
    private evaluateCondition;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Discover risk-relevant shards using vector search
     * Uses risk catalog to build targeted queries and filter shard types
     */
    private discoverRiskRelevantShards;
    /**
     * Build semantic search query from opportunity context AND risk catalog
     * Uses risk catalog entries to build targeted queries
     */
    private buildRiskSearchQuery;
    /**
     * Extract searchable terms from risk catalog
     * Combines risk names, descriptions, and categories into search terms
     */
    private extractRiskTermsFromCatalog;
    /**
     * Check if word is a common stop word
     */
    private isStopWord;
    /**
     * Detect risks by matching semantic search results to catalog risks
     * Uses sophisticated NLP (embedding-based semantic similarity)
     */
    private detectRisksBySemantic;
    /**
     * Match shard content to risk definition using sophisticated NLP
     * Uses semantic similarity via embeddings rather than simple keyword matching
     */
    private matchShardToRiskNLP;
    /**
     * Extract content from shard for semantic matching
     */
    private extractShardContent;
    /**
     * Create risk snapshot for evolution tracking
     * Called on EVERY evaluation (not just significant changes)
     */
    private createRiskSnapshot;
    /**
     * Get risk score evolution over time (global and per category)
     */
    getRiskEvolution(opportunityId: string, tenantId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        includeCategories?: boolean;
    }): Promise<{
        snapshots: Array<{
            id: string;
            snapshotDate: Date;
            riskScore: number;
            categoryScores: Record<RiskCategory, number>;
            revenueAtRisk: number;
            risks: Array<{
                riskId: string;
                riskName: string;
                category: RiskCategory;
                confidence: number;
            }>;
        }>;
        evolution: {
            global: Array<{
                date: Date;
                score: number;
            }>;
            categories: Record<RiskCategory, Array<{
                date: Date;
                score: number;
            }>>;
        };
    }>;
    /**
     * Get current and historical identified risks
     */
    getRisksWithHistory(opportunityId: string, tenantId: string): Promise<{
        current: DetectedRisk[];
        historical: Array<{
            riskId: string;
            riskName: string;
            category: RiskCategory;
            firstIdentified: Date;
            lastSeen: Date;
            status: 'active' | 'resolved' | 'dismissed';
            occurrences: number;
        }>;
    }>;
}
//# sourceMappingURL=risk-evaluation.service.d.ts.map
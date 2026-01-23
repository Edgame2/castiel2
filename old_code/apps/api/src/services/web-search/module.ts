/**
 * Web Search Module
 * 
 * Initializes and configures all web search services with dependency injection.
 * This module should be imported in the main application module to set up
 * web search functionality.
 */

import { Database } from '@azure/cosmos';
import { OpenAI } from 'openai';
import {
    WebSearchService,
    WebSearchCosmosService,
    SearchProviderFactory,
    SerpAPIProvider,
    BingSearchProvider,
    GoogleSearchProvider,
    WebScraperService,
    EmbeddingService,
    DeepSearchService,
} from './index.js';

/**
 * Web search module configuration
 */
export interface WebSearchModuleConfig {
    cosmosDb: Database;
    openaiApiKey: string;
    serpApiKey?: string;
    bingSearchKey?: string;
    googleSearchKey?: string;
    googleSearchEngineId?: string;
}

/**
 * Web search module container
 */
export class WebSearchModule {
    readonly cosmosService: WebSearchCosmosService;
    readonly webSearchService: WebSearchService;
    readonly scraperService: WebScraperService;
    readonly embeddingService: EmbeddingService;
    readonly deepSearchService: DeepSearchService;
    readonly providerFactory: SearchProviderFactory;

    constructor(config: WebSearchModuleConfig) {
        // Initialize Cosmos service
        this.cosmosService = new WebSearchCosmosService(config.cosmosDb);

        // Initialize search provider factory with configured providers
        this.providerFactory = new SearchProviderFactory('serpapi', ['bing', 'google']);

        // Register SerpAPI provider (primary)
        if (config.serpApiKey) {
            this.providerFactory.registerProvider('serpapi', new SerpAPIProvider({ apiKey: config.serpApiKey }));
        }

        // Register Bing Search provider (fallback)
        if (config.bingSearchKey) {
            this.providerFactory.registerProvider('bing', new BingSearchProvider({ apiKey: config.bingSearchKey }));
        }

        // Register Google Search provider (optional)
        if (config.googleSearchKey && config.googleSearchEngineId) {
            this.providerFactory.registerProvider(
                'google',
                new GoogleSearchProvider({
                    apiKey: config.googleSearchKey,
                    searchEngineId: config.googleSearchEngineId,
                })
            );
        }

        // Initialize scraper service
        this.scraperService = new WebScraperService({
            timeout: 10000,
            maxPageSize: 5 * 1024 * 1024, // 5 MB
            defaultChunkSize: 1500, // characters
        });

        // Initialize embedding service
        this.embeddingService = new EmbeddingService({
            apiKey: config.openaiApiKey,
            model: 'text-embedding-3-small',
            batchSize: 100,
        });

        // Initialize web search service
        this.webSearchService = new WebSearchService(this.cosmosService, this.providerFactory);

        // Initialize deep search service
        this.deepSearchService = new DeepSearchService(this.cosmosService, this.scraperService, this.embeddingService);
    }

    /**
     * Verify that all services are properly initialized and configured
     */
    async verify(): Promise<{ success: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            // Check provider availability
            const availableProviders = this.providerFactory.getRegisteredProviders();
            if (availableProviders.length === 0) {
                errors.push('No search providers configured');
            }

            // Verify each provider
            for (const providerName of availableProviders) {
                const provider = this.providerFactory.getProvider(providerName);
                if (provider && !(await provider.isAvailable())) {
                    errors.push(`Search provider ${providerName} is not available`);
                }
            }

            // Check embedding service
            const modelInfo = this.embeddingService.getModelInfo();
            if (!modelInfo) {
                errors.push('Embedding service model not configured');
            }

            // Check Cosmos service (by testing a simple query)
            // This would typically be tested at the API level
            const stats = await this.cosmosService.getStats('test-tenant');
            if (stats === null) {
                errors.push('Cosmos DB service is not responding');
            }
        } catch (error) {
            errors.push(`Verification error: ${error}`);
        }

        return {
            success: errors.length === 0,
            errors,
        };
    }

    /**
     * Get service statistics
     */
    getStatus(): {
        providers: string[];
        embeddingModel: string;
        scraperConfig: { timeout: number; maxPageSize: number };
    } {
        return {
            providers: this.providerFactory.getRegisteredProviders(),
            embeddingModel: this.embeddingService.getModelInfo().name,
            scraperConfig: {
                timeout: 10000,
                maxPageSize: 5 * 1024 * 1024,
            },
        };
    }
}

export default WebSearchModule;

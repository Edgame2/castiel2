/**
 * Web Search Module
 *
 * Initializes and configures all web search services with dependency injection.
 * This module should be imported in the main application module to set up
 * web search functionality.
 */
import { Database } from '@azure/cosmos';
import { WebSearchService, WebSearchCosmosService, SearchProviderFactory, WebScraperService, EmbeddingService, DeepSearchService } from './index.js';
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
export declare class WebSearchModule {
    readonly cosmosService: WebSearchCosmosService;
    readonly webSearchService: WebSearchService;
    readonly scraperService: WebScraperService;
    readonly embeddingService: EmbeddingService;
    readonly deepSearchService: DeepSearchService;
    readonly providerFactory: SearchProviderFactory;
    constructor(config: WebSearchModuleConfig);
    /**
     * Verify that all services are properly initialized and configured
     */
    verify(): Promise<{
        success: boolean;
        errors: string[];
    }>;
    /**
     * Get service statistics
     */
    getStatus(): {
        providers: string[];
        embeddingModel: string;
        scraperConfig: {
            timeout: number;
            maxPageSize: number;
        };
    };
}
export default WebSearchModule;
//# sourceMappingURL=module.d.ts.map
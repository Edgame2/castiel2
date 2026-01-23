/**
 * Web Search Services Barrel Export
 *
 * Exports all web search related services, types, and utilities.
 */
export * from './types.js';
export * from './cosmos.service.js';
export * from './providers.js';
export * from './web-search.service.js';
export * from './scraper.service.js';
export * from './embedding.service.js';
export * from './deep-search.service.js';
// Re-export commonly used items for convenience
export { WebSearchService } from './web-search.service.js';
export { WebSearchCosmosService } from './cosmos.service.js';
export { SearchProviderFactory, BaseSearchProvider, SerpAPIProvider, BingSearchProvider, GoogleSearchProvider } from './providers.js';
export { WebScraperService } from './scraper.service.js';
export { EmbeddingService } from './embedding.service.js';
export { DeepSearchService } from './deep-search.service.js';
//# sourceMappingURL=index.js.map
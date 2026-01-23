import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { AIInsightsCosmosService } from './cosmos.service.js';
import { ContentChunkingService } from './content-chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { WebScraperService } from './web-scraper.service.js';
import { SearchProviderFactory } from './search-providers/provider.factory.js';
import type { SearchQueryOptions, SearchResultDocument, ScrapedPageDocument } from './web-search.types.js';

export interface WebSearchServiceOptions {
    serpApiKey?: string;
    azureOpenAiEndpoint?: string;
    azureOpenAiApiKey?: string;
    azureOpenAiDeploymentName?: string;
    defaultMaxPages?: number;
}

export class WebSearchService {
    private http = axios.create({ timeout: 10000 });
    private providerFactory: SearchProviderFactory;
    private chunking: ContentChunkingService;
    private embeddings: EmbeddingService;
    private scraper: WebScraperService;

    constructor(
        private monitoring: IMonitoringProvider,
        private cosmos: AIInsightsCosmosService,
        options?: WebSearchServiceOptions
    ) {
        this.providerFactory = new SearchProviderFactory({
            httpClient: this.http,
            serpApiKey: options?.serpApiKey,
        });
        this.chunking = new ContentChunkingService();
        this.embeddings = new EmbeddingService(
            monitoring,
            options?.azureOpenAiEndpoint,
            options?.azureOpenAiApiKey,
            options?.azureOpenAiDeploymentName || 'text-embedding-ada-002'
        );
        this.scraper = new WebScraperService(monitoring);
    }

    async search(query: string, opts: SearchQueryOptions) {
        const { provider, results } = await this.providerFactory.searchWithFallback(query, {
            searchType: opts.searchType,
            maxResults: 5,
        });

        const queryHash = this.hashQuery(query);
        const tenantId = opts.tenantId;
        const searchDoc: SearchResultDocument = {
            id: uuidv4(),
            tenantId,
            query,
            queryHash,
            partitionKey: [tenantId, queryHash, undefined as any],
            type: 'search-result',
            provider,
            results,
            metadata: {
                createdAt: new Date().toISOString(),
                deepSearch: Boolean(opts.deepSearch),
            },
        };

        // Ensure third PK component matches id per HPK spec
        searchDoc.partitionKey[2] = searchDoc.id;

        const searchContainer = this.cosmos.getSearchContainer();
        await this.cosmos.create(searchContainer, searchDoc as any);

        let scrapedPages: ScrapedPageDocument[] = [];
        if (opts.deepSearch) {
            scrapedPages = await this.performDeepSearch(query, opts, results);
        }

        this.monitoring.trackEvent('ai-insights.search.executed', {
            tenantId,
            provider,
            deepSearch: Boolean(opts.deepSearch),
        });

        return {
            provider,
            results,
            queryHash,
            searchId: searchDoc.id,
            scrapedPages,
        };
    }

    private async performDeepSearch(
        query: string,
        opts: SearchQueryOptions,
        results: { url: string; title: string; source: string }[]
    ): Promise<ScrapedPageDocument[]> {
        const maxPages = Math.min(opts.maxPages ?? 3, 10);
        const pages = results.slice(0, maxPages);
        const scraped: ScrapedPageDocument[] = [];

        for (const page of pages) {
            try {
                const scrapedPage = await this.scraper.scrape(page.url);
                const chunks = await this.chunking.chunk(scrapedPage.content);
                const embeddings = await this.embeddings.embed(chunks);

                const chunked = chunks.map((text, idx) => ({
                    text,
                    embedding: embeddings[idx],
                    startIndex: idx * (text.length || 1),
                }));

                const doc: ScrapedPageDocument = {
                    id: uuidv4(),
                    tenantId: opts.tenantId,
                    projectId: opts.projectId || 'default-project',
                    sourceQuery: query,
                    partitionKey: [opts.tenantId, opts.projectId || 'default-project', query],
                    type: 'webpage',
                    url: page.url,
                    content: scrapedPage.content,
                    embedding: {
                        model: 'text-embedding-ada-002',
                        chunkSize: 512,
                        chunks: chunked,
                    },
                    metadata: {
                        title: scrapedPage.title,
                        scrapedAt: new Date().toISOString(),
                        scrapeDuration: scrapedPage.durationMs,
                        searchType: opts.searchType || 'web',
                    },
                };

                const container = this.cosmos.getWebPagesContainer();
                await this.cosmos.create(container, doc as any);
                scraped.push(doc);
            } catch (error: any) {
                this.monitoring.trackException(error, { operation: 'ai-insights.deep-search.scrape', url: page.url });
            }
        }

        return scraped;
    }

    private hashQuery(query: string): string {
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            hash = (hash << 5) - hash + query.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    }
}

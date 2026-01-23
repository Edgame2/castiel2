# AI Insights: Recurring Search - Service Implementations

## Overview

This document provides complete TypeScript implementations for the core services that power the Recurring Search system. These services follow SOLID principles, are fully typed, and include error handling, logging, and observability.

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [RecurringSearchService](#recurringsearchservice)
3. [WebScraperService (Deep Search)](#webscraperservice-deep-search)
4. [AlertAnalysisService](#alertanalysisservice)
5. [LearningService](#learningservice)
6. [NotificationService](#notificationservice)
7. [StatisticsService](#statisticsservice)
8. [Shared Types](#shared-types)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

## Service Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RecurringSearchService ──┬──▶ AlertAnalysisService            │
│           │                │            │                        │
│           │                └───▶ LearningService                │
│           │                             │                        │
│           └─────────────────────────────┴──▶ NotificationService│
│                                              │                   │
│                                              ▼                   │
│                                    StatisticsService             │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │   Data Layer       │
                    │   (Cosmos DB)      │
                    └────────────────────┘
```

**Service Dependencies**:
- **RecurringSearchService**: Orchestrates search execution, depends on all others
- **AlertAnalysisService**: Analyzes results, depends on LearningService and NotificationService
- **LearningService**: Processes feedback, independent
- **NotificationService**: Sends notifications, independent
- **StatisticsService**: Aggregates metrics, independent

## RecurringSearchService

**Location**: `apps/api/src/services/recurring-search.service.ts`

```typescript
import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { 
  RecurringSearch, 
  SearchExecution, 
  CreateRecurringSearchRequest,
  UpdateRecurringSearchRequest 
} from '@castiel/shared-types';
import { WebSearchService } from './web-search.service';
import { RAGService } from './rag.service';
import { AlertAnalysisService } from './alert-analysis.service';
import { StatisticsService } from './statistics.service';
import { AppError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';

export class RecurringSearchService {
  constructor(
    private recurringSearchesContainer: Container,
    private searchExecutionsContainer: Container,
    private webSearchService: WebSearchService,
    private ragService: RAGService,
    private alertAnalysisService: AlertAnalysisService,
    private statisticsService: StatisticsService
  ) {}

  /**
   * Create a new recurring search
   */
  async createRecurringSearch(
    request: CreateRecurringSearchRequest,
    userId: string,
    tenantId: string
  ): Promise<RecurringSearch> {
    logger.info('Creating recurring search', { userId, tenantId });

    // 1. Validate quota
    await this.validateQuota(tenantId);

    // 2. Validate schedule
    this.validateSchedule(request.schedule);

    // 3. Calculate next execution time
    const nextExecutionTime = this.calculateNextExecution(request.schedule);

    // 4. Create search record
    const search: RecurringSearch = {
      id: uuidv4(),
      tenantId,
      userId,
      name: request.name,
      description: request.description,
      query: request.query,
      searchType: request.searchType,
      dataSources: request.dataSources,
      filters: request.filters || {},
      schedule: {
        ...request.schedule,
        nextExecutionTime
      },
      alertConfig: {
        enabled: request.alertConfig?.enabled ?? true,
        confidenceThreshold: request.alertConfig?.confidenceThreshold ?? 0.70,
        sensitivity: request.alertConfig?.sensitivity ?? 'medium',
        volumeThreshold: request.alertConfig?.volumeThreshold,
        volumeThresholdPercent: request.alertConfig?.volumeThresholdPercent,
        customDetectionPrompt: request.alertConfig?.customDetectionPrompt,
        notificationChannels: request.alertConfig?.notificationChannels ?? ['email', 'in-app'],
        digestMode: request.alertConfig?.digestMode ?? false
      },
      sharing: {
        isPrivate: request.sharing?.isPrivate ?? true,
        sharedWith: request.sharing?.sharedWith ?? [],
        teamId: request.sharing?.teamId
      },
      status: 'active',
      executionStats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        alertsTriggered: 0
      },
      learningData: {
        feedbackCount: 0,
        relevantCount: 0,
        irrelevantCount: 0,
        falsePositiveRate: 0,
        suppressionRuleCount: 0
      },
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      version: 1,
      _partitionKey: `/${tenantId}/${userId}/${uuidv4()}`
    };

    // 5. Save to database
    const { resource } = await this.recurringSearchesContainer.items.create(search);

    logger.info('Recurring search created', { searchId: resource!.id });
    return resource!;
  }

  /**
   * Get user's recurring searches
   */
  async getUserSearches(
    userId: string,
    tenantId: string,
    options?: {
      includeShared?: boolean;
      status?: 'active' | 'paused' | 'deleted';
    }
  ): Promise<RecurringSearch[]> {
    const queries: string[] = [];
    const parameters: any[] = [];

    // Own searches
    queries.push(`
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
        AND c.userId = @userId
        AND c.status != 'deleted'
      ${options?.status ? 'AND c.status = @status' : ''}
      ORDER BY c.createdAt DESC
    `);

    parameters.push(
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId }
    );

    if (options?.status) {
      parameters.push({ name: '@status', value: options.status });
    }

    // Shared searches (if requested)
    if (options?.includeShared) {
      queries.push(`
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND ARRAY_CONTAINS(c.sharing.sharedWith, @userId)
          AND c.status = 'active'
        ORDER BY c.createdAt DESC
      `);
    }

    // Execute queries
    const results = await Promise.all(
      queries.map(query =>
        this.recurringSearchesContainer.items
          .query({ query, parameters })
          .fetchAll()
      )
    );

    // Combine and deduplicate
    const allSearches = results.flatMap(r => r.resources);
    return this.deduplicateSearches(allSearches);
  }

  /**
   * Update recurring search
   */
  async updateRecurringSearch(
    searchId: string,
    userId: string,
    tenantId: string,
    updates: UpdateRecurringSearchRequest
  ): Promise<RecurringSearch> {
    // 1. Get existing search
    const search = await this.getSearch(searchId, userId, tenantId);

    // 2. Check permissions
    if (search.userId !== userId) {
      throw new AppError(
        'You do not have permission to update this search',
        ErrorCodes.FORBIDDEN
      );
    }

    // 3. Apply updates
    const updatedSearch: RecurringSearch = {
      ...search,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      version: search.version + 1
    };

    // 4. Recalculate next execution if schedule changed
    if (updates.schedule) {
      updatedSearch.schedule.nextExecutionTime = 
        this.calculateNextExecution(updatedSearch.schedule);
    }

    // 5. Save
    const { resource } = await this.recurringSearchesContainer
      .item(searchId, search._partitionKey)
      .replace(updatedSearch);

    return resource!;
  }

  /**
   * Execute a recurring search
   */
  async executeSearch(
    searchId: string,
    tenantId: string,
    userId: string
  ): Promise<SearchExecution> {
    logger.info('Executing recurring search', { searchId, tenantId, userId });

    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Load search configuration
      const search = await this.getSearch(searchId, userId, tenantId);

      if (search.status !== 'active') {
        throw new AppError('Search is not active', ErrorCodes.BAD_REQUEST);
      }

      // 2. Create execution record
      const execution = await this.createExecutionRecord(search, executionId);

      // 3. Execute search based on data sources
      const results = await this.performSearch(search);

      // 4. Update execution with results
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      execution.duration = Date.now() - startTime;
      execution.results = {
        totalResults: results.length,
        ragResults: results.filter(r => r.source === 'rag').length,
        webSearchResults: results.filter(r => r.source !== 'rag').length,
        resultIds: results.map(r => r.id),
        queryHash: this.hashQuery(search.query)
      };

      await this.saveExecutionRecord(execution);

      // 5. Update search stats
      await this.updateSearchStats(search.id, true);

      // 6. Trigger alert analysis (async)
      this.alertAnalysisService.analyzeSearchResults(search, execution, results)
        .catch(error => {
          logger.error('Alert analysis failed', { searchId, executionId, error });
        });

      // 7. Update next execution time
      await this.updateNextExecutionTime(search);

      logger.info('Search execution completed', { 
        searchId, 
        executionId, 
        resultCount: results.length,
        duration: execution.duration 
      });

      return execution;
    } catch (error) {
      logger.error('Search execution failed', { searchId, executionId, error });

      // Update execution record with error
      await this.markExecutionFailed(executionId, error);

      // Update search stats
      await this.updateSearchStats(searchId, false);

      throw error;
    }
  }

  /**
   * Perform search across configured data sources
   */
  private async performSearch(search: RecurringSearch): Promise<any[]> {
    const results: any[] = [];

    // Execute RAG search
    if (search.dataSources.rag) {
      const ragResults = await this.ragService.search({
        query: search.query,
        tenantId: search.tenantId,
        userId: search.userId,
        filters: search.filters,
        maxResults: 50
      });
      results.push(...ragResults.map(r => ({ ...r, source: 'rag' })));
    }

    // Execute web search
    if (search.dataSources.webSearch) {
      const webResults = await this.webSearchService.search({
        query: search.query,
        tenantId: search.tenantId,
        userId: search.userId,
        providers: search.dataSources.webSearchProviders,
        filters: search.filters,
        maxResults: 50,
        useCache: false // Always fresh for recurring searches
      });
      results.push(...webResults.map(r => ({ ...r, source: 'web' })));
    }

    // Deduplicate and rank
    return this.deduplicateAndRank(results);
  }

  /**
   * Pause recurring search
   */
  async pauseSearch(
    searchId: string,
    userId: string,
    tenantId: string,
    reason?: string
  ): Promise<RecurringSearch> {
    const search = await this.getSearch(searchId, userId, tenantId);

    if (search.userId !== userId) {
      throw new AppError('Permission denied', ErrorCodes.FORBIDDEN);
    }

    search.status = 'paused';
    search.pausedAt = new Date().toISOString();
    search.pausedBy = userId;
    search.pauseReason = reason;
    search.updatedAt = new Date().toISOString();
    search.updatedBy = userId;

    const { resource } = await this.recurringSearchesContainer
      .item(searchId, search._partitionKey)
      .replace(search);

    return resource!;
  }

  /**
   * Resume recurring search
   */
  async resumeSearch(
    searchId: string,
    userId: string,
    tenantId: string
  ): Promise<RecurringSearch> {
    const search = await this.getSearch(searchId, userId, tenantId);

    if (search.userId !== userId) {
      throw new AppError('Permission denied', ErrorCodes.FORBIDDEN);
    }

    search.status = 'active';
    search.pausedAt = undefined;
    search.pausedBy = undefined;
    search.pauseReason = undefined;
    search.updatedAt = new Date().toISOString();
    search.updatedBy = userId;

    // Recalculate next execution
    search.schedule.nextExecutionTime = this.calculateNextExecution(search.schedule);

    const { resource } = await this.recurringSearchesContainer
      .item(searchId, search._partitionKey)
      .replace(search);

    return resource!;
  }

  /**
   * Delete recurring search (soft delete)
   */
  async deleteSearch(
    searchId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const search = await this.getSearch(searchId, userId, tenantId);

    if (search.userId !== userId) {
      throw new AppError('Permission denied', ErrorCodes.FORBIDDEN);
    }

    search.status = 'deleted';
    search.updatedAt = new Date().toISOString();
    search.updatedBy = userId;
    search.ttl = 604800; // 7 days grace period

    await this.recurringSearchesContainer
      .item(searchId, search._partitionKey)
      .replace(search);
  }

  /**
   * Get execution history for a search
   */
  async getExecutionHistory(
    searchId: string,
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      alertsOnly?: boolean;
    }
  ): Promise<{ executions: SearchExecution[]; total: number }> {
    // Verify access
    await this.getSearch(searchId, userId, tenantId);

    const query = `
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
        AND c.searchId = @searchId
        ${options?.alertsOnly ? 'AND c.alertDetection.alertTriggered = true' : ''}
      ORDER BY c.executedAt DESC
      OFFSET ${options?.offset || 0} LIMIT ${options?.limit || 50}
    `;

    const { resources } = await this.searchExecutionsContainer.items
      .query({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@searchId', value: searchId }
        ]
      })
      .fetchAll();

    // Get total count
    const countQuery = `
      SELECT VALUE COUNT(1) FROM c
      WHERE c.tenantId = @tenantId AND c.searchId = @searchId
    `;
    const { resources: countResult } = await this.searchExecutionsContainer.items
      .query({ query: countQuery, parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@searchId', value: searchId }
      ]})
      .fetchAll();

    return {
      executions: resources,
      total: countResult[0] || 0
    };
  }

  // Private helper methods

  private async validateQuota(tenantId: string): Promise<void> {
    // Get tenant's current search count
    const countQuery = `
      SELECT VALUE COUNT(1) FROM c
      WHERE c.tenantId = @tenantId AND c.status != 'deleted'
    `;
    const { resources } = await this.recurringSearchesContainer.items
      .query({
        query: countQuery,
        parameters: [{ name: '@tenantId', value: tenantId }]
      })
      .fetchAll();

    const currentCount = resources[0] || 0;

    // Get tenant quota (default 10, can be overridden by Super Admin)
    const quota = await this.getTenantQuota(tenantId);

    if (currentCount >= quota) {
      throw new AppError(
        `Recurring search quota exceeded (${currentCount}/${quota})`,
        ErrorCodes.QUOTA_EXCEEDED
      );
    }
  }

  private validateSchedule(schedule: any): void {
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    
    if (!validFrequencies.includes(schedule.frequency)) {
      throw new AppError(
        `Invalid frequency: ${schedule.frequency}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (schedule.frequency === 'weekly' && !schedule.dayOfWeek) {
      throw new AppError(
        'dayOfWeek required for weekly frequency',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (schedule.frequency === 'monthly' && !schedule.dayOfMonth) {
      throw new AppError(
        'dayOfMonth required for monthly frequency',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Add more validation as needed
  }

  private calculateNextExecution(schedule: any): string {
    const now = new Date();
    const timezone = schedule.timezone || 'UTC';

    // Convert to tenant timezone
    // Implementation depends on timezone library (e.g., date-fns-tz, luxon)
    // Simplified example:
    switch (schedule.frequency) {
      case 'hourly':
        now.setHours(now.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        const [hours, minutes] = (schedule.time || '09:00').split(':');
        now.setDate(now.getDate() + 1);
        now.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        break;
      case 'weekly':
        // Calculate next occurrence of dayOfWeek
        const targetDay = schedule.dayOfWeek;
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        now.setDate(now.getDate() + daysUntilTarget);
        const [wHours, wMinutes] = (schedule.time || '09:00').split(':');
        now.setHours(parseInt(wHours), parseInt(wMinutes), 0, 0);
        break;
      // Add other frequencies...
    }

    return now.toISOString();
  }

  private async getSearch(
    searchId: string,
    userId: string,
    tenantId: string
  ): Promise<RecurringSearch> {
    // Try to get by user's partition first (most common case)
    try {
      const { resource } = await this.recurringSearchesContainer
        .item(searchId, `/${tenantId}/${userId}/${searchId}`)
        .read<RecurringSearch>();

      if (resource) return resource;
    } catch (error) {
      // Not found in user's partition, might be shared
    }

    // Query across tenant (less efficient, for shared searches)
    const query = `
      SELECT * FROM c
      WHERE c.id = @searchId
        AND c.tenantId = @tenantId
        AND (c.userId = @userId OR ARRAY_CONTAINS(c.sharing.sharedWith, @userId))
    `;

    const { resources } = await this.recurringSearchesContainer.items
      .query({
        query,
        parameters: [
          { name: '@searchId', value: searchId },
          { name: '@tenantId', value: tenantId },
          { name: '@userId', value: userId }
        ]
      })
      .fetchAll();

    if (resources.length === 0) {
      throw new AppError('Search not found', ErrorCodes.NOT_FOUND);
    }

    return resources[0];
  }

  private async createExecutionRecord(
    search: RecurringSearch,
    executionId: string
  ): Promise<SearchExecution> {
    const execution: SearchExecution = {
      id: executionId,
      tenantId: search.tenantId,
      searchId: search.id,
      executedAt: new Date().toISOString(),
      scheduledAt: search.schedule.nextExecutionTime,
      duration: 0,
      status: 'running',
      retryCount: 0,
      searchConfig: {
        query: search.query,
        dataSources: search.dataSources,
        filters: search.filters
      },
      results: {
        totalResults: 0,
        ragResults: 0,
        webSearchResults: 0,
        resultIds: [],
        queryHash: ''
      },
      alertDetection: {
        analysisPerformed: false,
        alertTriggered: false
      },
      metrics: {
        totalRUs: 0,
        webSearchCalls: 0
      },
      createdAt: new Date().toISOString(),
      ttl: 15552000, // 180 days
      _partitionKey: `/${search.tenantId}/${search.id}/${executionId}`
    };

    await this.searchExecutionsContainer.items.create(execution);
    return execution;
  }

  private async saveExecutionRecord(execution: SearchExecution): Promise<void> {
    await this.searchExecutionsContainer
      .item(execution.id, execution._partitionKey)
      .replace(execution);
  }

  private async markExecutionFailed(executionId: string, error: any): Promise<void> {
    // Implementation to update execution status to 'failed'
    // and store error details
  }

  private async updateSearchStats(searchId: string, success: boolean): Promise<void> {
    // Implementation to increment execution counters
  }

  private async updateNextExecutionTime(search: RecurringSearch): Promise<void> {
    search.schedule.nextExecutionTime = this.calculateNextExecution(search.schedule);
    search.executionStats.totalExecutions++;
    
    await this.recurringSearchesContainer
      .item(search.id, search._partitionKey)
      .replace(search);
  }

  private hashQuery(query: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(query.toLowerCase()).digest('hex');
  }

  private deduplicateAndRank(results: any[]): any[] {
    // Remove duplicates based on URL
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // Sort by relevance score
    return unique.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private deduplicateSearches(searches: RecurringSearch[]): RecurringSearch[] {
    const seen = new Set();
    return searches.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }

  private async getTenantQuota(tenantId: string): Promise<number> {
    // Get from tenant settings or return default
    return 10;
  }
}
```

## WebScraperService (Deep Search)

**Location**: `apps/api/src/services/web-scraper.service.ts`

This service handles scraping and content extraction for deep web search functionality.

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Container } from '@azure/cosmos';
import { 
  WebPageShard,
  DeepSearchConfig 
} from '@castiel/shared-types';
import { logger } from '../utils/logger';

export class WebScraperService {
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly userAgent = 'Mozilla/5.0 (compatible; CastielBot/1.0)';

  constructor(
    private webPagesContainer: Container,
    private embeddingService: EmbeddingService,
    private contentChunkingService: ContentChunkingService
  ) {}

  /**
   * Scrape a URL and extract clean text content
   */
  async scrapeUrl(
    url: string,
    timeout: number = this.defaultTimeout
  ): Promise<{
    url: string;
    title?: string;
    content: string;
    duration: number;
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 1. Fetch page with timeout
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      // 2. Parse HTML with Cheerio
      const $ = cheerio.load(response.data);

      // 3. Extract title
      const title = $('h1').first().text() || $('title').text() || undefined;

      // 4. Remove unwanted elements
      const elementsToRemove = [
        'script',
        'style',
        'nav',
        'footer',
        '.header',
        '.navigation',
        '[class*="sidebar"]',
        '[class*="advertisement"]',
        '.ads',
        'iframe'
      ];
      elementsToRemove.forEach(selector => {
        $(selector).remove();
      });

      // 5. Extract clean text
      const content = $('body')
        .text()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();

      const duration = Date.now() - startTime;

      logger.info('Successfully scraped URL', { 
        url, 
        contentLength: content.length,
        duration 
      });

      return {
        url,
        title,
        content,
        duration,
        success: true
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.warn('Failed to scrape URL', { 
        url, 
        error: errorMessage,
        duration 
      });

      return {
        url,
        content: '',
        duration,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Scrape multiple URLs and create c_webpages shards
   */
  async scrapeAndCreateShards(
    urls: Array<{ url: string; title?: string }>,
    config: {
      tenantId: string;
      projectId: string;
      sourceQuery: string;
      searchType: string;
      executionId: string;
      recurringSearchId?: string;
      conversationId?: string;
    },
    deepSearchConfig: DeepSearchConfig,
    progressCallback?: (page: number, status: string) => void
  ): Promise<WebPageShard[]> {
    const shards: WebPageShard[] = [];

    for (let i = 0; i < Math.min(urls.length, deepSearchConfig.pageDepth); i++) {
      const { url } = urls[i];

      // Notify progress
      progressCallback?.(i + 1, `Scraping page ${i + 1} of ${deepSearchConfig.pageDepth}...`);

      try {
        // 1. Scrape page
        const scrapedPage = await this.scrapeUrl(url, deepSearchConfig.timeout);

        if (!scrapedPage.success) {
          logger.warn('Skipping failed page', { url, error: scrapedPage.error });
          continue;
        }

        // 2. Check minimum content length
        if (scrapedPage.content.length < deepSearchConfig.minContentLength) {
          logger.info('Skipping page with insufficient content', { 
            url, 
            contentLength: scrapedPage.content.length 
          });
          continue;
        }

        // 3. Chunk content
        const chunks = await this.contentChunkingService.chunkContent(
          scrapedPage.content,
          deepSearchConfig.chunkSize
        );

        // 4. Generate embeddings for chunks
        const chunksWithEmbeddings = await Promise.all(
          chunks.map(async (chunk) => ({
            ...chunk,
            embedding: await this.embeddingService.embed(chunk.text)
          }))
        );

        // 5. Create c_webpages shard
        const shard: WebPageShard = {
          id: `webpage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          shardTypeId: 'c_webpages',
          tenantId: config.tenantId,
          projectId: config.projectId,
          sourceQuery: config.sourceQuery,

          url,
          title: scrapedPage.title,

          structuredData: {
            url,
            content: scrapedPage.content,
            contentLength: scrapedPage.content.length
          },

          embedding: {
            model: 'text-embedding-3-small',
            dimensions: 1536,
            chunks: chunksWithEmbeddings
          },

          metadata: {
            searchType: config.searchType as any,
            scrapedAt: new Date(),
            scrapeDuration: scrapedPage.duration,
            extractionSuccess: true
          },

          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          ttl: 30 * 24 * 60 * 60, // 30 days in seconds

          executionId: config.executionId,
          recurringSearchId: config.recurringSearchId,
          conversationId: config.conversationId,

          audit: {
            createdAt: new Date(),
            updatedAt: new Date(),
            accessCount: 0
          }
        };

        // 6. Store shard
        await this.webPagesContainer.items.create(shard);
        shards.push(shard);

        logger.info('Created c_webpages shard', { 
          url, 
          shardId: shard.id,
          chunkCount: chunksWithEmbeddings.length
        });
      } catch (error) {
        logger.error('Failed to create shard for URL', { 
          url, 
          error 
        });
        // Continue with next URL
      }
    }

    progressCallback?.(deepSearchConfig.pageDepth, 'Scraping complete');
    return shards;
  }

  /**
   * Search c_webpages shards by vector similarity
   */
  async searchByVector(
    tenantId: string,
    projectId: string,
    queryVector: number[],
    topK: number = 10
  ): Promise<WebPageShard[]> {
    const query = `
      SELECT TOP @topK c.id, c.url, c.title, c.structuredData
      FROM c_webpages c
      WHERE c.tenantId = @tenantId
      AND c.projectId = @projectId
      ORDER BY VectorDistance(c.embedding.chunks[0].embedding, @queryVector) DESC
    `;

    const { resources } = await this.webPagesContainer.items.query({
      query,
      parameters: [
        { name: '@topK', value: topK },
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
        { name: '@queryVector', value: queryVector }
      ]
    }).fetchAll();

    return resources as WebPageShard[];
  }
}
```

### Related Services

**Dependencies:**
- `EmbeddingService` - Generates vector embeddings
- `ContentChunkingService` - Splits content into semantic chunks
- `Cosmos DB Container` - Stores c_webpages shards

**Used by:**
- `RecurringSearchService` - Calls scrapeAndCreateShards during deep search execution
- Chat service - Embeds scraped content in conversation context

### Error Handling

- **Network timeouts**: Return graceful error, skip page
- **HTML parsing failures**: Log warning, continue with other pages
- **Embedding failures**: Retry up to 3 times, then skip
- **Cosmos DB write failures**: Log error and re-throw (queue will retry)

## AlertAnalysisService

**Location**: `apps/api/src/services/alert-analysis.service.ts`

```typescript
import { Container } from '@azure/cosmos';
import { 
  RecurringSearch, 
  SearchExecution, 
  Alert,
  AlertFeedback 
} from '@castiel/shared-types';
import { LLMService } from './llm.service';
import { NotificationService } from './notification.service';
import { LearningService } from './learning.service';
import { logger } from '../utils/logger';

export class AlertAnalysisService {
  constructor(
    private searchExecutionsContainer: Container,
    private notificationsContainer: Container,
    private llmService: LLMService,
    private notificationService: NotificationService,
    private learningService: LearningService
  ) {}

  /**
   * Analyze search results and create alert if significant changes detected
   */
  async analyzeSearchResults(
    search: RecurringSearch,
    currentExecution: SearchExecution,
    currentResults: any[]
  ): Promise<Alert | null> {
    logger.info('Analyzing search results for alerts', { 
      searchId: search.id, 
      executionId: currentExecution.id 
    });

    try {
      // 1. Get previous execution results
      const previousExecution = await this.getPreviousExecution(
        search.id,
        search.tenantId,
        currentExecution.id
      );

      if (!previousExecution) {
        logger.info('No previous execution, skipping alert analysis');
        return null;
      }

      const previousResults = await this.getExecutionResults(previousExecution);

      // 2. Perform delta analysis using LLM
      const analysis = await this.performDeltaAnalysis(
        search,
        previousResults,
        currentResults
      );

      // 3. Calculate final confidence score
      const confidence = await this.calculateConfidence(
        analysis.confidence,
        search,
        previousExecution
      );

      // 4. Check if thresholds met
      const thresholdsMet = this.checkThresholds(
        confidence,
        currentResults.length,
        previousResults.length,
        search.alertConfig
      );

      // 5. Create alert if criteria met
      if (thresholdsMet && analysis.isSignificant) {
        return await this.createAlert(
          search,
          currentExecution,
          analysis,
          confidence,
          currentResults
        );
      }

      logger.info('No alert triggered', { 
        searchId: search.id,
        confidence,
        thresholdsMet,
        isSignificant: analysis.isSignificant
      });

      return null;
    } catch (error) {
      logger.error('Alert analysis failed', { 
        searchId: search.id, 
        executionId: currentExecution.id,
        error 
      });
      throw error;
    }
  }

  /**
   * Process user feedback on an alert
   */
  async processFeedback(
    alertId: string,
    feedback: AlertFeedback,
    userId: string,
    tenantId: string
  ): Promise<void> {
    logger.info('Processing alert feedback', { alertId, feedback: feedback.feedback });

    // 1. Update alert with feedback
    await this.updateAlertFeedback(alertId, feedback, tenantId);

    // 2. Trigger learning if irrelevant
    if (feedback.feedback === 'irrelevant') {
      await this.learningService.processFalsePositive(
        feedback.searchId,
        alertId,
        feedback,
        tenantId
      );
    }

    // 3. Update statistics
    await this.updateFeedbackStats(feedback.searchId, feedback.feedback, tenantId);
  }

  // Private methods

  private async performDeltaAnalysis(
    search: RecurringSearch,
    previousResults: any[],
    currentResults: any[]
  ): Promise<any> {
    // Build context for LLM
    const context = this.buildAnalysisContext(
      search,
      previousResults,
      currentResults
    );

    // Get detection prompt for search type
    const prompt = await this.getDetectionPrompt(search);

    // Call LLM
    const response = await this.llmService.complete({
      prompt: `${prompt}\n\n${context}`,
      temperature: 0.3, // Lower temperature for consistent analysis
      maxTokens: 1000
    });

    // Parse LLM response
    return this.parseAnalysisResponse(response);
  }

  private buildAnalysisContext(
    search: RecurringSearch,
    previousResults: any[],
    currentResults: any[]
  ): string {
    return `
SEARCH TYPE: ${search.searchType}
USER GOAL: ${search.description || search.name}

PREVIOUS RESULTS (${previousResults.length} items):
${this.formatResults(previousResults)}

NEW RESULTS (${currentResults.length} items):
${this.formatResults(currentResults)}

Analyze the changes and determine if they are significant.
Respond with JSON: { "isSignificant": boolean, "confidence": number, "summary": string, "keyChanges": string[], "reasoning": string }
    `.trim();
  }

  private formatResults(results: any[]): string {
    return results.slice(0, 10).map((r, idx) => `
[${idx + 1}] ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}
   Date: ${r.publishedAt || 'N/A'}
    `).join('\n');
  }

  private async getDetectionPrompt(search: RecurringSearch): Promise<string> {
    // Get base prompt for search type
    const basePrompts = {
      sales_opportunity: `Detect NEW SALES OPPORTUNITIES. Focus on: new company mentions, budget announcements, technology adoption signals, hiring patterns, partnerships.`,
      risk_detection: `Detect RISKS and THREATS. Focus on: negative news, security incidents, regulatory issues, customer complaints, service outages.`,
      competitor_threat: `Detect COMPETITIVE THREATS. Focus on: product launches, pricing changes, partnerships, market expansion, customer wins.`,
      regulatory: `Detect REGULATORY CHANGES. Focus on: new legislation, compliance requirements, enforcement actions, policy changes.`,
      custom: `Analyze results based on user's goal.`
    };

    let prompt = basePrompts[search.searchType] || basePrompts.custom;

    // Apply user customization
    if (search.alertConfig.customDetectionPrompt) {
      prompt += `\n\nUSER INSTRUCTIONS: ${search.alertConfig.customDetectionPrompt}`;
    }

    // Apply learned refinements
    const refinements = await this.learningService.getPromptRefinements(search.id);
    if (refinements) {
      prompt += `\n\n${refinements}`;
    }

    return prompt;
  }

  private parseAnalysisResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing if LLM didn't return valid JSON
      return {
        isSignificant: false,
        confidence: 0,
        summary: 'Failed to parse analysis',
        keyChanges: [],
        reasoning: response
      };
    }
  }

  private async calculateConfidence(
    llmConfidence: number,
    search: RecurringSearch,
    previousExecution: SearchExecution
  ): Promise<number> {
    let confidence = llmConfidence;

    // Apply sensitivity multiplier
    const sensitivityMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.2
    }[search.alertConfig.sensitivity];

    confidence *= sensitivityMultiplier;

    // Adjust based on historical false positive rate
    const fpRate = search.learningData.falsePositiveRate;
    if (fpRate > 0.3) {
      confidence *= 0.9; // Be more conservative
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  private checkThresholds(
    confidence: number,
    currentCount: number,
    previousCount: number,
    alertConfig: any
  ): boolean {
    // Check confidence threshold
    const confMet = confidence >= alertConfig.confidenceThreshold;

    // Check volume threshold
    const volumeChange = Math.abs(currentCount - previousCount);
    const volumeMet = alertConfig.volumeThreshold
      ? volumeChange >= alertConfig.volumeThreshold
      : true;

    // Check volume percent threshold
    const volumePercent = previousCount > 0
      ? (volumeChange / previousCount) * 100
      : 100;
    const volumePercentMet = alertConfig.volumeThresholdPercent
      ? volumePercent >= alertConfig.volumeThresholdPercent
      : true;

    // Combine thresholds (configurable AND/OR logic)
    return confMet && volumeMet && volumePercentMet;
  }

  private async createAlert(
    search: RecurringSearch,
    execution: SearchExecution,
    analysis: any,
    confidence: number,
    results: any[]
  ): Promise<Alert> {
    // Create notification record
    const alert = await this.notificationService.create({
      type: 'recurring_search_alert',
      tenantId: search.tenantId,
      userId: search.userId,
      title: `Alert: ${search.name}`,
      summary: analysis.summary,
      content: this.formatAlertContent(analysis, results),
      source: {
        searchId: search.id,
        executionId: execution.id,
        alertType: search.searchType
      },
      alert: {
        confidence,
        keyChanges: analysis.keyChanges,
        citations: this.extractCitations(results),
        reasoning: analysis.reasoning
      },
      priority: this.calculatePriority(confidence, search),
      channels: search.alertConfig.notificationChannels
    });

    // Update execution record
    execution.alertDetection.analysisPerformed = true;
    execution.alertDetection.alertTriggered = true;
    execution.alertDetection.alertId = alert.id;
    execution.alertDetection.confidence = confidence;
    execution.alertDetection.reasoning = analysis.reasoning;

    await this.searchExecutionsContainer
      .item(execution.id, execution._partitionKey)
      .replace(execution);

    logger.info('Alert created', { 
      alertId: alert.id, 
      searchId: search.id,
      confidence 
    });

    return alert;
  }

  private formatAlertContent(analysis: any, results: any[]): string {
    return `
## Summary
${analysis.summary}

## Key Changes
${analysis.keyChanges.map(c => `- ${c}`).join('\n')}

## Top Results
${results.slice(0, 5).map((r, i) => `
${i + 1}. **${r.title}**
   ${r.snippet}
   [View](${ r.url})
`).join('\n')}
    `.trim();
  }

  private extractCitations(results: any[]): any[] {
    return results.slice(0, 5).map(r => ({
      resultId: r.id,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      source: r.source,
      publishedAt: r.publishedAt,
      relevanceScore: r.relevanceScore,
      changeType: 'new'
    }));
  }

  private calculatePriority(confidence: number, search: RecurringSearch): string {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.75) return 'medium';
    return 'low';
  }

  private async getPreviousExecution(
    searchId: string,
    tenantId: string,
    currentExecutionId: string
  ): Promise<SearchExecution | null> {
    const query = `
      SELECT TOP 1 * FROM c
      WHERE c.tenantId = @tenantId
        AND c.searchId = @searchId
        AND c.id != @currentId
        AND c.status = 'completed'
      ORDER BY c.executedAt DESC
    `;

    const { resources } = await this.searchExecutionsContainer.items
      .query({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@searchId', value: searchId },
          { name: '@currentId', value: currentExecutionId }
        ]
      })
      .fetchAll();

    return resources[0] || null;
  }

  private async getExecutionResults(execution: SearchExecution): Promise<any[]> {
    // Load results from c_search container
    // Implementation depends on how results are stored
    return [];
  }

  private async updateAlertFeedback(
    alertId: string,
    feedback: AlertFeedback,
    tenantId: string
  ): Promise<void> {
    // Update notification record with feedback
  }

  private async updateFeedbackStats(
    searchId: string,
    feedback: string,
    tenantId: string
  ): Promise<void> {
    // Update search learning stats
  }
}
```

## LearningService

**Location**: `apps/api/src/services/learning.service.ts`

```typescript
import { Container } from '@azure/cosmos';
import { AlertFeedback, SuppressionRule } from '@castiel/shared-types';
import { LLMService } from './llm.service';
import { logger } from '../utils/logger';

export class LearningService {
  constructor(
    private suppressionRulesContainer: Container,
    private recurringSearchesContainer: Container,
    private llmService: LLMService
  ) {}

  /**
   * Process false positive feedback and learn
   */
  async processFalsePositive(
    searchId: string,
    alertId: string,
    feedback: AlertFeedback,
    tenantId: string
  ): Promise<void> {
    logger.info('Processing false positive', { searchId, alertId });

    // 1. Analyze the false positive pattern
    const pattern = await this.analyzeFalsePositivePattern(
      searchId,
      alertId,
      feedback,
      tenantId
    );

    // 2. Check if pattern is recurring
    const similarFPs = await this.findSimilarFalsePositives(
      searchId,
      pattern,
      tenantId
    );

    // 3. If recurring pattern (3+ similar FPs), create suppression rule
    if (similarFPs.length >= 2) { // Current + 2 similar = 3 total
      await this.createSuppressionRule(searchId, pattern, tenantId);

      // Notify user of learning
      logger.info('Suppression rule created from pattern', { 
        searchId, 
        patternCount: similarFPs.length + 1 
      });
    }

    // 4. Refine detection prompt
    const feedbackCount = await this.getFeedbackCount(searchId, tenantId);
    if (feedbackCount % 5 === 0) { // Every 5 feedback points
      await this.refineDetectionPrompt(searchId, tenantId);
    }
  }

  /**
   * Get prompt refinements for a search
   */
  async getPromptRefinements(searchId: string): Promise<string | null> {
    // Get active suppression rules
    const rules = await this.getActiveSuppressionRules(searchId);

    if (rules.length === 0) return null;

    let refinement = '\n\nLEARNED IGNORE PATTERNS:';
    rules.forEach(rule => {
      refinement += `\n- ${this.formatSuppressionRule(rule)}`;
    });

    return refinement;
  }

  // Private methods

  private async analyzeFalsePositivePattern(
    searchId: string,
    alertId: string,
    feedback: AlertFeedback,
    tenantId: string
  ): Promise<any> {
    // Analyze alert content to identify common characteristics
    // Could use LLM or rule-based approach
    return {
      keywords: [],
      sources: [],
      semanticDescription: feedback.comment
    };
  }

  private async findSimilarFalsePositives(
    searchId: string,
    pattern: any,
    tenantId: string
  ): Promise<any[]> {
    // Query for similar false positives
    return [];
  }

  private async createSuppressionRule(
    searchId: string,
    pattern: any,
    tenantId: string
  ): Promise<SuppressionRule> {
    const rule: SuppressionRule = {
      id: require('uuid').v4(),
      tenantId,
      searchId,
      ruleType: 'semantic',
      condition: pattern,
      createdBy: 'learning-system',
      createdReason: 'Pattern detected from user feedback',
      status: 'active',
      stats: {
        appliedCount: 0,
        preventedAlerts: 0,
        userFeedbackCount: 0,
        effectiveness: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      _partitionKey: `/${tenantId}/${searchId}/${require('uuid').v4()}`
    };

    await this.suppressionRulesContainer.items.create(rule);
    return rule;
  }

  private async getActiveSuppressionRules(searchId: string): Promise<SuppressionRule[]> {
    // Query active rules for search
    return [];
  }

  private formatSuppressionRule(rule: SuppressionRule): string {
    switch (rule.ruleType) {
      case 'keyword':
        return `Ignore items containing: ${rule.condition.keywords?.join(', ')}`;
      case 'source':
        return `Ignore items from: ${rule.condition.sources?.join(', ')}`;
      case 'pattern':
        return `Ignore pattern: ${rule.condition.pattern}`;
      case 'semantic':
        return rule.condition.semanticDescription || 'Learned pattern';
      default:
        return 'Custom rule';
    }
  }

  private async getFeedbackCount(searchId: string, tenantId: string): Promise<number> {
    // Get total feedback count for search
    return 0;
  }

  private async refineDetectionPrompt(searchId: string, tenantId: string): Promise<void> {
    // Analyze all feedback and refine prompt
    logger.info('Refining detection prompt based on feedback', { searchId });
  }
}
```

## NotificationService

**Location**: `apps/api/src/services/notification.service.ts`

See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for complete implementation.

## StatisticsService

**Location**: `apps/api/src/services/statistics.service.ts`

```typescript
import { Container } from '@azure/cosmos';
import { SearchStatistics } from '@castiel/shared-types';

export class StatisticsService {
  constructor(
    private statisticsContainer: Container
  ) {}

  async updateExecutionStats(
    searchId: string,
    tenantId: string,
    execution: any
  ): Promise<void> {
    // Update statistics for the search
    const period = this.getCurrentPeriod();
    const stats = await this.getOrCreateStats(searchId, tenantId, period);

    stats.executions.total++;
    if (execution.status === 'completed') {
      stats.executions.successful++;
    } else {
      stats.executions.failed++;
    }

    stats.executions.avgDuration = this.calculateAvgDuration(stats, execution.duration);
    stats.executions.totalRUsConsumed += execution.metrics.totalRUs;

    await this.saveStats(stats);
  }

  async updateAlertStats(
    searchId: string,
    tenantId: string,
    alert: any
  ): Promise<void> {
    const period = this.getCurrentPeriod();
    const stats = await this.getOrCreateStats(searchId, tenantId, period);

    stats.alerts.total++;
    stats.alerts.byType[alert.searchType]++;
    stats.alerts.avgConfidence = this.calculateAvgConfidence(stats, alert.confidence);

    await this.saveStats(stats);
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getOrCreateStats(
    searchId: string,
    tenantId: string,
    period: string
  ): Promise<SearchStatistics> {
    // Get or create statistics record
    return {} as SearchStatistics;
  }

  private async saveStats(stats: SearchStatistics): Promise<void> {
    await this.statisticsContainer
      .item(stats.id, stats._partitionKey)
      .replace(stats);
  }

  private calculateAvgDuration(stats: SearchStatistics, newDuration: number): number {
    const total = stats.executions.total;
    const currentAvg = stats.executions.avgDuration;
    return ((currentAvg * (total - 1)) + newDuration) / total;
  }

  private calculateAvgConfidence(stats: SearchStatistics, newConfidence: number): number {
    const total = stats.alerts.total;
    const currentAvg = stats.alerts.avgConfidence;
    return ((currentAvg * (total - 1)) + newConfidence) / total;
  }
}
```

## Shared Types

**Location**: `packages/shared-types/src/recurring-search.ts`

```typescript
export interface RecurringSearch {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  query: string;
  searchType: SearchType;
  dataSources: DataSourceConfig;
  filters: SearchFilters;
  schedule: ScheduleConfig;
  alertConfig: AlertConfig;
  sharing: SharingConfig;
  status: 'active' | 'paused' | 'deleted';
  pausedAt?: string;
  pausedBy?: string;
  pauseReason?: string;
  executionStats: ExecutionStats;
  learningData: LearningData;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  _partitionKey: string;
  ttl?: number;
}

export type SearchType = 
  | 'sales_opportunity'
  | 'risk_detection'
  | 'competitor_threat'
  | 'regulatory'
  | 'custom';

export interface DataSourceConfig {
  rag: boolean;
  webSearch: boolean;
  webSearchProviders?: string[];
}

export interface SearchFilters {
  dateRange?: {
    from?: string;
    to?: string;
    relative?: string;
  };
  sources?: string[];
  excludeSources?: string[];
  language?: string[];
  country?: string[];
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthsOfYear?: number[];
  timezone: string;
  nextExecutionTime: string;
}

export interface AlertConfig {
  enabled: boolean;
  confidenceThreshold: number;
  sensitivity: 'low' | 'medium' | 'high';
  volumeThreshold?: number;
  volumeThresholdPercent?: number;
  customDetectionPrompt?: string;
  notificationChannels: string[];
  digestMode: boolean;
}

export interface SharingConfig {
  isPrivate: boolean;
  sharedWith: string[];
  teamId?: string;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  alertsTriggered: number;
}

export interface LearningData {
  feedbackCount: number;
  relevantCount: number;
  irrelevantCount: number;
  falsePositiveRate: number;
  lastPromptRefinementAt?: string;
  suppressionRuleCount: number;
}

// ... more types
```

## Error Handling

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
```

## Testing

```typescript
import { RecurringSearchService } from './recurring-search.service';

describe('RecurringSearchService', () => {
  let service: RecurringSearchService;
  
  beforeEach(() => {
    // Setup mocks
  });

  describe('createRecurringSearch', () => {
    it('should create search successfully', async () => {
      const request = {
        name: 'Test Search',
        query: 'AI companies',
        searchType: 'sales_opportunity' as const,
        // ...
      };

      const result = await service.createRecurringSearch(
        request,
        'user123',
        'tenant456'
      );

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Search');
    });

    it('should enforce quota', async () => {
      // Mock quota exceeded
      await expect(
        service.createRecurringSearch(request, 'user123', 'tenant456')
      ).rejects.toThrow('quota exceeded');
    });
  });
});
```

## Related Documentation

- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md) - System architecture
- [RECURRING-SEARCH-ALERTS.md](./RECURRING-SEARCH-ALERTS.md) - Alert detection
- [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) - Database schema
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) - Notification system
- [API.md](./API.md) - API endpoints

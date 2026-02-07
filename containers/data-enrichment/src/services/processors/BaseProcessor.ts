/**
 * Base processor implementation
 * Provides common functionality for all enrichment processors
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { log } from '../../utils/logger.js';
import { IEnrichmentProcessor } from './IEnrichmentProcessor.js';
import { EnrichmentProcessorType } from '../../types/enrichment.types.js';

export abstract class BaseProcessor implements IEnrichmentProcessor {
  protected aiServiceClient: ServiceClient;
  protected app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, aiServiceUrl?: string) {
    this.app = app || null;
    this.aiServiceClient = new ServiceClient({
      baseURL: aiServiceUrl || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  abstract getType(): EnrichmentProcessorType;
  abstract process(text: string, config: Record<string, unknown>): Promise<unknown>;

  /**
   * Get service token for service-to-service authentication
   */
  protected getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Call AI service for text completion
   */
  protected async callAI(
    prompt: string,
    tenantId: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature || 0.1,
          maxTokens: options.maxTokens || 1000,
          model: options.model || 'gpt-4',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Extract completion text from response
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message?.content || response.choices[0].text || '';
      }
      return response.completion || response.text || response.content || '';
    } catch (error: any) {
      log.error('AI service call failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      throw error;
    }
  }
}

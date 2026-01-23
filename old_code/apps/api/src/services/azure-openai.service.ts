/**
 * Azure OpenAI Embeddings Service
 * Generates embeddings using Azure OpenAI REST API
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  EmbeddingModel,
  EMBEDDING_MODELS,
  VectorizationError,
  VectorizationErrorCode,
  estimateTokenCount,
  calculateEmbeddingCost,
} from '../types/vectorization.types.js';
import { EmbeddingRequest, EmbeddingResponse } from '../types/vector-search.types.js';

/**
 * Azure OpenAI configuration
 */
export interface AzureOpenAIConfig {
  endpoint: string; // Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com/)
  apiKey: string; // Azure OpenAI API key
  apiVersion?: string; // API version (default: 2024-02-15-preview)
  deploymentName?: string; // Default deployment name (overridable per request)
  timeout?: number; // Request timeout in ms (default: 30000)
  maxRetries?: number; // Max retries on failure (default: 3)
}

export interface AzureOpenAICompletionOptions {
  deploymentName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Azure OpenAI REST API response
 */
interface AzureOpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface AzureOpenAICompletionResponse {
  choices: Array<{
    text: string;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface AzureOpenAIChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Azure OpenAI Embeddings Service
 */
export class AzureOpenAIService {
  private config: Required<AzureOpenAIConfig>;

  constructor(
    config: AzureOpenAIConfig,
    private monitoring: IMonitoringProvider
  ) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion || '2024-02-15-preview',
      deploymentName: config.deploymentName || 'text-embedding-ada-002',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    };

    this.monitoring.trackEvent('azure-openai-service-initialized', {
      endpoint: this.config.endpoint,
      apiVersion: this.config.apiVersion,
    });
  }

  /**
   * Call Azure OpenAI REST API
   */
  private async callEmbeddingsAPI(
    deploymentName: string,
    input: string | string[]
  ): Promise<AzureOpenAIEmbeddingResponse> {
    const url = `${this.config.endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${this.config.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<AzureOpenAIEmbeddingResponse>;
  }

  private async callCompletionsAPI(
    deploymentName: string,
    body: Record<string, unknown>
  ): Promise<AzureOpenAICompletionResponse> {
    const url = `${this.config.endpoint}/openai/deployments/${deploymentName}/completions?api-version=${this.config.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<AzureOpenAICompletionResponse>;
  }

  private async callChatCompletionAPI(
    deploymentName: string,
    body: Record<string, unknown>
  ): Promise<AzureOpenAIChatCompletionResponse> {
    const url = `${this.config.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<AzureOpenAIChatCompletionResponse>;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    try {
      // Get model info
      const deploymentName = request.model || this.config.deploymentName;
      const model = deploymentName as EmbeddingModel;
      const modelInfo = EMBEDDING_MODELS[model] || EMBEDDING_MODELS[EmbeddingModel.TEXT_EMBEDDING_ADA_002];

      // Validate text length
      const estimatedTokens = estimateTokenCount(request.text);
      if (estimatedTokens > modelInfo.maxTokens) {
        throw new VectorizationError(
          `Text too long: ${estimatedTokens} tokens exceeds model limit of ${modelInfo.maxTokens}`,
          VectorizationErrorCode.TEXT_EXTRACTION_FAILED,
          400,
          { estimatedTokens, maxTokens: modelInfo.maxTokens }
        );
      }

      // Call Azure OpenAI API
      this.monitoring.trackEvent('azure-openai-embedding-request', {
        model: deploymentName,
        textLength: request.text.length,
        estimatedTokens,
      });

      const response = await this.callEmbeddingsAPI(deploymentName, request.text);

      // Extract embedding
      if (!response.data || response.data.length === 0) {
        throw new VectorizationError(
          'No embedding returned from API',
          VectorizationErrorCode.EMBEDDING_API_ERROR,
          500
        );
      }

      const embedding = response.data[0].embedding;
      const tokenCount = response.usage.total_tokens || estimatedTokens;
      const cost = calculateEmbeddingCost(tokenCount, model);

      const executionTime = Date.now() - startTime;

      this.monitoring.trackMetric('embedding-generation-time', executionTime, {
        model: deploymentName,
        tokenCount: tokenCount.toString(),
      });

      this.monitoring.trackMetric('embedding-token-count', tokenCount, {
        model: deploymentName,
      });

      if (cost > 0) {
        this.monitoring.trackMetric('embedding-cost', cost, {
          model: deploymentName,
        });
      }

      return {
        embedding,
        model: deploymentName,
        dimensions: modelInfo.dimensions,
        tokenCount,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.monitoring.trackException(error, {
        component: 'AzureOpenAIService',
        operation: 'generateEmbedding',
        model: request.model || this.config.deploymentName,
        textLength: request.text.length.toString(),
        executionTime: executionTime.toString(),
      });

      // Handle specific OpenAI API errors
      if (error.code === 'insufficient_quota' || error.code === 'quota_exceeded') {
        throw new VectorizationError(
          'Azure OpenAI quota exceeded',
          VectorizationErrorCode.EMBEDDING_API_QUOTA_EXCEEDED,
          429,
          error
        );
      }

      if (error.code === 'rate_limit_exceeded' || error.statusCode === 429) {
        throw new VectorizationError(
          'Azure OpenAI rate limit exceeded',
          VectorizationErrorCode.EMBEDDING_API_RATE_LIMIT,
          429,
          error
        );
      }

      if (error instanceof VectorizationError) {
        throw error;
      }

      throw new VectorizationError(
        `Failed to generate embedding: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
        VectorizationErrorCode.EMBEDDING_API_ERROR,
        500,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(
    texts: string[],
    model?: string
  ): Promise<EmbeddingResponse[]> {
    const startTime = Date.now();

    try {
      const deploymentName = model || this.config.deploymentName;
      const embeddingModel = deploymentName as EmbeddingModel;
      const modelInfo = EMBEDDING_MODELS[embeddingModel] || EMBEDDING_MODELS[EmbeddingModel.TEXT_EMBEDDING_ADA_002];

      // Validate all texts
      for (const text of texts) {
        const estimatedTokens = estimateTokenCount(text);
        if (estimatedTokens > modelInfo.maxTokens) {
          throw new VectorizationError(
            `Text too long: ${estimatedTokens} tokens exceeds model limit of ${modelInfo.maxTokens}`,
            VectorizationErrorCode.TEXT_EXTRACTION_FAILED,
            400
          );
        }
      }

      this.monitoring.trackEvent('azure-openai-batch-embedding-request', {
        model: deploymentName,
        batchSize: texts.length,
        totalCharacters: texts.reduce((sum, t) => sum + t.length, 0),
      });

      // Call Azure OpenAI API with batch
      const response = await this.callEmbeddingsAPI(deploymentName, texts);

      if (!response.data || response.data.length !== texts.length) {
        throw new VectorizationError(
          'Batch embedding count mismatch',
          VectorizationErrorCode.EMBEDDING_API_ERROR,
          500
        );
      }

      const totalTokens = response.usage.total_tokens || 0;
      const cost = calculateEmbeddingCost(totalTokens, embeddingModel);

      const executionTime = Date.now() - startTime;

      this.monitoring.trackMetric('batch-embedding-generation-time', executionTime, {
        model: deploymentName,
        batchSize: texts.length.toString(),
      });

      this.monitoring.trackMetric('batch-embedding-token-count', totalTokens, {
        model: deploymentName,
      });

      if (cost > 0) {
        this.monitoring.trackMetric('batch-embedding-cost', cost, {
          model: deploymentName,
        });
      }

      // Map response to EmbeddingResponse[]
      return response.data.map((item) => ({
        embedding: item.embedding,
        model: deploymentName,
        dimensions: modelInfo.dimensions,
        tokenCount: Math.ceil(totalTokens / texts.length), // Approximate per-embedding token count
      }));
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.monitoring.trackException(error, {
        component: 'AzureOpenAIService',
        operation: 'generateEmbeddingsBatch',
        batchSize: texts.length.toString(),
        executionTime: executionTime.toString(),
      });

      if (error.code === 'insufficient_quota' || error.code === 'quota_exceeded') {
        throw new VectorizationError(
          'Azure OpenAI quota exceeded',
          VectorizationErrorCode.EMBEDDING_API_QUOTA_EXCEEDED,
          429,
          error
        );
      }

      if (error.code === 'rate_limit_exceeded' || error.statusCode === 429) {
        throw new VectorizationError(
          'Azure OpenAI rate limit exceeded',
          VectorizationErrorCode.EMBEDDING_API_RATE_LIMIT,
          429,
          error
        );
      }

      if (error instanceof VectorizationError) {
        throw error;
      }

      throw new VectorizationError(
        `Failed to generate batch embeddings: ${error.message}`,
        VectorizationErrorCode.EMBEDDING_API_ERROR,
        500,
        error
      );
    }
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to generate a simple embedding
      const response = await this.callEmbeddingsAPI(this.config.deploymentName, 'health check');

      return response.data && response.data.length > 0;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'AzureOpenAIService',
        operation: 'healthCheck',
      });
      return false;
    }
  }

  /**
   * Get supported models
   */
  getSupportedModels(): EmbeddingModel[] {
    return Object.keys(EMBEDDING_MODELS).filter(
      (model) => EMBEDDING_MODELS[model as EmbeddingModel].provider === 'azure-openai'
    ) as EmbeddingModel[];
  }

  /**
   * Get model info
   */
  getModelInfo(model: EmbeddingModel) {
    return EMBEDDING_MODELS[model];
  }

  /**
   * Chat completion with system and user messages
   */
  async chat(
    systemPrompt: string,
    userPrompt: string,
    options: AzureOpenAICompletionOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    const deploymentName = options.deploymentName || this.config.deploymentName;

    try {
      this.monitoring.trackEvent('azure-openai-chat-request', {
        model: deploymentName,
      });

      const response = await this.callChatCompletionAPI(deploymentName, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP ?? 0.95,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop,
      });

      const text = response.choices?.[0]?.message?.content?.trim() ?? '';
      const totalTokens = response.usage?.total_tokens ?? 0;

      this.monitoring.trackMetric('azure-openai-chat-time', Date.now() - startTime, {
        model: deploymentName,
      });

      if (totalTokens > 0) {
        this.monitoring.trackMetric('azure-openai-chat-tokens', totalTokens, {
          model: deploymentName,
        });
      }

      return text;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        component: 'AzureOpenAIService',
        operation: 'chat',
        model: deploymentName,
      });

      throw error;
    }
  }

  /**
   * Simple text completion
   */
  async complete(prompt: string, options: AzureOpenAICompletionOptions = {}): Promise<string> {
    const startTime = Date.now();
    const deploymentName = options.deploymentName || this.config.deploymentName;

    try {
      this.monitoring.trackEvent('azure-openai-completion-request', {
        model: deploymentName,
      });

      const response = await this.callCompletionsAPI(deploymentName, {
        prompt,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 512,
        top_p: options.topP ?? 0.95,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop,
      });

      const text = response.choices?.[0]?.text?.trim() ?? '';
      const totalTokens = response.usage?.total_tokens ?? 0;

      this.monitoring.trackMetric('azure-openai-completion-time', Date.now() - startTime, {
        model: deploymentName,
      });

      if (totalTokens > 0) {
        this.monitoring.trackMetric('azure-openai-completion-tokens', totalTokens, {
          model: deploymentName,
        });
      }

      return text;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        component: 'AzureOpenAIService',
        operation: 'complete',
        model: deploymentName,
      });

      throw error;
    }
  }
}

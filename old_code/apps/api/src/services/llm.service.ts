/**
 * LLM Service Interface
 * Simple interface for LLM completion operations used by GroundingService
 */

export interface LLMService {
  complete(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string>;
}

/**
 * Adapter for UnifiedAIClient to LLMService interface
 * Note: This adapter requires an AIConnection and apiKey to be provided
 * For simplicity, we'll use AzureOpenAI adapter instead when UnifiedAIClient is not directly usable
 */
export class UnifiedAIClientLLMAdapter implements LLMService {
  constructor(
    private unifiedAIClient: any, // UnifiedAIClient
    private aiConnection: any, // AIConnection
    private apiKey: string,
    private defaultModelId: string = 'gpt-4o-mini'
  ) {}

  async complete(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const result = await this.unifiedAIClient.chat(
      this.aiConnection,
      this.apiKey,
      {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4000, // Default max tokens to prevent undefined
      }
    );

    return result.content || '';
  }
}

/**
 * Adapter for AzureOpenAIService to LLMService interface
 */
export class AzureOpenAILLMAdapter implements LLMService {
  constructor(private azureOpenAI: any) {} // AzureOpenAIService

  async complete(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const result = await this.azureOpenAI.complete(prompt, {
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens,
    });

    return result.text || '';
  }
}


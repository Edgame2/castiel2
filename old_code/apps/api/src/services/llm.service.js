/**
 * LLM Service Interface
 * Simple interface for LLM completion operations used by GroundingService
 */
/**
 * Adapter for UnifiedAIClient to LLMService interface
 * Note: This adapter requires an AIConnection and apiKey to be provided
 * For simplicity, we'll use AzureOpenAI adapter instead when UnifiedAIClient is not directly usable
 */
export class UnifiedAIClientLLMAdapter {
    unifiedAIClient;
    aiConnection;
    apiKey;
    defaultModelId;
    constructor(unifiedAIClient, // UnifiedAIClient
    aiConnection, // AIConnection
    apiKey, defaultModelId = 'gpt-4o-mini') {
        this.unifiedAIClient = unifiedAIClient;
        this.aiConnection = aiConnection;
        this.apiKey = apiKey;
        this.defaultModelId = defaultModelId;
    }
    async complete(prompt, options) {
        const result = await this.unifiedAIClient.chat(this.aiConnection, this.apiKey, {
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: options?.temperature ?? 0.7,
            maxTokens: options?.maxTokens ?? 4000, // Default max tokens to prevent undefined
        });
        return result.content || '';
    }
}
/**
 * Adapter for AzureOpenAIService to LLMService interface
 */
export class AzureOpenAILLMAdapter {
    azureOpenAI;
    constructor(azureOpenAI) {
        this.azureOpenAI = azureOpenAI;
    } // AzureOpenAIService
    async complete(prompt, options) {
        const result = await this.azureOpenAI.complete(prompt, {
            temperature: options?.temperature ?? 0.7,
            maxTokens: options?.maxTokens,
        });
        return result.text || '';
    }
}
//# sourceMappingURL=llm.service.js.map
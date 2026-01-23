/**
 * Unified AI Client Service
 * Provider-agnostic client that can call any AI provider (OpenAI, Anthropic, Google, Cohere, etc.)
 * Routes requests to the appropriate provider SDK based on connection details
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIConnection } from '@castiel/shared-types';
/**
 * Tool/Function definition for function calling
 */
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
/**
 * Tool call from the AI model
 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * Chat message with tool calls support
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    toolCallId?: string;
    toolCalls?: ToolCall[];
}
/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream?: boolean;
    stopSequences?: string[];
    tools?: ToolDefinition[];
    toolChoice?: 'auto' | 'none' | {
        type: 'function';
        function: {
            name: string;
        };
    };
}
/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
    content: string | null;
    toolCalls?: ToolCall[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
    model: string;
}
/**
 * Unified AI Client
 * Handles all provider-specific API calls
 */
export declare class UnifiedAIClient {
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Send chat completion request to appropriate provider
     */
    chat(connection: AIConnection, apiKey: string, request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    /**
     * Determine provider from connection
     */
    private getProvider;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Call Azure OpenAI API
     */
    private callAzureOpenAI;
    /**
     * Call Anthropic Claude API
     */
    private callAnthropic;
    /**
     * Call Google Vertex AI API
     */
    private callGoogleVertex;
    /**
     * Call Cohere API
     */
    private callCohere;
    /**
     * Stream chat completion with provider-specific streaming support
     */
    chatStream(connection: AIConnection, apiKey: string, request: ChatCompletionRequest): AsyncGenerator<{
        delta: string;
        done: boolean;
        usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    }>;
    /**
     * Stream Azure OpenAI chat completion using Server-Sent Events
     */
    private streamAzureOpenAI;
    /**
     * Stream OpenAI chat completion using Server-Sent Events
     */
    private streamOpenAI;
    /**
     * Parse a single SSE line and extract delta content
     * Helper method for fallback parsing
     */
    private parseSSELine;
}
//# sourceMappingURL=unified-ai-client.service.d.ts.map
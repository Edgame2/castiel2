// @ts-nocheck - Optional AI service, not used by workers
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
    parameters: Record<string, unknown>; // JSON Schema
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
    arguments: string; // JSON string
  };
}

/**
 * Chat message with tool calls support
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCallId?: string; // For tool role messages
  toolCalls?: ToolCall[]; // For assistant messages with function calls
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
  tools?: ToolDefinition[]; // Function calling support
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  content: string | null; // null if only tool calls
  toolCalls?: ToolCall[]; // Function calls made by the model
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
export class UnifiedAIClient {
  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Send chat completion request to appropriate provider
   */
  async chat(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();

    try {
      // Get provider from connection's modelId or explicit provider field
      const provider = this.getProvider(connection);

      this.monitoring.trackEvent('unified-ai-client.chat-request', {
        provider,
        modelId: connection.modelId,
        connectionId: connection.id,
      });

      let response: ChatCompletionResponse;

      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(connection, apiKey, request);
          break;
        case 'azure_openai':
          response = await this.callAzureOpenAI(connection, apiKey, request);
          break;
        case 'anthropic':
          response = await this.callAnthropic(connection, apiKey, request);
          break;
        case 'google_vertex':
          response = await this.callGoogleVertex(connection, apiKey, request);
          break;
        case 'cohere':
          response = await this.callCohere(connection, apiKey, request);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      this.monitoring.trackEvent('unified-ai-client.chat-success', {
        provider,
        modelId: connection.modelId,
        latencyMs: Date.now() - startTime,
        totalTokens: response.usage.totalTokens,
      });

      return response;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'unified-ai-client.chat',
        modelId: connection.modelId,
        connectionId: connection.id,
      });
      throw error;
    }
  }

  /**
   * Determine provider from connection
   */
  private getProvider(connection: AIConnection): string {
    // Check if endpoint contains provider hints
    const endpoint = connection.endpoint.toLowerCase();
    
    // Azure patterns: openai.azure.com or cognitiveservices.azure.com
    if (endpoint.includes('openai.azure.com') || endpoint.includes('cognitiveservices.azure.com')) {
      return 'azure_openai';
    }
    if (endpoint.includes('api.openai.com')) {
      return 'openai';
    }
    if (endpoint.includes('api.anthropic.com')) {
      return 'anthropic';
    }
    if (endpoint.includes('googleapis.com') || endpoint.includes('vertex')) {
      return 'google_vertex';
    }
    if (endpoint.includes('api.cohere.ai')) {
      return 'cohere';
    }

    // Fallback: infer from modelId
    const modelId = connection.modelId.toLowerCase();
    if (modelId.startsWith('gpt-') || modelId.includes('text-embedding')) {
      return endpoint.includes('azure') ? 'azure_openai' : 'openai';
    }
    if (modelId.startsWith('claude-')) {
      return 'anthropic';
    }
    if (modelId.startsWith('gemini-')) {
      return 'google_vertex';
    }
    if (modelId.startsWith('command-') || modelId.startsWith('embed-')) {
      return 'cohere';
    }

    throw new Error(`Cannot determine provider for connection: ${connection.id}`);
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${connection.endpoint}/v1/chat/completions`;

    // Convert messages to OpenAI format (handle tool messages)
    const messages = request.messages.map(msg => {
      const openAIMsg: any = {
        role: msg.role,
        content: msg.content,
      };
      
      // Add tool calls if present (assistant messages)
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        openAIMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }
      
      // Add tool_call_id for tool role messages
      if (msg.role === 'tool' && msg.toolCallId) {
        openAIMsg.tool_call_id = msg.toolCallId;
      }
      
      return openAIMsg;
    });

    const body: any = {
      model: connection.modelId,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
      top_p: request.topP ?? 1,
      stop: request.stopSequences,
      stream: false,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        type: tool.type,
        function: tool.function,
      }));
      
      // Add tool_choice if specified
      if (request.toolChoice) {
        if (typeof request.toolChoice === 'string') {
          body.tool_choice = request.toolChoice;
        } else {
          body.tool_choice = {
            type: request.toolChoice.type,
            function: request.toolChoice.function,
          };
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('OpenAI API returned no choices');
    }
    const choice = data.choices[0];
    if (!choice || !choice.message) {
      throw new Error('OpenAI API returned invalid choice structure');
    }
    const message = choice.message;
    
    // Extract tool calls if present
    const toolCalls: ToolCall[] | undefined = message.tool_calls
      ? message.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))
      : undefined;

    return {
      content: message.content || null,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
      model: data.model,
    };
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deploymentName = connection.deploymentName || connection.modelId;
    
    // Normalize endpoint: remove trailing /openai/ if present
    let baseEndpoint = connection.endpoint.trim();
    if (baseEndpoint.endsWith('/openai/')) {
      baseEndpoint = baseEndpoint.slice(0, -8); // Remove '/openai/'
    } else if (baseEndpoint.endsWith('/openai')) {
      baseEndpoint = baseEndpoint.slice(0, -7); // Remove '/openai'
    }
    
    const url = `${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    // Convert messages to Azure OpenAI format (handle tool messages)
    const messages = request.messages.map(msg => {
      const azureMsg: any = {
        role: msg.role,
        content: msg.content,
      };
      
      // Add tool calls if present (assistant messages)
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        azureMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }
      
      // Add tool_call_id for tool role messages
      if (msg.role === 'tool' && msg.toolCallId) {
        azureMsg.tool_call_id = msg.toolCallId;
      }
      
      return azureMsg;
    });

    const body: any = {
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
      top_p: request.topP ?? 1,
      stop: request.stopSequences,
      stream: false,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        type: tool.type,
        function: tool.function,
      }));
      
      // Add tool_choice if specified
      if (request.toolChoice) {
        if (typeof request.toolChoice === 'string') {
          body.tool_choice = request.toolChoice;
        } else {
          body.tool_choice = {
            type: request.toolChoice.type,
            function: request.toolChoice.function,
          };
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Azure OpenAI API returned no choices');
    }
    const choice = data.choices[0];
    if (!choice || !choice.message) {
      throw new Error('Azure OpenAI API returned invalid choice structure');
    }
    const message = choice.message;
    
    // Extract tool calls if present
    const toolCalls: ToolCall[] | undefined = message.tool_calls
      ? message.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))
      : undefined;

    return {
      content: message.content || null,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
      model: data.model,
    };
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${connection.endpoint}/v1/messages`;

    // Anthropic requires system message separate from messages array
    const systemMessage = request.messages.find(m => m.role === 'system');
    
    // Convert messages to Anthropic format
    // Anthropic uses a different message format with content blocks
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => {
        // Handle tool messages (tool role with tool_call_id)
        if (m.role === 'tool' && m.toolCallId) {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId,
                content: m.content || '',
              },
            ],
          };
        }
        
        // Handle assistant messages with tool calls
        if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
          const content: any[] = [];
          if (m.content) {
            content.push({ type: 'text', text: m.content });
          }
          // Add tool use blocks
          m.toolCalls.forEach(tc => {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          });
          return { role: 'assistant', content };
        }
        
        // Regular text messages
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || '',
        };
      });

    const body: any = {
      model: connection.modelId,
      messages,
      max_tokens: request.maxTokens ?? 4000,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP ?? 1,
      stop_sequences: request.stopSequences,
    };

    if (systemMessage?.content) {
      body.system = systemMessage.content;
    }

    // Add tools if provided (Anthropic format)
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters, // JSON Schema
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Extract content and tool calls from Anthropic response
    let content: string | null = null;
    const toolCalls: ToolCall[] = [];
    
    // Anthropic returns content as an array of blocks
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          content = (content || '') + block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : data.stop_reason === 'end_turn' ? 'stop' : 'length',
      model: data.model,
    };
  }

  /**
   * Call Google Vertex AI API
   */
  private async callGoogleVertex(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    // Google Vertex uses a different format
    // This is a simplified implementation - actual Vertex requires service account auth
    // Note: Function calling support for Google Vertex is not yet implemented
    if (request.tools && request.tools.length > 0) {
      this.monitoring.trackEvent('unified-ai-client.function-calling-not-supported', {
        provider: 'google_vertex',
        modelId: connection.modelId,
      });
      // For now, log a warning but continue without tools
      // TODO: Implement Google Vertex function calling when needed
    }

    const url = `${connection.endpoint}/v1/models/${connection.modelId}:generateContent`;

    // Convert messages to Gemini format (filter out tool messages for now)
    const contents = request.messages
      .filter(m => m.role !== 'system' && m.role !== 'tool')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

    const systemInstruction = request.messages.find(m => m.role === 'system')?.content;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 4000,
          topP: request.topP ?? 1,
          stopSequences: request.stopSequences,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Google Vertex API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const usage = data.usageMetadata || {};

    return {
      content,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
      finishReason: data.candidates[0].finishReason === 'STOP' ? 'stop' : 'length',
      model: connection.modelId,
    };
  }

  /**
   * Call Cohere API
   */
  private async callCohere(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${connection.endpoint}/v1/chat`;

    // Cohere uses chat_history format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');
    const lastMessage = userMessages[userMessages.length - 1];
    const chatHistory = userMessages
      .slice(0, -1)
      .map(m => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.content,
      }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: connection.modelId,
        message: lastMessage.content,
        chat_history: chatHistory,
        preamble: systemMessage?.content,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        p: request.topP ?? 1,
        stop_sequences: request.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Cohere API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.text,
      usage: {
        promptTokens: data.meta?.tokens?.input_tokens || 0,
        completionTokens: data.meta?.tokens?.output_tokens || 0,
        totalTokens: (data.meta?.tokens?.input_tokens || 0) + (data.meta?.tokens?.output_tokens || 0),
      },
      finishReason: data.finish_reason === 'COMPLETE' ? 'stop' : 'length',
      model: connection.modelId,
    };
  }

  /**
   * Stream chat completion with provider-specific streaming support
   */
  async *chatStream(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<{ delta: string; done: boolean; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const provider = this.getProvider(connection);

    // Only stream if explicitly requested
    if (!request.stream) {
      // Fall back to non-streaming
      const response = await this.chat(connection, apiKey, request);
      yield { delta: response.content || '', done: true };
      return;
    }

    try {
      switch (provider) {
        case 'azure_openai':
          yield* this.streamAzureOpenAI(connection, apiKey, request);
          break;
        case 'openai':
          yield* this.streamOpenAI(connection, apiKey, request);
          break;
        default:
          // For other providers, fall back to non-streaming
          this.monitoring.trackEvent('unified-ai-client.stream-fallback', {
            provider,
            reason: 'streaming_not_implemented',
          });
          const response = await this.chat(connection, apiKey, request);
          yield { delta: response.content || '', done: true };
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'unified-ai-client.chatStream',
        provider,
        modelId: connection.modelId,
      });
      // Fall back to non-streaming on error
      try {
        const response = await this.chat(connection, apiKey, { ...request, stream: false });
        yield { delta: response.content || '', done: true };
      } catch (fallbackError: any) {
        // If fallback also fails, yield empty content and log error
        this.monitoring.trackException(fallbackError, {
          operation: 'unified-ai-client.chatStream.fallback',
          provider,
          modelId: connection.modelId,
        });
        yield { delta: '', done: true };
      }
    }
  }

  /**
   * Stream Azure OpenAI chat completion using Server-Sent Events
   */
  private async *streamAzureOpenAI(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<{ delta: string; done: boolean; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deploymentName = connection.deploymentName || connection.modelId;
    
    // Normalize endpoint
    let baseEndpoint = connection.endpoint.trim();
    if (baseEndpoint.endsWith('/openai/')) {
      baseEndpoint = baseEndpoint.slice(0, -8);
    } else if (baseEndpoint.endsWith('/openai')) {
      baseEndpoint = baseEndpoint.slice(0, -7);
    }
    
    const url = `${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        top_p: request.topP ?? 1,
        stop: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Parse Server-Sent Events stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              const delta = this.parseSSELine(line);
              if (delta) {
                yield { delta, done: false };
              }
            }
          }
          yield { delta: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) {
            continue; // Skip empty lines and comments
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              yield { delta: '', done: true };
              return;
            }

            try {
              const chunk = JSON.parse(data);
              
              // Extract delta content
              const delta = chunk.choices?.[0]?.delta?.content || '';
              if (delta) {
                yield { delta, done: false };
              }

              // Check if this is the final chunk and extract usage
              if (chunk.choices?.[0]?.finish_reason) {
                // Extract usage information if available (usually in the final chunk)
                const usage = chunk.usage ? {
                  promptTokens: chunk.usage.prompt_tokens || 0,
                  completionTokens: chunk.usage.completion_tokens || 0,
                  totalTokens: chunk.usage.total_tokens || 0,
                } : undefined;
                yield { delta: '', done: true, usage };
                return;
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              this.monitoring.trackException(parseError as Error, {
                operation: 'unified-ai-client.streamAzureOpenAI.parse',
                line: line.substring(0, 100),
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream OpenAI chat completion using Server-Sent Events
   */
  private async *streamOpenAI(
    connection: AIConnection,
    apiKey: string,
    request: ChatCompletionRequest
  ): AsyncGenerator<{ delta: string; done: boolean; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const url = `${connection.endpoint}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: connection.modelId,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        top_p: request.topP ?? 1,
        stop: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Parse Server-Sent Events stream (same format as Azure OpenAI)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              const delta = this.parseSSELine(line);
              if (delta) {
                yield { delta, done: false };
              }
            }
          }
          yield { delta: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              yield { delta: '', done: true };
              return;
            }

            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta?.content || '';
              if (delta) {
                yield { delta, done: false };
              }

              if (chunk.choices?.[0]?.finish_reason) {
                // Extract usage information if available (usually in the final chunk)
                const usage = chunk.usage ? {
                  promptTokens: chunk.usage.prompt_tokens || 0,
                  completionTokens: chunk.usage.completion_tokens || 0,
                  totalTokens: chunk.usage.total_tokens || 0,
                } : undefined;
                yield { delta: '', done: true, usage };
                return;
              }
            } catch (parseError) {
              this.monitoring.trackException(parseError as Error, {
                operation: 'unified-ai-client.streamOpenAI.parse',
                line: line.substring(0, 100),
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse a single SSE line and extract delta content
   * Helper method for fallback parsing
   */
  private parseSSELine(line: string): string {
    if (!line.startsWith('data: ')) {
      return '';
    }

    const data = line.slice(6);
    if (data === '[DONE]') {
      return '';
    }

    try {
      const chunk = JSON.parse(data);
      return chunk.choices?.[0]?.delta?.content || '';
    } catch {
      return '';
    }
  }
}

import { HttpClient } from '@coder/shared';
import { getDatabaseClient } from '@coder/shared';

export interface CompletionRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  organizationId?: string;
  userId?: string;
}

export interface CompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class CompletionService {
  private db = getDatabaseClient();
  private openaiClient: HttpClient | null = null;

  constructor() {
    // Initialize OpenAI client if API key available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openaiClient = new HttpClient({
        baseUrl: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      });
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || 'gpt-4';
    
    // Record completion in database
    const completion = await (this.db as any).ai_completions.create({
      data: {
        modelId: model,
        request: request as any,
        status: 'pending',
      },
    });

    try {
      // Call OpenAI API (simplified - in production, use ModelRouter)
      if (!this.openaiClient) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await this.openaiClient.post('/chat/completions', {
        model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens,
        stream: request.stream || false,
      });

      // Update completion record
      await (this.db as any).ai_completions.update({
        where: { id: completion.id },
        data: {
          response: response as any,
          status: 'completed',
          tokensUsed: (response as any).usage?.total_tokens || 0,
          durationMs: Date.now() - completion.createdAt.getTime(),
        },
      });

      return {
        id: completion.id,
        model,
        choices: (response as any).choices || [],
        usage: (response as any).usage,
      };
    } catch (error: any) {
      // Update completion record with error
      await (this.db as any).ai_completions.update({
        where: { id: completion.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      throw error;
    }
  }
}

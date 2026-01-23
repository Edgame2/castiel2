import { getDatabaseClient } from '@coder/shared';

export class ModelService {
  private db = getDatabaseClient();

  async listModels() {
    // Return available models (can be extended to query database)
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextWindow: 8192,
        maxTokens: 4096,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 4096,
        maxTokens: 4096,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        maxTokens: 8192,
      },
      {
        id: 'llama2',
        name: 'Llama 2',
        provider: 'ollama',
        contextWindow: 4096,
        maxTokens: 2048,
      },
    ];
  }

  async getModel(id: string) {
    const models = await this.listModels();
    return models.find(m => m.id === id) || null;
  }
}

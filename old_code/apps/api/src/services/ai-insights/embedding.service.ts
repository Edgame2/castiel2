import type { IMonitoringProvider } from '@castiel/monitoring';
import OpenAI from 'openai';

export interface EmbeddingOptions {
    model?: string;
}

export class EmbeddingService {
    private client: OpenAI | null = null;
    private deploymentName: string;
    private isEnabled: boolean = false;

    constructor(
        private monitoring: IMonitoringProvider,
        endpoint?: string,
        apiKey?: string,
        deploymentName = 'text-embedding-ada-002'
    ) {
        if (!endpoint || !apiKey) {
            this.monitoring?.trackEvent('embedding.service.disabled', { reason: 'azure-openai-not-configured' });
            this.isEnabled = false;
            this.deploymentName = deploymentName;
            return;
        }

        this.isEnabled = true;
        // Use OpenAI SDK with Azure configuration
        this.client = new OpenAI({
            apiKey,
            baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            defaultHeaders: { 'api-key': apiKey },
        });
        this.deploymentName = deploymentName;
    }

    async embed(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
        if (!this.isEnabled || !this.client) {
            // Return empty embeddings when service is disabled
            return texts.map(() => []);
        }

        try {
            const response = await this.client.embeddings.create({
                input: texts,
                model: this.deploymentName,
            });

            return response.data.map((d) => d.embedding);
        } catch (error: any) {
            this.monitoring?.trackException(error, { operation: 'embedding.generate' });
            throw error;
        }
    }
}

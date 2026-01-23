import OpenAI from 'openai';
export class EmbeddingService {
    monitoring;
    client = null;
    deploymentName;
    isEnabled = false;
    constructor(monitoring, endpoint, apiKey, deploymentName = 'text-embedding-ada-002') {
        this.monitoring = monitoring;
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
    async embed(texts, options) {
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
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'embedding.generate' });
            throw error;
        }
    }
}
//# sourceMappingURL=embedding.service.js.map
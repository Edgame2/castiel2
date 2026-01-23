import type { IMonitoringProvider } from '@castiel/monitoring';
export interface EmbeddingOptions {
    model?: string;
}
export declare class EmbeddingService {
    private monitoring;
    private client;
    private deploymentName;
    private isEnabled;
    constructor(monitoring: IMonitoringProvider, endpoint?: string, apiKey?: string, deploymentName?: string);
    embed(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
}
//# sourceMappingURL=embedding.service.d.ts.map
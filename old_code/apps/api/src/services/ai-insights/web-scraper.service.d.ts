import type { IMonitoringProvider } from '@castiel/monitoring';
export interface ScrapeResult {
    url: string;
    title: string;
    content: string;
    durationMs: number;
}
export declare class WebScraperService {
    private monitoring;
    private browser;
    constructor(monitoring: IMonitoringProvider);
    private getBrowser;
    scrape(url: string): Promise<ScrapeResult>;
    close(): Promise<void>;
}
//# sourceMappingURL=web-scraper.service.d.ts.map
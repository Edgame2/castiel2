/**
 * Chart Generation Service
 *
 * Generates chart images from placeholder configurations
 * Supports multiple chart types and data sources
 *
 * Uses Puppeteer with Chart.js (via CDN) to render charts to PNG images
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { PlaceholderDefinition, PlaceholderConfiguration, DocumentTemplate } from '../types/template.types.js';
import type { ShardRepository } from '../../../repositories/shard.repository.js';
import type { InsightService } from '../../../services/insight.service.js';
/**
 * Chart data point
 */
export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}
/**
 * Chart generation result
 */
export interface ChartGenerationResult {
    imageBuffer: Buffer;
    mimeType: string;
    width: number;
    height: number;
}
/**
 * Chart Generation Service
 */
export declare class ChartGenerationService {
    private monitoring;
    private shardRepository?;
    private insightService?;
    constructor(monitoring: IMonitoringProvider, shardRepository?: ShardRepository | undefined, insightService?: InsightService | undefined);
    /**
     * Generate chart image for a placeholder
     *
     * @param placeholder Placeholder definition
     * @param config Placeholder configuration (must include chartConfig)
     * @param template Document template (for dominant colors)
     * @param context Optional context (projectId, variables, etc.)
     * @returns Chart image buffer or null if generation fails
     */
    generateChart(placeholder: PlaceholderDefinition, config: PlaceholderConfiguration, template: DocumentTemplate, context?: {
        projectId?: string;
        variables?: Record<string, string>;
    }): Promise<Buffer | null>;
    /**
     * Get chart data from various sources
     *
     * Supports:
     * - Manual data (from context.variables)
     * - Shard data (extract from related shards via contextTemplateId)
     * - API endpoints (from config.dataSource)
     * - AI-generated data (using InsightService)
     */
    private getChartData;
    /**
     * Extract manual chart data from context variables
     * Expected format: { "chartName": "[{\"label\": \"A\", \"value\": 10}, ...]" } or
     * { "chartName_data": "[{\"label\": \"A\", \"value\": 10}, ...]" } or
     * { "chartName_label0": "A", "chartName_value0": "10", ... }
     */
    private extractManualChartData;
    /**
     * Extract chart data from shards
     */
    private extractShardChartData;
    /**
     * Fetch chart data from API endpoint
     */
    private fetchApiChartData;
    /**
     * Generate chart data using AI (InsightService)
     */
    private generateAiChartData;
    /**
     * Check if a string is a valid URL
     */
    private isUrl;
    /**
     * Prepare chart colors from template dominant colors
     */
    private prepareChartColors;
    /**
     * Render chart to image buffer using Puppeteer and Chart.js
     *
     * Uses Puppeteer to render an HTML page with Chart.js (via CDN) and takes a screenshot
     */
    private renderChart;
    /**
     * Generate HTML page with Chart.js chart
     */
    private generateChartHTML;
    /**
     * Map our chart type to Chart.js chart type
     */
    private mapChartTypeToChartJS;
    /**
     * Generate Chart.js configuration object
     */
    private generateChartJSConfig;
    /**
     * Adjust color brightness (helper for border colors)
     */
    private adjustColorBrightness;
}
//# sourceMappingURL=chart-generation.service.d.ts.map
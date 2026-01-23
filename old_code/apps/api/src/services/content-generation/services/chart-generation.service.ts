// @ts-nocheck - Content generation service, not directly used by workers (has DOM dependencies)
/**
 * Chart Generation Service
 * 
 * Generates chart images from placeholder configurations
 * Supports multiple chart types and data sources
 * 
 * Uses Puppeteer with Chart.js (via CDN) to render charts to PNG images
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { PlaceholderDefinition, PlaceholderConfiguration, ChartConfiguration, DocumentTemplate } from '../types/template.types.js';
import puppeteer from 'puppeteer';
import type {
  ShardRepository,
  InsightService,
} from '@castiel/api-core';

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
  mimeType: string; // 'image/png' or 'image/svg+xml'
  width: number;
  height: number;
}

/**
 * Chart Generation Service
 */
export class ChartGenerationService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository?: ShardRepository,
    private insightService?: InsightService
  ) {}

  /**
   * Generate chart image for a placeholder
   * 
   * @param placeholder Placeholder definition
   * @param config Placeholder configuration (must include chartConfig)
   * @param template Document template (for dominant colors)
   * @param context Optional context (projectId, variables, etc.)
   * @returns Chart image buffer or null if generation fails
   */
  async generateChart(
    placeholder: PlaceholderDefinition,
    config: PlaceholderConfiguration,
    template: DocumentTemplate,
    context?: { projectId?: string; variables?: Record<string, string> }
  ): Promise<Buffer | null> {
    if (!config.chartConfig) {
      this.monitoring.trackEvent('content_generation.chart.skipped', {
        placeholderName: placeholder.name,
        reason: 'no_chart_config',
      });
      return null;
    }

    try {
      // Step 1: Extract or generate chart data
      const chartData = await this.getChartData(
        config,
        template,
        context
      );

      if (!chartData || chartData.length === 0) {
        this.monitoring.trackEvent('content_generation.chart.skipped', {
          placeholderName: placeholder.name,
          reason: 'no_data',
        });
        return null;
      }

      // Step 2: Prepare chart colors
      const colors = this.prepareChartColors(
        config.chartConfig,
        template.dominantColors || []
      );

      // Step 3: Render chart to image
      const chartImage = await this.renderChart(
        config.chartConfig.chartType,
        chartData,
        colors,
        config.chartConfig
      );

      this.monitoring.trackEvent('content_generation.chart.generated', {
        placeholderName: placeholder.name,
        chartType: config.chartConfig.chartType,
        dataPoints: chartData.length,
      });

      return chartImage;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'chart.generation',
        placeholderName: placeholder.name,
        chartType: config.chartConfig?.chartType,
      });
      return null;
    }
  }

  /**
   * Get chart data from various sources
   * 
   * Supports:
   * - Manual data (from context.variables)
   * - Shard data (extract from related shards via contextTemplateId)
   * - API endpoints (from config.dataSource)
   * - AI-generated data (using InsightService)
   */
  private async getChartData(
    config: PlaceholderConfiguration,
    template: DocumentTemplate,
    context?: { projectId?: string; variables?: Record<string, string> }
  ): Promise<ChartDataPoint[] | null> {
    const chartConfig = config.chartConfig;
    if (!chartConfig) {
      return null;
    }

    // Priority 1: Manual data from context.variables
    if (context?.variables) {
      const manualData = this.extractManualChartData(context.variables, config.placeholderName);
      if (manualData && manualData.length > 0) {
        this.monitoring.trackEvent('content_generation.chart.data_source', {
          source: 'manual',
          placeholderName: config.placeholderName,
          dataPoints: manualData.length,
        });
        return manualData;
      }
    }

    // Priority 2: Shard data (via contextTemplateId or projectId)
    if (config.contextTemplateId || context?.projectId) {
      const shardData = await this.extractShardChartData(
        config,
        template,
        context
      );
      if (shardData && shardData.length > 0) {
        this.monitoring.trackEvent('content_generation.chart.data_source', {
          source: 'shards',
          placeholderName: config.placeholderName,
          dataPoints: shardData.length,
        });
        return shardData;
      }
    }

    // Priority 3: API endpoint (if dataSource is a URL)
    if (chartConfig.dataSource && this.isUrl(chartConfig.dataSource)) {
      const apiData = await this.fetchApiChartData(chartConfig.dataSource);
      if (apiData && apiData.length > 0) {
        this.monitoring.trackEvent('content_generation.chart.data_source', {
          source: 'api',
          placeholderName: config.placeholderName,
          dataPoints: apiData.length,
        });
        return apiData;
      }
    }

    // Priority 4: AI-generated data (using InsightService)
    if (this.insightService && config.description) {
      const aiData = await this.generateAiChartData(
        config,
        template,
        context
      );
      if (aiData && aiData.length > 0) {
        this.monitoring.trackEvent('content_generation.chart.data_source', {
          source: 'ai',
          placeholderName: config.placeholderName,
          dataPoints: aiData.length,
        });
        return aiData;
      }
    }

    // Fallback: Return empty array if no data source available
    this.monitoring.trackEvent('content_generation.chart.no_data', {
      placeholderName: config.placeholderName,
      dataSource: chartConfig.dataSource,
    });
    return null;
  }

  /**
   * Extract manual chart data from context variables
   * Expected format: { "chartName": "[{\"label\": \"A\", \"value\": 10}, ...]" } or
   * { "chartName_data": "[{\"label\": \"A\", \"value\": 10}, ...]" } or
   * { "chartName_label0": "A", "chartName_value0": "10", ... }
   */
  private extractManualChartData(
    variables: Record<string, string>,
    placeholderName: string
  ): ChartDataPoint[] | null {
    // Try JSON format first - check both placeholderName and placeholderName_data
    const jsonKeys = [`${placeholderName}_data`, placeholderName];
    for (const jsonKey of jsonKeys) {
      if (variables[jsonKey]) {
        try {
          const parsed = JSON.parse(variables[jsonKey]);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              label: String(item.label || item.name || ''),
              value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value || 0)),
              color: item.color,
            })).filter((item: ChartDataPoint) => item.label && !isNaN(item.value));
          }
        } catch (e) {
          // Not JSON, try other formats
        }
      }
    }

    // Try key-value pairs: placeholderName_label0, placeholderName_value0, etc.
    const dataPoints: ChartDataPoint[] = [];
    let index = 0;
    while (true) {
      const labelKey = `${placeholderName}_label${index}`;
      const valueKey = `${placeholderName}_value${index}`;
      
      if (!variables[labelKey] && !variables[valueKey]) {
        break; // No more data points
      }

      const label = variables[labelKey] || `Item ${index + 1}`;
      const valueStr = variables[valueKey] || '0';
      const value = parseFloat(valueStr);

      if (!isNaN(value)) {
        dataPoints.push({
          label,
          value,
          color: variables[`${placeholderName}_color${index}`],
        });
      }
      index++;
    }

    return dataPoints.length > 0 ? dataPoints : null;
  }

  /**
   * Extract chart data from shards
   */
  private async extractShardChartData(
    config: PlaceholderConfiguration,
    template: DocumentTemplate,
    context?: { projectId?: string; variables?: Record<string, string> }
  ): Promise<ChartDataPoint[] | null> {
    if (!this.shardRepository) {
      return null;
    }

    try {
      // Determine tenantId from template
      const tenantId = template.tenantId;
      if (!tenantId) {
        return null;
      }

      // Get context shard (either from contextTemplateId or projectId)
      let contextShardId = config.contextTemplateId || context?.projectId;
      if (!contextShardId) {
        contextShardId = template.contextTemplateId;
      }

      if (!contextShardId) {
        return null;
      }

      // Get the context shard
      const contextShard = await this.shardRepository.findById(contextShardId, tenantId);
      if (!contextShard) {
        return null;
      }

      // Extract data from structuredData
      // For now, we'll look for common numeric fields and create data points
      const dataPoints: ChartDataPoint[] = [];
      const structuredData = contextShard.structuredData || {};

      // Try to extract array of numeric values
      // Look for fields that might contain chart data (amounts, values, counts, etc.)
      const numericFields = ['amount', 'value', 'count', 'quantity', 'price', 'cost', 'revenue', 'sales'];
      
      for (const field of numericFields) {
        if (structuredData[field] !== undefined) {
          const value = typeof structuredData[field] === 'number' 
            ? structuredData[field] 
            : parseFloat(String(structuredData[field]));
          
          if (!isNaN(value)) {
            dataPoints.push({
              label: field.charAt(0).toUpperCase() + field.slice(1),
              value,
            });
            break; // Use first found numeric field
          }
        }
      }

      // If no single value found, try to extract array data
      if (dataPoints.length === 0) {
        // Look for arrays in structuredData
        for (const [, value] of Object.entries(structuredData)) {
          if (Array.isArray(value) && value.length > 0) {
            // Check if array contains objects with numeric values
            const firstItem = value[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              // Try to find label and value fields
              const labelField = Object.keys(firstItem).find(k => 
                ['label', 'name', 'title', 'category'].includes(k.toLowerCase())
              );
              const valueField = Object.keys(firstItem).find(k => 
                ['value', 'amount', 'count', 'quantity'].includes(k.toLowerCase())
              );

              if (labelField && valueField) {
                return value.map((item: any) => ({
                  label: String(item[labelField] || ''),
                  value: typeof item[valueField] === 'number' 
                    ? item[valueField] 
                    : parseFloat(String(item[valueField] || 0)),
                })).filter((item: ChartDataPoint) => item.label && !isNaN(item.value));
              }
            }
          }
        }
      }

      return dataPoints.length > 0 ? dataPoints : null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'chart.extractShardData',
        placeholderName: config.placeholderName,
      });
      return null;
    }
  }

  /**
   * Fetch chart data from API endpoint
   */
  private async fetchApiChartData(url: string): Promise<ChartDataPoint[] | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Try to parse common API response formats
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          label: String(item.label || item.name || item.category || ''),
          value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value || 0)),
          color: item.color,
        })).filter((item: ChartDataPoint) => item.label && !isNaN(item.value));
      }

      if (data.data && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          label: String(item.label || item.name || item.category || ''),
          value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value || 0)),
          color: item.color,
        })).filter((item: ChartDataPoint) => item.label && !isNaN(item.value));
      }

      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'chart.fetchApiData',
        url,
      });
      return null;
    }
  }

  /**
   * Generate chart data using AI (InsightService)
   */
  private async generateAiChartData(
    config: PlaceholderConfiguration,
    template: DocumentTemplate,
    context?: { projectId?: string; variables?: Record<string, string> }
  ): Promise<ChartDataPoint[] | null> {
    if (!this.insightService || !config.description) {
      return null;
    }

    try {
      // Build prompt for AI to generate chart data
      const prompt = `Generate chart data as a JSON array of objects with "label" and "value" fields. ${config.description}. Return only valid JSON array, no other text.`;

      const insightRequest = {
        tenantId: template.tenantId,
        userId: template.userId,
        query: prompt,
        scope: context?.projectId ? { projectId: context.projectId } : undefined,
        options: {
          format: 'detailed' as const,
          maxTokens: 500,
        },
      };

      const response = await this.insightService.generate(
        template.tenantId,
        template.userId,
        insightRequest
      );

      if (response && 'content' in response && response.content) {
        try {
          // Try to parse JSON from response
          const jsonMatch = response.content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              return parsed.map((item: any) => ({
                label: String(item.label || item.name || ''),
                value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value || 0)),
              })).filter((item: ChartDataPoint) => item.label && !isNaN(item.value));
            }
          }
        } catch (parseError) {
          // Failed to parse, return null
        }
      }

      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'chart.generateAiData',
        placeholderName: config.placeholderName,
      });
      return null;
    }
  }

  /**
   * Check if a string is a valid URL
   */
  private isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prepare chart colors from template dominant colors
   */
  private prepareChartColors(
    chartConfig: ChartConfiguration,
    templateColors: string[]
  ): string[] {
    // Use chartConfig colors if provided, otherwise use template colors
    if (chartConfig.colors && chartConfig.colors.length > 0) {
      return chartConfig.colors;
    }

    if (templateColors.length > 0) {
      return templateColors;
    }

    // Default color palette
    return [
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f59e0b', // amber
      '#ef4444', // red
    ];
  }

  /**
   * Render chart to image buffer using Puppeteer and Chart.js
   * 
   * Uses Puppeteer to render an HTML page with Chart.js (via CDN) and takes a screenshot
   */
  private async renderChart(
    chartType: ChartConfiguration['chartType'],
    data: ChartDataPoint[],
    colors: string[],
    config: ChartConfiguration
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport size for consistent chart rendering
      await page.setViewport({ width: 800, height: 600 });

      // Generate HTML with Chart.js
      const html = this.generateChartHTML(chartType, data, colors, config);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Wait for chart to render (Chart.js needs a moment to draw)
      // Wait for canvas to be rendered with content
      await page.waitForFunction(() => {
        const canvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
        return canvas && canvas.width > 0 && canvas.height > 0;
      }, { timeout: 5000 });
      
      // Additional small delay to ensure chart is fully drawn
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Take screenshot of the canvas element
      const screenshot = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
      });

      return Buffer.from(screenshot);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'chart.renderChart',
        chartType,
        dataPoints: data.length,
      });
      throw new Error(`Failed to render chart: ${(error as Error).message}`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML page with Chart.js chart
   */
  private generateChartHTML(
    chartType: ChartConfiguration['chartType'],
    data: ChartDataPoint[],
    colors: string[],
    config: ChartConfiguration
  ): string {
    // Map chart types to Chart.js types
    const chartJsType = this.mapChartTypeToChartJS(chartType);
    
    // Prepare data for Chart.js
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const dataColors = data.map((d, i) => d.color || colors[i % colors.length]);

    // Generate Chart.js configuration
    const chartConfig = this.generateChartJSConfig(chartJsType, labels, values, dataColors, config);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 800px;
      height: 600px;
      background: white;
    }
    #chartContainer {
      width: 800px;
      height: 600px;
    }
  </style>
</head>
<body>
  <div id="chartContainer">
    <canvas id="chartCanvas"></canvas>
  </div>
  <script>
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    new Chart(ctx, ${JSON.stringify(chartConfig)});
  </script>
</body>
</html>`;
  }

  /**
   * Map our chart type to Chart.js chart type
   */
  private mapChartTypeToChartJS(chartType: ChartConfiguration['chartType']): string {
    const mapping: Record<ChartConfiguration['chartType'], string> = {
      'bar': 'bar',
      'line': 'line',
      'pie': 'pie',
      'column': 'bar', // Column is bar chart with horizontal bars
      'area': 'line', // Area is line chart with fill
    };
    return mapping[chartType] || 'bar';
  }

  /**
   * Generate Chart.js configuration object
   */
  private generateChartJSConfig(
    chartType: string,
    labels: string[],
    values: number[],
    colors: string[],
    config: ChartConfiguration
  ): any {
    const baseConfig: any = {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: config.labels?.[0] || 'Data',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(c => this.adjustColorBrightness(c, -20)),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: config.showLegend !== false,
            position: 'top',
          },
          tooltip: {
            enabled: true,
          },
        },
        scales: chartType !== 'pie' ? {
          x: {
            display: true,
            grid: {
              display: config.showGrid !== false,
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              display: config.showGrid !== false,
            },
          },
        } : undefined,
      },
    };

    // Special handling for area charts (line with fill)
    if (config.chartType === 'area') {
      baseConfig.data.datasets[0].fill = true;
      baseConfig.data.datasets[0].tension = 0.4;
    }

    // Special handling for column charts (horizontal bar)
    if (config.chartType === 'column') {
      baseConfig.indexAxis = 'y';
    }

    return baseConfig;
  }

  /**
   * Adjust color brightness (helper for border colors)
   */
  private adjustColorBrightness(hex: string, percent: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
    const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
    const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
    
    // Convert back to hex
    return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
  }
}


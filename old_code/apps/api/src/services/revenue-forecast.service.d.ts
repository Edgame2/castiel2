/**
 * Revenue Forecast Service
 * Forecasts revenue per month, quarter, year, and custom ranges
 * Supports multiple scenarios: best, base, risk-adjusted, worst-case
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { OpportunityService } from './opportunity.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
export type ForecastPeriod = 'month' | 'quarter' | 'year' | 'custom';
export interface ForecastRange {
    startDate: Date;
    endDate: Date;
}
export interface ForecastScenario {
    name: 'best' | 'base' | 'risk-adjusted' | 'worst-case';
    revenue: number;
    opportunityCount: number;
    currency: string;
}
export interface RevenueForecast {
    period: ForecastPeriod;
    range: ForecastRange;
    scenarios: ForecastScenario[];
    byPeriod: Array<{
        period: string;
        best: number;
        base: number;
        riskAdjusted: number;
        worstCase: number;
        opportunityCount: number;
    }>;
    calculatedAt: Date;
}
export declare class RevenueForecastService {
    private monitoring;
    private opportunityService;
    private revenueAtRiskService;
    constructor(monitoring: IMonitoringProvider, opportunityService: OpportunityService, revenueAtRiskService: RevenueAtRiskService);
    /**
     * Generate revenue forecast
     */
    generateForecast(userId: string, tenantId: string, period: ForecastPeriod, range?: ForecastRange): Promise<RevenueForecast>;
    /**
     * Get default date range for period
     */
    private getDefaultRange;
    /**
     * Get period key for grouping
     */
    private getPeriodKey;
    /**
     * Calculate scenarios for a period
     */
    private calculatePeriodScenarios;
    /**
     * Calculate overall scenarios
     */
    private calculateOverallScenarios;
}
//# sourceMappingURL=revenue-forecast.service.d.ts.map
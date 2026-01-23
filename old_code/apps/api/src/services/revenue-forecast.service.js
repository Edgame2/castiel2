/**
 * Revenue Forecast Service
 * Forecasts revenue per month, quarter, year, and custom ranges
 * Supports multiple scenarios: best, base, risk-adjusted, worst-case
 */
export class RevenueForecastService {
    monitoring;
    opportunityService;
    revenueAtRiskService;
    constructor(monitoring, opportunityService, revenueAtRiskService) {
        this.monitoring = monitoring;
        this.opportunityService = opportunityService;
        this.revenueAtRiskService = revenueAtRiskService;
    }
    /**
     * Generate revenue forecast
     */
    async generateForecast(userId, tenantId, period, range) {
        const startTime = Date.now();
        try {
            // Determine date range
            const forecastRange = range || this.getDefaultRange(period);
            // Get opportunities in range
            const result = await this.opportunityService.listOwnedOpportunities(userId, tenantId, {
                ownerId: userId,
                status: ['open'],
                closeDateFrom: forecastRange.startDate,
                closeDateTo: forecastRange.endDate,
            }, { limit: 1000 });
            // Group opportunities by period
            const periodMap = new Map();
            for (const opp of result.opportunities) {
                const data = opp.structuredData;
                const closeDate = data?.closeDate ? new Date(data.closeDate) : null;
                if (!closeDate) {
                    continue;
                }
                const periodKey = this.getPeriodKey(closeDate, period);
                if (!periodMap.has(periodKey)) {
                    periodMap.set(periodKey, []);
                }
                periodMap.get(periodKey).push(opp);
            }
            // Calculate scenarios for each period
            const byPeriod = Array.from(periodMap.entries()).map(([periodKey, opportunities]) => {
                return this.calculatePeriodScenarios(opportunities, periodKey);
            });
            // Sort by period
            byPeriod.sort((a, b) => a.period.localeCompare(b.period));
            // Calculate overall scenarios
            const allOpportunities = result.opportunities;
            const overallScenarios = this.calculateOverallScenarios(allOpportunities);
            const forecast = {
                period,
                range: forecastRange,
                scenarios: overallScenarios,
                byPeriod,
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('revenue-forecast.generated', {
                tenantId,
                userId,
                period,
                opportunityCount: allOpportunities.length,
                durationMs: Date.now() - startTime,
            });
            return forecast;
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'revenue-forecast.generateForecast',
                tenantId,
                userId,
                period,
            });
            throw error;
        }
    }
    /**
     * Get default date range for period
     */
    getDefaultRange(period) {
        const now = new Date();
        const startDate = new Date(now);
        let endDate;
        switch (period) {
            case 'month':
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                // Custom - default to next 3 months
                endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        }
        return { startDate, endDate };
    }
    /**
     * Get period key for grouping
     */
    getPeriodKey(date, period) {
        switch (period) {
            case 'month':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            case 'quarter':
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                return `${date.getFullYear()}-Q${quarter}`;
            case 'year':
                return String(date.getFullYear());
            default:
                // Custom - use month
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
    }
    /**
     * Calculate scenarios for a period
     */
    calculatePeriodScenarios(opportunities, periodKey) {
        let best = 0;
        let base = 0;
        let riskAdjusted = 0;
        let worstCase = 0;
        for (const opp of opportunities) {
            const data = opp.structuredData;
            const value = data?.value || 0;
            const expectedRevenue = data?.expectedRevenue || value;
            const probability = data?.probability || 0.5;
            const riskEvaluation = data?.riskEvaluation;
            const riskScore = riskEvaluation?.riskScore || 0;
            const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;
            // Best case: full value with high probability
            best += value * Math.max(probability, 0.8);
            // Base case: expected revenue
            base += expectedRevenue;
            // Risk-adjusted: expected revenue minus revenue at risk
            riskAdjusted += expectedRevenue - revenueAtRisk;
            // Worst case: low probability or high risk
            worstCase += value * Math.min(probability, 0.3);
        }
        return {
            period: periodKey,
            best,
            base,
            riskAdjusted,
            worstCase,
            opportunityCount: opportunities.length,
        };
    }
    /**
     * Calculate overall scenarios
     */
    calculateOverallScenarios(opportunities) {
        let best = 0;
        let base = 0;
        let riskAdjusted = 0;
        let worstCase = 0;
        let currency = 'USD';
        for (const opp of opportunities) {
            const data = opp.structuredData;
            const value = data?.value || 0;
            const expectedRevenue = data?.expectedRevenue || value;
            const probability = data?.probability || 0.5;
            currency = data?.currency || currency;
            const riskEvaluation = data?.riskEvaluation;
            const riskScore = riskEvaluation?.riskScore || 0;
            const revenueAtRisk = riskEvaluation?.revenueAtRisk || 0;
            // Best case
            best += value * Math.max(probability, 0.8);
            // Base case
            base += expectedRevenue;
            // Risk-adjusted
            riskAdjusted += expectedRevenue - revenueAtRisk;
            // Worst case
            worstCase += value * Math.min(probability, 0.3);
        }
        return [
            {
                name: 'best',
                revenue: best,
                opportunityCount: opportunities.length,
                currency,
            },
            {
                name: 'base',
                revenue: base,
                opportunityCount: opportunities.length,
                currency,
            },
            {
                name: 'risk-adjusted',
                revenue: riskAdjusted,
                opportunityCount: opportunities.length,
                currency,
            },
            {
                name: 'worst-case',
                revenue: worstCase,
                opportunityCount: opportunities.length,
                currency,
            },
        ];
    }
}
//# sourceMappingURL=revenue-forecast.service.js.map
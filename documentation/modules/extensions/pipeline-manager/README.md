# Pipeline Manager Module

Sales pipeline and opportunity management service with ML-powered revenue forecasting.

**Service**: `containers/pipeline-manager/`  
**Port**: 3025  
**API Base**: `/api/v1/pipelines`, `/api/v1/opportunities`  
**Database**: Cosmos DB NoSQL (containers: `pipeline_opportunities`, `pipeline_views`)

## Overview

The Pipeline Manager module provides sales pipeline visualization, opportunity management, and **ML-powered revenue forecasting**. It integrates with the **ML Service** to provide predictive revenue forecasts with uncertainty quantification, transforming forecasting from probability-weighted estimates to ML-powered predictions.

## Features

### Pipeline Management

- **Pipeline Views**: Pipeline visualization and management
- **Opportunity CRUD Operations**: Complete opportunity lifecycle management
- **Opportunity Auto-linking**: Automatic linking to related data (accounts, contacts, activities)

### ML-Enhanced Revenue Forecasting ⭐

The Pipeline Manager module integrates with the ML Service to provide ML-powered revenue forecasting:

- **Opportunity-Level Forecasting**: 
  - Revenue forecasts with uncertainty quantification (P10/P50/P90)
  - Close date forecasts (probability distribution)
  - Risk-adjusted revenue forecasts
  - Scenario analysis (best/base/worst case)
- **Team-Level Forecasting**:
  - Pipeline forecast (total value, weighted by probability)
  - Win rate forecast
  - Quota attainment forecast
  - Risk-adjusted pipeline forecast
- **Tenant-Level Forecasting**:
  - Total revenue forecast
  - Growth rate forecast
  - Industry benchmarking

### Analytics

- **Pipeline Analytics**: Revenue forecasting, pipeline metrics, win rate analysis
- **ML-Enhanced Metrics**: Metrics enhanced with ML predictions
- **Forecast Accuracy Tracking**: Track forecast accuracy over time

## ML Integration

### Revenue Forecasting Integration

The Pipeline Manager integrates with the ML Service for ML-powered forecasting:

```typescript
// ML-Enhanced Revenue Forecasting
async function forecastRevenue(opportunityId: string, level: "opportunity" | "team" | "tenant"): Promise<Forecast> {
  // 1. Extract features (ML Service)
  const features = await mlService.extractFeatures(opportunityId);
  
  // 2. ML forecast (ML Service)
  const mlForecast = await mlService.predictForecast({
    features: features,
    level: level
  });
  
  // 3. Apply business rules
  const adjustedForecast = applyBusinessRules(mlForecast);
  
  return adjustedForecast;
}
```

### Forecast Output

ML forecasts provide:
- **Point Forecast**: P50 forecast (median prediction)
- **Uncertainty Quantification**: P10 (conservative) and P90 (optimistic) percentiles
- **Scenarios**: Best/base/worst case scenarios
- **Confidence Intervals**: How certain the model is about the forecast
- **Industry Seasonality**: Industry-specific patterns captured in features

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/pipeline-manager/README.md)

## Dependencies

- **Shard Manager**: For opportunity shard management
- **Logging**: For audit logging
- **User Management**: For user context
- **ML Service** ⭐: For ML-powered revenue forecasting

## Related Documentation

- [ML Service](../ml-service/) - ML forecasting capabilities
- [AI Insights](../ai-insights/) - Risk analysis and insights
- [Global CAIS Overview](../../../global/CAIS_OVERVIEW.md) - Compound AI System architecture


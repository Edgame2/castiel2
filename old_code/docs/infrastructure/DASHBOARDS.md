# Azure Monitoring Dashboards

**Last Updated**: January 2025  
**Status**: Dashboard Configuration Guide

---

## Overview

This document describes the recommended Azure Portal dashboards for monitoring the Castiel platform.

---

## Operational Dashboard

### Metrics to Display

1. **Application Health**
   - API response time (P50, P95, P99)
   - Error rate (%)
   - Request count
   - Availability (%)

2. **Resource Utilization**
   - App Service CPU/Memory
   - Function App execution count
   - Cosmos DB RU consumption
   - Redis memory usage

3. **Queue Depths**
   - Service Bus queue message counts
   - Dead letter queue sizes

4. **Dependencies**
   - External API response times
   - Database query times
   - Cache hit rates

### Dashboard JSON

Create in Azure Portal → Dashboards → New Dashboard

```json
{
  "name": "Castiel Operational Dashboard",
  "lenses": [
    {
      "order": 0,
      "parts": [
        {
          "position": {
            "x": 0,
            "y": 0,
            "colSpan": 6,
            "rowSpan": 4
          },
          "metadata": {
            "type": "Extension/Microsoft_Azure_Monitoring/PartType/MetricsChartPart",
            "settings": {
              "content": {
                "chartType": "Line",
                "metrics": [
                  {
                    "resourceIds": ["/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/castiel-api-production"],
                    "metricNamespace": "Microsoft.Web/sites",
                    "metricName": "AverageResponseTime"
                  }
                ]
              }
            }
          }
        }
      ]
    }
  ]
}
```

---

## Cost Dashboard

### Metrics to Display

1. **Daily Spending**
   - Cost by resource type
   - Cost trends (7-day, 30-day)
   - Budget vs actual

2. **Top Cost Drivers**
   - Resources sorted by cost
   - Cost per service
   - Cost per tenant (if tagged)

3. **Forecast**
   - Predicted monthly cost
   - Budget burn rate

---

## Security Dashboard

### Metrics to Display

1. **Security Events**
   - Failed authentication attempts
   - Key Vault access patterns
   - Network security events

2. **Compliance Status**
   - Azure Security Center score
   - Policy compliance
   - Vulnerability assessments

---

## Performance Dashboard

### Metrics to Display

1. **Application Performance**
   - Response time percentiles
   - Throughput (requests/sec)
   - Error breakdown by type

2. **Database Performance**
   - Cosmos DB RU consumption
   - Query performance
   - Throttling events

3. **Cache Performance**
   - Redis hit rate
   - Cache evictions
   - Connection count

---

## Creating Dashboards

### Via Azure Portal

1. Navigate to Azure Portal → Dashboards
2. Click "New dashboard"
3. Add tiles for each metric
4. Save and share with team

### Via Azure CLI

```bash
# Export dashboard
az portal dashboard show \
  --name "Castiel Operational" \
  --resource-group castiel-production-rg \
  --output json > dashboard.json

# Import dashboard
az portal dashboard import \
  --name "Castiel Operational" \
  --resource-group castiel-production-rg \
  --input-path dashboard.json
```

---

## Recommended Dashboards

1. **Executive Summary**: High-level KPIs, availability, cost
2. **Operations**: Detailed metrics for on-call engineers
3. **Cost Management**: Budget tracking and optimization
4. **Security**: Security events and compliance status

---

## Dashboard Refresh

- **Operational**: Real-time (1-minute refresh)
- **Cost**: Daily (24-hour refresh)
- **Security**: Real-time (1-minute refresh)

---

## Access Control

- **Viewers**: Read-only access to all dashboards
- **Contributors**: Can modify operational dashboards
- **Admins**: Full access to all dashboards

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Monitoring dashboards fully documented

#### Implemented Features (✅)

- ✅ Operational dashboard configuration
- ✅ Cost dashboard configuration
- ✅ Security dashboard configuration
- ✅ Performance dashboard configuration
- ✅ Dashboard creation procedures

#### Known Limitations

- ⚠️ **Dashboard Implementation** - Dashboards may not be fully implemented
  - **Recommendation:**
    1. Verify dashboard implementation
    2. Test dashboard functionality
    3. Update documentation with actual dashboard status

- ⚠️ **Dashboard Automation** - Dashboard creation may be manual
  - **Recommendation:**
    1. Automate dashboard creation
    2. Use Infrastructure as Code for dashboards
    3. Document automation procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](./README.md) - Infrastructure overview
- [Monitoring Documentation](../monitoring/INTEGRATION_MONITORING.md) - Monitoring setup




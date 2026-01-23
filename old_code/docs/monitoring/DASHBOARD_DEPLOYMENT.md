# Grafana Dashboard Deployment Guide

**Last Updated**: December 2025  
**Status**: Dashboards Defined, Deployment Required

---

## Overview

Grafana dashboards for Castiel are defined in JSON format and need to be deployed to a Grafana instance for production monitoring.

## Defined Dashboards

The following dashboards are defined in `docs/monitoring/grafana-dashboards.json`:

1. **API Performance Dashboard**
   - API response times (p50, p95, p99)
   - API error rates
   - API requests per second

2. **Database Performance Dashboard**
   - Query execution time
   - Request Units (RU) consumption
   - Slow queries tracking

3. **Embedding Pipeline Dashboard**
   - Embedding queue depth
   - Embedding processing rate
   - Embedding failure rate

4. **Vector Search Dashboard**
   - Vector search latency (p95)
   - Cache hit rate

5. **Integration Monitoring Dashboard**
   - Sync jobs by status
   - Sync error rate
   - Service Bus queue depth

6. **Content Generation Dashboard**
   - Generation jobs by status
   - Generation processing time

## Deployment Methods

### Method 1: Grafana API (Recommended)

```bash
# Set Grafana credentials
export GRAFANA_URL="https://grafana.castiel.com"
export GRAFANA_API_KEY="your-api-key"

# Import dashboards
for dashboard in docs/monitoring/grafana/*.json; do
  curl -X POST \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d @$dashboard \
    "$GRAFANA_URL/api/dashboards/db"
done
```

### Method 2: Terraform (Infrastructure as Code)

Create `terraform/grafana-dashboards.tf`:

```hcl
resource "grafana_dashboard" "api_performance" {
  config_json = file("${path.module}/../docs/monitoring/grafana-dashboards.json")
  folder     = grafana_folder.castiel.id
}
```

### Method 3: Grafana UI

1. Log in to Grafana
2. Navigate to Dashboards → Import
3. Upload `docs/monitoring/grafana-dashboards.json`
4. Configure data source (Prometheus/Application Insights)
5. Save dashboard

## Data Source Configuration

Dashboards require the following data sources:

1. **Prometheus** (for metrics)
   - URL: `http://prometheus:9090`
   - Access: Server (default)

2. **Application Insights** (for Azure metrics)
   - Azure Application Insights workspace
   - API key or managed identity

3. **Log Analytics** (for logs)
   - Azure Log Analytics workspace
   - API key or managed identity

## Verification Checklist

- [ ] Grafana instance deployed and accessible
- [ ] Data sources configured (Prometheus, Application Insights, Log Analytics)
- [ ] Dashboards imported successfully
- [ ] Dashboard panels showing data
- [ ] Alerts configured and tested
- [ ] Dashboard access permissions set
- [ ] Documentation updated with dashboard URLs

## Dashboard URLs

After deployment, dashboards will be available at:

- API Performance: `https://grafana.castiel.com/d/api-performance`
- Database Performance: `https://grafana.castiel.com/d/database-performance`
- Embedding Pipeline: `https://grafana.castiel.com/d/embedding-pipeline`
- Vector Search: `https://grafana.castiel.com/d/vector-search`
- Integration Monitoring: `https://grafana.castiel.com/d/integration-monitoring`
- Content Generation: `https://grafana.castiel.com/d/content-generation`

## Troubleshooting

### No Data in Dashboards

1. **Check Data Sources**: Verify data sources are connected and queryable
2. **Check Metrics**: Verify metrics are being exported (Prometheus/Application Insights)
3. **Check Time Range**: Ensure time range includes data
4. **Check Permissions**: Verify Grafana has access to data sources

### Dashboard Import Errors

1. **Validate JSON**: Ensure dashboard JSON is valid
2. **Check Version**: Verify Grafana version compatibility
3. **Check Dependencies**: Ensure all required data sources exist
4. **Check Permissions**: Verify API key has dashboard creation permissions

---

**Status**: Dashboards Defined ✅  
**Last Updated**: January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Dashboards defined but deployment may be incomplete

#### Implemented Features (✅)

- ✅ Dashboard definitions created
- ✅ Deployment methods documented
- ✅ Data source configuration documented
- ✅ Verification checklist provided

#### Known Limitations

- ⚠️ **Dashboard Deployment** - Dashboards may not be deployed
  - **Recommendation:**
    1. Deploy dashboards to Grafana
    2. Verify dashboard functionality
    3. Test dashboard queries

- ⚠️ **Service Bus References** - Service Bus has been removed
  - **Code Reference:**
    - Dashboard definitions may reference Service Bus
  - **Recommendation:**
    1. Update dashboard definitions for BullMQ/Redis
    2. Remove Service Bus references
    3. Update queue monitoring

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Grafana Dashboard README](./grafana/README.md) - Grafana dashboard setup
- [Application Insights Config](./APPLICATION_INSIGHTS_CONFIG.md) - Application Insights setup  
**Deployment**: Required ⚠️  
**Next Steps**: Deploy to Grafana instance and verify data flow








# Grafana Dashboards for AI Insights

This directory contains Grafana dashboard configurations for monitoring AI Insights features.

## Prerequisites

1. **Grafana Instance**: A running Grafana instance (version 8.0+)
2. **Azure Log Analytics Data Source**: Configured in Grafana with access to your Application Insights workspace
3. **Application Insights**: Already configured and sending telemetry (see `packages/monitoring`)

## Dashboard Files

### `ai-insights-dashboard.json`

Comprehensive dashboard for monitoring AI Insights performance, costs, and quality metrics.

**Panels Included:**

1. **Request Rate** - Requests per minute to AI insights endpoints
2. **Success Rate** - Percentage of successful requests
3. **Response Time** - P50, P95, P99 latency percentiles
4. **Error Rate by Type** - Breakdown of errors by error type
5. **AI Cost** - Total cost in USD over time
6. **Token Usage** - Input and output token consumption
7. **Cost by Model** - Cost breakdown by AI model
8. **Requests by Insight Type** - Request distribution by insight type (chat, quick, generate)
9. **Cache Hit Rate** - Cache performance metrics
10. **Rate Limit Violations** - 429 responses due to rate limiting
11. **Average Latency by Operation** - Table showing latency by operation type
12. **Summary Stats** - Daily cost, total requests, error rate, P95 latency

## Installation

### Step 1: Configure Azure Log Analytics Data Source

1. In Grafana, go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Azure Log Analytics**
4. Configure:
   - **Name**: `Azure Log Analytics` (or your preferred name)
   - **Azure Cloud**: Select your Azure cloud (Azure, Azure China, Azure US Government, etc.)
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: Service principal client ID
   - **Client Secret**: Service principal secret
   - **Default Workspace**: Select your Log Analytics workspace
5. Click **Save & Test**

### Step 2: Import Dashboard

1. In Grafana, go to **Dashboards** → **Import**
2. Click **Upload JSON file** and select `ai-insights-dashboard.json`
3. Or paste the JSON content directly
4. Select the **Azure Log Analytics** data source
5. Click **Import**

### Step 3: Configure Variables

The dashboard includes a template variable for the Log Analytics workspace:

1. Go to **Dashboard Settings** → **Variables**
2. Configure the `workspace` variable:
   - **Name**: `workspace`
   - **Type**: `Query`
   - **Data Source**: Your Azure Log Analytics data source
   - **Query**: `workspaces()`
   - **Refresh**: `On Time Range Change`

## Customization

### Adjusting Time Ranges

The dashboard defaults to the last 1 hour. To change:

1. Click the time picker in the top right
2. Select your desired time range
3. The dashboard will refresh automatically

### Adding Custom Panels

To add custom panels:

1. Click **Add Panel** → **Add Visualization**
2. Select **Azure Log Analytics** as the data source
3. Use KQL (Kusto Query Language) queries
4. Example query:
   ```kql
   requests
   | where url contains '/api/v1/insights/'
   | where timestamp > ago(1h)
   | summarize count() by bin(timestamp, 1m)
   ```

### Metric Names

The dashboard expects the following custom metrics to be tracked:

- `ai_insights_cost` - Cost in USD
- `ai_insights_input_tokens` - Input token count
- `ai_insights_output_tokens` - Output token count
- `ai_insights_cache_hit` - Cache hit count
- `ai_insights_cache_miss` - Cache miss count

These metrics should be tracked via the `MonitoringService` in the application.

## Troubleshooting

### No Data Showing

1. **Check Data Source Connection**:
   - Verify the Azure Log Analytics data source is connected
   - Test the connection in Grafana

2. **Verify Application Insights**:
   - Ensure Application Insights is configured and sending data
   - Check that telemetry is being sent to the correct workspace

3. **Check Time Range**:
   - Ensure data exists for the selected time range
   - Try expanding the time range

4. **Verify Metric Names**:
   - Check that custom metrics are being tracked with the expected names
   - Review Application Insights logs to confirm metric names

### Query Errors

If queries fail:

1. **Check KQL Syntax**: Ensure queries use valid KQL syntax
2. **Verify Table Names**: Confirm table names match Application Insights schema:
   - `requests` - HTTP requests
   - `exceptions` - Exceptions
   - `customMetrics` - Custom metrics
   - `traces` - Traces

3. **Check Permissions**: Ensure the service principal has read access to the Log Analytics workspace

## Related Documentation

- [AI Insights Monitoring Guide](../../features/ai-insights/MONITORING.md)
- [Monitoring Package](../../../packages/monitoring/README.md)
- [Application Insights Configuration](../../../terraform/app-services.tf)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Application Insights logs
3. Verify metric tracking in the application code

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Grafana dashboard documentation fully documented

#### Implemented Features (✅)

- ✅ Dashboard configuration documented
- ✅ Installation procedures
- ✅ Data source configuration
- ✅ Customization guide
- ✅ Troubleshooting guide

#### Known Limitations

- ⚠️ **Dashboard Deployment** - Dashboards may not be deployed
  - **Recommendation:**
    1. Deploy dashboards to Grafana
    2. Verify dashboard functionality
    3. Test all dashboard panels

- ⚠️ **Data Source Configuration** - Data sources may need configuration
  - **Recommendation:**
    1. Verify data source configuration
    2. Test data source connectivity
    3. Document data source setup

### Related Documentation

- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Dashboard Deployment](../DASHBOARD_DEPLOYMENT.md) - Dashboard deployment guide
- [Application Insights Config](../APPLICATION_INSIGHTS_CONFIG.md) - Application Insights setup










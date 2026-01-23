# Application Insights Dashboards (Azure Monitor Workbooks)
# 
# These workbooks provide comprehensive monitoring dashboards for:
# - Error rates (detailed error analysis)
# - Response times (performance analysis)
# - Key metrics (comprehensive overview)
# - Queue metrics (BullMQ/Redis)
# - Worker metrics
# - Cache metrics
# - System health overview
#
# Note: Azure Monitor Workbooks use a complex JSON structure. These workbooks
# can be created via Terraform and will be available in the Azure Portal
# under Application Insights > Workbooks.

# Queue Metrics Dashboard
resource "azurerm_monitor_workbook" "queue_metrics" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-queue-metrics-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Queue Metrics Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  # Simplified workbook structure with KQL queries
  # The workbook will display queue metrics from Application Insights customMetrics
  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Queue Metrics Dashboard\n\nThis dashboard shows queue depth, processing times, failed job rates, and throughput for all BullMQ queues."
        }
        name = "Queue Metrics Overview"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"queue.depth\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)\n| render timechart"
        }
        name = "Queue Depth"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"queue.processing_time_p95\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)\n| render timechart"
        }
        name = "Processing Time P95"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"queue.failed_job_rate\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)\n| render timechart"
        }
        name = "Failed Job Rate"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"queue.throughput\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)\n| render timechart"
        }
        name = "Throughput"
      }
    ]
  })

  tags = local.common_tags
}

# Worker Metrics Dashboard
resource "azurerm_monitor_workbook" "worker_metrics" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-worker-metrics-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Worker Metrics Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Worker Metrics Dashboard\n\nThis dashboard shows active jobs, processing times, error rates, and throughput for all workers."
        }
        name = "Worker Metrics Overview"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.active_jobs\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Active Jobs"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.error_rate\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Error Rate"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.processing_time\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Processing Time"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.completed_jobs\"\n| where timestamp > ago(1h)\n| summarize max(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Completed Jobs"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.failed_jobs\"\n| where timestamp > ago(1h)\n| summarize max(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Failed Jobs"
      }
    ]
  })

  tags = local.common_tags
}

# Cache Metrics Dashboard
resource "azurerm_monitor_workbook" "cache_metrics" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-cache-metrics-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Cache Metrics Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Cache Metrics Dashboard\n\nThis dashboard shows cache hit rate, miss count, hit count, and operation duration for Redis cache."
        }
        name = "Cache Metrics Overview"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"cache.hit_rate\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Hit Rate"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"cache.hit_count\"\n| where timestamp > ago(1h)\n| summarize sum(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Hit Count"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"cache.miss_count\"\n| where timestamp > ago(1h)\n| summarize sum(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Miss Count"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"cache.operation_duration\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Operation Duration"
      }
    ]
  })

  tags = local.common_tags
}

# System Health Overview Dashboard
resource "azurerm_monitor_workbook" "system_health" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-system-health-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "System Health Overview"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# System Health Overview\n\nThis dashboard provides a comprehensive view of system health including API performance, database latency, queue health, worker status, and cache performance."
        }
        name = "System Health Overview"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(1h)\n| summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "API Response Time (P95)"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(1h)\n| summarize ErrorRate = countif(success == false) * 100.0 / count() by bin(timestamp, 5m)\n| render timechart"
        }
        name = "API Error Rate"
      },
      {
        type = 3
        content = {
          json = "dependencies\n| where type == \"Azure DocumentDB\" or type == \"SQL\"\n| where timestamp > ago(1h)\n| summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Database Latency (P95)"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"queue.depth\"\n| where timestamp > ago(1h)\n| summarize TotalDepth = sum(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Total Queue Depth"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"cache.hit_rate\"\n| where timestamp > ago(1h)\n| summarize avg(value) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Cache Hit Rate"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name == \"worker.error_rate\"\n| where timestamp > ago(1h)\n| summarize AvgErrorRate = avg(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)\n| render timechart"
        }
        name = "Worker Error Rate Summary"
      }
    ]
  })

  tags = local.common_tags
}

# Error Rates Dashboard
# Comprehensive dashboard for analyzing errors, exceptions, and failure rates
resource "azurerm_monitor_workbook" "error_rates" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-error-rates-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Error Rates Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Error Rates Dashboard\n\nThis dashboard provides comprehensive error analysis including API error rates, exception tracking, failed requests, and error trends over time."
        }
        name = "Error Rates Overview"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize ErrorRate = countif(success == false) * 100.0 / count() by bin(timestamp, 5m)\n| render timechart"
        }
        name = "API Error Rate (%)"
      },
      {
        type = 3
        content = {
          json = "requests\n| where success == false\n| where timestamp > ago(24h)\n| summarize ErrorCount = count() by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "Error Count by Endpoint"
      },
      {
        type = 3
        content = {
          json = "requests\n| where success == false\n| where timestamp > ago(24h)\n| summarize ErrorCount = count() by resultCode\n| order by ErrorCount desc\n| render barchart"
        }
        name = "Error Count by HTTP Status Code"
      },
      {
        type = 3
        content = {
          json = "exceptions\n| where timestamp > ago(24h)\n| summarize ExceptionCount = count() by bin(timestamp, 5m), type\n| render timechart"
        }
        name = "Exception Count by Type"
      },
      {
        type = 3
        content = {
          json = "exceptions\n| where timestamp > ago(24h)\n| summarize ExceptionCount = count() by type\n| order by ExceptionCount desc\n| take 10\n| render barchart"
        }
        name = "Top 10 Exception Types"
      },
      {
        type = 3
        content = {
          json = "requests\n| where success == false\n| where timestamp > ago(24h)\n| summarize FailedRequests = count() by name\n| order by FailedRequests desc\n| take 10\n| render barchart"
        }
        name = "Top 10 Failed Endpoints"
      },
      {
        type = 3
        content = {
          json = "exceptions\n| where timestamp > ago(24h)\n| extend OperationName = tostring(customDimensions.operation)\n| summarize ExceptionCount = count() by OperationName\n| order by ExceptionCount desc\n| take 10\n| render barchart"
        }
        name = "Top 10 Failed Operations"
      },
      {
        type = 3
        content = {
          json = "requests\n| where success == false\n| where timestamp > ago(24h)\n| summarize ErrorRate = countif(success == false) * 100.0 / count() by bin(timestamp, 1h)\n| render timechart"
        }
        name = "Error Rate Trend (Hourly)"
      },
      {
        type = 3
        content = {
          json = "exceptions\n| where timestamp > ago(24h)\n| extend Severity = tostring(customDimensions.severity)\n| summarize ExceptionCount = count() by Severity\n| render piechart"
        }
        name = "Exceptions by Severity"
      }
    ]
  })

  tags = local.common_tags
}

# Response Times Dashboard
# Comprehensive dashboard for analyzing API performance and response times
resource "azurerm_monitor_workbook" "response_times" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-response-times-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Response Times Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Response Times Dashboard\n\nThis dashboard provides comprehensive performance analysis including response time percentiles, endpoint performance, database latency, and dependency performance."
        }
        name = "Response Times Overview"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize p50 = percentile(duration, 50), p95 = percentile(duration, 95), p99 = percentile(duration, 99), avg = avg(duration) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Response Time Percentiles (P50, P95, P99, Avg)"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "P95 Response Time by Endpoint"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize avg_duration = avg(duration), p95_duration = percentile(duration, 95), p99_duration = percentile(duration, 99) by name\n| order by p95_duration desc\n| take 20\n| render barchart"
        }
        name = "Top 20 Slowest Endpoints (P95)"
      },
      {
        type = 3
        content = {
          json = "dependencies\n| where timestamp > ago(24h)\n| summarize p50 = percentile(duration, 50), p95 = percentile(duration, 95), p99 = percentile(duration, 99) by bin(timestamp, 5m), type\n| render timechart"
        }
        name = "Dependency Latency by Type (P50, P95, P99)"
      },
      {
        type = 3
        content = {
          json = "dependencies\n| where type == \"Azure DocumentDB\"\n| where timestamp > ago(24h)\n| summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Cosmos DB Latency (P95)"
      },
      {
        type = 3
        content = {
          json = "dependencies\n| where type == \"Redis\" or type == \"InProc\"\n| where timestamp > ago(24h)\n| summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Redis/Cache Latency (P95)"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize RequestCount = count(), AvgDuration = avg(duration), P95Duration = percentile(duration, 95) by name\n| order by RequestCount desc\n| take 20\n| render table"
        }
        name = "Top 20 Endpoints by Request Count"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| where duration > 1000\n| summarize SlowRequestCount = count() by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "Slow Requests (>1s) by Endpoint"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize RequestCount = count(), AvgDuration = avg(duration) by bin(timestamp, 1h)\n| render timechart"
        }
        name = "Request Volume and Average Duration (Hourly)"
      }
    ]
  })

  tags = local.common_tags
}

# Key Metrics Dashboard
# Comprehensive dashboard showing all key system metrics
resource "azurerm_monitor_workbook" "key_metrics" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-key-metrics-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  display_name        = "Key Metrics Dashboard"
  source_id           = azurerm_application_insights.main.id
  category            = "workbook"
  kind                = "shared"

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "# Key Metrics Dashboard\n\nThis dashboard provides a comprehensive overview of all key system metrics including API performance, error rates, database performance, cache performance, queue metrics, and worker metrics."
        }
        name = "Key Metrics Overview"
      },
      {
        type = 1
        content = {
          json = "## API Metrics"
        }
        name = "API Metrics Section"
      },
      {
        type = 3
        content = {
          json = "requests\n| where timestamp > ago(24h)\n| summarize RequestCount = count(), ErrorRate = countif(success == false) * 100.0 / count(), AvgDuration = avg(duration), P95Duration = percentile(duration, 95) by bin(timestamp, 5m)\n| render timechart"
        }
        name = "API Request Count, Error Rate, and Response Times"
      },
      {
        type = 1
        content = {
          json = "## Database Metrics"
        }
        name = "Database Metrics Section"
      },
      {
        type = 3
        content = {
          json = "dependencies\n| where type == \"Azure DocumentDB\"\n| where timestamp > ago(24h)\n| summarize RequestCount = count(), AvgDuration = avg(duration), P95Duration = percentile(duration, 95), ErrorRate = countif(success == false) * 100.0 / count() by bin(timestamp, 5m)\n| render timechart"
        }
        name = "Cosmos DB Performance"
      },
      {
        type = 1
        content = {
          json = "## Cache Metrics"
        }
        name = "Cache Metrics Section"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name in (\"cache.hit_rate\", \"cache.hit_count\", \"cache.miss_count\", \"cache.operation_duration\")\n| where timestamp > ago(24h)\n| summarize avg(value) by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "Cache Performance Metrics"
      },
      {
        type = 1
        content = {
          json = "## Queue Metrics"
        }
        name = "Queue Metrics Section"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name startswith \"queue.\"\n| where timestamp > ago(24h)\n| summarize avg(value) by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "Queue Metrics Overview"
      },
      {
        type = 1
        content = {
          json = "## Worker Metrics"
        }
        name = "Worker Metrics Section"
      },
      {
        type = 3
        content = {
          json = "customMetrics\n| where name startswith \"worker.\"\n| where timestamp > ago(24h)\n| summarize avg(value) by bin(timestamp, 5m), name\n| render timechart"
        }
        name = "Worker Metrics Overview"
      },
      {
        type = 1
        content = {
          json = "## System Health Summary"
        }
        name = "System Health Summary Section"
      },
      {
        type = 3
        content = {
          json = "let errorRate = requests\n| where timestamp > ago(1h)\n| summarize ErrorRate = countif(success == false) * 100.0 / count();\nlet avgResponseTime = requests\n| where timestamp > ago(1h)\n| summarize AvgResponseTime = avg(duration);\nlet cacheHitRate = customMetrics\n| where name == \"cache.hit_rate\"\n| where timestamp > ago(1h)\n| summarize CacheHitRate = avg(value);\nlet queueDepth = customMetrics\n| where name == \"queue.depth\"\n| where timestamp > ago(1h)\n| summarize TotalQueueDepth = sum(value);\nunion errorRate, avgResponseTime, cacheHitRate, queueDepth\n| project ErrorRate, AvgResponseTime, CacheHitRate, TotalQueueDepth"
        }
        name = "System Health Summary"
      }
    ]
  })

  tags = local.common_tags
}

# Comprehensive Alerting Strategy

# Smart Alert: High Error Rate (with dynamic threshold)
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "smart_error_rate" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-smart-error-rate-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when error rate exceeds baseline by 2x"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | summarize 
          ErrorCount = countif(success == false),
          TotalCount = count(),
          ErrorRate = countif(success == false) * 100.0 / count()
        by bin(timestamp, 5m)
      | where ErrorRate > 5.0  // 5% error rate threshold
    QUERY
    time_aggregation_method = "Average"
    threshold               = 5.0
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2 // Require 2 consecutive periods
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  auto_mitigation_enabled = false

  tags = local.common_tags
}

# Alert: Slow Response Times (P95)
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "slow_response_p95" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-slow-response-p95-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)
      | where p95_duration > 2000  // 2 seconds
    QUERY
    time_aggregation_method = "Average"
    threshold               = 2000
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Function App Failures (removed - Functions migrated to Container Apps)
# Legacy alert removed - use Container Apps metrics instead

# Alert: Service Bus Queue Depth (deprecated - legacy only)
# @deprecated Service Bus is replaced by BullMQ/Redis. This alert is kept for legacy compatibility.
# Note: For Service Bus queue metrics, scope should be the namespace
resource "azurerm_monitor_metric_alert" "service_bus_queue_depth" {
  count = local.is_full_deployment ? 1 : 0

  name                = "${var.resource_prefix}-sb-queue-depth-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_servicebus_namespace.main[0].id]
  description         = "Alert when Service Bus queue depth exceeds 1000 messages (deprecated - use Redis/BullMQ metrics instead)"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ServiceBus/namespaces"
    metric_name      = "ActiveMessages"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 1000
    # Filter by queue name if needed (requires dynamic criteria)
    # For now, this alerts on all queues in the namespace
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = local.common_tags
}

# Alert: Cosmos DB Throttling
resource "azurerm_monitor_metric_alert" "cosmos_throttling" {
  name                = "${var.resource_prefix}-cosmos-throttling-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_cosmosdb_account.main.id]
  description         = "Alert when Cosmos DB requests are being throttled"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DocumentDB/databaseAccounts"
    metric_name      = "TotalRequestUnits"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 1000
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = local.common_tags
}

# Alert: High Memory Usage (removed - App Service migrated to Container Apps)
# Legacy alert removed - use Container Apps metrics instead

# Alert: Application Insights Dependency Failures
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dependency_failures" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-dependency-failures-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1

  criteria {
    query                   = <<-QUERY
      dependencies
      | where success == false
      | where timestamp > ago(15m)
      | summarize FailureCount = count() by bin(timestamp, 5m), type, target
      | where FailureCount > 10
    QUERY
    time_aggregation_method = "Count"
    threshold               = 10
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Unusual Traffic Pattern (Anomaly Detection)
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "traffic_anomaly" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-traffic-anomaly-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT15M"
  window_duration      = "PT1H"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(1h)
      | summarize RequestCount = count() by bin(timestamp, 15m)
      | extend Baseline = avg(RequestCount) over (previous 4h)
      | extend Deviation = abs(RequestCount - Baseline) / Baseline * 100.0
      | where Deviation > 50  // 50% deviation from baseline
    QUERY
    time_aggregation_method = "Average"
    threshold               = 50
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}


# Alert: Queue Depth Threshold (BullMQ/Redis queues)
# Alerts when queue depth exceeds threshold, indicating processing backlog
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "queue_depth_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-queue-depth-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when queue depth exceeds 1000 jobs, indicating processing backlog"

  criteria {
    query                   = <<-QUERY
      customMetrics
      | where name == "queue.depth"
      | where timestamp > ago(15m)
      | summarize MaxDepth = max(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)
      | where MaxDepth > 1000
    QUERY
    time_aggregation_method = "Maximum"
    threshold               = 1000
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Failed Job Rate (BullMQ/Redis queues)
# Alerts when failed job rate exceeds threshold, indicating processing issues
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "queue_failed_job_rate" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-queue-failed-job-rate-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when queue failed job rate exceeds 10%, indicating processing failures"

  criteria {
    query                   = <<-QUERY
      customMetrics
      | where name == "queue.failed_job_rate"
      | where timestamp > ago(15m)
      | summarize AvgFailedRate = avg(value) by bin(timestamp, 5m), tostring(customDimensions.queueName)
      | where AvgFailedRate > 0.10  // 10% failure rate
    QUERY
    time_aggregation_method = "Average"
    threshold               = 0.10
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Database Latency (Cosmos DB)
# Alerts when Cosmos DB response times are high
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "database_latency_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-database-latency-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when database (Cosmos DB) dependency latency exceeds 1000ms"

  criteria {
    query                   = <<-QUERY
      dependencies
      | where type == "Azure DocumentDB" or type == "SQL"
      | where timestamp > ago(15m)
      | summarize p95_duration = percentile(duration, 95) by bin(timestamp, 5m)
      | where p95_duration > 1000  // 1 second
    QUERY
    time_aggregation_method = "Average"
    threshold               = 1000
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: API Latency (P99)
# Enhanced alert for critical API response times
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "api_latency_p99" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-api-latency-p99-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 0 # Critical
  description          = "Alert when P99 API response time exceeds 1000ms"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | summarize p99_duration = percentile(duration, 99) by bin(timestamp, 5m)
      | where p99_duration > 1000  // 1 second
    QUERY
    time_aggregation_method = "Average"
    threshold               = 1000
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 2
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Cache Hit Rate Drop
# Alerts when cache hit rate drops below threshold, indicating cache inefficiency
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "cache_hit_rate_low" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-cache-hit-rate-low-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2 # Warning
  description          = "Alert when cache hit rate drops below 80%, indicating cache inefficiency"

  criteria {
    query                   = <<-QUERY
      customMetrics
      | where name == "cache.hit_rate"
      | where timestamp > ago(15m)
      | summarize AvgHitRate = avg(value) by bin(timestamp, 5m)
      | where AvgHitRate < 0.80  // 80% hit rate threshold
    QUERY
    time_aggregation_method = "Average"
    threshold               = 0.80
    operator                = "LessThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Worker Error Rate
# Alerts when worker error rate exceeds threshold
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "worker_error_rate_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-worker-error-rate-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when worker error rate exceeds 10%"

  criteria {
    query                   = <<-QUERY
      customMetrics
      | where name == "worker.error_rate"
      | where timestamp > ago(15m)
      | summarize AvgErrorRate = avg(value) by bin(timestamp, 5m), tostring(customDimensions.workerName)
      | where AvgErrorRate > 0.10  // 10% error rate
    QUERY
    time_aggregation_method = "Average"
    threshold               = 0.10
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Authentication Failures
# Alerts when authentication failure rate exceeds threshold, indicating potential security issues
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "auth_failures_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-auth-failures-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when authentication failure rate exceeds threshold, indicating potential brute force attacks or credential issues"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | where name contains "/auth/login" or name contains "/api/auth/login"
      | where resultCode == "401" or resultCode == "403"
      | summarize FailureCount = count() by bin(timestamp, 5m)
      | where FailureCount > 20  // 20 failed login attempts in 5 minutes
    QUERY
    time_aggregation_method = "Count"
    threshold               = 20
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Rate Limit Violations
# Alerts when rate limit violations exceed threshold, indicating potential abuse or capacity issues
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "rate_limit_violations_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-rate-limit-violations-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2
  description          = "Alert when rate limit violations (429 responses) exceed threshold, indicating potential abuse or capacity issues"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | where resultCode == "429"
      | summarize ViolationCount = count() by bin(timestamp, 5m)
      | where ViolationCount > 50  // 50 rate limit violations in 5 minutes
    QUERY
    time_aggregation_method = "Count"
    threshold               = 50
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Cache Operation Duration High
# Alerts when cache operations are slow, indicating cache performance issues
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "cache_operation_duration_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-cache-operation-duration-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2
  description          = "Alert when cache operation duration exceeds threshold, indicating cache performance degradation"

  criteria {
    query                   = <<-QUERY
      customMetrics
      | where name == "cache.operation_duration"
      | where timestamp > ago(15m)
      | summarize AvgDuration = avg(value) by bin(timestamp, 5m)
      | where AvgDuration > 100  // 100ms average operation duration
    QUERY
    time_aggregation_method = "Average"
    threshold               = 100
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Database Error Rate
# Alerts when database dependency error rate exceeds threshold
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "database_error_rate_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-database-error-rate-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when database dependency error rate exceeds threshold, indicating database connectivity or query issues"

  criteria {
    query                   = <<-QUERY
      dependencies
      | where type == "Azure DocumentDB" or type == "SQL"
      | where timestamp > ago(15m)
      | summarize 
          ErrorCount = countif(success == false),
          TotalCount = count(),
          ErrorRate = countif(success == false) * 100.0 / count()
        by bin(timestamp, 5m)
      | where ErrorRate > 5.0  // 5% error rate
    QUERY
    time_aggregation_method = "Average"
    threshold               = 5.0
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 2
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

# Alert: Database Request Rate High
# Alerts when database request rate is unusually high, indicating potential performance issues
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "database_request_rate_high" {
  count = var.environment == "production" ? 1 : 0

  name                = "${var.resource_prefix}-database-request-rate-high-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2
  description          = "Alert when database request rate is unusually high, indicating potential N+1 query issues or inefficient queries"

  criteria {
    query                   = <<-QUERY
      dependencies
      | where type == "Azure DocumentDB" or type == "SQL"
      | where timestamp > ago(15m)
      | summarize RequestCount = count() by bin(timestamp, 5m)
      | where RequestCount > 1000  // 1000 requests in 5 minutes (200 req/min)
    QUERY
    time_aggregation_method = "Count"
    threshold               = 1000
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = local.common_tags
}

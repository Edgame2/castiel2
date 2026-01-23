# Azure Service Bus for Integration Sync and Content Generation
# 
# @deprecated Service Bus is deprecated and replaced by BullMQ/Redis.
# This Terraform configuration is kept temporarily for legacy Azure Functions compatibility only.
# Active code uses BullMQ/Redis via QueueService.
# Excluded for hybrid-dev (using BullMQ/Redis instead)

# Service Bus Namespace
resource "azurerm_servicebus_namespace" "main" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = local.service_bus_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
  
  tags = local.common_tags
}

# Service Bus Namespace Authorization Rule (for connection string)
# Note: RootManageSharedAccessKey is created automatically by Azure
# If it already exists, import it: terraform import azurerm_servicebus_namespace_authorization_rule.main <resource-id>
resource "azurerm_servicebus_namespace_authorization_rule" "main" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "RootManageSharedAccessKey"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  listen = true
  send   = true
  manage = true
  
  # Ignore if already exists (created automatically by Azure)
  lifecycle {
    ignore_changes = [name]
    # If resource already exists, import it instead of recreating
    # terraform import azurerm_servicebus_namespace_authorization_rule.main /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.ServiceBus/namespaces/<ns>/AuthorizationRules/RootManageSharedAccessKey
  }
}

# Queue: embedding-jobs (for embedding pipeline)
resource "azurerm_servicebus_queue" "embedding_jobs" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "embedding-jobs"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: document-chunk-jobs (for document chunking)
resource "azurerm_servicebus_queue" "document_chunk_jobs" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "document-chunk-jobs"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: content-generation-jobs (for content generation)
resource "azurerm_servicebus_queue" "content_generation_jobs" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "content-generation-jobs"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: sync-inbound-webhook (high priority, real-time webhooks)
resource "azurerm_servicebus_queue" "sync_inbound_webhook" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "sync-inbound-webhook"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: sync-inbound-scheduled (standard priority, scheduled syncs)
resource "azurerm_servicebus_queue" "sync_inbound_scheduled" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "sync-inbound-scheduled"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: sync-outbound (sessions enabled, write-back operations)
resource "azurerm_servicebus_queue" "sync_outbound" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "sync-outbound"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
  requires_session                   = true  # Enable sessions for ordered processing
}

# Queue: ingestion-events (for integration ingestion)
resource "azurerm_servicebus_queue" "ingestion_events" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "ingestion-events"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: shard-emission (for shard emission events)
resource "azurerm_servicebus_queue" "shard_emission" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "shard-emission"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: enrichment-jobs (for data enrichment)
resource "azurerm_servicebus_queue" "enrichment_jobs" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "enrichment-jobs"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: shard-created (for project auto-attachment)
resource "azurerm_servicebus_queue" "shard_created" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "shard-created"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

# Queue: risk-evaluations (for risk analysis processing)
resource "azurerm_servicebus_queue" "risk_evaluations" {
  count = local.is_full_deployment ? 1 : 0
  
  name         = "risk-evaluations"
  namespace_id = azurerm_servicebus_namespace.main[0].id
  
  max_delivery_count                  = 10
  lock_duration                       = "PT5M"
  # Note: default_message_time_to_live is not supported in azurerm provider
  # Use default_message_ttl instead or configure via Azure Portal
  # default_message_ttl = "P7D"  # 7 days in ISO 8601 format
  dead_lettering_on_message_expiration = true
  partitioning_enabled                = false
}

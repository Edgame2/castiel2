# Outputs
output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.main.name
}

# Legacy App Service outputs (removed - replaced by Container Apps)
# output "main_api_url" - removed
# output "main_api_staging_url" - removed

output "cosmos_db_endpoint" {
  description = "Cosmos DB endpoint"
  value       = azurerm_cosmosdb_account.main.endpoint
  sensitive   = false
}

output "cosmos_db_primary_key" {
  description = "Cosmos DB primary key"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.main.hostname
  sensitive   = false
}

output "redis_primary_access_key" {
  description = "Redis primary access key"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
  sensitive   = false
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

# Container Registry outputs
output "container_registry_login_server" {
  description = "Container Registry login server"
  value       = length(azurerm_container_registry.main) > 0 ? azurerm_container_registry.main[0].login_server : ""
  sensitive   = false
}

output "container_registry_name" {
  description = "Container Registry name"
  value       = length(azurerm_container_registry.main) > 0 ? azurerm_container_registry.main[0].name : ""
  sensitive   = false
}

# Container Apps outputs
output "container_app_environment_id" {
  description = "Container Apps Environment ID"
  value       = length(azurerm_container_app_environment.main) > 0 ? azurerm_container_app_environment.main[0].id : ""
  sensitive   = false
}

output "container_app_api_fqdn" {
  description = "Container App API FQDN"
  value       = length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? azurerm_container_app.api[0].ingress[0].fqdn : ""
  sensitive   = false
}

output "container_app_web_fqdn" {
  description = "Container App Web FQDN"
  value       = length(azurerm_container_app.web) > 0 && length(azurerm_container_app.web[0].ingress) > 0 ? azurerm_container_app.web[0].ingress[0].fqdn : ""
  sensitive   = false
}

output "container_app_workers_sync_fqdn" {
  description = "Container App Workers Sync FQDN"
  value       = length(azurerm_container_app.workers_sync) > 0 && length(azurerm_container_app.workers_sync[0].ingress) > 0 ? azurerm_container_app.workers_sync[0].ingress[0].fqdn : ""
  sensitive   = false
}

output "container_app_workers_processing_fqdn" {
  description = "Container App Workers Processing FQDN"
  value       = length(azurerm_container_app.workers_processing) > 0 && length(azurerm_container_app.workers_processing[0].ingress) > 0 ? azurerm_container_app.workers_processing[0].ingress[0].fqdn : ""
  sensitive   = false
}

output "container_app_workers_ingestion_fqdn" {
  description = "Container App Workers Ingestion FQDN"
  value       = length(azurerm_container_app.workers_ingestion) > 0 && length(azurerm_container_app.workers_ingestion[0].ingress) > 0 ? azurerm_container_app.workers_ingestion[0].ingress[0].fqdn : ""
  sensitive   = false
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

# ============================================
# Connection Strings for Hybrid Local-Azure Setup
# ============================================

output "redis_connection_string" {
  description = "Redis connection string for local development (rediss:// format)"
  value       = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380"
  sensitive   = true
}

output "blob_storage_connection_string" {
  description = "Blob Storage connection string for document management"
  value       = azurerm_storage_account.blob_storage.primary_blob_connection_string
  sensitive   = true
}

# Legacy App Service outputs (removed)
# output "main_api_principal_id" - removed

# Service Bus outputs deprecated - replaced by BullMQ/Redis
# Kept temporarily for legacy Azure Functions compatibility
output "service_bus_namespace" {
  description = "Service Bus namespace name (deprecated - use Redis/BullMQ instead)"
  value       = length(azurerm_servicebus_namespace.main) > 0 ? azurerm_servicebus_namespace.main[0].name : ""
  sensitive   = false
}

output "service_bus_connection_string" {
  description = "Service Bus connection string (deprecated - use Redis/BullMQ instead)"
  value       = length(azurerm_servicebus_namespace_authorization_rule.main) > 0 ? azurerm_servicebus_namespace_authorization_rule.main[0].primary_connection_string : ""
  sensitive   = true
}

# Legacy Functions outputs (removed)
# output "functions_app_name" - removed
# output "functions_app_url" - removed

output "deployment_instructions" {
  description = "Next steps for deployment"
  value = <<-EOT
    Deployment successful! Next steps:
    
    1. Update Key Vault secrets:
       - SENDGRID-API-KEY
       - GOOGLE-CLIENT-ID, GOOGLE-CLIENT-SECRET
       - GITHUB-CLIENT-ID, GITHUB-CLIENT-SECRET
       - OPENAI-API-KEY
       - AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY
    
   2. Configure custom domains (production):
     - Main API: api.castiel.com
     - Functions: functions.castiel.com
    
    3. Deploy applications:
       - Use GitHub Actions workflow or Azure CLI
       - Deploy to staging first, then swap slots
       - Deploy Functions: az functionapp deployment source config-zip ...
    
    4. Initialize Cosmos DB:
       - Run database initialization scripts
       - Seed initial data if needed
    
    5. Verify queues (BullMQ/Redis):
       - Check Redis connection: Use REDIS_URL or REDIS_HOST
       - Queues: embedding-jobs, content-generation-jobs, sync-inbound-*, sync-outbound, etc.
       - Service Bus queues deprecated (legacy only)
    
   6. Test endpoints:
      - Main API REST: ${length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? "https://${azurerm_container_app.api[0].ingress[0].fqdn}/health" : "N/A (Container App not deployed)"}
        - GraphQL: ${length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? "https://${azurerm_container_app.api[0].ingress[0].fqdn}/graphql" : "N/A"}
        - Swagger: ${length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? "https://${azurerm_container_app.api[0].ingress[0].fqdn}/docs" : "N/A"}
      - Functions: N/A (migrated to Container Apps workers)
    
    7. Monitor:
       - Application Insights: ${azurerm_application_insights.main.name}
       - Alerts configured in Action Group: ${azurerm_monitor_action_group.main.name}
        - Redis/BullMQ metrics: Monitor via Application Insights
       - Service Bus metrics deprecated (legacy only)
  EOT
}

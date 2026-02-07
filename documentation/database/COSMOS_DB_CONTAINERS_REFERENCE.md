# Cosmos DB Containers Reference

**Date:** 2026-02-05  
**Status:** Complete – All platform containers documented. Creation centralized via shard-manager bootstrap.

## Overview

This document lists all Cosmos DB containers required by the platform. All containers use `/tenantId` as the partition key for tenant isolation. Container creation is **centralized**: run shard-manager with `bootstrap.ensure_cosmos_containers: true` (or run `scripts/ensure-platform-containers-and-shard-types.ts`) to ensure all containers exist before starting other services.

## Container List (by service)

Containers are defined in [containers/shard-manager/config/cosmos-containers.yaml](containers/shard-manager/config/cosmos-containers.yaml). Below is the reference by service.

| Service | Container Name(s) | Partition Key | Notes |
|---------|-------------------|---------------|--------|
| shard-manager | shard_shards, shard_shard_types, shard_relationships, shard_links | /tenantId | |
| auth | auth_sessions, auth_tokens, auth_providers, auth_password_resets, auth_email_verifications, auth_login_attempts, auth_sso_configs, auth_oauth2_clients, auth_mfa_secrets | /tenantId | |
| user-management | user_users, user_organizations, user_teams, user_roles, user_permissions, user_invitations, user_memberships, user_api_keys | /tenantId | |
| risk-analytics | risk_evaluations, risk_snapshots, risk_predictions, risk_revenue_at_risk, risk_quotas, risk_warnings, risk_simulations, risk_competitor_tracking, competitors, risk_anomaly_alerts, risk_sentiment_trends, risk_win_loss_reasons, analytics_industry_benchmarks, risk_clusters, risk_association_rules, risk_account_health, risk_explanations, risk_global_feature_importance, risk_decisions, risk_rules, risk_sales_methodology, risk_tenant_ml_config | /tenantId | |
| recommendations | recommendation_recommendations, recommendation_feedback, recommendation_feedback_aggregation, recommendation_config, recommendation_metrics, recommendation_remediation_workflows, recommendation_mitigation_actions | /tenantId | |
| workflow-orchestrator | workflow_workflows, workflow_steps, workflow_executions, hitl_approvals | /tenantId | |
| forecasting | forecast_decompositions, forecast_consensus, forecast_commitments, forecast_pipeline_health, forecast_predictions | /tenantId | |
| integration-sync | integration_sync_tasks, integration_executions, integration_conflicts, integration_webhooks | /tenantId | |
| data-enrichment | enrichment_jobs, enrichment_results, enrichment_configurations, enrichment_history, vectorization_jobs, shard_relationships, shard_acls | /tenantId | |
| ai-conversation | conversation_conversations, conversation_messages, conversation_contexts, conversation_citations, conversation_citation_configs | /tenantId | |
| integration-processors | integration_suggested_links, integration_entity_linking_settings, integration_linking_rules, integration_processing_settings | /tenantId | integration_suggested_links: defaultTtl 30 days |
| integration-manager | integration_providers, integration_integrations, integration_sync_tasks, integration_webhooks, integration_executions, integration_conflicts, integration_catalog, integration_visibility, integration_connections, integration_sync_conflicts, content_generation_jobs, content_templates, template_templates, template_versions, template_context_templates, template_email_templates, system_settings | /tenantId | |
| dashboard | dashboard_dashboards, dashboard_widgets, dashboard_admin_data, dashboard_widget_cache | /tenantId | |
| validation-engine | validation_rules, validation_runs, validation_results | /tenantId | |
| ai-service | ai_models, ai_completions, ai_agents, ai_insights, ai_proactive_insights, ai_collaborative_insights, ai_risk_analysis, reasoning_tasks, prompt_prompts, prompt_versions, prompt_ab_tests, prompt_analytics, llm_outputs | /tenantId | |
| embeddings | embedding_embeddings, embedding_documents | /tenantId | |
| utility-services | utility_imports, utility_exports, utility_migrations, notification_notifications, notification_batches, notification_preferences, notification_templates | /tenantId | |
| notification-manager | notification_notifications, notification_batches, notification_preferences, notification_templates | /tenantId | |
| ml-service | ml_models, ml_features, ml_feature_snapshots, ml_feature_metadata, ml_training_jobs, ml_evaluations, ml_predictions, multimodal_jobs, ml_win_probability_predictions, ml_drift_metrics, ml_improvement_opportunity, ml_alert_rules | /tenantId | |
| learning-service | user_feedback, outcome | /tenantId | |
| analytics-service | analytics_events, analytics_metrics, analytics_reports, quality_metrics, quality_anomalies, ai_analytics_events, ai_analytics_models, signal_intelligence_signals, analytics_usage_ml | /tenantId | |
| context-service | context_contexts, context_assemblies, context_dependency_trees, context_call_graphs, context_analyses | /tenantId | |
| configuration-service | configuration_settings, migration_migrations, migration_steps, migration_plans | /tenantId | |
| collaboration-service | collaboration_conversations, collaboration_messages, collaboration_insights | /tenantId | |
| cache-service | cache_metrics, cache_strategies | /tenantId | |
| search-service | search_queries, search_analytics, web_search_cache | /tenantId | |
| quality-monitoring | quality_anomalies, quality_explanations, quality_metrics | /tenantId | |
| signal-intelligence | signal_communications, signal_calendar, signal_social | /tenantId | |
| ai-analytics | ai_analytics_events, ai_analytics_models, ai_analytics_feedback | /tenantId | |
| web-search | web_search_results, web_search_cache | /tenantId | |
| security-scanning | security_scans, security_pii_detections, security_device_tracking | /tenantId | |
| risk-catalog | (uses shard_shards) | – | No separate container |
| secret-management | secret_secrets, secret_vaults, secret_audit_logs, secret_encryption_keys | /tenantId | |
| document-manager | document_documents, document_collections, document_templates | /tenantId | |
| template-service | template_templates, template_versions, template_context_templates, template_email_templates | /tenantId | |
| reasoning-engine | reasoning_tasks | /tenantId | |
| prompt-service | prompt_prompts, prompt_versions, prompt_ab_tests, prompt_analytics | /tenantId | |
| pipeline-manager | pipeline_opportunities, pipeline_views | /tenantId | |
| pattern-recognition | pattern_patterns, pattern_scans, pattern_matches, pattern_libraries | /tenantId | |
| content-generation | content_generation_jobs, content_templates | /tenantId | |
| adaptive-learning | adaptive_learning_paths, adaptive_progress, adaptive_skills, adaptive_assessments, adaptive_assessment_results, adaptive_outcomes, adaptive_weights, adaptive_model_selections, adaptive_tenant_config | /tenantId | |
| multi-modal-service | multimodal_jobs | /tenantId | |
| ai-insights | ai_insights, ai_proactive_insights, ai_collaborative_insights, ai_risk_analysis | /tenantId | |

## Summary

- **Partition key:** `/tenantId` (all containers)
- **Database:** Shared (default: `castiel`)
- **Initialization:** Centralized via shard-manager bootstrap (`bootstrap.ensure_cosmos_containers: true`) or `scripts/ensure-platform-containers-and-shard-types.ts`. Individual services still call `initializeDatabase`/`connectDatabase` with their own container mapping for runtime; bootstrap ensures containers exist before services start.
- **TTL:** Only `integration_suggested_links` has defaultTtl (2592000 seconds = 30 days).

## Configuration

Each service maps logical names to physical container names in `config/default.yaml`:

```yaml
cosmos_db:
  containers:
    shards: shard_shards
    shard_types: shard_shard_types
    # ...
```

## Notes

1. All containers use the same database (shared database architecture).
2. All queries must include `tenantId` in the partition key.
3. Add new containers to `containers/shard-manager/config/cosmos-containers.yaml` and to this reference when adding services.

# Legacy Azure Functions Code

This directory contains legacy Azure Functions code that has been migrated to Container Apps workers.

## Status

✅ **MIGRATED** - All functionality has been migrated to Container Apps workers:
- `apps/workers-sync` - Sync workers
- `apps/workers-processing` - Processing workers  
- `apps/workers-ingestion` - Ingestion workers

## Files

This archive contains the original Azure Functions implementations:

- `sync-scheduler.ts` - Scheduled sync task processor (migrated to workers-sync)
- `sync-inbound-worker.ts` - Inbound sync worker (migrated to workers-sync)
- `sync-outbound-worker.ts` - Outbound sync worker (migrated to workers-sync)
- `token-refresher.ts` - OAuth token refresh (migrated to workers-sync)
- `webhook-receiver.ts` - Webhook receiver (migrated to API)
- `content-generation-worker.ts` - Content generation (migrated to workers-processing)
- `enrichment-processor.ts` - Enrichment processor (migrated to workers-processing)
- `normalization-processor.ts` - Normalization processor (migrated to workers-processing)
- `project-auto-attachment-processor.ts` - Project attachment (migrated to workers-processing)
- `ingestion-gdrive.ts` - Google Drive ingestion (migrated to workers-ingestion)
- `ingestion-salesforce.ts` - Salesforce ingestion (migrated to workers-ingestion)
- `ingestion-slack.ts` - Slack ingestion (migrated to workers-ingestion)
- `azure-functions.service.test.ts` - Test file

## Migration Date

Archived: 2025-01-28

## Related Documentation

- [Functions Folder Migration Complete](../migration/FUNCTIONS_FOLDER_MIGRATION_COMPLETE.md)
- [Azure Functions to Container Apps Migration](../migration/AZURE_FUNCTIONS_TO_CONTAINER_APPS_MIGRATION.md)

## Note

These files are kept for reference only. They are not used in the active codebase and should not be modified.




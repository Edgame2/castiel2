# Legacy Resources Removal

The following legacy resources have been removed from Terraform as they have been migrated to Container Apps:

- **App Services** (`app-services.tf`): Removed - replaced by Container Apps
- **Azure Functions** (`functions.tf`): Removed - replaced by Container Apps workers

If you need to keep these resources for backward compatibility, you can:
1. Comment out the resource blocks
2. Use `terraform state rm` to remove them from state without destroying
3. Re-import them later if needed

## Migration Status

✅ **Completed**: All functionality migrated to Container Apps
- API → `azurerm_container_app.api`
- Web → `azurerm_container_app.web`
- Functions → Container Apps workers (sync, processing, ingestion)

## Cleanup

To remove legacy resources from existing deployments:

```bash
# Remove from Terraform state (doesn't destroy resources)
terraform state rm azurerm_linux_web_app.main_api
terraform state rm azurerm_service_plan.main
terraform state rm azurerm_linux_function_app.main
terraform state rm azurerm_service_plan.functions
terraform state rm azurerm_storage_account.functions

# Then destroy manually via Azure Portal or CLI if needed
```




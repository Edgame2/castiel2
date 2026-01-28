# Integration Infrastructure Terraform

This directory contains Terraform configuration for provisioning Azure infrastructure required for the Castiel Integration System.

## Resources Provisioned

### Azure Blob Storage
- **Storage Account**: `castielint{environment}` (e.g., `castielintdev`)
- **Containers**:
  - `integration-documents` - Documents from Google Drive, SharePoint, etc. (retention: 365 days)
  - `integration-recordings` - Meeting recordings (retention: 90 days)
  - `integration-attachments` - Email attachments (retention: 180 days)
- **Configuration**: Private access, HTTPS only, blob versioning enabled

### Azure Cognitive Services
- **Computer Vision** (SKU: S1) - For OCR and image text extraction
- **Speech Services** (SKU: S0) - For meeting transcription with speaker diarization

### Key Vault Secrets (Optional)
If a Key Vault ID is provided, the following secrets are stored:
- `integration-blob-connection-string` - Storage account connection string
- `computer-vision-endpoint` - Computer Vision endpoint URL
- `computer-vision-key` - Computer Vision API key
- `speech-endpoint` - Speech Services endpoint URL
- `speech-key` - Speech Services API key

## Prerequisites

1. **Azure CLI** installed and authenticated
   ```bash
   az login
   az account set --subscription <subscription-id>
   ```

2. **Terraform** >= 1.0 installed
   ```bash
   terraform version
   ```

3. **Existing Azure Resource Group**
   - Create a resource group if it doesn't exist:
     ```bash
     az group create --name rg-castiel-integration-dev --location eastus
     ```

4. **Azure Key Vault** (optional, but recommended)
   - Create a Key Vault if you want secrets stored securely:
     ```bash
     az keyvault create --name castiel-kv-dev --resource-group rg-castiel-integration-dev --location eastus
     ```

## Usage

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Configure Variables

Copy the example variables file and update with your values:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
```

Required variables:
- `environment` - Environment name (dev, staging, production)
- `location` - Azure region
- `resource_group_name` - Existing resource group name

Optional variables:
- `key_vault_id` - Key Vault ID for secret storage
- `enable_public_network_access` - Enable public network access (default: true)
- `computer_vision_custom_subdomain` - Custom subdomain for Computer Vision
- `speech_custom_subdomain` - Custom subdomain for Speech Services

### 3. Plan and Apply

```bash
# Review the execution plan
terraform plan

# Apply the configuration
terraform apply
```

### 4. Retrieve Outputs

After applying, retrieve sensitive outputs:

```bash
# Get storage connection string
terraform output -raw storage_account_primary_connection_string

# Get Computer Vision endpoint
terraform output computer_vision_endpoint

# Get Computer Vision key
terraform output -raw computer_vision_key

# Get Speech Services endpoint
terraform output speech_endpoint

# Get Speech Services key
terraform output -raw speech_key
```

## Environment Variables

After provisioning, set these environment variables in your application:

```bash
# Azure Blob Storage
export AZURE_BLOB_CONNECTION_STRING="<from terraform output>"

# Computer Vision
export AZURE_COMPUTER_VISION_ENDPOINT="<from terraform output>"
export AZURE_COMPUTER_VISION_KEY="<from terraform output>"

# Speech Services
export AZURE_SPEECH_ENDPOINT="<from terraform output>"
export AZURE_SPEECH_KEY="<from terraform output>"
```

Or retrieve from Key Vault (if configured):

```bash
# From Azure Key Vault
az keyvault secret show --vault-name castiel-kv-dev --name integration-blob-connection-string --query value -o tsv
az keyvault secret show --vault-name castiel-kv-dev --name computer-vision-endpoint --query value -o tsv
az keyvault secret show --vault-name castiel-kv-dev --name computer-vision-key --query value -o tsv
az keyvault secret show --vault-name castiel-kv-dev --name speech-endpoint --query value -o tsv
az keyvault secret show --vault-name castiel-kv-dev --name speech-key --query value -o tsv
```

## Storage Container Lifecycle Management

The Terraform configuration creates the containers, but lifecycle management (retention policies) should be configured separately:

### Option 1: Azure Policy
Create an Azure Policy to enforce retention policies on storage containers.

### Option 2: Storage Account Management Rules
Configure lifecycle management rules in the Azure Portal or via Azure CLI:

```bash
# Example: Set retention policy for documents container (365 days)
az storage blob service-properties update \
  --account-name castielintdev \
  --delete-retention-days 365
```

### Option 3: Application-Level Cleanup
Implement cleanup jobs in your application to delete old blobs based on creation date.

## Security Considerations

1. **Network Access**: By default, public network access is enabled. For production, consider:
   - Setting `enable_public_network_access = false`
   - Configuring private endpoints
   - Restricting IP addresses using `allowed_ip_addresses` variable

2. **Key Vault**: Store all sensitive credentials in Azure Key Vault:
   - Set `key_vault_id` variable
   - Ensure appropriate access policies are configured
   - Use managed identities where possible

3. **Storage Account**:
   - HTTPS only is enabled by default
   - Blob versioning is enabled for data protection
   - Soft delete is configured (30 days retention)

4. **Cognitive Services**:
   - Use managed identities for authentication when possible
   - Monitor usage and set up alerts for cost management
   - Consider private endpoints for production environments

## Cost Optimization

- **Storage Account**: Use LRS (Locally Redundant Storage) for non-production environments
- **Cognitive Services**: 
  - Computer Vision S1: Pay-per-transaction
  - Speech Services S0: Free tier available (limited usage)
- **Lifecycle Management**: Configure retention policies to automatically delete old blobs

## Troubleshooting

### Storage Account Name Already Exists
Storage account names must be globally unique. If you get a conflict:
- Modify the `name` in `integration-infrastructure.tf` to use a unique suffix
- Or use a different environment name

### Key Vault Access Denied
Ensure the service principal or user running Terraform has:
- `Key Vault Secrets Officer` role (to create secrets)
- Or `Key Vault Contributor` role (full access)

### Cognitive Services Not Available in Region
Some Cognitive Services may not be available in all regions. If you get an error:
- Check available regions: `az cognitiveservices account list-skus --kind ComputerVision`
- Update the `location` variable to a supported region

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all storage containers and their contents. Ensure you have backups before destroying.

## References

- [Azure Storage Account Documentation](https://docs.microsoft.com/azure/storage/common/storage-account-overview)
- [Azure Cognitive Services Documentation](https://docs.microsoft.com/azure/cognitive-services/)
- [Terraform Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

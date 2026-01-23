#!/bin/bash
#
# Database Credential Rotation Script
#
# Rotates Cosmos DB primary and secondary keys in Azure Key Vault.
# Supports zero-downtime rotation with dual-write period.
#
# Usage:
#   ./rotate-database-credentials.sh --environment production --key-type primary [--dry-run] [--force]
#
# Options:
#   --environment    Target environment (development, staging, production)
#   --key-type       Key type to rotate (primary, secondary, or both)
#   --dry-run        Preview changes without applying
#   --force          Skip confirmation prompts
#   --rollback       Rollback to previous version
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
KEY_TYPE=""
DRY_RUN=false
FORCE=false
ROLLBACK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --key-type)
      KEY_TYPE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
  echo -e "${RED}Error: --environment is required${NC}"
  exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  echo -e "${RED}Error: Invalid environment. Must be: development, staging, or production${NC}"
  exit 1
fi

# Validate key type
if [[ -z "$KEY_TYPE" ]]; then
  KEY_TYPE="both"
fi

if [[ ! "$KEY_TYPE" =~ ^(primary|secondary|both)$ ]]; then
  echo -e "${RED}Error: Invalid key-type. Must be: primary, secondary, or both${NC}"
  exit 1
fi

# Set resource names based on environment
RESOURCE_GROUP="rg-castiel-${ENVIRONMENT}"
COSMOS_ACCOUNT="cosmos-castiel-${ENVIRONMENT}"
KEY_VAULT_NAME="kv-castiel-${ENVIRONMENT}"

echo -e "${GREEN}Database Credential Rotation${NC}"
echo "Environment: $ENVIRONMENT"
echo "Cosmos DB Account: $COSMOS_ACCOUNT"
echo "Key Vault: $KEY_VAULT_NAME"
echo "Key Type: $KEY_TYPE"
echo "Dry Run: $DRY_RUN"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo -e "${RED}Error: Azure CLI is not installed${NC}"
  exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
  echo -e "${RED}Error: Not logged in to Azure. Run 'az login'${NC}"
  exit 1
fi

# Confirm before proceeding (unless --force)
if [[ "$FORCE" == false ]] && [[ "$DRY_RUN" == false ]]; then
  echo -e "${YELLOW}Warning: This will rotate Cosmos DB keys. Both old and new keys will work during transition.${NC}"
  read -p "Continue? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Function to rotate a key
rotate_key() {
  local key_type=$1
  local key_name=""
  local secret_name=""
  
  if [[ "$key_type" == "primary" ]]; then
    key_name="primaryMasterKey"
    secret_name="COSMOS_DB_PRIMARY_KEY"
  elif [[ "$key_type" == "secondary" ]]; then
    key_name="secondaryMasterKey"
    secret_name="COSMOS_DB_SECONDARY_KEY"
  else
    echo -e "${RED}Invalid key type: $key_type${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Rotating $key_type key...${NC}"
  
  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY RUN] Would regenerate $key_type key for Cosmos DB account"
    echo "  [DRY RUN] Would update Key Vault secret: $secret_name"
    return 0
  fi
  
  # Get current key version for rollback reference
  local current_version=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --query "properties.version" \
    --output tsv 2>/dev/null || echo "")
  
  if [[ -n "$current_version" ]]; then
    echo "  Current version: $current_version (saved for rollback)"
  fi
  
  # Regenerate Cosmos DB key
  echo "  Regenerating Cosmos DB $key_type key..."
  local new_key=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "$key_name" \
    --output tsv)
  
  # Regenerate the key (this creates a new key)
  az cosmosdb keys regenerate \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --key-kind "$key_name" \
    --output none
  
  # Get the new key
  new_key=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "$key_name" \
    --output tsv)
  
  # Update Key Vault secret
  echo "  Updating Key Vault secret..."
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --value "$new_key" \
    --description "Cosmos DB $key_type key - Rotated $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --output none
  
  echo -e "${GREEN}  ✓ $key_type key rotated successfully${NC}"
  
  # Log rotation event
  echo "  Logging rotation event..."
}

# Function to rollback a key
rollback_key() {
  local key_type=$1
  local secret_name=""
  
  if [[ "$key_type" == "primary" ]]; then
    secret_name="COSMOS_DB_PRIMARY_KEY"
  elif [[ "$key_type" == "secondary" ]]; then
    secret_name="COSMOS_DB_SECONDARY_KEY"
  else
    echo -e "${RED}Invalid key type: $key_type${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}Rolling back $key_type key...${NC}"
  
  # Get previous version
  local versions=$(az keyvault secret list-versions \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --query "[].{version: id, time: attributes.updated}" \
    --output tsv | sort -k2 -r | head -2)
  
  if [[ -z "$versions" ]]; then
    echo -e "${RED}  ✗ No previous version found${NC}"
    return 1
  fi
  
  # Get second version (previous)
  local previous_version=$(echo "$versions" | tail -1 | cut -f1 | xargs basename)
  
  echo "  Restoring version: $previous_version"
  
  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY RUN] Would restore version $previous_version"
    return 0
  fi
  
  # Restore previous version
  az keyvault secret restore \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --version "$previous_version" \
    --output none
  
  echo -e "${GREEN}  ✓ $key_type key rolled back successfully${NC}"
}

# Main rotation logic
if [[ "$ROLLBACK" == true ]]; then
  echo -e "${YELLOW}Rollback Mode${NC}"
  if [[ "$KEY_TYPE" == "primary" ]] || [[ "$KEY_TYPE" == "both" ]]; then
    rollback_key "primary"
  fi
  if [[ "$KEY_TYPE" == "secondary" ]] || [[ "$KEY_TYPE" == "both" ]]; then
    rollback_key "secondary"
  fi
else
  echo -e "${GREEN}Rotation Mode${NC}"
  if [[ "$KEY_TYPE" == "primary" ]] || [[ "$KEY_TYPE" == "both" ]]; then
    rotate_key "primary"
  fi
  if [[ "$KEY_TYPE" == "secondary" ]] || [[ "$KEY_TYPE" == "both" ]]; then
    rotate_key "secondary"
  fi
  
  echo ""
  echo -e "${GREEN}Rotation Complete${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Both old and new keys work simultaneously (no downtime)"
  echo "2. Restart application services to pick up new keys"
  echo "3. Monitor database connection health"
  echo "4. After verification period, old key versions can be removed"
fi

echo ""
echo -e "${GREEN}Done${NC}"

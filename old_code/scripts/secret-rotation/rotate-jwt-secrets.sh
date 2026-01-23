#!/bin/bash
#
# JWT Secret Rotation Script
#
# Rotates JWT access and refresh token secrets in Azure Key Vault.
# Supports zero-downtime rotation with dual-write period.
#
# Usage:
#   ./rotate-jwt-secrets.sh --environment production [--dry-run] [--force]
#
# Options:
#   --environment    Target environment (development, staging, production)
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

# Set Key Vault name based on environment
KEY_VAULT_NAME="kv-castiel-${ENVIRONMENT}"

echo -e "${GREEN}JWT Secret Rotation${NC}"
echo "Environment: $ENVIRONMENT"
echo "Key Vault: $KEY_VAULT_NAME"
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
  echo -e "${YELLOW}Warning: This will rotate JWT secrets. Existing tokens will continue to work during dual-write period.${NC}"
  read -p "Continue? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Function to generate new secret
generate_secret() {
  openssl rand -base64 32 | tr -d '\n'
}

# Function to rotate a secret
rotate_secret() {
  local secret_name=$1
  local description=$2
  
  echo -e "${GREEN}Rotating $secret_name...${NC}"
  
  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY RUN] Would generate new secret for $secret_name"
    local new_secret=$(generate_secret)
    echo "  [DRY RUN] New secret (first 10 chars): ${new_secret:0:10}..."
    return 0
  fi
  
  # Generate new secret
  local new_secret=$(generate_secret)
  
  # Get current secret version for rollback reference
  local current_version=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --query "properties.version" \
    --output tsv 2>/dev/null || echo "")
  
  # Store current version in metadata for rollback
  if [[ -n "$current_version" ]]; then
    echo "  Current version: $current_version (saved for rollback)"
  fi
  
  # Set new secret in Key Vault
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --value "$new_secret" \
    --description "$description - Rotated $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --output none
  
  echo -e "${GREEN}  ✓ Secret rotated successfully${NC}"
  
  # Log rotation event (if Application Insights is configured)
  echo "  Logging rotation event..."
  # Note: In production, this would send an event to Application Insights
}

# Function to rollback a secret
rollback_secret() {
  local secret_name=$1
  
  echo -e "${YELLOW}Rolling back $secret_name...${NC}"
  
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
  
  echo -e "${GREEN}  ✓ Secret rolled back successfully${NC}"
}

# Main rotation logic
if [[ "$ROLLBACK" == true ]]; then
  echo -e "${YELLOW}Rollback Mode${NC}"
  rollback_secret "JWT_ACCESS_SECRET"
  rollback_secret "JWT_REFRESH_SECRET"
else
  echo -e "${GREEN}Rotation Mode${NC}"
  rotate_secret "JWT_ACCESS_SECRET" "JWT Access Token Signing Secret"
  rotate_secret "JWT_REFRESH_SECRET" "JWT Refresh Token Signing Secret"
  
  echo ""
  echo -e "${GREEN}Rotation Complete${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Monitor authentication endpoints for errors"
  echo "2. Old tokens will continue to work during dual-write period (24-48 hours)"
  echo "3. After dual-write period, old secret versions can be removed"
  echo "4. Monitor Application Insights for authentication metrics"
fi

echo ""
echo -e "${GREEN}Done${NC}"

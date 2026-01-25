# Utility Services Module - Architecture

## Overview

The Utility Services module provides utility and helper services for the Castiel system. It handles import/export, schema migrations, computed fields, field validation, user onboarding, project activity tracking, and service registry management.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `utility_imports` | `/tenantId` | Import jobs |
| `utility_exports` | `/tenantId` | Export jobs |
| `utility_migrations` | `/tenantId` | Schema migrations |

## Service Architecture

### Core Services

1. **UtilityService** - Utility services orchestration
   - Import/export functionality
   - Schema migration management
   - Computed field processing
   - Field validation
   - User onboarding
   - Project activity tracking
   - Service registry management

## Integration Points

- Various (low coupling)

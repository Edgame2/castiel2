# Risk Catalog Module - Architecture

## Overview

The Risk Catalog module provides risk catalog management with global, industry, and tenant-specific risk definitions. It serves as the foundation for risk evaluation by providing unified risk catalogs that merge global, industry-specific, and tenant-specific risks.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses shard-manager containers with `shardTypeId = risk_catalog`:

| Storage Type | Tenant | Description |
|--------------|--------|-------------|
| Global risks | `system` tenant | Global risk definitions (`catalogType: 'global'`) |
| Industry risks | `system` tenant | Industry-specific risks (`catalogType: 'industry'`, includes `industryId`) |
| Tenant risks | Tenant's shards | Tenant-specific risks (`catalogType: 'tenant'`) |
| Tenant overrides | Tenant's shards | Enable/disable overrides (`isOverride: true, enabled: boolean`) |

**Partition Key**: `/tenantId` for all shards

## Service Architecture

### Core Services

1. **RiskCatalogService** - Main risk catalog management
   - Get applicable catalog (merges global + industry + tenant-specific)
   - Create custom risks (global, industry, or tenant-specific)
   - Update risk catalog entries
   - Duplicate risks (global/industry → tenant-specific)
   - Enable/disable risks per tenant
   - Delete tenant-specific risks
   - Risk ponderation (weighting) management
   - Risk categorization and tagging
   - Risk metadata management

## Integration Points

- **shard-manager**: Uses shards for risk catalog storage (REST API)
- **risk-analytics**: Provides risk catalog for evaluation (REST API)

## Event-Driven Communication

### Published Events

- `risk.catalog.created` - Risk catalog entry created
- `risk.catalog.updated` - Risk catalog entry updated
- `risk.catalog.deleted` - Risk catalog entry deleted
- `risk.catalog.enabled` - Risk enabled for tenant
- `risk.catalog.disabled` - Risk disabled for tenant
- `risk.catalog.duplicated` - Risk duplicated to tenant

### Consumed Events

- None (read-only service, other services query it via REST API)

## Data Flow

1. Risk-analytics queries risk-catalog via REST API
2. Risk catalog merges global, industry, and tenant-specific risks
3. Filters disabled risks per tenant
4. Returns unified catalog for risk evaluation
5. Risk ponderation (weights) used in risk scoring calculations

## Security

- All queries include tenantId in partition key
- Role-based access control (super-admin vs tenant admin)
- Global/industry risks cannot be deleted (only disabled)
- Tenant-specific risks can be deleted

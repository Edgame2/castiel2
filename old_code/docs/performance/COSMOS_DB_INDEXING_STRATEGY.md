# Cosmos DB Indexing Strategy

**Last Updated**: January 2025  
**Status**: Production Configuration

---

## Executive Summary

This document outlines the Cosmos DB indexing strategy for the Castiel platform. Proper indexing is critical for query performance, cost optimization, and scalability.

---

## Indexing Policy Overview

### Automatic Indexing

All containers use **automatic indexing** with **consistent** indexing mode:
- Indexes are created automatically for all paths
- Indexes are updated synchronously with writes
- Provides best query performance at the cost of slightly higher write RU consumption

### Indexing Mode

- **Mode**: `consistent`
- **Automatic**: `true`
- **Update Policy**: Synchronous (indexes updated immediately after writes)

---

## Container-Specific Indexing Strategies

### 1. Shards Container

**Partition Key**: `/tenantId`

#### Composite Indexes

The following composite indexes are configured to optimize common query patterns:

1. **Tenant + Created Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/createdAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List shards by tenant, newest first
   - **Query Pattern**: `WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC`

2. **Tenant + User + Created Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/userId", "order": "ascending" },
     { "path": "/createdAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List shards by user within tenant
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.createdAt DESC`

3. **Tenant + Shard Type + Created Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/shardTypeId", "order": "ascending" },
     { "path": "/createdAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List shards by type within tenant
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId ORDER BY c.createdAt DESC`

4. **Tenant + Status + Updated Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/status", "order": "ascending" },
     { "path": "/updatedAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List active shards, recently updated first
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.updatedAt DESC`

5. **Tenant + Status + Archived Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/status", "order": "ascending" },
     { "path": "/archivedAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List archived shards
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.status = 'archived' ORDER BY c.archivedAt DESC`

6. **Tenant + Source + Created Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/source", "order": "ascending" },
     { "path": "/createdAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List shards by source (e.g., import, manual, API)
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.source = @source ORDER BY c.createdAt DESC`

7. **Tenant + Last Activity Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/lastActivityAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List shards by activity, most active first
   - **Query Pattern**: `WHERE c.tenantId = @tenantId ORDER BY c.lastActivityAt DESC`

8. **Tenant + Shard Type + Owner ID + Updated Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/shardTypeId", "order": "ascending" },
     { "path": "/structuredData/ownerId", "order": "ascending" },
     { "path": "/updatedAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List opportunities by owner (opportunity-specific)
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId AND c.structuredData.ownerId = @ownerId ORDER BY c.updatedAt DESC`

9. **Tenant + Shard Type + Stage + Updated Date (Descending)**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/shardTypeId", "order": "ascending" },
     { "path": "/structuredData/stage", "order": "ascending" },
     { "path": "/updatedAt", "order": "descending" }
   ]
   ```
   - **Use Case**: List opportunities by stage (opportunity-specific)
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId AND c.structuredData.stage = @stage ORDER BY c.updatedAt DESC`

#### Excluded Paths

The following paths are excluded from indexing to reduce write RU consumption:

- `/unstructuredData/*` - Large text content, not queried directly
- `/_etag/?` - System property, no need to index

#### Vector Index

A spatial index is configured for vector similarity search:

```json
{
  "path": "/vectors/?",
  "type": "Vector"
}
```

- **Use Case**: Vector similarity search for AI-powered search
- **Distance Function**: Cosine (default)
- **Data Type**: Float32

---

### 2. Shard Edges Container

**Partition Key**: `/tenantId`

#### Composite Indexes

1. **Tenant + Source Shard + Relationship Type**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/sourceShardId", "order": "ascending" },
     { "path": "/relationshipType", "order": "ascending" }
   ]
   ```
   - **Use Case**: Get outgoing relationships from a shard
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.sourceShardId = @sourceShardId AND c.relationshipType = @relationshipType`

2. **Tenant + Target Shard + Relationship Type**
   ```json
   [
     { "path": "/tenantId", "order": "ascending" },
     { "path": "/targetShardId", "order": "ascending" },
     { "path": "/relationshipType", "order": "ascending" }
   ]
   ```
   - **Use Case**: Get incoming relationships to a shard
   - **Query Pattern**: `WHERE c.tenantId = @tenantId AND c.targetShardId = @targetShardId AND c.relationshipType = @relationshipType`

---

### 3. Other Containers

Most other containers use automatic indexing with default composite indexes based on partition key and common query patterns:

- **Users**: `tenantId + email`, `tenantId + createdAt`
- **Roles**: `tenantId + name`, `tenantId + createdAt`
- **Tenants**: `id + createdAt`
- **Revisions**: `tenantId + shardId + timestamp`
- **Shard Types**: `tenantId + name`, `tenantId + status`

---

## Indexing Best Practices

### 1. Always Include Partition Key

**Rule**: All composite indexes must start with the partition key (`/tenantId` for most containers).

**Why**: Cosmos DB requires partition key in queries for efficient routing. Indexes that don't start with partition key are less effective.

**Example**:
```sql
-- ✅ Good: Partition key first
WHERE c.tenantId = @tenantId AND c.status = @status

-- ❌ Bad: Missing partition key
WHERE c.status = @status
```

### 2. Order Index Fields by Selectivity

**Rule**: Order index fields from most selective to least selective.

**Why**: More selective filters reduce the dataset earlier in query execution.

**Example**:
```json
[
  { "path": "/tenantId", "order": "ascending" },      // Most selective (partition key)
  { "path": "/shardTypeId", "order": "ascending" },  // Medium selectivity
  { "path": "/status", "order": "ascending" },       // Less selective
  { "path": "/createdAt", "order": "descending" }    // Used for ordering
]
```

### 3. Use Composite Indexes for Multi-Field Queries

**Rule**: Create composite indexes for queries that filter or order by multiple fields.

**Why**: Composite indexes enable efficient execution of multi-field queries.

**Example**:
```sql
-- Query benefits from composite index
WHERE c.tenantId = @tenantId 
  AND c.shardTypeId = @shardTypeId 
  AND c.status = @status
ORDER BY c.createdAt DESC
```

### 4. Exclude Large, Non-Queried Fields

**Rule**: Exclude large fields (e.g., `unstructuredData`) from indexing if they're not queried.

**Why**: Reduces write RU consumption and index storage.

**Configuration**:
```json
{
  "excludedPaths": [
    { "path": "/unstructuredData/*" }
  ]
}
```

### 5. Monitor Index Usage

**Rule**: Regularly monitor query performance and index usage.

**Metrics to Track**:
- Query execution time (p50, p95, p99)
- Request unit (RU) consumption
- Index utilization
- Slow query frequency

**Tools**:
- Application Insights custom metrics
- Cosmos DB metrics in Azure Portal
- Query performance analysis script: `apps/api/src/scripts/analyze-query-performance.ts`

---

## Index Verification

### 1. Verify Indexes in Terraform

Indexes are defined in `infrastructure/terraform/cosmos-db.tf`:

```bash
# Review indexing policy
grep -A 20 "composite_index" infrastructure/terraform/cosmos-db.tf
```

### 2. Verify Indexes in Azure Portal

1. Navigate to Cosmos DB account → Data Explorer
2. Select container → Settings → Indexing Policy
3. Verify composite indexes match Terraform configuration

### 3. Test Query Performance

Use the query performance analysis script:

```bash
pnpm --filter @castiel/api run analyze:query-performance
```

This script:
- Executes sample queries
- Measures execution time and RU consumption
- Identifies missing indexes
- Provides optimization recommendations

### 4. Monitor Query Metrics

Query performance is automatically tracked via:
- Application Insights custom metrics (`query.duration`, `query.request_charge`)
- Slow query events (`query.slow`, `query.expensive`)
- Dependency tracking (`cosmosdb.*`)

View metrics in Application Insights:
- Custom Metrics: `query.duration`, `query.request_charge`
- Events: `query.slow`, `query.expensive`
- Dependencies: `cosmosdb.*`

---

## Performance Targets

### Query Performance Budgets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Query Duration | < 50ms | > 100ms |
| P95 Query Duration | < 200ms | > 500ms |
| P99 Query Duration | < 500ms | > 1000ms |
| Average RU Consumption | < 5 RUs | > 10 RUs |
| Slow Query Rate | < 1% | > 5% |

### Index Performance Impact

- **Write RU Overhead**: ~5-10% increase per composite index
- **Query Performance**: 50-90% improvement for indexed queries
- **Storage Overhead**: ~10-20% increase per composite index

---

## Adding New Indexes

### Process

1. **Identify Query Pattern**
   - Analyze slow query logs
   - Identify frequently executed queries
   - Measure current performance

2. **Design Composite Index**
   - Start with partition key
   - Add filter fields in selectivity order
   - Add ordering fields last

3. **Update Terraform**
   - Add composite index to `infrastructure/terraform/cosmos-db.tf`
   - Follow existing index naming conventions

4. **Test in Staging**
   - Deploy to staging environment
   - Verify query performance improvement
   - Monitor write RU consumption

5. **Deploy to Production**
   - Deploy via Terraform
   - Monitor performance metrics
   - Verify slow query reduction

### Example: Adding New Index

**Scenario**: Need to optimize queries filtering by `metadata.category` and ordering by `createdAt`.

**Step 1**: Add to Terraform configuration

```hcl
# In infrastructure/terraform/cosmos-db.tf
composite_index {
  index {
    path  = "/tenantId"
    order = "Ascending"
  }
  index {
    path  = "/metadata/category"
    order = "Ascending"
  }
  index {
    path  = "/createdAt"
    order = "Descending"
  }
}
```

**Step 2**: Apply Terraform

```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

**Step 3**: Verify in Azure Portal

**Step 4**: Monitor performance

---

## Troubleshooting

### Slow Queries Despite Indexes

**Possible Causes**:
1. Query doesn't use partition key
2. Query filters don't match index order
3. Index not yet built (for new indexes)
4. Query uses non-indexed fields

**Solutions**:
1. Ensure partition key is in WHERE clause
2. Reorder query filters to match index
3. Wait for index to build (can take hours for large containers)
4. Add index for non-indexed fields or exclude from query

### High Write RU Consumption

**Possible Causes**:
1. Too many composite indexes
2. Large fields being indexed
3. High write volume

**Solutions**:
1. Review and remove unused indexes
2. Exclude large fields from indexing
3. Consider lazy indexing for low-priority containers

### Missing Index Warnings

**Possible Causes**:
1. Query uses fields not in any index
2. Query pattern changed but index not updated

**Solutions**:
1. Add composite index for new query pattern
2. Update existing index to include new fields

---

## Related Documentation

- [Database Query Optimization Analysis](./DATABASE_QUERY_OPTIMIZATION_ANALYSIS.md) - Query optimization opportunities
- [Performance Budgets](./PERFORMANCE_BUDGETS.md) - Performance targets
- [Query Performance Tracker](../../apps/api/src/utils/query-performance-tracker.ts) - Performance tracking utility
- [Cosmos DB Terraform Configuration](../../infrastructure/terraform/cosmos-db.tf) - Infrastructure as Code

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly  
**Maintained By**: Platform Engineering Team

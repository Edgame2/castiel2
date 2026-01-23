# Pipeline Manager Module

Sales pipeline and opportunity management service.

**Service**: `containers/pipeline-manager/`  
**Port**: 3025  
**API Base**: `/api/v1/pipelines`, `/api/v1/opportunities`  
**Database**: Cosmos DB NoSQL (containers: `pipeline_opportunities`, `pipeline_views`)

## Overview

The Pipeline Manager module provides sales pipeline visualization, opportunity management, and analytics.

## Features

- Pipeline views and visualization
- Opportunity CRUD operations
- Pipeline analytics and forecasting
- Opportunity auto-linking

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/pipeline-manager/README.md)

## Dependencies

- Shard Manager (for opportunity shard management)
- Logging (for audit logging)
- User Management (for user context)


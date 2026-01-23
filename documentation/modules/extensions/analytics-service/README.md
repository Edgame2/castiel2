# Analytics Service Module

Analytics and reporting service.

**Service**: `containers/analytics-service/`  
**Port**: 3030  
**API Base**: `/api/v1/analytics`  
**Database**: Cosmos DB NoSQL (containers: `analytics_metrics`, `analytics_reports`)

## Overview

The Analytics Service module provides analytics, reporting, and performance metrics.

## Features

- General analytics and metrics
- Project analytics
- AI analytics
- API performance metrics

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/analytics-service/README.md)

## Dependencies

- Shard Manager (for data access)
- Logging (for audit logging)
- User Management (for user context)


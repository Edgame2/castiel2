# Application Log Monitoring API Documentation

## Base URL

```
http://localhost:3015/api/v1/monitoring
```

## Authentication

All endpoints require service-to-service JWT authentication:

```
Authorization: Bearer <service-jwt-token>
```

## Common Headers

- `X-Tenant-ID` - Tenant ID (required for multi-tenant operations)
- `X-Correlation-ID` - Request correlation ID (optional, auto-generated if not provided)
- `Content-Type: application/json`

## Endpoints

### Logs

#### POST /api/v1/monitoring/logs

Send a single log entry.

**Request:**
```json
{
  "level": "info",
  "message": "Processing insight request",
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "correlationId": "corr-789",
  "properties": {
    "insightType": "risk-analysis",
    "conversationId": "conv-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "logId": "log-abc123",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

**Status Codes:**
- `201 Created` - Log entry created successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Missing or invalid authentication
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

#### POST /api/v1/monitoring/logs/batch

Send multiple log entries in a single request.

**Request:**
```json
{
  "entries": [
    {
      "level": "info",
      "message": "Log entry 1",
      "service": "ai-insights",
      "tenantId": "tenant-123"
    },
    {
      "level": "error",
      "message": "Log entry 2",
      "service": "ai-insights",
      "tenantId": "tenant-123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "logIds": ["log-abc123", "log-xyz789"]
}
```

#### GET /api/v1/monitoring/logs

Query logs with filters.

**Query Parameters:**
- `service` (string, optional) - Filter by service name
- `tenantId` (string, optional) - Filter by tenant ID
- `userId` (string, optional) - Filter by user ID
- `level` (string, optional) - Filter by log level (trace|debug|info|warn|error|fatal)
- `startTime` (string, optional) - Start timestamp (ISO 8601)
- `endTime` (string, optional) - End timestamp (ISO 8601)
- `limit` (number, optional) - Maximum number of results (default: 100, max: 1000)
- `offset` (number, optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": "log-abc123",
      "level": "info",
      "message": "Processing insight request",
      "service": "ai-insights",
      "tenantId": "tenant-123",
      "userId": "user-456",
      "correlationId": "corr-789",
      "timestamp": "2026-01-23T10:30:00Z",
      "properties": {
        "insightType": "risk-analysis"
      }
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

### Metrics

#### POST /api/v1/monitoring/metrics

Record a custom metric.

**Request:**
```json
{
  "name": "insight_generation_time",
  "value": 245,
  "unit": "milliseconds",
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "properties": {
    "insightType": "risk-analysis",
    "model": "gpt-4"
  }
}
```

**Response:**
```json
{
  "success": true,
  "metricId": "metric-abc123",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### POST /api/v1/monitoring/metrics/batch

Record multiple metrics in a single request.

**Request:**
```json
{
  "metrics": [
    {
      "name": "api_requests_total",
      "value": 1,
      "service": "ai-insights"
    },
    {
      "name": "api_request_duration",
      "value": 150,
      "unit": "milliseconds",
      "service": "ai-insights"
    }
  ]
}
```

#### GET /api/v1/monitoring/metrics

Query metrics.

**Query Parameters:**
- `name` (string, optional) - Filter by metric name
- `service` (string, optional) - Filter by service name
- `tenantId` (string, optional) - Filter by tenant ID
- `startTime` (string, optional) - Start timestamp (ISO 8601)
- `endTime` (string, optional) - End timestamp (ISO 8601)
- `aggregation` (string, optional) - Aggregation function (sum|avg|min|max|count)
- `interval` (string, optional) - Time interval for aggregation (e.g., "1h", "5m")

**Response:**
```json
{
  "metrics": [
    {
      "name": "insight_generation_time",
      "value": 245,
      "unit": "milliseconds",
      "service": "ai-insights",
      "tenantId": "tenant-123",
      "timestamp": "2026-01-23T10:30:00Z"
    }
  ],
  "aggregation": {
    "sum": 245,
    "avg": 245,
    "count": 1
  }
}
```

### Errors

#### POST /api/v1/monitoring/errors

Report an error.

**Request:**
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Invalid input parameter",
    "stack": "Error: Invalid input parameter\n    at ..."
  },
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "correlationId": "corr-789",
  "context": {
    "request": {
      "method": "POST",
      "url": "/api/v1/insights",
      "headers": {
        "content-type": "application/json"
      }
    },
    "custom": {
      "insightType": "risk-analysis"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "errorId": "error-abc123",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### GET /api/v1/monitoring/errors

Query errors.

**Query Parameters:**
- `service` (string, optional) - Filter by service name
- `tenantId` (string, optional) - Filter by tenant ID
- `startTime` (string, optional) - Start timestamp (ISO 8601)
- `endTime` (string, optional) - End timestamp (ISO 8601)
- `limit` (number, optional) - Maximum number of results (default: 100)

**Response:**
```json
{
  "errors": [
    {
      "id": "error-abc123",
      "type": "ValidationError",
      "message": "Invalid input parameter",
      "service": "ai-insights",
      "tenantId": "tenant-123",
      "timestamp": "2026-01-23T10:30:00Z",
      "count": 5
    }
  ],
  "total": 1
}
```

### Traces

#### POST /api/v1/monitoring/traces

Send a trace span.

**Request:**
```json
{
  "traceId": "trace-abc123",
  "spanId": "span-xyz789",
  "parentSpanId": "span-parent",
  "name": "generate-insight",
  "service": "ai-insights",
  "startTime": 1706011200000,
  "endTime": 1706011200245,
  "duration": 245,
  "status": "ok",
  "tags": {
    "insightType": "risk-analysis",
    "model": "gpt-4"
  },
  "logs": [
    {
      "timestamp": 1706011200100,
      "fields": {
        "event": "processing",
        "message": "Starting insight generation"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "spanId": "span-xyz789",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### GET /api/v1/monitoring/traces/{traceId}

Get a complete trace by trace ID.

**Response:**
```json
{
  "traceId": "trace-abc123",
  "spans": [
    {
      "spanId": "span-xyz789",
      "parentSpanId": null,
      "name": "generate-insight",
      "service": "ai-insights",
      "startTime": 1706011200000,
      "endTime": 1706011200245,
      "duration": 245,
      "status": "ok"
    }
  ],
  "totalDuration": 245
}
```

### Health & Status

#### GET /api/v1/monitoring/health

Service health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-23T10:30:00Z",
  "version": "1.0.0"
}
```

#### GET /api/v1/monitoring/providers/status

Get status of all configured monitoring providers.

**Response:**
```json
{
  "providers": [
    {
      "name": "application-insights",
      "enabled": true,
      "status": "healthy",
      "lastCheck": "2026-01-23T10:30:00Z"
    },
    {
      "name": "sentry",
      "enabled": false,
      "status": "disabled",
      "lastCheck": null
    }
  ]
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "level",
      "reason": "Must be one of: trace, debug, info, warn, error, fatal"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `PROVIDER_ERROR` - Monitoring provider error
- `INTERNAL_ERROR` - Internal server error

## Rate Limiting

- Default: 1000 requests per minute per service
- Burst: Up to 100 requests in a single second
- Headers included in response:
  - `X-RateLimit-Limit` - Maximum requests per window
  - `X-RateLimit-Remaining` - Remaining requests in current window
  - `X-RateLimit-Reset` - Timestamp when limit resets

## Pagination

List endpoints support pagination via `limit` and `offset` query parameters:

```
GET /api/v1/monitoring/logs?limit=50&offset=100
```

Response includes pagination metadata:
```json
{
  "logs": [...],
  "total": 500,
  "limit": 50,
  "offset": 100,
  "hasMore": true
}
```

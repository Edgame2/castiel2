/**
 * Audit Log API Schemas
 * JSON Schema definitions for audit log routes
 */

const auditLogEntryResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenantId: { type: 'string' },
    category: { type: 'string' },
    eventType: { type: 'string' },
    severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
    outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
    timestamp: { type: 'string' },
    actorId: { type: ['string', 'null'] },
    actorEmail: { type: ['string', 'null'] },
    actorType: { type: 'string', enum: ['user', 'system', 'api', 'service'] },
    targetId: { type: ['string', 'null'] },
    targetType: { type: ['string', 'null'] },
    targetName: { type: ['string', 'null'] },
    ipAddress: { type: ['string', 'null'] },
    userAgent: { type: ['string', 'null'] },
    requestId: { type: ['string', 'null'] },
    sessionId: { type: ['string', 'null'] },
    message: { type: 'string' },
    details: { type: ['object', 'null'] },
    errorCode: { type: ['string', 'null'] },
    errorMessage: { type: ['string', 'null'] },
    metadata: {
      type: ['object', 'null'],
      properties: {
        source: { type: 'string' },
        version: { type: 'string' },
        environment: { type: 'string' },
        correlationId: { type: 'string' },
      },
    },
  },
  required: ['id', 'tenantId', 'category', 'eventType', 'severity', 'outcome', 'timestamp', 'message'],
};

export const listAuditLogsSchema = {
  querystring: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['authentication', 'authorization', 'user_management', 'tenant_management', 'data_access', 'data_modification', 'system', 'security', 'api'],
      },
      eventType: { type: 'string' },
      severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
      outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
      actorId: { type: 'string' },
      actorEmail: { type: 'string' },
      targetId: { type: 'string' },
      targetType: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      search: { type: 'string', maxLength: 200 },
      limit: { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      sortBy: { type: 'string', enum: ['timestamp', 'severity', 'category'], default: 'timestamp' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: auditLogEntryResponse },
        total: { type: 'integer' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
      required: ['logs', 'total', 'limit', 'offset'],
    },
  },
};

export const getAuditLogSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: auditLogEntryResponse,
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const getAuditStatsSchema = {
  querystring: {
    type: 'object',
    properties: {
      days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        totalEvents: { type: 'integer' },
        eventsByCategory: { type: 'object', additionalProperties: { type: 'integer' } },
        eventsBySeverity: { type: 'object', additionalProperties: { type: 'integer' } },
        eventsByOutcome: { type: 'object', additionalProperties: { type: 'integer' } },
        topEventTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              count: { type: 'integer' },
            },
          },
        },
        recentActivity: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              count: { type: 'integer' },
            },
          },
        },
      },
      required: ['totalEvents', 'eventsByCategory', 'eventsBySeverity', 'eventsByOutcome', 'topEventTypes', 'recentActivity'],
    },
  },
};

export const exportAuditLogsSchema = {
  querystring: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['csv', 'json'], default: 'csv' },
      category: { type: 'string' },
      eventType: { type: 'string' },
      severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
      outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
      actorId: { type: 'string' },
      actorEmail: { type: 'string' },
      targetId: { type: 'string' },
      targetType: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      search: { type: 'string', maxLength: 200 },
    },
    additionalProperties: false,
  },
};

export const getFilterOptionsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
            },
          },
        },
        severities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
            },
          },
        },
        outcomes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
            },
          },
        },
        eventTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
              category: { type: 'string' },
            },
          },
        },
      },
    },
  },
};


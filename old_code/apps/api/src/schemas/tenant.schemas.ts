import { TenantPlan, TenantStatus } from '../types/tenant.types.js';

const tenantResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'slug', 'status', 'plan', 'settings', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    domain: { type: 'string' },
    status: { type: 'string', enum: Object.values(TenantStatus) },
    plan: { type: 'string', enum: Object.values(TenantPlan) },
    settings: { type: 'object' },
    region: { type: 'string' },
    adminUserIds: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    activatedAt: { type: 'string' },
  },
};

const tenantListResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['tenants', 'total', 'page', 'limit', 'hasMore'],
  properties: {
    tenants: {
      type: 'array',
      items: tenantResponse,
    },
    total: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

const tenantParams = {
  type: 'object',
  required: ['tenantId'],
  properties: {
    tenantId: { type: 'string' },
  },
};

export const tenantDomainLookupSchema = {
  description: 'Check whether a tenant already exists for the given domain',
  tags: ['Tenants'],
  params: {
    type: 'object',
    required: ['domain'],
    properties: {
      domain: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['exists'],
      properties: {
        exists: { type: 'boolean' },
        tenant: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'name', 'status'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                domain: { type: 'string' },
                status: { type: 'string', enum: Object.values(TenantStatus) },
                plan: { type: 'string', enum: Object.values(TenantPlan) },
                activatedAt: { type: 'string' },
              },
            },
          ],
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const createTenantSchema = {
  description: 'Create a new tenant',
  tags: ['Tenants'],
  body: {
    type: 'object',
    required: ['name'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: { type: 'string', minLength: 2, maxLength: 50, pattern: '^[a-z0-9-]+$' },
      domain: { type: 'string', format: 'hostname' },
      plan: { type: 'string', enum: Object.values(TenantPlan) },
      region: { type: 'string' },
      adminContactEmail: { type: 'string', format: 'email' },
      settings: { type: 'object' },
    },
  },
  response: {
    201: tenantResponse,
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const getTenantSchema = {
  description: 'Get tenant details',
  tags: ['Tenants'],
  params: tenantParams,
  response: {
    200: tenantResponse,
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const updateTenantSchema = {
  description: 'Update tenant',
  tags: ['Tenants'],
  params: tenantParams,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      slug: { type: 'string', minLength: 2, maxLength: 50, pattern: '^[a-z0-9-]+$' },
      domain: { type: 'string', format: 'hostname' },
      status: { type: 'string', enum: Object.values(TenantStatus) },
      plan: { type: 'string', enum: Object.values(TenantPlan) },
      settings: { type: 'object' },
      metadata: {
        type: 'object',
        additionalProperties: false,
        properties: {
          adminContactEmail: { type: 'string', format: 'email' },
          billingEmail: { type: 'string', format: 'email' },
        },
      },
    },
  },
  response: {
    200: tenantResponse,
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const deleteTenantSchema = {
  description: 'Deactivate tenant',
  tags: ['Tenants'],
  params: tenantParams,
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const activateTenantSchema = {
  description: 'Activate tenant',
  tags: ['Tenants'],
  params: tenantParams,
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        activatedAt: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const listTenantsSchema = {
  description: 'List tenants',
  tags: ['Tenants'],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'number', minimum: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: Object.values(TenantStatus) },
      plan: { type: 'string', enum: Object.values(TenantPlan) },
      search: { type: 'string' },
    },
  },
  response: {
    200: tenantListResponse,
  },
};

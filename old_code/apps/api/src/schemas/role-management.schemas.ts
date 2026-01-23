const roleEntity = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'tenantId', 'name', 'displayName', 'permissions', 'isSystem', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    tenantId: { type: 'string' },
    name: { type: 'string' },
    displayName: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
    isSystem: { type: 'boolean' },
    memberCount: { type: 'number' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' },
  },
};

const roleListResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['roles', 'total', 'page', 'limit'],
  properties: {
    roles: { type: 'array', items: roleEntity },
    total: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
  },
};

const roleMembersResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['members', 'total'],
  properties: {
    members: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['userId', 'userEmail', 'assignedAt'],
        properties: {
          userId: { type: 'string' },
          userEmail: { type: 'string' },
          userName: { type: 'string' },
          assignedAt: { type: 'string' },
          assignedBy: { type: 'string' },
        },
      },
    },
    total: { type: 'number' },
  },
};

export const listRolesSchema = {
  params: {
    type: 'object',
    required: ['tenantId'],
    properties: {
      tenantId: { type: 'string' },
    },
  },
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      includeSystem: { type: 'boolean' },
      search: { type: 'string' },
      page: { type: 'number', minimum: 1 },
      limit: { type: 'number', minimum: 1, maximum: 200 },
    },
  },
  response: {
    200: roleListResponse,
  },
};

export const createRoleSchema = {
  params: listRolesSchema.params,
  body: {
    type: 'object',
    required: ['name', 'displayName', 'permissions'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      displayName: { type: 'string', minLength: 2, maxLength: 150 },
      description: { type: 'string', maxLength: 500 },
      permissions: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
    },
  },
  response: {
    201: roleEntity,
  },
};

export const getRoleSchema = {
  params: {
    type: 'object',
    required: ['tenantId', 'roleId'],
    properties: {
      tenantId: { type: 'string' },
      roleId: { type: 'string' },
    },
  },
  response: {
    200: roleEntity,
  },
};

export const updateRoleSchema = {
  params: getRoleSchema.params,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      displayName: { type: 'string', minLength: 2, maxLength: 150 },
      description: { type: 'string', maxLength: 500 },
      permissions: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
    },
  },
  response: {
    200: roleEntity,
  },
};

export const deleteRoleSchema = {
  params: getRoleSchema.params,
  response: {
    204: { type: 'null' },
  },
};

export const roleMembersSchema = {
  params: getRoleSchema.params,
  response: {
    200: roleMembersResponse,
  },
};

export const addRoleMembersSchema = {
  params: getRoleSchema.params,
  body: {
    type: 'object',
    required: ['userIds'],
    additionalProperties: false,
    properties: {
      userIds: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
    },
  },
  response: {
    204: { type: 'null' },
  },
};

export const removeRoleMemberSchema = {
  params: {
    type: 'object',
    required: ['tenantId', 'roleId', 'userId'],
    properties: {
      tenantId: { type: 'string' },
      roleId: { type: 'string' },
      userId: { type: 'string' },
    },
  },
  response: {
    204: { type: 'null' },
  },
};

export const createIdPMappingSchema = {
  params: getRoleSchema.params,
  body: {
    type: 'object',
    required: ['idpId', 'groupAttribute', 'groupValues'],
    additionalProperties: false,
    properties: {
      idpId: { type: 'string' },
      groupAttribute: { type: 'string' },
      groupValues: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
      },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'roleId', 'idpId', 'groupAttribute', 'groupValues', 'createdAt', 'updatedAt'],
      properties: {
        id: { type: 'string' },
        roleId: { type: 'string' },
        idpId: { type: 'string' },
        groupAttribute: { type: 'string' },
        groupValues: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const listIdPMappingsSchema = {
  params: getRoleSchema.params,
  response: {
    200: {
      type: 'object',
      required: ['mappings'],
      properties: {
        mappings: {
          type: 'array',
          items: createIdPMappingSchema.response[201],
        },
      },
    },
  },
};

export const listPermissionsSchema = {
  response: {
    200: {
      type: 'object',
      required: ['categories'],
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description', 'permissions'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              permissions: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'name', 'resource', 'action', 'scope', 'description', 'category'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    resource: { type: 'string' },
                    action: { type: 'string' },
                    scope: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

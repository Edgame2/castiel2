/**
 * User Management Schemas
 */
export const updateUserStatusSchema = {
    description: 'Update user status (active, suspended, etc.)',
    tags: ['User Management'],
    params: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        required: ['status'],
        properties: {
            status: {
                type: 'string',
                enum: ['active', 'suspended', 'pending_verification', 'pending_approval', 'deleted'],
            },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        status: { type: 'string' },
                    },
                },
            },
        },
    },
};
export const bulkUserOperationSchema = {
    description: 'Perform bulk operations on multiple users',
    tags: ['User Management'],
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        required: ['action', 'userIds'],
        properties: {
            action: {
                type: 'string',
                enum: ['activate', 'deactivate', 'delete', 'add-role', 'remove-role', 'send-password-reset'],
            },
            userIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 100,
            },
            role: {
                type: 'string',
                description: 'Role to add or remove (required for add-role/remove-role actions)',
            },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                successCount: { type: 'number' },
                failureCount: { type: 'number' },
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            userId: { type: 'string' },
                            success: { type: 'boolean' },
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
export const impersonateUserSchema = {
    description: 'Issue temporary impersonation tokens for a tenant user',
    tags: ['User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        properties: {
            reason: { type: 'string', maxLength: 250 },
            expiryMinutes: {
                type: 'number',
                minimum: 15,
                maximum: 60,
                default: 60,
                description: 'How long the impersonation session should remain valid (minutes)',
            },
        },
    },
    response: {
        200: {
            type: 'object',
            required: ['accessToken', 'refreshToken', 'expiresIn', 'expiresAt', 'impersonationId', 'message', 'user'],
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                expiresAt: { type: 'string' },
                impersonationId: { type: 'string' },
                message: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        tenantId: { type: 'string' },
                        email: { type: 'string' },
                        displayName: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        status: { type: 'string' },
                        roles: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
export const importUsersSchema = {
    description: 'Import users from CSV file (Base64 encoded)',
    tags: ['User Management'],
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        required: ['fileContent'],
        properties: {
            fileContent: {
                type: 'string',
                description: 'Base64 encoded CSV file content',
                minLength: 1,
            },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                added: { type: 'number' },
                failed: { type: 'number' },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            row: { type: 'number' },
                            error: { type: 'string' },
                            email: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
//# sourceMappingURL=user-management.schemas.js.map
/**
 * JSON Schemas for Magic Link Request Validation
 */
export const requestMagicLinkSchema = {
    description: 'Request a magic link for passwordless login',
    tags: ['Authentication', 'Magic Link'],
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                description: 'Email address to send the magic link to',
            },
            tenantId: {
                type: 'string',
                description: 'Tenant ID (optional, defaults to "default")',
            },
            returnUrl: {
                type: 'string',
                description: 'URL to redirect to after successful login',
            },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                expiresInSeconds: { type: 'number' },
            },
        },
        400: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
        500: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
export const verifyMagicLinkSchema = {
    description: 'Verify a magic link token and complete login',
    tags: ['Authentication', 'Magic Link'],
    params: {
        type: 'object',
        required: ['token'],
        properties: {
            token: {
                type: 'string',
                minLength: 1,
                description: 'Magic link token from email',
            },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
                returnUrl: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        tenantId: { type: 'string' },
                        isDefaultTenant: { type: 'boolean' },
                    },
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
        401: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
        403: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
        500: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
//# sourceMappingURL=magic-link.schemas.js.map
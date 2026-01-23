const sessionDeviceInfo = {
    type: 'object',
    additionalProperties: false,
    properties: {
        userAgent: { type: 'string' },
        browser: { type: 'string' },
        browserVersion: { type: 'string' },
        os: { type: 'string' },
        osVersion: { type: 'string' },
        device: { type: 'string' },
        isMobile: { type: 'boolean' },
    },
};
const sessionLocationInfo = {
    type: 'object',
    additionalProperties: false,
    properties: {
        ip: { type: 'string' },
        country: { type: 'string' },
        region: { type: 'string' },
        city: { type: 'string' },
    },
};
const sessionResponse = {
    type: 'object',
    additionalProperties: false,
    required: ['sessionId', 'userId', 'tenantId', 'createdAt', 'lastActivityAt', 'expiresAt', 'isCurrent'],
    properties: {
        sessionId: { type: 'string' },
        userId: { type: 'string' },
        tenantId: { type: 'string' },
        createdAt: { type: 'number' },
        lastActivityAt: { type: 'number' },
        expiresAt: { type: 'number' },
        isCurrent: { type: 'boolean' },
        deviceInfo: sessionDeviceInfo,
        locationInfo: sessionLocationInfo,
    },
};
export const listOwnSessionsSchema = {
    response: {
        200: {
            type: 'object',
            required: ['sessions', 'total'],
            additionalProperties: false,
            properties: {
                sessions: {
                    type: 'array',
                    items: sessionResponse,
                },
                total: { type: 'number' },
            },
        },
    },
};
export const sessionDetailsSchema = {
    params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
            sessionId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            additionalProperties: false,
            required: ['sessionId', 'userId', 'tenantId', 'createdAt', 'lastActivityAt', 'expiresAt', 'isCurrent', 'email', 'provider'],
            properties: {
                ...sessionResponse.properties,
                email: { type: 'string' },
                name: { type: 'string' },
                provider: { type: 'string' },
                metadata: { type: 'object' },
            },
        },
    },
};
export const terminateSessionSchema = {
    params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
            sessionId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            required: ['success', 'message'],
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
            },
        },
    },
};
export const terminateAllSessionsSchema = {
    body: {
        type: 'object',
        additionalProperties: false,
        properties: {
            excludeCurrentSessionId: {
                type: 'string',
                description: 'If provided, keeps this session active while revoking others',
            },
        },
    },
    response: {
        200: {
            type: 'object',
            required: ['success', 'revokedCount', 'message'],
            properties: {
                success: { type: 'boolean' },
                revokedCount: { type: 'number' },
                message: { type: 'string' },
            },
        },
    },
};
export const adminListUserSessionsSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'userId'],
        properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
        },
    },
    response: listOwnSessionsSchema.response,
};
export const adminTerminateSessionSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'userId', 'sessionId'],
        properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            sessionId: { type: 'string' },
        },
    },
    response: terminateSessionSchema.response,
};
export const adminTerminateAllSessionsSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'userId'],
        properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
        },
    },
    response: terminateAllSessionsSchema.response,
};
//# sourceMappingURL=session-management.schemas.js.map
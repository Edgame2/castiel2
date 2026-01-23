export const createJoinRequestSchema = {
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        properties: {
            message: { type: 'string', maxLength: 500 },
        },
    },
};
export const listJoinRequestsSchema = {
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string' },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['pending', 'approved', 'declined', 'expired'],
            },
        },
    },
};
export const updateJoinRequestSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'requestId'],
        properties: {
            tenantId: { type: 'string' },
            requestId: { type: 'string' },
        },
    },
};
export const createInvitationSchema = {
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email' },
            message: { type: 'string', maxLength: 500 },
            expiresAt: { type: 'string', format: 'date-time' },
            rolesPreset: { type: 'string' },
            roles: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 10,
                uniqueItems: true,
            },
        },
        additionalProperties: false,
    },
};
export const respondInvitationSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'token'],
        properties: {
            tenantId: { type: 'string' },
            token: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        properties: {
            userId: { type: 'string' },
            tenantSwitchTargetId: { type: 'string' },
            decisionMetadata: {
                type: 'object',
                additionalProperties: true,
            },
        },
        additionalProperties: false,
    },
};
export const previewInvitationSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'token'],
        properties: {
            tenantId: { type: 'string' },
            token: { type: 'string' },
        },
    },
};
export const membershipSummarySchema = {
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string' },
        },
    },
};
export const listInvitationsSchema = {
    params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: { type: 'string' },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                invitations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            tenantId: { type: 'string' },
                            email: { type: 'string' },
                            status: { type: 'string' },
                            inviterUserId: { type: 'string' },
                            issuerDisplayName: { type: 'string' },
                            message: { type: ['string', 'null'] },
                            roles: { type: 'array', items: { type: 'string' } },
                            rolesPreset: { type: ['string', 'null'] },
                            expiresAt: { type: 'string' },
                            createdAt: { type: 'string' },
                            respondedAt: { type: ['string', 'null'] },
                            isExpired: { type: 'boolean' },
                        },
                    },
                },
                total: { type: 'integer' },
                limit: { type: 'integer' },
                offset: { type: 'integer' },
            },
        },
    },
};
export const revokeInvitationSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'invitationId'],
        properties: {
            tenantId: { type: 'string' },
            invitationId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                invitation: { type: 'object' },
            },
        },
    },
};
export const resendInvitationSchema = {
    params: {
        type: 'object',
        required: ['tenantId', 'invitationId'],
        properties: {
            tenantId: { type: 'string' },
            invitationId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                invitation: { type: 'object' },
            },
        },
    },
};
//# sourceMappingURL=tenant-membership.schemas.js.map
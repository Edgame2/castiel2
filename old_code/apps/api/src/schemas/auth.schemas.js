/**
 * JSON schemas for authentication request validation
 */
export const registerSchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'tenantName', 'tenantDomain'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                maxLength: 255,
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
            },
            firstName: {
                type: 'string',
                maxLength: 100,
            },
            lastName: {
                type: 'string',
                maxLength: 100,
            },
            tenantName: {
                type: 'string',
                minLength: 3,
                maxLength: 150,
            },
            tenantDomain: {
                type: 'string',
                maxLength: 255,
            },
        },
    },
};
export const loginSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
            },
            password: {
                type: 'string',
            },
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
            deviceFingerprint: {
                type: 'string',
                description: 'Device fingerprint for trusted device tracking',
            },
            rememberDevice: {
                type: 'boolean',
                description: 'Whether to remember this device for MFA',
            },
        },
    },
};
export const forgotPasswordSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
            },
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
        },
    },
};
export const resetPasswordSchema = {
    body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
            token: {
                type: 'string',
                minLength: 32,
                maxLength: 128,
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
            },
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
        },
    },
};
export const verifyEmailSchema = {
    params: {
        type: 'object',
        required: ['token'],
        properties: {
            token: {
                type: 'string',
                minLength: 32,
                maxLength: 128,
            },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
        },
    },
};
export const refreshTokenSchema = {
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: {
                type: 'string',
            },
        },
    },
};
export const revokeTokenSchema = {
    body: {
        type: 'object',
        required: ['token'],
        properties: {
            token: {
                type: 'string',
                description: 'Token to revoke (access or refresh token)',
            },
            token_type_hint: {
                type: 'string',
                enum: ['access_token', 'refresh_token'],
                description: 'Hint about the type of token being revoked',
            },
        },
    },
};
export const introspectTokenSchema = {
    body: {
        type: 'object',
        required: ['token'],
        properties: {
            token: {
                type: 'string',
                description: 'Token to introspect (access or refresh token)',
            },
            token_type_hint: {
                type: 'string',
                enum: ['access_token', 'refresh_token'],
                description: 'Hint about the type of token being introspected',
            },
        },
    },
};
export const mfaChallengeVerifySchema = {
    body: {
        type: 'object',
        required: ['challengeToken', 'code', 'method'],
        properties: {
            challengeToken: {
                type: 'string',
                description: 'Challenge token received from initial login',
            },
            code: {
                type: 'string',
                minLength: 4,
                maxLength: 20,
                description: 'MFA verification code (6-digit OTP or recovery code)',
            },
            method: {
                type: 'string',
                enum: ['totp', 'sms', 'email', 'recovery'],
                description: 'MFA method being used for verification',
            },
        },
    },
};
export const getProfileSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                displayName: { type: 'string' },
                tenantId: { type: 'string' },
                roles: {
                    type: 'array',
                    items: { type: 'string' },
                },
                status: { type: 'string' },
                emailVerified: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                permissions: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
        },
    },
};
export const updateProfileSchema = {
    body: {
        type: 'object',
        properties: {
            firstName: {
                type: 'string',
                maxLength: 100,
            },
            lastName: {
                type: 'string',
                maxLength: 100,
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                displayName: { type: 'string' },
                tenantId: { type: 'string' },
                roles: {
                    type: 'array',
                    items: { type: 'string' },
                },
                status: { type: 'string' },
                emailVerified: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                permissions: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
        },
    },
};
const tenantMembershipList = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            tenantId: { type: 'string' },
            tenantName: { type: ['string', 'null'] },
            domain: { type: ['string', 'null'] },
            status: { type: ['string', 'null'] },
            isDefault: { type: 'boolean' },
            roles: {
                type: 'array',
                items: { type: 'string' },
            },
        },
        required: ['tenantId', 'isDefault', 'roles'],
    },
};
export const listUserTenantsSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                defaultTenantId: { type: ['string', 'null'] },
                tenants: tenantMembershipList,
            },
        },
    },
};
export const updateDefaultTenantSchema = {
    body: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                defaultTenantId: { type: ['string', 'null'] },
                tenants: tenantMembershipList,
            },
        },
    },
};
export const switchTenantSchema = {
    body: {
        type: 'object',
        required: ['tenantId'],
        properties: {
            tenantId: {
                type: 'string',
                maxLength: 100,
                description: 'Target tenant ID to switch to',
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        tenantId: { type: 'string' },
                        tenantName: { type: ['string', 'null'] },
                        roles: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
/**
 * Pre-registration check schema
 * Checks user email to determine registration flow
 */
export const checkRegistrationSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                maxLength: 255,
                description: 'Email address to check',
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['active_user', 'pending_user', 'tenant_exists', 'no_tenant'],
                    description: 'Registration status based on email check',
                },
                message: { type: 'string' },
                tenant: {
                    type: 'object',
                    nullable: true,
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        domain: { type: 'string' },
                    },
                },
                redirectTo: {
                    type: 'string',
                    nullable: true,
                    description: 'Suggested redirect URL if applicable',
                },
            },
            required: ['status', 'message'],
        },
    },
};
/**
 * Resend verification email schema
 */
export const resendVerificationSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                maxLength: 255,
                description: 'Email address to resend verification to',
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
            required: ['message'],
        },
    },
};
export const oauthInitiateSchema = {
    querystring: {
        type: 'object',
        properties: {
            tenantId: {
                type: 'string',
                maxLength: 100,
            },
            redirectUrl: {
                type: 'string',
                format: 'uri',
                maxLength: 512,
            },
        },
    },
};
export const oauthCallbackSchema = {
    querystring: {
        type: 'object',
        properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
            error_description: { type: 'string' },
        },
    },
};
export const impersonateSchema = {
    body: {
        type: 'object',
        required: ['userId', 'tenantId'],
        properties: {
            userId: {
                type: 'string',
                description: 'ID of the user to impersonate',
            },
            tenantId: {
                type: 'string',
                maxLength: 100,
                description: 'Tenant ID where the user belongs',
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        tenantId: { type: 'string' },
                        isDefaultTenant: { type: 'boolean' },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
//# sourceMappingURL=auth.schemas.js.map
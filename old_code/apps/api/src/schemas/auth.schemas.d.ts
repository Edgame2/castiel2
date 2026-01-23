/**
 * JSON schemas for authentication request validation
 */
export declare const registerSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                maxLength: number;
            };
            password: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            firstName: {
                type: string;
                maxLength: number;
            };
            lastName: {
                type: string;
                maxLength: number;
            };
            tenantName: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            tenantDomain: {
                type: string;
                maxLength: number;
            };
        };
    };
};
export declare const loginSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
            password: {
                type: string;
            };
            tenantId: {
                type: string;
                maxLength: number;
            };
            deviceFingerprint: {
                type: string;
                description: string;
            };
            rememberDevice: {
                type: string;
                description: string;
            };
        };
    };
};
export declare const forgotPasswordSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
            tenantId: {
                type: string;
                maxLength: number;
            };
        };
    };
};
export declare const resetPasswordSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            password: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            tenantId: {
                type: string;
                maxLength: number;
            };
        };
    };
};
export declare const verifyEmailSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                minLength: number;
                maxLength: number;
            };
        };
    };
    querystring: {
        type: string;
        properties: {
            tenantId: {
                type: string;
                maxLength: number;
            };
        };
    };
};
export declare const refreshTokenSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            refreshToken: {
                type: string;
            };
        };
    };
};
export declare const revokeTokenSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                description: string;
            };
            token_type_hint: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    };
};
export declare const introspectTokenSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                description: string;
            };
            token_type_hint: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    };
};
export declare const mfaChallengeVerifySchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            challengeToken: {
                type: string;
                description: string;
            };
            code: {
                type: string;
                minLength: number;
                maxLength: number;
                description: string;
            };
            method: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    };
};
export declare const getProfileSchema: {
    response: {
        200: {
            type: string;
            properties: {
                id: {
                    type: string;
                };
                email: {
                    type: string;
                };
                firstName: {
                    type: string;
                };
                lastName: {
                    type: string;
                };
                displayName: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                roles: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                status: {
                    type: string;
                };
                emailVerified: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                permissions: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
            };
        };
    };
};
export declare const updateProfileSchema: {
    body: {
        type: string;
        properties: {
            firstName: {
                type: string;
                maxLength: number;
            };
            lastName: {
                type: string;
                maxLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                id: {
                    type: string;
                };
                email: {
                    type: string;
                };
                firstName: {
                    type: string;
                };
                lastName: {
                    type: string;
                };
                displayName: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                roles: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                status: {
                    type: string;
                };
                emailVerified: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                permissions: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
            };
        };
    };
};
export declare const listUserTenantsSchema: {
    response: {
        200: {
            type: string;
            properties: {
                defaultTenantId: {
                    type: string[];
                };
                tenants: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            tenantId: {
                                type: string;
                            };
                            tenantName: {
                                type: string[];
                            };
                            domain: {
                                type: string[];
                            };
                            status: {
                                type: string[];
                            };
                            isDefault: {
                                type: string;
                            };
                            roles: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                        };
                        required: string[];
                    };
                };
            };
        };
    };
};
export declare const updateDefaultTenantSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
                maxLength: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                defaultTenantId: {
                    type: string[];
                };
                tenants: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            tenantId: {
                                type: string;
                            };
                            tenantName: {
                                type: string[];
                            };
                            domain: {
                                type: string[];
                            };
                            status: {
                                type: string[];
                            };
                            isDefault: {
                                type: string;
                            };
                            roles: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                        };
                        required: string[];
                    };
                };
            };
        };
    };
};
export declare const switchTenantSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
                maxLength: number;
                description: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                accessToken: {
                    type: string;
                };
                refreshToken: {
                    type: string;
                };
                expiresIn: {
                    type: string;
                };
                user: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        tenantName: {
                            type: string[];
                        };
                        roles: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        permissions: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
/**
 * Pre-registration check schema
 * Checks user email to determine registration flow
 */
export declare const checkRegistrationSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                maxLength: number;
                description: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                status: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                message: {
                    type: string;
                };
                tenant: {
                    type: string;
                    nullable: boolean;
                    properties: {
                        id: {
                            type: string;
                        };
                        name: {
                            type: string;
                        };
                        domain: {
                            type: string;
                        };
                    };
                };
                redirectTo: {
                    type: string;
                    nullable: boolean;
                    description: string;
                };
            };
            required: string[];
        };
    };
};
/**
 * Resend verification email schema
 */
export declare const resendVerificationSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                maxLength: number;
                description: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const oauthInitiateSchema: {
    querystring: {
        type: string;
        properties: {
            tenantId: {
                type: string;
                maxLength: number;
            };
            redirectUrl: {
                type: string;
                format: string;
                maxLength: number;
            };
        };
    };
};
export declare const oauthCallbackSchema: {
    querystring: {
        type: string;
        properties: {
            code: {
                type: string;
            };
            state: {
                type: string;
            };
            error: {
                type: string;
            };
            error_description: {
                type: string;
            };
        };
    };
};
export declare const impersonateSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            userId: {
                type: string;
                description: string;
            };
            tenantId: {
                type: string;
                maxLength: number;
                description: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                accessToken: {
                    type: string;
                };
                refreshToken: {
                    type: string;
                };
                expiresIn: {
                    type: string;
                };
                user: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        isDefaultTenant: {
                            type: string;
                        };
                        permissions: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=auth.schemas.d.ts.map
/**
 * JSON Schemas for Magic Link Request Validation
 */
export declare const requestMagicLinkSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                description: string;
            };
            tenantId: {
                type: string;
                description: string;
            };
            returnUrl: {
                type: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                message: {
                    type: string;
                };
                expiresInSeconds: {
                    type: string;
                };
            };
        };
        400: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        500: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const verifyMagicLinkSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            token: {
                type: string;
                minLength: number;
                description: string;
            };
        };
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
                returnUrl: {
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
                    };
                };
            };
        };
        400: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        401: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        403: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        500: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=magic-link.schemas.d.ts.map
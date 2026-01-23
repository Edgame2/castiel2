/**
 * User Management Schemas
 */
export declare const updateUserStatusSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            userId: {
                type: string;
                minLength: number;
            };
        };
    };
    body: {
        type: string;
        required: string[];
        properties: {
            status: {
                type: string;
                enum: string[];
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
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
                        status: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const bulkUserOperationSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
                minLength: number;
            };
        };
    };
    body: {
        type: string;
        required: string[];
        properties: {
            action: {
                type: string;
                enum: string[];
            };
            userIds: {
                type: string;
                items: {
                    type: string;
                };
                minItems: number;
                maxItems: number;
            };
            role: {
                type: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                successCount: {
                    type: string;
                };
                failureCount: {
                    type: string;
                };
                results: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            userId: {
                                type: string;
                            };
                            success: {
                                type: string;
                            };
                            error: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const impersonateUserSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
                minLength: number;
            };
            userId: {
                type: string;
                minLength: number;
            };
        };
    };
    body: {
        type: string;
        properties: {
            reason: {
                type: string;
                maxLength: number;
            };
            expiryMinutes: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
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
                expiresAt: {
                    type: string;
                };
                impersonationId: {
                    type: string;
                };
                message: {
                    type: string;
                };
                user: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        displayName: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        status: {
                            type: string;
                        };
                        roles: {
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
export declare const importUsersSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
                minLength: number;
            };
        };
    };
    body: {
        type: string;
        required: string[];
        properties: {
            fileContent: {
                type: string;
                description: string;
                minLength: number;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                added: {
                    type: string;
                };
                failed: {
                    type: string;
                };
                errors: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            row: {
                                type: string;
                            };
                            error: {
                                type: string;
                            };
                            email: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=user-management.schemas.d.ts.map
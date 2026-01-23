import { TenantPlan, TenantStatus } from '../types/tenant.types.js';
export declare const tenantDomainLookupSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            domain: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                exists: {
                    type: string;
                };
                tenant: {
                    anyOf: ({
                        type: string;
                        additionalProperties?: undefined;
                        required?: undefined;
                        properties?: undefined;
                    } | {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
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
                            status: {
                                type: string;
                                enum: TenantStatus[];
                            };
                            plan: {
                                type: string;
                                enum: TenantPlan[];
                            };
                            activatedAt: {
                                type: string;
                            };
                        };
                    })[];
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
    };
};
export declare const createTenantSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        additionalProperties: boolean;
        properties: {
            name: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            slug: {
                type: string;
                minLength: number;
                maxLength: number;
                pattern: string;
            };
            domain: {
                type: string;
                format: string;
            };
            plan: {
                type: string;
                enum: TenantPlan[];
            };
            region: {
                type: string;
            };
            adminContactEmail: {
                type: string;
                format: string;
            };
            settings: {
                type: string;
            };
        };
    };
    response: {
        201: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                name: {
                    type: string;
                };
                slug: {
                    type: string;
                };
                domain: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: TenantStatus[];
                };
                plan: {
                    type: string;
                    enum: TenantPlan[];
                };
                settings: {
                    type: string;
                };
                region: {
                    type: string;
                };
                adminUserIds: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                activatedAt: {
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
        409: {
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
export declare const getTenantSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                name: {
                    type: string;
                };
                slug: {
                    type: string;
                };
                domain: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: TenantStatus[];
                };
                plan: {
                    type: string;
                    enum: TenantPlan[];
                };
                settings: {
                    type: string;
                };
                region: {
                    type: string;
                };
                adminUserIds: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                activatedAt: {
                    type: string;
                };
            };
        };
        404: {
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
export declare const updateTenantSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        additionalProperties: boolean;
        properties: {
            name: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            slug: {
                type: string;
                minLength: number;
                maxLength: number;
                pattern: string;
            };
            domain: {
                type: string;
                format: string;
            };
            status: {
                type: string;
                enum: TenantStatus[];
            };
            plan: {
                type: string;
                enum: TenantPlan[];
            };
            settings: {
                type: string;
            };
            metadata: {
                type: string;
                additionalProperties: boolean;
                properties: {
                    adminContactEmail: {
                        type: string;
                        format: string;
                    };
                    billingEmail: {
                        type: string;
                        format: string;
                    };
                };
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                name: {
                    type: string;
                };
                slug: {
                    type: string;
                };
                domain: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: TenantStatus[];
                };
                plan: {
                    type: string;
                    enum: TenantPlan[];
                };
                settings: {
                    type: string;
                };
                region: {
                    type: string;
                };
                adminUserIds: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                activatedAt: {
                    type: string;
                };
            };
        };
        404: {
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
        409: {
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
export declare const deleteTenantSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            properties: {
                success: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        404: {
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
export declare const activateTenantSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            properties: {
                success: {
                    type: string;
                };
                message: {
                    type: string;
                };
                activatedAt: {
                    type: string;
                };
            };
        };
        404: {
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
export declare const listTenantsSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        additionalProperties: boolean;
        properties: {
            page: {
                type: string;
                minimum: number;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
            };
            status: {
                type: string;
                enum: TenantStatus[];
            };
            plan: {
                type: string;
                enum: TenantPlan[];
            };
            search: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                tenants: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            id: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            slug: {
                                type: string;
                            };
                            domain: {
                                type: string;
                            };
                            status: {
                                type: string;
                                enum: TenantStatus[];
                            };
                            plan: {
                                type: string;
                                enum: TenantPlan[];
                            };
                            settings: {
                                type: string;
                            };
                            region: {
                                type: string;
                            };
                            adminUserIds: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            createdAt: {
                                type: string;
                            };
                            updatedAt: {
                                type: string;
                            };
                            activatedAt: {
                                type: string;
                            };
                        };
                    };
                };
                total: {
                    type: string;
                };
                page: {
                    type: string;
                };
                limit: {
                    type: string;
                };
                hasMore: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=tenant.schemas.d.ts.map
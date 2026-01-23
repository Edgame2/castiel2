/**
 * External User IDs Validation Schemas
 */
import { z } from 'zod';
/**
 * External user ID status enum
 */
export declare const ExternalUserIdStatusSchema: z.ZodEnum<["active", "invalid", "pending"]>;
/**
 * External user ID metadata schema
 */
export declare const ExternalUserIdMetadataSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
/**
 * Create/Update external user ID request body
 */
export declare const CreateExternalUserIdSchema: z.ZodObject<{
    integrationId: z.ZodString;
    externalUserId: z.ZodString;
    integrationName: z.ZodOptional<z.ZodString>;
    connectionId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    status: z.ZodOptional<z.ZodEnum<["active", "invalid", "pending"]>>;
}, "strip", z.ZodTypeAny, {
    integrationId: string;
    externalUserId: string;
    status?: "active" | "pending" | "invalid" | undefined;
    connectionId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    integrationName?: string | undefined;
}, {
    integrationId: string;
    externalUserId: string;
    status?: "active" | "pending" | "invalid" | undefined;
    connectionId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    integrationName?: string | undefined;
}>;
/**
 * Update external user ID request body
 */
export declare const UpdateExternalUserIdSchema: z.ZodObject<{
    externalUserId: z.ZodOptional<z.ZodString>;
    integrationName: z.ZodOptional<z.ZodString>;
    connectionId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    status: z.ZodOptional<z.ZodEnum<["active", "invalid", "pending"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "pending" | "invalid" | undefined;
    connectionId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    integrationName?: string | undefined;
    externalUserId?: string | undefined;
}, {
    status?: "active" | "pending" | "invalid" | undefined;
    connectionId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    integrationName?: string | undefined;
    externalUserId?: string | undefined;
}>;
/**
 * Get external user IDs schema
 */
export declare const getExternalUserIdsSchema: {
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
    response: {
        200: {
            type: string;
            properties: {
                externalUserIds: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            integrationId: {
                                type: string;
                            };
                            externalUserId: {
                                type: string;
                            };
                            integrationName: {
                                type: string;
                            };
                            connectionId: {
                                type: string;
                            };
                            connectedAt: {
                                type: string;
                                format: string;
                            };
                            lastSyncedAt: {
                                type: string;
                                format: string;
                            };
                            status: {
                                type: string;
                                enum: string[];
                            };
                            metadata: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                };
            };
        };
    };
};
/**
 * Create/Update external user ID schema
 */
export declare const createExternalUserIdSchema: {
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
        required: string[];
        properties: {
            integrationId: {
                type: string;
                minLength: number;
            };
            externalUserId: {
                type: string;
                minLength: number;
            };
            integrationName: {
                type: string;
            };
            connectionId: {
                type: string;
            };
            metadata: {
                type: string;
            };
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
                integrationId: {
                    type: string;
                };
                externalUserId: {
                    type: string;
                };
                integrationName: {
                    type: string;
                };
                connectionId: {
                    type: string;
                };
                connectedAt: {
                    type: string;
                    format: string;
                };
                lastSyncedAt: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                metadata: {
                    type: string;
                };
            };
        };
    };
};
/**
 * Update external user ID schema
 */
export declare const updateExternalUserIdSchema: {
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
            integrationId: {
                type: string;
                minLength: number;
            };
        };
    };
    body: {
        type: string;
        properties: {
            externalUserId: {
                type: string;
                minLength: number;
            };
            integrationName: {
                type: string;
            };
            connectionId: {
                type: string;
            };
            metadata: {
                type: string;
            };
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
                integrationId: {
                    type: string;
                };
                externalUserId: {
                    type: string;
                };
                integrationName: {
                    type: string;
                };
                connectionId: {
                    type: string;
                };
                connectedAt: {
                    type: string;
                    format: string;
                };
                lastSyncedAt: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                metadata: {
                    type: string;
                };
            };
        };
    };
};
/**
 * Delete external user ID schema
 */
export declare const deleteExternalUserIdSchema: {
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
            integrationId: {
                type: string;
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
            };
        };
    };
};
/**
 * Sync external user ID schema
 */
export declare const syncExternalUserIdSchema: {
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
            integrationId: {
                type: string;
                minLength: number;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                integrationId: {
                    type: string;
                };
                externalUserId: {
                    type: string;
                };
                integrationName: {
                    type: string;
                };
                connectionId: {
                    type: string;
                };
                connectedAt: {
                    type: string;
                    format: string;
                };
                lastSyncedAt: {
                    type: string;
                    format: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                metadata: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=external-user-ids.schemas.d.ts.map
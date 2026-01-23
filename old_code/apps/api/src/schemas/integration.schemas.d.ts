/**
 * Integration API Schemas
 * Zod validation schemas for integration endpoints
 */
import { z } from 'zod';
export declare const createProviderSchema: z.ZodObject<{
    body: z.ZodObject<{
        category: z.ZodString;
        name: z.ZodString;
        displayName: z.ZodString;
        provider: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["active", "beta", "deprecated", "disabled"]>>;
        audience: z.ZodOptional<z.ZodEnum<["system", "tenant"]>>;
        capabilities: z.ZodArray<z.ZodString, "many">;
        supportedSyncDirections: z.ZodArray<z.ZodEnum<["pull", "push", "bidirectional"]>, "many">;
        supportsRealtime: z.ZodOptional<z.ZodBoolean>;
        supportsWebhooks: z.ZodOptional<z.ZodBoolean>;
        supportsNotifications: z.ZodOptional<z.ZodBoolean>;
        supportsSearch: z.ZodOptional<z.ZodBoolean>;
        searchableEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchCapabilities: z.ZodOptional<z.ZodObject<{
            fullText: z.ZodBoolean;
            fieldSpecific: z.ZodBoolean;
            filtered: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        }, {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        }>>;
        requiresUserScoping: z.ZodOptional<z.ZodBoolean>;
        authType: z.ZodEnum<["oauth2", "api_key", "basic", "custom"]>;
        oauthConfig: z.ZodOptional<z.ZodAny>;
        availableEntities: z.ZodArray<z.ZodAny, "many">;
        entityMappings: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        icon: z.ZodString;
        color: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        isPremium: z.ZodOptional<z.ZodBoolean>;
        requiredPlan: z.ZodOptional<z.ZodString>;
        documentationUrl: z.ZodOptional<z.ZodString>;
        supportUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        category: string;
        name: string;
        displayName: string;
        provider: string;
        capabilities: string[];
        supportedSyncDirections: ("pull" | "push" | "bidirectional")[];
        authType: "custom" | "oauth2" | "api_key" | "basic";
        availableEntities: any[];
        icon: string;
        color: string;
        description?: string | undefined;
        status?: "active" | "beta" | "deprecated" | "disabled" | undefined;
        audience?: "system" | "tenant" | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        entityMappings?: any[] | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    }, {
        category: string;
        name: string;
        displayName: string;
        provider: string;
        capabilities: string[];
        supportedSyncDirections: ("pull" | "push" | "bidirectional")[];
        authType: "custom" | "oauth2" | "api_key" | "basic";
        availableEntities: any[];
        icon: string;
        color: string;
        description?: string | undefined;
        status?: "active" | "beta" | "deprecated" | "disabled" | undefined;
        audience?: "system" | "tenant" | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        entityMappings?: any[] | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        category: string;
        name: string;
        displayName: string;
        provider: string;
        capabilities: string[];
        supportedSyncDirections: ("pull" | "push" | "bidirectional")[];
        authType: "custom" | "oauth2" | "api_key" | "basic";
        availableEntities: any[];
        icon: string;
        color: string;
        description?: string | undefined;
        status?: "active" | "beta" | "deprecated" | "disabled" | undefined;
        audience?: "system" | "tenant" | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        entityMappings?: any[] | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    };
}, {
    body: {
        category: string;
        name: string;
        displayName: string;
        provider: string;
        capabilities: string[];
        supportedSyncDirections: ("pull" | "push" | "bidirectional")[];
        authType: "custom" | "oauth2" | "api_key" | "basic";
        availableEntities: any[];
        icon: string;
        color: string;
        description?: string | undefined;
        status?: "active" | "beta" | "deprecated" | "disabled" | undefined;
        audience?: "system" | "tenant" | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        entityMappings?: any[] | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    };
}>;
export declare const updateProviderSchema: z.ZodObject<{
    params: z.ZodObject<{
        category: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        category: string;
    }, {
        id: string;
        category: string;
    }>;
    body: z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        supportedSyncDirections: z.ZodOptional<z.ZodArray<z.ZodEnum<["pull", "push", "bidirectional"]>, "many">>;
        supportsRealtime: z.ZodOptional<z.ZodBoolean>;
        supportsWebhooks: z.ZodOptional<z.ZodBoolean>;
        supportsNotifications: z.ZodOptional<z.ZodBoolean>;
        supportsSearch: z.ZodOptional<z.ZodBoolean>;
        searchableEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchCapabilities: z.ZodOptional<z.ZodObject<{
            fullText: z.ZodBoolean;
            fieldSpecific: z.ZodBoolean;
            filtered: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        }, {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        }>>;
        requiresUserScoping: z.ZodOptional<z.ZodBoolean>;
        oauthConfig: z.ZodOptional<z.ZodAny>;
        availableEntities: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        entityMappings: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        icon: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodString>;
        isPremium: z.ZodOptional<z.ZodBoolean>;
        requiredPlan: z.ZodOptional<z.ZodString>;
        documentationUrl: z.ZodOptional<z.ZodString>;
        supportUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        displayName?: string | undefined;
        description?: string | undefined;
        capabilities?: string[] | undefined;
        supportedSyncDirections?: ("pull" | "push" | "bidirectional")[] | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        availableEntities?: any[] | undefined;
        entityMappings?: any[] | undefined;
        icon?: string | undefined;
        color?: string | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    }, {
        displayName?: string | undefined;
        description?: string | undefined;
        capabilities?: string[] | undefined;
        supportedSyncDirections?: ("pull" | "push" | "bidirectional")[] | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        availableEntities?: any[] | undefined;
        entityMappings?: any[] | undefined;
        icon?: string | undefined;
        color?: string | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        displayName?: string | undefined;
        description?: string | undefined;
        capabilities?: string[] | undefined;
        supportedSyncDirections?: ("pull" | "push" | "bidirectional")[] | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        availableEntities?: any[] | undefined;
        entityMappings?: any[] | undefined;
        icon?: string | undefined;
        color?: string | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    };
    params: {
        id: string;
        category: string;
    };
}, {
    body: {
        displayName?: string | undefined;
        description?: string | undefined;
        capabilities?: string[] | undefined;
        supportedSyncDirections?: ("pull" | "push" | "bidirectional")[] | undefined;
        supportsRealtime?: boolean | undefined;
        supportsWebhooks?: boolean | undefined;
        supportsNotifications?: boolean | undefined;
        supportsSearch?: boolean | undefined;
        searchableEntities?: string[] | undefined;
        searchCapabilities?: {
            filtered: boolean;
            fullText: boolean;
            fieldSpecific: boolean;
        } | undefined;
        requiresUserScoping?: boolean | undefined;
        oauthConfig?: any;
        availableEntities?: any[] | undefined;
        entityMappings?: any[] | undefined;
        icon?: string | undefined;
        color?: string | undefined;
        documentationUrl?: string | undefined;
        supportUrl?: string | undefined;
        version?: string | undefined;
        isPremium?: boolean | undefined;
        requiredPlan?: string | undefined;
    };
    params: {
        id: string;
        category: string;
    };
}>;
export declare const changeStatusSchema: z.ZodObject<{
    params: z.ZodObject<{
        category: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        category: string;
    }, {
        id: string;
        category: string;
    }>;
    body: z.ZodObject<{
        status: z.ZodEnum<["active", "beta", "deprecated", "disabled"]>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "beta" | "deprecated" | "disabled";
    }, {
        status: "active" | "beta" | "deprecated" | "disabled";
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "active" | "beta" | "deprecated" | "disabled";
    };
    params: {
        id: string;
        category: string;
    };
}, {
    body: {
        status: "active" | "beta" | "deprecated" | "disabled";
    };
    params: {
        id: string;
        category: string;
    };
}>;
export declare const changeAudienceSchema: z.ZodObject<{
    params: z.ZodObject<{
        category: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        category: string;
    }, {
        id: string;
        category: string;
    }>;
    body: z.ZodObject<{
        audience: z.ZodEnum<["system", "tenant"]>;
    }, "strip", z.ZodTypeAny, {
        audience: "system" | "tenant";
    }, {
        audience: "system" | "tenant";
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        audience: "system" | "tenant";
    };
    params: {
        id: string;
        category: string;
    };
}, {
    body: {
        audience: "system" | "tenant";
    };
    params: {
        id: string;
        category: string;
    };
}>;
export declare const createIntegrationSchema: z.ZodObject<{
    body: z.ZodObject<{
        integrationId: z.ZodString;
        providerName: z.ZodString;
        name: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        credentialSecretName: z.ZodString;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        syncConfig: z.ZodOptional<z.ZodObject<{
            syncEnabled: z.ZodBoolean;
            syncDirection: z.ZodEnum<["inbound", "outbound", "bidirectional"]>;
            syncFrequency: z.ZodOptional<z.ZodString>;
            entityMappings: z.ZodArray<z.ZodAny, "many">;
            pullFilters: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            syncUserScoped: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        }, {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        }>>;
        userScoped: z.ZodOptional<z.ZodBoolean>;
        allowedShardTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchEnabled: z.ZodOptional<z.ZodBoolean>;
        searchableEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchFilters: z.ZodOptional<z.ZodObject<{
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodDate>;
                end: z.ZodOptional<z.ZodDate>;
            }, "strip", z.ZodTypeAny, {
                end?: Date | undefined;
                start?: Date | undefined;
            }, {
                end?: Date | undefined;
                start?: Date | undefined;
            }>>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            customFilters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }>>;
        instanceUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        integrationId: string;
        providerName: string;
        credentialSecretName: string;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    }, {
        name: string;
        integrationId: string;
        providerName: string;
        credentialSecretName: string;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        integrationId: string;
        providerName: string;
        credentialSecretName: string;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    };
}, {
    body: {
        name: string;
        integrationId: string;
        providerName: string;
        credentialSecretName: string;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    };
}>;
export declare const updateIntegrationSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        syncConfig: z.ZodOptional<z.ZodObject<{
            syncEnabled: z.ZodBoolean;
            syncDirection: z.ZodEnum<["inbound", "outbound", "bidirectional"]>;
            syncFrequency: z.ZodOptional<z.ZodString>;
            entityMappings: z.ZodArray<z.ZodAny, "many">;
            pullFilters: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            syncUserScoped: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        }, {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        }>>;
        userScoped: z.ZodOptional<z.ZodBoolean>;
        allowedShardTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchEnabled: z.ZodOptional<z.ZodBoolean>;
        searchableEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchFilters: z.ZodOptional<z.ZodObject<{
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodDate>;
                end: z.ZodOptional<z.ZodDate>;
            }, "strip", z.ZodTypeAny, {
                end?: Date | undefined;
                start?: Date | undefined;
            }, {
                end?: Date | undefined;
                start?: Date | undefined;
            }>>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            customFilters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }>>;
        instanceUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    }, {
        name?: string | undefined;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    };
    params: {
        id: string;
    };
}, {
    body: {
        name?: string | undefined;
        description?: string | undefined;
        searchableEntities?: string[] | undefined;
        icon?: string | undefined;
        settings?: Record<string, any> | undefined;
        syncConfig?: {
            entityMappings: any[];
            syncEnabled: boolean;
            syncDirection: "bidirectional" | "inbound" | "outbound";
            syncFrequency?: string | undefined;
            pullFilters?: any[] | undefined;
            syncUserScoped?: boolean | undefined;
        } | undefined;
        userScoped?: boolean | undefined;
        allowedShardTypes?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        instanceUrl?: string | undefined;
    };
    params: {
        id: string;
    };
}>;
export declare const updateDataAccessSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        allowedShardTypes: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        allowedShardTypes: string[];
    }, {
        allowedShardTypes: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        allowedShardTypes: string[];
    };
    params: {
        id: string;
    };
}, {
    body: {
        allowedShardTypes: string[];
    };
    params: {
        id: string;
    };
}>;
export declare const updateSearchConfigSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        searchEnabled: z.ZodOptional<z.ZodBoolean>;
        searchableEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        searchFilters: z.ZodOptional<z.ZodObject<{
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodDate>;
                end: z.ZodOptional<z.ZodDate>;
            }, "strip", z.ZodTypeAny, {
                end?: Date | undefined;
                start?: Date | undefined;
            }, {
                end?: Date | undefined;
                start?: Date | undefined;
            }>>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            customFilters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        searchableEntities?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
    }, {
        searchableEntities?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        searchableEntities?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
    };
    params: {
        id: string;
    };
}, {
    body: {
        searchableEntities?: string[] | undefined;
        searchEnabled?: boolean | undefined;
        searchFilters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
    };
    params: {
        id: string;
    };
}>;
export declare const searchSchema: z.ZodObject<{
    body: z.ZodObject<{
        query: z.ZodString;
        entities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        filters: z.ZodOptional<z.ZodObject<{
            dateRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodOptional<z.ZodDate>;
                end: z.ZodOptional<z.ZodDate>;
            }, "strip", z.ZodTypeAny, {
                end?: Date | undefined;
                start?: Date | undefined;
            }, {
                end?: Date | undefined;
                start?: Date | undefined;
            }>>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            customFilters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }, {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        }>>;
        limit: z.ZodOptional<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
        integrationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        limit?: number | undefined;
        offset?: number | undefined;
        entities?: string[] | undefined;
        filters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        integrationIds?: string[] | undefined;
    }, {
        query: string;
        limit?: number | undefined;
        offset?: number | undefined;
        entities?: string[] | undefined;
        filters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        integrationIds?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        query: string;
        limit?: number | undefined;
        offset?: number | undefined;
        entities?: string[] | undefined;
        filters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        integrationIds?: string[] | undefined;
    };
}, {
    body: {
        query: string;
        limit?: number | undefined;
        offset?: number | undefined;
        entities?: string[] | undefined;
        filters?: {
            dateRange?: {
                end?: Date | undefined;
                start?: Date | undefined;
            } | undefined;
            entityTypes?: string[] | undefined;
            customFilters?: Record<string, any> | undefined;
        } | undefined;
        integrationIds?: string[] | undefined;
    };
}>;
export declare const createUserConnectionSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        displayName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    }, {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    };
    params: {
        id: string;
    };
}, {
    body: {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    };
    params: {
        id: string;
    };
}>;
export declare const updateUserConnectionSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
        connectionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        connectionId: string;
    }, {
        id: string;
        connectionId: string;
    }>;
    body: z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    }, {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    };
    params: {
        id: string;
        connectionId: string;
    };
}, {
    body: {
        displayName?: string | undefined;
        credentials?: Record<string, any> | undefined;
    };
    params: {
        id: string;
        connectionId: string;
    };
}>;
export declare const deleteUserConnectionSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
        connectionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        connectionId: string;
    }, {
        id: string;
        connectionId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
        connectionId: string;
    };
}, {
    params: {
        id: string;
        connectionId: string;
    };
}>;
export declare const testUserConnectionSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
        connectionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        connectionId: string;
    }, {
        id: string;
        connectionId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
        connectionId: string;
    };
}, {
    params: {
        id: string;
        connectionId: string;
    };
}>;
export declare const bulkDeleteUserConnectionsSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        connectionIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        connectionIds: string[];
    }, {
        connectionIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        connectionIds: string[];
    };
    params: {
        id: string;
    };
}, {
    body: {
        connectionIds: string[];
    };
    params: {
        id: string;
    };
}>;
export declare const bulkTestUserConnectionsSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        connectionIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        connectionIds: string[];
    }, {
        connectionIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        connectionIds: string[];
    };
    params: {
        id: string;
    };
}, {
    body: {
        connectionIds: string[];
    };
    params: {
        id: string;
    };
}>;
//# sourceMappingURL=integration.schemas.d.ts.map
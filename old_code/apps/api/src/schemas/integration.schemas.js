/**
 * Integration API Schemas
 * Zod validation schemas for integration endpoints
 */
import { z } from 'zod';
// Provider Schemas
export const createProviderSchema = z.object({
    body: z.object({
        category: z.string().min(1, 'Category is required'),
        name: z.string().min(1, 'Name is required'),
        displayName: z.string().min(1, 'Display name is required'),
        provider: z.string().min(1, 'Provider identifier is required'),
        description: z.string().optional(),
        status: z.enum(['active', 'beta', 'deprecated', 'disabled']).optional(),
        audience: z.enum(['system', 'tenant']).optional(),
        capabilities: z.array(z.string()),
        supportedSyncDirections: z.array(z.enum(['pull', 'push', 'bidirectional'])),
        supportsRealtime: z.boolean().optional(),
        supportsWebhooks: z.boolean().optional(),
        supportsNotifications: z.boolean().optional(),
        supportsSearch: z.boolean().optional(),
        searchableEntities: z.array(z.string()).optional(),
        searchCapabilities: z.object({
            fullText: z.boolean(),
            fieldSpecific: z.boolean(),
            filtered: z.boolean(),
        }).optional(),
        requiresUserScoping: z.boolean().optional(),
        authType: z.enum(['oauth2', 'api_key', 'basic', 'custom']),
        oauthConfig: z.any().optional(),
        availableEntities: z.array(z.any()),
        entityMappings: z.array(z.any()).optional(),
        icon: z.string(),
        color: z.string(),
        version: z.string().optional(),
        isPremium: z.boolean().optional(),
        requiredPlan: z.string().optional(),
        documentationUrl: z.string().optional(),
        supportUrl: z.string().optional(),
    }),
});
export const updateProviderSchema = z.object({
    params: z.object({
        category: z.string(),
        id: z.string(),
    }),
    body: z.object({
        displayName: z.string().optional(),
        description: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        supportedSyncDirections: z.array(z.enum(['pull', 'push', 'bidirectional'])).optional(),
        supportsRealtime: z.boolean().optional(),
        supportsWebhooks: z.boolean().optional(),
        supportsNotifications: z.boolean().optional(),
        supportsSearch: z.boolean().optional(),
        searchableEntities: z.array(z.string()).optional(),
        searchCapabilities: z.object({
            fullText: z.boolean(),
            fieldSpecific: z.boolean(),
            filtered: z.boolean(),
        }).optional(),
        requiresUserScoping: z.boolean().optional(),
        oauthConfig: z.any().optional(),
        availableEntities: z.array(z.any()).optional(),
        entityMappings: z.array(z.any()).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        version: z.string().optional(),
        isPremium: z.boolean().optional(),
        requiredPlan: z.string().optional(),
        documentationUrl: z.string().optional(),
        supportUrl: z.string().optional(),
    }),
});
export const changeStatusSchema = z.object({
    params: z.object({
        category: z.string(),
        id: z.string(),
    }),
    body: z.object({
        status: z.enum(['active', 'beta', 'deprecated', 'disabled']),
    }),
});
export const changeAudienceSchema = z.object({
    params: z.object({
        category: z.string(),
        id: z.string(),
    }),
    body: z.object({
        audience: z.enum(['system', 'tenant']),
    }),
});
// Integration Schemas
export const createIntegrationSchema = z.object({
    body: z.object({
        integrationId: z.string().min(1, 'Integration ID is required'),
        providerName: z.string().min(1, 'Provider name is required'),
        name: z.string().min(1, 'Integration name is required').max(100, 'Name must be less than 100 characters'),
        icon: z.string().optional(),
        description: z.string().optional(),
        credentialSecretName: z.string(),
        settings: z.record(z.any()).optional(),
        syncConfig: z.object({
            syncEnabled: z.boolean(),
            syncDirection: z.enum(['inbound', 'outbound', 'bidirectional']),
            syncFrequency: z.string().optional(),
            entityMappings: z.array(z.any()),
            pullFilters: z.array(z.any()).optional(),
            syncUserScoped: z.boolean().optional(),
        }).optional(),
        userScoped: z.boolean().optional(),
        allowedShardTypes: z.array(z.string()).optional(),
        searchEnabled: z.boolean().optional(),
        searchableEntities: z.array(z.string()).optional(),
        searchFilters: z.object({
            dateRange: z.object({
                start: z.date().optional(),
                end: z.date().optional(),
            }).optional(),
            entityTypes: z.array(z.string()).optional(),
            customFilters: z.record(z.any()).optional(),
        }).optional(),
        instanceUrl: z.string().optional(),
    }),
});
export const updateIntegrationSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        name: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        settings: z.record(z.any()).optional(),
        syncConfig: z.object({
            syncEnabled: z.boolean(),
            syncDirection: z.enum(['inbound', 'outbound', 'bidirectional']),
            syncFrequency: z.string().optional(),
            entityMappings: z.array(z.any()),
            pullFilters: z.array(z.any()).optional(),
            syncUserScoped: z.boolean().optional(),
        }).optional(),
        userScoped: z.boolean().optional(),
        allowedShardTypes: z.array(z.string()).optional(),
        searchEnabled: z.boolean().optional(),
        searchableEntities: z.array(z.string()).optional(),
        searchFilters: z.object({
            dateRange: z.object({
                start: z.date().optional(),
                end: z.date().optional(),
            }).optional(),
            entityTypes: z.array(z.string()).optional(),
            customFilters: z.record(z.any()).optional(),
        }).optional(),
        instanceUrl: z.string().optional(),
    }),
});
export const updateDataAccessSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        allowedShardTypes: z.array(z.string()),
    }),
});
export const updateSearchConfigSchema = z.object({
    params: z.object({
        id: z.string(),
    }),
    body: z.object({
        searchEnabled: z.boolean().optional(),
        searchableEntities: z.array(z.string()).optional(),
        searchFilters: z.object({
            dateRange: z.object({
                start: z.date().optional(),
                end: z.date().optional(),
            }).optional(),
            entityTypes: z.array(z.string()).optional(),
            customFilters: z.record(z.any()).optional(),
        }).optional(),
    }),
});
// Search Schemas
export const searchSchema = z.object({
    body: z.object({
        query: z.string().min(1, 'Search query is required').max(500, 'Query must be less than 500 characters'),
        entities: z.array(z.string()).optional(),
        filters: z.object({
            dateRange: z.object({
                start: z.date().optional(),
                end: z.date().optional(),
            }).optional(),
            entityTypes: z.array(z.string()).optional(),
            customFilters: z.record(z.any()).optional(),
        }).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        integrationIds: z.array(z.string()).optional(),
    }),
});
// User Connection Schemas
export const createUserConnectionSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
    }),
    body: z.object({
        credentials: z.record(z.any()).optional(),
        displayName: z.string().max(200, 'Display name must be less than 200 characters').optional(),
    }),
});
export const updateUserConnectionSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
        connectionId: z.string().min(1, 'Connection ID is required'),
    }),
    body: z.object({
        displayName: z.string().max(200, 'Display name must be less than 200 characters').optional(),
        credentials: z.record(z.any()).optional(),
    }),
});
export const deleteUserConnectionSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
        connectionId: z.string().min(1, 'Connection ID is required'),
    }),
});
export const testUserConnectionSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
        connectionId: z.string().min(1, 'Connection ID is required'),
    }),
});
export const bulkDeleteUserConnectionsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
    }),
    body: z.object({
        connectionIds: z.array(z.string().min(1)).min(1, 'At least one connection ID is required').max(50, 'Maximum 50 connections can be deleted at once'),
    }),
});
export const bulkTestUserConnectionsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Integration ID is required'),
    }),
    body: z.object({
        connectionIds: z.array(z.string().min(1)).min(1, 'At least one connection ID is required').max(50, 'Maximum 50 connections can be tested at once'),
    }),
});
//# sourceMappingURL=integration.schemas.js.map
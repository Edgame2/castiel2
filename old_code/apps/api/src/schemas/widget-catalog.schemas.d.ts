/**
 * Widget Catalog Validation Schemas
 * Zod schemas for widget catalog API requests
 * Enforces role-based restrictions:
 * - SuperAdmin: Full CRUD with all fields
 * - TenantAdmin: Visibility/role customization only (cannot modify base config)
 */
import { z } from 'zod';
import { WidgetType } from '../types/widget.types.js';
import { WidgetCatalogStatus, WidgetVisibilityLevel } from '../types/widget-catalog.types.js';
export declare const CreateWidgetCatalogEntrySchema: z.ZodObject<{
    widgetType: z.ZodNativeEnum<typeof WidgetType>;
    name: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    thumbnail: z.ZodOptional<z.ZodString>;
    defaultSize: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>;
    defaultConfig: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    visibilityLevel: z.ZodNativeEnum<typeof WidgetVisibilityLevel>;
    allowedRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof WidgetCatalogStatus>>>;
}, "strip", z.ZodTypeAny, {
    category: string;
    name: string;
    displayName: string;
    description: string;
    status: WidgetCatalogStatus;
    isDefault: boolean;
    visibilityLevel: WidgetVisibilityLevel;
    widgetType: WidgetType;
    defaultSize: {
        width: number;
        height: number;
    };
    defaultConfig: Record<string, unknown>;
    isFeatured: boolean;
    icon?: string | undefined;
    thumbnail?: string | undefined;
    allowedRoles?: string[] | undefined;
}, {
    category: string;
    name: string;
    displayName: string;
    description: string;
    visibilityLevel: WidgetVisibilityLevel;
    widgetType: WidgetType;
    defaultSize: {
        width: number;
        height: number;
    };
    defaultConfig: Record<string, unknown>;
    status?: WidgetCatalogStatus | undefined;
    icon?: string | undefined;
    isDefault?: boolean | undefined;
    thumbnail?: string | undefined;
    allowedRoles?: string[] | undefined;
    isFeatured?: boolean | undefined;
}>;
export type CreateWidgetCatalogEntryInput = z.infer<typeof CreateWidgetCatalogEntrySchema>;
export declare const UpdateWidgetCatalogEntrySchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    thumbnail: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof WidgetCatalogStatus>>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isFeatured: z.ZodOptional<z.ZodBoolean>;
    visibilityLevel: z.ZodOptional<z.ZodNativeEnum<typeof WidgetVisibilityLevel>>;
    allowedRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    defaultSize: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    defaultConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    minSize: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    maxSize: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    category?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    status?: WidgetCatalogStatus | undefined;
    icon?: string | undefined;
    isDefault?: boolean | undefined;
    maxSize?: {
        width: number;
        height: number;
    } | undefined;
    visibilityLevel?: WidgetVisibilityLevel | undefined;
    thumbnail?: string | undefined;
    defaultSize?: {
        width: number;
        height: number;
    } | undefined;
    defaultConfig?: Record<string, unknown> | undefined;
    allowedRoles?: string[] | undefined;
    isFeatured?: boolean | undefined;
    minSize?: {
        width: number;
        height: number;
    } | undefined;
}, {
    version: number;
    category?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    status?: WidgetCatalogStatus | undefined;
    icon?: string | undefined;
    isDefault?: boolean | undefined;
    maxSize?: {
        width: number;
        height: number;
    } | undefined;
    visibilityLevel?: WidgetVisibilityLevel | undefined;
    thumbnail?: string | undefined;
    defaultSize?: {
        width: number;
        height: number;
    } | undefined;
    defaultConfig?: Record<string, unknown> | undefined;
    allowedRoles?: string[] | undefined;
    isFeatured?: boolean | undefined;
    minSize?: {
        width: number;
        height: number;
    } | undefined;
}>;
export type UpdateWidgetCatalogEntryInput = z.infer<typeof UpdateWidgetCatalogEntrySchema>;
/**
 * TenantAdmin can only modify:
 * - visibleToTenant
 * - customVisibilityLevel
 * - customAllowedRoles
 * - enableForTenant
 * - featuredForTenant
 *
 * TenantAdmin CANNOT modify:
 * - Widget configuration
 * - Default size
 * - Default config
 * - Base display name/description
 */
export declare const UpdateTenantWidgetAccessSchema: z.ZodObject<{
    widgetCatalogEntryId: z.ZodString;
    visibleToTenant: z.ZodOptional<z.ZodBoolean>;
    customVisibilityLevel: z.ZodOptional<z.ZodNativeEnum<typeof WidgetVisibilityLevel>>;
    customAllowedRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    enableForTenant: z.ZodOptional<z.ZodBoolean>;
    featuredForTenant: z.ZodOptional<z.ZodBoolean>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    widgetCatalogEntryId: string;
    visibleToTenant?: boolean | undefined;
    customVisibilityLevel?: WidgetVisibilityLevel | undefined;
    customAllowedRoles?: string[] | undefined;
    enableForTenant?: boolean | undefined;
    featuredForTenant?: boolean | undefined;
}, {
    version: number;
    widgetCatalogEntryId: string;
    visibleToTenant?: boolean | undefined;
    customVisibilityLevel?: WidgetVisibilityLevel | undefined;
    customAllowedRoles?: string[] | undefined;
    enableForTenant?: boolean | undefined;
    featuredForTenant?: boolean | undefined;
}>;
export type UpdateTenantWidgetAccessInput = z.infer<typeof UpdateTenantWidgetAccessSchema>;
/**
 * TenantAdmin can customize:
 * - Which widgets are visible to tenant
 * - Which widgets are hidden
 * - Which widgets are featured
 * - Role-based widget access
 * - Default widgets for new dashboards
 * - Limits (max widgets per dashboard)
 */
export declare const UpdateTenantWidgetConfigSchema: z.ZodObject<{
    visibleWidgetIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    hiddenWidgetIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    featuredWidgetIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    roleBasedWidgetAccess: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    defaultWidgetCatalogEntryIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    maxWidgetsPerDashboard: z.ZodOptional<z.ZodNumber>;
    maxCustomQueryWidgets: z.ZodOptional<z.ZodNumber>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    visibleWidgetIds?: string[] | undefined;
    hiddenWidgetIds?: string[] | undefined;
    featuredWidgetIds?: string[] | undefined;
    roleBasedWidgetAccess?: Record<string, string[]> | undefined;
    defaultWidgetCatalogEntryIds?: string[] | undefined;
    maxWidgetsPerDashboard?: number | undefined;
    maxCustomQueryWidgets?: number | undefined;
}, {
    version: number;
    visibleWidgetIds?: string[] | undefined;
    hiddenWidgetIds?: string[] | undefined;
    featuredWidgetIds?: string[] | undefined;
    roleBasedWidgetAccess?: Record<string, string[]> | undefined;
    defaultWidgetCatalogEntryIds?: string[] | undefined;
    maxWidgetsPerDashboard?: number | undefined;
    maxCustomQueryWidgets?: number | undefined;
}>;
export type UpdateTenantWidgetConfigInput = z.infer<typeof UpdateTenantWidgetConfigSchema>;
export declare const ListWidgetCatalogSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof WidgetCatalogStatus>>;
    category: z.ZodOptional<z.ZodString>;
    visibilityLevel: z.ZodOptional<z.ZodNativeEnum<typeof WidgetVisibilityLevel>>;
    search: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodEnum<["name", "category", "recent", "featured"]>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    category?: string | undefined;
    status?: WidgetCatalogStatus | undefined;
    tenantId?: string | undefined;
    sort?: "category" | "name" | "recent" | "featured" | undefined;
    visibilityLevel?: WidgetVisibilityLevel | undefined;
}, {
    search?: string | undefined;
    category?: string | undefined;
    status?: WidgetCatalogStatus | undefined;
    limit?: number | undefined;
    tenantId?: string | undefined;
    sort?: "category" | "name" | "recent" | "featured" | undefined;
    page?: number | undefined;
    visibilityLevel?: WidgetVisibilityLevel | undefined;
}>;
export type ListWidgetCatalogInput = z.infer<typeof ListWidgetCatalogSchema>;
export declare const WidgetCatalogEntryIdParamSchema: z.ZodObject<{
    widgetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    widgetId: string;
}, {
    widgetId: string;
}>;
export declare const TenantIdParamSchema: z.ZodObject<{
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
}, {
    tenantId: string;
}>;
export declare const WidgetAccessParamSchema: z.ZodObject<{
    tenantId: z.ZodString;
    widgetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    widgetId: string;
}, {
    tenantId: string;
    widgetId: string;
}>;
//# sourceMappingURL=widget-catalog.schemas.d.ts.map
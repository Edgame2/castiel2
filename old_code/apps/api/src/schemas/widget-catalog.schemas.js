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
// ============================================================================
// Common Schemas
// ============================================================================
const GridSizeSchema = z.object({
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(8),
});
const WidgetCatalogStatusSchema = z.nativeEnum(WidgetCatalogStatus);
const WidgetVisibilityLevelSchema = z.nativeEnum(WidgetVisibilityLevel);
const WidgetTypeSchema = z.nativeEnum(WidgetType);
// ============================================================================
// SuperAdmin: Create Widget Catalog Entry
// ============================================================================
export const CreateWidgetCatalogEntrySchema = z.object({
    widgetType: WidgetTypeSchema,
    name: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9_-]+$/, 'Must contain only lowercase alphanumeric, hyphens, and underscores'),
    displayName: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    category: z.string().min(1).max(50),
    icon: z.string().optional(),
    thumbnail: z.string().optional(),
    defaultSize: GridSizeSchema,
    defaultConfig: z.record(z.unknown()),
    visibilityLevel: WidgetVisibilityLevelSchema,
    allowedRoles: z.array(z.string()).optional(),
    isDefault: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),
    status: WidgetCatalogStatusSchema.optional().default(WidgetCatalogStatus.ACTIVE),
});
// ============================================================================
// SuperAdmin: Update Widget Catalog Entry
// ============================================================================
export const UpdateWidgetCatalogEntrySchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    category: z.string().min(1).max(50).optional(),
    icon: z.string().optional(),
    thumbnail: z.string().optional(),
    status: WidgetCatalogStatusSchema.optional(),
    isDefault: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    visibilityLevel: WidgetVisibilityLevelSchema.optional(),
    allowedRoles: z.array(z.string()).optional(),
    defaultSize: GridSizeSchema.optional(),
    defaultConfig: z.record(z.unknown()).optional(),
    minSize: GridSizeSchema.optional(),
    maxSize: GridSizeSchema.optional(),
    version: z.number().int().min(1), // Optimistic concurrency
});
// ============================================================================
// TenantAdmin: Update Widget Access (Visibility/Roles Only)
// ============================================================================
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
export const UpdateTenantWidgetAccessSchema = z.object({
    widgetCatalogEntryId: z.string().min(1),
    visibleToTenant: z.boolean().optional(),
    customVisibilityLevel: WidgetVisibilityLevelSchema.optional(),
    customAllowedRoles: z.array(z.string()).optional(),
    enableForTenant: z.boolean().optional(),
    featuredForTenant: z.boolean().optional(),
    version: z.number().int().min(1), // Optimistic concurrency
});
// ============================================================================
// TenantAdmin: Update Widget Config (Visibility & Role Settings)
// ============================================================================
/**
 * TenantAdmin can customize:
 * - Which widgets are visible to tenant
 * - Which widgets are hidden
 * - Which widgets are featured
 * - Role-based widget access
 * - Default widgets for new dashboards
 * - Limits (max widgets per dashboard)
 */
export const UpdateTenantWidgetConfigSchema = z.object({
    visibleWidgetIds: z.array(z.string()).optional(),
    hiddenWidgetIds: z.array(z.string()).optional(),
    featuredWidgetIds: z.array(z.string()).optional(),
    roleBasedWidgetAccess: z.record(z.array(z.string())).optional(),
    defaultWidgetCatalogEntryIds: z.array(z.string()).optional(),
    maxWidgetsPerDashboard: z.number().int().min(1).max(100).optional(),
    maxCustomQueryWidgets: z.number().int().min(0).max(20).optional(),
    version: z.number().int().min(1), // Optimistic concurrency
});
// ============================================================================
// List & Query Schemas
// ============================================================================
export const ListWidgetCatalogSchema = z.object({
    tenantId: z.string().optional(),
    status: WidgetCatalogStatusSchema.optional(),
    category: z.string().optional(),
    visibilityLevel: WidgetVisibilityLevelSchema.optional(),
    search: z.string().optional(),
    sort: z.enum(['name', 'category', 'recent', 'featured']).optional(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(50),
});
// ============================================================================
// Parameter Schemas
// ============================================================================
export const WidgetCatalogEntryIdParamSchema = z.object({
    widgetId: z.string().min(1),
});
export const TenantIdParamSchema = z.object({
    tenantId: z.string().min(1),
});
export const WidgetAccessParamSchema = z.object({
    tenantId: z.string().min(1),
    widgetId: z.string().min(1),
});
//# sourceMappingURL=widget-catalog.schemas.js.map
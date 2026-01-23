/**
 * Widget Catalog Seed Data
 *
 * Defines default widget types available in the widget catalog
 */
import type { WidgetCatalogEntry } from '../types/widget-catalog.types.js';
/**
 * Default System Widget Catalog Entries
 */
export declare const DEFAULT_WIDGET_CATALOG: Array<Omit<WidgetCatalogEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>;
/**
 * Get widget catalog entry by name
 */
export declare function getWidgetCatalogEntry(name: string): typeof DEFAULT_WIDGET_CATALOG[0] | undefined;
/**
 * Get widget catalog entries by category
 */
export declare function getWidgetCatalogByCategory(category: string): typeof DEFAULT_WIDGET_CATALOG;
/**
 * Get featured widget catalog entries
 */
export declare function getFeaturedWidgets(): typeof DEFAULT_WIDGET_CATALOG;
/**
 * Get default widget catalog entries
 */
export declare function getDefaultWidgets(): typeof DEFAULT_WIDGET_CATALOG;
//# sourceMappingURL=widget-catalog.seed.d.ts.map
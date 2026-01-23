/**
 * Widget Migration Service
 * Migrates existing inline dashboard widgets to catalog references
 *
 * Migration Strategy:
 * 1. Scan all dashboards for widgets with inline configs
 * 2. For each widget, find or create matching catalog entry
 * 3. Update dashboard widget to reference catalog entry ID
 * 4. Track migration status and any conflicts
 */
import { IMonitoringProvider } from '@castiel/monitoring';
export interface MigrationStats {
    totalDashboards: number;
    totalWidgets: number;
    migratedWidgets: number;
    newCatalogEntries: number;
    skippedWidgets: number;
    errors: Array<{
        dashboardId: string;
        widgetId: string;
        error: string;
    }>;
    startTime: Date;
    endTime?: Date;
    durationMs?: number;
}
export declare class WidgetMigrationService {
    private dashboardRepository;
    private catalogRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Dry-run migration - analyze what would be migrated without making changes
     */
    analyzeMigration(): Promise<MigrationStats>;
    /**
     * Execute full migration - convert all inline widgets to catalog references
     */
    executeFullMigration(): Promise<MigrationStats>;
    /**
     * Migrate single dashboard
     */
    migrateDashboard(dashboardId: string, tenantId: string): Promise<MigrationStats>;
    /**
     * Check if widget has inline configuration (not referencing catalog)
     */
    private hasInlineConfig;
    /**
     * Find matching catalog entry for widget
     * Matches by widget type and similar configuration
     */
    private findMatchingCatalogEntry;
    /**
     * Create catalog entry from existing widget
     */
    private createCatalogEntryFromWidget;
    /**
     * Get category from widget type
     */
    private getCategoryFromWidgetType;
}
//# sourceMappingURL=widget-migration.service.d.ts.map
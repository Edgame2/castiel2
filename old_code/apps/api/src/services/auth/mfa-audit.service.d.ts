/**
 * MFA Audit Service
 *
 * Service for logging and retrieving MFA audit events
 */
import { Database } from '@azure/cosmos';
import type { MFAAuditEvent, MFAAuditEventCreate, MFAAuditQuery, MFAAuditListResponse } from '@castiel/shared-types';
import type { IMonitoringProvider } from '@castiel/monitoring';
export declare class MFAAuditService {
    private database;
    private containerName;
    private monitoring?;
    constructor(database: Database, monitoring?: IMonitoringProvider);
    /**
     * Log an MFA audit event
     */
    logEvent(event: MFAAuditEventCreate): Promise<MFAAuditEvent>;
    /**
     * Query MFA audit events
     */
    queryEvents(query: MFAAuditQuery): Promise<MFAAuditListResponse>;
    /**
     * Export MFA audit events to CSV format
     */
    exportToCSV(query: MFAAuditQuery): Promise<string>;
    /**
     * Get MFA statistics for a tenant
     */
    getStatistics(tenantId: string, days?: number): Promise<{
        totalEvents: number;
        successRate: number;
        eventsByAction: Record<string, number>;
        eventsByMethod: Record<string, number>;
    }>;
}
//# sourceMappingURL=mfa-audit.service.d.ts.map
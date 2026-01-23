/**
 * MFA Audit Service
 * 
 * Service for logging and retrieving MFA audit events
 */

import { Database } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import type {
  MFAAuditEvent,
  MFAAuditEventCreate,
  MFAAuditQuery,
  MFAAuditListResponse,
} from '@castiel/shared-types';
import type { IMonitoringProvider } from '@castiel/monitoring';

export class MFAAuditService {
  private database: Database;
  private containerName = 'MFAAuditEvents';
  private monitoring?: IMonitoringProvider;

  constructor(database: Database, monitoring?: IMonitoringProvider) {
    this.database = database;
    this.monitoring = monitoring;
  }

  /**
   * Log an MFA audit event
   */
  async logEvent(event: MFAAuditEventCreate): Promise<MFAAuditEvent> {
    const container = this.database.container(this.containerName);

    const auditEvent: MFAAuditEvent = {
      id: uuidv4(),
      ...event,
      timestamp: new Date().toISOString(),
    };

    try {
      await container.items.create(auditEvent);
      return auditEvent;
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'MFAAuditService',
        operation: 'logEvent',
      });
      // Don't throw - audit logging should not break application flow
      return auditEvent;
    }
  }

  /**
   * Query MFA audit events
   */
  async queryEvents(query: MFAAuditQuery): Promise<MFAAuditListResponse> {
    const container = this.database.container(this.containerName);
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Build query
    let sqlQuery = `
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
    `;
    const parameters: any[] = [{ name: '@tenantId', value: query.tenantId }];

    if (query.userId) {
      sqlQuery += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: query.userId });
    }

    if (query.action) {
      sqlQuery += ' AND c.action = @action';
      parameters.push({ name: '@action', value: query.action });
    }

    if (query.method) {
      sqlQuery += ' AND c.method = @method';
      parameters.push({ name: '@method', value: query.method });
    }

    if (query.success !== undefined) {
      sqlQuery += ' AND c.success = @success';
      parameters.push({ name: '@success', value: query.success });
    }

    if (query.startDate) {
      sqlQuery += ' AND c.timestamp >= @startDate';
      parameters.push({ name: '@startDate', value: query.startDate });
    }

    if (query.endDate) {
      sqlQuery += ' AND c.timestamp <= @endDate';
      parameters.push({ name: '@endDate', value: query.endDate });
    }

    sqlQuery += ' ORDER BY c.timestamp DESC';

    try {
      // Get total count
      const countQuery = sqlQuery.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countResources } = await container.items
        .query({
          query: countQuery,
          parameters,
        })
        .fetchAll();
      const total = countResources[0] || 0;

      // Get paginated results
      const { resources: events } = await container.items
        .query<MFAAuditEvent>({
          query: `${sqlQuery} OFFSET @offset LIMIT @limit`,
          parameters: [
            ...parameters,
            { name: '@offset', value: offset },
            { name: '@limit', value: limit },
          ],
        })
        .fetchAll();

      return {
        events,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'MFAAuditService',
        operation: 'queryEvents',
      });
      throw new Error('Failed to query audit events');
    }
  }

  /**
   * Export MFA audit events to CSV format
   */
  async exportToCSV(query: MFAAuditQuery): Promise<string> {
    const { events } = await this.queryEvents({ ...query, limit: 10000, offset: 0 });

    // CSV header
    const headers = [
      'Timestamp',
      'User Email',
      'Action',
      'Method',
      'Success',
      'IP Address',
      'User Agent',
      'Error Message',
    ];

    // CSV rows
    const rows = events.map((event: MFAAuditEvent) => [
      event.timestamp,
      event.userEmail,
      event.action,
      event.method || '',
      event.success ? 'Yes' : 'No',
      event.ipAddress || '',
      event.userAgent || '',
      event.errorMessage || '',
    ]);

    // Build CSV string
    const csvLines = [
      headers.join(','),
      ...rows.map((row: any[]) =>
        row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * Get MFA statistics for a tenant
   */
  async getStatistics(tenantId: string, days: number = 30): Promise<{
    totalEvents: number;
    successRate: number;
    eventsByAction: Record<string, number>;
    eventsByMethod: Record<string, number>;
  }> {
    const container = this.database.container(this.containerName);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
        AND c.timestamp >= @startDate
    `;

    try {
      const { resources: events } = await container.items
        .query<MFAAuditEvent>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@startDate', value: startDate.toISOString() },
          ],
        })
        .fetchAll();

      const totalEvents = events.length;
      const successCount = events.filter((e) => e.success).length;
      const successRate = totalEvents > 0 ? successCount / totalEvents : 0;

      const eventsByAction: Record<string, number> = {};
      const eventsByMethod: Record<string, number> = {};

      events.forEach((event) => {
        eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
        if (event.method) {
          eventsByMethod[event.method] = (eventsByMethod[event.method] || 0) + 1;
        }
      });

      return {
        totalEvents,
        successRate,
        eventsByAction,
        eventsByMethod,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'MFAAuditService',
        operation: 'getStatistics',
      });
      throw new Error('Failed to get MFA statistics');
    }
  }
}

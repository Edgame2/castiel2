/**
 * ML Field Recalculation Job
 * Periodic job to recalculate ML fields for active opportunities
 * @module integration-processors/jobs/mlFieldRecalculation
 */

import cron from 'node-cron';
import { ServiceClient, EventPublisher } from '@coder/shared';
import { log } from '../utils/logger.js';

export class MLFieldRecalculationJob {
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    private shardManager: ServiceClient,
    private eventPublisher: EventPublisher
  ) {}

  start(): void {
    // Run daily at 2 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.execute();
    });

    log.info('ML field recalculation job scheduled (daily at 2 AM)', {
      service: 'integration-processors',
    });
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  private async execute(): Promise<void> {
    log.info('Starting ML field recalculation...', { service: 'integration-processors' });

    try {
      // Tenant list from user-management or config when API is available; or trigger per tenant from workflow-orchestrator
      // Get list of tenant IDs
      const tenantIds = await this.getTenantIds();

      if (tenantIds.length === 0) {
        log.warn('No tenants found for ML field recalculation', {
          service: 'integration-processors',
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      let totalProcessed = 0;
      let totalPublished = 0;

      // Process each tenant
      for (const tenantId of tenantIds) {
        try {
          const activeOpportunities = await this.getActiveOpportunities(tenantId, today);
          totalProcessed += activeOpportunities.length;

          // Publish recalculation events
          for (const opp of activeOpportunities) {
            try {
              await this.eventPublisher.publish(
                'ml_field_aggregation.recalculate',
                tenantId,
                {
                  opportunityId: opp.id,
                  tenantId,
                  reason: 'periodic_recalculation',
                  triggeredAt: new Date().toISOString(),
                }
              );
              totalPublished++;
            } catch (error) {
              log.error('Failed to publish recalculation event', error, {
                opportunityId: opp.id,
                tenantId,
                service: 'integration-processors',
              });
            }
          }

          log.debug('Processed tenant for ML field recalculation', {
            tenantId,
            opportunityCount: activeOpportunities.length,
            service: 'integration-processors',
          });
        } catch (error) {
          log.error('Failed to process tenant for ML field recalculation', error, {
            tenantId,
            service: 'integration-processors',
          });
          // Continue with next tenant
        }
      }

      log.info('ML field recalculation completed', {
        tenantsProcessed: tenantIds.length,
        opportunitiesProcessed: totalProcessed,
        eventsPublished: totalPublished,
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('ML field recalculation failed', error, { service: 'integration-processors' });
    }
  }

  /**
   * Get list of tenant IDs (enhance when tenant list API is available).
   * Returns empty until then; job can also be triggered per tenant from workflow-orchestrator.
   */
  private async getTenantIds(): Promise<string[]> {
    // Query user-management or config when tenant list API is available

    // Example implementation (commented out until tenant API is available):
    // try {
    //   const response = await this.userManagementClient.get('/api/v1/tenants');
    //   return response.items?.map((t: any) => t.id) || [];
    // } catch (error) {
    //   log.error('Failed to get tenant list', error, { service: 'integration-processors' });
    //   return [];
    // }

    log.warn('Tenant list not available - ML field recalculation will be a no-op', {
      service: 'integration-processors',
    });
    return [];
  }

  /**
   * Get active opportunities for a tenant (closeDate >= today)
   * Uses pagination to handle large datasets
   */
  private async getActiveOpportunities(
    tenantId: string,
    today: Date
  ): Promise<Array<{ id: string; tenantId: string }>> {
    const activeOpportunities: Array<{ id: string; tenantId: string }> = [];
    let continuationToken: string | undefined;
    const pageSize = 1000; // Process in batches

    do {
      try {
        // Query opportunities for this tenant
        const queryParams = new URLSearchParams({
          shardTypeId: 'opportunity',
          status: 'active',
          limit: String(pageSize),
        });
        if (continuationToken) {
          queryParams.append('continuationToken', continuationToken);
        }

        const response = await this.shardManager.get(
          `/api/v1/shards?${queryParams.toString()}`,
          {
            headers: {
              'X-Tenant-ID': tenantId,
            },
          }
        );

        const result = response.items || (Array.isArray(response) ? response : []);
        continuationToken = response.continuationToken;

        // Filter for active opportunities (closeDate >= today)
        for (const opp of result) {
          const closeDate = opp.structuredData?.closeDate;
          if (closeDate) {
            const closeDateObj = new Date(closeDate);
            if (closeDateObj >= today) {
              activeOpportunities.push({
                id: opp.id,
                tenantId: opp.tenantId || tenantId,
              });
            }
          } else {
            // If no closeDate, consider it active (might be a new opportunity)
            activeOpportunities.push({
              id: opp.id,
              tenantId: opp.tenantId || tenantId,
            });
          }
        }
      } catch (error) {
        log.error('Failed to query opportunities', error, {
          tenantId,
          continuationToken,
          service: 'integration-processors',
        });
        break; // Stop pagination on error
      }
    } while (continuationToken);

    return activeOpportunities;
  }
}

/**
 * Recurring web search schedule CRUD (dataflow Phase 4.1)
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { WebSearchSchedule, CreateScheduleInput, ScheduleScope } from '../types/schedule.types.js';

export class ScheduleService {
  private getContainerName(): string {
    return loadConfig().cosmos_db.containers.schedules ?? 'web_search_schedules';
  }

  async list(tenantId: string, options?: { scope?: ScheduleScope; userId?: string }): Promise<WebSearchSchedule[]> {
    const container = getContainer(this.getContainerName());
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const params: { name: string; value: string }[] = [{ name: '@tenantId', value: tenantId }];
    if (options?.userId) {
      query += ' AND c.userId = @userId';
      params.push({ name: '@userId', value: options.userId });
    }
    if (options?.scope) {
      query += ' AND c.scope = @scope';
      params.push({ name: '@scope', value: options.scope });
    }
    query += ' ORDER BY c.createdAt DESC';
    const { resources } = await container.items
      .query({ query, parameters: params }, { partitionKey: tenantId })
      .fetchAll();
    return resources as WebSearchSchedule[];
  }

  async get(id: string, tenantId: string): Promise<WebSearchSchedule | null> {
    const container = getContainer(this.getContainerName());
    try {
      const { resource } = await container.item(id, tenantId).read();
      return resource as WebSearchSchedule | null;
    } catch {
      return null;
    }
  }

  async create(input: CreateScheduleInput): Promise<WebSearchSchedule> {
    const container = getContainer(this.getContainerName());
    const now = new Date().toISOString();
    const doc: WebSearchSchedule = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      query: input.query,
      cronExpression: input.cronExpression,
      scope: input.scope,
      role: input.role,
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await container.items.create(doc, { partitionKey: input.tenantId } as any);
    return doc;
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<WebSearchSchedule, 'query' | 'cronExpression' | 'scope' | 'role' | 'nextRunAt'>>
  ): Promise<WebSearchSchedule | null> {
    const existing = await this.get(id, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const container = getContainer(this.getContainerName());
    await container.item(id, tenantId).replace(updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const container = getContainer(this.getContainerName());
    try {
      await container.item(id, tenantId).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Return schedules that are due (nextRunAt <= now). Caller should set nextRunAt after run.
   * @param tenantId - When set, only that tenant's schedules; when omitted, cross-partition (all tenants).
   */
  async getDue(tenantId?: string): Promise<WebSearchSchedule[]> {
    const container = getContainer(this.getContainerName());
    const now = new Date().toISOString();
    const query = tenantId
      ? 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.nextRunAt <= @now'
      : 'SELECT * FROM c WHERE c.nextRunAt <= @now';
    const parameters = tenantId
      ? [
          { name: '@tenantId', value: tenantId },
          { name: '@now', value: now },
        ]
      : [{ name: '@now', value: now }];
    const opts = tenantId ? ({ partitionKey: tenantId } as { partitionKey: string }) : undefined;
    const feed = container.items.query({ query, parameters }, opts);
    const { resources } = await feed.fetchAll();
    return resources as WebSearchSchedule[];
  }

  /** Set next run (e.g. +24h for daily). Simple increment. */
  async setNextRun(id: string, tenantId: string, nextRunAt: string): Promise<void> {
    await this.update(id, tenantId, { nextRunAt });
  }
}

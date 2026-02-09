/**
 * Recurring web search schedule (dataflow Phase 4.1)
 */

export type ScheduleScope = 'super_admin' | 'tenant_admin' | 'user';

export interface WebSearchSchedule {
  id: string;
  tenantId: string;
  userId: string;
  query: string;
  /** Cron expression (e.g. "0 9 * * *" for daily 9am) */
  cronExpression: string;
  scope: ScheduleScope;
  role: ScheduleScope;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  tenantId: string;
  userId: string;
  query: string;
  cronExpression: string;
  scope: ScheduleScope;
  role: ScheduleScope;
}

/**
 * CRM Shard StructuredData Interfaces
 * Interfaces for Opportunity, Account, Contact, Lead shard types
 */

/**
 * Opportunity Shard StructuredData
 * Sales opportunity with ML fields and integration tracking
 */
export interface OpportunityStructuredData {
  // Core fields
  id: string;
  name: string;
  amount: number;
  currency?: string;
  stage: string;
  probability?: number;
  expectedRevenue?: number;
  closeDate?: string; // ISO date-time string
  createdDate?: string; // ISO date-time string
  ownerId?: string;
  accountId?: string;

  // ML fields (optional)
  daysInStage?: number;
  daysSinceLastActivity?: number;
  dealVelocity?: number;
  competitorCount?: number;
  stakeholderCount?: number;
  documentCount?: number;
  emailCount?: number;
  meetingCount?: number;
  callCount?: number;

  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: string; // ISO date-time string
  syncStatus?: 'synced' | 'pending' | 'error';

  // Additional BI Sales Risk fields
  lastActivityDate?: string; // ISO date-time string
  industry?: string;
  industryId?: string;
  competitorIds?: string[];
  stageUpdatedAt?: string; // ISO date-time string
  stageDates?: Record<string, string>; // Map of stage names to dates
}

/**
 * Account Shard StructuredData
 * Account with integration tracking and ML fields
 */
export interface AccountStructuredData {
  id: string;
  name: string;
  industry?: string;
  industryId?: string;
  revenue?: number;
  employeeCount?: number;
  website?: string;
  type?: string;
  ownerId?: string;

  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: string; // ISO date-time string

  // Historical performance (for ML)
  historicalWinRate?: number;
  historicalDealCount?: number;
  historicalRevenue?: number;
}

/**
 * Contact Shard StructuredData
 * Contact with integration tracking and engagement fields
 */
export interface ContactStructuredData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  accountId?: string;

  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: string; // ISO date-time string

  // Engagement tracking (for ML)
  emailInteractionCount?: number;
  meetingAttendanceCount?: number;
  lastInteractionDate?: string; // ISO date-time string
  isKeyStakeholder?: boolean;
}

/**
 * Lead Shard StructuredData
 * Lead with integration tracking
 */
export interface LeadStructuredData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status?: string;

  // Integration tracking
  integrationSource?: string;
  externalId?: string;
  lastSyncedAt?: string; // ISO date-time string
}

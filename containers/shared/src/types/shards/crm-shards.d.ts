/**
 * CRM Shard StructuredData Interfaces
 * Interfaces for Opportunity, Account, Contact, Lead shard types
 */
/**
 * Opportunity Shard StructuredData
 * Sales opportunity with ML fields and integration tracking
 */
export interface OpportunityStructuredData {
    id: string;
    name: string;
    amount: number;
    currency?: string;
    stage: string;
    probability?: number;
    expectedRevenue?: number;
    closeDate?: string;
    createdDate?: string;
    ownerId?: string;
    accountId?: string;
    daysInStage?: number;
    daysSinceLastActivity?: number;
    dealVelocity?: number;
    competitorCount?: number;
    stakeholderCount?: number;
    documentCount?: number;
    emailCount?: number;
    meetingCount?: number;
    callCount?: number;
    integrationSource?: string;
    externalId?: string;
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
    lastActivityDate?: string;
    industry?: string;
    industryId?: string;
    competitorIds?: string[];
    stageUpdatedAt?: string;
    stageDates?: Record<string, string>;
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
    integrationSource?: string;
    externalId?: string;
    lastSyncedAt?: string;
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
    integrationSource?: string;
    externalId?: string;
    lastSyncedAt?: string;
    emailInteractionCount?: number;
    meetingAttendanceCount?: number;
    lastInteractionDate?: string;
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
    integrationSource?: string;
    externalId?: string;
    lastSyncedAt?: string;
}
//# sourceMappingURL=crm-shards.d.ts.map
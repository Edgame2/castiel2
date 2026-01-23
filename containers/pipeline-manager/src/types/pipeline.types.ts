/**
 * Pipeline Manager types
 * Core data model for pipeline and opportunity management
 */

export enum SalesStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  VALUE_PROPOSITION = 'value_proposition',
  ID_DECISION_MAKERS = 'id_decision_makers',
  PERCEPTION_ANALYSIS = 'perception_analysis',
  PROPOSAL_PRICE_QUOTE = 'proposal_price_quote',
  NEGOTIATION_REVIEW = 'negotiation_review',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum OpportunityType {
  NEW_BUSINESS = 'new_business',
  EXISTING_BUSINESS = 'existing_business',
  RENEWAL = 'renewal',
  UPSELL = 'upsell',
  CROSS_SELL = 'cross_sell',
  EXPANSION = 'expansion',
  OTHER = 'other',
}

export enum OpportunityStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum LostReason {
  PRICE = 'price',
  COMPETITION = 'competition',
  NO_DECISION = 'no_decision',
  OTHER = 'other',
}

export enum ForecastCategory {
  OMITTED = 'omitted',
  PIPELINE = 'pipeline',
  BEST_CASE = 'best_case',
  FORECAST = 'forecast',
  COMMITTED = 'committed',
}

/**
 * Opportunity structured data (stored as shard)
 */
export interface OpportunityStructuredData {
  name: string;
  opportunityNumber?: string;
  type?: OpportunityType;
  stage: SalesStage;
  status?: OpportunityStatus;
  isWon?: boolean;
  isClosed?: boolean;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  amount?: number;
  expectedRevenue: number;
  currency?: string;
  probability: number; // 0-100
  totalPrice?: number;
  totalOpportunityQuantity?: number;
  closeDate?: Date;
  nextStepDate?: Date;
  createdDate?: Date;
  lastModifiedDate?: Date;
  lastActivityDate?: Date;
  fiscalYear?: number;
  fiscalQuarter?: number;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  leadId?: string;
  leadName?: string;
  campaignId?: string;
  campaignName?: string;
  ownerId: string;
  ownerName?: string;
  competitorIds?: string[];
  contactRoleIds?: string[];
  lineItemIds?: string[];
  forecastCategory?: ForecastCategory;
  forecastCategoryName?: string;
  isExcludedFromForecast?: boolean;
  leadSource?: string;
  hasOpportunityLineItem?: boolean;
  hasOpportunitySplits?: boolean;
  description?: string;
  nextStep?: string;
  tags?: string[];
  rating?: 'hot' | 'warm' | 'cold';
}

/**
 * Opportunity (linked to shard)
 */
export interface Opportunity {
  id: string;
  tenantId: string; // Partition key
  shardId: string; // Linked shard ID from Shard Manager
  structuredData: OpportunityStructuredData;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create opportunity input
 */
export interface CreateOpportunityInput {
  tenantId: string;
  userId: string;
  name: string;
  opportunityNumber?: string;
  type?: OpportunityType;
  stage: SalesStage;
  status?: OpportunityStatus;
  amount?: number;
  currency?: string;
  probability?: number;
  closeDate?: Date;
  nextStepDate?: Date;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  leadId?: string;
  leadName?: string;
  campaignId?: string;
  campaignName?: string;
  ownerId: string;
  ownerName?: string;
  description?: string;
  nextStep?: string;
  tags?: string[];
  rating?: 'hot' | 'warm' | 'cold';
}

/**
 * Update opportunity input
 */
export interface UpdateOpportunityInput {
  name?: string;
  type?: OpportunityType;
  stage?: SalesStage;
  status?: OpportunityStatus;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedRevenue?: number;
  closeDate?: Date;
  nextStepDate?: Date;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  ownerId?: string;
  ownerName?: string;
  description?: string;
  nextStep?: string;
  tags?: string[];
  rating?: 'hot' | 'warm' | 'cold';
  lostReason?: LostReason;
  lostReasonDetail?: string;
  forecastCategory?: ForecastCategory;
  isExcludedFromForecast?: boolean;
}

/**
 * Pipeline View
 */
export interface PipelineView {
  id: string;
  tenantId: string; // Partition key
  userId: string; // Creator
  name: string;
  description?: string;
  stages: PipelineStage[];
  filters?: {
    ownerIds?: string[];
    accountIds?: string[];
    type?: OpportunityType;
    status?: OpportunityStatus;
    tags?: string[];
    dateRange?: {
      startDate?: Date;
      endDate?: Date;
    };
  };
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Pipeline Stage configuration
 */
export interface PipelineStage {
  stage: SalesStage;
  name: string;
  order: number;
  probability?: number; // Default probability for this stage
  color?: string;
  isActive: boolean;
}

/**
 * Create pipeline view input
 */
export interface CreatePipelineViewInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  filters?: PipelineView['filters'];
  isDefault?: boolean;
}

/**
 * Update pipeline view input
 */
export interface UpdatePipelineViewInput {
  name?: string;
  description?: string;
  stages?: PipelineStage[];
  filters?: PipelineView['filters'];
  isDefault?: boolean;
}

/**
 * Pipeline Analytics
 */
export interface PipelineAnalytics {
  totalOpportunities: number;
  totalAmount: number;
  totalExpectedRevenue: number;
  byStage: {
    stage: SalesStage;
    count: number;
    amount: number;
    expectedRevenue: number;
  }[];
  byStatus: {
    status: OpportunityStatus;
    count: number;
    amount: number;
  }[];
  byOwner: {
    ownerId: string;
    ownerName?: string;
    count: number;
    amount: number;
    expectedRevenue: number;
  }[];
  winRate: number;
  averageDealSize: number;
  averageSalesCycle: number; // in days
}

/**
 * Pipeline Forecast
 */
export interface PipelineForecast {
  period: {
    startDate: Date;
    endDate: Date;
    fiscalYear?: number;
    fiscalQuarter?: number;
  };
  forecastedRevenue: number;
  committedRevenue: number;
  bestCaseRevenue: number;
  pipelineRevenue: number;
  byStage: {
    stage: SalesStage;
    count: number;
    revenue: number;
    probability: number;
  }[];
  confidence: number; // 0-100
}


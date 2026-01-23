/**
 * Normalization Helper
 * 
 * Shared normalization logic for ingestion workers.
 * Normalizes vendor-specific data into canonical shard type schemas.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IngestionEvent } from '@castiel/api-core';
import { SyncStatus, SyncDirection } from '@castiel/api-core';

/**
 * Normalize ingestion event into shard data
 */
export function normalizeIngestionEvent(event: IngestionEvent): any | null {
  const payload = event.payload;
  if (!payload) return null;

  switch (event.source) {
    case 'salesforce':
      return normalizeSalesforce(event);
    case 'gdrive':
      return normalizeGoogleDrive(event);
    case 'slack':
      return normalizeSlack(event);
    default:
      return null;
  }
}

/**
 * Normalize Salesforce data
 */
function normalizeSalesforce(event: IngestionEvent): any | null {
  const payload = event.payload;
  if (!payload) return null;

  // Determine shard type based on entity type
  const entityType = payload.Type || payload.type;
  let shardTypeId: string;
  let structuredData: any;

  if (entityType === 'Opportunity') {
    shardTypeId = 'c_opportunity';
    structuredData = {
      name: payload.Name || payload.name,
      stage: mapSalesforceStage(payload.StageName || payload.stageName),
      value: payload.Amount || payload.amount || 0,
      currency: payload.CurrencyIsoCode || payload.currency || 'USD',
      accountId: payload.AccountId || payload.accountId,
      ownerId: payload.OwnerId || payload.ownerId,
      probability: payload.Probability || payload.probability || 0,
      closeDate: payload.CloseDate || payload.closeDate,
      expectedRevenue: payload.ExpectedRevenue || payload.expectedRevenue || 0,
      description: payload.Description || payload.description,
    };
  } else if (entityType === 'Account') {
    shardTypeId = 'c_account';
    structuredData = {
      name: payload.Name || payload.name,
      industry: payload.Industry || payload.industry,
      revenue: payload.AnnualRevenue || payload.annualRevenue || 0,
      employees: payload.NumberOfEmployees || payload.numberOfEmployees || 0,
      website: payload.Website || payload.website,
      description: payload.Description || payload.description,
    };
  } else {
    return null;
  }

  // Build enhanced external_relationships
  const externalRelationship = {
    id: uuidv4(),
    system: 'salesforce',
    systemType: entityType === 'Opportunity' ? 'crm' : 'crm',
    externalId: event.sourceId,
    label: structuredData.name,
    syncStatus: SyncStatus.SYNCED,
    syncDirection: SyncDirection.INBOUND,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
  };

  return {
    tenantId: event.tenantId,
    userId: 'system',
    shardTypeId,
    structuredData,
    external_relationships: [externalRelationship],
    internal_relationships: [],
    acl: [],
    status: event.eventType === 'delete' ? 'archived' : 'active',
    source: 'integration',
    sourceDetails: {
      integrationName: 'salesforce',
      originalId: event.sourceId,
      syncedAt: new Date(),
    },
  };
}

/**
 * Normalize Google Drive data
 */
function normalizeGoogleDrive(event: IngestionEvent): any | null {
  const payload = event.payload;
  if (!payload) return null;

  // Determine if folder or file
  const mimeType = payload.mimeType || payload.mime_type;
  const isFolder = mimeType === 'application/vnd.google-apps.folder' || payload.kind === 'drive#folder';

  let shardTypeId: string;
  let structuredData: any;

  if (isFolder) {
    shardTypeId = 'c_folder';
    structuredData = {
      name: payload.name,
      provider: 'gdrive',
      externalId: payload.id,
      path: payload.path || payload.fullFileExtension || '',
      parentExternalId: payload.parents?.[0] || payload.parentFolderId,
      owner: payload.owners?.[0]?.emailAddress || payload.owner?.email,
      description: payload.description,
    };
  } else {
    shardTypeId = 'c_file';
    structuredData = {
      name: payload.name,
      provider: 'gdrive',
      externalId: payload.id,
      mimeType: mimeType || 'application/octet-stream',
      size: payload.size || 0,
      checksum: payload.md5Checksum || payload.md5_checksum,
      sourceUrl: payload.webViewLink || payload.web_view_link || payload.webContentLink || payload.web_content_link,
      parentFolderExternalId: payload.parents?.[0] || payload.parentFolderId,
      owner: payload.owners?.[0]?.emailAddress || payload.owner?.email,
      lastModified: payload.modifiedTime || payload.modified_time || new Date(),
    };
  }

  const externalRelationship = {
    id: uuidv4(),
    system: 'gdrive',
    systemType: isFolder ? 'storage' : 'storage',
    externalId: event.sourceId,
    label: structuredData.name,
    syncStatus: SyncStatus.SYNCED,
    syncDirection: SyncDirection.INBOUND,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
  };

  return {
    tenantId: event.tenantId,
    userId: 'system',
    shardTypeId,
    structuredData,
    external_relationships: [externalRelationship],
    internal_relationships: [],
    acl: [],
    status: event.eventType === 'delete' ? 'archived' : 'active',
    source: 'integration',
    sourceDetails: {
      integrationName: 'gdrive',
      originalId: event.sourceId,
      syncedAt: new Date(),
    },
  };
}

/**
 * Normalize Slack data
 */
function normalizeSlack(event: IngestionEvent): any | null {
  const payload = event.payload;
  if (!payload) return null;

  const shardTypeId = 'c_channel';
  const structuredData = {
    platform: 'slack',
    name: payload.name,
    externalId: payload.id,
    teamExternalId: payload.team_id || payload.teamId,
    topic: payload.topic?.value || payload.topic,
    description: payload.purpose?.value || payload.purpose,
    isPrivate: payload.is_private || payload.isPrivate || false,
    members: payload.members ? JSON.stringify(payload.members) : undefined,
  };

  const externalRelationship = {
    id: uuidv4(),
    system: 'slack',
    systemType: 'messaging',
    externalId: event.sourceId,
    label: structuredData.name,
    syncStatus: SyncStatus.SYNCED,
    syncDirection: SyncDirection.INBOUND,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
  };

  return {
    tenantId: event.tenantId,
    userId: 'system',
    shardTypeId,
    structuredData,
    external_relationships: [externalRelationship],
    internal_relationships: [],
    acl: [],
    status: event.eventType === 'delete' ? 'archived' : 'active',
    source: 'integration',
    sourceDetails: {
      integrationName: 'slack',
      originalId: event.sourceId,
      syncedAt: new Date(),
    },
  };
}

/**
 * Map Salesforce stage to canonical stage
 */
function mapSalesforceStage(stage: string): string {
  const stageMap: Record<string, string> = {
    'Prospecting': 'prospecting',
    'Qualification': 'qualification',
    'Needs Analysis': 'needs_analysis',
    'Value Proposition': 'value_proposition',
    'Id. Decision Makers': 'id_decision_makers',
    'Perception Analysis': 'perception_analysis',
    'Proposal/Price Quote': 'proposal_price_quote',
    'Negotiation/Review': 'negotiation_review',
    'Closed Won': 'closed_won',
    'Closed Lost': 'closed_lost',
  };

  return stageMap[stage] || stage.toLowerCase().replace(/\s+/g, '_');
}




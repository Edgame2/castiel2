/**
 * Entity Linking Service
 * Links documents, emails, messages, meetings to CRM entities (opportunities, accounts, contacts)
 * @module @coder/shared/services
 */

import { ServiceClient } from './ServiceClient';

/**
 * Entity link with confidence score
 */
export interface EntityLink {
  id: string; // Shard ID of the linked entity
  shardTypeId: string;
  shardTypeName?: string;
  confidence: number; // 0-1 scale (0.8 = 80%)
  strategy: string; // Strategy that found this link
  metadata?: Record<string, any>;
}

/**
 * Collection of entity links grouped by type
 */
export interface EntityLinks {
  opportunities: EntityLink[];
  accounts: EntityLink[];
  contacts: EntityLink[];
}

/**
 * Entity linking service
 * Provides fast linking (during shard creation) and deep linking (async) strategies
 */
export class EntityLinkingService {
  private shardManager: ServiceClient;
  private aiService?: ServiceClient; // Optional AI service for content analysis

  constructor(shardManager: ServiceClient, aiService?: ServiceClient) {
    this.shardManager = shardManager;
    this.aiService = aiService;
  }

  /**
   * Fast linking - strategies that can run during shard creation (100-300ms)
   * Strategies: Explicit Reference, Participant Matching
   */
  async fastLink(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    // Strategy 1: Explicit Reference (100% confidence)
    const explicitLinks = await this.findExplicitReferences(shard, tenantId);
    links.opportunities.push(...explicitLinks.opportunities);
    links.accounts.push(...explicitLinks.accounts);
    links.contacts.push(...explicitLinks.contacts);

    // Strategy 2: Participant Matching (80-90% confidence)
    // Only for Email and Meeting shards
    if (shard.shardTypeId === 'email' || shard.shardTypeName === 'Email' ||
        shard.shardTypeId === 'meeting' || shard.shardTypeName === 'Meeting') {
      const participantLinks = await this.matchParticipants(shard, tenantId);
      links.opportunities.push(...participantLinks.opportunities);
      links.contacts.push(...participantLinks.contacts);
    }

    return links;
  }

  /**
   * Deep linking - strategies that run async after shard creation (1-5 seconds)
   * Strategies: Content Analysis (LLM), Temporal Correlation, Vector Similarity
   */
  async deepLink(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    // Strategy 3: Content Analysis (LLM-based) - 60-80% confidence
    if (this.aiService) {
      const contentLinks = await this.analyzeContent(shard, tenantId);
      links.opportunities.push(...contentLinks.opportunities);
      links.accounts.push(...contentLinks.accounts);
    }

    // Strategy 4: Temporal Correlation - 40-60% confidence
    const temporalLinks = await this.findTemporalCorrelations(shard, tenantId);
    links.opportunities.push(...temporalLinks.opportunities);

    // Strategy 5: Vector Similarity - 30-50% confidence
    // Note: Vector similarity requires embeddings, which may not be available immediately
    // This is a placeholder for future implementation
    // const similarityLinks = await this.findSimilarEntities(shard, tenantId);
    // links.opportunities.push(...similarityLinks.opportunities);

    return links;
  }

  /**
   * Strategy 1: Find explicit references to entities
   * - Document/email contains opportunity ID
   * - Message @mentions deal name
   * - Calendar event has deal in title
   * Confidence: 100%
   */
  private async findExplicitReferences(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    const structuredData = shard.structuredData || {};
    const unstructuredData = shard.unstructuredData || {};

    // Check for explicit opportunity IDs in structured data
    if (structuredData.opportunityId || structuredData.linkedOpportunityIds) {
      const opportunityIds = Array.isArray(structuredData.linkedOpportunityIds)
        ? structuredData.linkedOpportunityIds
        : [structuredData.opportunityId].filter(Boolean);

      for (const oppId of opportunityIds) {
        try {
          // Verify opportunity exists
          const opportunity = await this.shardManager.get(
            `/api/v1/shards/${oppId}`,
            {
              headers: { 'X-Tenant-ID': tenantId },
            }
          );

          if (opportunity && (opportunity.shardTypeId === 'opportunity' || opportunity.shardTypeName === 'Opportunity')) {
            links.opportunities.push({
              id: oppId,
              shardTypeId: opportunity.shardTypeId,
              shardTypeName: opportunity.shardTypeName,
              confidence: 1.0, // 100%
              strategy: 'explicit_reference',
              metadata: { source: 'structuredData' },
            });
          }
        } catch (error) {
          // Opportunity not found, skip
        }
      }
    }

    // Check unstructured data for opportunity mentions
    const textContent = this.extractTextContent(unstructuredData);
    if (textContent) {
      // Look for opportunity IDs in text (UUIDs, Salesforce IDs, etc.)
      const opportunityIdPattern = /(?:opportunity|deal|opp)[\s:]*([a-zA-Z0-9]{15,18})/gi;
      const matches = textContent.match(opportunityIdPattern);
      if (matches) {
        // Try to find opportunities by name or ID
        // This is simplified - in production, would use more sophisticated matching
      }
    }

    return links;
  }

  /**
   * Strategy 2: Match participants to contacts/opportunities
   * - Email to/from contact in opportunity
   * - Meeting participants match stakeholders
   * - Message in channel with stakeholder
   * Confidence: 80-90%
   */
  private async matchParticipants(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    const structuredData = shard.structuredData || {};
    const shardTypeId = shard.shardTypeId || shard.shardTypeName?.toLowerCase();

    // Extract participants based on shard type
    let participants: string[] = [];
    if (shardTypeId === 'email') {
      participants = [
        structuredData.from,
        ...(structuredData.to || []),
        ...(structuredData.cc || []),
      ].filter(Boolean);
    } else if (shardTypeId === 'meeting') {
      participants = structuredData.participants || [];
    }

    if (participants.length === 0) {
      return links;
    }

    // Find contacts matching participants (by email)
    for (const participant of participants) {
      try {
        // Query contacts by email
        const contacts = await this.shardManager.get(
          `/api/v1/shards?filter=shardTypeId eq 'contact' and tenantId eq '${tenantId}' and (structuredData.email eq '${participant}' or structuredData.emailAddress eq '${participant}')`,
          {
            headers: { 'X-Tenant-ID': tenantId },
          }
        );

        const contactList = Array.isArray(contacts) ? contacts : (contacts.items || []);
        for (const contact of contactList) {
          links.contacts.push({
            id: contact.id,
            shardTypeId: contact.shardTypeId,
            shardTypeName: contact.shardTypeName,
            confidence: 0.85, // 85%
            strategy: 'participant_matching',
            metadata: { participant, source: 'email_match' },
          });

          // Find opportunities linked to this contact
          const relatedOpportunities = await this.shardManager.get(
            `/api/v1/shards/${contact.id}/related?targetShardTypeId=opportunity&direction=both`,
            {
              headers: { 'X-Tenant-ID': tenantId },
            }
          );

          const oppList = Array.isArray(relatedOpportunities) ? relatedOpportunities : [];
          for (const rel of oppList) {
            const opp = rel.shard || rel;
            if (opp && opp.shardTypeId === 'opportunity') {
              links.opportunities.push({
                id: opp.id,
                shardTypeId: opp.shardTypeId,
                shardTypeName: opp.shardTypeName,
                confidence: 0.8, // 80%
                strategy: 'participant_matching',
                metadata: { participant, contactId: contact.id, source: 'contact_relationship' },
              });
            }
          }
        }
      } catch (error) {
        // Contact not found or error, skip
      }
    }

    return links;
  }

  /**
   * Strategy 3: Content Analysis using LLM
   * - Extract company names → match to accounts
   * - Extract deal amounts → match to opportunity value
   * - Topic similarity
   * Confidence: 60-80%
   */
  private async analyzeContent(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    if (!this.aiService) {
      return links; // AI service not available
    }

    // Extract text content
    const textContent = this.extractTextContent(shard.unstructuredData || {});
    if (!textContent || textContent.length < 50) {
      return links; // Not enough content
    }

    try {
      // Call AI service to extract entities
      // This is a placeholder - actual implementation would call AI service
      // const analysis = await this.aiService.post('/api/v1/analyze', {
      //   text: textContent,
      //   extractEntities: ['companies', 'deal_amounts', 'opportunity_names'],
      // });

      // For now, return empty links (will be implemented when AI service is available)
      // In production, would:
      // 1. Extract company names from content
      // 2. Match to accounts
      // 3. Extract deal amounts/names
      // 4. Match to opportunities
      // 5. Return links with 60-80% confidence
    } catch (error) {
      // AI service error, skip
    }

    return links;
  }

  /**
   * Strategy 4: Temporal Correlation
   * - Activity near opportunity close date
   * - Activity during active stage
   * - Activity with same participants
   * Confidence: 40-60%
   */
  private async findTemporalCorrelations(shard: any, tenantId: string): Promise<EntityLinks> {
    const links: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    const structuredData = shard.structuredData || {};
    const shardDate = structuredData.date || structuredData.createdAt || structuredData.startTime || shard.createdAt;

    if (!shardDate) {
      return links; // No date available
    }

    try {
      const activityDate = new Date(shardDate);
      const dateRangeStart = new Date(activityDate);
      dateRangeStart.setDate(dateRangeStart.getDate() - 30); // 30 days before
      const dateRangeEnd = new Date(activityDate);
      dateRangeEnd.setDate(dateRangeEnd.getDate() + 30); // 30 days after

      // Find opportunities with close dates near this activity
      const opportunities = await this.shardManager.get(
        `/api/v1/shards?filter=shardTypeId eq 'opportunity' and tenantId eq '${tenantId}' and structuredData.closeDate ge '${dateRangeStart.toISOString()}' and structuredData.closeDate le '${dateRangeEnd.toISOString()}'`,
        {
          headers: { 'X-Tenant-ID': tenantId },
        }
      );

      const oppList = Array.isArray(opportunities) ? opportunities : (opportunities.items || []);
      for (const opp of oppList.slice(0, 10)) { // Limit to 10 to avoid too many links
        const closeDate = new Date(opp.structuredData?.closeDate);
        const daysDiff = Math.abs((activityDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));

        // Confidence decreases with time difference
        const confidence = Math.max(0.4, 0.6 - (daysDiff / 30) * 0.2); // 60% at 0 days, 40% at 30+ days

        links.opportunities.push({
          id: opp.id,
          shardTypeId: opp.shardTypeId,
          shardTypeName: opp.shardTypeName,
          confidence,
          strategy: 'temporal_correlation',
          metadata: { daysDiff, activityDate: activityDate.toISOString(), closeDate: closeDate.toISOString() },
        });
      }
    } catch (error) {
      // Error querying opportunities, skip
    }

    return links;
  }

  /**
   * Extract text content from unstructured data
   */
  private extractTextContent(unstructuredData: any): string {
    if (typeof unstructuredData === 'string') {
      return unstructuredData;
    }

    if (typeof unstructuredData === 'object' && unstructuredData !== null) {
      // Try common text fields
      const textFields = ['text', 'content', 'body', 'bodyPlainText', 'extractedText', 'transcript', 'summary'];
      for (const field of textFields) {
        if (unstructuredData[field] && typeof unstructuredData[field] === 'string') {
          return unstructuredData[field];
        }
      }

      // Recursively search for text
      for (const value of Object.values(unstructuredData)) {
        const text = this.extractTextContent(value);
        if (text) {
          return text;
        }
      }
    }

    return '';
  }

  /**
   * Deduplicate and merge entity links
   * Removes duplicates and merges links from multiple strategies
   */
  mergeLinks(...linkSets: EntityLinks[]): EntityLinks {
    const merged: EntityLinks = {
      opportunities: [],
      accounts: [],
      contacts: [],
    };

    const seen = new Map<string, EntityLink>(); // Map<entityId, bestLink>

    for (const linkSet of linkSets) {
      for (const category of ['opportunities', 'accounts', 'contacts'] as const) {
        for (const link of linkSet[category]) {
          const existing = seen.get(link.id);
          if (!existing || link.confidence > existing.confidence) {
            seen.set(link.id, link);
          }
        }
      }
    }

    // Categorize links
    for (const link of seen.values()) {
      if (link.shardTypeId === 'opportunity' || link.shardTypeName === 'Opportunity') {
        merged.opportunities.push(link);
      } else if (link.shardTypeId === 'account' || link.shardTypeName === 'Account') {
        merged.accounts.push(link);
      } else if (link.shardTypeId === 'contact' || link.shardTypeName === 'Contact') {
        merged.contacts.push(link);
      }
    }

    // Sort by confidence (highest first)
    merged.opportunities.sort((a, b) => b.confidence - a.confidence);
    merged.accounts.sort((a, b) => b.confidence - a.confidence);
    merged.contacts.sort((a, b) => b.confidence - a.confidence);

    return merged;
  }
}

/**
 * Activity Aggregation Service
 * Creates Activity and Interaction shards from Email, Meeting, and Message shards
 * @module integration-processors/services
 */

import { ServiceClient } from '@coder/shared';
import { ActivityStructuredData, InteractionStructuredData } from '@coder/shared/types/shards';

export interface SourceShardData {
  shardId: string;
  shardType: 'Email' | 'Meeting' | 'Message';
  structuredData: any;
  tenantId: string;
}

/**
 * Activity Aggregation Service
 * Aggregates activities from Email, Meeting, and Message shards
 */
export class ActivityAggregationService {
  constructor(private shardManager: ServiceClient) {}

  /**
   * Create Activity shard from source shard (Email, Meeting, or Message)
   * Returns both the shard ID and the structured data for use in interaction creation
   */
  async createActivityFromShard(sourceShard: SourceShardData): Promise<{ shardId: string; structuredData: ActivityStructuredData }> {
    const activityId = `${sourceShard.shardType.toLowerCase()}_${sourceShard.shardId}_${Date.now()}`;

    const structuredData: ActivityStructuredData = {
      id: activityId,
      activityType: this.mapShardTypeToActivityType(sourceShard.shardType),
      sourceShardId: sourceShard.shardId,
      sourceShardType: sourceShard.shardType,
      integrationSource: sourceShard.structuredData.integrationSource,
      primaryParticipant: this.extractPrimaryParticipant(sourceShard),
      secondaryParticipants: this.extractSecondaryParticipants(sourceShard),
      subject: this.extractSubject(sourceShard),
      description: this.extractDescription(sourceShard),
      duration: this.extractDuration(sourceShard),
      direction: this.extractDirection(sourceShard),
      linkedOpportunityIds: sourceShard.structuredData.linkedOpportunityIds || [],
      linkedAccountIds: sourceShard.structuredData.linkedAccountIds || [],
      linkedContactIds: sourceShard.structuredData.linkedContactIds || [],
      activityDate: this.extractActivityDate(sourceShard),
      completionStatus: 'completed',
      importance: this.calculateImportance(sourceShard),
      engagementScore: this.extractEngagementScore(sourceShard),
      sentiment: this.extractSentiment(sourceShard),
      createdAt: new Date().toISOString(),
    };

    // Create Activity shard via shard-manager API
    const shardResponse = await this.shardManager.post<{ id: string }>(
      '/api/v1/shards',
      {
        tenantId: sourceShard.tenantId,
        shardTypeId: 'activity',
        shardTypeName: 'Activity',
        structuredData,
      },
      {
        headers: {
          'X-Tenant-ID': sourceShard.tenantId,
        },
      }
    );

    return {
      shardId: shardResponse.id,
      structuredData,
    };
  }

  /**
   * Create Interaction shards from Activity shard
   */
  async createInteractionsFromActivity(
    activityShardId: string,
    activityData: ActivityStructuredData,
    tenantId: string
  ): Promise<string[]> {
    const interactionIds: string[] = [];

    // Create interactions between primary participant and each secondary participant
    const primaryContactId = activityData.primaryParticipant.contactId;
    if (!primaryContactId) {
      return interactionIds; // Cannot create interaction without contact ID
    }

    const secondaryParticipants = activityData.secondaryParticipants || [];
    for (const secondary of secondaryParticipants) {
      if (!secondary.contactId) {
        continue; // Skip if no contact ID
      }

      const interactionId = `interaction_${primaryContactId}_${secondary.contactId}_${Date.now()}`;
      const structuredData: InteractionStructuredData = {
        id: interactionId,
        fromContactId: primaryContactId,
        toContactIds: [secondary.contactId],
        interactionType: activityData.activityType as 'email' | 'meeting' | 'call' | 'message',
        sourceActivityId: activityShardId,
        interactionDate: activityData.activityDate,
        sentiment: activityData.sentiment,
        linkedOpportunityIds: activityData.linkedOpportunityIds || [],
        linkedAccountIds: activityData.linkedAccountIds || [],
        createdAt: new Date().toISOString(),
      };

      // Create Interaction shard via shard-manager API
      try {
        const shardResponse = await this.shardManager.post<{ id: string }>(
          '/api/v1/shards',
          {
            tenantId,
            shardTypeId: 'interaction',
            shardTypeName: 'Interaction',
            structuredData,
          },
          {
            headers: {
              'X-Tenant-ID': tenantId,
            },
          }
        );

        interactionIds.push(shardResponse.id);
      } catch (error: any) {
        // Log error but continue with other interactions
        console.error('Failed to create interaction shard', {
          error: error.message,
          fromContactId: primaryContactId,
          toContactId: secondary.contactId,
          tenantId,
        });
      }
    }

    return interactionIds;
  }


  /**
   * Map shard type to activity type
   */
  private mapShardTypeToActivityType(shardType: 'Email' | 'Meeting' | 'Message'): ActivityStructuredData['activityType'] {
    switch (shardType) {
      case 'Email':
        return 'email';
      case 'Meeting':
        return 'meeting';
      case 'Message':
        return 'message';
      default:
        return 'other';
    }
  }

  /**
   * Extract primary participant from source shard
   */
  private extractPrimaryParticipant(sourceShard: SourceShardData): ActivityStructuredData['primaryParticipant'] {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return {
        email: data.from,
        name: data.fromName || data.from,
        contactId: data.fromContactId,
        isInternal: data.fromIsInternal || false,
      };
    }

    if (sourceShard.shardType === 'Meeting') {
      return {
        email: data.organizer?.email,
        name: data.organizer?.name || 'Unknown',
        contactId: data.organizer?.contactId,
        isInternal: true, // Organizer is typically internal
      };
    }

    if (sourceShard.shardType === 'Message') {
      return {
        email: data.fromEmail,
        name: data.from || 'Unknown',
        contactId: data.fromContactId,
        isInternal: data.fromIsInternal || false,
      };
    }

    return {
      name: 'Unknown',
      isInternal: false,
    };
  }

  /**
   * Extract secondary participants from source shard
   */
  private extractSecondaryParticipants(sourceShard: SourceShardData): ActivityStructuredData['secondaryParticipants'] {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      const recipients = [...(data.to || []), ...(data.cc || []), ...(data.bcc || [])];
      return recipients.map((recipient: any) => ({
        email: typeof recipient === 'string' ? recipient : recipient.email,
        name: typeof recipient === 'string' ? recipient : recipient.name || recipient.email,
        contactId: typeof recipient === 'object' ? recipient.contactId : undefined,
        isInternal: typeof recipient === 'object' ? recipient.isInternal || false : false,
      }));
    }

    if (sourceShard.shardType === 'Meeting') {
      return (data.participants || []).map((p: any) => ({
        email: p.email,
        name: p.name,
        contactId: p.contactId,
        isInternal: p.isInternal || false,
      }));
    }

    if (sourceShard.shardType === 'Message') {
      const mentions = data.mentions || [];
      return mentions.map((mention: any) => ({
        email: typeof mention === 'string' ? undefined : mention.email,
        name: typeof mention === 'string' ? mention : mention.name || mention.id,
        contactId: typeof mention === 'object' ? mention.contactId : undefined,
        isInternal: typeof mention === 'object' ? mention.isInternal || false : false,
      }));
    }

    return [];
  }

  /**
   * Extract subject from source shard
   */
  private extractSubject(sourceShard: SourceShardData): string | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return data.subject;
    }

    if (sourceShard.shardType === 'Meeting') {
      return data.title;
    }

    if (sourceShard.shardType === 'Message') {
      return undefined; // Messages typically don't have subjects
    }

    return undefined;
  }

  /**
   * Extract description from source shard
   */
  private extractDescription(sourceShard: SourceShardData): string | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return data.body || data.textBody || data.htmlBody;
    }

    if (sourceShard.shardType === 'Meeting') {
      return data.description;
    }

    if (sourceShard.shardType === 'Message') {
      return data.text || data.content;
    }

    return undefined;
  }

  /**
   * Extract duration from source shard
   */
  private extractDuration(sourceShard: SourceShardData): number | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Meeting') {
      return data.duration; // Already in minutes
    }

    // For emails and messages, duration is typically not available
    return undefined;
  }

  /**
   * Extract direction from source shard
   */
  private extractDirection(sourceShard: SourceShardData): 'inbound' | 'outbound' | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return data.direction; // Should be set by EmailProcessorConsumer
    }

    if (sourceShard.shardType === 'Message') {
      return data.direction; // Should be set by MessageProcessorConsumer
    }

    // Meetings are typically bidirectional
    return undefined;
  }

  /**
   * Extract activity date from source shard
   */
  private extractActivityDate(sourceShard: SourceShardData): string {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return data.receivedAt || data.sentAt || data.createdAt || new Date().toISOString();
    }

    if (sourceShard.shardType === 'Meeting') {
      return data.startTime || data.createdAt || new Date().toISOString();
    }

    if (sourceShard.shardType === 'Message') {
      return data.receivedAt || data.createdAt || new Date().toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * Calculate importance based on source shard data
   */
  private calculateImportance(sourceShard: SourceShardData): 'low' | 'normal' | 'high' {
    const data = sourceShard.structuredData;

    // High importance indicators
    if (sourceShard.shardType === 'Email' && data.importance === 'high') {
      return 'high';
    }

    if (sourceShard.shardType === 'Meeting' && data.meetingType === 'closing') {
      return 'high';
    }

    // Low importance indicators
    if (sourceShard.shardType === 'Message' && data.channelType === 'public') {
      return 'low';
    }

    return 'normal';
  }

  /**
   * Extract engagement score from source shard
   */
  private extractEngagementScore(sourceShard: SourceShardData): number | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Meeting') {
      return data.engagementMetrics?.score;
    }

    // For emails and messages, engagement score might be calculated separately
    return undefined;
  }

  /**
   * Extract sentiment from source shard
   */
  private extractSentiment(sourceShard: SourceShardData): number | undefined {
    const data = sourceShard.structuredData;

    if (sourceShard.shardType === 'Email') {
      return data.sentiment;
    }

    if (sourceShard.shardType === 'Message') {
      return data.sentiment;
    }

    // Meeting sentiment might be calculated from transcript
    return undefined;
  }
}

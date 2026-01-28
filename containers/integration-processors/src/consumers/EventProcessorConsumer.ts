/**
 * Event Processor Consumer
 * Consumes integration.event.created events, parses calendar event metadata, and creates CalendarEvent shards
 * @module integration-processors/consumers
 */

import { EventConsumer, ServiceClient, EventPublisher, EntityLinkingService } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';
import { CalendarEventStructuredData } from '@coder/shared/types/shards';

interface EventCreatedEvent {
  integrationId: string;
  tenantId: string;
  eventId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: string; // ISO date-time string
  endTime?: string; // ISO date-time string
  duration?: number; // minutes
  timezone?: string;
  isAllDay?: boolean;
  location?: string;
  locationType?: 'in_person' | 'online' | 'phone';
  meetingUrl?: string;
  organizer: {
    email: string;
    name?: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    isOptional?: boolean;
  }>;
  recurrence?: {
    isRecurring?: boolean;
    recurrenceRule?: string; // iCal RRULE
    recurrenceId?: string;
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  integrationSource: 'google_calendar' | 'outlook' | 'exchange';
  externalUrl?: string;
  syncTaskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Event Processor Consumer
 * Processes calendar events from integrations (Google Calendar, Outlook, Exchange)
 */
export class EventProcessorConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private entityLinkingService: EntityLinkingService | null = null;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();

    // Initialize entity linking service if AI service is available
    if (deps.aiService) {
      this.entityLinkingService = new EntityLinkingService(deps.shardManager, deps.aiService);
    }
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, event processor consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'integration_events',
        routingKeys: ['integration.event.created'],
        prefetch: 15, // Higher prefetch for fast processing
      });

      // Handle event created events
      this.consumer.on('integration.event.created', async (event) => {
        await this.handleEventCreatedEvent(event.data as EventCreatedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Event processor consumer started', {
        queue: 'integration_events',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start event processor consumer', error, {
        service: 'integration-processors',
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }
  }

  /**
   * Handle event created event
   */
  private async handleEventCreatedEvent(event: EventCreatedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { tenantId, eventId, externalId } = event;

    try {
      log.info('Processing calendar event', {
        eventId,
        externalId,
        tenantId,
        title: event.title,
        service: 'integration-processors',
      });

      // Step 1: Classify event type
      const eventType = this.classifyEventType(event.title, event.description, event.location);

      // Step 2: Determine if event is deal-related
      const isDealRelated = this.isDealRelated(event.title, event.description, event.attendees);

      // Step 3: Calculate duration if not provided
      const duration = event.duration || this.calculateDuration(event.startTime, event.endTime);

      // Step 4: Classify attendees (internal vs external)
      const classifiedAttendees = this.classifyAttendees(event.attendees || []);

      // Step 5: Create CalendarEvent shard
      const structuredData: CalendarEventStructuredData = {
        id: externalId,
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        integrationSource: event.integrationSource,
        externalId: externalId,
        externalUrl: event.externalUrl,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: duration,
        timezone: event.timezone,
        isAllDay: event.isAllDay || false,
        location: event.location,
        locationType: event.locationType,
        meetingUrl: event.meetingUrl,
        organizer: {
          email: event.organizer.email,
          name: event.organizer.name,
        },
        attendees: classifiedAttendees,
        attendeeCount: classifiedAttendees.length,
        recurrence: event.recurrence,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };

      // Step 6: Create shard via shard-manager API
      const shardResponse = await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'calendarevent',
          shardTypeName: 'CalendarEvent',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shardId = shardResponse.id;

      log.info('Calendar event shard created', {
        eventId,
        shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 7: Publish shard.created event (triggers entity linking)
      await this.deps.eventPublisher.publish('shard.created', tenantId, {
        shardId,
        tenantId,
        shardTypeId: 'calendarevent',
        shardTypeName: 'CalendarEvent',
        structuredData,
      });

      // Step 8: Publish event.processed event
      await this.deps.eventPublisher.publish('event.processed', tenantId, {
        eventId,
        shardId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        title: event.title,
        startTime: event.startTime,
        attendeeCount: classifiedAttendees.length,
        isDealRelated,
        eventType,
      });

      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Calendar event processed successfully', {
        eventId,
        shardId,
        duration,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to process calendar event', error, {
        eventId,
        externalId,
        tenantId,
        duration,
        service: 'integration-processors',
      });

      // Publish event processing failed event
      await this.deps.eventPublisher.publish('event.processing.failed', tenantId, {
        eventId,
        tenantId,
        integrationId: event.integrationId,
        externalId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Classify event type based on title, description, and location
   */
  private classifyEventType(
    title: string,
    description?: string,
    location?: string
  ): 'meeting' | 'call' | 'interview' | 'demo' | 'training' | 'personal' | 'other' {
    const text = `${title} ${description || ''} ${location || ''}`.toLowerCase();

    if (text.includes('interview') || text.includes('screening')) {
      return 'interview';
    }
    if (text.includes('demo') || text.includes('demonstration') || text.includes('presentation')) {
      return 'demo';
    }
    if (text.includes('training') || text.includes('onboarding') || text.includes('workshop')) {
      return 'training';
    }
    if (text.includes('call') || text.includes('phone') || text.includes('conference call')) {
      return 'call';
    }
    if (text.includes('personal') || text.includes('private') || text.includes('vacation')) {
      return 'personal';
    }
    if (text.includes('meeting') || text.includes('sync') || text.includes('standup')) {
      return 'meeting';
    }

    return 'other';
  }

  /**
   * Determine if event is deal-related based on title, description, and attendees
   */
  private isDealRelated(title: string, description?: string, attendees?: Array<{ email?: string; name?: string }>): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Check for deal-related keywords
    const dealKeywords = [
      'opportunity',
      'deal',
      'proposal',
      'contract',
      'negotiation',
      'closing',
      'sales',
      'account',
      'client',
      'customer',
      'prospect',
    ];

    const hasDealKeyword = dealKeywords.some((keyword) => text.includes(keyword));

    // Check if attendees include external email domains (potential customers)
    const hasExternalAttendees =
      attendees?.some((attendee) => {
        if (!attendee.email) return false;
        const domain = attendee.email.split('@')[1]?.toLowerCase();
        // Simple heuristic: exclude common internal domains
        return (
          domain &&
          !domain.includes('gmail.com') &&
          !domain.includes('outlook.com') &&
          !domain.includes('hotmail.com') &&
          !domain.includes('yahoo.com')
        );
      }) || false;

    return hasDealKeyword || hasExternalAttendees;
  }

  /**
   * Calculate duration in minutes from start and end times
   */
  private calculateDuration(startTime: string, endTime?: string): number | undefined {
    if (!endTime) {
      return undefined;
    }

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Classify attendees as internal or external
   */
  private classifyAttendees(
    attendees: Array<{ email?: string; name?: string; responseStatus?: string; isOptional?: boolean }>
  ): Array<{
    email: string;
    name?: string;
    contactId?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    isOptional?: boolean;
    isInternal?: boolean;
  }> {
    return attendees.map((attendee) => {
      if (!attendee.email) {
        return {
          email: attendee.name || 'unknown',
          name: attendee.name,
          responseStatus: (attendee.responseStatus as any) || 'needsAction',
          isOptional: attendee.isOptional,
          isInternal: false, // Default to external if no email
        };
      }

      const domain = attendee.email.split('@')[1]?.toLowerCase();
      const isInternal =
        domain &&
        (domain.includes('gmail.com') ||
          domain.includes('outlook.com') ||
          domain.includes('hotmail.com') ||
          domain.includes('yahoo.com') ||
          // Add tenant-specific domain check if needed
          false);

      return {
        email: attendee.email,
        name: attendee.name,
        responseStatus: (attendee.responseStatus as any) || 'needsAction',
        isOptional: attendee.isOptional,
        isInternal: isInternal || false,
      };
    });
  }
}

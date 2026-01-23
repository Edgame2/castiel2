/**
 * Calendar Intelligence Service
 * Analyzes calendar patterns for sales intelligence
 * 
 * Features:
 * - Meeting frequency and cadence analysis
 * - Attendee seniority tracking
 * - Cancellation pattern analysis
 * - Time-to-next-meeting trends
 * - Optimal meeting timing learning
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { CommunicationAnalysisService } from './communication-analysis.service.js';

export interface CalendarEvent {
  eventId: string;
  tenantId: string;
  opportunityId?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  attendees: Array<{
    email: string;
    name?: string;
    role?: string;
    seniority?: 'executive' | 'manager' | 'individual_contributor' | 'unknown';
    isInternal: boolean;
  }>;
  organizer: {
    email: string;
    name?: string;
  };
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  location?: string;
  meetingType?: 'in_person' | 'video' | 'phone' | 'hybrid';
  metadata?: Record<string, any>;
}

export interface CalendarPattern {
  patternId: string;
  tenantId: string;
  opportunityId?: string;
  patternType: 'frequency' | 'cadence' | 'cancellation' | 'timing' | 'attendee_seniority';
  pattern: {
    avgDaysBetweenMeetings?: number;
    meetingFrequency?: 'high' | 'medium' | 'low';
    cancellationRate?: number;
    optimalMeetingDays?: string[]; // ['Monday', 'Tuesday', etc.]
    optimalMeetingTimes?: string[]; // ['09:00', '14:00', etc.]
    avgAttendeeSeniority?: number; // 0-1: 0 = IC, 1 = executive
    seniorityTrend?: 'increasing' | 'decreasing' | 'stable';
  };
  confidence: number; // 0-1
  detectedAt: Date;
  lastUpdated: Date;
}

export interface CalendarIntelligence {
  intelligenceId: string;
  tenantId: string;
  opportunityId?: string;
  summary: {
    totalMeetings: number;
    completedMeetings: number;
    cancelledMeetings: number;
    avgMeetingDuration: number; // minutes
    totalMeetingTime: number; // minutes
    uniqueAttendees: number;
    highestSeniority: 'executive' | 'manager' | 'individual_contributor' | 'unknown';
  };
  patterns: CalendarPattern[];
  insights: {
    engagement: {
      level: 'high' | 'medium' | 'low';
      score: number; // 0-1
      factors: string[];
    };
    momentum: {
      trend: 'increasing' | 'decreasing' | 'stable';
      score: number; // 0-1
      indicators: string[];
    };
    risk: {
      level: 'high' | 'medium' | 'low';
      indicators: string[];
    };
  };
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calendar Intelligence Service
 */
export class CalendarIntelligenceService {
  private client: CosmosClient;
  private database: Database;
  private eventsContainer: Container;
  private patternsContainer: Container;
  private intelligenceContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private communicationAnalysis?: CommunicationAnalysisService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    communicationAnalysis?: CommunicationAnalysisService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.communicationAnalysis = communicationAnalysis;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.eventsContainer = this.database.container(config.cosmosDb.containers.calendarIntelligence);
    this.patternsContainer = this.database.container(config.cosmosDb.containers.calendarIntelligence);
    this.intelligenceContainer = this.database.container(config.cosmosDb.containers.calendarIntelligence);
  }

  /**
   * Record calendar event
   */
  async recordEvent(event: Omit<CalendarEvent, 'eventId'>): Promise<CalendarEvent> {
    const eventId = uuidv4();
    const calendarEvent: CalendarEvent = {
      ...event,
      eventId,
    };

    await this.eventsContainer.items.create(calendarEvent);

    // Invalidate cached intelligence
    if (this.redis && event.opportunityId) {
      const key = `calendar_intel:${event.tenantId}:${event.opportunityId}`;
      await this.redis.del(key);
    }

    this.monitoring?.trackEvent('calendar_intelligence.event_recorded', {
      tenantId: event.tenantId,
      eventId,
      opportunityId: event.opportunityId,
      status: event.status,
    });

    return calendarEvent;
  }

  /**
   * Analyze calendar patterns for an opportunity
   */
  async analyzeOpportunityCalendar(
    tenantId: string,
    opportunityId: string
  ): Promise<CalendarIntelligence> {
    // Check cache
    if (this.redis) {
      const cacheKey = `calendar_intel:${tenantId}:${opportunityId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get all events for opportunity
    const events = await this.getOpportunityEvents(tenantId, opportunityId);

    // Calculate summary
    const summary = this.calculateSummary(events);

    // Detect patterns
    const patterns = await this.detectPatterns(tenantId, opportunityId, events);

    // Generate insights
    const insights = this.generateInsights(events, patterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(insights, patterns);

    const intelligence: CalendarIntelligence = {
      intelligenceId: uuidv4(),
      tenantId,
      opportunityId,
      summary,
      patterns,
      insights,
      recommendations,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save intelligence
    await this.intelligenceContainer.items.create(intelligence);

    // Cache for 1 hour
    if (this.redis) {
      const cacheKey = `calendar_intel:${tenantId}:${opportunityId}`;
      await this.redis.setex(cacheKey, 60 * 60, JSON.stringify(intelligence));
    }

    this.monitoring?.trackEvent('calendar_intelligence.analyzed', {
      tenantId,
      opportunityId,
      meetingCount: summary.totalMeetings,
    });

    return intelligence;
  }

  /**
   * Analyze meeting frequency pattern
   */
  async analyzeMeetingFrequency(
    tenantId: string,
    opportunityId: string,
    events: CalendarEvent[]
  ): Promise<CalendarPattern> {
    const completedEvents = events.filter(e => e.status === 'completed');
    if (completedEvents.length < 2) {
      return this.createEmptyPattern(tenantId, opportunityId, 'frequency');
    }

    // Calculate days between meetings
    const daysBetween: number[] = [];
    for (let i = 1; i < completedEvents.length; i++) {
      const days = (completedEvents[i].startTime.getTime() - completedEvents[i - 1].startTime.getTime()) / (1000 * 60 * 60 * 24);
      daysBetween.push(days);
    }

    const avgDaysBetween = daysBetween.reduce((sum, d) => sum + d, 0) / daysBetween.length;
    
    let frequency: 'high' | 'medium' | 'low' = 'medium';
    if (avgDaysBetween < 7) {
      frequency = 'high';
    } else if (avgDaysBetween > 21) {
      frequency = 'low';
    }

    const pattern: CalendarPattern = {
      patternId: uuidv4(),
      tenantId,
      opportunityId,
      patternType: 'frequency',
      pattern: {
        avgDaysBetweenMeetings: avgDaysBetween,
        meetingFrequency: frequency,
      },
      confidence: Math.min(0.9, completedEvents.length / 10),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.patternsContainer.items.create(pattern);
    return pattern;
  }

  /**
   * Analyze cancellation patterns
   */
  async analyzeCancellationPattern(
    tenantId: string,
    opportunityId: string,
    events: CalendarEvent[]
  ): Promise<CalendarPattern> {
    const totalEvents = events.length;
    const cancelledEvents = events.filter(e => e.status === 'cancelled');
    const cancellationRate = totalEvents > 0 ? cancelledEvents.length / totalEvents : 0;

    const pattern: CalendarPattern = {
      patternId: uuidv4(),
      tenantId,
      opportunityId,
      patternType: 'cancellation',
      pattern: {
        cancellationRate,
      },
      confidence: totalEvents > 5 ? 0.8 : 0.5,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.patternsContainer.items.create(pattern);
    return pattern;
  }

  /**
   * Analyze optimal meeting timing
   */
  async analyzeOptimalTiming(
    tenantId: string,
    opportunityId: string,
    events: CalendarEvent[]
  ): Promise<CalendarPattern> {
    const completedEvents = events.filter(e => e.status === 'completed');
    if (completedEvents.length < 3) {
      return this.createEmptyPattern(tenantId, opportunityId, 'timing');
    }

    // Analyze day of week
    const dayCounts: Record<string, number> = {};
    completedEvents.forEach(event => {
      const day = event.startTime.toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const optimalDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    // Analyze time of day
    const timeCounts: Record<string, number> = {};
    completedEvents.forEach(event => {
      const hour = event.startTime.getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      timeCounts[timeSlot] = (timeCounts[timeSlot] || 0) + 1;
    });

    const optimalTimes = Object.entries(timeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time]) => time);

    const pattern: CalendarPattern = {
      patternId: uuidv4(),
      tenantId,
      opportunityId,
      patternType: 'timing',
      pattern: {
        optimalMeetingDays: optimalDays,
        optimalMeetingTimes: optimalTimes,
      },
      confidence: Math.min(0.9, completedEvents.length / 10),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.patternsContainer.items.create(pattern);
    return pattern;
  }

  /**
   * Analyze attendee seniority trends
   */
  async analyzeAttendeeSeniority(
    tenantId: string,
    opportunityId: string,
    events: CalendarEvent[]
  ): Promise<CalendarPattern> {
    const completedEvents = events.filter(e => e.status === 'completed');
    if (completedEvents.length < 2) {
      return this.createEmptyPattern(tenantId, opportunityId, 'attendee_seniority');
    }

    // Calculate seniority scores over time
    const seniorityScores: number[] = [];
    completedEvents.forEach(event => {
      const externalAttendees = event.attendees.filter(a => !a.isInternal);
      if (externalAttendees.length > 0) {
        const avgSeniority = externalAttendees.reduce((sum, a) => {
          const score = a.seniority === 'executive' ? 1.0 : 
                       a.seniority === 'manager' ? 0.6 : 
                       a.seniority === 'individual_contributor' ? 0.3 : 0.5;
          return sum + score;
        }, 0) / externalAttendees.length;
        seniorityScores.push(avgSeniority);
      }
    });

    const avgSeniority = seniorityScores.length > 0
      ? seniorityScores.reduce((sum, s) => sum + s, 0) / seniorityScores.length
      : 0.5;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (seniorityScores.length >= 3) {
      const firstHalf = seniorityScores.slice(0, Math.floor(seniorityScores.length / 2));
      const secondHalf = seniorityScores.slice(Math.floor(seniorityScores.length / 2));
      const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 0.1) {
        trend = 'increasing';
      } else if (secondAvg < firstAvg - 0.1) {
        trend = 'decreasing';
      }
    }

    const pattern: CalendarPattern = {
      patternId: uuidv4(),
      tenantId,
      opportunityId,
      patternType: 'attendee_seniority',
      pattern: {
        avgAttendeeSeniority: avgSeniority,
        seniorityTrend: trend,
      },
      confidence: Math.min(0.9, completedEvents.length / 10),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.patternsContainer.items.create(pattern);
    return pattern;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get all events for an opportunity
   */
  private async getOpportunityEvents(
    tenantId: string,
    opportunityId: string
  ): Promise<CalendarEvent[]> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.startTime ASC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@opportunityId', value: opportunityId },
      ],
    };

    const { resources } = await this.eventsContainer.items.query(querySpec).fetchAll();
    return resources as CalendarEvent[];
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(events: CalendarEvent[]): CalendarIntelligence['summary'] {
    const totalMeetings = events.length;
    const completedMeetings = events.filter(e => e.status === 'completed').length;
    const cancelledMeetings = events.filter(e => e.status === 'cancelled').length;
    
    const completedEvents = events.filter(e => e.status === 'completed');
    const avgDuration = completedEvents.length > 0
      ? completedEvents.reduce((sum, e) => sum + e.duration, 0) / completedEvents.length
      : 0;
    
    const totalTime = completedEvents.reduce((sum, e) => sum + e.duration, 0);
    
    const allAttendees = new Set<string>();
    events.forEach(e => {
      e.attendees.forEach(a => allAttendees.add(a.email));
    });

    let highestSeniority: 'executive' | 'manager' | 'individual_contributor' | 'unknown' = 'unknown';
    events.forEach(e => {
      e.attendees.forEach(a => {
        if (a.seniority === 'executive') {
          highestSeniority = 'executive';
        } else if (a.seniority === 'manager' && highestSeniority !== 'executive') {
          highestSeniority = 'manager';
        } else if (a.seniority === 'individual_contributor' && highestSeniority === 'unknown') {
          highestSeniority = 'individual_contributor';
        }
      });
    });

    return {
      totalMeetings,
      completedMeetings,
      cancelledMeetings,
      avgMeetingDuration: avgDuration,
      totalMeetingTime: totalTime,
      uniqueAttendees: allAttendees.size,
      highestSeniority,
    };
  }

  /**
   * Detect all patterns
   */
  private async detectPatterns(
    tenantId: string,
    opportunityId: string,
    events: CalendarEvent[]
  ): Promise<CalendarPattern[]> {
    const patterns: CalendarPattern[] = [];

    // Frequency pattern
    patterns.push(await this.analyzeMeetingFrequency(tenantId, opportunityId, events));

    // Cancellation pattern
    patterns.push(await this.analyzeCancellationPattern(tenantId, opportunityId, events));

    // Timing pattern
    patterns.push(await this.analyzeOptimalTiming(tenantId, opportunityId, events));

    // Seniority pattern
    patterns.push(await this.analyzeAttendeeSeniority(tenantId, opportunityId, events));

    return patterns;
  }

  /**
   * Generate insights
   */
  private generateInsights(
    events: CalendarEvent[],
    patterns: CalendarPattern[]
  ): CalendarIntelligence['insights'] {
    const frequencyPattern = patterns.find(p => p.patternType === 'frequency');
    const cancellationPattern = patterns.find(p => p.patternType === 'cancellation');
    const seniorityPattern = patterns.find(p => p.patternType === 'attendee_seniority');

    // Engagement
    const engagementFactors: string[] = [];
    let engagementScore = 0.5;

    if (frequencyPattern?.pattern.meetingFrequency === 'high') {
      engagementScore += 0.2;
      engagementFactors.push('High meeting frequency');
    } else if (frequencyPattern?.pattern.meetingFrequency === 'low') {
      engagementScore -= 0.2;
      engagementFactors.push('Low meeting frequency');
    }

    const cancellationRate = cancellationPattern?.pattern.cancellationRate || 0;
    if (cancellationRate < 0.1) {
      engagementScore += 0.1;
      engagementFactors.push('Low cancellation rate');
    } else if (cancellationRate > 0.3) {
      engagementScore -= 0.2;
      engagementFactors.push('High cancellation rate');
    }

    engagementScore = Math.max(0, Math.min(1, engagementScore));

    // Momentum
    const momentumIndicators: string[] = [];
    let momentumScore = 0.5;
    let momentumTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (seniorityPattern?.pattern.seniorityTrend === 'increasing') {
      momentumScore += 0.2;
      momentumTrend = 'increasing';
      momentumIndicators.push('Increasing attendee seniority');
    } else if (seniorityPattern?.pattern.seniorityTrend === 'decreasing') {
      momentumScore -= 0.2;
      momentumTrend = 'decreasing';
      momentumIndicators.push('Decreasing attendee seniority');
    }

    // Risk
    const riskIndicators: string[] = [];
    let riskLevel: 'high' | 'medium' | 'low' = 'low';

    if (cancellationRate > 0.3) {
      riskLevel = 'high';
      riskIndicators.push('High cancellation rate');
    } else if (cancellationRate > 0.15) {
      riskLevel = 'medium';
      riskIndicators.push('Moderate cancellation rate');
    }

    if (frequencyPattern?.pattern.meetingFrequency === 'low') {
      if (riskLevel === 'low') riskLevel = 'medium';
      riskIndicators.push('Low meeting frequency');
    }

    return {
      engagement: {
        level: engagementScore > 0.7 ? 'high' : engagementScore > 0.4 ? 'medium' : 'low',
        score: engagementScore,
        factors: engagementFactors,
      },
      momentum: {
        trend: momentumTrend,
        score: momentumScore,
        indicators: momentumIndicators,
      },
      risk: {
        level: riskLevel,
        indicators: riskIndicators,
      },
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    insights: CalendarIntelligence['insights'],
    patterns: CalendarPattern[]
  ): string[] {
    const recommendations: string[] = [];

    if (insights.engagement.level === 'low') {
      recommendations.push('Increase meeting frequency to improve engagement');
    }

    if (insights.risk.level === 'high') {
      recommendations.push('Address high cancellation rate - consider understanding reasons');
    }

    const timingPattern = patterns.find(p => p.patternType === 'timing');
    if (timingPattern?.pattern.optimalMeetingDays) {
      recommendations.push(`Schedule meetings on ${timingPattern.pattern.optimalMeetingDays.join(', ')} for better attendance`);
    }

    if (insights.momentum.trend === 'decreasing') {
      recommendations.push('Re-engage with higher-level stakeholders to maintain momentum');
    }

    return recommendations;
  }

  /**
   * Create empty pattern
   */
  private createEmptyPattern(
    tenantId: string,
    opportunityId: string | undefined,
    patternType: CalendarPattern['patternType']
  ): CalendarPattern {
    return {
      patternId: uuidv4(),
      tenantId,
      opportunityId,
      patternType,
      pattern: {},
      confidence: 0.3,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }
}

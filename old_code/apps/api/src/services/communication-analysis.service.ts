/**
 * Communication Analysis Service
 * Analyzes email, meeting transcripts, and communication patterns for sales intelligence
 * 
 * Features:
 * - Email sentiment and tone analysis
 * - Meeting transcript analysis
 * - Response time pattern analysis
 * - Engagement depth analysis
 * - Language pattern detection
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { MultiModalIntelligenceService } from './multimodal-intelligence.service.js';
import { VectorSearchService } from './vector-search.service.js';

export type CommunicationType = 'email' | 'meeting' | 'chat' | 'call';

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface CommunicationAnalysis {
  analysisId: string;
  tenantId: string; // Partition key
  opportunityId?: string;
  communicationType: CommunicationType;
  content: {
    text?: string;
    transcript?: string;
    participants?: string[];
    timestamp: Date;
    metadata?: Record<string, any>;
  };
  sentiment: {
    overall: Sentiment;
    confidence: number; // 0-1
    breakdown?: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  tone: {
    professional: number; // 0-1
    friendly: number;
    urgent: number;
    formal: number;
    casual: number;
  };
  engagement: {
    depth: number; // 0-1: How engaged the communication is
    responseTime?: number; // ms: Time to respond
    responseRate?: number; // 0-1: Percentage of messages responded to
    questionCount?: number;
    actionItemCount?: number;
  };
  language: {
    patterns: string[]; // Detected language patterns
    keywords: string[];
    topics: string[];
    intent?: string;
  };
  insights: {
    summary: string;
    keyFindings: string[];
    recommendations?: string[];
    riskIndicators?: string[];
  };
  createdAt: Date;
}

export interface CommunicationPattern {
  tenantId: string;
  opportunityId?: string;
  participantId?: string;
  patternType: 'response_time' | 'engagement' | 'sentiment_trend' | 'topic_frequency';
  pattern: any;
  confidence: number;
  detectedAt: Date;
}

/**
 * Communication Analysis Service
 */
export class CommunicationAnalysisService {
  private client: CosmosClient;
  private database: Database;
  private analysisContainer: Container;
  private patternsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private multimodalIntelligence?: MultiModalIntelligenceService;
  private vectorSearch?: VectorSearchService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    multimodalIntelligence?: MultiModalIntelligenceService,
    vectorSearch?: VectorSearchService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.multimodalIntelligence = multimodalIntelligence;
    this.vectorSearch = vectorSearch;

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
    this.analysisContainer = this.database.container(config.cosmosDb.containers.communicationAnalysis);
    this.patternsContainer = this.database.container(config.cosmosDb.containers.communicationAnalysis); // Same container for now
  }

  /**
   * Analyze email communication
   */
  async analyzeEmail(
    tenantId: string,
    email: {
      subject: string;
      body: string;
      from: string;
      to: string[];
      timestamp: Date;
      metadata?: Record<string, any>;
    },
    opportunityId?: string
  ): Promise<CommunicationAnalysis> {
    const analysisId = uuidv4();
    const text = `${email.subject}\n\n${email.body}`;

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(text);

    // Analyze tone
    const tone = await this.analyzeTone(text);

    // Analyze engagement
    const engagement = this.analyzeEngagement(text, email);

    // Analyze language patterns
    const language = await this.analyzeLanguage(text);

    // Generate insights
    const insights = await this.generateInsights(sentiment, tone, engagement, language);

    const analysis: CommunicationAnalysis = {
      analysisId,
      tenantId,
      opportunityId,
      communicationType: 'email',
      content: {
        text,
        timestamp: email.timestamp,
        metadata: email.metadata,
      },
      sentiment,
      tone,
      engagement,
      language,
      insights,
      createdAt: new Date(),
    };

    // Save analysis
    await this.analysisContainer.items.create(analysis);

    // Cache in Redis
    if (this.redis) {
      const key = `comm_analysis:${tenantId}:${analysisId}`;
      await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(analysis)); // 24 hours
    }

    this.monitoring?.trackEvent('communication_analysis.email_analyzed', {
      tenantId,
      analysisId,
      opportunityId,
      sentiment: sentiment.overall,
    });

    return analysis;
  }

  /**
   * Analyze meeting transcript
   */
  async analyzeMeetingTranscript(
    tenantId: string,
    transcript: {
      text: string;
      participants: string[];
      timestamp: Date;
      duration?: number; // minutes
      metadata?: Record<string, any>;
    },
    opportunityId?: string
  ): Promise<CommunicationAnalysis> {
    const analysisId = uuidv4();

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(transcript.text);

    // Analyze tone
    const tone = await this.analyzeTone(transcript.text);

    // Analyze engagement
    const engagement = this.analyzeMeetingEngagement(transcript);

    // Analyze language patterns
    const language = await this.analyzeLanguage(transcript.text);

    // Generate insights
    const insights = await this.generateInsights(sentiment, tone, engagement, language);

    const analysis: CommunicationAnalysis = {
      analysisId,
      tenantId,
      opportunityId,
      communicationType: 'meeting',
      content: {
        transcript: transcript.text,
        participants: transcript.participants,
        timestamp: transcript.timestamp,
        metadata: transcript.metadata,
      },
      sentiment,
      tone,
      engagement,
      language,
      insights,
      createdAt: new Date(),
    };

    // Save analysis
    await this.analysisContainer.items.create(analysis);

    this.monitoring?.trackEvent('communication_analysis.meeting_analyzed', {
      tenantId,
      analysisId,
      opportunityId,
      participantCount: transcript.participants.length,
    });

    return analysis;
  }

  /**
   * Analyze response time patterns
   */
  async analyzeResponseTimePattern(
    tenantId: string,
    opportunityId: string,
    communications: Array<{
      from: string;
      to: string;
      timestamp: Date;
      type: CommunicationType;
    }>
  ): Promise<CommunicationPattern> {
    // Calculate response times
    const responseTimes: number[] = [];
    for (let i = 1; i < communications.length; i++) {
      const prev = communications[i - 1];
      const curr = communications[i];
      
      // If current is a response to previous
      if (curr.from === prev.to && curr.to === prev.from) {
        const responseTime = curr.timestamp.getTime() - prev.timestamp.getTime();
        responseTimes.push(responseTime);
      }
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

    const pattern: CommunicationPattern = {
      tenantId,
      opportunityId,
      patternType: 'response_time',
      pattern: {
        avgResponseTime,
        responseTimes,
        communicationCount: communications.length,
      },
      confidence: responseTimes.length > 5 ? 0.8 : 0.5,
      detectedAt: new Date(),
    };

    await this.patternsContainer.items.create(pattern);

    return pattern;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Analyze sentiment
   */
  private async analyzeSentiment(text: string): Promise<{
    overall: Sentiment;
    confidence: number;
    breakdown?: { positive: number; neutral: number; negative: number };
  }> {
    // Placeholder - would use AI service for actual sentiment analysis
    // For now, simple keyword-based approach
    const positiveWords = ['great', 'excellent', 'wonderful', 'happy', 'pleased', 'excited'];
    const negativeWords = ['disappointed', 'concerned', 'worried', 'unhappy', 'frustrated', 'problem'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    let overall: Sentiment = 'neutral';
    if (positiveCount > negativeCount && positiveCount > 0) {
      overall = 'positive';
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      overall = 'negative';
    } else if (positiveCount > 0 && negativeCount > 0) {
      overall = 'mixed';
    }

    const total = positiveCount + negativeCount;
    const confidence = total > 0 ? Math.min(0.9, total / 10) : 0.5;

    return {
      overall,
      confidence,
      breakdown: {
        positive: positiveCount / Math.max(total, 1),
        neutral: total === 0 ? 1 : 0.5,
        negative: negativeCount / Math.max(total, 1),
      },
    };
  }

  /**
   * Analyze tone
   */
  private async analyzeTone(text: string): Promise<{
    professional: number;
    friendly: number;
    urgent: number;
    formal: number;
    casual: number;
  }> {
    // Placeholder - would use AI service
    const professionalWords = ['regarding', 'please', 'appreciate', 'sincerely'];
    const friendlyWords = ['thanks', 'hi', 'hello', 'great to hear'];
    const urgentWords = ['asap', 'urgent', 'immediately', 'critical'];
    const formalWords = ['respectfully', 'cordially', 'yours truly'];
    const casualWords = ['hey', 'yeah', 'cool', 'awesome'];

    const lowerText = text.toLowerCase();
    
    return {
      professional: this.calculateToneScore(lowerText, professionalWords),
      friendly: this.calculateToneScore(lowerText, friendlyWords),
      urgent: this.calculateToneScore(lowerText, urgentWords),
      formal: this.calculateToneScore(lowerText, formalWords),
      casual: this.calculateToneScore(lowerText, casualWords),
    };
  }

  /**
   * Calculate tone score
   */
  private calculateToneScore(text: string, keywords: string[]): number {
    const matches = keywords.filter(k => text.includes(k)).length;
    return Math.min(1.0, matches / keywords.length);
  }

  /**
   * Analyze engagement
   */
  private analyzeEngagement(
    text: string,
    email: { subject: string; body: string; from: string; to: string[] }
  ): {
    depth: number;
    questionCount?: number;
    actionItemCount?: number;
  } {
    const questionCount = (text.match(/\?/g) || []).length;
    const actionWords = ['please', 'need', 'should', 'must', 'required', 'action'];
    const actionItemCount = actionWords.filter(w => text.toLowerCase().includes(w)).length;
    
    // Calculate engagement depth
    const depth = Math.min(1.0, (questionCount * 0.1 + actionItemCount * 0.15 + text.length / 1000) / 3);

    return {
      depth,
      questionCount,
      actionItemCount,
    };
  }

  /**
   * Analyze meeting engagement
   */
  private analyzeMeetingEngagement(transcript: {
    text: string;
    participants: string[];
    duration?: number;
  }): {
    depth: number;
    questionCount?: number;
    actionItemCount?: number;
  } {
    const questionCount = (transcript.text.match(/\?/g) || []).length;
    const actionWords = ['action', 'follow up', 'next steps', 'todo', 'task'];
    const actionItemCount = actionWords.filter(w => transcript.text.toLowerCase().includes(w)).length;
    
    // Calculate engagement depth based on participation
    const participationScore = transcript.participants.length > 2 ? 0.8 : 0.5;
    const durationScore = transcript.duration ? Math.min(1.0, transcript.duration / 60) : 0.5;
    const depth = (participationScore + durationScore + Math.min(1.0, questionCount / 10)) / 3;

    return {
      depth,
      questionCount,
      actionItemCount,
    };
  }

  /**
   * Analyze language patterns
   */
  private async analyzeLanguage(text: string): Promise<{
    patterns: string[];
    keywords: string[];
    topics: string[];
    intent?: string;
  }> {
    // Extract keywords (simple approach - would use NLP in production)
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Detect patterns
    const patterns: string[] = [];
    if (text.includes('?')) patterns.push('question_asking');
    if (text.includes('!')) patterns.push('emphasis');
    if (text.match(/\d+/)) patterns.push('numbers_mentioned');
    if (text.match(/\$[\d,]+/)) patterns.push('money_mentioned');

    // Extract topics (simplified)
    const topics = keywords.slice(0, 5);

    return {
      patterns,
      keywords,
      topics,
      intent: this.detectIntent(text),
    };
  }

  /**
   * Detect intent
   */
  private detectIntent(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('schedule') || lowerText.includes('meeting')) return 'scheduling';
    if (lowerText.includes('question') || lowerText.includes('?')) return 'inquiry';
    if (lowerText.includes('proposal') || lowerText.includes('quote')) return 'proposal';
    if (lowerText.includes('follow up') || lowerText.includes('next steps')) return 'follow_up';
    return 'general';
  }

  /**
   * Generate insights
   */
  private async generateInsights(
    sentiment: { overall: Sentiment; confidence: number },
    tone: { professional: number; friendly: number; urgent: number; formal: number; casual: number },
    engagement: { depth: number; questionCount?: number; actionItemCount?: number },
    language: { patterns: string[]; keywords: string[]; topics: string[]; intent?: string }
  ): Promise<{
    summary: string;
    keyFindings: string[];
    recommendations?: string[];
    riskIndicators?: string[];
  }> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const riskIndicators: string[] = [];

    // Sentiment findings
    if (sentiment.overall === 'negative') {
      findings.push('Negative sentiment detected in communication');
      riskIndicators.push('Negative sentiment may indicate dissatisfaction');
      recommendations.push('Consider addressing concerns proactively');
    } else if (sentiment.overall === 'positive') {
      findings.push('Positive sentiment detected');
    }

    // Engagement findings
    if (engagement.depth > 0.7) {
      findings.push('High engagement level detected');
    } else if (engagement.depth < 0.3) {
      findings.push('Low engagement level detected');
      riskIndicators.push('Low engagement may indicate waning interest');
      recommendations.push('Consider re-engaging with more personalized communication');
    }

    // Tone findings
    if (tone.urgent > 0.5) {
      findings.push('Urgent tone detected');
    }
    if (tone.friendly > 0.7) {
      findings.push('Friendly, relationship-building tone');
    }

    // Language findings
    if (language.patterns.includes('question_asking')) {
      findings.push('Multiple questions indicate active interest');
    }

    const summary = findings.length > 0
      ? findings.slice(0, 3).join('. ')
      : 'Standard communication patterns detected';

    return {
      summary,
      keyFindings: findings,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      riskIndicators: riskIndicators.length > 0 ? riskIndicators : undefined,
    };
  }
}

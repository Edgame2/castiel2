/**
 * Signal Intelligence Service
 * Signal analysis and intelligence
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface Signal {
  id: string;
  tenantId: string;
  signalType: 'communication' | 'calendar' | 'social' | 'product_usage' | 'competitive';
  source: string;
  data: any;
  analyzed: boolean;
  analysis?: any;
  createdAt: Date | string;
}

export class SignalIntelligenceService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private _analyticsServiceClient: ServiceClient;
  private _integrationManagerClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._integrationManagerClient = new ServiceClient({
      baseURL: this.config.services.integration_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Analyze signal
   */
  async analyzeSignal(tenantId: string, signal: Omit<Signal, 'id' | 'tenantId' | 'createdAt'>): Promise<Signal> {
    try {
      const signalRecord: Signal = {
        id: uuidv4(),
        tenantId,
        ...signal,
        createdAt: new Date(),
      };

      // Implement signal analysis based on signal type
      let analysisResult: any = {
        analyzed: true,
        analysisTimestamp: new Date(),
        confidence: 0.7,
      };

      try {
        switch (signalRecord.signalType) {
          case 'communication':
            // Analyze communication patterns
            const commData = signalRecord.data || {};
            analysisResult.patterns = {
              frequency: commData.frequency || 'normal',
              sentiment: commData.sentiment || 'neutral',
              urgency: commData.urgency || 'low',
            };
            analysisResult.confidence = 0.8;
            break;

          case 'calendar':
            // Analyze calendar patterns
            const calendarData = signalRecord.data || {};
            analysisResult.patterns = {
              meetingCount: calendarData.meetingCount || 0,
              busyPeriods: calendarData.busyPeriods || [],
              availability: calendarData.availability || 'available',
            };
            analysisResult.confidence = 0.75;
            break;

          case 'social':
            // Analyze social media signals
            const socialData = signalRecord.data || {};
            analysisResult.patterns = {
              engagement: socialData.engagement || 0,
              mentions: socialData.mentions || [],
              sentiment: socialData.sentiment || 'neutral',
            };
            analysisResult.confidence = 0.7;
            break;

          case 'product_usage':
            // Analyze product usage signals
            const usageData = signalRecord.data || {};
            analysisResult.patterns = {
              usageLevel: usageData.usageLevel || 'normal',
              features: usageData.features || [],
              trends: usageData.trends || [],
            };
            analysisResult.confidence = 0.85;
            break;

          case 'competitive':
            // Analyze competitive intelligence
            const competitiveData = signalRecord.data || {};
            analysisResult.patterns = {
              competitors: competitiveData.competitors || [],
              marketPosition: competitiveData.marketPosition || 'unknown',
              threats: competitiveData.threats || [],
            };
            analysisResult.confidence = 0.8;
            break;
        }

        // Use AI service for enhanced analysis if available
        try {
          const aiAnalysis = await this.aiServiceClient.post<any>(
            '/api/v1/analyze/signal',
            {
              signalType: signalRecord.signalType,
              data: signalRecord.data,
            },
            {
              headers: {
                'X-Tenant-ID': tenantId,
              },
            }
          ).catch(() => null);

          if (aiAnalysis?.analysis) {
            analysisResult = {
              ...analysisResult,
              ...aiAnalysis.analysis,
              confidence: Math.max(analysisResult.confidence, aiAnalysis.confidence || 0.7),
            };
          }
        } catch (error: any) {
          log.warn('AI signal analysis failed, using basic analysis', {
            error: error.message,
            tenantId,
            service: 'signal-intelligence',
          });
        }

        // Update signal record with analysis
        signalRecord.analyzed = true;
        signalRecord.analysis = analysisResult;
      } catch (error: any) {
        log.warn('Signal analysis failed', {
          error: error.message,
          tenantId,
          signalType: signalRecord.signalType,
          service: 'signal-intelligence',
        });
        signalRecord.analyzed = false;
      }

      const container = getContainer('signal_communications') as any;
      await container.items.create(signalRecord, { partitionKey: tenantId });

      return signalRecord;
    } catch (error: any) {
      log.error('Failed to analyze signal', error, {
        tenantId,
        service: 'signal-intelligence',
      });
      throw error;
    }
  }
}

/**
 * Twilio Voice Provider
 */

import { IVoiceProvider, SendVoiceOptions, SendVoiceResult, HealthCheckResult } from './IVoiceProvider';

export interface TwilioVoiceConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  twimlUrl?: string; // URL to TwiML for custom voice messages
}

export class TwilioVoiceProvider implements IVoiceProvider {
  private config: TwilioVoiceConfig;
  private client: any;

  constructor(config: TwilioVoiceConfig) {
    this.config = config;
  }

  /**
   * Initialize Twilio client
   */
  private async initializeClient(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      const twilio = await import('twilio');
      this.client = twilio.default(this.config.accountSid, this.config.authToken);
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('twilio package is not installed. Run: npm install twilio');
      }
      throw error;
    }
  }

  async send(options: SendVoiceOptions): Promise<SendVoiceResult> {
    try {
      await this.initializeClient();

      // Generate TwiML for text-to-speech
      const twiml = this.generateTwiML(options.message, options.language, options.voice);

      // If twimlUrl is provided, use it; otherwise create a TwiML response
      const call = await this.client.calls.create({
        to: options.to,
        from: options.from || this.config.fromNumber,
        twiml: twiml,
      });

      return {
        success: true,
        callId: call.sid,
        providerResponse: call,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to make voice call via Twilio',
        providerResponse: error,
      };
    }
  }

  /**
   * Generate TwiML for text-to-speech
   */
  private generateTwiML(message: string, language?: string, voice?: 'male' | 'female'): string {
    const voiceAttr = voice === 'male' ? 'man' : 'woman';
    const languageAttr = language || 'en';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceAttr}" language="${languageAttr}">${this.escapeXml(message)}</Say>
</Response>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.initializeClient();

      if (!this.config.accountSid || !this.config.authToken) {
        return {
          healthy: false,
          message: 'Twilio credentials not configured',
        };
      }

      const latency = Date.now() - startTime;
      return {
        healthy: true,
        message: 'Twilio Voice provider is healthy',
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Twilio Voice health check failed',
      };
    }
  }
}


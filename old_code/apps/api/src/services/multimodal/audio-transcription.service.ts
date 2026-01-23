// @ts-nocheck
/**
 * Audio Transcription Service
 * Transcribes audio files using Azure OpenAI Whisper API
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { TranscriptionRequest, TranscriptionResponse } from '../types/multimodal-asset.types.js';

export interface AudioTranscriptionConfig {
  endpoint: string;
  apiKey: string;
  deploymentName?: string; // Default: whisper-1
  apiVersion?: string; // Default: 2024-02-15-preview
  timeout?: number; // Default: 300000ms (5 minutes for long audio)
}

/**
 * Audio Transcription Service using Azure OpenAI Whisper API
 */
export class AudioTranscriptionService {
  private config: Required<AudioTranscriptionConfig>;

  constructor(
    config: AudioTranscriptionConfig,
    private monitoring: IMonitoringProvider
  ) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      deploymentName: config.deploymentName || 'whisper-1',
      apiVersion: config.apiVersion || '2024-02-15-preview',
      timeout: config.timeout || 300000, // 5 minutes for long audio files
    };
  }

  /**
   * Transcribe an audio file
   */
  async transcribeAudio(
    audioUrl: string,
    request?: TranscriptionRequest
  ): Promise<TranscriptionResponse> {
    const startTime = Date.now();

    try {
      this.monitoring.trackEvent('audio_transcription_started', {
        language: request?.language || 'auto',
        speakerDiarization: request?.speakerDiarization || false,
        timestamp: request?.timestamp || false,
      });

      // Download audio file from URL
      const audioBuffer = await this.downloadAudioFile(audioUrl);

      // Call Azure OpenAI Whisper API
      const transcription = await this.callWhisperAPI(audioBuffer, request);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('audio_transcription_duration_ms', duration);
      this.monitoring.trackEvent('audio_transcription_completed', {
        transcriptionLength: transcription.transcription.length,
        segmentCount: transcription.segments?.length || 0,
        language: transcription.language,
        durationMs: duration,
      });

      return transcription;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'audio_transcription.transcribe',
        audioUrl,
      });
      throw error;
    }
  }

  /**
   * Download audio file from URL
   */
  private async downloadAudioFile(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000), // 1 minute timeout for download
      });

      if (!response.ok) {
        throw new Error(`Failed to download audio file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      throw new Error(`Failed to download audio file: ${error.message}`);
    }
  }

  /**
   * Call Azure OpenAI Whisper API
   */
  private async callWhisperAPI(
    audioBuffer: Buffer,
    request?: TranscriptionRequest
  ): Promise<TranscriptionResponse> {
    // Normalize endpoint: remove trailing /openai/ if present
    let baseEndpoint = this.config.endpoint.trim();
    if (baseEndpoint.endsWith('/openai/')) {
      baseEndpoint = baseEndpoint.slice(0, -8);
    } else if (baseEndpoint.endsWith('/openai')) {
      baseEndpoint = baseEndpoint.slice(0, -7);
    }

    const url = `${baseEndpoint}/openai/deployments/${this.config.deploymentName}/audio/transcriptions?api-version=${this.config.apiVersion}`;

    // Create form data using form-data package (Node.js compatible)
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    
    // Append audio file
    form.append('file', audioBuffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg',
    });

    // Append model name (required by Azure OpenAI)
    form.append('model', this.config.deploymentName);

    // Append language if specified
    if (request?.language) {
      form.append('language', request.language);
    }

    // Note: Azure OpenAI Whisper API doesn't support speaker diarization or timestamps directly
    // These would need to be handled by a different service (e.g., Azure Speech Service)
    // For now, we'll use the basic transcription and parse the response

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        ...form.getHeaders(), // form-data package provides getHeaders() method
      },
      body: form, // form-data is compatible with fetch body
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse Whisper API response
    // The response format is: { text: "...", language?: "en", ... }
    const transcription: TranscriptionResponse = {
      transcription: data.text || '',
      language: data.language || 'unknown',
      confidence: 0.9, // Whisper doesn't provide confidence scores, use default
    };

    // If we have segments (from verbose_json response format), parse them
    if (data.segments && Array.isArray(data.segments)) {
      transcription.segments = data.segments.map((seg: any) => ({
        start: seg.start || 0,
        end: seg.end || 0,
        text: seg.text || '',
        // Speaker diarization not available in Whisper API
      }));
    } else if (request?.timestamp) {
      // If timestamps requested but not provided, create a single segment
      transcription.segments = [{
        start: 0,
        end: 0, // Duration not available without additional processing
        text: transcription.transcription,
      }];
    }

    return transcription;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/m4a',
      'audio/ogg',
      'audio/flac',
    ];
  }

  /**
   * Get maximum file size (in bytes)
   */
  getMaxFileSize(): number {
    // Azure OpenAI Whisper API limit: 25 MB
    return 25 * 1024 * 1024;
  }
}


/**
 * Transcription Service
 * Handles audio transcription using Azure Speech Services
 * @module integration-processors/services
 */

import axios from 'axios';

export interface TranscriptSegment {
  speaker: string;
  startTime: number; // seconds from start
  endTime: number;
  text: string;
  sentiment?: number;
}

export interface TranscriptResult {
  fullTranscript: string;
  segments: TranscriptSegment[];
  duration?: number; // seconds
  speakerCount?: number;
}

export interface TranscriptionServiceConfig {
  endpoint?: string;
  key?: string;
  region?: string;
}

/**
 * Transcription Service
 * Handles audio transcription via Azure Speech Services or existing transcripts
 */
export class TranscriptionService {
  private config: TranscriptionServiceConfig;

  constructor(config: TranscriptionServiceConfig = {}) {
    this.config = {
      endpoint: config.endpoint || process.env.AZURE_SPEECH_ENDPOINT,
      key: config.key || process.env.AZURE_SPEECH_KEY,
      region: config.region || process.env.AZURE_SPEECH_REGION || 'eastus',
    };
  }

  /**
   * Download and parse existing transcript (JSON or VTT format)
   */
  async downloadTranscript(transcriptUrl: string): Promise<TranscriptResult> {
    try {
      const response = await axios.get(transcriptUrl, {
        responseType: 'text',
        timeout: 30000,
      });

      const contentType = response.headers['content-type'] || '';
      const content = response.data;

      // Try to parse as JSON first
      if (contentType.includes('json') || content.trim().startsWith('{')) {
        return this.parseJsonTranscript(content);
      }

      // Try to parse as VTT (WebVTT format)
      if (contentType.includes('vtt') || content.includes('WEBVTT')) {
        return this.parseVttTranscript(content);
      }

      // Fallback: treat as plain text
      return {
        fullTranscript: content,
        segments: [
          {
            speaker: 'Speaker',
            startTime: 0,
            endTime: 0,
            text: content,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to download transcript: ${error.message}`);
    }
  }

  /**
   * Transcribe audio recording using Azure Speech Services
   * Note: This is a simplified implementation. Full implementation would use Azure Speech SDK
   */
  async transcribeAudio(audioUrl: string, options?: { enableSpeakerDiarization?: boolean }): Promise<TranscriptResult> {
    if (!this.config.endpoint || !this.config.key) {
      throw new Error('Azure Speech Services not configured (endpoint and key required)');
    }

    // For now, return a placeholder that indicates transcription is needed
    // Full implementation would:
    // 1. Download audio file
    // 2. Use Azure Speech SDK to transcribe
    // 3. Parse results with speaker diarization if enabled
    // 4. Return structured transcript

    throw new Error(
      'Audio transcription via Azure Speech Services is not yet fully implemented. Please provide transcriptUrl in the meeting event.'
    );
  }

  /**
   * Parse JSON transcript format
   */
  private parseJsonTranscript(jsonContent: string): TranscriptResult {
    try {
      const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

      // Handle various JSON transcript formats
      let segments: TranscriptSegment[] = [];
      let fullTranscript = '';

      if (Array.isArray(data)) {
        // Array of segments
        segments = data.map((seg: any) => ({
          speaker: seg.speaker || seg.speakerId || 'Speaker',
          startTime: seg.startTime || seg.start || seg.timestamp || 0,
          endTime: seg.endTime || seg.end || seg.timestamp || 0,
          text: seg.text || seg.content || '',
          sentiment: seg.sentiment,
        }));
        fullTranscript = segments.map((s) => s.text).join(' ');
      } else if (data.segments || data.transcript) {
        // Object with segments or transcript property
        segments = (data.segments || []).map((seg: any) => ({
          speaker: seg.speaker || seg.speakerId || 'Speaker',
          startTime: seg.startTime || seg.start || seg.timestamp || 0,
          endTime: seg.endTime || seg.end || seg.timestamp || 0,
          text: seg.text || seg.content || '',
          sentiment: seg.sentiment,
        }));
        fullTranscript = data.fullTranscript || data.transcript || segments.map((s) => s.text).join(' ');
      } else {
        // Plain text in JSON
        fullTranscript = typeof data === 'string' ? data : JSON.stringify(data);
        segments = [
          {
            speaker: 'Speaker',
            startTime: 0,
            endTime: 0,
            text: fullTranscript,
          },
        ];
      }

      // Extract unique speakers
      const speakerCount = new Set(segments.map((s) => s.speaker)).size;

      return {
        fullTranscript,
        segments,
        speakerCount,
      };
    } catch (error: any) {
      throw new Error(`Failed to parse JSON transcript: ${error.message}`);
    }
  }

  /**
   * Parse VTT (WebVTT) transcript format
   */
  private parseVttTranscript(vttContent: string): TranscriptResult {
    const lines = vttContent.split('\n');
    const segments: TranscriptSegment[] = [];
    let currentSpeaker = 'Speaker';
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE:')) {
        continue;
      }

      // Parse timestamp line (e.g., "00:00:10.000 --> 00:00:15.000")
      const timestampMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timestampMatch) {
        // Save previous segment if exists
        if (currentText) {
          segments.push({
            speaker: currentSpeaker,
            startTime: currentStart,
            endTime: currentEnd,
            text: currentText.trim(),
          });
        }

        // Parse timestamps to seconds
        currentStart =
          parseInt(timestampMatch[1]) * 3600 +
          parseInt(timestampMatch[2]) * 60 +
          parseInt(timestampMatch[3]) +
          parseInt(timestampMatch[4]) / 1000;
        currentEnd =
          parseInt(timestampMatch[5]) * 3600 +
          parseInt(timestampMatch[6]) * 60 +
          parseInt(timestampMatch[7]) +
          parseInt(timestampMatch[8]) / 1000;

        currentText = '';
        continue;
      }

      // Parse speaker name (e.g., "<v Speaker Name>")
      const speakerMatch = line.match(/<v\s+([^>]+)>/);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim();
        continue;
      }

      // Accumulate text
      if (line) {
        currentText += (currentText ? ' ' : '') + line;
      }
    }

    // Add last segment
    if (currentText) {
      segments.push({
        speaker: currentSpeaker,
        startTime: currentStart,
        endTime: currentEnd,
        text: currentText.trim(),
      });
    }

    const fullTranscript = segments.map((s) => s.text).join(' ');
    const speakerCount = new Set(segments.map((s) => s.speaker)).size;

    return {
      fullTranscript,
      segments,
      speakerCount,
    };
  }
}

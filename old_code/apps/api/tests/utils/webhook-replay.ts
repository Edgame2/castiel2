/**
 * Webhook Replay System
 * 
 * Records and replays webhook responses for testing integration
 * webhooks without requiring live API connections.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface WebhookRecording {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBody: any;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: any;
  timestamp: string;
  duration: number;
}

export interface WebhookCassette {
  name: string;
  description?: string;
  recordings: WebhookRecording[];
  metadata: {
    createdAt: string;
    recordedBy: string;
    version: string;
  };
}

/**
 * Webhook Recorder - Captures HTTP interactions
 */
export class WebhookRecorder {
  private recordings: WebhookRecording[] = [];
  private isRecording = false;
  private cassetteName: string;
  private recordingsDir: string;

  constructor(cassetteName: string, recordingsDir: string = './tests/fixtures/webhooks') {
    this.cassetteName = cassetteName;
    this.recordingsDir = recordingsDir;
    this.ensureDirectoryExists();
  }

  /**
   * Start recording webhook interactions
   */
  startRecording(): void {
    this.isRecording = true;
    this.recordings = [];
  }

  /**
   * Stop recording and save to cassette
   */
  stopRecording(): WebhookCassette {
    this.isRecording = false;
    const cassette = this.createCassette();
    this.saveCassette(cassette);
    return cassette;
  }

  /**
   * Record a webhook interaction
   */
  recordInteraction(
    url: string,
    method: string,
    headers: Record<string, string>,
    requestBody: any,
    responseStatus: number,
    responseHeaders: Record<string, string>,
    responseBody: any,
    duration: number
  ): void {
    if (!this.isRecording) return;

    const recording: WebhookRecording = {
      id: this.generateRecordingId(url, method, requestBody),
      name: `${method} ${url}`,
      url,
      method,
      headers: this.sanitizeHeaders(headers),
      requestBody,
      responseStatus,
      responseHeaders: this.sanitizeHeaders(responseHeaders),
      responseBody,
      timestamp: new Date().toISOString(),
      duration,
    };

    this.recordings.push(recording);
  }

  /**
   * Create cassette from recordings
   */
  private createCassette(): WebhookCassette {
    return {
      name: this.cassetteName,
      recordings: this.recordings,
      metadata: {
        createdAt: new Date().toISOString(),
        recordedBy: 'integration-test-harness',
        version: '1.0.0',
      },
    };
  }

  /**
   * Save cassette to file
   */
  private saveCassette(cassette: WebhookCassette): void {
    const filePath = join(this.recordingsDir, `${this.cassetteName}.json`);
    writeFileSync(filePath, JSON.stringify(cassette, null, 2));
  }

  /**
   * Generate unique ID for recording
   */
  private generateRecordingId(url: string, method: string, body: any): string {
    const hash = createHash('md5');
    hash.update(`${method}:${url}:${JSON.stringify(body)}`);
    return hash.digest('hex').slice(0, 8);
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'api-key', 'x-api-key', 'cookie', 'set-cookie'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Ensure recordings directory exists
   */
  private ensureDirectoryExists(): void {
    if (!existsSync(this.recordingsDir)) {
      mkdirSync(this.recordingsDir, { recursive: true });
    }
  }
}

/**
 * Webhook Player - Replays recorded interactions
 */
export class WebhookPlayer {
  private cassette: WebhookCassette | null = null;
  private recordingsDir: string;
  private strictMode = true;
  private playedRecordings: Set<string> = new Set();

  constructor(recordingsDir: string = './tests/fixtures/webhooks') {
    this.recordingsDir = recordingsDir;
  }

  /**
   * Load cassette from file
   */
  loadCassette(cassetteName: string): void {
    const filePath = join(this.recordingsDir, `${cassetteName}.json`);
    
    if (!existsSync(filePath)) {
      throw new Error(`Cassette not found: ${cassetteName}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    this.cassette = JSON.parse(content);
    this.playedRecordings.clear();
  }

  /**
   * Find matching recording for request
   */
  findRecording(
    url: string,
    method: string,
    body?: any
  ): WebhookRecording | null {
    if (!this.cassette) {
      throw new Error('No cassette loaded');
    }

    for (const recording of this.cassette.recordings) {
      if (this.matchesRequest(recording, url, method, body)) {
        return recording;
      }
    }

    return null;
  }

  /**
   * Play recording for request
   */
  playRecording(url: string, method: string, body?: any): WebhookRecording {
    const recording = this.findRecording(url, method, body);

    if (!recording) {
      if (this.strictMode) {
        throw new Error(`No recording found for ${method} ${url}`);
      }
      return this.createDefaultRecording(url, method);
    }

    this.playedRecordings.add(recording.id);
    return recording;
  }

  /**
   * Simulate network delay from recording
   */
  async simulateDelay(recording: WebhookRecording): Promise<void> {
    if (recording.duration > 0) {
      await new Promise(resolve => setTimeout(resolve, recording.duration));
    }
  }

  /**
   * Get all unplayed recordings
   */
  getUnplayedRecordings(): WebhookRecording[] {
    if (!this.cassette) return [];
    
    return this.cassette.recordings.filter(
      recording => !this.playedRecordings.has(recording.id)
    );
  }

  /**
   * Set strict mode (fail on missing recordings)
   */
  setStrictMode(strict: boolean): void {
    this.strictMode = strict;
  }

  /**
   * Reset played recordings tracker
   */
  reset(): void {
    this.playedRecordings.clear();
  }

  /**
   * Check if request matches recording
   */
  private matchesRequest(
    recording: WebhookRecording,
    url: string,
    method: string,
    body?: any
  ): boolean {
    if (recording.method !== method) return false;
    if (!this.urlMatches(recording.url, url)) return false;
    
    // If body is provided, check for match
    if (body !== undefined && recording.requestBody !== undefined) {
      return JSON.stringify(recording.requestBody) === JSON.stringify(body);
    }

    return true;
  }

  /**
   * Check if URLs match (ignoring query params in some cases)
   */
  private urlMatches(recordedUrl: string, requestUrl: string): boolean {
    // Exact match
    if (recordedUrl === requestUrl) return true;

    // Match base URL without query params
    const recordedBase = recordedUrl.split('?')[0];
    const requestBase = requestUrl.split('?')[0];
    return recordedBase === requestBase;
  }

  /**
   * Create default recording for missing requests
   */
  private createDefaultRecording(url: string, method: string): WebhookRecording {
    return {
      id: 'default',
      name: `${method} ${url}`,
      url,
      method,
      headers: {},
      requestBody: null,
      responseStatus: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: { success: true },
      timestamp: new Date().toISOString(),
      duration: 100,
    };
  }
}

/**
 * Mock HTTP Client for Webhook Testing
 */
export class MockWebhookClient {
  private recorder: WebhookRecorder | null = null;
  private player: WebhookPlayer | null = null;
  private mode: 'record' | 'replay' | 'passthrough' = 'passthrough';

  /**
   * Set recording mode
   */
  useRecorder(recorder: WebhookRecorder): void {
    this.recorder = recorder;
    this.mode = 'record';
  }

  /**
   * Set replay mode
   */
  usePlayer(player: WebhookPlayer): void {
    this.player = player;
    this.mode = 'replay';
  }

  /**
   * Make HTTP request (record or replay)
   */
  async request(
    url: string,
    options: {
      method: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    const startTime = performance.now();

    if (this.mode === 'replay' && this.player) {
      return this.replayRequest(url, options);
    }

    // In record or passthrough mode, make actual request
    // For testing, we'll simulate a response
    const response = await this.simulateRequest(url, options);
    const duration = performance.now() - startTime;

    if (this.mode === 'record' && this.recorder) {
      this.recorder.recordInteraction(
        url,
        options.method,
        options.headers || {},
        options.body,
        response.status,
        response.headers,
        response.body,
        duration
      );
    }

    return response;
  }

  /**
   * Replay request from cassette
   */
  private async replayRequest(
    url: string,
    options: { method: string; body?: any }
  ): Promise<{ status: number; headers: Record<string, string>; body: any }> {
    if (!this.player) {
      throw new Error('Player not configured');
    }

    const recording = this.player.playRecording(url, options.method, options.body);
    await this.player.simulateDelay(recording);

    return {
      status: recording.responseStatus,
      headers: recording.responseHeaders,
      body: recording.responseBody,
    };
  }

  /**
   * Simulate HTTP request (for testing without real network)
   */
  private async simulateRequest(
    url: string,
    options: { method: string; body?: any }
  ): Promise<{ status: number; headers: Record<string, string>; body: any }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Default success response
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true, timestamp: new Date().toISOString() },
    };
  }
}

/**
 * Cassette Manager - Utility for managing cassettes
 */
export class CassetteManager {
  private recordingsDir: string;

  constructor(recordingsDir: string = './tests/fixtures/webhooks') {
    this.recordingsDir = recordingsDir;
  }

  /**
   * List all available cassettes
   */
  listCassettes(): string[] {
    if (!existsSync(this.recordingsDir)) {
      return [];
    }

    const fs = require('fs');
    return fs.readdirSync(this.recordingsDir)
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => file.replace('.json', ''));
  }

  /**
   * Delete cassette
   */
  deleteCassette(cassetteName: string): boolean {
    const filePath = join(this.recordingsDir, `${cassetteName}.json`);
    
    if (existsSync(filePath)) {
      const fs = require('fs');
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * Get cassette info
   */
  getCassetteInfo(cassetteName: string): {
    name: string;
    recordingCount: number;
    createdAt: string;
    size: number;
  } | null {
    const filePath = join(this.recordingsDir, `${cassetteName}.json`);
    
    if (!existsSync(filePath)) {
      return null;
    }

    const fs = require('fs');
    const content = readFileSync(filePath, 'utf-8');
    const cassette: WebhookCassette = JSON.parse(content);
    const stats = fs.statSync(filePath);

    return {
      name: cassette.name,
      recordingCount: cassette.recordings.length,
      createdAt: cassette.metadata.createdAt,
      size: stats.size,
    };
  }
}

/**
 * Export webhook replay utilities
 */
export const webhookReplay = {
  WebhookRecorder,
  WebhookPlayer,
  MockWebhookClient,
  CassetteManager,
};

export default webhookReplay;

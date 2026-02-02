/**
 * Transcription Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranscriptionService } from '../../../src/services/TranscriptionService';
import axios from 'axios';

vi.mock('axios');

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TranscriptionService({});
  });

  describe('constructor', () => {
    it('should use env vars when config empty', () => {
      const svc = new TranscriptionService({});
      expect(svc).toBeInstanceOf(TranscriptionService);
    });

    it('should use provided config', () => {
      const svc = new TranscriptionService({ region: 'westus', endpoint: 'https://speech.example.com', key: 'key' });
      expect(svc).toBeInstanceOf(TranscriptionService);
    });
  });

  describe('downloadTranscript', () => {
    it('should parse JSON transcript', async () => {
      const jsonContent = JSON.stringify({
        segments: [
          { speaker: 'Alice', startTime: 0, endTime: 10, text: 'Hello' },
          { speaker: 'Bob', startTime: 10, endTime: 20, text: 'Hi' },
        ],
        fullTranscript: 'Hello Hi',
      });
      vi.mocked(axios.get).mockResolvedValue({
        data: jsonContent,
        headers: { 'content-type': 'application/json' },
      });
      const result = await service.downloadTranscript('https://example.com/transcript.json');
      expect(result.fullTranscript).toBe('Hello Hi');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].speaker).toBe('Alice');
      expect(result.speakerCount).toBe(2);
    });

    it('should parse array-only JSON transcript', async () => {
      const jsonContent = JSON.stringify([
        { speaker: 'A', startTime: 0, endTime: 5, text: 'One' },
        { speaker: 'B', startTime: 5, endTime: 10, text: 'Two' },
      ]);
      vi.mocked(axios.get).mockResolvedValue({
        data: jsonContent,
        headers: { 'content-type': 'application/json' },
      });
      const result = await service.downloadTranscript('https://example.com/transcript.json');
      expect(result.fullTranscript).toBe('One Two');
      expect(result.segments).toHaveLength(2);
    });

    it('should parse VTT transcript', async () => {
      // Parser expects text on lines after timestamp/speaker; speaker tag on its own line
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
<v Alice>
Hello there

00:00:05.000 --> 00:00:10.000
<v Bob>
Hi back
`;
      vi.mocked(axios.get).mockResolvedValue({
        data: vtt,
        headers: { 'content-type': 'text/vtt' },
      });
      const result = await service.downloadTranscript('https://example.com/transcript.vtt');
      expect(result.fullTranscript).toContain('Hello there');
      expect(result.fullTranscript).toContain('Hi back');
      expect(result.segments.length).toBeGreaterThanOrEqual(1);
    });

    it('should treat plain text as single segment', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: 'Just plain text transcript',
        headers: { 'content-type': 'text/plain' },
      });
      const result = await service.downloadTranscript('https://example.com/transcript.txt');
      expect(result.fullTranscript).toBe('Just plain text transcript');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].speaker).toBe('Speaker');
    });

    it('should throw when download fails', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));
      await expect(service.downloadTranscript('https://example.com/bad')).rejects.toThrow(/Failed to download transcript/);
    });
  });

  describe('transcribeAudio', () => {
    it('should throw when Azure Speech not configured', async () => {
      await expect(service.transcribeAudio('https://example.com/audio.mp3')).rejects.toThrow(
        'Azure Speech Services not configured (endpoint and key required)'
      );
    });

    it('should throw when configured but not implemented', async () => {
      const svc = new TranscriptionService({ endpoint: 'https://speech.example.com', key: 'key' });
      await expect(svc.transcribeAudio('https://example.com/audio.mp3')).rejects.toThrow(
        /not yet fully implemented/
      );
    });
  });
});

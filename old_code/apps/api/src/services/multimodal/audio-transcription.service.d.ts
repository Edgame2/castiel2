/**
 * Audio Transcription Service
 * Transcribes audio files using Azure OpenAI Whisper API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { TranscriptionRequest, TranscriptionResponse } from '../types/multimodal-asset.types.js';
export interface AudioTranscriptionConfig {
    endpoint: string;
    apiKey: string;
    deploymentName?: string;
    apiVersion?: string;
    timeout?: number;
}
/**
 * Audio Transcription Service using Azure OpenAI Whisper API
 */
export declare class AudioTranscriptionService {
    private monitoring;
    private config;
    constructor(config: AudioTranscriptionConfig, monitoring: IMonitoringProvider);
    /**
     * Transcribe an audio file
     */
    transcribeAudio(audioUrl: string, request?: TranscriptionRequest): Promise<TranscriptionResponse>;
    /**
     * Download audio file from URL
     */
    private downloadAudioFile;
    /**
     * Call Azure OpenAI Whisper API
     */
    private callWhisperAPI;
    /**
     * Get supported audio formats
     */
    getSupportedFormats(): string[];
    /**
     * Get maximum file size (in bytes)
     */
    getMaxFileSize(): number;
}
//# sourceMappingURL=audio-transcription.service.d.ts.map
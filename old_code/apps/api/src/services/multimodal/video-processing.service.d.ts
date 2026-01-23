/**
 * Video Processing Service
 * Processes video files by extracting audio for transcription and analyzing key frames
 * Uses Azure OpenAI Whisper API for audio transcription and GPT-4 Vision for frame analysis
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { AudioTranscriptionService } from './audio-transcription.service.js';
import { ImageAnalysisService } from './image-analysis.service.js';
export interface VideoProcessingConfig {
    audioTranscriptionService: AudioTranscriptionService;
    imageAnalysisService?: ImageAnalysisService;
    maxFramesToAnalyze?: number;
    frameExtractionInterval?: number;
}
export interface VideoProcessingResult {
    transcription?: {
        text: string;
        language: string;
        segments?: Array<{
            start: number;
            end: number;
            text: string;
        }>;
        confidence?: number;
    };
    frames?: Array<{
        timestamp: number;
        description: string;
        objects?: Array<{
            label: string;
            confidence: number;
        }>;
    }>;
    summary: string;
    duration?: number;
    metadata?: {
        resolution?: string;
        codec?: string;
        bitrate?: number;
    };
}
/**
 * Video Processing Service
 *
 * Processes video files by:
 * 1. Extracting and transcribing audio track (using Whisper API)
 * 2. Optionally extracting and analyzing key frames (using Vision API)
 * 3. Generating a summary of the video content
 */
export declare class VideoProcessingService {
    private monitoring;
    private config;
    constructor(config: VideoProcessingConfig, monitoring: IMonitoringProvider);
    /**
     * Process a video file
     *
     * Note: Azure OpenAI Whisper API can process video files directly by extracting the audio track.
     * For frame analysis, we would need to extract frames first (requires FFmpeg or similar).
     * For now, we focus on audio transcription which provides the most value.
     */
    processVideo(videoUrl: string): Promise<VideoProcessingResult>;
    /**
     * Generate a summary from transcription
     */
    private generateSummary;
    /**
     * Extract frames from video (future implementation)
     *
     * This would require FFmpeg or similar tool to extract frames at intervals.
     * For now, this is a placeholder for future enhancement.
     */
    private extractFrames;
    /**
     * Analyze extracted frames using Vision API
     */
    private analyzeFrames;
}
//# sourceMappingURL=video-processing.service.d.ts.map
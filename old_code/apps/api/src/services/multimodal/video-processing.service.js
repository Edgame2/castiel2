/**
 * Video Processing Service
 * Processes video files by extracting audio for transcription and analyzing key frames
 * Uses Azure OpenAI Whisper API for audio transcription and GPT-4 Vision for frame analysis
 */
/**
 * Video Processing Service
 *
 * Processes video files by:
 * 1. Extracting and transcribing audio track (using Whisper API)
 * 2. Optionally extracting and analyzing key frames (using Vision API)
 * 3. Generating a summary of the video content
 */
export class VideoProcessingService {
    monitoring;
    config;
    constructor(config, monitoring) {
        this.monitoring = monitoring;
        this.config = {
            audioTranscriptionService: config.audioTranscriptionService,
            imageAnalysisService: config.imageAnalysisService,
            maxFramesToAnalyze: config.maxFramesToAnalyze || 5,
            frameExtractionInterval: config.frameExtractionInterval || 30,
        };
    }
    /**
     * Process a video file
     *
     * Note: Azure OpenAI Whisper API can process video files directly by extracting the audio track.
     * For frame analysis, we would need to extract frames first (requires FFmpeg or similar).
     * For now, we focus on audio transcription which provides the most value.
     */
    async processVideo(videoUrl) {
        const startTime = Date.now();
        try {
            this.monitoring.trackEvent('video_processing_started', {
                videoUrl,
            });
            // Step 1: Transcribe audio from video
            // Whisper API can process video files directly by extracting audio
            const transcription = await this.config.audioTranscriptionService.transcribeAudio(videoUrl, {
                language: undefined, // Auto-detect
                speakerDiarization: false,
                timestamp: true, // Request timestamps for video context
            });
            // Step 2: Generate summary from transcription
            const summary = this.generateSummary(transcription);
            // Step 3: Frame analysis (optional, requires frame extraction)
            // For now, we skip frame extraction as it requires FFmpeg or similar tools
            // This can be added later when infrastructure is available
            const frames = undefined;
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('video_processing_duration_ms', duration);
            this.monitoring.trackEvent('video_processing_completed', {
                hasTranscription: !!transcription.transcription,
                transcriptionLength: transcription.transcription?.length || 0,
                segmentCount: transcription.segments?.length || 0,
                language: transcription.language,
                durationMs: duration,
            });
            return {
                transcription: {
                    text: transcription.transcription,
                    language: transcription.language,
                    segments: transcription.segments,
                    confidence: transcription.confidence,
                },
                frames,
                summary,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'video_processing.process',
                videoUrl,
            });
            throw error;
        }
    }
    /**
     * Generate a summary from transcription
     */
    generateSummary(transcription) {
        const text = transcription.transcription;
        if (!text || text.length === 0) {
            return 'Video processed but no audio transcription available.';
        }
        // Simple summary: first 200 characters + indication of length
        if (text.length <= 200) {
            return text;
        }
        // Extract key points from segments if available
        if (transcription.segments && transcription.segments.length > 0) {
            const keySegments = transcription.segments
                .filter((_, index) => index % Math.ceil(transcription.segments.length / 3) === 0)
                .slice(0, 3)
                .map(s => s.text)
                .join(' ');
            if (keySegments.length > 0 && keySegments.length < 300) {
                return keySegments;
            }
        }
        // Fallback: first 200 characters
        return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    }
    /**
     * Extract frames from video (future implementation)
     *
     * This would require FFmpeg or similar tool to extract frames at intervals.
     * For now, this is a placeholder for future enhancement.
     */
    async extractFrames(videoUrl, intervalSeconds, maxFrames) {
        // TODO: Implement frame extraction using FFmpeg or Azure Video Indexer
        // This requires:
        // 1. Download video file
        // 2. Use FFmpeg to extract frames at intervals
        // 3. Upload frames to blob storage
        // 4. Return frame URLs with timestamps
        this.monitoring.trackEvent('video_frame_extraction_skipped', {
            reason: 'not_implemented',
            videoUrl,
        });
        return [];
    }
    /**
     * Analyze extracted frames using Vision API
     */
    async analyzeFrames(frames) {
        if (!this.config.imageAnalysisService || frames.length === 0) {
            return undefined;
        }
        const analyzedFrames = [];
        for (const frame of frames.slice(0, this.config.maxFramesToAnalyze)) {
            try {
                const analysis = await this.config.imageAnalysisService.analyzeImage({
                    imageUrl: frame.imageUrl,
                    includeDescription: true,
                    includeObjects: true,
                    includeOCR: false,
                    includeModeration: false,
                });
                analyzedFrames.push({
                    timestamp: frame.timestamp,
                    description: analysis.description || '',
                    objects: analysis.objects?.map(obj => ({
                        label: obj.label,
                        confidence: obj.confidence,
                    })),
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'video_processing.analyze_frame',
                    timestamp: frame.timestamp,
                });
                // Continue with other frames
            }
        }
        return analyzedFrames;
    }
}
//# sourceMappingURL=video-processing.service.js.map
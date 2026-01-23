/**
 * Image Analysis Service
 * Analyzes images using Azure OpenAI Vision API (GPT-4 Vision)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ImageAnalysisResponse } from '../types/multimodal-asset.types.js';
export interface ImageAnalysisConfig {
    endpoint: string;
    apiKey: string;
    deploymentName?: string;
    apiVersion?: string;
    timeout?: number;
}
export interface AnalyzeImageRequest {
    imageUrl: string;
    includeOCR?: boolean;
    includeObjects?: boolean;
    includeDescription?: boolean;
    includeModeration?: boolean;
}
/**
 * Image Analysis Service using Azure OpenAI Vision API
 */
export declare class ImageAnalysisService {
    private monitoring;
    private config;
    constructor(config: ImageAnalysisConfig, monitoring: IMonitoringProvider);
    /**
     * Analyze an image
     */
    analyzeImage(request: AnalyzeImageRequest): Promise<ImageAnalysisResponse>;
    /**
     * Build analysis prompt based on requested features
     */
    private buildAnalysisPrompt;
    /**
     * Call Azure OpenAI Vision API
     */
    private callVisionAPI;
    /**
     * Parse analysis response from GPT-4 Vision
     */
    private parseAnalysisResponse;
    /**
     * Extract tags from description
     */
    private extractTags;
    /**
     * Extract text from response (OCR)
     */
    private extractText;
    /**
     * Count faces mentioned in description
     */
    private countFaces;
    /**
     * Parse location string to bounding box (simplified)
     */
    private parseLocation;
}
//# sourceMappingURL=image-analysis.service.d.ts.map
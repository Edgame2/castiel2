/**
 * Image Analysis Service
 * Analyzes images using Azure OpenAI Vision API (GPT-4 Vision)
 */
/**
 * Image Analysis Service using Azure OpenAI Vision API
 */
export class ImageAnalysisService {
    monitoring;
    config;
    constructor(config, monitoring) {
        this.monitoring = monitoring;
        this.config = {
            endpoint: config.endpoint,
            apiKey: config.apiKey,
            deploymentName: config.deploymentName || 'gpt-4-vision',
            apiVersion: config.apiVersion || '2024-02-15-preview',
            timeout: config.timeout || 30000,
        };
    }
    /**
     * Analyze an image
     */
    async analyzeImage(request) {
        const startTime = Date.now();
        try {
            this.monitoring.trackEvent('image_analysis_started', {
                includeOCR: request.includeOCR,
                includeObjects: request.includeObjects,
                includeDescription: request.includeDescription,
                includeModeration: request.includeModeration,
            });
            // Build the analysis prompt
            const analysisPrompt = this.buildAnalysisPrompt(request);
            // Call Azure OpenAI Vision API
            const response = await this.callVisionAPI(request.imageUrl, analysisPrompt);
            // Parse the response
            const analysis = this.parseAnalysisResponse(response, request);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('image_analysis_duration_ms', duration);
            this.monitoring.trackEvent('image_analysis_completed', {
                hasDescription: !!analysis.description,
                hasOCR: !!analysis.text,
                objectCount: analysis.objects?.length || 0,
                durationMs: duration,
            });
            return analysis;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'image_analysis.analyze',
                imageUrl: request.imageUrl,
            });
            throw error;
        }
    }
    /**
     * Build analysis prompt based on requested features
     */
    buildAnalysisPrompt(request) {
        const parts = [];
        if (request.includeDescription !== false) {
            parts.push('Provide a detailed description of what you see in this image.');
        }
        if (request.includeObjects) {
            parts.push('Identify and list all objects, people, animals, and items visible in the image. For each object, provide its label and approximate location (e.g., "car in the center", "person on the left").');
        }
        if (request.includeOCR !== false) {
            parts.push('Extract all text visible in the image using OCR.');
        }
        if (request.includeModeration !== false) {
            parts.push('Assess if the image contains any inappropriate, adult, or NSFW content. Respond with "safe" or "nsfw".');
        }
        parts.push('Format your response as JSON with the following structure: { "description": "...", "objects": [{"label": "...", "confidence": 0.0-1.0, "location": "..."}], "text": "...", "tags": ["tag1", "tag2"], "colors": ["color1", "color2"], "nsfw": false }');
        return parts.join('\n\n');
    }
    /**
     * Call Azure OpenAI Vision API
     */
    async callVisionAPI(imageUrl, prompt) {
        const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;
        // Convert image URL to base64 if needed, or use URL directly
        // For Azure Blob Storage, we can use the URL directly if it's publicly accessible
        // Otherwise, we'd need to download and convert to base64
        const body = {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
            temperature: 0.3, // Lower temperature for more consistent analysis
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.config.apiKey,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.config.timeout),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Validate response structure before accessing nested properties
        if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
            this.monitoring.trackEvent('image_analysis.invalid_response_structure', {
                hasData: !!data,
                hasChoices: !!data?.choices,
                choicesLength: data?.choices?.length || 0,
            });
            return '';
        }
        return data.choices[0]?.message?.content || '';
    }
    /**
     * Parse analysis response from GPT-4 Vision
     */
    parseAnalysisResponse(response, request) {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(response);
            return {
                description: parsed.description || '',
                objects: parsed.objects?.map((obj) => ({
                    label: obj.label || obj.name || '',
                    confidence: obj.confidence || 0.8,
                    boundingBox: obj.boundingBox || obj.location ? this.parseLocation(obj.location || obj.boundingBox) : undefined,
                })) || [],
                text: parsed.text || '',
                tags: parsed.tags || this.extractTags(parsed.description || ''),
                colors: parsed.colors || [],
                faces: parsed.faces || this.countFaces(parsed.description || ''),
                nsfw: parsed.nsfw === true || parsed.nsfw === 'nsfw' || false,
            };
        }
        catch (error) {
            // If JSON parsing fails, try to extract information from text
            this.monitoring.trackEvent('image_analysis_json_parse_failed', {
                responseLength: response.length,
            });
            return {
                description: response,
                objects: [],
                text: this.extractText(response),
                tags: this.extractTags(response),
                colors: [],
                faces: this.countFaces(response),
                nsfw: response.toLowerCase().includes('nsfw') || response.toLowerCase().includes('inappropriate'),
            };
        }
    }
    /**
     * Extract tags from description
     */
    extractTags(description) {
        // Simple keyword extraction - could be enhanced with NLP
        const commonTags = [
            'person', 'people', 'car', 'building', 'nature', 'landscape', 'indoor', 'outdoor',
            'food', 'animal', 'text', 'document', 'screenshot', 'photo', 'illustration',
        ];
        const lowerDesc = description.toLowerCase();
        return commonTags.filter(tag => lowerDesc.includes(tag));
    }
    /**
     * Extract text from response (OCR)
     */
    extractText(response) {
        // Look for text patterns or quoted strings
        const textMatch = response.match(/"text"\s*:\s*"([^"]+)"/i) ||
            response.match(/text:\s*"([^"]+)"/i) ||
            response.match(/OCR[:\s]+"([^"]+)"/i);
        return textMatch ? textMatch[1] : '';
    }
    /**
     * Count faces mentioned in description
     */
    countFaces(description) {
        const facePatterns = [
            /(\d+)\s+face/i,
            /(\d+)\s+person/i,
            /(\d+)\s+people/i,
            /face/i,
            /person/i,
        ];
        for (const pattern of facePatterns) {
            const match = description.match(pattern);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
        }
        // If no number found, check if "face" or "person" is mentioned
        if (facePatterns.some(p => p.test(description))) {
            return 1; // At least one face/person
        }
        return 0;
    }
    /**
     * Parse location string to bounding box (simplified)
     */
    parseLocation(location) {
        // This is a simplified parser - in production, you'd want more sophisticated parsing
        // or use a vision API that provides actual bounding boxes
        return undefined; // GPT-4 Vision doesn't provide precise bounding boxes
    }
}
//# sourceMappingURL=image-analysis.service.js.map
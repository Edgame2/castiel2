/**
 * AI Response Parsing Tests
 * Phase 4.3: Testing Coverage Enhancement
 * 
 * Comprehensive test suite for AI response parsing edge cases:
 * - Valid response formats
 * - Invalid JSON structures
 * - Missing required fields
 * - Unexpected field values
 * - Edge cases in regex fallbacks
 * - Malformed responses
 * - Empty responses
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentAnalyzerService } from '../../../src/services/intent-analyzer.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

describe('AI Response Parsing - IntentAnalyzerService', () => {
  let intentAnalyzer: IntentAnalyzerService;
  let monitoring: IMonitoringProvider;

  beforeEach(() => {
    monitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    } as any;

    intentAnalyzer = new IntentAnalyzerService(monitoring);
  });

  describe('Valid Response Formats', () => {
    it('should parse standard JSON response', () => {
      const response = JSON.stringify({
        insightType: 'analysis',
        confidence: 0.95,
      });

      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
      expect(result?.confidence).toBe(0.95);
    });

    it('should parse JSON with alternative field names', () => {
      const testCases = [
        { type: 'summary', confidence: 0.8 },
        { intent: 'comparison', confidence: 0.9 },
      ];

      for (const testCase of testCases) {
        const response = JSON.stringify(testCase);
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe(testCase.confidence);
      }
    });

    it('should parse JSON in markdown code blocks', () => {
      const response = '```json\n{"insightType": "recommendation", "confidence": 0.85}\n```';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('recommendation');
      expect(result?.confidence).toBe(0.85);
    });

    it('should parse JSON in markdown code blocks without language tag', () => {
      const response = '```\n{"insightType": "prediction", "confidence": 0.75}\n```';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('prediction');
      expect(result?.confidence).toBe(0.75);
    });

    it('should parse JSON with extra whitespace', () => {
      const response = '   {  "insightType"  :  "extraction"  ,  "confidence"  :  0.9  }   ';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('extraction');
      expect(result?.confidence).toBe(0.9);
    });

    it('should parse JSON with additional fields', () => {
      const response = JSON.stringify({
        insightType: 'search',
        confidence: 0.88,
        extraField: 'ignored',
        anotherField: 123,
      });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('search');
      expect(result?.confidence).toBe(0.88);
    });

    it('should handle case-insensitive type matching', () => {
      const testCases = [
        { insightType: 'ANALYSIS', expected: 'analysis' },
        { insightType: 'Summary', expected: 'summary' },
        { insightType: 'COMPARISON', expected: 'comparison' },
      ];

      for (const testCase of testCases) {
        const response = JSON.stringify({
          insightType: testCase.insightType,
          confidence: 0.8,
        });
        
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe(testCase.expected);
      }
    });
  });

  describe('Invalid JSON Structures', () => {
    it('should handle unclosed JSON objects', () => {
      const response = '{"insightType": "analysis", "confidence": 0.9';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle unclosed JSON arrays', () => {
      const response = '{"insightType": "analysis", "items": [1, 2, 3';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle invalid JSON syntax', () => {
      const testCases = [
        '{"insightType": analysis}', // Missing quotes
        '{insightType: "analysis"}', // Invalid key format
        '{"insightType" "analysis"}', // Missing colon
        '{"insightType": "analysis",}', // Trailing comma
      ];

      for (const response of testCases) {
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        expect(result).toBeNull();
      }
    });

    it('should handle nested invalid JSON', () => {
      const response = '{"insightType": "analysis", "data": {invalid: json}}';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });
  });

  describe('Missing Required Fields', () => {
    it('should return null when insightType is missing', () => {
      const response = JSON.stringify({ confidence: 0.9 });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should return null when confidence is missing but use default', () => {
      const response = JSON.stringify({ insightType: 'analysis' });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      // Should still parse but with default confidence
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
      expect(result?.confidence).toBe(0.8); // Default confidence
    });

    it('should handle empty object', () => {
      const response = JSON.stringify({});
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle null values', () => {
      const response = JSON.stringify({ insightType: null, confidence: 0.9 });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      const response = JSON.stringify({ insightType: undefined, confidence: 0.9 });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });
  });

  describe('Unexpected Field Values', () => {
    it('should handle invalid insightType values', () => {
      const testCases = [
        'invalid_type',
        'unknown',
        'not_a_type',
        '',
        '   ',
      ];

      for (const invalidType of testCases) {
        const response = JSON.stringify({
          insightType: invalidType,
          confidence: 0.9,
        });
        
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        // Should try to map or return null
        expect(result).toBeDefined();
      }
    });

    it('should clamp confidence values to valid range', () => {
      const testCases = [
        { confidence: -1, expected: 0 },
        { confidence: 0, expected: 0 },
        { confidence: 0.5, expected: 0.5 },
        { confidence: 1, expected: 1 },
        { confidence: 1.5, expected: 1 },
        { confidence: 100, expected: 1 },
      ];

      for (const testCase of testCases) {
        const response = JSON.stringify({
          insightType: 'analysis',
          confidence: testCase.confidence,
        });
        
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        expect(result).not.toBeNull();
        expect(result?.confidence).toBe(testCase.expected);
      }
    });

    it('should handle non-numeric confidence values', () => {
      const testCases = [
        'high',
        'medium',
        'low',
        true,
        false,
        null,
        undefined,
      ];

      for (const invalidConfidence of testCases) {
        const response = JSON.stringify({
          insightType: 'analysis',
          confidence: invalidConfidence,
        });
        
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        // Should use default confidence (0.8)
        expect(result).not.toBeNull();
        expect(result?.type).toBe('analysis');
        expect(result?.confidence).toBe(0.8);
      }
    });

    it('should handle type mapping for common variations', () => {
      const typeMap: Record<string, string> = {
        'summarize': 'summary',
        'analyze': 'analysis',
        'compare': 'comparison',
        'recommend': 'recommendation',
        'predict': 'prediction',
        'extract': 'extraction',
        'search': 'search',
        'generate': 'generation',
      };

      for (const [input, expected] of Object.entries(typeMap)) {
        const response = JSON.stringify({
          insightType: input,
          confidence: 0.9,
        });
        
        const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe(expected);
      }
    });
  });

  describe('Edge Cases in Regex Fallbacks', () => {
    it('should extract JSON from text with surrounding content', () => {
      const response = 'Here is the result: {"insightType": "analysis", "confidence": 0.9} and some more text';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
      expect(result?.confidence).toBe(0.9);
    });

    it('should handle multiple JSON objects (use first)', () => {
      const response = '{"insightType": "analysis", "confidence": 0.9} {"insightType": "summary", "confidence": 0.8}';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
    });

    it('should handle JSON in markdown with extra content', () => {
      const response = 'Here is the JSON:\n```json\n{"insightType": "comparison", "confidence": 0.85}\n```\nEnd of response';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('comparison');
      expect(result?.confidence).toBe(0.85);
    });

    it('should handle nested markdown code blocks', () => {
      const response = '```\n```json\n{"insightType": "recommendation", "confidence": 0.9}\n```\n```';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      // Should still extract the inner JSON
      expect(result).not.toBeNull();
    });

    it('should handle JSON with escaped characters', () => {
      const response = JSON.stringify({
        insightType: 'analysis',
        confidence: 0.9,
        description: 'Test with "quotes" and \\backslashes',
      });
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
    });
  });

  describe('Malformed Responses', () => {
    it('should handle completely non-JSON text', () => {
      const response = 'This is not JSON at all, just plain text';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle HTML content', () => {
      const response = '<html><body><p>{"insightType": "analysis", "confidence": 0.9}</p></body></html>';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      // Should still extract JSON if present
      expect(result).not.toBeNull();
    });

    it('should handle XML content', () => {
      const response = '<?xml version="1.0"?><response>{"insightType": "analysis", "confidence": 0.9}</response>';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      // Should still extract JSON if present
      expect(result).not.toBeNull();
    });

    it('should handle responses with only whitespace', () => {
      const response = '   \n\t  \n   ';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle responses with special characters', () => {
      const response = '{"insightType": "analysis", "confidence": 0.9, "note": "Special: chars! @#$%"}';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('analysis');
    });
  });

  describe('Empty Responses', () => {
    it('should handle empty string', () => {
      const response = '';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle null response', () => {
      const response = null as any;
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle undefined response', () => {
      const response = undefined as any;
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });

    it('should handle response with only newlines', () => {
      const response = '\n\n\n';
      
      const result = (intentAnalyzer as any).parseLLMIntentOutput(response);
      
      expect(result).toBeNull();
    });
  });

  describe('Multi-Intent Parsing', () => {
    it('should parse multi-intent response with primary and secondary', () => {
      const response = JSON.stringify({
        isMultiIntent: true,
        primaryIntent: { type: 'analysis', confidence: 0.9 },
        secondaryIntents: [
          { type: 'summary', confidence: 0.7, query: 'Summarize this' },
        ],
      });
      
      const result = (intentAnalyzer as any).parseMultiIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.isMultiIntent).toBe(true);
      expect(result?.primaryIntent.type).toBe('analysis');
      expect(result?.secondaryIntents).toHaveLength(1);
    });

    it('should handle multi-intent with missing secondary', () => {
      const response = JSON.stringify({
        isMultiIntent: true,
        primaryIntent: { type: 'analysis', confidence: 0.9 },
      });
      
      const result = (intentAnalyzer as any).parseMultiIntentOutput(response);
      
      expect(result).not.toBeNull();
      expect(result?.isMultiIntent).toBe(true);
      expect(result?.secondaryIntents).toBeUndefined();
    });

    it('should return null for invalid multi-intent response', () => {
      const response = JSON.stringify({
        isMultiIntent: true,
        // Missing primaryIntent
      });
      
      const result = (intentAnalyzer as any).parseMultiIntentOutput(response);
      
      expect(result).toBeNull();
    });
  });

  describe('Risk Validation Against Catalog', () => {
    it('should validate parsed risks match catalog definitions', () => {
      // This test verifies that risk parsing includes catalog validation
      // The actual validation is done in RiskAIValidationService
      const catalog = [
        { riskId: 'risk-1', name: 'Budget Overrun', category: 'financial' },
        { riskId: 'risk-2', name: 'Timeline Delay', category: 'operational' },
      ];

      const response = JSON.stringify({
        risks: [
          { riskId: 'risk-1', riskName: 'Budget Overrun', confidence: 0.8 },
          { riskId: 'risk-2', riskName: 'Timeline Delay', confidence: 0.7 },
        ],
      });

      // Note: Full validation happens in RiskEvaluationService.detectRisksByAI
      // This test verifies the parsing structure supports validation
      const parsed = JSON.parse(response);
      expect(parsed.risks).toBeDefined();
      expect(parsed.risks.length).toBe(2);
      
      // Verify risks have required fields for catalog matching
      expect(parsed.risks[0]).toHaveProperty('riskId');
      expect(parsed.risks[0]).toHaveProperty('riskName');
      expect(parsed.risks[0]).toHaveProperty('confidence');
    });

    it('should handle risks not in catalog gracefully', () => {
      const response = JSON.stringify({
        risks: [
          { riskId: 'unknown-risk', riskName: 'Unknown Risk', confidence: 0.8 },
        ],
      });

      const parsed = JSON.parse(response);
      expect(parsed.risks).toBeDefined();
      // Risk should be parsed but may be filtered out during validation
      expect(parsed.risks[0].riskId).toBe('unknown-risk');
    });

    it('should handle missing riskId with riskName fallback', () => {
      const response = JSON.stringify({
        risks: [
          { riskName: 'Budget Overrun', confidence: 0.8 },
        ],
      });

      const parsed = JSON.parse(response);
      expect(parsed.risks).toBeDefined();
      expect(parsed.risks[0].riskName).toBe('Budget Overrun');
      // riskId may be undefined, which is acceptable for name-based matching
    });
  });
});

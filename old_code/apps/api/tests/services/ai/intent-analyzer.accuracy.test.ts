import { describe, it, expect } from 'vitest';
import { IntentAnalyzerService } from '../../../src/services/intent-analyzer.service.js'

// Minimal monitoring + repos; no external models so LLM path stays disabled
const monitoring: any = {
  trackEvent: () => {},
  trackException: () => {},
}

const shardRepository: any = {
  list: async () => ({ shards: [] }),
}

const shardTypeRepository: any = {}

describe('IntentAnalyzerService intent accuracy (pattern path)', () => {
  const svc = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository)

  const cases: Array<{ query: string; expected: string }> = [
    { query: 'Give me a brief summary of Q4 results', expected: 'summary' },
    { query: 'Summarize the latest release notes for me', expected: 'summary' },
    { query: 'Analyze the risks and performance of project Alpha', expected: 'analysis' },
    { query: 'Assess the health of our pipeline and key issues', expected: 'analysis' },
    { query: 'How does plan A compare versus plan B on cost?', expected: 'comparison' },
    { query: 'Compare the mobile app rollout to the web launch', expected: 'comparison' },
    { query: 'What should we do next? Recommend next steps.', expected: 'recommendation' },
    { query: 'Suggest action items to improve customer retention', expected: 'recommendation' },
    { query: 'Predict revenue for next quarter based on current trends', expected: 'prediction' },
    { query: 'What will happen to churn if prices increase?', expected: 'prediction' },
    { query: 'List the key contacts and emails for the deal', expected: 'extraction' },
    { query: 'Extract the metrics we track for onboarding', expected: 'extraction' },
    { query: 'Find anything about the contract renewal timeline', expected: 'search' },
    { query: 'Search for mentions of the Vega launch in notes', expected: 'search' },
    { query: 'Draft an email to the client about the project timeline', expected: 'generation' },
    { query: 'Create a detailed proposal for the new offer', expected: 'generation' },
  ]

  it('classifies the labeled set correctly (curated, non-ambiguous utterances)', async () => {
    for (const { query, expected } of cases) {
      const res = await svc.analyze(query, 'tenant-accuracy', {})
      expect(res.insightType, `query: ${query}`).toBe(expected)
      expect(res.confidence, `confidence for ${query}`).toBeGreaterThan(0)
    }
  })
})

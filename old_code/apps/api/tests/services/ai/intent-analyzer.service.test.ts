import { describe, it, expect } from 'vitest'
import { IntentAnalyzerService } from '../../../src/services/intent-analyzer.service.js'

// Minimal no-op monitoring provider
const monitoring: any = {
  trackEvent: () => {},
  trackException: () => {},
}

// Minimal repositories that won't be used for our test queries
const shardRepository: any = {
  list: async () => ({ shards: [] })
}
const shardTypeRepository: any = {}


describe('IntentAnalyzerService - pattern fallback classification', () => {
  it('classifies summary queries via patterns when LLM unavailable', async () => {
    const svc = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository)

    const res = await svc.analyze('Summarize recent activity and provide a brief overview', 'tenant1')
    expect(res.insightType).toBe('summary')
    expect(res.confidence).toBeGreaterThan(0)
  })

  it('classifies comparison queries via patterns when LLM unavailable', async () => {
    const svc = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository)

    const res = await svc.analyze('How does plan A compare to plan B?', 'tenant1')
    expect(res.insightType).toBe('comparison')
  })

  it('classifies recommendation queries via patterns when LLM unavailable', async () => {
    const svc = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository)

    const res = await svc.analyze('What should we do next? Recommend next steps.', 'tenant1')
    expect(res.insightType).toBe('recommendation')
  })
})

describe('IntentAnalyzerService - LLM parser', () => {
  const svc = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository)

  it('parses clean JSON payload', () => {
    const parsed = (svc as any).parseLLMIntentOutput('{"insightType":"analysis","confidence":0.82}')
    expect(parsed).toEqual({ type: 'analysis', confidence: 0.82 })
  })

  it('extracts JSON from noisy text', () => {
    const text = 'Here you go:\n```json\n{"insightType":"comparison","confidence":0.66}\n```\nThanks!'
    const parsed = (svc as any).parseLLMIntentOutput(text)
    expect(parsed).toEqual({ type: 'comparison', confidence: 0.66 })
  })

  it('returns null for invalid type or confidence', () => {
    const badType = (svc as any).parseLLMIntentOutput('{"insightType":"unknown","confidence":0.5}')
    const badConf = (svc as any).parseLLMIntentOutput('{"insightType":"search","confidence":"many"}')
    expect(badType).toBeNull()
    expect(badConf).toBeNull()
  })
})

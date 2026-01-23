import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path'
import fs from 'fs'
import { PromptResolverService } from '../../../src/services/ai-insights/prompt-resolver.service.js'
import { PromptRendererService } from '../../../src/services/ai-insights/prompt-renderer.service.js'
import { PromptScope, PromptStatus, Prompt, PromptResolutionRequest } from '../../../src/types/ai-insights/prompt.types.js'
import { PromptRepository } from '../../../src/services/ai-insights/prompt.repository.js'

class InMemoryPromptRepository implements Pick<PromptRepository, 'list' | 'findActiveBySlug'> {
  private prompts: Prompt[]

  constructor(prompts: Prompt[]) {
    this.prompts = prompts
  }

  async list(tenantId: string, filters: any = {}): Promise<Prompt[]> {
    return this.prompts.filter(p => {
      if (p.tenantId !== tenantId) return false
      if (filters.scope && p.scope !== filters.scope) return false
      if (filters.status && p.status !== filters.status) return false
      if (filters.insightType && p.insightType !== filters.insightType) return false
      if (filters.slug && p.slug !== filters.slug) return false
      if (filters.ownerId && p.ownerId !== filters.ownerId) return false
      return true
    })
  }

  async findActiveBySlug(tenantId: string, slug: string): Promise<Prompt | null> {
    const matches = this.prompts
      .filter(p => p.tenantId === tenantId && p.slug === slug && p.status === PromptStatus.Active)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
    return matches[0] || null
  }
}

function loadSystemPrompts(): Prompt[] {
  const dataPath = path.resolve(process.cwd(), 'data/prompts/system-prompts.json')
  const raw = fs.readFileSync(dataPath, 'utf-8')
  const parsed = JSON.parse(raw)
  // Handle both array format and object with 'prompts' property
  const defs: any[] = Array.isArray(parsed) ? parsed : (parsed.prompts || [])
  const now = new Date()
  return defs.map(def => ({
    ...def,
    id: `system-${def.slug}-v${def.version}`,
    tenantId: 'SYSTEM',
    partitionKey: 'SYSTEM',
    type: 'prompt',
    createdAt: now,
    updatedAt: now,
    createdBy: { userId: 'system', at: now },
    updatedBy: { userId: 'system', at: now },
  })) as Prompt[]
}

describe('PromptResolverService with seeded system prompts', () => {
  let resolver: PromptResolverService

  beforeAll(() => {
    const prompts = loadSystemPrompts()
    const repo = new InMemoryPromptRepository(prompts) as any
    const renderer = new PromptRendererService()
    resolver = new PromptResolverService(repo, renderer)
  })

  it('resolves and renders a system prompt when tenant override is missing', async () => {
    const req: PromptResolutionRequest = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      slug: 'insights-summary',
      variables: {
        userQuery: 'Summarize Q4 pipeline performance',
        context: '- Deal A closed\n- Deal B slipped',
      },
    }

    const result = await resolver.resolveAndRender(req)
    expect(result).not.toBeNull()
    expect(result?.prompt.slug).toBe('insights-summary')
    expect(result?.sourceScope).toBe(PromptScope.System)
    expect(result?.renderedUserPrompt).toContain('Summarize Q4 pipeline performance')
    expect(result?.renderedUserPrompt).toContain('Deal A closed')
  })

  it('prefers tenant prompt over system when available', async () => {
    // Add a tenant-specific prompt with higher precedence
    const now = new Date()
    const tenantPrompt: Prompt = {
      id: 'tenant-summary-1',
      tenantId: 'tenant-a',
      partitionKey: 'tenant-a',
      type: 'prompt',
      slug: 'insights-summary',
      name: 'Tenant Summary Override',
      scope: PromptScope.Tenant,
      insightType: 'summary' as any,
      template: {
        systemPrompt: 'Tenant persona',
        userPrompt: 'Tenant summary: {{userQuery}} | {{context}}',
        variables: ['userQuery', 'context'],
      },
      ragConfig: undefined,
      status: PromptStatus.Active,
      version: 2,
      createdAt: now,
      updatedAt: now,
      createdBy: { userId: 'tenant-admin', at: now },
      updatedBy: { userId: 'tenant-admin', at: now },
    }

    // Inject by recreating resolver with augmented repo
    const prompts = loadSystemPrompts().concat([tenantPrompt])
    const repo = new InMemoryPromptRepository(prompts) as any
    const renderer = new PromptRendererService()
    const localResolver = new PromptResolverService(repo, renderer)

    const req: PromptResolutionRequest = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      slug: 'insights-summary',
      variables: {
        userQuery: 'Give me a recap',
        context: 'Tenant docs',
      },
    }

    const result = await localResolver.resolveAndRender(req)
    expect(result?.sourceScope).toBe(PromptScope.Tenant)
    expect(result?.renderedUserPrompt).toContain('Tenant summary:')
    expect(result?.renderedUserPrompt).toContain('Give me a recap')
  })
})

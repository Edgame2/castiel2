import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(process.cwd(), 'data/prompts/system-prompts.json')
const raw = fs.readFileSync(dataPath, 'utf-8')
const prompts = JSON.parse(raw)

describe('system prompts dataset', () => {
  it('has 8 prompts with required fields', () => {
    expect(prompts.length).toBe(8)
    for (const p of prompts) {
      expect(p.slug).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.scope).toBe('system')
      expect(p.template?.systemPrompt || p.template?.userPrompt).toBeTruthy()
      expect(Array.isArray(p.template?.variables)).toBe(true)
      expect(p.status).toBe('active')
      expect(p.version).toBeGreaterThan(0)
    }
  })

  it('has unique slugs', () => {
    const slugs = prompts.map((p: any) => p.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })
})

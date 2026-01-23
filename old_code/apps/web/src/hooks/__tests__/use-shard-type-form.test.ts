import { describe, it, expect } from 'vitest'
import { shardTypeFormSchema, shardTypeFormErrors } from '@/hooks/use-shard-type-form'
import { ShardTypeCategory } from '@/types/api'

describe('shardTypeFormSchema', () => {
    const validFormData = {
        name: 'test-shard-type',
        displayName: 'Test Shard Type',
        description: 'A test shard type',
        category: ShardTypeCategory.DOCUMENT,
        schema: { type: 'object', properties: {} },
        uiSchema: {},
        icon: 'FileText',
        color: '#6366f1',
        tags: ['test', 'example'],
        parentShardTypeId: undefined,
        isGlobal: false,
    }

    describe('name field', () => {
        it('accepts valid lowercase names with hyphens', () => {
            const result = shardTypeFormSchema.safeParse(validFormData)
            expect(result.success).toBe(true)
        })

        it('rejects names with uppercase letters', () => {
            const data = { ...validFormData, name: 'TestName' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                const nameError = result.error.issues.find((e: any) => e.path[0] === 'name')
                expect(nameError?.message).toContain('lowercase')
            }
        })

        it('rejects names with spaces', () => {
            const data = { ...validFormData, name: 'test name' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
        })

        it('rejects names with special characters', () => {
            const data = { ...validFormData, name: 'test_type!' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
        })

        it('accepts names with numbers', () => {
            const data = { ...validFormData, name: 'test-type-123' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })
    })

    describe('displayName field', () => {
        it('accepts valid display names', () => {
            const data = { ...validFormData, displayName: 'My Test Shard Type' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('rejects empty display names', () => {
            const data = { ...validFormData, displayName: '' }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
        })
    })

    describe('category field', () => {
        it('accepts valid category enum values', () => {
            const categories = [
                ShardTypeCategory.DOCUMENT,
                ShardTypeCategory.DATA,
                ShardTypeCategory.MEDIA,
                ShardTypeCategory.CONFIGURATION,
                ShardTypeCategory.CUSTOM,
            ]

            categories.forEach((category) => {
                const data = { ...validFormData, category }
                const result = shardTypeFormSchema.safeParse(data)
                expect(result.success).toBe(true)
            })
        })

        it('rejects invalid category values', () => {
            const data = { ...validFormData, category: 'INVALID' as any }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
        })
    })

    describe('schema field', () => {
        it('accepts valid JSON schema objects', () => {
            const data = {
                ...validFormData,
                schema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        count: { type: 'number' },
                    },
                    required: ['title'],
                },
            }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('accepts empty schema object', () => {
            const data = { ...validFormData, schema: {} }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })
    })

    describe('color field', () => {
        it('accepts valid hex colors', () => {
            const validColors = ['#000000', '#ffffff', '#6366f1', '#ef4444']

            validColors.forEach((color) => {
                const data = { ...validFormData, color }
                const result = shardTypeFormSchema.safeParse(data)
                expect(result.success).toBe(true)
            })
        })

        it('rejects invalid hex colors', () => {
            const invalidColors = ['#fff', '#gggggg', 'red', 'rgb(255,0,0)']

            invalidColors.forEach((color) => {
                const data = { ...validFormData, color }
                const result = shardTypeFormSchema.safeParse(data)
                expect(result.success).toBe(false)
            })
        })

        it('accepts undefined color', () => {
            const data = { ...validFormData, color: undefined }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })
    })

    describe('tags field', () => {
        it('accepts array of strings', () => {
            const data = { ...validFormData, tags: ['tag1', 'tag2', 'tag3'] }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('accepts empty array', () => {
            const data = { ...validFormData, tags: [] }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('rejects undefined tags (required field)', () => {
            const data = { ...validFormData, tags: undefined as any }
            const result = shardTypeFormSchema.safeParse(data)
            expect(result.success).toBe(false)
        })
    })

    describe('optional fields', () => {
        it('accepts form with only required fields', () => {
            const minimalData = {
                name: 'minimal-type',
                displayName: 'Minimal Type',
                category: ShardTypeCategory.DOCUMENT,
                schema: {},
                isGlobal: false,
                tags: [],
            }
            const result = shardTypeFormSchema.safeParse(minimalData)
            expect(result.success).toBe(true)
        })
    })
})

describe('shardTypeFormErrors', () => {
    it('contains error message constants', () => {
        expect(shardTypeFormErrors.nameRequired).toBeDefined()
        expect(shardTypeFormErrors.nameInvalid).toBeDefined()
        expect(shardTypeFormErrors.displayNameRequired).toBeDefined()
        expect(shardTypeFormErrors.categoryRequired).toBeDefined()
        expect(shardTypeFormErrors.schemaRequired).toBeDefined()
        expect(shardTypeFormErrors.colorInvalid).toBeDefined()
    })
})

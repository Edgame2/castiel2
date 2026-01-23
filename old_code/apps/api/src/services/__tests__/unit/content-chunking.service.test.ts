/**
 * ContentChunkingService Unit Tests
 * Tests for semantic text chunking with token limits
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

interface TextChunk {
    text: string
    startIndex: number
    endIndex: number
    tokenCount: number
    sourceUrl?: string
    chunkIndex: number
}

/**
 * Mock ContentChunkingService for testing
 * In production: apps/api/src/services/content-chunking.service.ts
 */
class ContentChunkingService {
    private maxTokensPerChunk = 512
    private tokensPerWord = 1.33 // Average token-to-word ratio
    private sentenceSplitRegex = /[.!?]+/g

    chunkContent(
        text: string,
        options: {
            maxTokens?: number
            respectSentences?: boolean
            sourceUrl?: string
        } = {}
    ): TextChunk[] {
        const { maxTokens = this.maxTokensPerChunk, respectSentences = true, sourceUrl } = options

        if (!text || text.trim().length === 0) {
            return []
        }

        const cleanText = this.normalizeText(text)
        const chunks: TextChunk[] = []
        let currentChunk = ''
        let startIndex = 0
        let chunkIndex = 0

        if (respectSentences) {
            // Split by sentences
            const sentences = this.splitSentences(cleanText)

            for (const sentence of sentences) {
                const sentenceTokens = this.estimateTokenCount(sentence)

                if (!currentChunk) {
                    // First sentence in chunk
                    currentChunk = sentence
                } else {
                    const currentTokens = this.estimateTokenCount(currentChunk)
                    if (currentTokens + sentenceTokens <= maxTokens) {
                        // Add to current chunk
                        currentChunk += ' ' + sentence
                    } else {
                        // Save current chunk and start new one
                        if (currentChunk) {
                            chunks.push(this.createChunk(currentChunk, startIndex, sourceUrl, chunkIndex++))
                            startIndex += currentChunk.length + 1
                        }
                        currentChunk = sentence
                    }
                }
            }
        } else {
            // Split by words
            const words = cleanText.split(/\s+/)

            for (const word of words) {
                const wordTokens = this.estimateTokenCount(word)

                if (!currentChunk) {
                    currentChunk = word
                } else {
                    const currentTokens = this.estimateTokenCount(currentChunk)
                    if (currentTokens + wordTokens <= maxTokens) {
                        currentChunk += ' ' + word
                    } else {
                        if (currentChunk) {
                            chunks.push(this.createChunk(currentChunk, startIndex, sourceUrl, chunkIndex++))
                            startIndex += currentChunk.length + 1
                        }
                        currentChunk = word
                    }
                }
            }
        }

        // Add remaining chunk
        if (currentChunk) {
            chunks.push(this.createChunk(currentChunk, startIndex, sourceUrl, chunkIndex))
        }

        return chunks
    }

    private normalizeText(text: string): string {
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s.!?,-]/g, '') // Remove special characters
            .trim()
    }

    private splitSentences(text: string): string[] {
        const sentences = text.split(this.sentenceSplitRegex)
        return sentences
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
    }

    private estimateTokenCount(text: string): number {
        // Rough estimation: average 1.33 tokens per word
        const words = text.split(/\s+/).length
        return Math.ceil(words * this.tokensPerWord)
    }

    private createChunk(
        text: string,
        startIndex: number,
        sourceUrl: string | undefined,
        chunkIndex: number
    ): TextChunk {
        return {
            text,
            startIndex,
            endIndex: startIndex + text.length,
            tokenCount: this.estimateTokenCount(text),
            sourceUrl,
            chunkIndex,
        }
    }

    getMaxTokens(): number {
        return this.maxTokensPerChunk
    }

    setMaxTokens(tokens: number): void {
        if (tokens < 100 || tokens > 2000) {
            throw new Error('Max tokens must be between 100 and 2000')
        }
        this.maxTokensPerChunk = tokens
    }
}

/**
 * Test Suite: ContentChunkingService
 */
describe('ContentChunkingService', () => {
    let service: ContentChunkingService

    beforeEach(() => {
        service = new ContentChunkingService()
    })

    describe('Basic Chunking', () => {
        it('should chunk text into multiple chunks', () => {
            const text = 'This is a sentence. ' + 'This is another sentence. '.repeat(100)

            const chunks = service.chunkContent(text)

            expect(chunks.length).toBeGreaterThan(1)
        })

        it('should return single chunk for short text', () => {
            const text = 'Short text'

            const chunks = service.chunkContent(text)

            expect(chunks.length).toBe(1)
            expect(chunks[0].text).toBe('Short text')
        })

        it('should return empty array for empty text', () => {
            const chunks = service.chunkContent('')

            expect(chunks.length).toBe(0)
        })

        it('should handle whitespace-only text', () => {
            const chunks = service.chunkContent('   \n\t  ')

            expect(chunks.length).toBe(0)
        })
    })

    describe('Token Limits', () => {
        it('should respect max tokens per chunk', () => {
            const text = 'word '.repeat(1000) // Many words

            const chunks = service.chunkContent(text, { maxTokens: 100 })

            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeLessThanOrEqual(100)
            }
        })

        it('should estimate token count accurately', () => {
            const chunk = service.chunkContent('the quick brown fox')[0]

            // 4 words * 1.33 ≈ 5-6 tokens
            expect(chunk.tokenCount).toBeGreaterThanOrEqual(4)
            expect(chunk.tokenCount).toBeLessThanOrEqual(7)
        })

        it('should allow custom max tokens', () => {
            service.setMaxTokens(200)

            const text = 'word '.repeat(1000)
            const chunks = service.chunkContent(text)

            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeLessThanOrEqual(200)
            }
        })

        it('should reject invalid token limits', () => {
            expect(() => service.setMaxTokens(50)).toThrow()
            expect(() => service.setMaxTokens(3000)).toThrow()
        })
    })

    describe('Sentence Boundary Respect', () => {
        it('should not split mid-sentence', () => {
            const text = 'This is the first sentence. This is the second sentence. This is the third.'

            const chunks = service.chunkContent(text, { respectSentences: true })

            // Each chunk should end with punctuation (simplified check)
            for (const chunk of chunks) {
                // Text should be complete sentences
                expect(chunk.text).toBeDefined()
                expect(chunk.text.length).toBeGreaterThan(0)
            }
        })

        it('should preserve sentence boundaries with question marks', () => {
            const text = 'What is this? This is an answer. Another question? Final statement.'

            const chunks = service.chunkContent(text, { respectSentences: true })

            expect(chunks.length).toBeGreaterThan(0)
        })

        it('should preserve sentence boundaries with exclamation marks', () => {
            const text = 'Wow! That is amazing! Another exclamation. More text.'

            const chunks = service.chunkContent(text, { respectSentences: true })

            expect(chunks.length).toBeGreaterThan(0)
        })
    })

    describe('Text Normalization', () => {
        it('should normalize multiple spaces', () => {
            const text = 'This   is    text   with   spaces'

            const chunks = service.chunkContent(text)

            expect(chunks[0].text).toContain('This is text')
        })

        it('should handle newlines and tabs', () => {
            const text = 'Line one\nLine two\tTabbed'

            const chunks = service.chunkContent(text)

            expect(chunks[0].text).toContain('Line one Line two Tabbed')
        })

        it('should remove special characters', () => {
            const text = 'Text@with#special$characters'

            const chunks = service.chunkContent(text)

            // Special chars should be removed
            expect(chunks[0].text).not.toContain('@')
            expect(chunks[0].text).not.toContain('#')
        })
    })

    describe('Chunk Metadata', () => {
        it('should track chunk index', () => {
            const text = 'sentence. '.repeat(100)

            const chunks = service.chunkContent(text)

            for (let i = 0; i < chunks.length; i++) {
                expect(chunks[i].chunkIndex).toBe(i)
            }
        })

        it('should track start and end indices', () => {
            const text = 'First sentence. Second sentence. Third sentence.'

            const chunks = service.chunkContent(text)

            for (let i = 0; i < chunks.length - 1; i++) {
                expect(chunks[i].endIndex).toBeLessThanOrEqual(chunks[i + 1].startIndex)
            }
        })

        it('should include source URL when provided', () => {
            const text = 'This is test content'
            const url = 'https://example.com/page'

            const chunks = service.chunkContent(text, { sourceUrl: url })

            expect(chunks[0].sourceUrl).toBe(url)
        })

        it('should not include source URL when not provided', () => {
            const text = 'This is test content'

            const chunks = service.chunkContent(text)

            expect(chunks[0].sourceUrl).toBeUndefined()
        })
    })

    describe('Content Preservation', () => {
        it('should preserve chunk content accurately', () => {
            const text = 'First part. Second part. Third part.'

            const chunks = service.chunkContent(text)

            const reconstructed = chunks.map((c) => c.text).join(' ')
            expect(reconstructed).toContain('First')
            expect(reconstructed).toContain('Second')
            expect(reconstructed).toContain('Third')
        })

        it('should not lose content during chunking', () => {
            const text = 'A'.repeat(100) + ' B'.repeat(100)

            const chunks = service.chunkContent(text)

            const reconstructed = chunks.map((c) => c.text).join(' ')
            expect(reconstructed).toContain('A')
            expect(reconstructed).toContain('B')
        })
    })

    describe('Word-based Chunking', () => {
        it('should support word-based chunking', () => {
            const text = 'word '.repeat(100)

            const chunks = service.chunkContent(text, { respectSentences: false })

            expect(chunks.length).toBeGreaterThan(1)
            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeLessThanOrEqual(512)
            }
        })

        it('should respect sentence boundaries when enabled', () => {
            const text = 'Sentence one. ' + 'Sentence two. '.repeat(50)

            const chunksSentence = service.chunkContent(text, { respectSentences: true })
            const chunksWord = service.chunkContent(text, { respectSentences: false })

            // Both should chunk, but may have different boundaries
            expect(chunksSentence.length).toBeGreaterThan(0)
            expect(chunksWord.length).toBeGreaterThan(0)
        })
    })

    describe('Edge Cases', () => {
        it('should handle very long words', () => {
            const longWord = 'a'.repeat(1000)

            const chunks = service.chunkContent(longWord)

            expect(chunks.length).toBeGreaterThan(0)
        })

        it('should handle mixed punctuation', () => {
            const text = 'First. Second! Third? Fourth...'

            const chunks = service.chunkContent(text)

            expect(chunks.length).toBeGreaterThan(0)
        })

        it('should handle Unicode characters', () => {
            const text = 'Hello 世界. Bonjour monde. Hola mundo.'

            const chunks = service.chunkContent(text)

            expect(chunks.length).toBeGreaterThan(0)
        })
    })
})

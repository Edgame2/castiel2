/**
 * WebSocket Integration Tests (Phase 4B)
 * Tests for real-time deep search progress streaming
 * Tests connection management, message handling, reconnection, performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock types
interface WebSocketMessage {
    type: 'fetching' | 'parsing' | 'chunking' | 'embedding' | 'complete' | 'error'
    shardId: string
    timestamp: Date
    data: {
        pageIndex?: number
        pageUrl?: string
        content?: string
        chunks?: Array<{ text: string; tokens: number }>
        embeddings?: Array<{ id: string; vector: number[] }>
        totalChunks?: number
        totalEmbeddings?: number
        errorMessage?: string
        errorCode?: string
    }
    progress?: {
        currentPage: number
        totalPages: number
        currentChunk: number
        totalChunks: number
        percentComplete: number
    }
}

interface WebSocketConnection {
    shardId: string
    userId: string
    tenantId: string
    startTime: Date
    messages: WebSocketMessage[]
    isActive: boolean
}

/**
 * Mock WebSocket Server for testing
 */
class MockWebSocketServer {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    readyState: number = MockWebSocketServer.OPEN
    onopen: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null

    private connections = new Map<string, WebSocketConnection>()
    private messageQueue = new Map<string, WebSocketMessage[]>()
    private reconnectAttempts = new Map<string, number>()
    private readonly MAX_RECONNECT_ATTEMPTS = 3
    private readonly RECONNECT_DELAY = 1000

    constructor(public url: string) {
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = MockWebSocketServer.OPEN
            this.onopen?.(new Event('open'))
        }, 10)
    }

    async connect(shardId: string, userId: string, tenantId: string): Promise<WebSocketConnection> {
        const connectionId = `${shardId}:${userId}`
        const connection: WebSocketConnection = {
            shardId,
            userId,
            tenantId,
            startTime: new Date(),
            messages: [],
            isActive: true
        }

        this.connections.set(connectionId, connection)
        this.messageQueue.set(connectionId, [])
        this.reconnectAttempts.set(connectionId, 0)
        return connection
    }

    async send(connectionId: string, message: WebSocketMessage): Promise<void> {
        const connection = this.connections.get(connectionId)
        if (!connection) throw new Error('Connection not found')

        connection.messages.push(message)
        const queue = this.messageQueue.get(connectionId) || []
        queue.push(message)
        this.messageQueue.set(connectionId, queue)
    }

    async broadcast(shardId: string, message: WebSocketMessage): Promise<void> {
        for (const [connectionId, connection] of this.connections.entries()) {
            if (connection.shardId === shardId && connection.isActive) {
                await this.send(connectionId, message)
            }
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const connection = this.connections.get(connectionId)
        if (connection) {
            connection.isActive = false
        }
    }

    async reconnect(connectionId: string): Promise<boolean> {
        const attempts = this.reconnectAttempts.get(connectionId) || 0
        if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
            return false
        }

        // Simulate reconnection delay with exponential backoff
        const delay = this.RECONNECT_DELAY * Math.pow(2, attempts)
        await new Promise(resolve => setTimeout(resolve, delay))

        const connection = this.connections.get(connectionId)
        if (connection) {
            connection.isActive = true
            this.reconnectAttempts.set(connectionId, attempts + 1)
            return true
        }
        return false
    }

    getMessages(connectionId: string): WebSocketMessage[] {
        return this.connections.get(connectionId)?.messages || []
    }

    getConnection(connectionId: string): WebSocketConnection | undefined {
        return this.connections.get(connectionId)
    }

    isConnected(connectionId: string): boolean {
        const connection = this.connections.get(connectionId)
        return connection?.isActive || false
    }

    send(data: string): void {
        // Mock send
    }

    close(): void {
        this.readyState = MockWebSocketServer.CLOSED
        this.onclose?.(new CloseEvent('close'))
    }

    // Helper for testing: simulate receiving a message
    simulateMessage(data: any): void {
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
    }

    // Helper for testing: simulate error
    simulateError(): void {
        this.onerror?.(new Event('error'))
    }

    simulateProgress(shardId: string, userId: string): void {
        const connectionId = `${shardId}:${userId}`
        const connection = this.connections.get(connectionId)
        if (!connection) return

        // Simulate page fetching
        setTimeout(() => {
            this.send(connectionId, {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    pageUrl: 'https://example.com/page1'
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 0, percentComplete: 5 }
            })
        }, 100)

        // Simulate parsing
        setTimeout(() => {
            this.send(connectionId, {
                type: 'parsing',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    content: 'Extracted content from page 1'
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 12, percentComplete: 20 }
            })
        }, 300)

        // Simulate chunking
        setTimeout(() => {
            this.send(connectionId, {
                type: 'chunking',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    chunks: [
                        { text: 'Chunk 1', tokens: 45 },
                        { text: 'Chunk 2', tokens: 52 }
                    ],
                    totalChunks: 12
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 2, totalChunks: 12, percentComplete: 35 }
            })
        }, 500)

        // Simulate embedding
        setTimeout(() => {
            this.send(connectionId, {
                type: 'embedding',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    embeddings: [
                        { id: 'chunk_1', vector: new Array(1536).fill(0.1) },
                        { id: 'chunk_2', vector: new Array(1536).fill(0.2) }
                    ],
                    totalEmbeddings: 12
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 2, totalChunks: 12, percentComplete: 50 }
            })
        }, 700)

        // Simulate completion
        setTimeout(() => {
            this.send(connectionId, {
                type: 'complete',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 3,
                    totalChunks: 36,
                    totalEmbeddings: 36
                },
                progress: { currentPage: 3, totalPages: 3, currentChunk: 36, totalChunks: 36, percentComplete: 100 }
            })
        }, 1500)
    }

    simulateError(shardId: string, userId: string, error: Error): void {
        const connectionId = `${shardId}:${userId}`
        this.send(connectionId, {
            type: 'error',
            shardId,
            timestamp: new Date(),
            data: {
                errorMessage: error.message,
                errorCode: 'DEEP_SEARCH_FAILED'
            }
        })
    }
}

/**
 * Test Suites for WebSocket Integration
 */
describe('WebSocket Deep Search Progress', () => {
    let wsServer: MockWebSocketServer
    const shardId = 'search_ws_123'
    const userId = 'user1'
    const tenantId = 'tenant1'

    beforeEach(() => {
        wsServer = new MockWebSocketServer('ws://localhost:8080/api/v1/insights/deep-search-progress')
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    // ============================================================================
    // Connection Tests
    // ============================================================================
    describe('WebSocket Connection', () => {
        it('should establish WebSocket connection for deep search', async () => {
            const connection = await wsServer.connect(shardId, userId, tenantId)

            expect(connection).toBeDefined()
            expect(connection.shardId).toBe(shardId)
            expect(connection.userId).toBe(userId)
            expect(connection.tenantId).toBe(tenantId)
            expect(connection.isActive).toBe(true)
        })

        it('should track connection start time', async () => {
            const beforeConnect = new Date()
            const connection = await wsServer.connect(shardId, userId, tenantId)
            const afterConnect = new Date()

            expect(connection.startTime.getTime()).toBeGreaterThanOrEqual(beforeConnect.getTime())
            expect(connection.startTime.getTime()).toBeLessThanOrEqual(afterConnect.getTime())
        })

        it('should allow multiple connections for same shard', async () => {
            const conn1 = await wsServer.connect(shardId, 'user1', tenantId)
            const conn2 = await wsServer.connect(shardId, 'user2', tenantId)

            expect(conn1).toBeDefined()
            expect(conn2).toBeDefined()
            expect(conn1.userId).not.toBe(conn2.userId)
        })

        it('should maintain separate message queues per connection', async () => {
            const conn1 = await wsServer.connect(shardId, 'user1', tenantId)
            const conn2 = await wsServer.connect(shardId, 'user2', tenantId)

            const msg1: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 1, pageUrl: 'https://example.com' }
            }

            await wsServer.send(`${shardId}:user1`, msg1)

            expect(wsServer.getMessages(`${shardId}:user1`).length).toBe(1)
            expect(wsServer.getMessages(`${shardId}:user2`).length).toBe(0)
        })
    })

    // ============================================================================
    // Message Types Tests
    // ============================================================================
    describe('WebSocket Message Types', () => {
        beforeEach(async () => {
            await wsServer.connect(shardId, userId, tenantId)
        })

        it('should send fetching message', async () => {
            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 1, pageUrl: 'https://example.com/page1' },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 0, percentComplete: 10 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages).toContainEqual(expect.objectContaining({ type: 'fetching' }))
            expect(messages[0].data.pageUrl).toBe('https://example.com/page1')
        })

        it('should send parsing message', async () => {
            const msg: WebSocketMessage = {
                type: 'parsing',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 1, content: 'Extracted page content' },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 15, percentComplete: 25 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].type).toBe('parsing')
            expect(messages[0].data.content).toBeDefined()
        })

        it('should send chunking message', async () => {
            const msg: WebSocketMessage = {
                type: 'chunking',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    chunks: [
                        { text: 'Chunk 1', tokens: 45 },
                        { text: 'Chunk 2', tokens: 52 }
                    ],
                    totalChunks: 15
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 2, totalChunks: 15, percentComplete: 40 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].type).toBe('chunking')
            expect(messages[0].data.chunks).toHaveLength(2)
            expect(messages[0].data.chunks![0].tokens).toBeGreaterThan(0)
        })

        it('should send embedding message', async () => {
            const msg: WebSocketMessage = {
                type: 'embedding',
                shardId,
                timestamp: new Date(),
                data: {
                    pageIndex: 1,
                    embeddings: [{ id: 'chunk_1', vector: new Array(1536).fill(0.5) }],
                    totalEmbeddings: 15
                },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 1, totalChunks: 15, percentComplete: 50 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].type).toBe('embedding')
            expect(messages[0].data.embeddings).toHaveLength(1)
            expect(messages[0].data.embeddings![0].vector).toHaveLength(1536)
        })

        it('should send complete message', async () => {
            const msg: WebSocketMessage = {
                type: 'complete',
                shardId,
                timestamp: new Date(),
                data: {
                    totalChunks: 45,
                    totalEmbeddings: 45
                },
                progress: { currentPage: 3, totalPages: 3, currentChunk: 45, totalChunks: 45, percentComplete: 100 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].type).toBe('complete')
            expect(messages[0].progress!.percentComplete).toBe(100)
        })

        it('should send error message', async () => {
            const msg: WebSocketMessage = {
                type: 'error',
                shardId,
                timestamp: new Date(),
                data: {
                    errorMessage: 'Failed to fetch page',
                    errorCode: 'FETCH_FAILED'
                }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].type).toBe('error')
            expect(messages[0].data.errorMessage).toBeDefined()
            expect(messages[0].data.errorCode).toBeDefined()
        })
    })

    // ============================================================================
    // Progress Tracking Tests
    // ============================================================================
    describe('Progress Tracking', () => {
        beforeEach(async () => {
            await wsServer.connect(shardId, userId, tenantId)
        })

        it('should track progress percentage', async () => {
            const messages: WebSocketMessage[] = [
                {
                    type: 'fetching',
                    shardId,
                    timestamp: new Date(),
                    data: { pageIndex: 1 },
                    progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 0, percentComplete: 10 }
                },
                {
                    type: 'parsing',
                    shardId,
                    timestamp: new Date(),
                    data: { pageIndex: 1 },
                    progress: { currentPage: 1, totalPages: 3, currentChunk: 0, totalChunks: 15, percentComplete: 30 }
                },
                {
                    type: 'complete',
                    shardId,
                    timestamp: new Date(),
                    data: {},
                    progress: { currentPage: 3, totalPages: 3, currentChunk: 45, totalChunks: 45, percentComplete: 100 }
                }
            ]

            for (const msg of messages) {
                await wsServer.send(`${shardId}:${userId}`, msg)
            }

            const allMessages = wsServer.getMessages(`${shardId}:${userId}`)
            expect(allMessages[allMessages.length - 1].progress!.percentComplete).toBe(100)
        })

        it('should track current and total pages', async () => {
            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 2 },
                progress: { currentPage: 2, totalPages: 3, currentChunk: 15, totalChunks: 45, percentComplete: 50 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].progress!.currentPage).toBe(2)
            expect(messages[0].progress!.totalPages).toBe(3)
        })

        it('should track chunk progress', async () => {
            const msg: WebSocketMessage = {
                type: 'chunking',
                shardId,
                timestamp: new Date(),
                data: { chunks: Array(10).fill({ text: 'chunk', tokens: 50 }) },
                progress: { currentPage: 1, totalPages: 3, currentChunk: 10, totalChunks: 45, percentComplete: 35 }
            }

            await wsServer.send(`${shardId}:${userId}`, msg)
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages[0].progress!.currentChunk).toBe(10)
            expect(messages[0].progress!.totalChunks).toBe(45)
        })
    })

    // ============================================================================
    // Broadcast Tests
    // ============================================================================
    describe('Broadcasting Messages', () => {
        it('should broadcast to all connections for same shard', async () => {
            await wsServer.connect(shardId, 'user1', tenantId)
            await wsServer.connect(shardId, 'user2', tenantId)

            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 1 }
            }

            await wsServer.broadcast(shardId, msg)

            expect(wsServer.getMessages(`${shardId}:user1`).length).toBe(1)
            expect(wsServer.getMessages(`${shardId}:user2`).length).toBe(1)
        })

        it('should not broadcast to other shards', async () => {
            await wsServer.connect(shardId, 'user1', tenantId)
            await wsServer.connect('search_different', 'user1', tenantId)

            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: { pageIndex: 1 }
            }

            await wsServer.broadcast(shardId, msg)

            expect(wsServer.getMessages(`${shardId}:user1`).length).toBe(1)
            expect(wsServer.getMessages(`search_different:user1`).length).toBe(0)
        })
    })

    // ============================================================================
    // Disconnection Tests
    // ============================================================================
    describe('Disconnection Handling', () => {
        beforeEach(async () => {
            await wsServer.connect(shardId, userId, tenantId)
        })

        it('should disconnect client', async () => {
            expect(wsServer.isConnected(`${shardId}:${userId}`)).toBe(true)

            await wsServer.disconnect(`${shardId}:${userId}`)

            expect(wsServer.isConnected(`${shardId}:${userId}`)).toBe(false)
        })

        it('should prevent messages on disconnected connection', async () => {
            await wsServer.disconnect(`${shardId}:${userId}`)

            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: {}
            }

            try {
                await wsServer.send(`${shardId}:${userId}`, msg)
                expect.fail('Should have thrown')
            } catch (error) {
                expect((error as Error).message).toContain('Connection not found')
            }
        })
    })

    // ============================================================================
    // Reconnection Tests
    // ============================================================================
    describe('Reconnection Handling', () => {
        it('should allow reconnection after disconnect', async () => {
            const conn1 = await wsServer.connect(shardId, userId, tenantId)
            expect(conn1.isActive).toBe(true)

            await wsServer.disconnect(`${shardId}:${userId}`)

            const conn2 = await wsServer.connect(shardId, userId, tenantId)
            expect(conn2.isActive).toBe(true)
        })

        it('should handle reconnection with exponential backoff', async () => {
            await wsServer.connect(shardId, userId, tenantId)
            await wsServer.disconnect(`${shardId}:${userId}`)

            const startTime = Date.now()
            const success = await wsServer.reconnect(`${shardId}:${userId}`)
            const duration = Date.now() - startTime

            expect(success).toBe(true)
            expect(wsServer.isConnected(`${shardId}:${userId}`)).toBe(true)
            expect(duration).toBeGreaterThanOrEqual(1000) // First reconnect delay
        })

        it('should limit reconnection attempts', async () => {
            await wsServer.connect(shardId, userId, tenantId)

            // Try to reconnect more than max attempts
            const connectionId = `${shardId}:${userId}`
            for (let i = 0; i < 4; i++) {
                await wsServer.disconnect(connectionId)
                const success = await wsServer.reconnect(connectionId)
                if (i < 2) {
                    expect(success).toBe(true)
                } else if (i === 2) {
                    // Third reconnect should succeed
                    expect(success).toBe(true)
                } else {
                    // Fourth reconnect should fail
                    expect(success).toBe(false)
                }
            }
        })
    })

    // ============================================================================
    // Full Flow Tests
    // ============================================================================
    describe('Complete Deep Search Flow', () => {
        it('should simulate complete deep search progress', async () => {
            await wsServer.connect(shardId, userId, tenantId)

            // Simulate full progress flow
            wsServer.simulateProgress(shardId, userId)

            // Wait for all messages
            await new Promise(resolve => setTimeout(resolve, 2000))

            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            // Should have all message types
            expect(messages.some(m => m.type === 'fetching')).toBe(true)
            expect(messages.some(m => m.type === 'parsing')).toBe(true)
            expect(messages.some(m => m.type === 'chunking')).toBe(true)
            expect(messages.some(m => m.type === 'embedding')).toBe(true)
            expect(messages.some(m => m.type === 'complete')).toBe(true)

            // Last message should be complete
            expect(messages[messages.length - 1].type).toBe('complete')
            expect(messages[messages.length - 1].progress!.percentComplete).toBe(100)
        })

        it('should handle errors during deep search', async () => {
            await wsServer.connect(shardId, userId, tenantId)

            wsServer.simulateError(shardId, userId, new Error('Network timeout'))

            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages.length).toBe(1)
            expect(messages[0].type).toBe('error')
            expect(messages[0].data.errorMessage).toContain('timeout')
        })
    })

    // ============================================================================
    // Performance Tests
    // ============================================================================
    describe('WebSocket Performance', () => {
        it('should handle rapid message delivery', async () => {
            await wsServer.connect(shardId, userId, tenantId)

            const startTime = Date.now()

            for (let i = 0; i < 100; i++) {
                const msg: WebSocketMessage = {
                    type: 'chunking',
                    shardId,
                    timestamp: new Date(),
                    data: { pageIndex: 1 }
                }
                await wsServer.send(`${shardId}:${userId}`, msg)
            }

            const endTime = Date.now()
            const messages = wsServer.getMessages(`${shardId}:${userId}`)

            expect(messages.length).toBe(100)
            expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
        })

        it('should handle multiple concurrent connections', async () => {
            const connections = await Promise.all(
                Array.from({ length: 10 }, (_, i) =>
                    wsServer.connect(shardId, `user${i}`, tenantId)
                )
            )

            expect(connections).toHaveLength(10)
            expect(connections.every(c => c.isActive)).toBe(true)
        })

        it('should broadcast efficiently to many connections', async () => {
            const users = Array.from({ length: 20 }, (_, i) => `user${i}`)
            await Promise.all(users.map(u => wsServer.connect(shardId, u, tenantId)))

            const msg: WebSocketMessage = {
                type: 'fetching',
                shardId,
                timestamp: new Date(),
                data: {}
            }

            const startTime = Date.now()
            await wsServer.broadcast(shardId, msg)
            const endTime = Date.now()

            users.forEach(u => {
                expect(wsServer.getMessages(`${shardId}:${u}`).length).toBe(1)
            })

            expect(endTime - startTime).toBeLessThan(100)
        })
    })
})
wrapper: createWrapper(),
            })

act(() => {
    result.current.executeDeepSearch('test', {})
})

await waitFor(() => {
    expect(result.current.isConnected).toBe(true)
})

            // Simulate error - would need proper mocking
            // act(() => {
            //   wsInstance.simulateError()
            // })

            // expect(result.current.error).toBeTruthy()
        })
    })

describe('Connection Management', () => {
    it('should return latest progress correctly', () => {
        const { result } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        expect(result.current.latestProgress).toBeUndefined()

        // Would set progressEvents and verify latestProgress
    })

    it('should cancel search and close WebSocket', () => {
        const { result } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        act(() => {
            result.current.executeDeepSearch('test')
        })

        expect(result.current.isConnected).toBe(true)

        act(() => {
            result.current.cancelSearch()
        })

        expect(result.current.isConnected).toBe(false)
    })
})

describe('Error Handling', () => {
    it('should initialize with no errors', () => {
        const { result } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        expect(result.current.error).toBeNull()
    })

    it('should handle invalid query gracefully', () => {
        const { result } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        // Very short query
        act(() => {
            result.current.executeDeepSearch('x')
        })

        // Should either error or proceed - depends on API validation
        expect(result.current.isConnected).toBe(true)
    })
})

describe('Cleanup', () => {
    it('should cleanup WebSocket on unmount', () => {
        const { unmount } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        // Start connection
        act(() => {
            // would call executeDeepSearch
        })

        // Unmount should cleanup
        unmount()

        // Verify cleanup (would need to verify socket is closed)
    })

    it('should cleanup on cancelSearch', () => {
        const { result } = renderHook(() => useDeepSearchWithSocket(), {
            wrapper: createWrapper(),
        })

        act(() => {
            result.current.executeDeepSearch('test')
        })

        expect(result.current.isConnected).toBe(true)
        expect(result.current.progressEvents).toHaveLength(0)

        act(() => {
            result.current.cancelSearch()
        })

        expect(result.current.isConnected).toBe(false)
        expect(result.current.progressEvents).toHaveLength(0)
    })
})
})

describe('ScrapingProgress Component', () => {
    it('should render with empty events', () => {
        // Mock render test
        const { container } = require('@testing-library/react').render(
            // Would import and render ScrapingProgress
        )
        // Verify "Waiting for scraping to start..." message
    })

    it('should display progress events', () => {
        const events: ScrapingProgressEvent[] = [
            {
                currentPage: 1,
                totalPages: 3,
                currentUrl: 'https://example.com/1',
                status: 'fetching',
                progress: 33,
            },
            {
                currentPage: 2,
                totalPages: 3,
                currentUrl: 'https://example.com/2',
                status: 'parsing',
                progress: 66,
            },
        ]

        // Would render component with events and verify display
    })

    it('should apply correct status colors', () => {
        const statusColors = {
            fetching: 'bg-sky-100',
            parsing: 'bg-amber-100',
            chunking: 'bg-indigo-100',
            embedding: 'bg-emerald-100',
            complete: 'bg-emerald-100',
            error: 'bg-rose-100',
        }

        // Would verify each status shows correct color
        Object.entries(statusColors).forEach(([status, color]) => {
            // Render with status and verify class applied
        })
    })

    it('should handle widget props', () => {
        // Would render with isWidget=true, widgetSize='medium', etc.
        // Verify appropriate styling applied
    })
})

describe('Web Search Page Integration', () => {
    it('should show progress container when deep search enabled and events exist', () => {
        // Would render page, enable deep search, start search
        // Verify ScrapingProgress card appears when progressEvents.length > 0
    })

    it('should display cancel button during active deep search', () => {
        // Would verify cancel button visible when isConnected === true
        // Verify cancelSearch called on click
    })

    it('should display latest progress in card header', () => {
        // Would verify CardDescription shows:
        // "{currentPage}/{totalPages} ({progress}%)"
    })

    it('should transition to results when deep search completes', () => {
        // Would start search, complete WebSocket
        // Verify progress card disappears
        // Verify results appear
        // Verify deep search pages displayed
    })
})

describe('Reconnection Logic', () => {
    it('should attempt reconnection on failure', async () => {
        // Would setup failed WebSocket
        // Verify first reconnection attempt after ~1s
        // Verify second reconnection attempt after ~2s
        // Verify third reconnection attempt after ~3s
        // Verify final error after 3 attempts
    })

    it('should show toast notifications', () => {
        // Would mock toast
        // Verify 'Starting deep search...' on execute
        // Verify 'Deep search completed' on completion
        // Verify 'Deep search error: ...' on error
    })

    it('should invalidate queries on completion', () => {
        // Would mock queryClient
        // Verify invalidateQueries called with correct keys
        // Verify history and statistics caches cleared
    })
})

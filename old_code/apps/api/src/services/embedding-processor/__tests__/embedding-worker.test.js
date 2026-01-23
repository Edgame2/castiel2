import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingWorker } from '../embedding-worker.js';
const monitoring = {
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackMetric: vi.fn(),
    trackTrace: vi.fn(),
    trackRequest: vi.fn(),
    trackDependency: vi.fn(),
    startOperation: vi.fn(() => ({
        end: vi.fn(),
    })),
    flush: vi.fn(),
    isHealthy: vi.fn(() => true),
};
describe('EmbeddingWorker', () => {
    const shard = { id: 's1', tenantId: 't1', shardTypeId: 'c_document', revisionNumber: 1 };
    let shardRepository;
    let shardEmbeddingService;
    let receiver;
    let worker;
    beforeEach(() => {
        vi.clearAllMocks();
        shardRepository = {
            findById: vi.fn().mockResolvedValue(shard),
        };
        shardEmbeddingService = {
            generateEmbeddingsForShard: vi.fn().mockResolvedValue({ vectorsGenerated: 1 }),
        };
        receiver = {
            completeMessage: vi.fn().mockResolvedValue(undefined),
            abandonMessage: vi.fn().mockResolvedValue(undefined),
            deadLetterMessage: vi.fn().mockResolvedValue(undefined),
        };
        const client = {
            createReceiver: vi.fn(() => ({ subscribe: vi.fn() })),
            close: vi.fn(),
        };
        worker = new EmbeddingWorker(client, shardRepository, shardEmbeddingService, monitoring, undefined, 'embedding-jobs');
        worker.receiver = receiver;
    });
    it('processes a valid message and completes it', async () => {
        const message = {
            body: {
                shardId: shard.id,
                tenantId: shard.tenantId,
                shardTypeId: shard.shardTypeId,
                revisionNumber: shard.revisionNumber,
            },
            deliveryCount: 0,
        };
        await worker.processMessage(message);
        expect(shardRepository.findById).toHaveBeenCalledWith(shard.id, shard.tenantId);
        expect(shardEmbeddingService.generateEmbeddingsForShard).toHaveBeenCalledWith(shard, shard.tenantId, {
            forceRegenerate: false,
        });
        expect(receiver.completeMessage).toHaveBeenCalledWith(message);
    });
    it('dead-letters after exceeding max delivery attempts', async () => {
        const error = new Error('fail');
        shardEmbeddingService.generateEmbeddingsForShard.mockRejectedValueOnce(error);
        const message = {
            body: {
                shardId: shard.id,
                tenantId: shard.tenantId,
                shardTypeId: shard.shardTypeId,
                revisionNumber: shard.revisionNumber,
            },
            deliveryCount: 5,
        };
        await worker.processMessage(message);
        expect(receiver.deadLetterMessage).toHaveBeenCalledWith(message, expect.objectContaining({ deadLetterReason: 'embedding-processing-failed' }));
    });
});
//# sourceMappingURL=embedding-worker.test.js.map
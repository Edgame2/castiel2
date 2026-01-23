import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { ShardEmbeddingChangeFeedService } from '../change-feed.service.js';
const monitoring = {
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackMetric: vi.fn(),
};
const makeShard = (overrides = {}) => ({
    id: 'shard-1',
    tenantId: 'tenant-1',
    shardTypeId: 'c_document',
    structuredData: { title: 'Doc' },
    vectors: [],
    revisionNumber: 2,
    status: 'active',
    ...overrides,
});
describe('ShardEmbeddingChangeFeedService (enqueue mode)', () => {
    let sendEmbeddingJob;
    let queueService;
    beforeEach(() => {
        vi.clearAllMocks();
        sendEmbeddingJob = vi.fn().mockResolvedValue(true);
        queueService = { sendEmbeddingJob };
    });
    it('enqueues embedding jobs when configured for enqueue mode', async () => {
        const svc = new ShardEmbeddingChangeFeedService({}, {}, monitoring, queueService, { mode: 'enqueue' });
        const shard = makeShard();
        const result = await svc.processShard(shard);
        expect(sendEmbeddingJob).toHaveBeenCalledWith(expect.objectContaining({
            shardId: shard.id,
            tenantId: shard.tenantId,
            shardTypeId: shard.shardTypeId,
            revisionNumber: shard.revisionNumber,
            dedupeKey: `embed-${shard.id}-${shard.revisionNumber}`,
        }));
        expect(result.jobsEnqueued).toBe(1);
    });
    it('skips shards with recent vectors and does not enqueue', async () => {
        const recent = new Date();
        const shard = makeShard({
            vectors: [{ createdAt: recent }],
        });
        const svc = new ShardEmbeddingChangeFeedService({}, {}, monitoring, queueService, { mode: 'enqueue' });
        const result = await svc.processShard(shard);
        expect(sendEmbeddingJob).not.toHaveBeenCalled();
        expect(result.vectorsGenerated).toBe(0);
        expect(result.skipped).toBeTruthy();
    });
});
//# sourceMappingURL=change-feed.service.test.js.map
import { randomBytes } from 'crypto';
import { TenantJoinRequestStatus, } from '../../types/join-request.types.js';
export class TenantJoinRequestService {
    container;
    constructor(container) {
        this.container = container;
    }
    async createRequest(input) {
        const existing = await this.findOpenRequest(input.tenantId, input.requesterUserId);
        if (existing) {
            return existing;
        }
        const now = new Date().toISOString();
        const request = {
            id: randomBytes(16).toString('hex'),
            tenantId: input.tenantId,
            requesterUserId: input.requesterUserId,
            requesterEmail: input.requesterEmail.toLowerCase(),
            message: input.message,
            status: TenantJoinRequestStatus.PENDING,
            createdAt: now,
            updatedAt: now,
            partitionKey: input.tenantId,
        };
        const { resource } = await this.container.items.create(request);
        return this.toResponse(resource);
    }
    async listRequests(tenantId, status) {
        const parameters = [{ name: '@tenantId', value: tenantId }];
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
        if (status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: status });
        }
        query += ' ORDER BY c.createdAt DESC';
        const { resources } = await this.container.items
            .query({ query, parameters }, { partitionKey: tenantId })
            .fetchAll();
        return {
            items: resources.map((doc) => this.toResponse(doc)),
            total: resources.length,
        };
    }
    async countRequestsByStatus(tenantId, status) {
        const { resources } = await this.container.items
            .query({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@status', value: status },
            ],
        }, { partitionKey: tenantId })
            .fetchAll();
        return resources[0] || 0;
    }
    async approveRequest(input) {
        return this.updateStatus(input, TenantJoinRequestStatus.APPROVED);
    }
    async declineRequest(input) {
        return this.updateStatus(input, TenantJoinRequestStatus.DECLINED);
    }
    async getRequestById(requestId, tenantId) {
        try {
            const { resource } = await this.container.item(requestId, tenantId).read();
            return resource ? this.toResponse(resource) : null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async findOpenRequest(tenantId, userId) {
        const { resources } = await this.container.items
            .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.requesterUserId = @userId AND c.status = @status',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@userId', value: userId },
                { name: '@status', value: TenantJoinRequestStatus.PENDING },
            ],
        }, { partitionKey: tenantId })
            .fetchAll();
        const doc = resources[0];
        return doc ? this.toResponse(doc) : null;
    }
    async updateStatus(input, status) {
        const { resource } = await this.container
            .item(input.requestId, input.tenantId)
            .read();
        if (!resource || resource.status !== TenantJoinRequestStatus.PENDING) {
            return null;
        }
        const now = new Date().toISOString();
        resource.status = status;
        resource.decisionAt = now;
        resource.decisionBy = input.approverUserId;
        resource.updatedAt = now;
        const { resource: updated } = await this.container
            .item(input.requestId, input.tenantId)
            .replace(resource);
        return updated ? this.toResponse(updated) : null;
    }
    toResponse(doc) {
        return {
            id: doc.id,
            tenantId: doc.tenantId,
            requesterUserId: doc.requesterUserId,
            requesterEmail: doc.requesterEmail,
            status: doc.status,
            message: doc.message,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            decisionAt: doc.decisionAt,
            decisionBy: doc.decisionBy,
        };
    }
}
//# sourceMappingURL=tenant-join-request.service.js.map
import { Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import {
  CreateTenantJoinRequestInput,
  TenantJoinRequestDecisionInput,
  TenantJoinRequestDocument,
  TenantJoinRequestListResponse,
  TenantJoinRequestResponse,
  TenantJoinRequestStatus,
} from '../../types/join-request.types.js';

export class TenantJoinRequestService {
  constructor(private readonly container: Container) {}

  async createRequest(input: CreateTenantJoinRequestInput): Promise<TenantJoinRequestResponse> {
    const existing = await this.findOpenRequest(input.tenantId, input.requesterUserId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const request: TenantJoinRequestDocument = {
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
    return this.toResponse(resource as TenantJoinRequestDocument);
  }

  async listRequests(tenantId: string, status?: TenantJoinRequestStatus): Promise<TenantJoinRequestListResponse> {
    const parameters = [{ name: '@tenantId', value: tenantId }];
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';

    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const { resources } = await this.container.items
      .query<TenantJoinRequestDocument>({ query, parameters }, { partitionKey: tenantId })
      .fetchAll();

    return {
      items: resources.map((doc) => this.toResponse(doc)),
      total: resources.length,
    };
  }

  async countRequestsByStatus(tenantId: string, status: TenantJoinRequestStatus): Promise<number> {
    const { resources } = await this.container.items
      .query<number>({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@status', value: status },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();

    return resources[0] || 0;
  }

  async approveRequest(input: TenantJoinRequestDecisionInput): Promise<TenantJoinRequestResponse | null> {
    return this.updateStatus(input, TenantJoinRequestStatus.APPROVED);
  }

  async declineRequest(input: TenantJoinRequestDecisionInput): Promise<TenantJoinRequestResponse | null> {
    return this.updateStatus(input, TenantJoinRequestStatus.DECLINED);
  }

  async getRequestById(requestId: string, tenantId: string): Promise<TenantJoinRequestResponse | null> {
    try {
      const { resource } = await this.container.item(requestId, tenantId).read<TenantJoinRequestDocument>();
      return resource ? this.toResponse(resource) : null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  private async findOpenRequest(tenantId: string, userId: string): Promise<TenantJoinRequestResponse | null> {
    const { resources } = await this.container.items
      .query<TenantJoinRequestDocument>({
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

  private async updateStatus(
    input: TenantJoinRequestDecisionInput,
    status: TenantJoinRequestStatus
  ): Promise<TenantJoinRequestResponse | null> {
    const { resource } = await this.container
      .item(input.requestId, input.tenantId)
      .read<TenantJoinRequestDocument>();

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

    return updated ? this.toResponse(updated as unknown as TenantJoinRequestDocument) : null;
  }

  private toResponse(doc: TenantJoinRequestDocument): TenantJoinRequestResponse {
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

import { Container } from '@azure/cosmos';
import { CreateTenantJoinRequestInput, TenantJoinRequestDecisionInput, TenantJoinRequestListResponse, TenantJoinRequestResponse, TenantJoinRequestStatus } from '../../types/join-request.types.js';
export declare class TenantJoinRequestService {
    private readonly container;
    constructor(container: Container);
    createRequest(input: CreateTenantJoinRequestInput): Promise<TenantJoinRequestResponse>;
    listRequests(tenantId: string, status?: TenantJoinRequestStatus): Promise<TenantJoinRequestListResponse>;
    countRequestsByStatus(tenantId: string, status: TenantJoinRequestStatus): Promise<number>;
    approveRequest(input: TenantJoinRequestDecisionInput): Promise<TenantJoinRequestResponse | null>;
    declineRequest(input: TenantJoinRequestDecisionInput): Promise<TenantJoinRequestResponse | null>;
    getRequestById(requestId: string, tenantId: string): Promise<TenantJoinRequestResponse | null>;
    private findOpenRequest;
    private updateStatus;
    private toResponse;
}
//# sourceMappingURL=tenant-join-request.service.d.ts.map
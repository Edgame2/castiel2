import { TenantStatus } from './tenant.types.js';
export declare enum TenantJoinRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    DECLINED = "declined",
    EXPIRED = "expired"
}
export interface TenantJoinRequestDocument {
    id: string;
    tenantId: string;
    requesterUserId: string;
    requesterEmail: string;
    message?: string;
    status: TenantJoinRequestStatus;
    createdAt: string;
    updatedAt: string;
    decisionAt?: string;
    decisionBy?: string;
    partitionKey: string;
}
export interface CreateTenantJoinRequestInput {
    tenantId: string;
    requesterUserId: string;
    requesterEmail: string;
    message?: string;
}
export interface TenantJoinRequestResponse {
    id: string;
    tenantId: string;
    requesterUserId: string;
    requesterEmail: string;
    status: TenantJoinRequestStatus;
    message?: string;
    createdAt: string;
    updatedAt: string;
    decisionAt?: string;
    decisionBy?: string;
}
export interface TenantJoinRequestListResponse {
    items: TenantJoinRequestResponse[];
    total: number;
}
export interface TenantJoinRequestDecisionInput {
    requestId: string;
    tenantId: string;
    approverUserId: string;
}
export interface TenantDomainMatchResult {
    tenantId: string;
    tenantName: string;
    tenantStatus: TenantStatus;
}
//# sourceMappingURL=join-request.types.d.ts.map
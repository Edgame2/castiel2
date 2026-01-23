import { Container } from '@azure/cosmos';
import { TenantDocumentSettings } from '../types/document.types.js';
export interface Tenant {
    id: string;
    name: string;
    documentSettings?: TenantDocumentSettings;
}
export declare class TenantRepository {
    private container;
    constructor(container: Container);
    listTenants(): Promise<Tenant[]>;
    getTenant(tenantId: string): Promise<Tenant | null>;
    updateTenantDocumentSettings(tenantId: string, settings: TenantDocumentSettings): Promise<void>;
}
//# sourceMappingURL=tenant.repository.d.ts.map
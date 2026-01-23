/**
 * Lightweight in-memory Cosmos DB substitute used for local testing.
 */
export declare class CosmosDBService {
    private readonly store;
    private getContainerKey;
    private getContainerStore;
    upsertDocument<T extends {
        id?: string;
    }>(container: string, document: T, tenantId?: string): Promise<T>;
    queryDocuments<T>(container: string, _query: string, _params?: any[], tenantId?: string): Promise<T[]>;
    getDocument<T>(container: string, id: string, tenantId?: string): Promise<T | null>;
    deleteDocument(container: string, id: string, tenantId?: string): Promise<void>;
}
//# sourceMappingURL=cosmos-db.service.d.ts.map
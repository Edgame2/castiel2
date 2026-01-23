/**
 * Lightweight in-memory Cosmos DB substitute used for local testing.
 */
import { v4 as uuidv4 } from 'uuid';
export class CosmosDBService {
    store = new Map();
    getContainerKey(container, tenantId) {
        return `${tenantId || 'default'}:${container}`;
    }
    getContainerStore(container, tenantId) {
        const key = this.getContainerKey(container, tenantId);
        if (!this.store.has(key)) {
            this.store.set(key, new Map());
        }
        return this.store.get(key);
    }
    async upsertDocument(container, document, tenantId) {
        const containerStore = this.getContainerStore(container, tenantId);
        const id = document.id || uuidv4();
        const saved = { ...document, id };
        containerStore.set(id, saved);
        return saved;
    }
    async queryDocuments(container, _query, _params, tenantId) {
        const containerStore = this.getContainerStore(container, tenantId);
        return Array.from(containerStore.values());
    }
    async getDocument(container, id, tenantId) {
        const containerStore = this.getContainerStore(container, tenantId);
        return containerStore.get(id) || null;
    }
    async deleteDocument(container, id, tenantId) {
        const containerStore = this.getContainerStore(container, tenantId);
        containerStore.delete(id);
    }
}
//# sourceMappingURL=cosmos-db.service.js.map
/**
 * Lightweight in-memory Cosmos DB substitute used for local testing.
 */

import { v4 as uuidv4 } from 'uuid';

export class CosmosDBService {
  private readonly store = new Map<string, Map<string, any>>();

  private getContainerKey(container: string, tenantId?: string): string {
    return `${tenantId || 'default'}:${container}`;
  }

  private getContainerStore(container: string, tenantId?: string): Map<string, any> {
    const key = this.getContainerKey(container, tenantId);
    if (!this.store.has(key)) {
      this.store.set(key, new Map());
    }
    return this.store.get(key)!;
  }

  async upsertDocument<T extends { id?: string }>(container: string, document: T, tenantId?: string): Promise<T> {
    const containerStore = this.getContainerStore(container, tenantId);
    const id = document.id || uuidv4();
    const saved = { ...document, id } as T;
    containerStore.set(id, saved);
    return saved;
  }

  async queryDocuments<T>(container: string, _query: string, _params?: any[], tenantId?: string): Promise<T[]> {
    const containerStore = this.getContainerStore(container, tenantId);
    return Array.from(containerStore.values()) as T[];
  }

  async getDocument<T>(container: string, id: string, tenantId?: string): Promise<T | null> {
    const containerStore = this.getContainerStore(container, tenantId);
    return (containerStore.get(id) as T) || null;
  }

  async deleteDocument(container: string, id: string, tenantId?: string): Promise<void> {
    const containerStore = this.getContainerStore(container, tenantId);
    containerStore.delete(id);
  }
}

import { Container } from '@azure/cosmos';
import { TenantDocumentSettings } from '../types/document.types.js';

export interface Tenant {
  id: string;
  name: string;
  documentSettings?: TenantDocumentSettings;
}

export class TenantRepository {
  constructor(private container: Container) { }

  async listTenants(): Promise<Tenant[]> {
    const { resources } = await this.container.items.query({ query: 'SELECT * FROM c' }).fetchAll();
    return resources as Tenant[];
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const { resource } = await this.container.item(tenantId, tenantId).read<Tenant>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {return null;}
      throw error;
    }
  }

  async updateTenantDocumentSettings(tenantId: string, settings: TenantDocumentSettings): Promise<void> {
    const { resource } = await this.container.item(tenantId, tenantId).read<Tenant>();
    if (!resource) {throw new Error(`Tenant not found: ${tenantId}`);}
    resource.documentSettings = settings;
    await this.container.items.upsert(resource);
  }
}

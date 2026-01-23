import { Container } from '@azure/cosmos';
import { GlobalDocumentSettings } from '../types/document.types.js';

export const SYSTEM_CONFIG_ID = 'document-global-settings';

export class SystemConfigRepository {
    constructor(private container: Container) { }

    /**
     * Get global document settings
     * Returns null if not configured
     */
    async getDocumentSettings(): Promise<GlobalDocumentSettings | null> {
        try {
            const { resource } = await this.container
                .item(SYSTEM_CONFIG_ID, 'documents')
                .read<GlobalDocumentSettings>();
            return resource || null;
        } catch (error: any) {
            if (error.code === 404) {return null;}
            throw error;
        }
    }

    /**
     * Update or create global document settings
     */
    async updateDocumentSettings(settings: GlobalDocumentSettings): Promise<void> {
        await this.container.items.upsert({
            ...settings,
            id: SYSTEM_CONFIG_ID,
            partitionKey: 'documents', // Explicit partition key
        });
    }

    /**
     * Ensure default settings exist
     */
    async ensureDefaultSettings(defaultSettings: GlobalDocumentSettings): Promise<GlobalDocumentSettings> {
        const existing = await this.getDocumentSettings();
        if (existing) {
            return existing;
        }
        await this.updateDocumentSettings(defaultSettings);
        return defaultSettings;
    }
}

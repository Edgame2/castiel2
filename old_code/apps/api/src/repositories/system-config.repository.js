export const SYSTEM_CONFIG_ID = 'document-global-settings';
export class SystemConfigRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    /**
     * Get global document settings
     * Returns null if not configured
     */
    async getDocumentSettings() {
        try {
            const { resource } = await this.container
                .item(SYSTEM_CONFIG_ID, 'documents')
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Update or create global document settings
     */
    async updateDocumentSettings(settings) {
        await this.container.items.upsert({
            ...settings,
            id: SYSTEM_CONFIG_ID,
            partitionKey: 'documents', // Explicit partition key
        });
    }
    /**
     * Ensure default settings exist
     */
    async ensureDefaultSettings(defaultSettings) {
        const existing = await this.getDocumentSettings();
        if (existing) {
            return existing;
        }
        await this.updateDocumentSettings(defaultSettings);
        return defaultSettings;
    }
}
//# sourceMappingURL=system-config.repository.js.map
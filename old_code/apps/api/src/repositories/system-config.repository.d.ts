import { Container } from '@azure/cosmos';
import { GlobalDocumentSettings } from '../types/document.types.js';
export declare const SYSTEM_CONFIG_ID = "document-global-settings";
export declare class SystemConfigRepository {
    private container;
    constructor(container: Container);
    /**
     * Get global document settings
     * Returns null if not configured
     */
    getDocumentSettings(): Promise<GlobalDocumentSettings | null>;
    /**
     * Update or create global document settings
     */
    updateDocumentSettings(settings: GlobalDocumentSettings): Promise<void>;
    /**
     * Ensure default settings exist
     */
    ensureDefaultSettings(defaultSettings: GlobalDocumentSettings): Promise<GlobalDocumentSettings>;
}
//# sourceMappingURL=system-config.repository.d.ts.map
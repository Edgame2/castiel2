import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Azure Container Initialization Service
 *
 * Handles creation and verification of Azure Blob Storage containers
 * for document management system.
 */
export declare class AzureContainerInitService {
    private blobServiceClient;
    private monitoring?;
    constructor(connectionString: string, monitoring?: IMonitoringProvider);
    /**
     * Ensure containers exist, creating them if they don't
     *
     * @param containerNames - Array of container names to ensure
     * @returns Array of results indicating whether each container was created or already existed
     */
    ensureContainers(containerNames: string[]): Promise<{
        name: string;
        created: boolean;
    }[]>;
    /**
     * Verify container exists and is accessible
     *
     * @param containerName - Name of container to verify
     * @returns True if container exists and is accessible
     */
    verifyContainer(containerName: string): Promise<boolean>;
    /**
     * Get container properties
     *
     * @param containerName - Name of container
     * @returns Container properties or null if not found
     */
    getContainerProperties(containerName: string): Promise<{
        name: string;
        publicAccess: string;
        metadata: Record<string, string>;
    } | null>;
}
//# sourceMappingURL=azure-container-init.service.d.ts.map
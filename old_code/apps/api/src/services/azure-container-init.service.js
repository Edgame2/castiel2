import { BlobServiceClient } from '@azure/storage-blob';
/**
 * Azure Container Initialization Service
 *
 * Handles creation and verification of Azure Blob Storage containers
 * for document management system.
 */
export class AzureContainerInitService {
    blobServiceClient;
    monitoring;
    constructor(connectionString, monitoring) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.monitoring = monitoring;
    }
    /**
     * Ensure containers exist, creating them if they don't
     *
     * @param containerNames - Array of container names to ensure
     * @returns Array of results indicating whether each container was created or already existed
     */
    async ensureContainers(containerNames) {
        const results = [];
        for (const name of containerNames) {
            try {
                const containerClient = this.blobServiceClient.getContainerClient(name);
                const exists = await containerClient.exists();
                if (!exists) {
                    // Create container with private access (no public access)
                    await containerClient.create({
                        access: 'private',
                        metadata: {
                            createdBy: 'castiel-migration-script',
                            createdAt: new Date().toISOString(),
                        }
                    });
                    results.push({ name, created: true });
                }
                else {
                    results.push({ name, created: false });
                }
            }
            catch (error) {
                // If container creation fails, log but continue
                this.monitoring?.trackException(error, { operation: 'azure-container-init.ensure-container', containerName: name });
                throw new Error(`Failed to create container '${name}': ${error.message}`);
            }
        }
        return results;
    }
    /**
     * Verify container exists and is accessible
     *
     * @param containerName - Name of container to verify
     * @returns True if container exists and is accessible
     */
    async verifyContainer(containerName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            return await containerClient.exists();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get container properties
     *
     * @param containerName - Name of container
     * @returns Container properties or null if not found
     */
    async getContainerProperties(containerName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const exists = await containerClient.exists();
            if (!exists) {
                return null;
            }
            const properties = await containerClient.getProperties();
            return {
                name: containerName,
                publicAccess: (properties.blobPublicAccess || 'private'),
                metadata: properties.metadata || {},
            };
        }
        catch (error) {
            return null;
        }
    }
}
//# sourceMappingURL=azure-container-init.service.js.map
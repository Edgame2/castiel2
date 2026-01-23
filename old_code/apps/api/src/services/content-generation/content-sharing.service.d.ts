import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface SharedContent {
    id: string;
    tenantId: string;
    content: string;
    passwordHash?: string;
    allowedContactIds?: string[];
    createdAt: string;
    expiresAt?: string;
    createdBy: string;
    views: number;
    uniqueViewers: number;
}
export interface ContentInteraction {
    id: string;
    sharedContentId: string;
    viewerId?: string;
    event: 'view' | 'click' | 'scroll';
    metadata?: any;
    timestamp: string;
}
export declare class ContentSharingService {
    private monitoring;
    private contentContainer;
    private interactionContainer;
    constructor(monitoring: IMonitoringProvider, cosmosClient: CosmosClient);
    /**
     * Create a secure link for content
     */
    createShareLink(tenantId: string, userId: string, content: string, options: {
        password?: string;
        allowedContactIds?: string[];
        expiresInDays?: number;
    }): Promise<string>;
    /**
     * Get shared content (verifying access)
     */
    getSharedContent(id: string, password?: string, viewerEmail?: string): Promise<{
        content: string;
        authorized: boolean;
        error?: string;
    }>;
    /**
     * Track interaction
     */
    trackInteraction(sharedContentId: string, event: 'view' | 'click' | 'scroll', viewerId?: string, metadata?: any): Promise<void>;
    /**
     * Get analytics for shared content
     */
    getAnalytics(id: string): Promise<any>;
}
//# sourceMappingURL=content-sharing.service.d.ts.map
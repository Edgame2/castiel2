/**
 * Webhook Service
 * Handles webhook management and delivery
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer, BadRequestError, NotFoundError } from '@coder/shared';
import { Webhook, CreateWebhookInput, UpdateWebhookInput } from '../types/integration.types';

export class WebhookService {
  private containerName = 'integration_webhooks';

  constructor(_secretManagementUrl: string) {}

  /**
   * Create a new webhook
   */
  async create(input: CreateWebhookInput): Promise<Webhook> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.integrationId) {
      throw new BadRequestError('integrationId is required');
    }
    if (!input.webhookUrl) {
      throw new BadRequestError('webhookUrl is required');
    }
    if (!input.events || input.events.length === 0) {
      throw new BadRequestError('events are required');
    }

    // TODO: Verify integration exists
    // TODO: Register webhook with external provider if needed

    const webhook: Webhook = {
      id: uuidv4(),
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      providerName: '', // Will be populated from integration
      webhookUrl: input.webhookUrl,
      webhookSecret: input.webhookSecret,
      events: input.events,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(webhook, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create webhook');
      }

      return resource as Webhook;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Webhook with this URL already exists');
      }
      throw error;
    }
  }

  /**
   * Get webhook by ID
   */
  async getById(webhookId: string, tenantId: string): Promise<Webhook> {
    if (!webhookId || !tenantId) {
      throw new BadRequestError('webhookId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(webhookId, tenantId).read<Webhook>();

      if (!resource) {
        throw new NotFoundError('Webhook', webhookId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Webhook', webhookId);
      }
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async update(
    webhookId: string,
    tenantId: string,
    input: UpdateWebhookInput
  ): Promise<Webhook> {
    const existing = await this.getById(webhookId, tenantId);

    const updated: Webhook = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(webhookId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update webhook');
      }

      return resource as Webhook;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Webhook', webhookId);
      }
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string, tenantId: string): Promise<void> {
    await this.getById(webhookId, tenantId);

    // TODO: Unregister webhook from external provider

    const container = getContainer(this.containerName);
    await container.item(webhookId, tenantId).delete();
  }

  /**
   * List webhooks
   */
  async list(
    tenantId: string,
    filters?: {
      integrationId?: string;
      isActive?: boolean;
      limit?: number;
    }
  ): Promise<Webhook[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.integrationId) {
      query += ' AND c.integrationId = @integrationId';
      parameters.push({ name: '@integrationId', value: filters.integrationId });
    }

    if (filters?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: filters.isActive });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<Webhook>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }
  }
}


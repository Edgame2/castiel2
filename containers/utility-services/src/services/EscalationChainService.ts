/**
 * Escalation Chain Service
 * 
 * CRUD operations for escalation chains
 */

import { getDatabaseClient } from '@coder/shared';
import { NotFoundError } from '@coder/shared';
import { EscalationLevel } from './EscalationManager';

export interface CreateEscalationChainInput {
  organizationId: string;
  name: string;
  description?: string;
  levels: EscalationLevel[];
  enabled?: boolean;
}

export interface UpdateEscalationChainInput {
  name?: string;
  description?: string;
  levels?: EscalationLevel[];
  enabled?: boolean;
}

export class EscalationChainService {
  private db = getDatabaseClient() as any;

  /**
   * Get escalation chain by ID
   */
  async getEscalationChain(id: string): Promise<any> {
    const chain = await this.db.notification_escalation_chains.findUnique({
      where: { id },
    });

    if (!chain) {
      throw new NotFoundError('EscalationChain', id);
    }

    return chain;
  }

  /**
   * List escalation chains
   */
  async listEscalationChains(organizationId: string, enabled?: boolean): Promise<any[]> {
    const where: any = { organizationId };
    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    return await this.db.notification_escalation_chains.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create escalation chain
   */
  async createEscalationChain(input: CreateEscalationChainInput): Promise<any> {
    return await this.db.notification_escalation_chains.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description || null,
        levels: input.levels as any,
        enabled: input.enabled !== false,
      },
    });
  }

  /**
   * Update escalation chain
   */
  async updateEscalationChain(id: string, input: UpdateEscalationChainInput): Promise<any> {
    await this.getEscalationChain(id); // Throws if not found

    return await this.db.notification_escalation_chains.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        levels: input.levels as any,
        enabled: input.enabled,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete escalation chain
   */
  async deleteEscalationChain(id: string): Promise<void> {
    await this.getEscalationChain(id); // Throws if not found
    
    await this.db.notification_escalation_chains.delete({
      where: { id },
    });
  }
}


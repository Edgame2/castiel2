/**
 * API Key service for machine / programmatic auth.
 * Keys are user-scoped; format ak_<id>_<secret>. Stored in Cosmos (auth_api_keys, partition /id).
 */

import { randomUUID, randomFillSync, createHash } from 'crypto';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

const API_KEY_PREFIX = 'ak_';
const SECRET_BYTES = 32;

export interface ApiKeyDoc {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  keyHash: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface ValidateApiKeyResult {
  userId: string;
  tenantId: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export class ApiKeyService {
  private config = loadConfig();

  private getContainerName(): string {
    return this.config.cosmos_db?.containers?.api_keys ?? 'auth_api_keys';
  }

  /**
   * Create an API key for the user. Returns the raw key once (ak_<id>_<secret>).
   */
  async create(
    userId: string,
    tenantId: string,
    name: string,
    expiresInDays?: number
  ): Promise<CreateApiKeyResult> {
    const id = randomUUID();
    const secretBytes = Buffer.alloc(SECRET_BYTES);
    randomFillSync(secretBytes);
    const secret = secretBytes.toString('hex');
    const keyHash = hashSecret(secret);
    const now = new Date().toISOString();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const doc: ApiKeyDoc = {
      id,
      userId,
      tenantId,
      name,
      keyHash,
      createdAt: now,
      expiresAt,
    };

    const container = getContainer(this.getContainerName());
    await container.items.create(doc, { partitionKey: id } as any);

    const key = `${API_KEY_PREFIX}${id}_${secret}`;
    log.info('API key created', { id, userId, name, service: 'auth' });
    return { id, name, key, createdAt: now, expiresAt };
  }

  /**
   * Validate a raw API key. Returns userId and tenantId if valid; null otherwise.
   */
  async validate(rawKey: string): Promise<ValidateApiKeyResult | null> {
    if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }
    const withoutPrefix = rawKey.slice(API_KEY_PREFIX.length);
    const underscore = withoutPrefix.indexOf('_');
    if (underscore <= 0) {
      return null;
    }
    const id = withoutPrefix.slice(0, underscore);
    const secret = withoutPrefix.slice(underscore + 1);
    if (!id || !secret) {
      return null;
    }

    try {
      const container = getContainer(this.getContainerName());
      const { resource: doc } = await container.item(id, id).read<ApiKeyDoc>();
      if (!doc) {
        return null;
      }
      if (doc.expiresAt && new Date(doc.expiresAt) <= new Date()) {
        return null;
      }
      const expectedHash = hashSecret(secret);
      if (expectedHash !== doc.keyHash) {
        return null;
      }
      return { userId: doc.userId, tenantId: doc.tenantId };
    } catch {
      return null;
    }
  }

  /**
   * List API keys for a user (no secrets or hashes returned).
   */
  async listByUser(userId: string): Promise<ApiKeyListItem[]> {
    const container = getContainer(this.getContainerName());
    const { resources } = await container.items
      .query<ApiKeyListItem>({
        query: 'SELECT c.id, c.name, c.createdAt, c.expiresAt FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      }, { enableCrossPartitionQuery: true } as any)
      .fetchAll();
    return resources ?? [];
  }

  /**
   * Revoke an API key. Only the owning user can revoke. Returns true if deleted, false if not found or not owner.
   */
  async revoke(id: string, userId: string): Promise<boolean> {
    try {
      const container = getContainer(this.getContainerName());
      const { resource: doc } = await container.item(id, id).read<ApiKeyDoc>();
      if (!doc || doc.userId !== userId) {
        return false;
      }
      await container.item(id, id).delete();
      log.info('API key revoked', { id, userId, service: 'auth' });
      return true;
    } catch {
      return false;
    }
  }
}

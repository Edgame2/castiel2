/**
 * API Key Service
 * Super Admin §10.3 – list, create, revoke, rotate API keys per organization.
 * Stores keys in Cosmos container user_api_keys; partition key tenantId = organizationId.
 * Raw key returned only once on create/rotate; stored value is SHA-256 hash.
 */

import { randomBytes, createHash } from 'crypto';
import { getContainer } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

const CONTAINER_NAME = 'user_api_keys';
const ID_PREFIX = 'apikey_';

export interface ApiKeySummary {
  id: string;
  name: string;
  scope?: string;
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;
  scope?: string;
  expiresAt?: string;
  createdAt: string;
}

interface ApiKeyDoc {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  scope?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  lastUsedAt?: string;
}

function getApiKeysContainer(): ReturnType<typeof getContainer> {
  const config = loadConfig();
  const name = config.cosmos_db?.containers?.api_keys ?? CONTAINER_NAME;
  return getContainer(name);
}

function toSummary(doc: ApiKeyDoc): ApiKeySummary {
  return {
    id: doc.id,
    name: doc.name,
    scope: doc.scope,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
    lastUsedAt: doc.lastUsedAt,
  };
}

/**
 * List API keys for an organization (no raw keys).
 */
export async function listApiKeys(organizationId: string): Promise<ApiKeySummary[]> {
  const container = getApiKeysContainer();
  const queryOptions = { partitionKey: organizationId };
  const { resources } = await container.items
    .query(
      {
        query: 'SELECT * FROM c WHERE c.organizationId = @oid ORDER BY c.createdAt DESC',
        parameters: [{ name: '@oid', value: organizationId }],
      },
      queryOptions as Parameters<typeof container.items.query>[1]
    )
    .fetchAll();
  return (resources as ApiKeyDoc[]).map(toSummary);
}

/**
 * Create an API key. Returns raw key only once; store it securely.
 */
export async function createApiKey(
  organizationId: string,
  input: { name: string; scope?: string; expiresAt?: string },
  createdBy: string
): Promise<ApiKeyCreated> {
  const container = getApiKeysContainer();
  const rawKey = randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const now = new Date().toISOString();
  const id = `${ID_PREFIX}${now.replace(/\D/g, '').slice(-14)}_${randomBytes(4).toString('hex')}`;
  const doc: ApiKeyDoc = {
    id,
    tenantId: organizationId,
    organizationId,
    name: input.name.trim(),
    keyHash,
    scope: input.scope?.trim() || undefined,
    expiresAt: input.expiresAt || undefined,
    createdBy,
    createdAt: now,
  };
  await container.items.create(doc, { partitionKey: organizationId } as Parameters<typeof container.items.create>[1]);
  log.info('API key created', { service: 'user-management', organizationId, keyId: id, createdBy });
  return {
    id: doc.id,
    name: doc.name,
    key: rawKey,
    scope: doc.scope,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

/**
 * Revoke (delete) an API key.
 */
export async function revokeApiKey(organizationId: string, keyId: string): Promise<void> {
  const container = getApiKeysContainer();
  const id = keyId.startsWith(ID_PREFIX) ? keyId : `${ID_PREFIX}${keyId}`;
  try {
    await container.item(id, organizationId).delete();
    log.info('API key revoked', { service: 'user-management', organizationId, keyId: id });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 404) throw new Error('API key not found');
    throw err;
  }
}

/**
 * Rotate an API key: replace with new secret, return raw key once.
 */
export async function rotateApiKey(
  organizationId: string,
  keyId: string,
  rotatedBy: string
): Promise<{ key: string; expiresAt?: string; createdAt: string }> {
  const container = getApiKeysContainer();
  const id = keyId.startsWith(ID_PREFIX) ? keyId : `${ID_PREFIX}${keyId}`;
  const { resource: existing } = await container.item(id, organizationId).read();
  if (!existing) throw new Error('API key not found');
  const doc = existing as ApiKeyDoc;
  const rawKey = randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const now = new Date().toISOString();
  const updated: ApiKeyDoc = {
    ...doc,
    keyHash,
    lastUsedAt: undefined,
    createdAt: now,
  };
  await container.item(id, organizationId).replace(updated);
  log.info('API key rotated', { service: 'user-management', organizationId, keyId: id, rotatedBy });
  return { key: rawKey, expiresAt: doc.expiresAt, createdAt: now };
}

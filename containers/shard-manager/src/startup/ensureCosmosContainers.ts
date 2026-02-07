/**
 * Ensure all platform Cosmos DB containers exist from central manifest.
 * Used at shard-manager bootstrap when bootstrap.ensure_cosmos_containers is true.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { ensureContainer } from '@coder/shared/database';

export interface CosmosContainerManifestEntry {
  id: string;
  partitionKey: string;
  defaultTtl?: number;
}

export interface CosmosContainersManifest {
  containers: CosmosContainerManifestEntry[];
}

/**
 * Load manifest from path. Path can be absolute or relative to shard-manager root (two levels up from dist/server).
 */
function loadManifest(manifestPath: string): CosmosContainersManifest {
  const resolved =
    manifestPath.startsWith('/') || (manifestPath.length > 1 && manifestPath[1] === ':')
      ? manifestPath
      : join(__dirname, '../..', manifestPath);
  if (!existsSync(resolved)) {
    throw new Error(`Cosmos containers manifest not found: ${resolved}`);
  }
  const content = readFileSync(resolved, 'utf-8');
  const parsed = parseYaml(content) as CosmosContainersManifest;
  if (!parsed?.containers || !Array.isArray(parsed.containers)) {
    throw new Error(`Invalid manifest: expected "containers" array`);
  }
  return parsed;
}

/**
 * Ensure all containers from the central manifest exist. Idempotent.
 * Call after connectDatabase() so the Cosmos client is initialized.
 */
export async function ensureCosmosContainers(manifestPath: string): Promise<void> {
  const manifest = loadManifest(manifestPath);
  const partitionKeyDefault = '/tenantId';
  for (const entry of manifest.containers) {
    const id = entry.id;
    const partitionKey = entry.partitionKey ?? partitionKeyDefault;
    const options =
      entry.defaultTtl !== undefined ? { defaultTtl: entry.defaultTtl } : undefined;
    await ensureContainer(id, partitionKey, options);
  }
}

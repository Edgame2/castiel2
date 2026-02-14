/**
 * Prisma-like adapter over Cosmos DB for auth service.
 * Maps db.user, db.session, db.tenant, db.membership, db.role to Cosmos containers.
 * Tenant-only: no organization entity; tenantId is the sole scope.
 * Container names: user_users, user_organizations (as tenant store), user_roles, user_memberships, auth_sessions, etc.
 */

import { getContainer } from '@coder/shared';
import { randomUUID } from 'crypto';

const USER_CONTAINER = 'user_users';
const ORG_CONTAINER = 'user_organizations';
const ROLE_CONTAINER = 'user_roles';
const MEMBERSHIP_CONTAINER = 'user_memberships';
const SESSION_CONTAINER = 'auth_sessions';
const LOGIN_ATTEMPTS_CONTAINER = 'auth_login_attempts';
const ACCOUNT_CONTAINER = 'user_accounts';

const DEFAULT_TENANT = 'default';

type SqlParam = { name: string; value: string | number | boolean | null };

function getUsers() {
  return getContainer(USER_CONTAINER);
}
function getOrgs() {
  return getContainer(ORG_CONTAINER);
}
function getRoles() {
  return getContainer(ROLE_CONTAINER);
}
function getMemberships() {
  return getContainer(MEMBERSHIP_CONTAINER);
}
function getSessions() {
  return getContainer(SESSION_CONTAINER);
}
function getLoginAttempts() {
  return getContainer(LOGIN_ATTEMPTS_CONTAINER);
}
function getAccounts() {
  return getContainer(ACCOUNT_CONTAINER);
}

async function queryOne<T>(
  container: ReturnType<typeof getContainer>,
  spec: { query: string; parameters?: SqlParam[] }
): Promise<T | null> {
  const { resources } = await container.items.query<T>(spec).fetchAll();
  return resources[0] ?? null;
}

async function queryMany<T>(
  container: ReturnType<typeof getContainer>,
  spec: { query: string; parameters?: SqlParam[] }
): Promise<T[]> {
  const { resources } = await container.items.query<T>(spec).fetchAll();
  return resources;
}

export function createCosmosAuthAdapter(): Record<string, unknown> {
  const adapter = {
    $queryRaw: async () => {
      const { getCosmosClient } = await import('@coder/shared');
      const client = getCosmosClient();
      await client.getDatabase().read();
      return [{ '1': 1 }];
    },

    user: {
      async findUnique(args: { where: { id?: string; email?: string; username?: string } }): Promise<Record<string, unknown> | null> {
        const where = args?.where;
        if (!where) return null;
        const users = getUsers();
        if (where.id) {
          return queryOne(users, {
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: where.id }],
          });
        }
        if (where.email) {
          return queryOne(users, {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: where.email }],
          });
        }
        if (where.username) {
          return queryOne(users, {
            query: 'SELECT * FROM c WHERE c.username = @username',
            parameters: [{ name: '@username', value: where.username }],
          });
        }
        return null;
      },
      async create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const id = randomUUID();
        const tenantId = (args.data.tenantId as string) ?? DEFAULT_TENANT;
        const doc = {
          id,
          tenantId,
          ...args.data,
          createdAt: (args.data.createdAt as Date) ?? new Date(),
          updatedAt: (args.data.updatedAt as Date) ?? new Date(),
        };
        const users = getUsers();
        const { resource } = await users.items.create(doc as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const users = getUsers();
        const existing = await queryOne<Record<string, unknown>>(users, {
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: args.where.id }],
        });
        if (!existing) throw new Error('User not found');
        const tenantId = (existing.tenantId ?? existing.partitionKey ?? DEFAULT_TENANT) as string;
        const data = { ...args.data };
        if (data.failedLoginAttempts && typeof data.failedLoginAttempts === 'object' && 'increment' in data.failedLoginAttempts) {
          const inc = (data.failedLoginAttempts as { increment: number }).increment;
          data.failedLoginAttempts = ((existing.failedLoginAttempts as number) ?? 0) + inc;
        }
        const updated = { ...existing, ...data, updatedAt: new Date() };
        const { resource } = await users.item(args.where.id, tenantId).replace(updated as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
    },

    loginAttempt: {
      async create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const id = randomUUID();
        const userId = (args.data.userId as string) ?? null;
        const partitionKey = userId ?? 'anonymous';
        const doc = {
          id,
          partitionKey,
          ...args.data,
          createdAt: new Date(),
        };
        const container = getLoginAttempts();
        const { resource } = await container.items.create(doc as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
    },

    account: {
      async findUnique(args: { where: { userId?: string; handle?: string } }): Promise<Record<string, unknown> | null> {
        const where = args?.where;
        if (!where) return null;
        const accounts = getAccounts();
        if (where.userId) {
          return queryOne(accounts, {
            query: 'SELECT * FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: where.userId }],
          });
        }
        if (where.handle) {
          return queryOne(accounts, {
            query: 'SELECT * FROM c WHERE c.handle = @handle',
            parameters: [{ name: '@handle', value: where.handle }],
          });
        }
        return null;
      },
      async create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const id = randomUUID();
        const userId = (args.data.userId as string) ?? '';
        const doc = {
          id,
          partitionKey: userId,
          ...args.data,
        };
        const accounts = getAccounts();
        const { resource } = await accounts.items.create(doc as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
    },

    /** Tenant (replaces organization). Scope is tenantId only. */
    tenant: {
      async findUnique(args: { where: { id: string } }): Promise<Record<string, unknown> | null> {
        return queryOne(getOrgs(), {
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: args.where.id }],
        });
      },
      async findFirst(args: { where: { slug?: string } }): Promise<Record<string, unknown> | null> {
        if (args?.where?.slug) {
          return queryOne(getOrgs(), {
            query: 'SELECT * FROM c WHERE c.slug = @slug',
            parameters: [{ name: '@slug', value: args.where.slug }],
          });
        }
        return null;
      },
    },

    role: {
      async findFirst(args: { where: { tenantId?: string; organizationId?: string; name: string; isSystemRole?: boolean } }): Promise<Record<string, unknown> | null> {
        const where = args.where;
        const tid = where.tenantId ?? where.organizationId;
        if (!tid) return null;
        const roles = getRoles();
        return queryOne(roles, {
          query: 'SELECT * FROM c WHERE (c.tenantId = @tid OR c.organizationId = @tid) AND c.name = @name AND c.isSystemRole = @sys',
          parameters: [
            { name: '@tid', value: tid },
            { name: '@name', value: where.name },
            { name: '@sys', value: where.isSystemRole ?? true },
          ],
        });
      },
    },

    /** Membership by tenantId only (replaces organizationMembership). */
    membership: {
      async findFirst(args: {
        where: { userId: string; tenantId?: string; status?: string };
        orderBy?: { joinedAt: string };
        select?: Record<string, boolean>;
        include?: { role?: boolean };
      }): Promise<Record<string, unknown> | null> {
        const where = args?.where;
        if (!where?.userId) return null;
        const tid = where.tenantId;
        const memberships = getMemberships();
        let query = 'SELECT * FROM c WHERE c.userId = @userId';
        const parameters: SqlParam[] = [{ name: '@userId', value: where.userId }];
        if (where.status) {
          query += ' AND c.status = @status';
          parameters.push({ name: '@status', value: where.status });
        }
        if (tid) {
          query += ' AND (c.tenantId = @tid OR c.organizationId = @tid)';
          parameters.push({ name: '@tid', value: tid });
        }
        if (args?.orderBy?.joinedAt === 'asc') {
          query += ' ORDER BY c.joinedAt ASC';
        }
        const items = await queryMany<Record<string, unknown>>(memberships, { query, parameters });
        const first = items[0] ?? null;
        if (first && args?.include?.role && first.roleId) {
          const role = await queryOne<Record<string, unknown>>(getRoles(), {
            query: 'SELECT * FROM c WHERE c.id = @roleId',
            parameters: [{ name: '@roleId', value: first.roleId as string }],
          });
          if (role) first.role = role;
        }
        if (first && args?.select?.tenantId) {
          return { tenantId: first.tenantId ?? first.organizationId };
        }
        return first;
      },
      async create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const id = randomUUID();
        const tid = (args.data.tenantId as string) ?? '';
        const doc = {
          id,
          partitionKey: tid,
          tenantId: tid,
          ...args.data,
          joinedAt: (args.data.joinedAt as Date) ?? new Date(),
        };
        const memberships = getMemberships();
        const { resource } = await memberships.items.create(doc as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
    },

    session: {
      async findUnique(args: { where: { id: string } }): Promise<Record<string, unknown> | null> {
        return queryOne(getSessions(), {
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: args.where.id }],
        });
      },
      async findMany(): Promise<Record<string, unknown>[]> {
        return [];
      },
      async create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const sessionId = (args.data.id as string) ?? randomUUID();
        const userId = (args.data.userId as string) ?? '';
        const doc = {
          id: sessionId,
          partitionKey: userId,
          ...args.data,
        };
        const sessions = getSessions();
        const { resource } = await sessions.items.create(doc as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>> {
        const sessions = getSessions();
        const existing = await queryOne<Record<string, unknown>>(sessions, {
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: args.where.id }],
        });
        if (!existing) throw new Error('Session not found');
        const updated = { ...existing, ...args.data };
        const userId = (existing.partitionKey ?? existing.userId) as string;
        const { resource } = await sessions.item(args.where.id, userId).replace(updated as Record<string, unknown>);
        return resource as Record<string, unknown>;
      },
      async findFirst(): Promise<Record<string, unknown> | null> {
        return null;
      },
      async count(): Promise<number> {
        return 0;
      },
    },
  };
  (adapter as Record<string, unknown>).organization = adapter.tenant;
  (adapter as Record<string, unknown>).organizationMembership = adapter.membership;
  return adapter as Record<string, unknown>;
}

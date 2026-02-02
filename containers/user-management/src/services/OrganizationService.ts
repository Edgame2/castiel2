/**
 * Organization Service
 * 
 * Manages organization CRUD operations, settings, and member limits.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';
import { slugify, isValidSlug } from '../utils/stringUtils';

/** Prisma-like DB client shape used by this service (shared returns Cosmos Database) */
type OrganizationDb = {
  organization: {
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  user: {
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  role: { findFirst: (args: unknown) => Promise<unknown> };
  organizationMembership: {
    findFirst: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
};

function getDb(): OrganizationDb {
  return getDatabaseClient() as unknown as OrganizationDb;
}

/**
 * Create a new organization
 * 
 * @param userId - User ID of the creator (becomes owner)
 * @param name - Organization name
 * @param slug - Optional slug (auto-generated from name if not provided)
 * @param description - Optional description
 * @returns Promise resolving to created organization
 * @throws Error if slug already exists or validation fails
 */
export async function createOrganization(
  userId: string,
  name: string,
  slug?: string,
  description?: string
) {
  const db = getDb();
  
  // Validate name
  if (!name || name.trim().length === 0) {
    throw new Error('Organization name is required');
  }
  
  if (name.length > 200) {
    throw new Error('Organization name must be 200 characters or less');
  }
  
  // Generate slug if not provided
  const finalSlug = slug || slugify(name);
  
  // Validate slug
  if (!isValidSlug(finalSlug)) {
    throw new Error('Invalid slug format. Slug must be lowercase alphanumeric with hyphens.');
  }
  
  // Check slug uniqueness
  const existing = (await db.organization.findUnique({
    where: { slug: finalSlug },
  })) as { id: string } | null;
  
  if (existing) {
    throw new Error(`Organization slug "${finalSlug}" already exists. Please choose a different name.`);
  }
  
  // Verify user exists
  const user = (await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })) as { id: string } | null;
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Create organization
  const organization = (await db.organization.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      ownerUserId: userId,
      isActive: true,
      memberLimit: 500, // Default limit
    },
  })) as { id: string; name: string; slug: string };
  
  // TODO: Create Account for organization (requires accountService)
  // This will be handled via API call to account service or event-driven approach
  
  // Seed system roles for this organization
  const { seedOrganizationRoles } = await import('./seedService.js');
  await seedOrganizationRoles(organization.id);
  
  // Get Super Admin role (should exist after seeding)
  const superAdminRole = (await db.role.findFirst({
    where: {
      organizationId: organization.id,
      isSuperAdmin: true,
    },
  })) as { id: string } | null;
  
  if (!superAdminRole) {
    throw new Error('Failed to create Super Admin role for organization');
  }
  
  // Create membership for creator (owner)
  await db.organizationMembership.create({
    data: {
      userId,
      organizationId: organization.id,
      roleId: superAdminRole.id,
      status: 'active',
      joinedAt: new Date(),
    },
  });
  
  return organization;
}

/**
 * Update organization details
 * 
 * @param organizationId - Organization ID
 * @param userId - User ID performing the update
 * @param updates - Fields to update
 * @returns Promise resolving to updated organization
 * @throws Error if permission denied, slug taken, or validation fails
 */
export async function updateOrganization(
  organizationId: string,
  userId: string,
  updates: {
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    settings?: Record<string, any>;
  }
) {
  const db = getDb();
  
  // Get organization
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
  })) as { id: string; ownerUserId: string; slug: string } | null;
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  // Check if user is owner or has permission
  const membership = (await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  const isOwner = organization.ownerUserId === userId;
  const isSuperAdmin = membership?.role?.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can update organization.');
  }
  
  // Prepare update data
  const updateData: Record<string, unknown> = {};
  
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw new Error('Organization name cannot be empty');
    }
    if (updates.name.length > 200) {
      throw new Error('Organization name must be 200 characters or less');
    }
    updateData.name = updates.name.trim();
  }
  
  if (updates.slug !== undefined) {
    if (updates.slug !== organization.slug) {
      if (!isValidSlug(updates.slug)) {
        throw new Error('Invalid slug format. Slug must be lowercase alphanumeric with hyphens.');
      }
      
      // Check slug uniqueness
      const existing = (await db.organization.findUnique({
        where: { slug: updates.slug },
      })) as { id: string } | null;
      
      if (existing) {
        throw new Error(`Slug "${updates.slug}" is already taken`);
      }
      
      updateData.slug = updates.slug;
    }
  }
  
  if (updates.description !== undefined) {
    updateData.description = updates.description?.trim() || null;
  }
  
  if (updates.logoUrl !== undefined) {
    // Validate URL format
    if (updates.logoUrl && updates.logoUrl.trim().length > 0) {
      try {
        new URL(updates.logoUrl);
        updateData.logoUrl = updates.logoUrl.trim();
      } catch {
        throw new Error('Invalid logo URL format');
      }
    } else {
      updateData.logoUrl = null;
    }
  }
  
  if (updates.settings !== undefined) {
    // Validate settings JSON size (64KB max)
    const settingsJson = JSON.stringify(updates.settings);
    if (settingsJson.length > 65536) {
      throw new Error('Settings JSON exceeds 64KB limit');
    }
    updateData.settings = updates.settings;
  }
  
  // Update organization
  const updated = await db.organization.update({
    where: { id: organizationId },
    data: updateData,
  });
  
  return updated;
}

/**
 * Get organization by ID
 * 
 * @param organizationId - Organization ID
 * @param userId - Optional user ID (for permission checks)
 * @returns Promise resolving to organization or null if not found
 */
export async function getOrganization(
  organizationId: string,
  userId?: string
) {
  const db = getDb();
  
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })) as Record<string, unknown> | null;
  
  if (!organization) {
    return null;
  }
  
  // If userId provided, check membership
  if (userId) {
    const membership = (await db.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'active',
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            isSuperAdmin: true,
          },
        },
      },
    })) as Record<string, unknown> | null;
    
    return {
      ...organization,
      userMembership: membership || null,
    };
  }
  
  return organization;
}

/**
 * List organizations for a user
 * 
 * @param userId - User ID
 * @param includeInactive - Whether to include inactive organizations
 * @returns Promise resolving to array of organizations user belongs to
 */
export async function listUserOrganizations(
  userId: string,
  includeInactive: boolean = false
) {
  const db = getDb();
  
  const memberships = (await db.organizationMembership.findMany({
    where: {
      userId,
      status: 'active',
    },
    include: {
      organization: {
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          isSuperAdmin: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  })) as Array<{
    organization: Record<string, unknown> & { isActive?: boolean; deletedAt?: Date | null };
    role: Record<string, unknown>;
    status: string;
    joinedAt: Date;
  }>;
  
  // Filter by active status if needed
  let organizations = memberships.map((m: { organization: Record<string, unknown>; role: Record<string, unknown>; status: string; joinedAt: Date }) => ({
    ...m.organization,
    userRole: m.role,
    membershipStatus: m.status,
    joinedAt: m.joinedAt,
  }));
  
  if (!includeInactive) {
    organizations = organizations.filter((org: Record<string, unknown>) => (org.isActive as boolean) && !(org.deletedAt as Date | null | undefined));
  }
  
  return organizations;
}

/**
 * Check if the user has Super Admin role in any organization.
 * Used for admin-only operations (e.g. list all organizations).
 */
async function userHasSuperAdminInAnyOrg(userId: string): Promise<boolean> {
  const db = getDb();
  const memberships = (await db.organizationMembership.findMany({
    where: { userId, status: 'active' },
    include: { role: { select: { isSuperAdmin: true } } },
  })) as Array<{ role?: { isSuperAdmin?: boolean } }>;
  return memberships.some((m) => m.role?.isSuperAdmin === true);
}

/**
 * List all organizations (Super Admin only).
 * Caller must have Super Admin role in at least one organization.
 *
 * @param userId - User ID of the requester (must be Super Admin)
 * @returns Promise resolving to array of organization summaries
 */
export async function listAllOrganizationsForSuperAdmin(
  userId: string
): Promise<Array<{ id: string; name: string; slug: string; description?: string | null; createdAt?: string | null; isActive?: boolean }>> {
  const hasSuperAdmin = await userHasSuperAdminInAnyOrg(userId);
  if (!hasSuperAdmin) {
    throw new Error('Permission denied. Super Admin role required to list all organizations.');
  }
  const db = getDb();
  const orgs = (await db.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, description: true, createdAt: true, isActive: true },
  })) as Array<{ id: string; name: string; slug: string; description?: string | null; createdAt?: Date | null; isActive?: boolean }>;
  return orgs.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : (r.createdAt ?? null),
    isActive: r.isActive,
  }));
}

/**
 * Get a single organization by id (Super Admin only).
 * Caller must have Super Admin role in at least one organization.
 *
 * @param orgId - Organization ID
 * @param userId - User ID of the requester (must be Super Admin)
 * @returns Promise resolving to organization or null if not found
 */
export async function getOrganizationForSuperAdmin(
  orgId: string,
  userId: string
): Promise<{ id: string; name: string; slug: string; description?: string | null; createdAt?: string | null; isActive?: boolean; ownerUserId?: string; memberLimit?: number } | null> {
  const hasSuperAdmin = await userHasSuperAdminInAnyOrg(userId);
  if (!hasSuperAdmin) {
    throw new Error('Permission denied. Super Admin role required.');
  }
  const db = getDb();
  const organization = (await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, description: true, createdAt: true, isActive: true, ownerUserId: true, memberLimit: true },
  })) as { id: string; name: string; slug: string; description?: string | null; createdAt?: Date | null; isActive?: boolean; ownerUserId?: string; memberLimit?: number } | null;
  if (!organization) return null;
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description ?? null,
    createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : (organization.createdAt ?? null),
    isActive: organization.isActive,
    ownerUserId: organization.ownerUserId,
    memberLimit: organization.memberLimit,
  };
}

/**
 * Deactivate an organization (soft delete)
 * 
 * @param organizationId - Organization ID
 * @param userId - User ID performing the deactivation
 * @returns Promise resolving when organization is deactivated
 * @throws Error if permission denied
 */
export async function deactivateOrganization(
  organizationId: string,
  userId: string
) {
  const db = getDb();
  
  // Get organization
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
  })) as { id: string; ownerUserId: string } | null;
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  // Check if user is owner or Super Admin
  const membership = (await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  const isOwner = organization.ownerUserId === userId;
  const isSuperAdmin = membership?.role?.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can deactivate organization.');
  }
  
  // Soft delete (set deletedAt, isActive = false)
  await db.organization.update({
    where: { id: organizationId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
}

/**
 * List organization members (for Super Admin / org admins).
 * Caller must be a member of the organization (checked via getOrganization).
 *
 * @param organizationId - Organization ID
 * @param requestingUserId - User ID of the requester (must be member)
 * @returns Promise resolving to array of member summaries
 */
export async function getOrganizationMembers(
  organizationId: string,
  requestingUserId: string
): Promise<Array<{ userId: string; email: string | null; name: string | null; roleName: string; status: string; joinedAt: Date }>> {
  const org = await getOrganization(organizationId, requestingUserId);
  if (!org || !('userMembership' in org) || !org.userMembership) {
    throw new Error('You are not a member of this organization');
  }
  const db = getDb();
  const memberships = (await db.organizationMembership.findMany({
    where: {
      organizationId,
      status: 'active',
    },
    include: { role: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  })) as Array<{ userId: string; role?: { name?: string }; status: string; joinedAt: Date }>;
  const userIds = [...new Set(memberships.map((m: { userId: string }) => m.userId))];
  const users = (await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })) as Array<{ id: string; email: string | null; name: string | null }>;
  const userMap = new Map(users.map((u: { id: string; email: string | null; name: string | null }) => [u.id, u]));
  return memberships.map((m: { userId: string; role?: { name?: string }; status: string; joinedAt: Date }) => ({
    userId: m.userId,
    email: userMap.get(m.userId)?.email ?? null,
    name: userMap.get(m.userId)?.name ?? null,
    roleName: m.role?.name ?? '',
    status: m.status,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Get organization member count
 * 
 * @param organizationId - Organization ID
 * @returns Promise resolving to number of active members
 */
export async function getOrganizationMemberCount(organizationId: string): Promise<number> {
  const db = getDb();
  
  return await db.organizationMembership.count({
    where: {
      organizationId,
      status: 'active',
    },
  });
}

/**
 * Check if organization has reached member limit
 * 
 * @param organizationId - Organization ID
 * @returns Promise resolving to true if at or over limit, false otherwise
 */
export async function isOrganizationAtMemberLimit(organizationId: string): Promise<boolean> {
  const db = getDb();
  
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
    select: { memberLimit: true },
  })) as { memberLimit: number } | null;
  
  if (!organization) {
    return true; // Treat non-existent as at limit
  }
  
  const memberCount = await getOrganizationMemberCount(organizationId);
  return memberCount >= organization.memberLimit;
}


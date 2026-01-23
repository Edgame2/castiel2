/**
 * Organization Service
 * 
 * Manages organization CRUD operations, settings, and member limits.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';
import { slugify, isValidSlug } from '../utils/stringUtils';
import { log } from '../utils/logger';

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
  const db = getDatabaseClient();
  
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
  const existing = await db.organization.findUnique({
    where: { slug: finalSlug },
  });
  
  if (existing) {
    throw new Error(`Organization slug "${finalSlug}" already exists. Please choose a different name.`);
  }
  
  // Verify user exists
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Create organization
  const organization = await db.organization.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      ownerUserId: userId,
      isActive: true,
      memberLimit: 500, // Default limit
    },
  });
  
  // TODO: Create Account for organization (requires accountService)
  // This will be handled via API call to account service or event-driven approach
  
  // Seed system roles for this organization
  // TODO: Import seedService or call via API
  // For now, we'll create basic roles manually
  const { seedOrganizationRoles } = await import('./seedService');
  await seedOrganizationRoles(organization.id);
  
  // Get Super Admin role (should exist after seeding)
  const superAdminRole = await db.role.findFirst({
    where: {
      organizationId: organization.id,
      isSuperAdmin: true,
    },
  });
  
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
  const db = getDatabaseClient();
  
  // Get organization
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
  });
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  // Check if user is owner or has permission
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  const isOwner = organization.ownerUserId === userId;
  const isSuperAdmin = membership?.role.isSuperAdmin || false;
  
  if (!isOwner && !isSuperAdmin) {
    throw new Error('Permission denied. Only organization owner or Super Admin can update organization.');
  }
  
  // Prepare update data
  const updateData: any = {};
  
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
      const existing = await db.organization.findUnique({
        where: { slug: updates.slug },
      });
      
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
  const db = getDatabaseClient();
  
  const organization = await db.organization.findUnique({
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
  });
  
  if (!organization) {
    return null;
  }
  
  // If userId provided, check membership
  if (userId) {
    const membership = await db.organizationMembership.findFirst({
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
    });
    
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
  const db = getDatabaseClient();
  
  const memberships = await db.organizationMembership.findMany({
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
  });
  
  // Filter by active status if needed
  let organizations = memberships.map(m => ({
    ...m.organization,
    userRole: m.role,
    membershipStatus: m.status,
    joinedAt: m.joinedAt,
  }));
  
  if (!includeInactive) {
    organizations = organizations.filter(org => org.isActive && !org.deletedAt);
  }
  
  return organizations;
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
  const db = getDatabaseClient();
  
  // Get organization
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
  });
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  // Check if user is owner or Super Admin
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  const isOwner = organization.ownerUserId === userId;
  const isSuperAdmin = membership?.role.isSuperAdmin || false;
  
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
 * Get organization member count
 * 
 * @param organizationId - Organization ID
 * @returns Promise resolving to number of active members
 */
export async function getOrganizationMemberCount(organizationId: string): Promise<number> {
  const db = getDatabaseClient();
  
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
  const db = getDatabaseClient();
  
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { memberLimit: true },
  });
  
  if (!organization) {
    return true; // Treat non-existent as at limit
  }
  
  const memberCount = await getOrganizationMemberCount(organizationId);
  return memberCount >= organization.memberLimit;
}


/**
 * Invitation Service
 *
 * Manages tenant invitations for users.
 * Per ModuleImplementationGuide Section 6
 */

import { randomBytes } from 'crypto';
import { getDatabaseClient } from '@coder/shared';

/** Prisma-like DB client shape used by this service (shared returns Cosmos Database) */
type InvitationDb = {
  membership: { findFirst: (args: unknown) => Promise<unknown> };
  role: { findUnique: (args: unknown) => Promise<unknown> };
  invitation: {
    findUnique: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
  };
};

function getDb(): InvitationDb {
  return getDatabaseClient() as unknown as InvitationDb;
}

/**
 * Invitation filters
 */
export interface InvitationFilters {
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
  email?: string;
}

/**
 * Invitation details
 */
export interface InvitationDetails {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  token: string;
  invitedByUserId: string;
  message: string | null;
  status: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  resendCount: number;
  lastResentAt: Date | null;
  cancelledAt: Date | null;
  invitedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  role: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Default invitation expiration (7 days)
 */
const DEFAULT_INVITATION_EXPIRATION_DAYS = 7;

/**
 * Maximum resends per invitation
 */
const MAX_RESENDS = 5;

/**
 * Generate a secure random token for invitation
 */
function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create an invitation (tenant-scoped).
 */
export async function createInvitation(
  tenantId: string,
  email: string,
  roleId: string,
  invitedBy: string,
  message?: string,
  invitationType: 'email' | 'link' = 'email',
  metadata?: Record<string, any>
): Promise<InvitationDetails> {
  const db = getDb();

  // Validate email format (for email-type invitations)
  if (invitationType === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  // Check if user is already a member (for email-type invitations)
  if (invitationType === 'email') {
    const existingMembership = await db.membership.findFirst({
      where: {
        tenantId,
        user: {
          email: email.toLowerCase(),
        },
        status: 'active',
        deletedAt: null,
      },
    });

    if (existingMembership) {
      throw new Error('User is already a member of this tenant');
    }
  }

  // Validate role belongs to tenant
  const role = (await db.role.findUnique({
    where: { id: roleId },
    select: { id: true, tenantId: true, name: true },
  })) as { id: string; tenantId: string; name: string } | null;

  if (!role) {
    throw new Error('Role not found');
  }

  if (role.tenantId !== tenantId) {
    throw new Error('Role does not belong to this tenant');
  }

  // Inviter must be an active member of the tenant (route enforces users.user.invite permission)
  const inviterMembership = (await db.membership.findFirst({
    where: {
      userId: invitedBy,
      tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;

  if (!inviterMembership) {
    throw new Error('Permission denied. You must be a member of this tenant to send invitations.');
  }
  
  // Auto-cancel previous pending invitations for same email/tenant
  if (invitationType === 'email') {
    await db.invitation.updateMany({
      where: {
        tenantId,
        email: email.toLowerCase(),
        status: 'pending',
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  }
  
  // Generate token
  const token = generateInvitationToken();
  
  // Calculate expiration (48 hours for link-based, 7 days for email)
  const expiresAt = new Date();
  if (invitationType === 'link') {
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours
  } else {
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITATION_EXPIRATION_DAYS);
  }
  
  // Create invitation
  const invitation = (await db.invitation.create({
    data: {
      tenantId,
      email: invitationType === 'email' ? email.toLowerCase() : '',
      roleId,
      token,
      invitedByUserId: invitedBy,
      message: message?.trim() || null,
      invitationType,
      status: 'pending',
      expiresAt,
      metadata: metadata || null,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })) as Omit<InvitationDetails, 'tenant'> & { tenantId: string; role: { id: string; name: string }; inviter: { id: string; email: string; name: string | null } };

  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    roleId: invitation.roleId,
    token: invitation.token,
    invitedByUserId: invitation.invitedByUserId,
    message: invitation.message,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    resendCount: invitation.resendCount,
    lastResentAt: invitation.lastResentAt,
    cancelledAt: invitation.cancelledAt,
    invitedUserId: invitation.invitedUserId,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    tenant: { id: tenantId, name: 'Tenant', slug: tenantId },
    role: invitation.role,
    inviter: invitation.inviter,
  };
}

/**
 * List invitations for a tenant
 */
export async function listInvitations(
  tenantId: string,
  filters: InvitationFilters = {}
): Promise<InvitationDetails[]> {
  const db = getDb();
  
  const where: Record<string, unknown> = {
    tenantId,
  };
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.email) {
    where.email = filters.email.toLowerCase();
  }
  
  const invitations = (await db.invitation.findMany({
    where,
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })) as InvitationDetails[];
  
  return invitations.map((inv: InvitationDetails) => ({
    ...inv,
    tenant: inv.tenant ?? { id: inv.tenantId, name: 'Tenant', slug: inv.tenantId },
  }));
}

/**
 * Resend an invitation
 */
export async function resendInvitation(
  invitationId: string,
  invitedBy: string
): Promise<InvitationDetails> {
  const db = getDb();
  
  // Get invitation
  const invitation = (await db.invitation.findUnique({
    where: { id: invitationId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })) as InvitationDetails | null;
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error(`Cannot resend invitation with status: ${invitation.status}`);
  }
  
  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation has expired');
  }
  
  // Check resend limit
  if (invitation.resendCount >= MAX_RESENDS) {
    throw new Error(`Maximum resend limit (${MAX_RESENDS}) reached for this invitation`);
  }
  
  // Check permission
  const inviterMembership = (await db.membership.findFirst({
    where: {
      userId: invitedBy,
      tenantId: invitation.tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  const isSuperAdmin = inviterMembership?.role?.isSuperAdmin || false;
  const isOriginalInviter = invitation.invitedByUserId === invitedBy;
  if (!isOriginalInviter && !inviterMembership) {
    throw new Error('Permission denied. You must be a member of this tenant to resend invitations.');
  }
  if (!isOriginalInviter && !isSuperAdmin) {
    throw new Error('Permission denied. Only the original inviter or Super Admin can resend invitations.');
  }

  // Update invitation
  const updated = (await db.invitation.update({
    where: { id: invitationId },
    data: {
      resendCount: invitation.resendCount + 1,
      lastResentAt: new Date(),
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })) as InvitationDetails;
  
  // Resend email: notification service consumes invitation.resent events when configured.

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    email: updated.email,
    roleId: updated.roleId,
    token: updated.token,
    invitedByUserId: updated.invitedByUserId,
    message: updated.message,
    status: updated.status,
    expiresAt: updated.expiresAt,
    acceptedAt: updated.acceptedAt,
    resendCount: updated.resendCount,
    lastResentAt: updated.lastResentAt,
    cancelledAt: updated.cancelledAt,
    invitedUserId: updated.invitedUserId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    tenant: updated.tenant,
    role: updated.role,
    inviter: updated.inviter,
  };
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(
  invitationId: string,
  cancelledBy: string
): Promise<void> {
  const db = getDb();
  
  // Get invitation
  const invitation = (await db.invitation.findUnique({
    where: { id: invitationId },
  })) as { status: string; tenantId: string; invitedByUserId: string } | null;
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error(`Cannot cancel invitation with status: ${invitation.status}`);
  }
  
  // Check permission
  const inviterMembership = (await db.membership.findFirst({
    where: {
      userId: cancelledBy,
      tenantId: invitation.tenantId,
      status: 'active',
    },
    include: { role: true },
  })) as { role?: { isSuperAdmin?: boolean } } | null;
  
  const isSuperAdmin = inviterMembership?.role?.isSuperAdmin || false;
  const isOriginalInviter = invitation.invitedByUserId === cancelledBy;
  if (!isOriginalInviter && !inviterMembership) {
    throw new Error('Permission denied. You must be a member of this tenant to cancel invitations.');
  }
  if (!isOriginalInviter && !isSuperAdmin) {
    throw new Error('Permission denied. Only the original inviter or Super Admin can cancel invitations.');
  }

  // Cancel invitation
  await db.invitation.update({
    where: { id: invitationId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });
}

/**
 * Get invitation by token (for public acceptance)
 */
export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const db = getDb();
  
  const invitation = (await db.invitation.findFirst({
    where: {
      token,
      status: 'pending',
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })) as InvitationDetails | null;
  
  if (!invitation) {
    return null;
  }
  
  // Check if expired
  if (invitation.expiresAt < new Date()) {
    // Auto-expire
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: 'expired' },
    });
    return null;
  }
  
  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    roleId: invitation.roleId,
    token: invitation.token,
    invitedByUserId: invitation.invitedByUserId,
    message: invitation.message,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    resendCount: invitation.resendCount,
    lastResentAt: invitation.lastResentAt,
    cancelledAt: invitation.cancelledAt,
    invitedUserId: invitation.invitedUserId,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    tenant: invitation.tenant,
    role: invitation.role,
    inviter: invitation.inviter,
  };
}


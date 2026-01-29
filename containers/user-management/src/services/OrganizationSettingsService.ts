/**
 * Organization Settings Service
 * 
 * Manages organization settings stored in the settings JSON field.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';

/** Prisma-like DB client shape used by this service (shared returns Cosmos Database) */
type OrganizationSettingsDb = {
  organization: {
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  organizationMembership: { findFirst: (args: unknown) => Promise<unknown> };
  role: { findUnique: (args: unknown) => Promise<unknown> };
};

function getDb(): OrganizationSettingsDb {
  return getDatabaseClient() as unknown as OrganizationSettingsDb;
}

/**
 * Organization settings structure
 */
export interface OrganizationSettings {
  branding?: {
    primaryColor?: string; // Hex color code
    accentColor?: string; // Hex color code
  };
  defaults?: {
    defaultRoleId?: string; // Role ID for new members
    timezone?: string; // IANA timezone (e.g., "America/New_York")
    dateFormat?: string; // Date format (e.g., "MM/DD/YYYY", "DD/MM/YYYY")
  };
  features?: {
    enabledModules?: string[]; // List of enabled module names
  };
  notifications?: {
    emailPreferences?: Record<string, boolean>; // Feature -> enabled mapping
  };
}

/**
 * Validate hex color code
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate IANA timezone
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format
 */
function isValidDateFormat(format: string): boolean {
  const validFormats = [
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'DD.MM.YYYY',
    'MM-DD-YYYY',
  ];
  return validFormats.includes(format);
}

/**
 * Get organization settings
 */
export async function getOrganizationSettings(
  organizationId: string,
  userId: string
): Promise<OrganizationSettings> {
  const db = getDb();
  
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      settings: true,
    },
  })) as { id: string; settings: unknown } | null;
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  // Check membership
  const membership = (await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
  })) as { id: string } | null;
  
  if (!membership) {
    throw new Error('You are not a member of this organization');
  }
  
  return (organization.settings as OrganizationSettings) || {};
}

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  organizationId: string,
  userId: string,
  settings: Partial<OrganizationSettings>
): Promise<OrganizationSettings> {
  const db = getDb();
  
  const organization = (await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      settings: true,
      ownerUserId: true,
    },
  })) as { id: string; settings: unknown; ownerUserId: string } | null;
  
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
    throw new Error('Permission denied. Only organization owner or Super Admin can update settings.');
  }
  
  // Get current settings
  const currentSettings = (organization.settings as OrganizationSettings) || {};
  
  // Validate and merge settings
  const updatedSettings: OrganizationSettings = {
    ...currentSettings,
  };
  
  // Validate and update branding
  if (settings.branding !== undefined) {
    updatedSettings.branding = {
      ...currentSettings.branding,
      ...settings.branding,
    };
    
    if (updatedSettings.branding.primaryColor && !isValidHexColor(updatedSettings.branding.primaryColor)) {
      throw new Error('Invalid primary color format. Must be a hex color code (e.g., #FF0000).');
    }
    
    if (updatedSettings.branding.accentColor && !isValidHexColor(updatedSettings.branding.accentColor)) {
      throw new Error('Invalid accent color format. Must be a hex color code (e.g., #FF0000).');
    }
  }
  
  // Validate and update defaults
  if (settings.defaults !== undefined) {
    updatedSettings.defaults = {
      ...currentSettings.defaults,
      ...settings.defaults,
    };
    
    if (updatedSettings.defaults.defaultRoleId) {
      const role = (await db.role.findUnique({
        where: { id: updatedSettings.defaults.defaultRoleId },
        select: { id: true, organizationId: true },
      })) as { id: string; organizationId: string } | null;
      
      if (!role || role.organizationId !== organizationId) {
        throw new Error('Default role not found or does not belong to this organization');
      }
    }
    
    if (updatedSettings.defaults.timezone && !isValidTimezone(updatedSettings.defaults.timezone)) {
      throw new Error('Invalid timezone. Must be a valid IANA timezone (e.g., "America/New_York").');
    }
    
    if (updatedSettings.defaults.dateFormat && !isValidDateFormat(updatedSettings.defaults.dateFormat)) {
      throw new Error('Invalid date format. Must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY, MM-DD-YYYY');
    }
  }
  
  // Validate and update features
  if (settings.features !== undefined) {
    updatedSettings.features = {
      ...currentSettings.features,
      ...settings.features,
    };
    
    if (updatedSettings.features.enabledModules !== undefined) {
      if (!Array.isArray(updatedSettings.features.enabledModules) || 
          !updatedSettings.features.enabledModules.every(m => typeof m === 'string')) {
        throw new Error('enabledModules must be an array of strings');
      }
    }
  }
  
  // Validate and update notifications
  if (settings.notifications !== undefined) {
    updatedSettings.notifications = {
      ...currentSettings.notifications,
      ...settings.notifications,
    };
    
    if (updatedSettings.notifications.emailPreferences !== undefined) {
      if (typeof updatedSettings.notifications.emailPreferences !== 'object' || 
          Array.isArray(updatedSettings.notifications.emailPreferences) ||
          !Object.values(updatedSettings.notifications.emailPreferences).every(v => typeof v === 'boolean')) {
        throw new Error('emailPreferences must be an object with boolean values');
      }
    }
  }
  
  // Validate total settings size (64KB limit)
  const settingsJson = JSON.stringify(updatedSettings);
  if (settingsJson.length > 65536) {
    throw new Error('Settings JSON exceeds 64KB limit');
  }
  
  // Update organization
  await db.organization.update({
    where: { id: organizationId },
    data: {
      settings: updatedSettings as Record<string, unknown>,
    },
  });
  
  return updatedSettings;
}


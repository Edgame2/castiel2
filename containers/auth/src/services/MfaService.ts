/**
 * MFA Service (P2)
 * TOTP enrollment and verification using auth_mfa_secrets (partition key userId).
 * Backup codes stored in auth_mfa_backup_codes (partition key userId).
 */

import { randomBytes } from 'crypto';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { generateSecret, verify } from 'otplib';

export interface MfaEnrollResult {
  secret: string;
  provisioningUri: string;
  /** Short label for authenticator app (e.g. "Castiel (user@example.com)") */
  label?: string;
}

export interface MfaSecretDoc {
  id: string;
  userId: string;
  secret: string;
  createdAt: string;
  updatedAt: string;
}

const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface BackupCodeEntry {
  hash: string;
  usedAt?: string;
}

export interface MfaBackupCodesDoc {
  id: string;
  userId: string;
  backupCodes: BackupCodeEntry[];
  updatedAt: string;
}

export class MfaService {
  private config = loadConfig();

  private getContainerName(): string {
    return this.config.cosmos_db?.containers?.mfa_secrets ?? 'auth_mfa_secrets';
  }

  private getBackupCodesContainerName(): string {
    return this.config.cosmos_db?.containers?.mfa_backup_codes ?? 'auth_mfa_backup_codes';
  }

  private generateSingleBackupCode(): string {
    const bytes = randomBytes(BACKUP_CODE_LENGTH);
    let code = '';
    for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
      code += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length];
    }
    return code;
  }

  /**
   * Enroll user in TOTP MFA. Generates secret and stores in auth_mfa_secrets.
   * Caller must be authenticated and pass the same userId.
   */
  async enroll(userId: string, issuer?: string, accountName?: string): Promise<MfaEnrollResult> {
    const container = getContainer(this.getContainerName());
    const existing = await container.item(userId, userId).read<MfaSecretDoc>().catch(() => ({ resource: null }));
    if (existing.resource) {
      throw new Error('MFA_ALREADY_ENROLLED');
    }
    const secret = generateSecret();
    const now = new Date().toISOString();
    const doc: MfaSecretDoc = {
      id: userId,
      userId,
      secret,
      createdAt: now,
      updatedAt: now,
    };
    await container.items.create(doc, { partitionKey: userId } as any);
    const label = accountName ? `${issuer || 'Castiel'}:${accountName}` : issuer || 'Castiel';
    const provisioningUri = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer || 'Castiel')}`;
    log.info('MFA enrolled', { userId, service: 'auth' });
    return { secret, provisioningUri, label: accountName ? `${issuer || 'Castiel'} (${accountName})` : undefined };
  }

  /**
   * Verify a TOTP code for the user. Returns true if valid.
   */
  async verify(userId: string, token: string): Promise<boolean> {
    if (!token || token.length < 6) return false;
    const container = getContainer(this.getContainerName());
    const { resource: doc } = await container.item(userId, userId).read<MfaSecretDoc>();
    if (!doc?.secret) return false;
    const result = await Promise.resolve(verify({ secret: doc.secret, token }));
    return (result as { valid: boolean }).valid === true;
  }

  /**
   * Check whether the user has MFA enrolled.
   */
  async isEnrolled(userId: string): Promise<boolean> {
    const container = getContainer(this.getContainerName());
    const { resource } = await container.item(userId, userId).read<MfaSecretDoc>().catch(() => ({ resource: null }));
    return !!resource?.secret;
  }

  /**
   * Remove MFA for the user (e.g. after verifying password). Also removes backup codes.
   */
  async disable(userId: string): Promise<void> {
    const container = getContainer(this.getContainerName());
    await container.item(userId, userId).delete();
    const backupContainer = getContainer(this.getBackupCodesContainerName());
    await backupContainer.item(userId, userId).delete().catch(() => undefined);
    log.info('MFA disabled', { userId, service: 'auth' });
  }

  /**
   * Generate new backup codes for the user. Returns plain codes once; stores hashes only.
   * Caller should verify TOTP (or password) before calling.
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const plainCodes: string[] = [];
    const hashes: BackupCodeEntry[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.generateSingleBackupCode();
      plainCodes.push(code);
      const hashed = await bcryptHash(code, 10);
      hashes.push({ hash: hashed });
    }
    const container = getContainer(this.getBackupCodesContainerName());
    const now = new Date().toISOString();
    const doc: MfaBackupCodesDoc = {
      id: userId,
      userId,
      backupCodes: hashes,
      updatedAt: now,
    };
    await container.items.upsert(doc, { partitionKey: userId } as any);
    log.info('MFA backup codes generated', { userId, count: BACKUP_CODE_COUNT, service: 'auth' });
    return plainCodes;
  }

  /**
   * Verify a backup code and mark it used. Returns true if the code matched an unused entry.
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const trimmed = code?.trim().toUpperCase();
    if (!trimmed || trimmed.length < BACKUP_CODE_LENGTH) return false;
    const container = getContainer(this.getBackupCodesContainerName());
    const { resource: doc } = await container.item(userId, userId).read<MfaBackupCodesDoc>().catch(() => ({ resource: null }));
    if (!doc?.backupCodes?.length) return false;
    const now = new Date().toISOString();
    for (let i = 0; i < doc.backupCodes.length; i++) {
      const entry = doc.backupCodes[i];
      if (entry.usedAt) continue;
      const match = await bcryptCompare(trimmed, entry.hash);
      if (match) {
        doc.backupCodes[i] = { ...entry, usedAt: now };
        doc.updatedAt = now;
        await container.items.upsert(doc, { partitionKey: userId } as any);
        log.info('MFA backup code used', { userId, service: 'auth' });
        return true;
      }
    }
    return false;
  }
}

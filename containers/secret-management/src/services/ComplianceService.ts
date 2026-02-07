/**
 * Compliance Service
 * 
 * Generates compliance reports and findings for secret management.
 */

import { getDatabaseClient } from '@coder/shared';
import { ComplianceReport, ComplianceFinding } from '../types/audit.types';

export interface ComplianceReportParams {
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}

export class ComplianceService {
  private get db() {
    return getDatabaseClient() as any;
  }
  
  /**
   * Generate compliance report
   */
  async generateReport(params: ComplianceReportParams): Promise<ComplianceReport> {
    const where: any = {
      deletedAt: null,
    };
    
    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }
    
    // Get secrets summary
    const totalSecrets = await this.db.secret_secrets.count({ where });
    
    const activeSecrets = await this.db.secret_secrets.count({
      where: {
        ...where,
        expiresAt: {
          OR: [
            { gt: new Date() },
            { equals: null },
          ],
        },
      },
    });
    
    const expiredSecrets = await this.db.secret_secrets.count({
      where: {
        ...where,
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    const expiringWithin30Days = await this.db.secret_secrets.count({
      where: {
        ...where,
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    const rotationsDue = await this.db.secret_secrets.count({
      where: {
        ...where,
        rotationEnabled: true,
        nextRotationAt: {
          lte: new Date(),
        },
      },
    });
    
    const deletedSecrets = await this.db.secret_secrets.count({
      where: {
        organizationId: params.organizationId || undefined,
        deletedAt: {
          not: null,
        },
      },
    });
    
    // Get access report
    const auditWhere: any = {
      timestamp: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };
    
    if (params.organizationId) {
      auditWhere.organizationId = params.organizationId;
    }
    
    const totalAccesses = await this.db.secret_audit_logs.count({
      where: {
        ...auditWhere,
        eventType: 'SECRET_READ',
      },
    });
    
    const uniqueUsersResult = await this.db.secret_audit_logs.findMany({
      where: {
        ...auditWhere,
        eventType: 'SECRET_READ',
      },
      select: {
        actorId: true,
      },
      distinct: ['actorId'],
    });
    
    const deniedAccesses = await this.db.secret_audit_logs.count({
      where: {
        ...auditWhere,
        eventType: 'ACCESS_DENIED',
      },
    });
    
    // Get accesses by scope
    const accessesByScopeResult = await this.db.secret_audit_logs.groupBy({
      by: ['secretScope'],
      where: {
        ...auditWhere,
        eventType: 'SECRET_READ',
      },
      _count: {
        id: true,
      },
    });
    
    const accessesByScope: Record<string, number> = {};
    for (const item of accessesByScopeResult) {
      if (item.secretScope) {
        accessesByScope[item.secretScope] = item._count.id;
      }
    }
    
    // Get accesses by module from usage records
    const usageRecords = await this.db.secret_usage.findMany({
      where: {
        organizationId: params.organizationId || undefined,
        usedAt: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      select: {
        consumerModule: true,
      },
    });
    
    const accessesByModule: Record<string, number> = {};
    for (const record of usageRecords) {
      accessesByModule[record.consumerModule] = (accessesByModule[record.consumerModule] || 0) + 1;
    }
    
    // Generate findings
    const findings: ComplianceFinding[] = [];
    
    if (expiredSecrets > 0) {
      findings.push({
        severity: 'HIGH',
        category: 'Expiration',
        description: `${expiredSecrets} secret(s) have expired`,
        affectedSecrets: [],
        recommendation: 'Review and rotate expired secrets immediately',
      });
    }
    
    if (expiringWithin30Days > 0) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Expiration',
        description: `${expiringWithin30Days} secret(s) will expire within 30 days`,
        affectedSecrets: [],
        recommendation: 'Plan rotation for expiring secrets',
      });
    }
    
    if (rotationsDue > 0) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Rotation',
        description: `${rotationsDue} secret(s) are due for rotation`,
        affectedSecrets: [],
        recommendation: 'Rotate secrets that are due',
      });
    }
    
    if (deniedAccesses > 0) {
      findings.push({
        severity: 'LOW',
        category: 'Access',
        description: `${deniedAccesses} access denial(s) in the period`,
        affectedSecrets: [],
        recommendation: 'Review access denials for potential security issues',
      });
    }
    
    // Check for secrets without expiration
    const secretsWithoutExpiration = await this.db.secret_secrets.count({
      where: {
        ...where,
        expiresAt: null,
        type: {
          in: ['CERTIFICATE', 'OAUTH2_TOKEN'], // These should have expiration
        },
      },
    });
    
    if (secretsWithoutExpiration > 0) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Configuration',
        description: `${secretsWithoutExpiration} certificate/OAuth token(s) without expiration date`,
        affectedSecrets: [],
        recommendation: 'Set expiration dates for certificates and OAuth tokens',
      });
    }
    
    return {
      generatedAt: new Date(),
      period: {
        start: params.startDate,
        end: params.endDate,
      },
      summary: {
        totalSecrets,
        activeSecrets,
        expiredSecrets,
        expiringWithin30Days,
        rotationsDue,
        deletedSecrets,
      },
      accessReport: {
        totalAccesses,
        uniqueUsers: uniqueUsersResult.length,
        accessesByScope,
        accessesByModule,
        deniedAccesses,
      },
      findings,
    };
  }
}

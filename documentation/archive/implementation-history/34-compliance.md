# Compliance Module

**Category:** Productivity & Workflow  
**Location:** `src/core/compliance/`  
**Last Updated:** 2025-01-27

---

## Overview

The Compliance Module provides compliance and audit trail management for the Coder IDE. It includes compliance reporting, policy enforcement, certification tracking, immutable audit logging, and retention policy management.

## Purpose

- Compliance reporting
- Policy enforcement
- Certification tracking
- Immutable audit logging
- Access logging
- Change tracking
- Retention policies
- Compliance dashboards

---

## Key Components

### 1. Compliance Reporter (`ComplianceReporter.ts`)

**Location:** `src/core/compliance/ComplianceReporter.ts`

**Purpose:** Generate compliance reports

**Report Types:**
- `soc2` - SOC 2 compliance
- `iso27001` - ISO 27001 compliance
- `gdpr` - GDPR compliance
- `hipaa` - HIPAA compliance
- `custom` - Custom compliance

**Key Methods:**
```typescript
async generateReport(projectId: string, reportType: ReportType, period: Period, startDate: Date, endDate: Date): Promise<ComplianceReport>
```

### 2. Policy Enforcer (`PolicyEnforcer.ts`)

**Location:** `src/core/compliance/PolicyEnforcer.ts`

**Purpose:** Enforce compliance policies

**Enforcement Modes:**
- `warn` - Warning only
- `block` - Block action
- `audit` - Audit only

**Key Methods:**
```typescript
async createPolicy(name: string, policyType: string, rules: Record<string, any>, options?: PolicyOptions): Promise<CompliancePolicy>
async checkPolicy(policyId: string, resourceType: string, resourceId: string, context: PolicyContext): Promise<PolicyCheckResult>
```

### 3. Certification Tracker (`CertificationTracker.ts`)

**Location:** `src/core/compliance/CertificationTracker.ts`

**Purpose:** Track compliance certifications

**Certification Types:**
- `SOC2` - SOC 2
- `ISO27001` - ISO 27001
- `GDPR` - GDPR
- `HIPAA` - HIPAA

**Key Methods:**
```typescript
async addCertification(certification: Omit<ComplianceCertification, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceCertification>
async getCertifications(projectId?: string): Promise<ComplianceCertification[]>
```

### 4. Immutable Audit Logger (`ImmutableAuditLogger.ts`)

**Location:** `src/core/compliance/ImmutableAuditLogger.ts`

**Purpose:** Immutable audit logging

**Features:**
- Append-only logs
- Cryptographic hashing
- Tamper detection
- Full audit trail

### 5. Access Logger (`AccessLogger.ts`)

**Location:** `src/core/compliance/AccessLogger.ts`

**Purpose:** Access logging

**Features:**
- Access event logging
- User tracking
- Resource tracking
- Access patterns

### 6. Change Tracker (`ChangeTracker.ts`)

**Location:** `src/core/compliance/ChangeTracker.ts`

**Purpose:** Track code changes

**Features:**
- Change logging
- Before/after state
- Change attribution
- Change history

### 7. Retention Policy Manager (`RetentionPolicyManager.ts`)

**Location:** `src/core/compliance/RetentionPolicyManager.ts`

**Purpose:** Retention policy management

**Features:**
- Policy definition
- Automatic archiving
- Data retention
- Compliance with regulations

### 8. Compliance Dashboard Generator (`ComplianceDashboardGenerator.ts`)

**Location:** `src/core/compliance/ComplianceDashboardGenerator.ts`

**Purpose:** Generate compliance dashboards

**Features:**
- Compliance metrics
- Certification status
- Policy violations
- Audit readiness

---

## Compliance Reports

### Report Model

```typescript
interface ComplianceReport {
  id: string;
  projectId?: string;
  reportType: 'soc2' | 'iso27001' | 'gdpr' | 'hipaa' | 'custom';
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  findings: {
    compliant: number;
    nonCompliant: number;
    partial: number;
    details: FindingDetail[];
  };
  status: 'compliant' | 'non_compliant' | 'partial';
  generatedAt: Date;
  generatedBy?: string;
}
```

---

## Policy Enforcement

### Policy Model

```typescript
interface CompliancePolicy {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  policyType: string;
  rules: Record<string, any>;
  enabled: boolean;
  enforcementMode: 'warn' | 'block' | 'audit';
}
```

### Policy Check

```typescript
// Check policy
const result = await enforcer.checkPolicy(
  policyId,
  'project',
  projectId,
  {
    userId: userId,
    action: 'delete',
    data: {...},
  }
);

if (!result.allowed) {
  // Handle violation
  console.error('Policy violation:', result.violation);
}
```

---

## Certification Tracking

### Certification Model

```typescript
interface ComplianceCertification {
  id: string;
  projectId?: string;
  certificationType: 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | string;
  status: 'not_certified' | 'in_progress' | 'certified' | 'expired';
  issuedDate?: Date;
  expiryDate?: Date;
  certifyingBody?: string;
  certificateNumber?: string;
  evidence?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Audit Logging

### Immutable Logs

- **Append-Only** - Logs cannot be modified
- **Cryptographic Hashing** - Each log entry hashed
- **Tamper Detection** - Detect any modifications
- **Full Audit Trail** - Complete history

### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId?: string;
  agentId?: string;
  beforeState?: any;
  afterState?: any;
  timestamp: Date;
  hash: string; // Cryptographic hash
}
```

---

## Retention Policies

### Retention Policy

```typescript
interface RetentionPolicy {
  id: string;
  projectId?: string;
  name: string;
  resourceType: string;
  retentionPeriod: number; // Days
  action: 'archive' | 'delete';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Policy Application

```typescript
// Create retention policy
const policy = await retentionManager.createPolicy({
  name: 'Audit Log Retention',
  resourceType: 'audit_log',
  retentionPeriod: 2555, // 7 years
  action: 'archive',
  enabled: true,
});

// Policy automatically archives/deletes after retention period
```

---

## Usage Examples

### Generate Compliance Report

```typescript
// Generate SOC 2 report
const report = await reporter.generateReport(
  projectId,
  'soc2',
  'quarterly',
  startDate,
  endDate
);

console.log(`Compliance Status: ${report.status}`);
console.log(`Compliant: ${report.findings.compliant}`);
console.log(`Non-Compliant: ${report.findings.nonCompliant}`);
```

### Enforce Policy

```typescript
// Create policy
const policy = await enforcer.createPolicy(
  'Data Retention Policy',
  'data_retention',
  {
    maxRetentionDays: 90,
    requireApproval: true,
  },
  {
    enforcementMode: 'block',
  }
);

// Check policy
const result = await enforcer.checkPolicy(
  policy.id,
  'data',
  dataId,
  { userId, action: 'delete' }
);
```

### Track Certification

```typescript
// Add certification
const cert = await tracker.addCertification({
  projectId: projectId,
  certificationType: 'SOC2',
  status: 'certified',
  issuedDate: new Date('2025-01-01'),
  expiryDate: new Date('2026-01-01'),
  certifyingBody: 'Audit Firm',
  certificateNumber: 'SOC2-2025-001',
});
```

---

## Related Modules

- **Audit Logging Module** - Audit trail
- **Database Module** - Data retention
- **Access Control Module** - Policy enforcement

---

## Summary

The Compliance Module provides comprehensive compliance and audit trail management for the Coder IDE. With compliance reporting, policy enforcement, certification tracking, immutable audit logging, and retention policies, it enables effective compliance management throughout the development workflow.

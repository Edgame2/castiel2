# Security Scanning Module - Architecture

## Overview

The Security Scanning module provides security scanning and PII detection capabilities for the Castiel system. It scans content for PII, secrets, and vulnerabilities, and provides redaction and field-level security features.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `security_scans` | `/tenantId` | Security scan results |
| `security_pii_detections` | `/tenantId` | PII detection results |
| `security_device_tracking` | `/tenantId` | Device tracking data |

## Service Architecture

### Core Services

1. **SecurityScanningService** - Security scanning orchestration
   - PII detection and redaction
   - Secret scanning
   - Vulnerability scanning
   - Field-level security
   - Device security tracking
   - Password history management
   - Rate limiting

## Integration Points

- **auth**: Authentication and device tracking
- **secret-management**: Secret scanning
- **shard-manager**: Shard access for scanning

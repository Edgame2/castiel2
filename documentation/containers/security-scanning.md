# security-scanning

Full specification for the Security Scanning container.

## 1. Reference

### Purpose

PII detection/redaction, field-level security, device tracking, password history, rate limiting. Operational/runtime security.

### Configuration

From `config/default.yaml`: server.port (3054), cosmos_db (security_*), services (secret_management, shard_manager, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Scanning, secret management and shard integration. See [containers/security-scanning/openapi.yaml](../../containers/security-scanning/openapi.yaml).

### Events

RabbitMQ for security events. See container logs-events.md.

### Dependencies

- **Downstream:** secret-management, shard-manager, auth, logging, user-management.
- **Upstream:** Gateway.

### Cosmos DB containers

security_* (partition key: tenantId).

---

## 2. Architecture

PII/field/device/rate-limit services, Cosmos, event consumers. [containers/security-scanning/README.md](../../containers/security-scanning/README.md).

---

## 3. Deployment

- **Port:** 3054. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `security-scanning`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/security-scanning/README.md](../../containers/security-scanning/README.md)
- [containers/security-scanning/config/default.yaml](../../containers/security-scanning/config/default.yaml)
- [containers/security-scanning/openapi.yaml](../../containers/security-scanning/openapi.yaml)

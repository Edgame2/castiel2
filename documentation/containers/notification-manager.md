# notification-manager

Full specification for the Notification Manager container.

## 1. Reference

### Purpose

Multi-channel notifications: in-app, email (SendGrid/SMTP/SES). Event-driven from RabbitMQ. Consumes auth emails, anomaly.detected for BI Risk alerts.

### Configuration

From `config/default.yaml`: server.port (3001 internal; host 3015 in docker-compose), cosmos_db for notification state, services (user_management, secret_management, logging), rabbitmq bindings, email provider config.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `USER_MANAGEMENT_URL`, `SECRET_MANAGEMENT_URL`, `LOGGING_URL`, email provider vars (SENDGRID_*, SMTP_*, etc.).

### API

Notification send, templates, delivery tracking, quiet hours, webhooks. See [containers/notification-manager/openapi.yaml](../../containers/notification-manager/openapi.yaml). Gateway routes /api/notifications/*.

### Events

- **Consumed:** auth.* (password reset, verification), user.*, anomaly.detected, etc.
- **Published:** (optional) notification.sent, notification.failed.

### Dependencies

- **Downstream:** user-management, secret-management, logging; email/SMS/push providers.
- **Upstream:** auth, user-management, secret-management, collaboration-service; api-gateway proxies.

### Cosmos DB containers

Notification state containers (partition key: tenantId). See config.

---

## 2. Architecture

Notification router, template engine, provider adapters (email, push, SMS, etc.), event consumers, Cosmos. [containers/notification-manager/README.md](../../containers/notification-manager/README.md).

---

## 3. Deployment

- **Port:** 3015 (host) → 3001 (container). **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `notification-manager`.

---

## 4. Security / tenant isolation

X-Tenant-ID from events; tenant-scoped state; secrets from secret-management.

---

## 5. Links

- [containers/notification-manager/README.md](../../containers/notification-manager/README.md)
- [containers/notification-manager/config/default.yaml](../../containers/notification-manager/config/default.yaml)
- [containers/notification-manager/openapi.yaml](../../containers/notification-manager/openapi.yaml)

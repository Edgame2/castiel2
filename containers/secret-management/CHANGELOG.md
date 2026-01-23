# Changelog

All notable changes to the Secret Management Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-22

### Added
- Initial release of Secret Management Service
- Core secret CRUD operations with encryption
- Support for 9 secret types (API_KEY, OAUTH2_TOKEN, USERNAME_PASSWORD, CERTIFICATE, SSH_KEY, CONNECTION_STRING, JSON_CREDENTIAL, ENV_VARIABLE_SET, GENERIC)
- Hierarchical scoping (GLOBAL, ORGANIZATION, TEAM, PROJECT, USER)
- Access control with RBAC and explicit grants
- Version history and rollback
- Soft delete with 30-day recovery period
- Expiration tracking and notifications
- Manual and automatic rotation
- Usage tracking
- AES-256-GCM encryption with key rotation
- Local encrypted backend
- Backend factory pattern for multiple storage backends
- Vault configuration service
- Health checking
- Import/Export (.env and JSON formats)
- Migration between backends
- Comprehensive audit logging
- Compliance reporting
- Event publishing to RabbitMQ
- Integration with Logging Service
- YAML configuration files with schema validation
- OpenAPI specification generation
- Service-to-service authentication

### Security
- All secrets encrypted at rest with AES-256-GCM
- Master key encryption for encryption keys
- Never log secret values
- Complete audit trail
- Access control enforcement
- Input validation on all endpoints

### Configuration
- YAML-based configuration (config/default.yaml)
- Environment variable support
- Schema validation
- Environment-specific overrides (production.yaml, test.yaml)

### Documentation
- Complete API documentation (OpenAPI 3.0.3)
- README with setup and usage instructions
- CHANGELOG for version history

---

## [Unreleased]

### Planned
- Azure Key Vault backend implementation
- AWS Secrets Manager backend implementation
- HashiCorp Vault backend implementation
- GCP Secret Manager backend implementation
- Automatic secret rotation handlers
- Secret sharing between organizations
- Secret templates
- Bulk operations API
- GraphQL API support




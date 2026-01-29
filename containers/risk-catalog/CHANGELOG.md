# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added
- **W7 Gap 1 – Risk Catalog integration (Layer 2):** `getTenantCatalog(tenantId, industry?, stage?)` on RiskCatalogService returning `TenantCatalogView` (tenantRiskCategories, categoryDefinitions, riskTemplates, industrySpecificRisks, methodologyRisks). Types: `RiskDefinition`, `RiskTemplateView`, `TenantCatalogView`. `GET /api/v1/risk-catalog/tenant-catalog?industry=&stage=` for ml-service extractRiskCatalogFeatures.

## [1.0.0] - 2026-01-23

### Added
- Initial migration from old_code/
- Core functionality

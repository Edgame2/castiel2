# Changelog

All notable changes to this module will be documented in this file.

## [1.1.0] - 2026-01-23

### Fixed
- **Routes**: `error: any` → `error: unknown`; statusCode/message via type guards in get metrics, record metric, detect anomaly, get anomalies.
- **QualityMonitoringService**: `error: any` → `error: unknown` in detectAnomaly, recordMetric; recordMetric rethrows on failure.

## [1.0.0] - 2026-01-23

### Added
- Quality monitoring service
- Anomaly detection
- Explanation quality assessment
- Explanation monitoring
- Explainable AI generation
- Data quality validation
- Integration with ai-service, ml-service, and analytics-service

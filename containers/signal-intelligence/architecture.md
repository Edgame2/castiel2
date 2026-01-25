# Signal Intelligence Module - Architecture

## Overview

The Signal Intelligence module provides signal analysis and intelligence for the Castiel system. It analyzes communications, calendar patterns, social signals, product usage, competitive intelligence, and customer success data.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `signal_communications` | `/tenantId` | Communication analysis data |
| `signal_calendar` | `/tenantId` | Calendar intelligence data |
| `signal_social` | `/tenantId` | Social signal data |

## Service Architecture

### Core Services

1. **SignalIntelligenceService** - Signal intelligence orchestration
   - Communication analysis
   - Calendar intelligence
   - Social signal monitoring
   - Product usage integration
   - Competitive intelligence
   - Customer success integration

## Integration Points

- **ai-service**: AI-powered analysis
- **analytics-service**: Analytics
- **integration-manager**: Integration access

# Prompt Service Module

Prompt management and A/B testing service.

**Service**: `containers/prompt-service/`  
**Port**: 3036  
**API Base**: `/api/v1/prompts`  
**Database**: Cosmos DB NoSQL (containers: `prompt_prompts`, `prompt_ab_tests`, `prompt_analytics`)

## Overview

The Prompt Service module provides prompt management, A/B testing, and analytics.

## Features

- Prompt CRUD operations
- A/B testing
- Prompt analytics

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/prompt-service/README.md)

## Dependencies

- AI Service (for prompt execution)
- Logging (for audit logging)


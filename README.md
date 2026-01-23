# Castiel

**AI-Native Business Intelligence Platform**

Castiel is a comprehensive AI-native business intelligence platform that unifies business data from multiple sources and provides intelligent, predictive insights to help businesses make better decisions.

## Main Goal

The crucial main goal is to build a comprehensive AI-native business intelligence platform that unifies business data from multiple sources and provides intelligent, predictive insights to help businesses make better decisions. The platform combines LLM-powered natural language understanding with machine learning predictions to deliver actionable intelligence.

## Core Platform Status

The platform is production-ready with:

- **100+ operational services** handling authentication, data integration, AI insights, risk analysis, analytics, and collaboration
- **Integrations** with Salesforce, Google Drive, Slack, Zoom, Gong, Microsoft 365, and more
- **Multi-tenant architecture** with enterprise-grade security
- **Real-time AI insights** using Multiple LLMs (GPT-4, Claude)
- **Rule-based and LLM-powered risk evaluation**

## Critical ML Enhancement Goal

The immediate critical goal is to enhance the platform with a **Machine Learning system** focused on three priority use cases that provide the highest business value:

### 1. Risk Scoring ⭐

**ML-powered risk prediction to identify opportunities at risk**

- Predicts risk scores (0-1 scale) for opportunities
- Category-specific risk scores (Commercial, Technical, Financial, Legal, Competitive, Operational)
- Multi-level aggregation (opportunity → account → team → tenant)
- Proactively identifies at-risk opportunities before they're lost

### 2. Revenue Forecasting ⭐

**Predictive revenue forecasting across multiple levels**

- Opportunity-level revenue forecasts with uncertainty quantification
- Team-level pipeline and win rate forecasts
- Tenant-level total revenue and growth rate forecasts
- Predicts future revenue with confidence intervals, not just probability-weighted estimates

### 3. Recommendations ⭐

**Intelligent next-best-action recommendations**

- ML-enhanced recommendation system for better personalization
- Context-aware recommendations
- Guides users to the most impactful actions based on learned patterns

## What Makes This Crucial

The ML enhancement is crucial because it transforms the platform from **reactive** (analyzing what happened) to **predictive** (anticipating what will happen):

- **Risk Scoring**: Proactively identify at-risk opportunities before they're lost
- **Revenue Forecasting**: Predict future revenue with confidence intervals, not just probability-weighted estimates
- **Recommendations**: Guide users to the most impactful actions based on learned patterns

## Architecture Approach - Compound AI System (CAIS)

The system is designed as a **Compound AI System** that orchestrates multiple AI components:

- **ML Models** - Learn patterns from historical data and make predictions
- **LLMs** - Explain predictions, generate natural language, provide reasoning
- **Rules/Heuristics** - Enforce business logic and constraints
- **Feedback Loops** - Continuously improve through user feedback and outcome tracking

This creates a complete decision loop: **Prediction → Reasoning → Action → Feedback → Learning**

## Technical Implementation Strategy

Using **Azure ML Workspace** for managed training and **Azure ML Managed Endpoints** for serving to create a simple, maintainable solution optimized for a small team:

- Maximize use of Azure managed services (no custom infrastructure)
- AutoML for automated model selection and training
- Unified monitoring through Application Insights
- Start with global models, add industry-specific models only when justified by data

## Key Features

- **Data Unification**: Integrates data from Salesforce, Google Drive, Slack, Zoom, Gong, Microsoft 365, and more
- **Predictive Intelligence**: ML-powered risk scoring, revenue forecasting, and recommendations
- **AI-Powered Insights**: Proactive insights and risk analysis with natural language explanations
- **Sales Pipeline Management**: Complete opportunity lifecycle management with pipeline analytics
- **Enterprise Security**: Multi-tenant architecture with tenant isolation and RBAC
- **Real-Time Collaboration**: Team collaboration features and messaging

## Documentation

Comprehensive documentation is available in the [`documentation/`](./documentation/) directory:

- [System Documentation](./documentation/README.md) - Complete system documentation
- [System Purpose](./documentation/global/SystemPurpose.md) - System goals and vision
- [Architecture](./documentation/global/Architecture.md) - System architecture
- [CAIS Overview](./documentation/global/CAIS_OVERVIEW.md) - Compound AI System architecture
- [ML Service](./documentation/modules/extensions/ml-service/) - Machine learning capabilities

## Quick Start

See the [Setup Guide](./documentation/guides/setup-guide.md) for complete setup instructions.

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Fastify, Node.js, TypeScript
- **Database**: Azure Cosmos DB NoSQL
- **ML**: Azure ML Workspace, Azure ML Managed Endpoints
- **AI**: GPT-4, Claude, Multiple LLMs
- **Infrastructure**: Docker, RabbitMQ, Redis

## License

Proprietary

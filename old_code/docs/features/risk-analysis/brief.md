Product Requirements Document (PRD)
1. Product Overview
1.1 Product Vision

The product aims to provide risk-aware revenue intelligence for B2B sales organizations. It enables companies to proactively identify, quantify, mitigate, and forecast risks across their opportunity pipeline, while aligning revenue forecasts with sales goals and quotas.

The platform goes beyond traditional CRM by combining:

Opportunity-level risk detection

Risk-adjusted revenue forecasting

Explainable AI-driven recommendations

Portfolio, team, and executive-level visibility

1.2 Target Users

Sales Representatives – Manage individual opportunities and mitigate risks

Sales Managers – Monitor team performance, risks, and forecasts

Sales Leadership / RevOps – Strategic forecasting, quota planning, trend analysis

Tenant Administrators – Configure risks, weights, thresholds, and integrations

1.3 Key Outcomes

Reduced deal slippage

Improved forecast accuracy

Earlier risk detection

Better quota attainment predictability

Increased organizational learning from historical data

2. Core Concepts & Definitions

Opportunity: A potential revenue-generating deal

Risk: Any factor that negatively impacts deal value, probability, or timing

Shard: A logical, tenant-isolated data unit (Opportunity, Company, Industry, Product, Contract, Stakeholder, etc.)

Risk Ponderation: Weight representing the relative impact of a risk

Revenue at Risk: Portion of deal value likely to be lost due to identified risks

Risk Score: Aggregated weighted score representing overall deal risk

3. Opportunity Risk Management
3.1 Risk Identification
Functional Requirements

The system must automatically identify risks for every opportunity.

Risks must be detected using:

Opportunity attributes (stage, amount, duration, stakeholders)

Related shards (company, industry, product, contract, stakeholders)

Historical patterns from similar opportunities

Risk Metadata

Each risk must include:

Unique ID

Name

Description

Category (Commercial, Technical, Legal, Financial, Competitive, Operational)

Source shard(s)

Default ponderation

Confidence score

Explainability summary

3.2 Risk Catalogs
Supported Catalog Levels

Global risk catalog (platform-defined)

Industry-specific risk catalogs

Tenant-specific custom risks

Administration

Tenant admins must be able to:

Create, edit, enable, disable custom risks

Override default ponderations

Assign risks to industries or opportunity types

Governance

Risks must be versioned

Historical evaluations must remain immutable

3.3 Risk Weighting & Scoring

Each risk must have a configurable ponderation

Risk score calculation must:

Support overrides by industry and tenant

Be deterministic and reproducible

The system must expose:

Individual risk contributions

Aggregated risk score

4. Revenue at Risk & Forecasting
4.1 Revenue at Risk

The system must compute revenue at risk per opportunity using:

Deal value

Risk score

Historical win/loss ratios

Revenue at risk must roll up to:

Portfolio

Team

Tenant

4.2 Closing Timeline Estimation

The system must estimate expected close date using:

Historical closing times

Industry benchmarks

Current risk profile

Timeline estimates must dynamically update

4.3 Forecast Scenarios

Support multiple forecast views:

Best case

Base case

Worst case

Forecasts must incorporate risk-adjusted revenue

5. Risk Mitigation & Recommendations
5.1 Next Best Actions

For each opportunity, the system must recommend actions to reduce risk

Recommendations must be:

Risk-specific

Explainable

Prioritized by impact

Examples:

Engage additional stakeholder

Accelerate legal review

Offer technical validation

5.2 Human-in-the-Loop Controls

Users must be able to:

Acknowledge risks

Dismiss risks

Adjust risk relevance

All overrides must be audited

6. Portfolio, Team & Manager Visibility
6.1 Portfolio Overview

Users must see aggregated risk across all owned opportunities

Views must include:

Total revenue at risk

Risk distribution by category

High-risk opportunities

6.2 Manager Views

Managers must access all team opportunities

Managers must identify:

Systemic risks

Rep-level risk exposure

Forecast gaps

7. Early-Warning & Proactive Controls
7.1 Early-Warning Signals

The system should detect:

Stage stagnation

Activity drop

Stakeholder churn

Risk score acceleration

Each signal must include severity and explanation.

7.2 Alerts & Notifications

Configurable alerts for:

Risk threshold breaches

Revenue-at-risk thresholds

Forecast deviations

Delivery channels:

In-app

Email

Webhooks

8. Risk Simulation & What-If Analysis

Users must simulate scenarios without affecting production data

Simulations must support:

Risk removal/addition

Weight changes

Deal parameter adjustments

Simulation outputs:

Updated risk score

Revenue at risk

Closing timeline

9. Benchmarking & Trend Intelligence
9.1 Historical Analytics

The system must analyze:

Win rates by industry

Average closing time

Deal size distribution

Deal size vs company revenue

9.2 Renewal Intelligence

Estimate renewal revenue

Estimate renewal close probability

Identify renewal risk factors

9.3 Peer Benchmarking (Optional)

Provide anonymized benchmarks

Tenant opt-in required

No cross-tenant data leakage

10. Sales Goals, Quotas & Performance
10.1 Quota Management

Support quotas by:

Individual

Team

Time period

Quotas must roll up hierarchically

10.2 Performance Tracking

Track:

Actual vs target

Forecasted attainment

Risk-adjusted attainment

11. Risk Lifecycle & Ownership

Risks must support lifecycle states:

Identified

Acknowledged

Mitigated

Accepted

Closed

Each risk must have an owner

12. Explainability, Audit & Compliance

Every score and recommendation must be explainable

Full audit trail required

Historical snapshots must be preserved

13. Non-Functional Requirements
13.1 Architecture

Multi-tenant with strict isolation

Shard-based data model

Horizontally scalable

13.2 AI & Data

Tenant-scoped embeddings

Explainable AI only

Clear separation between training and inference data

14. Extensibility

Custom risk rules per tenant

External scoring engine integration

Public risk engine API contracts

15. Success Metrics

Forecast accuracy improvement

Reduction in deal slippage

Risk mitigation adoption rate

Quota attainment predictability

16. Out of Scope (Initial Phase)

Automated deal execution

Pricing approvals

Contract generation

17. Advanced Features

Cross-opportunity dependency modeling

Advanced causal AI

Prescriptive quota optimization
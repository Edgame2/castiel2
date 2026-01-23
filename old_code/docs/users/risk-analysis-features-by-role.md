# Risk Analysis Features by Role

**Last Updated**: 2025-01-28  
**Status**: Active Documentation

This document outlines the risk analysis features available to each user role in the Castiel system. Features are organized by role hierarchy, with each role building upon the capabilities of the previous level.

---

## Table of Contents

1. [User Role](#user-role)
2. [Manager Role](#manager-role)
3. [Director Role](#director-role)
4. [Feature Comparison Matrix](#feature-comparison-matrix)

---

## User Role

**Scope**: Individual opportunities and personal portfolio  
**Focus**: Day-to-day opportunity management and risk mitigation

### Opportunity-Level Risk Analysis

#### Risk Identification & Evaluation
- ✅ **View Risk Analysis Tab**: Access risk analysis for all assigned opportunities
- ✅ **Real-time Risk Detection**: Automatic risk identification using:
  - Rule-based detection
  - AI-powered pattern matching
  - Historical pattern matching
- ✅ **Risk Details View**: See individual risks with:
  - Risk name and description
  - Category (Commercial, Technical, Legal, Financial, Competitive, Operational)
  - Confidence score
  - Explainability summary
  - Source shards (company, industry, product, etc.)
- ✅ **Risk Score**: View weighted risk score for each opportunity
- ✅ **Risk Timeline**: See risk evolution over time

#### Revenue at Risk
- ✅ **Opportunity-Level Revenue at Risk**: View calculated revenue at risk for individual opportunities
- ✅ **Risk-Adjusted Forecast**: See best case, base case, and worst case scenarios
- ✅ **Closing Timeline Estimation**: View expected close date based on risk profile

#### Risk Mitigation
- ✅ **Mitigation Actions**: View AI-recommended actions to reduce risk
- ✅ **Action Prioritization**: See actions prioritized by impact
- ✅ **Risk Acknowledgment**: Acknowledge identified risks
- ✅ **Risk Dismissal**: Dismiss risks with audit trail
- ✅ **Risk Relevance Adjustment**: Adjust risk relevance for specific opportunities
- ✅ **Mitigation Tracking**: Track progress on mitigation actions

#### Early Warning Signals
- ✅ **Personal Early Warnings**: Receive alerts for own opportunities:
  - Stage stagnation detection
  - Activity drop alerts
  - Stakeholder churn notifications
  - Risk score acceleration warnings
- ✅ **Warning Details**: View evidence and supporting data for each warning
- ✅ **Warning Severity**: See severity levels for each warning

#### Risk Simulation
- ✅ **Run Simulations**: Create "what-if" scenarios for own opportunities
- ✅ **Scenario Configuration**: Adjust:
  - Deal parameters (value, probability, close date)
  - Risk weights
  - Add/remove risks
- ✅ **Simulation Results**: View updated:
  - Risk score
  - Revenue at risk
  - Closing timeline
- ✅ **Compare Scenarios**: Compare multiple scenarios side-by-side
- ✅ **AI Recommendations**: Get actionable recommendations based on simulation results

#### Portfolio View
- ✅ **Personal Portfolio Overview**: View aggregated risk across all owned opportunities
- ✅ **Total Revenue at Risk**: See total revenue at risk for personal portfolio
- ✅ **Risk Distribution**: View risk distribution by category
- ✅ **High-Risk Opportunities**: Identify high-risk opportunities in portfolio
- ✅ **Portfolio Risk Score**: See overall portfolio risk score

#### Benchmarking
- ✅ **Personal Benchmarks**: Compare own performance against:
  - Tenant benchmarks
  - Industry benchmarks
  - Win rates
  - Closing times
  - Deal sizes

#### Access & Permissions
- ✅ **Own Opportunities**: Full access to risk analysis for assigned opportunities
- ✅ **Read-Only Integration Access**: View available integrations
- ✅ **Search Integrations**: Search for integration options

---

## Manager Role

**Scope**: Team opportunities and team performance  
**Focus**: Team oversight, coaching, and forecast management

### All User Features
- ✅ **Inherits all User role features** for personal opportunities

### Team-Level Risk Analysis

#### Team Portfolio View
- ✅ **Team Portfolio Overview**: View aggregated risk across all team member opportunities
- ✅ **Team Revenue at Risk**: See total revenue at risk for entire team
- ✅ **Team Risk Distribution**: View risk distribution by category across team
- ✅ **Rep-Level Risk Exposure**: Identify individual team member risk exposure
- ✅ **Team Risk Score**: See overall team risk score

#### Team Opportunity Access
- ✅ **Read Team Opportunities**: Access risk analysis for all team member opportunities
- ✅ **Team Opportunity Filtering**: Filter by team member, stage, risk level
- ✅ **Team Risk Dashboard**: View team-wide risk metrics and KPIs

#### Systemic Risk Identification
- ✅ **Systemic Risk Detection**: Identify risks affecting multiple team opportunities
- ✅ **Pattern Recognition**: See patterns across team opportunities
- ✅ **Risk Trend Analysis**: View risk trends over time for team

#### Forecast Management
- ✅ **Team Forecast Views**: Access team-level forecasts:
  - Best case scenario
  - Base case scenario
  - Worst case scenario
- ✅ **Forecast Gap Analysis**: Identify gaps between forecast and quota
- ✅ **Risk-Adjusted Team Forecast**: See team forecast adjusted for risk
- ✅ **Forecast Accuracy Tracking**: Track forecast accuracy over time

#### Quota Management
- ✅ **Team Quota View**: View team quotas and performance
- ✅ **Quota Performance Tracking**: Track team quota attainment
- ✅ **Risk-Adjusted Attainment**: See quota attainment adjusted for revenue at risk
- ✅ **Quota Forecasting**: View forecasted quota attainment

#### Team Early Warnings
- ✅ **Team Early Warnings**: Receive alerts for team opportunities
- ✅ **Warning Aggregation**: See aggregated warnings across team
- ✅ **Warning Prioritization**: Prioritize warnings by severity and impact
- ✅ **Team Member Alerts**: View which team members have active warnings

#### Team Benchmarking
- ✅ **Team Benchmarks**: Compare team performance against:
  - Tenant benchmarks
  - Industry benchmarks
  - Historical team performance
- ✅ **Rep Performance Comparison**: Compare individual team member performance
- ✅ **Team Win Rate Analysis**: Analyze team win rates by stage, industry, etc.

#### Team Risk Simulation
- ✅ **Team Scenario Planning**: Run simulations for team opportunities
- ✅ **What-If Analysis**: Analyze impact of risk changes across team portfolio
- ✅ **Resource Planning**: Use simulations for resource allocation decisions

#### Team Management
- ✅ **Team Member Access**: View team member profiles and activity
- ✅ **Team Dashboard**: Access team-level dashboards
- ✅ **Team Pipeline View**: View team pipeline with risk indicators

#### Access & Permissions
- ✅ **Team Shard Access**: Read access to team member shards
- ✅ **Team Dashboard Access**: Access to team dashboards
- ✅ **Team Quota Access**: Read access to team quotas
- ✅ **Team Pipeline Access**: Read access to team pipeline data
- ✅ **Team Risk Access**: Read access to team risk data

---

## Director Role

**Scope**: Cross-team, department, and strategic visibility  
**Focus**: Strategic planning, executive reporting, and organizational risk management

### All Manager Features
- ✅ **Inherits all Manager role features** for team management

### Strategic Risk Analysis

#### Multi-Team & Department Views
- ✅ **Department Portfolio View**: View aggregated risk across multiple teams
- ✅ **Cross-Team Risk Analysis**: Analyze risks across different teams
- ✅ **Department Revenue at Risk**: See total revenue at risk for entire department
- ✅ **Team Comparison**: Compare risk profiles across different teams
- ✅ **Department Risk Score**: See overall department risk score

#### Executive Dashboard
- ✅ **Executive Risk Dashboard**: Access high-level risk dashboard with:
  - Total revenue at risk (department/tenant level)
  - Risk distribution by category
  - Top risk opportunities
  - Risk trend analysis
  - Forecast vs. actual comparisons
- ✅ **Strategic Risk Metrics**: View strategic KPIs:
  - Risk-adjusted revenue forecast
  - Quota attainment probability
  - Deal slippage risk
  - Portfolio health score

#### Strategic Forecasting
- ✅ **Department Forecast Views**: Access department-level forecasts:
  - Best case scenario
  - Base case scenario
  - Worst case scenario
- ✅ **Multi-Period Forecasting**: View forecasts across multiple time periods
- ✅ **Forecast Variance Analysis**: Analyze forecast variances across teams
- ✅ **Strategic Planning Tools**: Use forecasts for strategic planning

#### Quota Planning & Management
- ✅ **Department Quota View**: View department quotas and performance
- ✅ **Quota Planning**: Plan and allocate quotas across teams
- ✅ **Quota Performance Analysis**: Analyze quota performance across teams
- ✅ **Risk-Adjusted Quota Planning**: Plan quotas accounting for revenue at risk
- ✅ **Quota Optimization**: Optimize quota allocation based on risk analysis

#### Organizational Risk Intelligence
- ✅ **Organizational Risk Patterns**: Identify risk patterns across organization
- ✅ **Industry Risk Analysis**: Analyze risks by industry vertical
- ✅ **Product Risk Analysis**: Analyze risks by product line
- ✅ **Geographic Risk Analysis**: Analyze risks by region/territory
- ✅ **Customer Segment Risk**: Analyze risks by customer segment

#### Advanced Benchmarking
- ✅ **Organizational Benchmarks**: Compare organization performance against:
  - Industry benchmarks
  - Peer benchmarks (if available)
  - Historical organizational performance
- ✅ **Cross-Team Benchmarking**: Compare teams against each other
- ✅ **Benchmark Trend Analysis**: Track benchmark performance over time
- ✅ **Competitive Intelligence**: Use benchmarks for competitive analysis

#### Strategic Risk Simulation
- ✅ **Strategic Scenario Planning**: Run simulations for strategic planning
- ✅ **Portfolio Optimization**: Simulate portfolio changes for optimization
- ✅ **Resource Allocation Simulation**: Simulate resource allocation scenarios
- ✅ **Market Impact Analysis**: Analyze impact of market changes on risk

#### Early Warning & Alerting
- ✅ **Executive Early Warnings**: Receive high-priority alerts for:
  - Critical risk threshold breaches
  - Major forecast deviations
  - Systemic risk identification
  - Strategic opportunity risks
- ✅ **Alert Aggregation**: See aggregated alerts across organization
- ✅ **Alert Prioritization**: Prioritize alerts by strategic impact
- ✅ **Custom Alert Rules**: Configure custom alert rules for strategic risks

#### Reporting & Analytics
- ✅ **Executive Reports**: Generate executive-level risk reports
- ✅ **Risk Trend Reports**: View risk trends over time
- ✅ **Forecast Accuracy Reports**: Track forecast accuracy
- ✅ **Quota Attainment Reports**: Analyze quota attainment patterns
- ✅ **Custom Report Builder**: Create custom risk analysis reports
- ✅ **Report Export**: Export reports in various formats

#### Risk Governance
- ✅ **Risk Policy View**: View organizational risk policies and thresholds
- ✅ **Risk Compliance Monitoring**: Monitor compliance with risk policies
- ✅ **Risk Audit Trail**: Access comprehensive risk audit trails
- ✅ **Risk Configuration Review**: Review risk catalog and weight configurations

#### Access & Permissions
- ✅ **Department Shard Access**: Read access to department-wide shards
- ✅ **Cross-Team Access**: Access to multiple team data
- ✅ **Executive Dashboard Access**: Access to executive dashboards
- ✅ **Department Quota Access**: Read access to department quotas
- ✅ **Strategic Analytics Access**: Access to strategic analytics and reports

---

## Feature Comparison Matrix

| Feature Category | User | Manager | Director |
|-----------------|------|---------|----------|
| **Opportunity Risk Analysis** |
| View own opportunity risks | ✅ | ✅ | ✅ |
| View team opportunity risks | ❌ | ✅ | ✅ |
| View department opportunity risks | ❌ | ❌ | ✅ |
| Risk mitigation actions | ✅ | ✅ | ✅ |
| Risk simulation (own) | ✅ | ✅ | ✅ |
| Risk simulation (team) | ❌ | ✅ | ✅ |
| Risk simulation (strategic) | ❌ | ❌ | ✅ |
| **Portfolio Views** |
| Personal portfolio | ✅ | ✅ | ✅ |
| Team portfolio | ❌ | ✅ | ✅ |
| Department portfolio | ❌ | ❌ | ✅ |
| Cross-team comparison | ❌ | ❌ | ✅ |
| **Revenue at Risk** |
| Own opportunities | ✅ | ✅ | ✅ |
| Team rollup | ❌ | ✅ | ✅ |
| Department rollup | ❌ | ❌ | ✅ |
| **Forecasting** |
| Personal forecast | ✅ | ✅ | ✅ |
| Team forecast | ❌ | ✅ | ✅ |
| Department forecast | ❌ | ❌ | ✅ |
| Strategic planning tools | ❌ | ❌ | ✅ |
| **Quota Management** |
| View own quota | ✅ | ✅ | ✅ |
| View team quota | ❌ | ✅ | ✅ |
| View department quota | ❌ | ❌ | ✅ |
| Quota planning | ❌ | ❌ | ✅ |
| **Early Warnings** |
| Personal warnings | ✅ | ✅ | ✅ |
| Team warnings | ❌ | ✅ | ✅ |
| Executive warnings | ❌ | ❌ | ✅ |
| Custom alert rules | ❌ | ❌ | ✅ |
| **Benchmarking** |
| Personal benchmarks | ✅ | ✅ | ✅ |
| Team benchmarks | ❌ | ✅ | ✅ |
| Organizational benchmarks | ❌ | ❌ | ✅ |
| Cross-team comparison | ❌ | ❌ | ✅ |
| **Reporting** |
| Personal reports | ✅ | ✅ | ✅ |
| Team reports | ❌ | ✅ | ✅ |
| Executive reports | ❌ | ❌ | ✅ |
| Custom report builder | ❌ | ❌ | ✅ |
| **Risk Intelligence** |
| Opportunity-level patterns | ✅ | ✅ | ✅ |
| Team-level patterns | ❌ | ✅ | ✅ |
| Organizational patterns | ❌ | ❌ | ✅ |
| Industry/Product analysis | ❌ | ❌ | ✅ |

---

## Notes

### Role Hierarchy
- **User**: Focuses on individual opportunity management and personal portfolio
- **Manager**: Adds team oversight, coaching, and team-level forecasting
- **Director**: Adds strategic planning, cross-team analysis, and executive reporting

### Permission Model
All features are controlled by the role-based permission system defined in `packages/shared-types/src/roles.ts`. Features are automatically filtered based on user permissions.

### Data Access
- **User**: Can only access own opportunities and personal data
- **Manager**: Can access team member opportunities and team-level aggregations
- **Director**: Can access department-wide data and cross-team analytics

### Feature Availability
All listed features are available in the current implementation. For detailed API documentation, see:
- [Risk Analysis README](../features/risk-analysis/README.md)
- [Risk Analysis PRD](../features/risk-analysis/brief.md)

---

## Related Documentation

- [Risk Analysis Features](../features/risk-analysis/README.md)
- [Role Management](../api/role-management-api-reference.md)
- [User Groups Guide](../guides/user-groups.md)
- [Dashboard System](../features/dashboard/README.md)



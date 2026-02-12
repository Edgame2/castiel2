/**
 * Static mock data for the sales opportunities mockup.
 * No API calls; all data is in memory.
 */

export type Opportunity = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  closeDate: string;
  riskScore: number;
  winProbability: number;
  earlyWarning: boolean;
};

export type ExplainabilityDriver = {
  feature: string;
  contribution: number;
  direction: "increases" | "decreases";
};

export type ReasoningStep = {
  id: string;
  order: number;
  type: string;
  content: string;
  reasoning?: string;
  confidence?: number;
};

export type RiskData = {
  currentRisk: number;
  horizons: { 30: { riskScore: number; confidence: number }; 60: { riskScore: number; confidence: number }; 90: { riskScore: number; confidence: number } };
  velocity: number;
  acceleration: number;
  dataPoints: number;
  topDrivers: ExplainabilityDriver[];
  reasoningSteps: ReasoningStep[];
  conclusion: string;
  similarDeals: {
    count: number;
    winRate: number;
    medianCycleTimeDays: number | null;
    p25CloseAmount: number | null;
  };
};

export type Recommendation = {
  id: string;
  title: string;
  source: string;
  score: number;
  explanation: string;
  description?: string;
  reasoningSteps: ReasoningStep[];
  conclusion?: string;
};

const STAGES = [
  "Prospecting",
  "Qualification",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const NAMES = [
  "Acme Corp - Enterprise Suite",
  "GlobalTech - Cloud Migration",
  "Northwind - ERP Upgrade",
  "Contoso - Security Platform",
  "Fabrikam - Analytics Hub",
  "Adventure Works - CRM",
  "Tailspin - DevOps Suite",
  "Lucerne - Data Lake",
  "A. Datum - AI/ML Platform",
  "Woodgrove - Integration Hub",
  "Consolidated - Legacy Modernization",
  "Margie's Travel - Booking Engine",
  "Southridge - Supply Chain",
  "Fourth Coffee - POS System",
  "Trey Research - IoT Platform",
  "Wingtip - Subscription Billing",
  "Alpine - Field Service",
  "Blue Yonder - Warehouse",
  "Litware - E-commerce",
  "Proseware - Content Management",
];

function genId(prefix: string, i: number): string {
  return `${prefix}-${String(i).padStart(2, "0")}`;
}

export const opportunities: Opportunity[] = NAMES.slice(0, 20).map((name, i) => ({
  id: genId("opp", i + 1),
  name,
  amount: 50000 + (i + 1) * 25000 + Math.floor(Math.random() * 50000),
  stage: STAGES[Math.min(i % 7, STAGES.length - 1)],
  closeDate: new Date(Date.now() + (i + 1) * 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  riskScore: 0.2 + (i % 10) * 0.08 + Math.random() * 0.1,
  winProbability: 0.3 + (i % 8) * 0.08 + Math.random() * 0.15,
  earlyWarning: i % 4 === 0 || i % 5 === 2,
}));

const defaultRiskData: RiskData = {
  currentRisk: 0.45,
  horizons: {
    30: { riskScore: 0.42, confidence: 0.82 },
    60: { riskScore: 0.48, confidence: 0.75 },
    90: { riskScore: 0.55, confidence: 0.7 },
  },
  velocity: 0.008,
  acceleration: 0.001,
  dataPoints: 14,
  topDrivers: [
    { feature: "Days since last activity", contribution: 0.18, direction: "increases" },
    { feature: "Competitor mention in emails", contribution: 0.12, direction: "increases" },
    { feature: "Stakeholder engagement score", contribution: -0.1, direction: "decreases" },
    { feature: "Deal size vs segment median", contribution: 0.08, direction: "increases" },
    { feature: "Stage age (days)", contribution: 0.06, direction: "increases" },
  ],
  reasoningSteps: [
    { id: "r1", order: 1, type: "signal", content: "Last activity > 14 days", reasoning: "No meeting or email in 14 days suggests cooling interest or competing priorities." },
    { id: "r2", order: 2, type: "signal", content: "Competitor mentioned in 2 threads", reasoning: "Competitive pressure increases risk of switch or delay." },
    { id: "r3", order: 3, type: "aggregate", content: "Combined risk band", reasoning: "Signals place this deal in the medium-risk band; trajectory is upward." },
  ],
  conclusion: "Overall risk is moderate and rising. Recommend scheduling a checkpoint call and refreshing champion engagement.",
  similarDeals: {
    count: 47,
    winRate: 0.62,
    medianCycleTimeDays: 38,
    p25CloseAmount: 85000,
  },
};

const defaultRecommendations: Recommendation[] = [
  {
    id: "rec-01",
    title: "Schedule champion checkpoint call",
    source: "Engagement",
    score: 0.92,
    explanation: "No touchpoint in 14 days; a short call can re-engage and surface blockers.",
    description: "Book a 15–20 min call with the primary champion within the next 5 days.",
    reasoningSteps: [
      { id: "s1", order: 1, type: "pattern", content: "Low activity pattern", reasoning: "Deals with >14 days without activity show lower win rates in this segment." },
      { id: "s2", order: 2, type: "action", content: "Checkpoint call impact", reasoning: "Similar deals that had a checkpoint call within 5 days had higher close rates." },
    ],
    conclusion: "This recommendation has the highest impact for the current risk drivers.",
  },
  {
    id: "rec-02",
    title: "Share competitor comparison one-pager",
    source: "Competitive",
    score: 0.78,
    explanation: "Competitor mentions suggest we should reinforce differentiation.",
    reasoningSteps: [
      { id: "s1", order: 1, type: "signal", content: "Competitor mentions", reasoning: "Two recent threads mentioned a competitor; positioning may be unclear." },
      { id: "s2", order: 2, type: "action", content: "One-pager usage", reasoning: "Deals that received a comparison asset had better retention in this stage." },
    ],
    conclusion: "A concise comparison can help the champion defend the decision internally.",
  },
  {
    id: "rec-03",
    title: "Add economic buyer to next meeting",
    source: "Stakeholder",
    score: 0.71,
    explanation: "Economic buyer has not been in the loop for 3 weeks.",
    reasoningSteps: [
      { id: "s1", order: 1, type: "coverage", content: "Economic buyer gap", reasoning: "No economic buyer in recent meetings increases risk of no decision or delay." },
      { id: "s2", order: 2, type: "action", content: "Include in next call", reasoning: "Including the economic buyer in the next checkpoint improves close probability." },
    ],
    conclusion: "Recommend inviting the economic buyer to the checkpoint call.",
  },
];

const riskByOppId: Record<string, RiskData> = {};
const recommendationsByOppId: Record<string, Recommendation[]> = {};

opportunities.forEach((opp, i) => {
  const riskVariation = (i % 5) * 0.05;
  riskByOppId[opp.id] = {
    ...defaultRiskData,
    currentRisk: Math.min(1, Math.max(0, defaultRiskData.currentRisk + riskVariation - 0.1)),
    topDrivers: defaultRiskData.topDrivers,
    reasoningSteps: defaultRiskData.reasoningSteps,
    conclusion: defaultRiskData.conclusion,
    similarDeals: { ...defaultRiskData.similarDeals, count: defaultRiskData.similarDeals.count + (i % 10) },
  };
  recommendationsByOppId[opp.id] = defaultRecommendations.map((r, j) => ({
    ...r,
    id: `${opp.id}-${r.id}`,
    score: Math.min(1, r.score + (j + i) * 0.02),
  }));
});

export function getOpportunity(id: string): Opportunity | undefined {
  return opportunities.find((o) => o.id === id);
}

export function getRiskData(opportunityId: string): RiskData | undefined {
  return riskByOppId[opportunityId] ?? riskByOppId[opportunities[0]?.id];
}

export function getRecommendations(opportunityId: string): Recommendation[] {
  return recommendationsByOppId[opportunityId] ?? recommendationsByOppId[opportunities[0]?.id] ?? [];
}

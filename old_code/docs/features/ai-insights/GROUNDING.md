# Grounding & Accuracy

## Overview

Grounding is the process of ensuring AI responses are based on actual data, with proper citations and confidence levels. This document covers how Castiel prevents hallucinations and maintains accuracy.

> **Principle**: "Every claim must be traceable to a source, or explicitly marked as inference."

---

## Grounding Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROUNDING PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LLM Response                                                               │
│  "The deal is at risk because no contact in 14 days and budget concerns    │
│   were raised. The close date is Q4 and the value is $500K."               │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. CLAIM EXTRACTION                                                 │   │
│  │     • "deal is at risk" (assessment)                                 │   │
│  │     • "no contact in 14 days" (fact)                                 │   │
│  │     • "budget concerns were raised" (fact)                           │   │
│  │     • "close date is Q4" (fact)                                      │   │
│  │     • "value is $500K" (fact)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. SOURCE MATCHING                                                  │   │
│  │     For each claim, find supporting evidence in context              │   │
│  │     • "no contact in 14 days" → Activity log shows last contact 11/16│   │
│  │     • "budget concerns" → Meeting notes: "client mentioned budget"   │   │
│  │     • "close date is Q4" → Opportunity.expectedCloseDate = 12/15     │   │
│  │     • "value is $500K" → Opportunity.value = 500000                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. VERIFICATION                                                     │   │
│  │     • Verified: 4/5 claims                                           │   │
│  │     • "deal is at risk" → INFERENCE (based on verified facts)        │   │
│  │     • All facts matched to sources                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. CONFIDENCE SCORING                                               │   │
│  │     • Grounding Score: 92%                                           │   │
│  │     • Data Quality: HIGH (recent, complete)                          │   │
│  │     • Confidence Level: HIGH                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  5. CITATION INJECTION                                               │   │
│  │     "The deal is at risk because no contact in 14 days [1] and       │   │
│  │      budget concerns were raised [2]. Close date: Q4 [3], $500K [3]" │   │
│  │                                                                       │   │
│  │     [1] Activity Log - Last contact Nov 16                           │   │
│  │     [2] Meeting Notes - Budget Discussion                            │   │
│  │     [3] Opportunity Record                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Claim Types

### Classification

```typescript
enum ClaimType {
  // Directly verifiable
  FACT = 'fact',              // "The value is $500K"
  DATE = 'date',              // "Close date is December 15"
  QUANTITY = 'quantity',      // "There are 3 stakeholders"
  QUOTE = 'quote',            // "John said 'budget is tight'"
  
  // Contextually verifiable
  STATUS = 'status',          // "The deal is in negotiation"
  RELATIONSHIP = 'relationship', // "Acme is the client"
  
  // Inferred (need supporting facts)
  ASSESSMENT = 'assessment',  // "The deal is at risk"
  COMPARISON = 'comparison',  // "Better than last quarter"
  PREDICTION = 'prediction',  // "Likely to close"
  RECOMMENDATION = 'recommendation', // "You should..."
  
  // Not verifiable
  OPINION = 'opinion',        // Subjective interpretation
  GENERAL_KNOWLEDGE = 'general', // Common knowledge
}

interface ExtractedClaim {
  id: string;
  text: string;
  type: ClaimType;
  
  // Position in response
  startIndex: number;
  endIndex: number;
  
  // Entities involved
  entities: string[];
  
  // For verification
  verifiable: boolean;
  requiresSource: boolean;
}
```

### Extraction Process

```typescript
async function extractClaims(response: string): Promise<ExtractedClaim[]> {
  // Use LLM to extract claims
  const prompt = `
    Analyze the following text and extract all factual claims.
    For each claim, identify:
    - The exact text
    - The type (fact, date, quantity, quote, status, assessment, prediction)
    - Whether it's verifiable against data
    
    Text: "${response}"
    
    Return JSON array of claims.
  `;
  
  const claims = await llm.generate(prompt);
  return claims.map(c => ({
    ...c,
    requiresSource: isVerifiableType(c.type),
  }));
}

function isVerifiableType(type: ClaimType): boolean {
  return [
    ClaimType.FACT,
    ClaimType.DATE,
    ClaimType.QUANTITY,
    ClaimType.QUOTE,
    ClaimType.STATUS,
    ClaimType.RELATIONSHIP,
  ].includes(type);
}
```

---

## Source Matching

### Matching Strategy

```typescript
interface SourceMatch {
  claim: ExtractedClaim;
  status: 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
  
  sources: Array<{
    citation: SourceCitation;
    matchType: 'exact' | 'semantic' | 'inferred';
    matchScore: number;
    excerpt: string;
  }>;
  
  // If contradicted
  contradiction?: {
    expectedValue: string;
    actualValue: string;
    source: SourceCitation;
  };
}

async function matchClaimToSources(
  claim: ExtractedClaim,
  context: AssembledContext
): Promise<SourceMatch> {
  
  const sources: SourceMatch['sources'] = [];
  
  // 1. Exact field match
  const exactMatch = findExactMatch(claim, context);
  if (exactMatch) {
    sources.push({
      citation: exactMatch.citation,
      matchType: 'exact',
      matchScore: 1.0,
      excerpt: exactMatch.excerpt,
    });
  }
  
  // 2. Semantic match in text content
  const semanticMatches = await findSemanticMatches(claim, context);
  sources.push(...semanticMatches.map(m => ({
    citation: m.citation,
    matchType: 'semantic' as const,
    matchScore: m.score,
    excerpt: m.excerpt,
  })));
  
  // 3. Check for contradictions
  const contradiction = await findContradiction(claim, context);
  
  // 4. Determine status
  let status: SourceMatch['status'];
  if (contradiction) {
    status = 'contradicted';
  } else if (sources.some(s => s.matchScore >= 0.9)) {
    status = 'verified';
  } else if (sources.some(s => s.matchScore >= 0.7)) {
    status = 'partially_verified';
  } else {
    status = 'unverified';
  }
  
  return { claim, status, sources, contradiction };
}
```

### Exact Match Rules

```typescript
const EXACT_MATCH_RULES: ExactMatchRule[] = [
  // Numeric values
  {
    claimPattern: /\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|m|b|million|thousand)?/i,
    fieldPaths: ['value', 'amount', 'price', 'revenue', 'budget'],
    normalize: (value: string) => parseNumericValue(value),
    compare: (claimed, actual) => Math.abs(claimed - actual) / actual < 0.01,
  },
  
  // Dates
  {
    claimPattern: /(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}|Q[1-4] \d{4})/i,
    fieldPaths: ['closeDate', 'expectedCloseDate', 'dueDate', 'startDate'],
    normalize: (value: string) => parseDate(value),
    compare: (claimed, actual) => isSameDay(claimed, actual) || isSameQuarter(claimed, actual),
  },
  
  // Status/Stage
  {
    claimPattern: /(active|closed|pending|won|lost|negotiation|proposal|qualified)/i,
    fieldPaths: ['status', 'stage'],
    normalize: (value: string) => value.toLowerCase(),
    compare: (claimed, actual) => claimed === actual || STAGE_SYNONYMS[claimed]?.includes(actual),
  },
  
  // Counts
  {
    claimPattern: /(\d+)\s+(contacts?|stakeholders?|documents?|notes?)/i,
    source: 'relationship_count',
    compare: (claimed, actual) => claimed === actual,
  },
];

function findExactMatch(
  claim: ExtractedClaim,
  context: AssembledContext
): { citation: SourceCitation; excerpt: string } | null {
  
  for (const rule of EXACT_MATCH_RULES) {
    const match = claim.text.match(rule.claimPattern);
    if (!match) continue;
    
    const claimedValue = rule.normalize(match[1]);
    
    // Search in context shards
    for (const shard of context.shards) {
      for (const fieldPath of rule.fieldPaths || []) {
        const actualValue = getFieldValue(shard, fieldPath);
        if (actualValue !== undefined && rule.compare(claimedValue, actualValue)) {
          return {
            citation: createCitation(shard, fieldPath),
            excerpt: `${fieldPath}: ${actualValue}`,
          };
        }
      }
    }
  }
  
  return null;
}
```

### Semantic Matching

```typescript
async function findSemanticMatches(
  claim: ExtractedClaim,
  context: AssembledContext
): Promise<Array<{ citation: SourceCitation; score: number; excerpt: string }>> {
  
  const matches: Array<{ citation: SourceCitation; score: number; excerpt: string }> = [];
  
  // 1. Get claim embedding
  const claimEmbedding = await getEmbedding(claim.text);
  
  // 2. Search through context chunks
  for (const chunk of context.chunks) {
    const similarity = cosineSimilarity(claimEmbedding, chunk.embedding);
    
    if (similarity >= 0.75) {
      matches.push({
        citation: createCitation(chunk.shard, chunk.fieldPath),
        score: similarity,
        excerpt: extractRelevantExcerpt(chunk.content, claim.text),
      });
    }
  }
  
  // 3. Also search text fields
  for (const shard of context.shards) {
    const textFields = getTextFields(shard);
    for (const field of textFields) {
      const fieldEmbedding = await getEmbedding(field.value);
      const similarity = cosineSimilarity(claimEmbedding, fieldEmbedding);
      
      if (similarity >= 0.75) {
        matches.push({
          citation: createCitation(shard, field.path),
          score: similarity,
          excerpt: extractRelevantExcerpt(field.value, claim.text),
        });
      }
    }
  }
  
  // Sort by score and dedupe
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
```

---

## Hallucination Detection

### Detection Strategies

```typescript
interface HallucinationDetector {
  name: string;
  detect(response: string, context: AssembledContext): Promise<HallucinationResult[]>;
}

const HALLUCINATION_DETECTORS: HallucinationDetector[] = [
  // 1. Entity hallucination - mentions entities not in context
  {
    name: 'entity_hallucination',
    async detect(response, context) {
      const mentionedEntities = extractEntities(response);
      const contextEntities = new Set(context.shards.map(s => s.structuredData.name));
      
      return mentionedEntities
        .filter(e => !contextEntities.has(e.name) && !isCommonTerm(e.name))
        .map(e => ({
          type: 'entity_not_in_context',
          text: e.name,
          severity: 'high',
          suggestion: 'Remove or verify this reference',
        }));
    },
  },
  
  // 2. Numeric hallucination - numbers not in context
  {
    name: 'numeric_hallucination',
    async detect(response, context) {
      const numbers = extractNumbers(response);
      const contextNumbers = extractAllNumbers(context);
      
      return numbers
        .filter(n => !contextNumbers.some(cn => isApproximateMatch(n, cn)))
        .filter(n => !isCommonNumber(n)) // Exclude things like "first", "one"
        .map(n => ({
          type: 'number_not_in_context',
          text: n.original,
          severity: 'medium',
          suggestion: 'Verify this number against source data',
        }));
    },
  },
  
  // 3. Date hallucination
  {
    name: 'date_hallucination',
    async detect(response, context) {
      const dates = extractDates(response);
      const contextDates = extractAllDates(context);
      
      return dates
        .filter(d => !contextDates.some(cd => isCloseDate(d, cd)))
        .map(d => ({
          type: 'date_not_in_context',
          text: d.original,
          severity: 'medium',
          suggestion: 'Verify this date against source data',
        }));
    },
  },
  
  // 4. Quote hallucination - fake quotes
  {
    name: 'quote_hallucination',
    async detect(response, context) {
      const quotes = extractQuotes(response);
      const contextText = context.chunks.map(c => c.content).join(' ');
      
      return quotes
        .filter(q => !fuzzyContains(contextText, q.text))
        .map(q => ({
          type: 'quote_not_in_context',
          text: q.text,
          severity: 'high',
          suggestion: 'Cannot verify this quote in source data',
        }));
    },
  },
  
  // 5. Contradiction detection
  {
    name: 'contradiction',
    async detect(response, context) {
      const claims = await extractClaims(response);
      const contradictions: HallucinationResult[] = [];
      
      for (const claim of claims) {
        const contradiction = await findContradiction(claim, context);
        if (contradiction) {
          contradictions.push({
            type: 'contradicts_source',
            text: claim.text,
            severity: 'critical',
            suggestion: `Source says "${contradiction.actualValue}" not "${contradiction.claimedValue}"`,
            source: contradiction.source,
          });
        }
      }
      
      return contradictions;
    },
  },
];

async function detectHallucinations(
  response: string,
  context: AssembledContext
): Promise<HallucinationResult[]> {
  const results: HallucinationResult[] = [];
  
  for (const detector of HALLUCINATION_DETECTORS) {
    const detected = await detector.detect(response, context);
    results.push(...detected);
  }
  
  return results;
}
```

### Handling Detected Hallucinations

```typescript
async function handleHallucinations(
  response: string,
  hallucinations: HallucinationResult[],
  context: AssembledContext
): Promise<string> {
  
  // Group by severity
  const critical = hallucinations.filter(h => h.severity === 'critical');
  const high = hallucinations.filter(h => h.severity === 'high');
  const medium = hallucinations.filter(h => h.severity === 'medium');
  
  // Critical: Regenerate response
  if (critical.length > 0) {
    return await regenerateWithCorrections(response, critical, context);
  }
  
  // High: Add warnings
  if (high.length > 0) {
    return addWarnings(response, high);
  }
  
  // Medium: Add caveats
  if (medium.length > 0) {
    return addCaveats(response, medium);
  }
  
  return response;
}

async function regenerateWithCorrections(
  originalResponse: string,
  hallucinations: HallucinationResult[],
  context: AssembledContext
): Promise<string> {
  
  const correctionPrompt = `
    Your previous response contained inaccuracies. Please regenerate 
    while avoiding these issues:
    
    ${hallucinations.map(h => `
      - "${h.text}" is incorrect. ${h.suggestion}
    `).join('\n')}
    
    Only use information from the provided context.
  `;
  
  return await llm.generate(correctionPrompt, context);
}

function addWarnings(response: string, hallucinations: HallucinationResult[]): string {
  const warnings = hallucinations.map(h => 
    `⚠️ **Unverified**: "${h.text}" could not be verified against source data.`
  ).join('\n');
  
  return `${response}\n\n---\n${warnings}`;
}
```

---

## Confidence Scoring

### Score Calculation

```typescript
interface ConfidenceFactors {
  // Data factors
  dataCompleteness: number;    // 0-1: How complete is the context?
  dataRecency: number;         // 0-1: How recent is the data?
  sourceQuality: number;       // 0-1: Quality of sources used
  
  // Grounding factors
  groundingCoverage: number;   // 0-1: % of claims with sources
  citationStrength: number;    // 0-1: Avg match score of citations
  
  // Response factors
  modelConfidence: number;     // 0-1: LLM's self-reported confidence
  hallucinationRisk: number;   // 0-1: Risk based on detected issues
}

function calculateConfidence(factors: ConfidenceFactors): ConfidenceScore {
  // Weighted average
  const weights = {
    dataCompleteness: 0.15,
    dataRecency: 0.10,
    sourceQuality: 0.10,
    groundingCoverage: 0.25,
    citationStrength: 0.20,
    modelConfidence: 0.10,
    hallucinationRisk: 0.10,
  };
  
  const score = Object.entries(weights).reduce((sum, [key, weight]) => {
    const value = factors[key as keyof ConfidenceFactors];
    // Invert hallucination risk
    const adjusted = key === 'hallucinationRisk' ? 1 - value : value;
    return sum + (adjusted * weight);
  }, 0);
  
  // Convert to 0-100
  const percentScore = Math.round(score * 100);
  
  // Determine level
  let level: 'high' | 'medium' | 'low';
  if (percentScore >= 80) {
    level = 'high';
  } else if (percentScore >= 60) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  // Generate caveats
  const caveats = generateCaveats(factors);
  
  return {
    level,
    score: percentScore,
    factors,
    caveats,
  };
}

function generateCaveats(factors: ConfidenceFactors): string[] {
  const caveats: string[] = [];
  
  if (factors.dataCompleteness < 0.5) {
    caveats.push('Based on limited available data');
  }
  
  if (factors.dataRecency < 0.5) {
    caveats.push('Some data may be outdated');
  }
  
  if (factors.groundingCoverage < 0.7) {
    caveats.push('Some claims could not be verified');
  }
  
  if (factors.hallucinationRisk > 0.3) {
    caveats.push('Contains some unverified information');
  }
  
  return caveats;
}
```

### Data Freshness

```typescript
interface FreshnessConfig {
  // How recent is "current"?
  currentThresholdHours: number;   // Default: 24
  recentThresholdDays: number;     // Default: 7
  staleThresholdDays: number;      // Default: 30
}

function calculateDataFreshness(
  sources: SourceCitation[],
  config: FreshnessConfig = DEFAULT_FRESHNESS_CONFIG
): DataFreshness {
  const now = new Date();
  
  const sourceAges = sources.map(s => ({
    source: s,
    ageHours: differenceInHours(now, new Date(s.dataUpdatedAt)),
    ageDays: differenceInDays(now, new Date(s.dataUpdatedAt)),
  }));
  
  // Calculate per-source freshness
  const sourceFreshness = sourceAges.map(({ source, ageHours, ageDays }) => {
    let staleness: 'current' | 'recent' | 'stale';
    if (ageHours <= config.currentThresholdHours) {
      staleness = 'current';
    } else if (ageDays <= config.recentThresholdDays) {
      staleness = 'recent';
    } else {
      staleness = 'stale';
    }
    
    return {
      shardId: source.shardId,
      shardName: source.shardName,
      updatedAt: source.dataUpdatedAt,
      staleness,
    };
  });
  
  // Overall freshness (worst case)
  const overallFreshness = sourceFreshness.some(s => s.staleness === 'stale') 
    ? 'stale'
    : sourceFreshness.some(s => s.staleness === 'recent')
    ? 'recent'
    : 'current';
  
  // Generate warning if needed
  const staleCount = sourceFreshness.filter(s => s.staleness === 'stale').length;
  let freshnessWarning: string | undefined;
  if (staleCount > 0) {
    freshnessWarning = `${staleCount} source(s) haven't been updated in over ${config.staleThresholdDays} days`;
  }
  
  return {
    overallFreshness,
    sources: sourceFreshness,
    staleThresholdDays: config.staleThresholdDays,
    freshnessWarning,
  };
}
```

---

## Citation Format

### Inline Citations

```typescript
function injectCitations(
  response: string,
  claims: SourceMatch[]
): string {
  // Sort claims by position (reverse to avoid index shifting)
  const sortedClaims = [...claims]
    .filter(c => c.status === 'verified' || c.status === 'partially_verified')
    .sort((a, b) => b.claim.endIndex - a.claim.endIndex);
  
  let citedResponse = response;
  const citationMap = new Map<string, number>();
  let citationCounter = 1;
  
  for (const claim of sortedClaims) {
    const primarySource = claim.sources[0];
    if (!primarySource) continue;
    
    // Get or create citation number
    let citationNum = citationMap.get(primarySource.citation.shardId);
    if (!citationNum) {
      citationNum = citationCounter++;
      citationMap.set(primarySource.citation.shardId, citationNum);
    }
    
    // Insert citation marker
    citedResponse = 
      citedResponse.slice(0, claim.claim.endIndex) +
      ` [${citationNum}]` +
      citedResponse.slice(claim.claim.endIndex);
  }
  
  return citedResponse;
}

function formatCitationFooter(
  claims: SourceMatch[]
): string {
  const uniqueSources = new Map<string, SourceCitation>();
  
  for (const claim of claims) {
    for (const source of claim.sources) {
      if (!uniqueSources.has(source.citation.shardId)) {
        uniqueSources.set(source.citation.shardId, source.citation);
      }
    }
  }
  
  const lines = Array.from(uniqueSources.entries())
    .map(([id, citation], index) => {
      const freshnessIcon = getFreshnessIcon(citation.dataUpdatedAt);
      return `[${index + 1}] ${freshnessIcon} **${citation.shardName}** - ${citation.excerpt}`;
    });
  
  return `\n\n---\n**Sources:**\n${lines.join('\n')}`;
}

function getFreshnessIcon(updatedAt: Date): string {
  const daysSince = differenceInDays(new Date(), updatedAt);
  if (daysSince <= 1) return '🟢'; // Current
  if (daysSince <= 7) return '🟡'; // Recent
  return '🟠'; // Stale
}
```

### Citation Display

```typescript
interface CitationDisplay {
  // Inline format
  inline: '[1]' | '[1][2]' | '(Source: Name)';
  
  // Footer format
  footer: {
    showExcerpt: boolean;
    showFreshness: boolean;
    showConfidence: boolean;
    groupByType: boolean;
  };
  
  // Interactive
  interactive: {
    hoverPreview: boolean;
    clickToNavigate: boolean;
    expandCollapse: boolean;
  };
}

const DEFAULT_CITATION_DISPLAY: CitationDisplay = {
  inline: '[1]',
  footer: {
    showExcerpt: true,
    showFreshness: true,
    showConfidence: false,
    groupByType: false,
  },
  interactive: {
    hoverPreview: true,
    clickToNavigate: true,
    expandCollapse: true,
  },
};
```

---

## Prompt Engineering for Accuracy

### System Prompt

```typescript
const GROUNDING_SYSTEM_PROMPT = `
You are an AI assistant that provides accurate, grounded responses.

## Core Rules

1. **Only use information from the provided context**
   - Never invent facts, dates, numbers, or quotes
   - If information isn't in the context, say "I don't have that information"

2. **Be explicit about certainty**
   - Use "The data shows..." for verified facts
   - Use "Based on the available information..." for inferences
   - Use "I cannot verify..." for claims you can't support

3. **Distinguish facts from inferences**
   - Facts: Directly stated in the data
   - Inferences: Logical conclusions from facts (mark these clearly)
   - Opinions: Your assessment (mark as "In my assessment...")

4. **Reference sources naturally**
   - When citing facts, include enough context to identify the source
   - Example: "According to the meeting notes from November 15..."
   - Example: "The opportunity record shows..."

5. **Acknowledge limitations**
   - If data is incomplete, say so
   - If data is outdated, mention when it was last updated
   - If you're uncertain, express uncertainty

## Example Good Response

"Based on the opportunity record, the deal value is $500K with an expected 
close date of December 15. The most recent meeting notes from November 20 
indicate that budget was discussed as a potential concern. However, I don't 
have information about the outcome of that discussion.

Given the 14-day gap since the last contact (last activity was November 16), 
I'd assess this deal as potentially at risk, though I'd recommend confirming 
the current status with the account owner."

## Example Bad Response (Don't do this)

"The deal will definitely close in Q4 for $500K. The client loves our 
proposal and John confirmed they have budget approval."
(This invents details not in the context)
`;
```

### Context Formatting

```typescript
function formatContextForPrompt(context: AssembledContext): string {
  const sections: string[] = [];
  
  // Header with freshness info
  sections.push(`## Context (as of ${format(new Date(), 'MMM d, yyyy')})`);
  
  // Primary shard
  if (context.primaryShard) {
    sections.push(`
### ${context.primaryShard.shardType}: ${context.primaryShard.name}
Last updated: ${formatRelativeTime(context.primaryShard.updatedAt)}

${formatShardData(context.primaryShard)}
`);
  }
  
  // Related shards
  for (const group of context.relatedShards) {
    sections.push(`
### Related ${group.type}s (${group.shards.length})
${group.shards.map(s => formatShardSummary(s)).join('\n')}
`);
  }
  
  // Retrieved chunks
  if (context.chunks.length > 0) {
    sections.push(`
### Relevant Content Excerpts
${context.chunks.map((c, i) => `
[Excerpt ${i + 1}] From: ${c.shardName} (${c.shardType})
Updated: ${formatRelativeTime(c.updatedAt)}
---
${c.content}
---
`).join('\n')}
`);
  }
  
  return sections.join('\n\n');
}
```

---

## Quality Metrics

### Tracking Accuracy

```typescript
interface AccuracyMetrics {
  // Per-response metrics
  responseId: string;
  
  // Grounding
  totalClaims: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  contradictions: number;
  groundingScore: number;
  
  // Hallucinations
  hallucinationsDetected: number;
  hallucinationTypes: Record<string, number>;
  
  // Confidence
  confidenceScore: number;
  confidenceLevel: string;
  
  // User feedback
  userRating?: number;
  feedbackCategories?: string[];
  
  // Regeneration
  wasRegenerated: boolean;
  regenerationReason?: string;
}

async function trackAccuracyMetrics(
  response: GroundedResponse,
  claims: SourceMatch[],
  hallucinations: HallucinationResult[],
  confidence: ConfidenceScore
): Promise<void> {
  
  const metrics: AccuracyMetrics = {
    responseId: response.id,
    
    totalClaims: claims.length,
    verifiedClaims: claims.filter(c => c.status === 'verified').length,
    unverifiedClaims: claims.filter(c => c.status === 'unverified').length,
    contradictions: claims.filter(c => c.status === 'contradicted').length,
    groundingScore: response.grounding.groundingScore,
    
    hallucinationsDetected: hallucinations.length,
    hallucinationTypes: groupBy(hallucinations, 'type'),
    
    confidenceScore: confidence.score,
    confidenceLevel: confidence.level,
    
    wasRegenerated: false,
  };
  
  await analyticsService.track('insight_accuracy', metrics);
}
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Intent Classification](./INTENT-CLASSIFICATION.md)
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [c_contextTemplate](../../shards/core-types/c_contextTemplate.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0












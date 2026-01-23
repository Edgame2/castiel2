/**
 * Score Formula Documentation Component
 * Provides comprehensive documentation of risk score calculation formulas
 * Phase 2.2: Risk Score Transparency - 8.1 Score Calculation Documentation
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calculator, TrendingUp, DollarSign, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ScoreFormulaDocumentationProps {
  className?: string;
}

export function ScoreFormulaDocumentation({ className }: ScoreFormulaDocumentationProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Score Calculation Documentation
        </CardTitle>
        <CardDescription>
          Comprehensive guide to how risk scores are calculated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* Global Risk Score */}
          <AccordionItem value="global-score">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="font-semibold">Global Risk Score</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Formula</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="mb-2">Global Score = Σ(ponderation × confidence × contribution_normalized)</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Where contribution_normalized = contribution / totalContribution
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground">
                    The global risk score is calculated by summing the weighted contributions of all detected risks.
                    Each risk's contribution is normalized to ensure fair distribution across all risks.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Components</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Ponderation</strong> (0-1): Weight representing the relative impact of this risk type</li>
                    <li><strong>Confidence</strong> (0-1): How confident we are in detecting this risk</li>
                    <li><strong>Contribution</strong> (0-1): Normalized contribution of this risk relative to all risks</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>Risk 1: ponderation=0.8, confidence=0.9, contribution=0.4</div>
                    <div>Risk 2: ponderation=0.6, confidence=0.7, contribution=0.6</div>
                    <div className="mt-2 pt-2 border-t">
                      <div>Normalized contributions: Risk1=0.4, Risk2=0.6</div>
                      <div>Score = (0.8×0.9×0.4) + (0.6×0.7×0.6) = 0.288 + 0.252 = 0.54</div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Category Scores */}
          <AccordionItem value="category-scores">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">Category Scores</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Formula</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="mb-2">Category Score = Σ(ponderation × confidence × contribution_normalized)</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Calculated separately for each category (Commercial, Technical, Legal, Financial, Competitive, Operational)
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground">
                    Category scores are calculated using the same formula as the global score, but applied only to risks
                    within each category. Contributions are normalized within each category to ensure fair distribution.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'].map((cat) => (
                      <Badge key={cat} variant="outline">{cat}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>Commercial Category:</div>
                    <div className="ml-4 mt-1">
                      <div>Risk A: ponderation=0.7, confidence=0.8, contribution=0.6</div>
                      <div>Risk B: ponderation=0.5, confidence=0.9, contribution=0.4</div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <div>Normalized: RiskA=0.6, RiskB=0.4</div>
                      <div>Commercial Score = (0.7×0.8×0.6) + (0.5×0.9×0.4) = 0.336 + 0.18 = 0.516</div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Ponderation Logic */}
          <AccordionItem value="ponderation">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="font-semibold">Ponderation (Weight) Logic</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Definition</h4>
                  <p className="text-sm text-muted-foreground">
                    Ponderation (also called weight) is a value between 0 and 1 that represents the relative impact
                    of a risk type on the overall opportunity. Higher ponderation means the risk has more influence
                    on the final score.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How Ponderations Are Determined</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Default Ponderation</strong>: Each risk in the catalog has a default weight (0-1)</li>
                    <li><strong>Tenant Overrides</strong>: Tenants can override default weights for their specific needs</li>
                    <li><strong>Industry Overrides</strong>: Industry-specific weights can be applied</li>
                    <li><strong>Opportunity Type Overrides</strong>: Weights can vary by opportunity type</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ponderation Hierarchy</h4>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div>1. Opportunity-specific override (highest priority)</div>
                    <div>2. Opportunity type override</div>
                    <div>3. Industry override</div>
                    <div>4. Tenant override</div>
                    <div>5. Default ponderation (lowest priority)</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Impact on Score</h4>
                  <p className="text-sm text-muted-foreground">
                    A risk with ponderation=1.0 and confidence=1.0 will contribute its full normalized contribution
                    to the score. A risk with ponderation=0.5 will contribute half as much, even with the same confidence.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Confidence Weights */}
          <AccordionItem value="confidence">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="font-semibold">Confidence Weights</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Definition</h4>
                  <p className="text-sm text-muted-foreground">
                    Confidence is a value between 0 and 1 that represents how certain we are that a risk has been
                    correctly detected. Higher confidence means we're more certain the risk is real and relevant.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How Confidence Is Calculated</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Rule-based detection</strong>: Confidence based on how well conditions match</li>
                    <li><strong>AI-powered detection</strong>: Confidence from AI model output</li>
                    <li><strong>Historical patterns</strong>: Confidence based on similarity to past opportunities</li>
                    <li><strong>Semantic discovery</strong>: Confidence from semantic similarity scores</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Confidence Adjustments</h4>
                  <p className="text-sm text-muted-foreground">
                    Confidence can be adjusted based on:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                    <li>Data quality scores</li>
                    <li>Service availability (e.g., AI model availability)</li>
                    <li>Historical accuracy of similar detections</li>
                    <li>Context completeness</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Impact on Score</h4>
                  <p className="text-sm text-muted-foreground">
                    A risk with confidence=1.0 will contribute its full weighted value. A risk with confidence=0.5
                    will contribute half as much, even with the same ponderation and contribution.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Contribution Normalization */}
          <AccordionItem value="contribution">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="font-semibold">Contribution Normalization</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Definition</h4>
                  <p className="text-sm text-muted-foreground">
                    Contribution represents how much a risk contributes relative to other risks. Contributions are
                    normalized to ensure fair distribution when multiple risks are detected.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Normalization Formula</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div>contribution_normalized = contribution / totalContribution</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Where totalContribution = Σ(all contributions)
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Why Normalize?</h4>
                  <p className="text-sm text-muted-foreground">
                    Normalization ensures that:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                    <li>Multiple risks don't unfairly inflate the score</li>
                    <li>Each risk's relative importance is preserved</li>
                    <li>The final score remains between 0 and 1</li>
                    <li>Risks are weighted proportionally to their contributions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>Raw contributions: Risk1=0.8, Risk2=0.6, Risk3=0.4</div>
                    <div>Total = 1.8</div>
                    <div className="mt-2 pt-2 border-t">
                      <div>Normalized: Risk1=0.8/1.8=0.444, Risk2=0.6/1.8=0.333, Risk3=0.4/1.8=0.222</div>
                      <div className="text-xs text-muted-foreground mt-1">Sum = 0.999 ≈ 1.0</div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Revenue at Risk */}
          <AccordionItem value="revenue-at-risk">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold">Revenue at Risk</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Formula</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="mb-2">Revenue at Risk = dealValue × probability × riskScore</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Risk-Adjusted Value = dealValue - revenueAtRisk
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground">
                    Revenue at risk represents the portion of expected revenue that is likely to be lost due to
                    identified risks. It combines the deal value, the probability of closing, and the risk score.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Components</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>dealValue</strong>: The total value of the opportunity</li>
                    <li><strong>probability</strong>: The probability of closing (0-1, default 0.5 if not specified)</li>
                    <li><strong>riskScore</strong>: The global risk score (0-1)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>Deal Value: $100,000</div>
                    <div>Probability: 0.7 (70%)</div>
                    <div>Risk Score: 0.4 (40%)</div>
                    <div className="mt-2 pt-2 border-t">
                      <div>Revenue at Risk = $100,000 × 0.7 × 0.4 = $28,000</div>
                      <div>Risk-Adjusted Value = $100,000 - $28,000 = $72,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Multiple Detections */}
          <AccordionItem value="multiple-detections">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="font-semibold">How Multiple Detections Combine</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Detection Methods</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Risks can be detected through multiple methods:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Rule-based', 'AI-powered', 'Historical patterns', 'Semantic discovery'].map((method) => (
                      <Badge key={method} variant="outline">{method}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Combination Logic</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Each detection method can identify the same risk independently</li>
                    <li>When multiple methods detect the same risk, the highest confidence is used</li>
                    <li>Different risks are combined using the normalized contribution approach</li>
                    <li>Conflicts between detection methods are resolved by priority: rule {'>'} AI {'>'} historical {'>'} semantic</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>Risk "Budget Overrun" detected by:</div>
                    <div className="ml-4 mt-1">
                      <div>• Rule-based: confidence=0.9</div>
                      <div>• AI-powered: confidence=0.7</div>
                      <div>• Historical: confidence=0.8</div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <div>Final confidence = max(0.9, 0.7, 0.8) = 0.9 (rule-based wins)</div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

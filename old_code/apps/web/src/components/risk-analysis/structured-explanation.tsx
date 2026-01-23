/**
 * Structured Explanation Component
 * Displays structured explainability for detected risks
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info, Brain, History, Search, FileText, TrendingUp } from 'lucide-react';
import type { RiskExplainability } from '@/types/risk-analysis';
import { cn } from '@/lib/utils';

interface StructuredExplanationProps {
  explainability: RiskExplainability;
  className?: string;
}

export function StructuredExplanation({ explainability, className }: StructuredExplanationProps) {
  const detectionMethodIcons = {
    rule: FileText,
    ai: Brain,
    historical: History,
    semantic: Search,
  };

  const detectionMethodLabels = {
    rule: 'Rule-Based',
    ai: 'AI-Powered',
    historical: 'Historical Pattern',
    semantic: 'Semantic Discovery',
  };

  const Icon = detectionMethodIcons[explainability.detectionMethod];
  const methodLabel = detectionMethodLabels[explainability.detectionMethod];

  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Explanation
          <Badge variant="outline" className="ml-auto">
            {methodLabel}
          </Badge>
        </CardTitle>
        <CardDescription>
          Confidence: {formatPercent(explainability.confidence)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <p className="text-sm text-muted-foreground">{explainability.reasoning.summary}</p>
          </TabsContent>

          <TabsContent value="standard" className="mt-4">
            <p className="text-sm leading-relaxed">{explainability.reasoning.standard}</p>
          </TabsContent>

          <TabsContent value="detailed" className="mt-4 space-y-4">
            {explainability.reasoning.detailed && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Detailed Reasoning</h4>
                <p className="text-sm leading-relaxed">{explainability.reasoning.detailed}</p>
              </div>
            )}

            {/* Evidence */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Evidence
              </h4>
              <div className="space-y-3">
                {explainability.evidence.sourceShards.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Source Shards</div>
                    <div className="flex flex-wrap gap-1">
                      {explainability.evidence.sourceShards.map((shardId) => (
                        <Badge key={shardId} variant="outline" className="text-xs">
                          {shardId.substring(0, 8)}...
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {explainability.evidence.matchedRules && explainability.evidence.matchedRules.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Matched Rules</div>
                    <div className="flex flex-wrap gap-1">
                      {explainability.evidence.matchedRules.map((rule, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {rule}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {explainability.evidence.aiReasoning && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">AI Reasoning</div>
                    <p className="text-sm text-muted-foreground">{explainability.evidence.aiReasoning}</p>
                  </div>
                )}

                {explainability.evidence.historicalPatterns && explainability.evidence.historicalPatterns.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Historical Patterns</div>
                    <div className="space-y-2">
                      {explainability.evidence.historicalPatterns.map((pattern, index) => (
                        <div key={index} className="text-sm border-l-2 border-muted pl-3">
                          <div className="font-medium">Opportunity {pattern.similarOpportunityId}</div>
                          <div className="text-xs text-muted-foreground">
                            Similarity: {formatPercent(pattern.similarityScore)} • Outcome: {pattern.outcome}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {explainability.evidence.semanticMatches && explainability.evidence.semanticMatches.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Semantic Matches</div>
                    <div className="space-y-2">
                      {explainability.evidence.semanticMatches.map((match, index) => (
                        <div key={index} className="text-sm border-l-2 border-muted pl-3">
                          <div className="font-medium">{match.shardType}</div>
                          <div className="text-xs text-muted-foreground">
                            Similarity: {formatPercent(match.similarityScore)} • ID: {match.shardId.substring(0, 8)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence Contributors */}
            {explainability.confidenceContributors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Confidence Contributors
                </h4>
                <div className="space-y-2">
                  {explainability.confidenceContributors
                    .sort((a, b) => b.contribution - a.contribution)
                    .map((contributor, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{contributor.factor}</span>
                        <Badge variant="outline">{formatPercent(contributor.contribution)}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Assumptions */}
            {explainability.assumptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Assumptions</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {explainability.assumptions.map((assumption, index) => (
                    <li key={index}>{assumption}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative Interpretations */}
            {explainability.alternativeInterpretations && explainability.alternativeInterpretations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Alternative Interpretations</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {explainability.alternativeInterpretations.map((interpretation, index) => (
                    <li key={index}>{interpretation}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Details */}
            {explainability.reasoning.technical && (
              <Accordion type="single" collapsible>
                <AccordionItem value="technical">
                  <AccordionTrigger className="text-sm">Technical Details</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                      {explainability.reasoning.technical}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

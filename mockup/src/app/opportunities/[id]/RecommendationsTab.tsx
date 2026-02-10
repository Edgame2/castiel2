"use client";

import { useState } from "react";
import type { Recommendation } from "@/data/mock";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";

type FeedbackAction = "accept" | "ignore" | "irrelevant";

export function RecommendationsTab({
  opportunityId,
  recommendations,
}: {
  opportunityId: string;
  recommendations: Recommendation[];
}) {
  const [feedback, setFeedback] = useState<Record<string, FeedbackAction>>({});

  const handleMockFeedback = (recId: string, action: FeedbackAction) => {
    setFeedback((prev) => ({ ...prev, [recId]: action }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recommendation cards with per-item reasoning. Buttons are mock actions (no backend).
      </p>
      <div className="grid gap-4 md:grid-cols-1">
        {recommendations.map((rec) => {
          const action = feedback[rec.id];
          return (
            <Card key={rec.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                  <Badge variant="secondary">{rec.source}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Score: {(rec.score * 100).toFixed(0)}%
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{rec.explanation}</p>
                {rec.description && (
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                )}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="reasoning">
                    <AccordionTrigger>Why this recommendation (step-by-step)</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {rec.reasoningSteps
                          .sort((a, b) => a.order - b.order)
                          .map((step) => (
                            <li key={step.id}>
                              <span className="font-medium">{step.content}</span>
                              {step.reasoning && (
                                <p className="ml-4 mt-0.5 text-muted-foreground text-xs">
                                  {step.reasoning}
                                </p>
                              )}
                            </li>
                          ))}
                      </ol>
                      {rec.conclusion && (
                        <p className="mt-2 text-sm font-medium">{rec.conclusion}</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="timeline">
                    <AccordionTrigger>Why this recommendation (timeline)</AccordionTrigger>
                    <AccordionContent>
                      <div className="relative border-l-2 border-muted pl-6 pb-2 space-y-3">
                        {rec.reasoningSteps
                          .sort((a, b) => a.order - b.order)
                          .map((step) => (
                            <div key={step.id} className="relative">
                              <span className="absolute -left-[29px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                              <p className="text-sm font-medium">{step.content}</p>
                              {step.reasoning && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {step.reasoning}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                      {rec.conclusion && (
                        <p className="mt-2 text-sm font-medium">{rec.conclusion}</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={action === "accept" ? "default" : "outline"}
                  onClick={() => handleMockFeedback(rec.id, "accept")}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant={action === "ignore" ? "secondary" : "outline"}
                  onClick={() => handleMockFeedback(rec.id, "ignore")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Ignore
                </Button>
                <Button
                  size="sm"
                  variant={action === "irrelevant" ? "destructive" : "outline"}
                  onClick={() => handleMockFeedback(rec.id, "irrelevant")}
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Irrelevant
                </Button>
                {action && (
                  <span className="text-xs text-muted-foreground self-center ml-2">
                    (Mock: {action})
                  </span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

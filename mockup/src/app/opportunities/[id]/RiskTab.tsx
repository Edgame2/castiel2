"use client";

import type React from "react";
import type { RiskData } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RiskGauge } from "@/components/RiskGauge";
import { RiskTrajectoryChart } from "@/components/RiskTrajectoryChart";
import { RiskVelocityChart } from "@/components/RiskVelocityChart";

export function RiskTab({
  opportunityId: _opportunityId,
  riskData,
}: {
  opportunityId: string;
  riskData: RiskData;
}): React.ReactElement {
  const d = riskData;
  const similar = d.similarDeals;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <RiskGauge value={d.currentRisk} label="Current risk" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk trajectory</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RiskTrajectoryChart horizons={d.horizons} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk velocity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RiskVelocityChart
              velocity={d.velocity}
              acceleration={d.acceleration}
              dataPoints={d.dataPoints}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deals like this</CardTitle>
        </CardHeader>
        <CardContent>
          {similar.count === 0 ? (
            <p className="text-sm text-muted-foreground">No similar won deals to compare.</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Deals like this win{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {(similar.winRate * 100).toFixed(0)}%
                </span>{" "}
                of the time
              </p>
              <p className="text-xs text-muted-foreground">
                Based on {similar.count} similar deals (industry, size)
              </p>
              {similar.medianCycleTimeDays !== null && (
                <p className="text-xs text-muted-foreground">
                  Median cycle: {similar.medianCycleTimeDays} days
                </p>
              )}
              {similar.p25CloseAmount !== null && similar.p25CloseAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  P25 close: ${(similar.p25CloseAmount / 1000).toFixed(0)}k
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk drivers</CardTitle>
          <p className="text-xs text-muted-foreground">
            Risk score: {(d.currentRisk * 100).toFixed(0)}%
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {d.topDrivers.map((driver, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium truncate" title={driver.feature}>
                  {driver.feature}
                </span>
                <span
                  className={
                    driver.direction === "increases"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {driver.direction === "increases" ? "+" : ""}
                  {(driver.contribution * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="reasoning">
              <AccordionTrigger>Chain of thought (step-by-step)</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {d.reasoningSteps
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <li key={step.id}>
                        <span className="font-medium">{step.content}</span>
                        {step.reasoning && (
                          <p className="ml-4 mt-0.5 text-muted-foreground">
                            {step.reasoning}
                          </p>
                        )}
                      </li>
                    ))}
                </ol>
                {d.conclusion && (
                  <p className="border-t pt-3 text-sm font-medium">
                    {d.conclusion}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="timeline">
              <AccordionTrigger>Chain of thought (timeline)</AccordionTrigger>
              <AccordionContent>
                <div className="relative border-l-2 border-muted pl-6 pb-2 space-y-4">
                  {d.reasoningSteps
                    .sort((a, b) => a.order - b.order)
                    .map((step, _i) => (
                      <div key={step.id} className="relative">
                        <span className="absolute -left-[29px] top-0 h-3 w-3 rounded-full bg-primary" />
                        <p className="text-sm font-medium">{step.content}</p>
                        {step.reasoning && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.reasoning}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
                {d.conclusion && (
                  <p className="mt-3 pt-3 border-t text-sm font-medium">
                    {d.conclusion}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

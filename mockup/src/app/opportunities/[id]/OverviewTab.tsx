"use client";

import type { Opportunity } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function riskVariant(risk: number): "success" | "warning" | "destructive" {
  if (risk < 0.33) return "success";
  if (risk < 0.66) return "warning";
  return "destructive";
}

export function OverviewTab({ opportunity }: { opportunity: Opportunity }) {
  const opp = opportunity;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(opp.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Stage</p>
            <p className="font-medium">{opp.stage}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Close date</p>
            <p className="font-medium">{opp.closeDate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Risk score</p>
            <Badge variant={riskVariant(opp.riskScore)} className="mt-0.5">
              {(opp.riskScore * 100).toFixed(0)}%
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win probability</p>
            <p className="font-medium tabular-nums">{(opp.winProbability * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Early warning</p>
            {opp.earlyWarning ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Yes
              </span>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

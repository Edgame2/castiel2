"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { opportunities } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LayoutList, LayoutGrid, AlertTriangle } from "lucide-react";

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

export default function OpportunitiesListPage() {
  const router = useRouter();
  const [view, setView] = useState<"table" | "cards">("table");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Sales opportunities</h1>
        <div className="flex gap-2">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("cards")}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        List and card view. Click a row or card to open the opportunity detail (Overview, Risk, Recommendations).
      </p>

      {view === "table" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Close date</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead className="text-right">Win %</TableHead>
                <TableHead className="w-10">Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow
                  key={opp.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/opportunities/${opp.id}`)}
                >
                  <TableCell className="font-medium">{opp.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(opp.amount)}
                  </TableCell>
                  <TableCell>{opp.stage}</TableCell>
                  <TableCell>{opp.closeDate}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={riskVariant(opp.riskScore)}>
                      {(opp.riskScore * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(opp.winProbability * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    {opp.earlyWarning ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Early warning" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {view === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{opp.name}</CardTitle>
                    {opp.earlyWarning && (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Early warning" />
                    )}
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(opp.amount)}</p>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{opp.stage}</Badge>
                    <Badge variant={riskVariant(opp.riskScore)}>
                      Risk {(opp.riskScore * 100).toFixed(0)}%
                    </Badge>
                    <Badge variant="outline">Win {(opp.winProbability * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-muted-foreground">Close: {opp.closeDate}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

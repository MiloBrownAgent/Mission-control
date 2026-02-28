"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2, Target, DollarSign, BarChart3 } from "lucide-react";

const accounts = [
  {
    name: "TRUST",
    value: 123531,
    holdings: "Diversified ETFs",
    risk: "low",
    detail: "VTI, VXUS, BND, VOO",
    note: "Well-diversified across asset classes ✅",
    color: "emerald",
  },
  {
    name: "Roth IRA",
    value: 108185,
    holdings: "100% SEZL",
    risk: "high",
    detail: "Sezzle — BNPL fintech",
    note: "Concentrated single-stock position ⚠️",
    color: "amber",
  },
  {
    name: "SEP IRA",
    value: 46224,
    holdings: "99% ONDS",
    risk: "high",
    detail: "Ondas Holdings — autonomous rail",
    note: "Concentrated single-stock position ⚠️",
    color: "amber",
  },
  {
    name: "Personal Brokerage",
    value: 37987,
    holdings: "98% IREN",
    risk: "high",
    detail: "Iris Energy — Bitcoin mining & AI",
    note: "Concentrated single-stock position ⚠️",
    color: "amber",
  },
  {
    name: "Joint Brokerage",
    value: 14980,
    holdings: "100% HIMS",
    risk: "high",
    detail: "Hims & Hers Health",
    note: "Concentrated single-stock position ⚠️",
    color: "orange",
  },
  {
    name: "Soren 529",
    value: 10303,
    holdings: "Age-based portfolio",
    risk: "low",
    detail: "Minnesota College Savings Plan",
    note: "On track for future education ✅",
    color: "emerald",
  },
];

const TOTAL = 341210;
const GOAL = 1000000;
const PROGRESS = (TOTAL / GOAL) * 100;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const riskColors: Record<string, { badge: string; bar: string; border: string; bg: string }> = {
  low: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    bar: "bg-emerald-500",
    border: "border-emerald-500/20",
    bg: "from-emerald-500/5",
  },
  high: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    bar: "bg-amber-500",
    border: "border-amber-500/20",
    bg: "from-amber-500/5",
  },
};

export default function FinancePage() {
  const concentratedCount = accounts.filter((a) => a.risk === "high").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-green-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Portfolio</h1>
              <p className="text-sm text-muted-foreground">Total net worth snapshot</p>
            </div>
          </div>
          {/* Hero total */}
          <div>
            <p className="text-5xl font-bold tracking-tight text-emerald-300 sm:text-6xl">
              {formatCurrency(TOTAL)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Snapshot · Feb 28, 2026</p>
          </div>
        </div>
      </div>

      {/* Goal tracker */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold">Goal Tracker</h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            {PROGRESS.toFixed(1)}% there
          </Badge>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-emerald-300">{formatCurrency(TOTAL)}</span>
          <span className="text-muted-foreground">of</span>
          <span className="text-xl font-semibold">{formatCurrency(GOAL)}</span>
          <span className="text-muted-foreground text-sm">goal</span>
        </div>
        <div className="h-3 w-full rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-1000"
            style={{ width: `${PROGRESS}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatCurrency(GOAL - TOTAL)} remaining to {formatCurrency(GOAL)} milestone
        </p>
      </Card>

      {/* Risk summary */}
      <Card className="border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-300">Risk Summary</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {concentratedCount} accounts with concentrated single-stock positions.{" "}
              {formatCurrency(
                accounts.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0)
              )}{" "}
              ({((accounts.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0) / TOTAL) * 100).toFixed(0)}% of portfolio) in individual stocks.
            </p>
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-medium text-amber-300">Dave&apos;s Investment Thesis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                &quot;BNPL macro tailwind → SEZL adoption. Long-term believer. These are conviction plays, not mistakes.&quot;
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Account cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          Accounts
        </h2>
        <div className="space-y-3">
          {accounts.map((account) => {
            const pct = (account.value / TOTAL) * 100;
            const rc = riskColors[account.risk];
            return (
              <Card
                key={account.name}
                className={`border ${rc.border} bg-gradient-to-r ${rc.bg} to-transparent p-4 transition-all hover:shadow-lg`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{account.name}</h3>
                      <Badge className={`text-[10px] ${rc.badge}`}>
                        {account.risk === "low" ? "✅ Diversified" : "⚠️ Concentrated"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{account.holdings}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{account.detail}</p>
                    {/* Allocation bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5">
                        <div
                          className={`h-1.5 rounded-full ${rc.bar} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">{formatCurrency(account.value)}</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {account.risk === "low" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Portfolio breakdown */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <h2 className="font-semibold">Allocation Overview</h2>
        </div>
        <div className="space-y-2">
          {accounts.map((account) => {
            const pct = (account.value / TOTAL) * 100;
            return (
              <div key={account.name} className="flex items-center gap-3 text-sm">
                <span className="w-36 text-muted-foreground shrink-0">{account.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {formatCurrency(account.value)}
                </span>
                <span className="w-12 text-right text-xs text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

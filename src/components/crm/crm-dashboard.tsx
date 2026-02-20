"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Target, DollarSign, Mail, ArrowRight, TrendingUp } from "lucide-react";

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

const stageColors: Record<string, string> = {
  lead: "bg-slate-500/20 text-slate-400",
  qualified: "bg-blue-500/20 text-blue-400",
  proposal: "bg-purple-500/20 text-purple-400",
  negotiation: "bg-amber-500/20 text-amber-400",
  closed_won: "bg-emerald-500/20 text-emerald-400",
  closed_lost: "bg-red-500/20 text-red-400",
};

export function CrmDashboard() {
  const stats = useQuery(api.clients.dashboardStats);
  const pipelineSummary = useQuery(api.pipeline.summary);
  const dueTodayList = useQuery(api.outreach.dueToday);
  const clients = useQuery(api.clients.list, {});

  if (!stats || !pipelineSummary) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading CRM...</div>;
  }

  const recentClients = clients?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Dashboard</h1>
          <p className="text-sm text-muted-foreground">Client pipeline & outreach overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/clients">
            <Button variant="outline" size="sm">View All Clients</Button>
          </Link>
          <Link href="/crm/outreach">
            <Button variant="outline" size="sm">Outreach Tracker</Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProspects}</p>
                <p className="text-xs text-muted-foreground">Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-xs text-muted-foreground">Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.pipelineValue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Mail className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outreachSentThisWeek}</p>
                <p className="text-xs text-muted-foreground">Sent This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(pipelineSummary.byStage).map(([stage, data]) => (
                <div key={stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={stageColors[stage]}>
                      {stageLabels[stage]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{data.count} deals</span>
                  </div>
                  <span className="text-sm font-medium">
                    ${(data.value / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex items-center justify-between font-medium">
                <span>Total</span>
                <span>${(pipelineSummary.totalValue / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups Due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Follow-ups Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dueTodayList && dueTodayList.length > 0 ? (
              <div className="space-y-2">
                {dueTodayList.map((o) => (
                  <div key={o._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{o.subject || "No subject"}</p>
                      <p className="text-xs text-muted-foreground">Due: {o.nextFollowUpDate}</p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">{o.type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No follow-ups due today 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Recent Clients</span>
            <Link href="/crm/clients">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentClients.map((client) => (
              <Link key={client._id} href={`/crm/clients/${client._id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.category}</p>
                </div>
                <Badge variant="secondary" className={
                  client.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                  client.status === "prospect" ? "bg-slate-500/20 text-slate-400" :
                  client.status === "contacted" ? "bg-blue-500/20 text-blue-400" :
                  "bg-purple-500/20 text-purple-400"
                }>
                  {client.status}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

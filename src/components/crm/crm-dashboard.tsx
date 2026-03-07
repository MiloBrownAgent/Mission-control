"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Building2, Mail, ArrowRight, Briefcase, Zap, UserCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  prospect: "bg-slate-500/20 text-slate-400",
  contacted: "bg-blue-500/20 text-blue-400",
  responded: "bg-purple-500/20 text-purple-400",
  meeting: "bg-amber-500/20 text-amber-400",
  proposal: "bg-orange-500/20 text-orange-400",
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-red-500/20 text-red-400",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-slate-500/20 text-slate-400",
};

function ProductionCompanies() {
  const clients = useQuery(api.clients.list, { category: "Production House" as any });
  const allContacts = useQuery(api.crmContacts.list);

  if (!clients || !allContacts) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3">
      {clients.map((co) => {
        const contacts = allContacts.filter((c) => c.clientId === co._id);
        const primary = contacts.find((c) => c.isPrimary);
        return (
          <div key={co._id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{co.name}</p>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">Active</Badge>
            </div>
            {primary && (
              <p className="text-xs text-muted-foreground">
                {primary.name} — {primary.title}
                {primary.email && <span className="ml-1 opacity-60">· {primary.email}</span>}
              </p>
            )}
            {contacts.length > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">+{contacts.length - 1} more contact{contacts.length > 2 ? "s" : ""}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductionContacts() {
  const producers = useQuery(api.contacts.listByTag, { tag: "producer" });
  if (!producers) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (producers.length === 0) return <p className="text-sm text-muted-foreground">No production contacts yet.</p>;
  return (
    <div className="space-y-2">
      {producers.map((p) => (
        <div key={p._id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="bg-violet-500/20 text-violet-400 text-xs">{p.role}</Badge>
            {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OutreachQueue() {
  const queue = useQuery(api.contacts.listOutreachQueue);
  if (!queue) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (queue.length === 0) return <p className="text-sm text-muted-foreground">Queue is clear 🎉</p>;

  return (
    <div className="space-y-2">
      {queue.map((c) => {
        const priority = c.tags.includes("priority-high") ? "high" : c.tags.includes("priority-medium") ? "medium" : "low";
        const contacted = c.tags.includes("contacted");
        return (
          <div key={c._id} className={`rounded-lg border border-border p-3 ${contacted ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role} · {c.company}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.notes}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary" className={`text-xs ${priorityColors[priority]}`}>
                  {priority}
                </Badge>
                {contacted && <span className="text-xs text-emerald-400">✓ done</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveClients() {
  const clients = useQuery(api.clients.list, { status: "active" as any });
  const allCrmContacts = useQuery(api.crmContacts.list);

  if (!clients || !allCrmContacts) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const workClients = clients.filter(c => c.category !== "Production House");

  return (
    <div className="space-y-2">
      {workClients.map((client) => {
        const contacts = allCrmContacts.filter((c) => c.clientId === client._id);
        const primary = contacts.find((c) => c.isPrimary);
        return (
          <Link key={client._id} href={`/crm/clients/${client._id}`}
            className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{client.name}</p>
              {primary && <p className="text-xs text-muted-foreground">{primary.name} · {primary.title}</p>}
            </div>
            <Badge variant="secondary" className={statusColors[client.status]}>
              {client.status}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

export function CrmDashboard() {
  const stats = useQuery(api.clients.dashboardStats);

  if (!stats) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading CRM...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-muted-foreground">Clients, production contacts & outreach</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/clients">
            <Button variant="outline" size="sm">All Clients</Button>
          </Link>
          <Link href="/crm/outreach">
            <Button variant="outline" size="sm">Outreach</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <UserCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeClients}</p>
                <p className="text-xs text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <Building2 className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.productionHouses}</p>
                <p className="text-xs text-muted-foreground">Production Cos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outreachQueue}</p>
                <p className="text-xs text-muted-foreground">To Contact</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><UserCheck className="h-4 w-4" /> Active Clients</span>
              <Link href="/crm/clients">
                <Button variant="ghost" size="sm" className="text-xs">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveClients />
          </CardContent>
        </Card>

        {/* Production Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Production Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionCompanies />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Outreach Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-400" /> Outreach Queue
              <span className="ml-auto text-xs font-normal text-muted-foreground">People to contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OutreachQueue />
          </CardContent>
        </Card>

        {/* Production Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Production Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductionContacts />
          </CardContent>
        </Card>
      </div>

      {/* Outreach Due */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Follow-ups Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OutreachDue />
        </CardContent>
      </Card>
    </div>
  );
}

function OutreachDue() {
  const dueTodayList = useQuery(api.outreach.dueToday);
  if (!dueTodayList) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (dueTodayList.length === 0) return <p className="text-sm text-muted-foreground">No follow-ups due today 🎉</p>;
  return (
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
  );
}

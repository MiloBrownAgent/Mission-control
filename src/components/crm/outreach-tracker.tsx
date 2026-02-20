"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, BarChart3 } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  sent: "bg-blue-500/20 text-blue-400",
  opened: "bg-purple-500/20 text-purple-400",
  replied: "bg-emerald-500/20 text-emerald-400",
  bounced: "bg-red-500/20 text-red-400",
};

export function OutreachTracker() {
  const allOutreach = useQuery(api.outreach.list);
  const dueToday = useQuery(api.outreach.dueToday);
  const stats = useQuery(api.outreach.stats);
  const contacts = useQuery(api.crmContacts.list);

  if (!allOutreach || !stats) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const contactMap = new Map(contacts?.map(c => [c._id, c]) ?? []);
  const today = new Date().toISOString().split("T")[0];
  const overdue = allOutreach.filter(o => o.nextFollowUpDate && o.nextFollowUpDate < today && o.status !== "replied" && o.status !== "bounced");
  const upcoming = allOutreach.filter(o => o.nextFollowUpDate && o.nextFollowUpDate >= today).sort((a, b) => (a.nextFollowUpDate || "").localeCompare(b.nextFollowUpDate || ""));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Outreach Tracker</h1>
          <p className="text-sm text-muted-foreground">{allOutreach.length} total outreach records</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(stats).filter(([k]) => k !== "total").map(([key, val]) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold">{val}</p>
              <p className="text-xs text-muted-foreground capitalize">{key}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" /> Overdue ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length > 0 ? (
              <div className="space-y-2">
                {overdue.map(o => {
                  const contact = contactMap.get(o.contactId);
                  return (
                    <div key={o._id} className="rounded-lg border border-red-500/20 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{contact?.name || "Unknown"}</p>
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400 text-[10px]">
                          Due: {o.nextFollowUpDate}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.subject || o.type}</p>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No overdue follow-ups 🎉</p>}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.slice(0, 10).map(o => {
                  const contact = contactMap.get(o.contactId);
                  return (
                    <div key={o._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{contact?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{o.subject || o.type}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{o.nextFollowUpDate}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No upcoming follow-ups</p>}
          </CardContent>
        </Card>
      </div>

      {/* All Outreach */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> All Outreach
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Next Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {allOutreach.map(o => {
                  const contact = contactMap.get(o.contactId);
                  return (
                    <tr key={o._id} className="border-b border-border last:border-0 hover:bg-accent/30">
                      <td className="p-4 text-sm">{contact?.name || "Unknown"}</td>
                      <td className="p-4"><Badge variant="outline" className="text-xs">{o.type}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{o.subject || "—"}</td>
                      <td className="p-4"><Badge variant="secondary" className={`text-[10px] ${statusColors[o.status]}`}>{o.status}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{o.nextFollowUpDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

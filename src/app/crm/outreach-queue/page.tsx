"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Send, Mail, Building2, User, SkipForward } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  sent: "bg-blue-500/20 text-blue-400",
  bounced: "bg-red-500/20 text-red-400",
  replied: "bg-purple-500/20 text-purple-400",
  skipped: "bg-slate-500/20 text-slate-300 opacity-50",
};

function getCompanyDomain(company: string): string {
  const domainMap: Record<string, string> = {
    "Glossier": "glossier.com",
    "Cleveland Clinic": "my.clevelandclinic.org",
    "Condé Nast": "condenast.com",
    "Leo Burnett Chicago": "leoburnett.com",
    "Energy BBDO Chicago": "energybbdo.com",
    "General Mills": "generalmills.com",
    "Medtronic": "medtronic.com",
    "Lululemon": "lululemon.com",
    "On Running": "on-running.com",
    "72andSunny": "72andsunny.com",
    "Wieden+Kennedy New York": "wk.com",
    "Periscope (Quad Company)": "periscopeonline.com",
    "Allina Health": "allinahealth.org",
    "Colle McVoy": "collemcvoy.com",
    "Carmichael Lynch": "carmichaellynch.com",
  };
  return domainMap[company] || company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

export default function OutreachQueuePage() {
  const emails = useQuery(api.prospectEmails.list, {});
  const stats = useQuery(api.prospectEmails.stats);
  const approve = useMutation(api.prospectEmails.approve);
  const unapprove = useMutation(api.prospectEmails.unapprove);
  const skip = useMutation(api.prospectEmails.skip);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "approved" | "sent">("all");

  const filtered = emails?.filter((e) => {
    if (filter === "all") return e.status !== "skipped";
    return e.status === filter;
  }) ?? [];

  const approvedEmails = emails?.filter((e) => e.status === "approved") ?? [];

  const handleApprove = async (id: Id<"prospectEmails">) => {
    await approve({ id });
  };

  const handleUnapprove = async (id: Id<"prospectEmails">) => {
    await unapprove({ id });
  };

  const handleSkip = async (id: Id<"prospectEmails">) => {
    await skip({ id });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Outreach Queue</h1>
              <p className="text-sm text-muted-foreground">Review and approve personalized prospect emails</p>
            </div>
          </div>
          {approvedEmails.length > 0 && (
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
              <Send className="h-4 w-4" />
              Send All Approved ({approvedEmails.length})
            </Button>
          )}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Draft", value: stats.draft, color: "text-slate-400" },
              { label: "Approved", value: stats.approved, color: "text-emerald-400" },
              { label: "Sent", value: stats.sent, color: "text-blue-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "draft", "approved", "sent"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Email cards */}
        <div className="space-y-3">
          {!emails ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading emails...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No emails in this queue yet.</p>
            </div>
          ) : (
            filtered.map((email) => {
              const isExpanded = expandedId === email._id;
              const domain = getCompanyDomain(email.company);
              return (
                <Card
                  key={email._id}
                  className={`border-border bg-card transition-all ${email.status === "approved" ? "border-emerald-800/50" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: logo + meta */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://logo.clearbit.com/${domain}`}
                            alt={email.company}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <Building2 className="h-4 w-4 text-muted-foreground hidden" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{email.company}</p>
                            <Badge className={`text-xs ${statusColors[email.status]}`}>{email.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{email.prospectName}</p>
                            {email.role && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <p className="text-xs text-muted-foreground">{email.role}</p>
                              </>
                            )}
                          </div>
                          <p className="text-xs font-medium mt-1 text-foreground/80">Subject: {email.subject}</p>
                        </div>
                      </div>
                      {/* Right: actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {email.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-slate-300 h-7 px-2 text-xs"
                              onClick={() => handleSkip(email._id as Id<"prospectEmails">)}
                            >
                              <SkipForward className="h-3 w-3 mr-1" />
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 px-3 text-xs gap-1"
                              onClick={() => handleApprove(email._id as Id<"prospectEmails">)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve
                            </Button>
                          </>
                        )}
                        {email.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-slate-300 h-7 px-2 text-xs"
                            onClick={() => handleUnapprove(email._id as Id<"prospectEmails">)}
                          >
                            Unapprove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedId(isExpanded ? null : email._id)}
                    >
                      {isExpanded ? (
                        <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground/90 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {email.body}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground line-clamp-2 hover:text-muted-foreground/80 transition-colors">
                          {email.body.split("\n")[0]}... <span className="text-emerald-500/70">Read more</span>
                        </p>
                      )}
                    </button>
                    {email.email && (
                      <p className="text-xs text-muted-foreground/50 mt-2">To: {email.email}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

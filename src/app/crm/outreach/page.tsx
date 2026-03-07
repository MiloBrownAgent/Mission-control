"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, CheckCircle, XCircle, Send, SkipForward, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  sent: "bg-blue-500/20 text-blue-400",
  replied: "bg-purple-500/20 text-purple-400",
  skipped: "bg-red-500/20 text-red-400",
  bounced: "bg-orange-500/20 text-orange-400",
};

type StatusFilter = "all" | "draft" | "approved" | "sent" | "replied" | "skipped";

export default function OutreachPage() {
  const [filter, setFilter] = useState<StatusFilter>("draft");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useQuery(api.prospectEmails.stats);
  const emails = useQuery(api.prospectEmails.list, filter === "all" ? {} : { status: filter as any });

  const approve = useMutation(api.prospectEmails.approve);
  const unapprove = useMutation(api.prospectEmails.unapprove);
  const skip = useMutation(api.prospectEmails.skip);

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: stats?.total },
    { key: "draft", label: "Drafts", count: stats?.draft },
    { key: "approved", label: "Approved", count: stats?.approved },
    { key: "sent", label: "Sent", count: stats?.sent },
    { key: "replied", label: "Replied", count: stats?.replied },
    { key: "skipped", label: "Skipped", count: stats?.skipped },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Outreach</h1>
            <p className="text-sm text-muted-foreground">Review, approve, and send prospect emails</p>
          </div>
        </div>
        {stats && stats.approved > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
            <Send className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              {stats.approved} approved — tell Milo "send email" to send
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border text-muted-foreground hover:text-white"
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === f.key ? "bg-white/20" : "bg-white/10"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Send reminder banner */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-amber-400">
            <strong>Hard rule:</strong> Milo never sends emails without your explicit approval. Click Approve on each email you want sent, then say <strong>"send email"</strong> in chat. That's the only trigger.
          </p>
        </CardContent>
      </Card>

      {/* Email list */}
      <div className="space-y-3">
        {!emails && <p className="text-sm text-muted-foreground">Loading...</p>}
        {emails?.length === 0 && <p className="text-sm text-muted-foreground">No emails in this category.</p>}
        {emails?.map((email) => {
          const isExpanded = expandedId === email._id;
          return (
            <Card key={email._id} className={`transition-colors ${email.status === "approved" ? "border-emerald-500/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{email.prospectName}</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground">{email.role}</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground">{email.company}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <Mail className="inline h-3 w-3 mr-1" />{email.email}
                    </p>
                    <p className="text-sm font-medium text-white/80">"{email.subject}"</p>
                    {email.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{email.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={statusColors[email.status]}>{email.status}</Badge>
                    {email.category && (
                      <Badge variant="outline" className="text-xs">{email.category}</Badge>
                    )}
                  </div>
                </div>

                {/* Preview toggle */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setExpandedId(isExpanded ? null : email._id)}
                  >
                    {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isExpanded ? "Hide email" : "Preview email"}
                  </Button>

                  {email.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approve({ id: email._id as Id<"prospectEmails"> })}
                      >
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-red-400"
                        onClick={() => skip({ id: email._id as Id<"prospectEmails"> })}
                      >
                        <SkipForward className="h-3 w-3" /> Skip
                      </Button>
                    </>
                  )}

                  {email.status === "approved" && (
                    <>
                      <span className="text-xs text-emerald-400 font-medium">✓ Approved — awaiting "send email"</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground"
                        onClick={() => unapprove({ id: email._id as Id<"prospectEmails"> })}
                      >
                        <XCircle className="h-3 w-3" /> Undo
                      </Button>
                    </>
                  )}

                  {email.status === "sent" && (
                    <span className="text-xs text-blue-400">Sent from milo@lookandseen.com</span>
                  )}
                </div>

                {/* Expanded email body */}
                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-border bg-black/20 p-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Email Preview</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      <strong>To:</strong> {email.email}<br />
                      <strong>CC:</strong> dave@lookandseen.com<br />
                      <strong>From:</strong> milo@lookandseen.com<br />
                      <strong>Subject:</strong> {email.subject}
                    </p>
                    <div className="border-t border-border pt-3">
                      <pre className="text-sm whitespace-pre-wrap font-sans text-white/80 leading-relaxed">
                        {email.body}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

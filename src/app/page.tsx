"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/lib/app-mode";
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  ArrowRight,
  ListTodo,
  Activity,
  Zap,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Cpu,
  Terminal,
  Layers,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const priorityConfig = {
  low:    { label: "Low",    dot: "bg-[#2E6B50]" },
  medium: { label: "Med",    dot: "bg-[#C07A1A]" },
  high:   { label: "High",   dot: "bg-[#C4533A]" },
  urgent: { label: "Urgent", dot: "bg-red-600"   },
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof CalendarDays }> = {
  event:    { label: "Event",    color: "text-[#2A4E8A]", icon: CalendarDays },
  task:     { label: "Task",     color: "text-[#C07A1A]", icon: ListTodo     },
  cron:     { label: "Cron",     color: "text-[#6B5A9B]", icon: Activity     },
  reminder: { label: "Reminder", color: "text-[#2E6B50]", icon: Clock        },
};

const activityIcons: Record<string, { icon: typeof Activity; color: string }> = {
  cron:   { icon: Cpu,      color: "text-[#6B5A9B]" },
  task:   { icon: Layers,   color: "text-[#2A4E8A]" },
  system: { icon: Terminal, color: "text-[#2E6B50]" },
};

const activityTypeColors: Record<string, string> = {
  success: "text-[#2E6B50]",
  info:    "text-[#2A4E8A]",
  warning: "text-[#C07A1A]",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function DashboardPage() {
  const mode = useAppMode();
  const router = useRouter();
  useEffect(() => {
    if (mode === "family") router.replace("/family-home");
  }, [mode, router]);

  const tasks         = useQuery(api.tasks.list);
  const upcomingEvents = useQuery(api.events.listUpcoming, { limit: 5 });
  const activityLog   = useQuery(api.activityLog.recent, { limit: 5 });
  const actionBatch   = useQuery(api.actionItems.getLatestBatch);
  const crmStats      = useQuery(api.clients.dashboardStats);
  const pipelineSummary = useQuery(api.pipeline.summary);

  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [submitting, setSubmitting]   = useState(false);
  const [submitted,  setSubmitted]    = useState(false);

  async function submitApprovals() {
    if (!actionBatch?.items) return;
    const selected = actionBatch.items.filter((i) => checkedIds.has(i._id));
    if (!selected.length) return;
    setSubmitting(true);
    try {
      await fetch("/api/submit-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selected.map((i) => ({ id: i._id, title: i.title })) }),
      });
      setSubmitted(true);
      setCheckedIds(new Set());
    } finally {
      setSubmitting(false);
    }
  }

  const now = useClock();

  const todoCount       = tasks?.filter((t) => t.status === "todo").length       ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const doneCount       = tasks?.filter((t) => t.status === "done").length        ?? 0;
  const upcomingCount   = upcomingEvents?.length ?? 0;

  const wonValue    = pipelineSummary?.byStage?.closed_won?.value    ?? 0;
  const activeValue = (pipelineSummary?.totalValue ?? 0) - wonValue;

  const recentTasks = tasks
    ?.slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="space-y-8">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-[20px] border border-[#E5DDD4] bg-gradient-to-br from-[#2A4E8A]/5 via-[#6B5A9B]/3 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#2A4E8A]/5 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[#6B5A9B]/5 blur-3xl sm:h-48 sm:w-48" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2A4E8A] to-[#6B5A9B] shadow-lg shadow-[#2A4E8A]/15">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-display)] text-[#1C1208]">
                  {getGreeting()}, Dave
                </h1>
                <p className="text-sm text-[#6B5B4E]">
                  {format(now, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold tabular-nums text-[#2A4E8A]">
                {format(now, "h:mm:ss")}
                <span className="text-lg text-[#2A4E8A]/50 ml-1">{format(now, "a")}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {tasks && (
              <p className="text-sm text-[#6B5B4E]">
                You have{" "}
                <span className="font-medium text-[#1C1208]">{inProgressCount} task{inProgressCount !== 1 ? "s" : ""}</span>{" "}
                in progress and{" "}
                <span className="font-medium text-[#1C1208]">{todoCount}</span> waiting.
                {upcomingCount > 0 && (
                  <> Plus{" "}
                    <span className="font-medium text-[#1C1208]">{upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""}</span>.
                  </>
                )}
              </p>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E6B50] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E6B50]" />
              </span>
              <span className="text-xs text-[#2E6B50] font-medium">Milo is online</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-1 rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-4 transition-all duration-200 hover:border-[#2A4E8A]/20 hover:shadow-lg sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A4E8A]/8">
                <Circle className="h-4 w-4 text-[#2A4E8A]" />
              </div>
              <ArrowRight className="h-4 w-4 text-[#6B5B4E] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1C1208]">{todoCount}</p>
            <p className="text-xs text-[#6B5B4E]">To Do</p>
          </Card>
        </Link>

        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-2 rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-4 transition-all duration-200 hover:border-[#C07A1A]/20 hover:shadow-lg sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C07A1A]/8">
                <Clock className="h-4 w-4 text-[#C07A1A]" />
              </div>
              <ArrowRight className="h-4 w-4 text-[#6B5B4E] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1C1208]">{inProgressCount}</p>
            <p className="text-xs text-[#6B5B4E]">In Progress</p>
          </Card>
        </Link>

        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-3 rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-4 transition-all duration-200 hover:border-[#2E6B50]/20 hover:shadow-lg sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E6B50]/8">
                <CheckCircle2 className="h-4 w-4 text-[#2E6B50]" />
              </div>
              <ArrowRight className="h-4 w-4 text-[#6B5B4E] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1C1208]">{doneCount}</p>
            <p className="text-xs text-[#6B5B4E]">Completed</p>
          </Card>
        </Link>

        <Link href="/crm" className="group">
          <Card className="animate-fade-in-up stagger-4 rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-4 transition-all duration-200 hover:border-[#C4533A]/20 hover:shadow-lg sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C4533A]/8">
                <Target className="h-4 w-4 text-[#C4533A]" />
              </div>
              <ArrowRight className="h-4 w-4 text-[#6B5B4E] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1C1208]">{crmStats?.activeClients ?? "—"}</p>
            <p className="text-xs text-[#6B5B4E]">Active Clients</p>
          </Card>
        </Link>
      </div>

      {/* ── CRM Snapshot ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Pipeline value */}
        <Link href="/crm">
          <Card className="rounded-[20px] border-[#B8892A]/15 bg-gradient-to-br from-[#B8892A]/5 to-transparent p-4 h-full transition-all hover:shadow-lg hover:border-[#B8892A]/25">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-[#B8892A]" />
              <span className="text-sm font-medium text-[#B8892A]">Open Pipeline</span>
            </div>
            <p className="text-3xl font-bold text-[#1C1208]">
              {pipelineSummary ? formatCurrency(activeValue) : "—"}
            </p>
            <p className="text-xs text-[#6B5B4E] mt-1">
              {pipelineSummary ? `${pipelineSummary.totalDeals} deal${pipelineSummary.totalDeals !== 1 ? "s" : ""} in pipeline` : "Loading…"}
            </p>
          </Card>
        </Link>

        {/* Prospects */}
        <Link href="/crm">
          <Card className="rounded-[20px] border-[#2A4E8A]/15 bg-gradient-to-br from-[#2A4E8A]/5 to-transparent p-4 h-full transition-all hover:shadow-lg hover:border-[#2A4E8A]/25">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-[#2A4E8A]" />
              <span className="text-sm font-medium text-[#2A4E8A]">Prospects</span>
            </div>
            <p className="text-3xl font-bold text-[#1C1208]">
              {crmStats ? crmStats.totalProspects + crmStats.contacted : "—"}
            </p>
            <p className="text-xs text-[#6B5B4E] mt-1">
              {crmStats ? `${crmStats.responded} responded` : "Loading…"}
            </p>
          </Card>
        </Link>

        {/* Closed won */}
        <Link href="/crm">
          <Card className="rounded-[20px] border-[#2E6B50]/15 bg-gradient-to-br from-[#2E6B50]/5 to-transparent p-4 h-full transition-all hover:shadow-lg hover:border-[#2E6B50]/25">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#2E6B50]" />
              <span className="text-sm font-medium text-[#2E6B50]">Closed Won</span>
            </div>
            <p className="text-3xl font-bold text-[#1C1208]">
              {pipelineSummary ? formatCurrency(wonValue) : "—"}
            </p>
            <p className="text-xs text-[#6B5B4E] mt-1">
              {pipelineSummary
                ? `${pipelineSummary.byStage.closed_won.count} deal${pipelineSummary.byStage.closed_won.count !== 1 ? "s" : ""} closed`
                : "Loading…"}
            </p>
          </Card>
        </Link>
      </div>

      {/* ── Milo Activity + Upcoming Events ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Milo activity feed */}
        <Card className="rounded-[20px] border-[#6B5A9B]/15 bg-gradient-to-br from-[#6B5A9B]/5 to-transparent p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#6B5A9B]" />
            <span className="text-sm font-medium text-[#1C1208]">Milo Activity</span>
            <Badge className="ml-auto bg-[#6B5A9B]/10 text-[#6B5A9B] border-[#6B5A9B]/20 text-[10px]">Live</Badge>
          </div>
          {!activityLog ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-[#E5DDD4]" />)}
            </div>
          ) : activityLog.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-sm text-[#6B5B4E]">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activityLog.map((entry) => {
                const catConfig = activityIcons[entry.category] ?? activityIcons.system;
                const CatIcon = catConfig.icon;
                return (
                  <div key={entry._id} className="flex items-start gap-2.5 rounded-lg border border-[#E5DDD4] bg-[#FFFCF7] p-2.5 hover:bg-[#F0EBE3] transition-colors">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F0EBE3]">
                      <CatIcon className={cn("h-3.5 w-3.5", catConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug font-medium", activityTypeColors[entry.type])}>
                        {entry.message}
                      </p>
                      <p className="text-[10px] text-[#6B5B4E] mt-0.5">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <div className="animate-fade-in-up stagger-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-[#1C1208]">Upcoming</h2>
            <Link href="/calendar" className="flex items-center gap-1 text-xs text-[#6B5B4E] transition-colors hover:text-[#1C1208]">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!upcomingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />)}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <Card className="flex h-32 items-center justify-center border-dashed border-[#E5DDD4] bg-[#FFFCF7] rounded-[20px]">
              <p className="text-sm text-[#6B5B4E]">No upcoming events</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const config = typeConfig[event.type] ?? typeConfig.event;
                const TypeIcon = config.icon;
                return (
                  <Card key={event._id} className="group rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-3.5 transition-all duration-200 hover:border-[#2A4E8A]/15 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0EBE3]", config.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1C1208]">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-[#6B5B4E]">
                          <span>{format(new Date(event.date + "T12:00:00"), "MMM d")}</span>
                          {event.time && <><span className="opacity-30">|</span><span>{event.time}</span></>}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0 text-[10px]", config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Tasks ─────────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up stagger-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-[#1C1208]">Recent Tasks</h2>
          <Link href="/tasks" className="flex items-center gap-1 text-xs text-[#6B5B4E] transition-colors hover:text-[#1C1208]">
            View board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!recentTasks ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />)}
          </div>
        ) : recentTasks.length === 0 ? (
          <Card className="flex h-32 items-center justify-center border-dashed border-[#E5DDD4] bg-[#FFFCF7] rounded-[20px]">
            <p className="text-sm text-[#6B5B4E]">No tasks yet</p>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentTasks.map((task) => {
              const priority = priorityConfig[task.priority];
              const statusIcon =
                task.status === "done"        ? <CheckCircle2 className="h-4 w-4 text-[#2E6B50]" /> :
                task.status === "in_progress" ? <Clock        className="h-4 w-4 text-[#2A4E8A]" /> :
                                                <Circle       className="h-4 w-4 text-[#6B5B4E]" />;
              return (
                <Card key={task._id} className="group rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-3.5 transition-all duration-200 hover:border-[#2A4E8A]/15 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{statusIcon}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", task.status === "done" ? "text-[#6B5B4E] line-through" : "text-[#1C1208]")}>{task.title}</p>
                      <p className="text-xs text-[#6B5B4E]">{formatDistanceToNow(task.updatedAt, { addSuffix: true })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} title={priority.label} />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-[#C4533A]/10 text-[10px] font-medium text-[#C4533A]">
                          {task.assignee === "Dave" ? "D" : "M"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top 10 Action Items ──────────────────────────────────────────────── */}
      <div className="mt-8 animate-fade-in-up stagger-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-[#1C1208] flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#C07A1A]" />
              Today&apos;s Top 10
            </h2>
            <p className="text-xs text-[#6B5B4E] mt-0.5">Generated nightly by Milo · check what you want done, then submit</p>
          </div>
          {actionBatch?.date && (
            <span className="text-[10px] text-[#6B5B4E] tabular-nums">{actionBatch.date}</span>
          )}
        </div>

        {actionBatch === undefined ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />)}
          </div>
        ) : !actionBatch.items?.length ? (
          <Card className="rounded-[20px] border-dashed border-[#E5DDD4] bg-[#FFFCF7] p-8 text-center">
            <p className="text-2xl mb-2">⚡</p>
            <p className="text-sm font-medium text-[#1C1208]">Your Top 10 will be ready tomorrow morning</p>
            <p className="text-xs text-[#6B5B4E] mt-1">Milo generates them every night at 10 PM</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {actionBatch.items.map((item, idx) => {
                const isChecked = checkedIds.has(item._id);
                const isDone    = ["approved","implementing","done"].includes(item.status);
                const catConfig: Record<string, { label: string; bg: string; text: string }> = {
                  LS:       { label: "Look & Seen", bg: "bg-[#C4533A]/10", text: "text-[#C4533A]" },
                  OurFable: { label: "OurFable",    bg: "bg-[#2A4E8A]/10", text: "text-[#2A4E8A]" },
                  Personal: { label: "Personal",    bg: "bg-[#C07A1A]/10", text: "text-[#C07A1A]" },
                  Ops:      { label: "Ops",          bg: "bg-[#2E6B50]/10", text: "text-[#2E6B50]" },
                };
                const cat = catConfig[item.category] ?? catConfig.Ops;
                return (
                  <Card
                    key={item._id}
                    onClick={() => {
                      if (isDone || submitted) return;
                      setCheckedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item._id)) next.delete(item._id);
                        else next.add(item._id);
                        return next;
                      });
                    }}
                    className={`rounded-[20px] border p-4 transition-all duration-150 cursor-pointer select-none ${
                      isDone    ? "border-[#2E6B50]/20 bg-[#2E6B50]/5 opacity-60"
                      : isChecked ? "border-[#C4533A]/30 bg-[#C4533A]/5 shadow-sm"
                      : "border-[#E5DDD4] bg-[#FFFCF7] hover:border-[#C4533A]/20 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-[#2E6B50]" />
                        ) : (
                          <div className={`h-4 w-4 rounded border-2 transition-colors ${isChecked ? "border-[#C4533A] bg-[#C4533A]" : "border-[#E5DDD4]"} flex items-center justify-center`}>
                            {isChecked && <span className="text-white text-[9px] font-bold">✓</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-medium text-[#6B5B4E] tabular-nums">{idx + 1}.</span>
                          <p className="text-sm font-semibold text-[#1C1208]">{item.title}</p>
                          {isDone && (
                            <span className="rounded-full bg-[#2E6B50]/10 px-2 py-0.5 text-[10px] font-medium text-[#2E6B50]">
                              {item.status === "approved" ? "Approved" : item.status === "implementing" ? "In progress" : "Done"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B5B4E] mt-1 leading-relaxed">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.text}`}>{cat.label}</span>
                          <span className="rounded-full bg-[#F0EBE3] px-2 py-0.5 text-[10px] text-[#6B5B4E]">{item.impact}</span>
                          <span className="rounded-full bg-[#F0EBE3] px-2 py-0.5 text-[10px] text-[#6B5B4E]">{item.effort}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={submitApprovals}
                disabled={checkedIds.size === 0 || submitting || submitted}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  submitted        ? "bg-[#2E6B50]/10 text-[#2E6B50] cursor-default"
                  : checkedIds.size === 0 ? "bg-[#F0EBE3] text-[#6B5B4E] cursor-not-allowed"
                  : "bg-gradient-to-r from-[#C4533A] to-[#C07A1A] text-white hover:opacity-90 shadow-sm"
                }`}
              >
                <Zap className="h-4 w-4" />
                {submitted       ? "Sent to Milo ✓"
                 : submitting    ? "Sending..."
                 : checkedIds.size === 0 ? "Select items to approve"
                 : `Submit ${checkedIds.size} item${checkedIds.size > 1 ? "s" : ""} for implementation →`}
              </button>
              {!submitted && checkedIds.size > 0 && (
                <button onClick={() => setCheckedIds(new Set())} className="text-xs text-[#6B5B4E] hover:text-[#1C1208] transition-colors">
                  Clear
                </button>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

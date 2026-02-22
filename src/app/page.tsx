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
  Brain,
  CalendarDays,
  ArrowRight,
  ListTodo,
  Activity,
  Zap,
  Cloud,
  Baby,
  Gift,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Cpu,
  Terminal,
  Layers,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const priorityConfig = {
  low: { label: "Low", dot: "bg-[#2E6B50]" },
  medium: { label: "Med", dot: "bg-[#C07A1A]" },
  high: { label: "High", dot: "bg-[#C4533A]" },
  urgent: { label: "Urgent", dot: "bg-red-600" },
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof CalendarDays }> = {
  event: { label: "Event", color: "text-[#2A4E8A]", icon: CalendarDays },
  task: { label: "Task", color: "text-[#C07A1A]", icon: ListTodo },
  cron: { label: "Cron", color: "text-[#6B5A9B]", icon: Activity },
  reminder: { label: "Reminder", color: "text-[#2E6B50]", icon: Clock },
};

const activityIcons: Record<string, { icon: typeof Activity; color: string }> = {
  cron: { icon: Cpu, color: "text-[#6B5A9B]" },
  task: { icon: Layers, color: "text-[#2A4E8A]" },
  system: { icon: Terminal, color: "text-[#2E6B50]" },
};

const activityTypeColors: Record<string, string> = {
  success: "text-[#2E6B50]",
  info: "text-[#2A4E8A]",
  warning: "text-[#C07A1A]",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  const days = Math.floor(diffDays - months * 30.4375);
  return { months, days };
}

function getDaysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  description: string;
  emoji: string;
  location: string;
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => null);
  }, []);
  return weather;
}

const PORTFOLIO_TOTAL = 341210;
const PORTFOLIO_GOAL = 1000000;

const portfolioAccounts = [
  { name: "TRUST", value: 123531, risk: "low" },
  { name: "Roth IRA", value: 108185, risk: "high", ticker: "SEZL" },
  { name: "SEP IRA", value: 46224, risk: "high", ticker: "ONDS" },
  { name: "Brokerage", value: 37987, risk: "high", ticker: "IREN" },
  { name: "Joint", value: 14980, risk: "high", ticker: "HIMS" },
  { name: "529", value: 10303, risk: "low" },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export default function DashboardPage() {
  const mode = useAppMode();
  const router = useRouter();
  useEffect(() => {
    if (mode === 'family') router.replace('/family-home');
  }, [mode, router]);

  const tasks = useQuery(api.tasks.list);
  const memories = useQuery(api.memories.list);
  const upcomingEvents = useQuery(api.events.listUpcoming, { limit: 5 });
  const activityLog = useQuery(api.activityLog.recent, { limit: 5 });
  const actionBatch = useQuery(api.actionItems.getLatestBatch);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
  const weather = useWeather();
  const sorenAge = getSorenAge();
  const daysUntilCammie = getDaysUntil("2026-02-25");
  const daysTo9Months = getDaysUntil("2026-03-21");

  const todoCount = tasks?.filter((t) => t.status === "todo").length ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalMemories = memories?.length ?? 0;
  const upcomingCount = upcomingEvents?.length ?? 0;

  const recentTasks = tasks
    ?.slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
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
            {/* Live clock */}
            <div className="text-right">
              <p className="text-3xl font-mono font-bold tabular-nums text-[#2A4E8A]">
                {format(now, "h:mm:ss")}
                <span className="text-lg text-[#2A4E8A]/50 ml-1">{format(now, "a")}</span>
              </p>
              <div className="flex items-center justify-end gap-2 mt-1">
                <Badge className="bg-[#C07A1A]/10 text-[#C07A1A] border-[#C07A1A]/20 text-[10px]">
                  ✈️ Dave returns from Naples today
                </Badge>
              </div>
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
                  <> Plus <span className="font-medium text-[#1C1208]">{upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""}</span>.</>
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

      {/* Quick Stats */}
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
        <Link href="/memories" className="group">
          <Card className="animate-fade-in-up stagger-4 rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-4 transition-all duration-200 hover:border-[#6B5A9B]/20 hover:shadow-lg sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6B5A9B]/8">
                <Brain className="h-4 w-4 text-[#6B5A9B]" />
              </div>
              <ArrowRight className="h-4 w-4 text-[#6B5B4E] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#1C1208]">{totalMemories}</p>
            <p className="text-xs text-[#6B5B4E]">Memories</p>
          </Card>
        </Link>
      </div>

      {/* Widget row: Weather + Soren + Cammie countdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Weather widget */}
        <Card className="rounded-[20px] border-[#2A4E8A]/15 bg-gradient-to-br from-[#2A4E8A]/5 to-transparent p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="h-4 w-4 text-[#2A4E8A]" />
            <span className="text-sm font-medium text-[#2A4E8A]">Weather</span>
          </div>
          {weather ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl">{weather.emoji}</span>
                <span className="text-3xl font-bold text-[#1C1208]">{weather.temp}°F</span>
              </div>
              <p className="text-sm text-[#6B5B4E] mt-1">{weather.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#6B5B4E]">
                <span>↑ {weather.high}°</span>
                <span>↓ {weather.low}°</span>
                <span>Feels {weather.feelsLike}°</span>
              </div>
              <p className="text-[10px] text-[#2A4E8A]/50 mt-2">{weather.location}</p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-8 w-24 animate-pulse rounded bg-[#E5DDD4]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#E5DDD4]" />
            </div>
          )}
        </Card>

        {/* Soren tracker */}
        <Link href="/family">
          <Card className="rounded-[20px] border-[#2E6B50]/15 bg-gradient-to-br from-[#2E6B50]/5 to-transparent p-4 transition-all hover:border-[#2E6B50]/30 hover:shadow-lg h-full">
            <div className="flex items-center gap-2 mb-3">
              <Baby className="h-4 w-4 text-[#2E6B50]" />
              <span className="text-sm font-medium text-[#2E6B50]">Soren</span>
              <Badge className="bg-[#2E6B50]/10 text-[#2E6B50] border-[#2E6B50]/20 text-[10px] ml-auto">
                👶
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#2E6B50]">{sorenAge.months}</span>
              <span className="text-[#6B5B4E] text-sm">mo</span>
              <span className="text-2xl font-bold text-[#2E6B50]/70">{sorenAge.days}</span>
              <span className="text-[#6B5B4E] text-sm">days</span>
            </div>
            <p className="text-xs text-[#6B5B4E] mt-1">Born June 21, 2025</p>
            <div className="mt-2 text-[10px] text-[#2E6B50]/50">
              9-month milestone in {daysTo9Months > 0 ? `${daysTo9Months} days` : "🎉 today!"} (Mar 21)
            </div>
          </Card>
        </Link>

        {/* Cammie countdown */}
        <Card className={cn(
          "rounded-[20px] p-4 transition-all",
          daysUntilCammie <= 7 && daysUntilCammie >= 0
            ? "border-[#C4533A]/25 bg-gradient-to-br from-[#C4533A]/6 to-transparent"
            : "border-[#E5DDD4] bg-[#FFFCF7]"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-[#C4533A]" />
            <span className="text-sm font-medium text-[#C4533A]">Cammie&apos;s 70th 🎂</span>
          </div>
          {daysUntilCammie > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#C4533A]">{daysUntilCammie}</span>
                <span className="text-[#6B5B4E]">days away</span>
              </div>
              <p className="text-xs text-[#6B5B4E] mt-1">Feb 25, 2026</p>
              {daysUntilCammie <= 7 && (
                <Badge className="mt-2 bg-[#C4533A]/10 text-[#C4533A] border-[#C4533A]/20 text-[10px]">
                  🔥 Coming up fast!
                </Badge>
              )}
            </>
          ) : (
            <div>
              <span className="text-2xl">🎉</span>
              <p className="text-sm text-[#C4533A] font-medium mt-1">Happy Birthday Cammie!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Portfolio snapshot + Activity feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Portfolio snapshot */}
        <Link href="/finance">
          <Card className="rounded-[20px] border-[#B8892A]/15 bg-gradient-to-br from-[#B8892A]/5 to-transparent p-5 transition-all hover:shadow-xl hover:border-[#B8892A]/25 h-full">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-[#B8892A]" />
              <span className="text-sm font-medium text-[#1C1208]">Portfolio</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#6B5B4E] ml-auto" />
            </div>
            {/* Total */}
            <div className="flex items-baseline gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-[#B8892A]" />
              <span className="text-3xl font-bold text-[#B8892A]">{formatCurrency(PORTFOLIO_TOTAL)}</span>
            </div>
            {/* Goal bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 rounded-full bg-[#B8892A]/10">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#B8892A] to-[#C07A1A]"
                  style={{ width: `${(PORTFOLIO_TOTAL / PORTFOLIO_GOAL) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-[#B8892A] font-medium">
                {((PORTFOLIO_TOTAL / PORTFOLIO_GOAL) * 100).toFixed(1)}% of $1M
              </span>
            </div>
            {/* Mini account bars */}
            <div className="space-y-1.5">
              {portfolioAccounts.map((acc) => (
                <div key={acc.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 text-[#6B5B4E] shrink-0">{acc.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-[#E5DDD4]">
                    <div
                      className={cn(
                        "h-1 rounded-full",
                        acc.risk === "low" ? "bg-[#2E6B50]" : "bg-[#C07A1A]"
                      )}
                      style={{ width: `${(acc.value / PORTFOLIO_TOTAL) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[#6B5B4E]">{formatCurrency(acc.value)}</span>
                  {acc.risk === "high" && <AlertTriangle className="h-3 w-3 text-[#C07A1A] shrink-0" />}
                  {acc.risk === "low" && <CheckCircle2 className="h-3 w-3 text-[#2E6B50] shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
        </Link>

        {/* Milo activity feed */}
        <Card className="rounded-[20px] border-[#6B5A9B]/15 bg-gradient-to-br from-[#6B5A9B]/5 to-transparent p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#6B5A9B]" />
            <span className="text-sm font-medium text-[#1C1208]">Milo Activity</span>
            <Badge className="ml-auto bg-[#6B5A9B]/10 text-[#6B5A9B] border-[#6B5A9B]/20 text-[10px]">
              Live
            </Badge>
          </div>
          {!activityLog ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-[#E5DDD4]" />
              ))}
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
                  <div
                    key={entry._id}
                    className="flex items-start gap-2.5 rounded-lg border border-[#E5DDD4] bg-[#FFFCF7] p-2.5 hover:bg-[#F0EBE3] transition-colors"
                  >
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
      </div>

      {/* Two-column layout: Upcoming Events + Recent Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        <div className="animate-fade-in-up stagger-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-[#1C1208]">Upcoming Events</h2>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs text-[#6B5B4E] transition-colors hover:text-[#1C1208]"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!upcomingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />
              ))}
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
                  <Card
                    key={event._id}
                    className="group rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-3.5 transition-all duration-200 hover:border-[#2A4E8A]/15 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0EBE3]", config.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1C1208]">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-[#6B5B4E]">
                          <span>{format(new Date(event.date + "T12:00:00"), "MMM d")}</span>
                          {event.time && (
                            <>
                              <span className="opacity-30">|</span>
                              <span>{event.time}</span>
                            </>
                          )}
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

        {/* Recent Tasks */}
        <div className="animate-fade-in-up stagger-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-[#1C1208]">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs text-[#6B5B4E] transition-colors hover:text-[#1C1208]"
            >
              View board
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!recentTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <Card className="flex h-32 items-center justify-center border-dashed border-[#E5DDD4] bg-[#FFFCF7] rounded-[20px]">
              <p className="text-sm text-[#6B5B4E]">No tasks yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const priority = priorityConfig[task.priority];
                const statusIcon =
                  task.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#2E6B50]" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="h-4 w-4 text-[#2A4E8A]" />
                  ) : (
                    <Circle className="h-4 w-4 text-[#6B5B4E]" />
                  );
                return (
                  <Card
                    key={task._id}
                    className="group rounded-[20px] border-[#E5DDD4] bg-[#FFFCF7] p-3.5 transition-all duration-200 hover:border-[#2A4E8A]/15 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{statusIcon}</div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", task.status === "done" ? "text-[#6B5B4E] line-through" : "text-[#1C1208]")}>{task.title}</p>
                        <p className="text-xs text-[#6B5B4E]">
                          {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
                        </p>
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
      </div>

      {/* ── Top 10 Action Items ── */}
      <div className="mt-8 animate-fade-in-up stagger-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-[#1C1208] flex items-center gap-2">
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
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />
            ))}
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
                const isDone = ["approved","implementing","done"].includes(item.status);
                const catConfig: Record<string, { label: string; bg: string; text: string }> = {
                  LS:        { label: "Look & Seen",  bg: "bg-[#C4533A]/10", text: "text-[#C4533A]" },
                  OurFable:  { label: "OurFable",     bg: "bg-[#2A4E8A]/10", text: "text-[#2A4E8A]" },
                  Personal:  { label: "Personal",     bg: "bg-[#C07A1A]/10", text: "text-[#C07A1A]" },
                  Ops:       { label: "Ops",           bg: "bg-[#2E6B50]/10", text: "text-[#2E6B50]" },
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
                      isDone
                        ? "border-[#2E6B50]/20 bg-[#2E6B50]/5 opacity-60"
                        : isChecked
                        ? "border-[#C4533A]/30 bg-[#C4533A]/5 shadow-sm"
                        : "border-[#E5DDD4] bg-[#FFFCF7] hover:border-[#C4533A]/20 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-[#2E6B50]" />
                        ) : (
                          <div className={`h-4 w-4 rounded border-2 transition-colors ${
                            isChecked ? "border-[#C4533A] bg-[#C4533A]" : "border-[#E5DDD4]"
                          } flex items-center justify-center`}>
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
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.text}`}>
                            {cat.label}
                          </span>
                          <span className="rounded-full bg-[#F0EBE3] px-2 py-0.5 text-[10px] text-[#6B5B4E]">
                            {item.impact}
                          </span>
                          <span className="rounded-full bg-[#F0EBE3] px-2 py-0.5 text-[10px] text-[#6B5B4E]">
                            {item.effort}
                          </span>
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
                  submitted
                    ? "bg-[#2E6B50]/10 text-[#2E6B50] cursor-default"
                    : checkedIds.size === 0
                    ? "bg-[#F0EBE3] text-[#6B5B4E] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#C4533A] to-[#C07A1A] text-white hover:opacity-90 shadow-sm"
                }`}
              >
                <Zap className="h-4 w-4" />
                {submitted
                  ? `Sent to Milo ✓`
                  : submitting
                  ? "Sending..."
                  : checkedIds.size === 0
                  ? "Select items to approve"
                  : `Submit ${checkedIds.size} item${checkedIds.size > 1 ? "s" : ""} for implementation →`}
              </button>
              {!submitted && checkedIds.size > 0 && (
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className="text-xs text-[#6B5B4E] hover:text-[#1C1208] transition-colors"
                >
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

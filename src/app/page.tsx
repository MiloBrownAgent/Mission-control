"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
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
  low: { label: "Low", dot: "bg-emerald-400" },
  medium: { label: "Med", dot: "bg-yellow-400" },
  high: { label: "High", dot: "bg-orange-400" },
  urgent: { label: "Urgent", dot: "bg-red-400" },
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof CalendarDays }> = {
  event: { label: "Event", color: "text-blue-400", icon: CalendarDays },
  task: { label: "Task", color: "text-orange-400", icon: ListTodo },
  cron: { label: "Cron", color: "text-purple-400", icon: Activity },
  reminder: { label: "Reminder", color: "text-emerald-400", icon: Clock },
};

const activityIcons: Record<string, { icon: typeof Activity; color: string }> = {
  cron: { icon: Cpu, color: "text-purple-400" },
  task: { icon: Layers, color: "text-blue-400" },
  system: { icon: Terminal, color: "text-emerald-400" },
};

const activityTypeColors: Record<string, string> = {
  success: "text-emerald-400",
  info: "text-blue-400",
  warning: "text-amber-400",
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
  const tasks = useQuery(api.tasks.list);
  const memories = useQuery(api.memories.list);
  const upcomingEvents = useQuery(api.events.listUpcoming, { limit: 5 });
  const activityLog = useQuery(api.activityLog.recent, { limit: 5 });

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
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-purple-500/10 blur-3xl sm:h-48 sm:w-48" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {getGreeting()}, Dave
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(now, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            {/* Live clock */}
            <div className="text-right">
              <p className="text-3xl font-mono font-bold tabular-nums text-blue-300">
                {format(now, "h:mm:ss")}
                <span className="text-lg text-blue-400/60 ml-1">{format(now, "a")}</span>
              </p>
              <div className="flex items-center justify-end gap-2 mt-1">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  ✈️ Dave returns from Naples today
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {tasks && (
              <p className="text-sm text-muted-foreground">
                You have{" "}
                <span className="font-medium text-foreground">{inProgressCount} task{inProgressCount !== 1 ? "s" : ""}</span>{" "}
                in progress and{" "}
                <span className="font-medium text-foreground">{todoCount}</span> waiting.
                {upcomingCount > 0 && (
                  <> Plus <span className="font-medium text-foreground">{upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""}</span>.</>
                )}
              </p>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Milo is online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-1 border-border bg-card p-4 transition-all duration-200 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Circle className="h-4 w-4 text-blue-400" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold">{todoCount}</p>
            <p className="text-xs text-muted-foreground">To Do</p>
          </Card>
        </Link>
        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-2 border-border bg-card p-4 transition-all duration-200 hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </Card>
        </Link>
        <Link href="/tasks" className="group">
          <Card className="animate-fade-in-up stagger-3 border-border bg-card p-4 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold">{doneCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
        </Link>
        <Link href="/memories" className="group">
          <Card className="animate-fade-in-up stagger-4 border-border bg-card p-4 transition-all duration-200 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Brain className="h-4 w-4 text-purple-400" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-2xl font-bold">{totalMemories}</p>
            <p className="text-xs text-muted-foreground">Memories</p>
          </Card>
        </Link>
      </div>

      {/* Widget row: Weather + Soren + Cammie countdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Weather widget */}
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium text-sky-300">Weather</span>
          </div>
          {weather ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl">{weather.emoji}</span>
                <span className="text-3xl font-bold">{weather.temp}°F</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{weather.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>↑ {weather.high}°</span>
                <span>↓ {weather.low}°</span>
                <span>Feels {weather.feelsLike}°</span>
              </div>
              <p className="text-[10px] text-sky-400/60 mt-2">{weather.location}</p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-8 w-24 animate-pulse rounded bg-white/5" />
              <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
            </div>
          )}
        </Card>

        {/* Soren tracker */}
        <Link href="/family">
          <Card className="border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4 transition-all hover:border-blue-400/40 hover:shadow-lg h-full">
            <div className="flex items-center gap-2 mb-3">
              <Baby className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Soren</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] ml-auto">
                👶
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-300">{sorenAge.months}</span>
              <span className="text-muted-foreground text-sm">mo</span>
              <span className="text-2xl font-bold text-blue-200">{sorenAge.days}</span>
              <span className="text-muted-foreground text-sm">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Born June 21, 2025</p>
            <div className="mt-2 text-[10px] text-blue-400/60">
              9-month milestone in {daysTo9Months > 0 ? `${daysTo9Months} days` : "🎉 today!"} (Mar 21)
            </div>
          </Card>
        </Link>

        {/* Cammie countdown */}
        <Card className={cn(
          "p-4 transition-all",
          daysUntilCammie <= 7 && daysUntilCammie >= 0
            ? "border-rose-500/40 bg-gradient-to-br from-rose-500/15 to-transparent"
            : "border-border bg-card"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-medium text-rose-300">Cammie&apos;s 70th 🎂</span>
          </div>
          {daysUntilCammie > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-rose-300">{daysUntilCammie}</span>
                <span className="text-muted-foreground">days away</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Feb 25, 2026</p>
              {daysUntilCammie <= 7 && (
                <Badge className="mt-2 bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                  🔥 Coming up fast!
                </Badge>
              )}
            </>
          ) : (
            <div>
              <span className="text-2xl">🎉</span>
              <p className="text-sm text-rose-300 font-medium mt-1">Happy Birthday Cammie!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Portfolio snapshot + Activity feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Portfolio snapshot */}
        <Link href="/finance">
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 transition-all hover:shadow-xl hover:border-emerald-500/30 h-full">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Portfolio</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </div>
            {/* Total */}
            <div className="flex items-baseline gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span className="text-3xl font-bold text-emerald-300">{formatCurrency(PORTFOLIO_TOTAL)}</span>
            </div>
            {/* Goal bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 rounded-full bg-emerald-500/10">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                  style={{ width: `${(PORTFOLIO_TOTAL / PORTFOLIO_GOAL) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                {((PORTFOLIO_TOTAL / PORTFOLIO_GOAL) * 100).toFixed(1)}% of $1M
              </span>
            </div>
            {/* Mini account bars */}
            <div className="space-y-1.5">
              {portfolioAccounts.map((acc) => (
                <div key={acc.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 text-muted-foreground shrink-0">{acc.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/5">
                    <div
                      className={cn(
                        "h-1 rounded-full",
                        acc.risk === "low" ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${(acc.value / PORTFOLIO_TOTAL) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-muted-foreground">{formatCurrency(acc.value)}</span>
                  {acc.risk === "high" && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />}
                  {acc.risk === "low" && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
        </Link>

        {/* Milo activity feed */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium">Milo Activity</span>
            <Badge className="ml-auto bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
              Live
            </Badge>
          </div>
          {!activityLog ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : activityLog.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activityLog.map((entry) => {
                const catConfig = activityIcons[entry.category] ?? activityIcons.system;
                const CatIcon = catConfig.icon;
                return (
                  <div
                    key={entry._id}
                    className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/2 p-2.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
                      <CatIcon className={cn("h-3.5 w-3.5", catConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug font-medium", activityTypeColors[entry.type])}>
                        {entry.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
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
            <h2 className="text-lg font-semibold">Upcoming Events</h2>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!upcomingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/30" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <Card className="flex h-32 items-center justify-center border-dashed border-border bg-card">
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const config = typeConfig[event.type] ?? typeConfig.event;
                const TypeIcon = config.icon;
                return (
                  <Card
                    key={event._id}
                    className="group border-border bg-card p-3.5 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted", config.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            <h2 className="text-lg font-semibold">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View board
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!recentTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/30" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <Card className="flex h-32 items-center justify-center border-dashed border-border bg-card">
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const priority = priorityConfig[task.priority];
                const statusIcon =
                  task.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  );
                return (
                  <Card
                    key={task._id}
                    className="group border-border bg-card p-3.5 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{statusIcon}</div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} title={priority.label} />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
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
    </div>
  );
}

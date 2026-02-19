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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const tasks = useQuery(api.tasks.list);
  const memories = useQuery(api.memories.list);
  const upcomingEvents = useQuery(api.events.listUpcoming, { limit: 5 });

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {getGreeting()}, Dave
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>
          {tasks && (
            <p className="mt-4 text-sm text-muted-foreground">
              You have <span className="font-medium text-foreground">{inProgressCount} task{inProgressCount !== 1 ? "s" : ""}</span> in progress and <span className="font-medium text-foreground">{todoCount}</span> waiting.
              {upcomingCount > 0 && (
                <> Plus <span className="font-medium text-foreground">{upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""}</span>.</>
              )}
            </p>
          )}
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

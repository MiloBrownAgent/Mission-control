"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Github,
  Globe,
  Monitor,
  Server,
  Terminal,
  Wifi,
  Zap,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    name: "OpenClaw",
    description: "AI agent runtime",
    status: "operational" as const,
    uptime: "99.9%",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Mac mini",
    description: "Home server",
    status: "operational" as const,
    uptime: "14d 6h 32m",
    icon: Monitor,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "Convex DB",
    description: "Real-time database",
    status: "operational" as const,
    uptime: "99.99%",
    icon: Database,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    name: "Next.js App",
    description: "Mission Control frontend",
    status: "operational" as const,
    uptime: "99.95%",
    icon: Globe,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
];

const quickLinks = [
  {
    name: "Convex Dashboard",
    url: "https://dashboard.convex.dev",
    icon: Database,
    color: "text-purple-400",
  },
  {
    name: "Vercel",
    url: "https://vercel.com/dashboard",
    icon: Globe,
    color: "text-foreground",
  },
  {
    name: "GitHub",
    url: "https://github.com",
    icon: Github,
    color: "text-foreground",
  },
];

const recentActivity = [
  {
    action: "Deployed",
    target: "Mission Control v2.0",
    time: "2 hours ago",
    icon: Globe,
    color: "text-emerald-400",
  },
  {
    action: "Schema updated",
    target: "Added content & contacts tables",
    time: "2 hours ago",
    icon: Database,
    color: "text-purple-400",
  },
  {
    action: "OpenClaw",
    target: "Agent runtime healthy",
    time: "5 min ago",
    icon: Zap,
    color: "text-blue-400",
  },
  {
    action: "Mac mini",
    target: "All services running",
    time: "1 min ago",
    icon: Server,
    color: "text-emerald-400",
  },
  {
    action: "Cron job",
    target: "Daily backup completed",
    time: "6 hours ago",
    icon: Clock,
    color: "text-orange-400",
  },
];

function StatusDot({ status }: { status: "operational" | "degraded" | "down" }) {
  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full",
        status === "operational" && "bg-emerald-400 animate-pulse",
        status === "degraded" && "bg-yellow-400 animate-pulse",
        status === "down" && "bg-red-400"
      )}
    />
  );
}

export function OfficeView() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Office</h2>
        <p className="text-sm text-muted-foreground">
          <Terminal className="mr-1 inline h-3.5 w-3.5" />
          System status & infrastructure
        </p>
      </div>

      {/* Status Overview Banner */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">All Systems Operational</h3>
            <p className="text-sm text-muted-foreground">
              All {services.length} services are running normally
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
          >
            <Wifi className="mr-1 h-3 w-3" />
            Online
          </Badge>
        </div>
      </div>

      {/* Service Status Cards */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Services</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => {
            const ServiceIcon = service.icon;
            return (
              <Card
                key={service.name}
                className={cn(
                  "animate-fade-in-up border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-lg",
                  i < 4 && `stagger-${i + 1}`
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      service.bgColor
                    )}
                  >
                    <ServiceIcon className={cn("h-4 w-4", service.color)} />
                  </div>
                  <StatusDot status={service.status} />
                </div>
                <h4 className="mt-3 text-sm font-semibold">{service.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Activity className="h-2.5 w-2.5" />
                  Uptime: {service.uptime}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Two-column: Quick Links + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Links */}
        <div className="animate-fade-in-up stagger-5">
          <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
          <div className="space-y-2">
            {quickLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Card className="border-border bg-card p-3.5 transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <LinkIcon className={cn("h-4 w-4", link.color)} />
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {link.name}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-in-up stagger-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <Card
                  key={i}
                  className="border-border bg-card p-3.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ItemIcon className={cn("h-4 w-4", item.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.action}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.target}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

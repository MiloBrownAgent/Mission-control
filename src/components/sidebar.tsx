"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  CalendarDays,
  ListTodo,
  Menu,
  X,
  Rocket,
  FileText,
  Users,
  Building2,
  Target,
  Heart,
  TrendingUp,
  Layers,
  UtensilsCrossed,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Memories", href: "/memories", icon: Brain },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Family", href: "/family", icon: Heart },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed },
  { name: "Finance", href: "/finance", icon: TrendingUp },
  { name: "Projects", href: "/projects", icon: Layers },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Team", href: "/team", icon: Users },
  { name: "CRM", href: "/crm", icon: Target },
  { name: "Office", href: "/office", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Rocket className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold">Mission Control</h1>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with gradient accent */}
        <div className="relative flex h-16 items-center gap-3 border-b border-border px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <div className="relative">
            <h1 className="text-sm font-semibold">Mission Control</h1>
            <p className="text-[10px] text-muted-foreground">Sweeney HQ</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-medium text-blue-400">
              D
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Dave Sweeney</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-muted-foreground">Online</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", isActive && "text-blue-400")} />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ⌘K hint */}
        <div className="border-t border-border px-3 py-3">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              document.dispatchEvent(e);
            }}
          >
            <Command className="h-3.5 w-3.5" />
            <span>Command palette</span>
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="text-[10px] text-muted-foreground">
            Mission Control v3.0 — Production
          </p>
        </div>
      </aside>
    </>
  );
}

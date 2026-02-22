"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  ListTodo,
  Brain,
  CalendarDays,
  FileText,
  Users,
  Target,
  Building2,
  Heart,
  TrendingUp,
  Layers,
  UtensilsCrossed,
  Search,
} from "lucide-react";

const commands = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigation" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, group: "Navigation" },
  { label: "Memories", href: "/memories", icon: Brain, group: "Navigation" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, group: "Navigation" },
  { label: "Family", href: "/family", icon: Heart, group: "Navigation" },
  { label: "Meals", href: "/meals", icon: UtensilsCrossed, group: "Navigation" },
  { label: "Finance", href: "/finance", icon: TrendingUp, group: "Navigation" },
  { label: "Projects", href: "/projects", icon: Layers, group: "Navigation" },
  { label: "Content", href: "/content", icon: FileText, group: "Navigation" },
  { label: "Team", href: "/team", icon: Users, group: "Navigation" },
  { label: "CRM", href: "/crm", icon: Target, group: "Navigation" },
  { label: "Office", href: "/office", icon: Building2, group: "Navigation" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col" shouldFilter>
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <Command.Input
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
              placeholder="Go to page..."
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>

            <Command.Group
              heading={
                <span className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Navigation
                </span>
              }
            >
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.href}
                  value={cmd.label}
                  onSelect={() => navigate(cmd.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none
                    data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-white
                    hover:bg-white/5 transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5">
                    <cmd.icon className="h-3.5 w-3.5" />
                  </div>
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">⌘K</kbd>
              toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

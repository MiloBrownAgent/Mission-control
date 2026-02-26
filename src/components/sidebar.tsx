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
  Layers,
  UtensilsCrossed,
  Command,
  ShieldAlert,
  House,
  DollarSign,
  ShoppingCart,
  Wrench,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useAppMode } from "@/lib/app-mode";

const workNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, iconClassName: undefined },
  { name: "Tasks", href: "/tasks", icon: ListTodo, iconClassName: undefined },
  { name: "Calendar", href: "/calendar", icon: CalendarDays, iconClassName: undefined },
  { name: "Family", href: "/family", icon: Heart, iconClassName: undefined },
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, iconClassName: "text-red-600" },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed, iconClassName: undefined },
  { name: "Finance", href: "/finance", icon: DollarSign, iconClassName: undefined },
  { name: "Projects", href: "/projects", icon: Layers, iconClassName: undefined },
  { name: "CRM", href: "/crm", icon: Target, iconClassName: undefined },
  { name: "Content", href: "/content", icon: FileText, iconClassName: undefined },
  { name: "Memories", href: "/memories", icon: Brain, iconClassName: undefined },
  { name: "Team", href: "/team", icon: Users, iconClassName: undefined },
  { name: "Office", href: "/office", icon: Building2, iconClassName: undefined },
  { name: "Client Links", href: "/office/links", icon: Link2, iconClassName: undefined },
];

const familyNavigation = [
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, iconClassName: "text-red-600" },
  { name: "Family", href: "/family", icon: Heart, iconClassName: undefined },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed, iconClassName: undefined },
  { name: "Grocery List", href: "/grocery", icon: ShoppingCart, iconClassName: undefined },
  { name: "Maintenance", href: "/maintenance", icon: Wrench, iconClassName: undefined },
  { name: "Calendar", href: "/calendar", icon: CalendarDays, iconClassName: undefined },
  { name: "Home", href: "/family-home", icon: House, iconClassName: undefined },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mode = useAppMode();

  const navigation = mode === 'family' ? familyNavigation : workNavigation;
  const title = mode === 'family' ? 'Sweeney HQ' : 'Mission Control';
  const subtitle = mode === 'family' ? 'Sweeney Family' : 'Sweeney HQ';
  const gradientFrom = mode === 'family' ? 'from-[#C4533A]' : 'from-[#2A4E8A]';
  const gradientTo = mode === 'family' ? 'to-[#C07A1A]' : 'to-[#6B5A9B]';
  const headerGradient = mode === 'family'
    ? 'from-[#C4533A]/5 via-[#C07A1A]/5 to-transparent'
    : 'from-[#2A4E8A]/5 via-[#6B5A9B]/5 to-transparent';
  const activeGradient = mode === 'family'
    ? 'from-[#C4533A]/10 to-[#C07A1A]/10'
    : 'from-[#2A4E8A]/10 to-[#6B5A9B]/10';
  const activeDot = mode === 'family' ? 'bg-[#C4533A]' : 'bg-[#2A4E8A]';
  const activeIcon = mode === 'family' ? 'text-[#C4533A]' : 'text-[#2A4E8A]';

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-[#E5DDD4] bg-[#FFFCF7]/95 backdrop-blur-sm px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
            <Rocket className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold font-[family-name:var(--font-display)] text-[#1C1208]">{title}</h1>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#1C1208]/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#E5DDD4] bg-[#F2EDE6] transition-transform duration-200 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with gradient accent */}
        <div className="relative flex h-16 items-center gap-3 border-b border-[#E5DDD4] px-6 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${headerGradient}`} />
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} shadow-lg`}>
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <div className="relative">
            <h1 className="text-sm font-semibold font-[family-name:var(--font-display)] text-[#1C1208]">{title}</h1>
            <p className="text-[10px] text-[#6B5B4E]">{subtitle}</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-b border-[#E5DDD4] px-6 py-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={`bg-gradient-to-br ${mode === 'family' ? 'from-[#C4533A]/20 to-[#C07A1A]/20 text-[#C4533A]' : 'from-[#2A4E8A]/20 to-[#6B5A9B]/20 text-[#2A4E8A]'} text-sm font-medium`}>
              {mode === 'family' ? '🏠' : 'D'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-[#1C1208]">
              {mode === 'family' ? 'Sweeney Family' : 'Dave Sweeney'}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#2E6B50] animate-pulse" />
              <p className="text-[10px] text-[#6B5B4E]">
                {mode === 'family' ? 'Family Hub' : 'Online'}
              </p>
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
                    ? `bg-gradient-to-r ${activeGradient} text-[#1C1208] shadow-sm`
                    : "text-[#6B5B4E] hover:bg-[#E5DDD4]/50 hover:text-[#1C1208]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? activeIcon : item.iconClassName
                  )}
                />
                {item.name}
                {isActive && (
                  <div className={`ml-auto h-1.5 w-1.5 rounded-full ${activeDot}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ⌘K hint — only in work mode */}
        {mode === 'work' && (
          <div className="border-t border-[#E5DDD4] px-3 py-3">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#6B5B4E] hover:bg-[#E5DDD4]/50 hover:text-[#1C1208] transition-colors"
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                document.dispatchEvent(e);
              }}
            >
              <Command className="h-3.5 w-3.5" />
              <span>Command palette</span>
              <kbd className="ml-auto rounded border border-[#E5DDD4] bg-[#FFFCF7] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#E5DDD4] px-6 py-3">
          <p className="text-[10px] text-[#6B5B4E]">
            {mode === 'family' ? 'Sweeney HQ — Family Mode' : 'Mission Control v3.0 — Production'}
          </p>
        </div>
      </aside>
    </>
  );
}

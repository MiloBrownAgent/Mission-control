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
  Sparkles,
  Plane,
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
  { name: "CRM", href: "/crm", icon: Target, iconClassName: undefined },
  { name: "Projects", href: "/projects", icon: Layers, iconClassName: undefined },
  { name: "Content", href: "/content", icon: FileText, iconClassName: undefined },
  { name: "Team", href: "/team", icon: Users, iconClassName: undefined },
  { name: "Office", href: "/office", icon: Building2, iconClassName: undefined },
  { name: "Client Links", href: "/office/links", icon: Link2, iconClassName: undefined },
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, iconClassName: "text-red-600" },
];

const familyNavigation = [
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, iconClassName: "text-red-600" },
  { name: "Family", href: "/family", icon: Heart, iconClassName: undefined },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed, iconClassName: undefined },
  { name: "Grocery List", href: "/grocery", icon: ShoppingCart, iconClassName: undefined },
  { name: "Maintenance", href: "/maintenance", icon: Wrench, iconClassName: undefined },
  { name: "Lindsey's List", href: "/cleaning", icon: Sparkles, iconClassName: "text-amber-400" },
  { name: "Travel ✈️", href: "/travel", icon: Plane, iconClassName: undefined },
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

  return (
    <>
      {/* Mobile header bar */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b backdrop-blur-sm px-4 md:hidden",
        mode === 'family'
          ? "border-[#E5DDD4] bg-[#FAF9F6]/95"
          : "border-[#1A1816] bg-[#060606]/95"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#B8956A] to-[#CDAA7E]">
            <Rocket className="h-3.5 w-3.5 text-[#060606]" />
          </div>
          <h1 className={cn("text-sm font-semibold font-[family-name:var(--font-syne)]", mode === 'family' ? "text-[#1C1208]" : "text-[#E8E4DF]")}>{title}</h1>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className={cn(
            "fixed inset-0 z-30 backdrop-blur-sm md:hidden",
            mode === 'family' ? "bg-[#1C1208]/30" : "bg-[#060606]/60"
          )}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-200 md:translate-x-0",
          mode === 'family'
            ? "border-[#E5DDD4] bg-[#F5F2ED]"
            : "border-[#1A1816] bg-[#080806]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with gradient accent */}
        <div className={cn(
          "relative flex h-16 items-center gap-3 border-b px-6 overflow-hidden",
          mode === 'family' ? "border-[#E5DDD4]" : "border-[#1A1816]"
        )}>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r to-transparent",
            mode === 'family'
              ? "from-[#2E6B50]/5 via-[#C07A1A]/5"
              : "from-[#B8956A]/5 via-[#CDAA7E]/5"
          )} />
          <div className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg shadow-lg",
            mode === 'family'
              ? "bg-gradient-to-br from-[#2E6B50] to-[#C07A1A]"
              : "bg-gradient-to-br from-[#B8956A] to-[#CDAA7E]"
          )}>
            {mode === 'family' ? (
              <Heart className="h-4 w-4 text-white" />
            ) : (
              <Rocket className="h-4 w-4 text-[#060606]" />
            )}
          </div>
          <div className="relative">
            <h1 className={cn(
              "text-sm font-semibold font-[family-name:var(--font-syne)]",
              mode === 'family' ? "text-[#1C1208]" : "text-[#E8E4DF]"
            )}>{title}</h1>
            <p className={cn("text-[10px]", mode === 'family' ? "text-[#6B5B4E]" : "text-[#6B6560]")}>{subtitle}</p>
          </div>
        </div>

        {/* User */}
        <div className={cn(
          "flex items-center gap-3 border-b px-6 py-4",
          mode === 'family' ? "border-[#E5DDD4]" : "border-[#1A1816]"
        )}>
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn(
              "text-sm font-medium",
              mode === 'family' ? "bg-[#2E6B50]/10 text-[#2E6B50]" : "bg-[#B8956A]/10 text-[#B8956A]"
            )}>
              {mode === 'family' ? '🏠' : 'D'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={cn(
              "text-sm font-medium",
              mode === 'family' ? "text-[#1C1208]" : "text-[#E8E4DF]"
            )}>
              {mode === 'family' ? 'Sweeney Family' : 'Dave Sweeney'}
            </p>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                mode === 'family' ? "bg-[#2E6B50]" : "bg-[#B8956A]"
              )} />
              <p className={cn("text-[10px]", mode === 'family' ? "text-[#6B5B4E]" : "text-[#6B6560]")}>
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
                  mode === 'family'
                    ? isActive
                      ? "bg-[#2E6B50]/10 text-[#1C1208] border border-[#2E6B50]/20 shadow-sm"
                      : "text-[#6B5B4E] hover:bg-[#EDE9E3] hover:text-[#1C1208]"
                    : isActive
                      ? "bg-[#B8956A]/10 text-[#E8E4DF] border border-[#B8956A]/20 shadow-sm"
                      : "text-[#6B6560] hover:bg-[#1A1816]/60 hover:text-[#E8E4DF]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? mode === 'family' ? "text-[#2E6B50]" : "text-[#B8956A]"
                      : item.iconClassName
                  )}
                />
                {item.name}
                {isActive && (
                  <div className={cn(
                    "ml-auto h-1.5 w-1.5 rounded-full",
                    mode === 'family' ? "bg-[#2E6B50]" : "bg-[#B8956A]"
                  )} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ⌘K hint — only in work mode */}
        {mode === 'work' && (
          <div className="border-t border-[#1A1816] px-3 py-3">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#6B6560] hover:bg-[#1A1816]/60 hover:text-[#E8E4DF] transition-colors"
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                document.dispatchEvent(e);
              }}
            >
              <Command className="h-3.5 w-3.5" />
              <span>Command palette</span>
              <kbd className="ml-auto rounded border border-[#1A1816] bg-[#0D0C0A] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className={cn(
          "border-t px-6 py-3",
          mode === 'family' ? "border-[#E5DDD4]" : "border-[#1A1816]"
        )}>
          <p className={cn("text-[10px]", mode === 'family' ? "text-[#6B5B4E]" : "text-[#6B6560]")}>
            {mode === 'family' ? 'Sweeney HQ — Family Mode' : 'Mission Control v3.0 — Production'}
          </p>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  ShoppingCart,
  Link2,
  Sparkles,
  Plane,
  TrendingUp,
  LayoutGrid,
  Baby,
  Dog,
  BookOpen,
  FolderLock,
  Cake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAppMode } from "@/lib/app-mode";

const workNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "CRM", href: "/crm", icon: Target },
  { name: "Projects", href: "/projects", icon: Layers },
  { name: "Content", href: "/content", icon: FileText },
  { name: "LS Grid", href: "/ls-grid", icon: LayoutGrid },
  { name: "Team", href: "/team", icon: Users },
  { name: "Office", href: "/office", icon: Building2 },
  { name: "Client Links", href: "/office/links", icon: Link2 },
  { name: "Quant", href: "/quant", icon: TrendingUp },
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, urgent: true },
];

const familyNavigation = [
  { name: "Today", href: "/today", icon: LayoutDashboard },
  { name: "Emergency", href: "/emergency", icon: ShieldAlert, urgent: true },
  { name: "Soren", href: "/soren", icon: Baby },
  { name: "Rigs", href: "/rigs", icon: Dog },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed },
  { name: "Grocery List", href: "/grocery", icon: ShoppingCart },
  { name: "Babysitter Mode", href: "/babysitter", icon: Baby },
  { name: "Family Directory", href: "/family", icon: Heart },
  { name: "Birthdays & Gifts", href: "/birthdays", icon: Cake },
  { name: "Vault", href: "/vault", icon: FolderLock },
  { name: "Home Manual", href: "/home-manual", icon: BookOpen },
  { name: "Lindsey's List", href: "/cleaning", icon: Sparkles },
  { name: "Travel", href: "/travel", icon: Plane },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mode = useAppMode();

  const navigation = mode === 'family' ? familyNavigation : workNavigation;
  const isFamily = mode === 'family';

  return (
    <>
      {/* Mobile header bar */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b px-4 md:hidden",
        isFamily
          ? "border-[#E8E4DD] bg-[#FDFCFA]/95 backdrop-blur-md"
          : "border-[#1A1816] bg-[#060606]/95 backdrop-blur-sm"
      )}>
        <button
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            isFamily ? "hover:bg-[#E8E4DD] text-[#2C2C2C]" : "hover:bg-[#1A1816] text-[#E8E4DF]"
          )}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
        </button>
        <div className="flex items-center gap-2.5">
          {isFamily ? (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B8965A]/25">
                <span className="text-sm font-light text-[#B8965A] font-[family-name:var(--font-display)]">S</span>
              </div>
              <span className="text-sm font-light tracking-wide text-[#2C2C2C] font-[family-name:var(--font-display)]">Sweeney</span>
            </>
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#B8956A] to-[#CDAA7E]">
                <Rocket className="h-3.5 w-3.5 text-[#060606]" />
              </div>
              <span className="text-sm font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Mission Control</span>
            </>
          )}
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className={cn(
            "fixed inset-0 z-30 md:hidden transition-opacity",
            isFamily ? "bg-[#1C1208]/20 backdrop-blur-sm" : "bg-[#060606]/60 backdrop-blur-sm"
          )}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-300 ease-out md:translate-x-0",
          isFamily
            ? "border-[#E8E4DD] bg-[#FDFCFA]"
            : "border-[#1A1816] bg-[#080806]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "flex h-16 items-center px-7",
          isFamily ? "border-b border-[#E8E4DD]" : "border-b border-[#1A1816]"
        )}>
          {isFamily ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B8965A]/25">
                <span className="text-lg font-light text-[#B8965A] font-[family-name:var(--font-display)]">S</span>
              </div>
              <span className="text-[17px] font-light tracking-wide text-[#2C2C2C] font-[family-name:var(--font-display)]">Sweeney</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#B8956A] to-[#CDAA7E] shadow-lg">
                <Rocket className="h-4 w-4 text-[#060606]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Mission Control</p>
                <p className="text-[10px] text-[#6B6560]">Sweeney HQ</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const isUrgent = 'urgent' in item && item.urgent;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 min-h-[48px] text-[15px] transition-all duration-200",
                    isFamily
                      ? isActive
                        ? "bg-[#F5F0E8] text-[#2C2C2C]"
                        : "text-[#6B5B4E] hover:bg-[#F5F0E8] hover:text-[#2C2C2C]"
                      : isActive
                        ? "bg-[#B8956A]/10 text-[#E8E4DF]"
                        : "text-[#6B6560] hover:bg-[#1A1816]/60 hover:text-[#E8E4DF]"
                  )}
                >
                  {/* Active indicator — thin gold left border */}
                  {isActive && isFamily && (
                    <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#B8965A]" />
                  )}
                  {isActive && !isFamily && (
                    <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#B8956A]" />
                  )}

                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? isFamily ? "text-[#B8965A]" : "text-[#B8956A]"
                        : isUrgent
                          ? "text-red-500"
                          : ""
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="font-normal">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ⌘K hint — only in work mode */}
        {!isFamily && (
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
          "border-t px-7 py-4",
          isFamily ? "border-[#E8E4DD]" : "border-[#1A1816]"
        )}>
          <p className={cn(
            "text-[11px] tracking-wide",
            isFamily ? "text-[#B8B0A4]" : "text-[#6B6560]"
          )}>
            {isFamily ? 'sweeney.family' : 'Mission Control v3.0'}
          </p>
        </div>
      </aside>
    </>
  );
}

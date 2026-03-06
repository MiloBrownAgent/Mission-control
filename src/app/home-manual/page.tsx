"use client";

import { useState, useEffect } from "react";
import {
  Home,
  Wifi,
  Shield,
  MapPin,
  Zap,
  Flame,
  Trash2,
  Copy,
  Wrench,
  Phone,
  Mail,
  Globe,
  Check,
  Clock,
  ChevronRight,
  Hammer,
} from "lucide-react";

type Tab = "house" | "emergency" | "contractors" | "maintenance";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-[#2C2C2C] font-mono">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B8965A]/10 active:bg-[#B8965A]/20 transition-colors shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-[#5C6B5E]" />
        ) : (
          <Copy className="h-4 w-4 text-[#B8965A]" />
        )}
      </button>
    </div>
  );
}

/* ── Maintenance logic (moved from separate page) ── */

type Frequency = "monthly" | "quarterly" | "biannual" | "annual";
type Status = "overdue" | "due_soon" | "upcoming" | "completed";

interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  frequency: Frequency;
  season?: "spring" | "fall" | "any";
  category: string;
  lastDoneKey: string;
}

const MAINTENANCE_TASKS: MaintenanceTask[] = [
  { id: "hvac-filter", name: "HVAC Filter Replacement", description: "Replace the 1-inch furnace filter", frequency: "monthly", category: "HVAC", lastDoneKey: "maintenance_lastdone_hvac-filter" },
  { id: "gutter-spring", name: "Gutter Cleaning — Spring", description: "Clean gutters and downspouts before spring rains", frequency: "biannual", season: "spring", category: "Outdoor", lastDoneKey: "maintenance_lastdone_gutter-spring" },
  { id: "gutter-fall", name: "Gutter Cleaning — Fall", description: "Clear leaves before winter", frequency: "biannual", season: "fall", category: "Outdoor", lastDoneKey: "maintenance_lastdone_gutter-fall" },
  { id: "smoke-test", name: "Smoke & CO Detector Test", description: "Test all smoke and CO detectors", frequency: "monthly", category: "Safety", lastDoneKey: "maintenance_lastdone_smoke-test" },
  { id: "smoke-batteries", name: "Smoke & CO Battery Replacement", description: "Replace batteries in all detectors", frequency: "annual", category: "Safety", lastDoneKey: "maintenance_lastdone_smoke-batteries" },
  { id: "hvac-tuneup", name: "HVAC Tune-up", description: "Schedule professional HVAC service before heating season", frequency: "annual", category: "HVAC", lastDoneKey: "maintenance_lastdone_hvac-tuneup" },
  { id: "water-heater", name: "Water Heater Flush", description: "Flush sediment from water heater", frequency: "annual", category: "General", lastDoneKey: "maintenance_lastdone_water-heater" },
  { id: "dryer-vent", name: "Dryer Vent Cleaning", description: "Clean dryer vent to prevent fire hazard", frequency: "annual", category: "Appliances", lastDoneKey: "maintenance_lastdone_dryer-vent" },
  { id: "fridge-coils", name: "Refrigerator Coil Cleaning", description: "Vacuum coils under/behind fridge", frequency: "biannual", category: "Appliances", lastDoneKey: "maintenance_lastdone_fridge-coils" },
  { id: "lawn-winter", name: "Lawn Winterization", description: "Fertilize, aerate, overseed before first frost", frequency: "annual", season: "fall", category: "Outdoor", lastDoneKey: "maintenance_lastdone_lawn-winter" },
  { id: "deep-clean", name: "Deep Clean", description: "Full deep clean: behind appliances, baseboards, ceiling fans", frequency: "quarterly", category: "Cleaning", lastDoneKey: "maintenance_lastdone_deep-clean" },
  { id: "pest-control", name: "Pest Control", description: "Preventative pest treatment inside and outside", frequency: "quarterly", category: "General", lastDoneKey: "maintenance_lastdone_pest-control" },
  { id: "window-wash", name: "Window Washing", description: "Clean interior and exterior windows", frequency: "biannual", category: "Cleaning", lastDoneKey: "maintenance_lastdone_window-wash" },
  { id: "caulking", name: "Exterior Caulking Check", description: "Check and replace caulk around windows, doors, foundation", frequency: "annual", season: "spring", category: "General", lastDoneKey: "maintenance_lastdone_caulking" },
  { id: "sump-pump", name: "Sump Pump Test", description: "Test sump pump before spring thaw", frequency: "biannual", category: "General", lastDoneKey: "maintenance_lastdone_sump-pump" },
];

const frequencyLabels: Record<Frequency, string> = { monthly: "Monthly", quarterly: "Quarterly", biannual: "2x/year", annual: "Annual" };

const statusStyles: Record<Status, { label: string; bg: string; text: string }> = {
  overdue: { label: "Overdue", bg: "bg-red-50 border-red-200", text: "text-red-700" },
  due_soon: { label: "Due Soon", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  upcoming: { label: "Upcoming", bg: "bg-[#F7F4EF] border-[#E8E4DD]", text: "text-[#5C6B5E]" },
  completed: { label: "Done", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
};

function getTaskStatus(task: MaintenanceTask, lastDone: string | null): Status {
  const now = new Date();
  const currentMonth = now.getMonth();

  if (task.frequency === "biannual" && task.season) {
    const dueMonth = task.season === "spring" ? 3 : 9;
    if (lastDone) {
      const doneDate = new Date(lastDone);
      if (doneDate.getFullYear() === now.getFullYear() && Math.abs(doneDate.getMonth() - dueMonth) <= 2) return "completed";
    }
    if (currentMonth > dueMonth + 1) return "overdue";
    if (currentMonth >= dueMonth - 1 && currentMonth <= dueMonth + 1) return "due_soon";
    return "upcoming";
  }

  if (!lastDone) return "due_soon";
  const daysSinceDone = Math.floor((now.getTime() - new Date(lastDone).getTime()) / 86400000);

  switch (task.frequency) {
    case "monthly": return daysSinceDone > 35 ? "overdue" : daysSinceDone > 23 ? "due_soon" : "completed";
    case "quarterly": return daysSinceDone > 104 ? "overdue" : daysSinceDone > 76 ? "due_soon" : "completed";
    case "annual": return daysSinceDone > 380 ? "overdue" : daysSinceDone > 351 ? "due_soon" : "completed";
    default: return "upcoming";
  }
}

const statusOrder: Record<Status, number> = { overdue: 0, due_soon: 1, upcoming: 2, completed: 3 };

export default function HomeManualPage() {
  const [activeTab, setActiveTab] = useState<Tab>("house");
  const [lastDoneDates, setLastDoneDates] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const dates: Record<string, string | null> = {};
    for (const task of MAINTENANCE_TASKS) {
      dates[task.lastDoneKey] = localStorage.getItem(task.lastDoneKey);
    }
    setLastDoneDates(dates);
  }, []);

  function markDone(task: MaintenanceTask) {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(task.lastDoneKey, today);
    setLastDoneDates((prev) => ({ ...prev, [task.lastDoneKey]: today }));
  }

  const tasksWithStatus = MAINTENANCE_TASKS.map((task) => ({
    ...task,
    status: getTaskStatus(task, lastDoneDates[task.lastDoneKey] ?? null),
    lastDone: lastDoneDates[task.lastDoneKey] ?? null,
  })).sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const overdueCount = tasksWithStatus.filter((t) => t.status === "overdue").length;
  const dueSoonCount = tasksWithStatus.filter((t) => t.status === "due_soon").length;

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "house", label: "House Info", icon: Home },
    { key: "emergency", label: "Emergency", icon: Shield },
    { key: "contractors", label: "Contractors", icon: Wrench },
    { key: "maintenance", label: "Maintenance", icon: Hammer },
  ];

  // Trash / recycling schedule
  const now = new Date();

  // Garbage: every Friday ~8:00 AM
  const nextGarbage = new Date(now);
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  nextGarbage.setDate(now.getDate() + daysUntilFriday);
  nextGarbage.setHours(8, 0, 0, 0);
  if (nextGarbage <= now) {
    nextGarbage.setDate(nextGarbage.getDate() + 7);
  }

  // Recycling: every other Friday ~9:00 AM, anchored to Mar 13, 2026
  const recyclingAnchor = new Date("2026-03-13T09:00:00");
  const nextRecycling = new Date(recyclingAnchor);
  while (nextRecycling <= now) {
    nextRecycling.setDate(nextRecycling.getDate() + 14);
  }

  const formatPickup = (date: Date) =>
    date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8965A]/10">
            <Home className="h-7 w-7 text-[#B8965A]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Home Manual
            </h1>
            <a
              href="https://maps.google.com/?q=3740+48th+Ave+S,+Minneapolis,+MN+55406"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#5C6B5E] flex items-center gap-1 active:text-[#B8965A]"
            >
              <MapPin className="h-3 w-3" />
              3740 48th Ave S, Minneapolis, MN 55406
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap min-h-[44px] flex-1 justify-center ${
                isActive
                  ? "bg-white text-[#2C2C2C] shadow-sm border border-[#E8E4DD]"
                  : "text-[#5C6B5E]/70 hover:text-[#2C2C2C]"
              }`}
            >
              <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#B8965A]" : ""}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.key === "maintenance" && (overdueCount > 0 || dueSoonCount > 0) && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-1.5">
                  {overdueCount + dueSoonCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* House Info Tab */}
      {activeTab === "house" && (
        <div className="space-y-8">
          <section>
            <SectionHeader>WiFi</SectionHeader>
            <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="h-5 w-5 text-[#B8965A]" />
                <h3 className="text-sm font-medium text-[#2C2C2C]">Home Network</h3>
              </div>
              <div className="space-y-2">
                <CopyableField label="Network Name" value="BoxerFarmer1941" />
                <CopyableField label="Password" value="Toni2Times" />
              </div>
            </div>
          </section>

          <section>
            <SectionHeader>Utilities</SectionHeader>
            <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5 space-y-3">
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B8965A]/10 shrink-0">
                    <Zap className="h-4 w-4 text-[#B8965A]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">Xcel Energy (Electric)</p>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">Acct: XX-14335984-XX · Auto Pay enrolled</p>
                    <p className="text-xs text-[#8A7E72] mt-1">Latest statement email seen Feb 13, 2026 (usage ending 2/12/2026)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5C6B5E]/10 shrink-0">
                    <Flame className="h-4 w-4 text-[#5C6B5E]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">CenterPoint Energy (Gas)</p>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">Acct: 6403150385-3 · Service: 3740 48TH AVE S</p>
                    <p className="text-xs text-[#8A7E72] mt-1">Latest payment alert: $258.13 due 3/9/2026 (Auto Pay on file)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B8965A]/10 shrink-0">
                    <Trash2 className="h-4 w-4 text-[#B8965A]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">City of Minneapolis Solid Waste</p>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">Regular collection day: Friday (set out by 6:00 AM)</p>
                    <p className="text-xs text-[#8A7E72] mt-1">Source: City recycling reminder emails</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader>Garbage & Recycling</SectionHeader>
            <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5 space-y-3">
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B8965A]/10 shrink-0">
                    <Trash2 className="h-4 w-4 text-[#B8965A]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">Garbage</p>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">Every Friday around 8:00 AM</p>
                    <p className="text-xs text-[#8A7E72] mt-1">Next pickup: {formatPickup(nextGarbage)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5C6B5E]/10 shrink-0">
                    <Clock className="h-4 w-4 text-[#5C6B5E]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">Recycling</p>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">Every other Friday around 9:00 AM</p>
                    <p className="text-xs text-[#8A7E72] mt-1">Next pickup: {formatPickup(nextRecycling)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Emergency Tab */}
      {activeTab === "emergency" && (
        <div className="space-y-8">
          <section>
            <SectionHeader>Emergency Supplies</SectionHeader>
            <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-medium text-[#2C2C2C]">First Aid & LifeVac</h3>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700 font-medium">Hallway closet, bottom floor</p>
                <p className="text-xs text-red-600/70 mt-1">First aid kit and LifeVac choking rescue device</p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader>Emergency Numbers</SectionHeader>
            <div className="space-y-2">
              <a href="tel:911" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 min-h-[52px]">
                <Phone className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700">911</p>
                  <p className="text-xs text-red-600/70">Police, Fire, Ambulance</p>
                </div>
              </a>
              <a href="tel:+18002221222" className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
                <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2C2C2C]">Poison Control</p>
                  <p className="text-xs text-[#5C6B5E]">(800) 222-1222</p>
                </div>
              </a>
            </div>
          </section>
        </div>
      )}

      {/* Contractors Tab */}
      {activeTab === "contractors" && (
        <div className="space-y-8">
          <section>
            <SectionHeader>Contractors & Services</SectionHeader>

            {/* Spetz Plumbing */}
            <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
                  <Wrench className="h-5 w-5 text-[#B8965A]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-[#2C2C2C]">Spetz Plumbing Corporation</h3>
                  <p className="text-xs text-[#5C6B5E]">Plumbing</p>
                </div>
              </div>

              <div className="space-y-2">
                <a href="tel:+17632001135" className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px] active:bg-[#E8E4DD] transition-colors">
                  <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
                  <span className="text-sm text-[#2C2C2C]">(763) 200-1135</span>
                </a>
                <a href="mailto:info@spetzplumbing.com" className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px] active:bg-[#E8E4DD] transition-colors">
                  <Mail className="h-4 w-4 text-[#B8965A] shrink-0" />
                  <span className="text-sm text-[#2C2C2C]">info@spetzplumbing.com</span>
                </a>
                <a href="https://spetzplumbing.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px] active:bg-[#E8E4DD] transition-colors">
                  <Globe className="h-4 w-4 text-[#B8965A] shrink-0" />
                  <span className="text-sm text-[#2C2C2C]">spetzplumbing.com</span>
                </a>
                <a
                  href="https://maps.google.com/?q=6200+111+1/2+Ave+N,+Champlin,+MN+55316"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px] active:bg-[#E8E4DD] transition-colors"
                >
                  <MapPin className="h-4 w-4 text-[#B8965A] shrink-0" />
                  <span className="text-sm text-[#2C2C2C]">6200 111 1/2 Ave N, Champlin, MN 55316</span>
                </a>
              </div>

              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-[#5C6B5E]/60" />
                  <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">Last Service</p>
                </div>
                <p className="text-sm text-[#2C2C2C]">Jan 29, 2025 — toilet + lavatory sink/faucet install ($870)</p>
              </div>
            </div>

            {/* Add more placeholder */}
            <div className="mt-4 rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-6 text-center">
              <Wrench className="h-5 w-5 text-[#5C6B5E]/30 mx-auto mb-2" />
              <p className="text-sm text-[#5C6B5E]/60">Add more contractors as you use them</p>
            </div>
          </section>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === "maintenance" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-[#5C6B5E]">
              {overdueCount > 0 && <span className="text-red-600 font-medium">{overdueCount} overdue</span>}
              {overdueCount > 0 && dueSoonCount > 0 && <span> · </span>}
              {dueSoonCount > 0 && <span className="text-amber-600 font-medium">{dueSoonCount} due soon</span>}
              {overdueCount === 0 && dueSoonCount === 0 && <span className="text-emerald-600">All caught up</span>}
            </p>
          </div>

          <div className="space-y-2">
            {tasksWithStatus.map((task) => {
              const st = statusStyles[task.status];
              return (
                <div
                  key={task.id}
                  className={`rounded-xl border ${st.bg} p-4 transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-[#2C2C2C]">{task.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6B5E] mt-1">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wide">
                          {frequencyLabels[task.frequency]}
                        </span>
                        {task.lastDone && (
                          <span className="text-[10px] text-[#5C6B5E]/60">
                            Last done: {task.lastDone}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => markDone(task)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[36px] ${
                        task.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#B8965A] text-white hover:bg-[#A6854F]"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {task.status === "completed" ? "Done" : "Mark Done"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

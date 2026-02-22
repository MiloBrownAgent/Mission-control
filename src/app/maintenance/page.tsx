"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAppMode } from "@/lib/app-mode";
import { Heart, ArrowLeft, Check } from "lucide-react";

type Frequency = "monthly" | "quarterly" | "biannual" | "annual";
type Season = "spring" | "fall" | "any";
type Status = "overdue" | "due_soon" | "upcoming" | "completed";

interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  emoji: string;
  frequency: Frequency;
  season?: Season;
  category: "HVAC" | "Outdoor" | "Safety" | "Appliances" | "Cleaning" | "General";
  lastDoneKey: string;
}

const TASKS: MaintenanceTask[] = [
  {
    id: "hvac-filter",
    name: "HVAC Filter Replacement",
    description: "Replace the 1-inch furnace filter",
    emoji: "🌬️",
    frequency: "monthly",
    category: "HVAC",
    lastDoneKey: "maintenance_lastdone_hvac-filter",
  },
  {
    id: "gutter-spring",
    name: "Gutter Cleaning — Spring",
    description: "Clean gutters and downspouts before spring rains",
    emoji: "🌧️",
    frequency: "biannual",
    season: "spring",
    category: "Outdoor",
    lastDoneKey: "maintenance_lastdone_gutter-spring",
  },
  {
    id: "gutter-fall",
    name: "Gutter Cleaning — Fall",
    description: "Clear leaves before winter",
    emoji: "🍂",
    frequency: "biannual",
    season: "fall",
    category: "Outdoor",
    lastDoneKey: "maintenance_lastdone_gutter-fall",
  },
  {
    id: "smoke-test",
    name: "Smoke & CO Detector Test",
    description: "Test all smoke and CO detectors",
    emoji: "🔔",
    frequency: "monthly",
    category: "Safety",
    lastDoneKey: "maintenance_lastdone_smoke-test",
  },
  {
    id: "smoke-batteries",
    name: "Smoke & CO Detector Batteries",
    description: "Replace batteries in all detectors",
    emoji: "🔋",
    frequency: "annual",
    category: "Safety",
    lastDoneKey: "maintenance_lastdone_smoke-batteries",
  },
  {
    id: "hvac-tuneup",
    name: "HVAC Tune-up",
    description: "Schedule professional HVAC service before heating season",
    emoji: "🔧",
    frequency: "annual",
    category: "HVAC",
    lastDoneKey: "maintenance_lastdone_hvac-tuneup",
  },
  {
    id: "water-heater",
    name: "Water Heater Flush",
    description: "Flush sediment from water heater",
    emoji: "🚿",
    frequency: "annual",
    category: "General",
    lastDoneKey: "maintenance_lastdone_water-heater",
  },
  {
    id: "dryer-vent",
    name: "Dryer Vent Cleaning",
    description: "Clean dryer vent to prevent fire hazard",
    emoji: "🔥",
    frequency: "annual",
    category: "Appliances",
    lastDoneKey: "maintenance_lastdone_dryer-vent",
  },
  {
    id: "fridge-coils",
    name: "Refrigerator Coil Cleaning",
    description: "Vacuum coils under/behind fridge",
    emoji: "❄️",
    frequency: "biannual",
    category: "Appliances",
    lastDoneKey: "maintenance_lastdone_fridge-coils",
  },
  {
    id: "lawn-winter",
    name: "Lawn Winterization",
    description: "Fertilize, aerate, overseed before first frost",
    emoji: "🌱",
    frequency: "annual",
    season: "fall",
    category: "Outdoor",
    lastDoneKey: "maintenance_lastdone_lawn-winter",
  },
  {
    id: "deep-clean",
    name: "Deep Clean",
    description: "Full deep clean: behind appliances, baseboards, ceiling fans",
    emoji: "🧹",
    frequency: "quarterly",
    category: "Cleaning",
    lastDoneKey: "maintenance_lastdone_deep-clean",
  },
  {
    id: "pest-control",
    name: "Pest Control",
    description: "Preventative pest treatment inside and outside",
    emoji: "🐜",
    frequency: "quarterly",
    category: "General",
    lastDoneKey: "maintenance_lastdone_pest-control",
  },
  {
    id: "window-wash",
    name: "Window Washing",
    description: "Clean interior and exterior windows",
    emoji: "🪟",
    frequency: "biannual",
    category: "Cleaning",
    lastDoneKey: "maintenance_lastdone_window-wash",
  },
  {
    id: "caulking",
    name: "Exterior Caulking Check",
    description: "Check and replace caulk around windows, doors, foundation",
    emoji: "🏗️",
    frequency: "annual",
    season: "spring",
    category: "General",
    lastDoneKey: "maintenance_lastdone_caulking",
  },
  {
    id: "sump-pump",
    name: "Sump Pump Test",
    description: "Test sump pump before spring thaw and before heavy rain season",
    emoji: "💧",
    frequency: "biannual",
    category: "General",
    lastDoneKey: "maintenance_lastdone_sump-pump",
  },
];

const categoryColors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  HVAC: { border: "border-[#2A4E8A]/20", bg: "bg-[#2A4E8A]/5", text: "text-[#2A4E8A]", badge: "bg-[#2A4E8A]/10 text-[#2A4E8A]" },
  Outdoor: { border: "border-[#2E6B50]/20", bg: "bg-[#2E6B50]/5", text: "text-[#2E6B50]", badge: "bg-[#2E6B50]/10 text-[#2E6B50]" },
  Safety: { border: "border-red-500/20", bg: "bg-red-500/5", text: "text-red-600", badge: "bg-red-500/10 text-red-600" },
  Appliances: { border: "border-[#6B5A9B]/20", bg: "bg-[#6B5A9B]/5", text: "text-[#6B5A9B]", badge: "bg-[#6B5A9B]/10 text-[#6B5A9B]" },
  Cleaning: { border: "border-[#2A4E8A]/20", bg: "bg-[#2A4E8A]/5", text: "text-[#2A4E8A]", badge: "bg-[#2A4E8A]/10 text-[#2A4E8A]" },
  General: { border: "border-[#C07A1A]/20", bg: "bg-[#C07A1A]/5", text: "text-[#C07A1A]", badge: "bg-[#C07A1A]/10 text-[#C07A1A]" },
};

const frequencyLabels: Record<Frequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "2× / year",
  annual: "Annual",
};

const statusConfig: Record<Status, { label: string; color: string; bgColor: string }> = {
  overdue: { label: "Overdue", color: "text-red-400", bgColor: "bg-red-500/20 text-red-400" },
  due_soon: { label: "Due Soon", color: "text-amber-400", bgColor: "bg-amber-500/20 text-amber-400" },
  upcoming: { label: "Upcoming", color: "text-emerald-400", bgColor: "bg-emerald-500/20 text-emerald-400" },
  completed: { label: "Done", color: "text-emerald-400", bgColor: "bg-emerald-500/20 text-emerald-400" },
};

type FilterTab = "all" | "overdue" | "due_soon" | "upcoming";

function getTaskStatus(task: MaintenanceTask, lastDone: string | null): Status {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed

  if (task.frequency === "biannual" && task.season) {
    // Spring tasks due in April (month 3), Fall tasks due in October (month 9)
    const dueMonth = task.season === "spring" ? 3 : 9;
    const dueDate = new Date(now.getFullYear(), dueMonth, 1);

    // If the due month has passed this year and not done since
    if (lastDone) {
      const doneDate = new Date(lastDone);
      // Completed if done within 60 days of the due month
      if (doneDate.getFullYear() === now.getFullYear()) {
        const doneMonth = doneDate.getMonth();
        if (Math.abs(doneMonth - dueMonth) <= 2) {
          return "completed";
        }
      }
    }

    if (currentMonth > dueMonth + 1) return "overdue";
    if (currentMonth >= dueMonth - 1 && currentMonth <= dueMonth + 1) return "due_soon";
    return "upcoming";
  }

  if (!lastDone) {
    // Never done — check if seasonal
    if (task.season === "spring" && currentMonth >= 2 && currentMonth <= 5) return "due_soon";
    if (task.season === "fall" && currentMonth >= 8 && currentMonth <= 11) return "due_soon";
    return "due_soon"; // Never done, should do soon
  }

  const doneDate = new Date(lastDone);
  const daysSinceDone = Math.floor((now.getTime() - doneDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (task.frequency) {
    case "monthly":
      if (daysSinceDone > 35) return "overdue";
      if (daysSinceDone > 23) return "due_soon";
      return "completed";
    case "quarterly":
      if (daysSinceDone > 104) return "overdue";
      if (daysSinceDone > 76) return "due_soon";
      return "completed";
    case "annual":
      if (daysSinceDone > 380) return "overdue";
      if (daysSinceDone > 351) return "due_soon";
      return "completed";
    default:
      return "upcoming";
  }
}

const statusOrder: Record<Status, number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  completed: 3,
};

function MaintenancePage() {
  const router = useRouter();

  useEffect(() => {
    if (getAppMode() === "work") {
      router.replace("/");
    }
  }, [router]);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [lastDoneDates, setLastDoneDates] = useState<Record<string, string | null>>({});

  // Load all lastDone dates from localStorage
  useEffect(() => {
    const dates: Record<string, string | null> = {};
    for (const task of TASKS) {
      dates[task.lastDoneKey] = localStorage.getItem(task.lastDoneKey);
    }
    setLastDoneDates(dates);
  }, []);

  function markDone(task: MaintenanceTask) {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(task.lastDoneKey, today);
    setLastDoneDates((prev) => ({ ...prev, [task.lastDoneKey]: today }));
  }

  const tasksWithStatus = TASKS.map((task) => ({
    ...task,
    status: getTaskStatus(task, lastDoneDates[task.lastDoneKey] ?? null),
    lastDone: lastDoneDates[task.lastDoneKey] ?? null,
  })).sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const filtered =
    filter === "all"
      ? tasksWithStatus
      : tasksWithStatus.filter((t) => t.status === filter);

  const counts = {
    overdue: tasksWithStatus.filter((t) => t.status === "overdue").length,
    due_soon: tasksWithStatus.filter((t) => t.status === "due_soon").length,
    upcoming: tasksWithStatus.filter((t) => t.status === "upcoming").length,
  };

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "due_soon", label: "Due Soon", count: counts.due_soon },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/30 bg-gradient-to-br from-rose-50/10 via-amber-50/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/family-home")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-amber-500 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Home Maintenance 🏠
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts.overdue > 0 && (
                  <span className="text-red-400 font-medium">{counts.overdue} overdue · </span>
                )}
                {counts.due_soon > 0 && (
                  <span className="text-amber-400 font-medium">{counts.due_soon} due soon · </span>
                )}
                {TASKS.length} total tasks
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              filter === tab.key
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {filtered.map((task) => {
          const catColor = categoryColors[task.category];
          const stConfig = statusConfig[task.status];
          return (
            <Card
              key={task.id}
              className={`${catColor.border} ${catColor.bg} p-4 transition-all`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{task.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{task.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stConfig.bgColor}`}>
                      {stConfig.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catColor.badge}`}>
                      {task.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {frequencyLabels[task.frequency]}
                    </span>
                    {task.lastDone && (
                      <span className="text-[10px] text-muted-foreground">
                        Last done: {task.lastDone}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => markDone(task)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    task.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:opacity-90"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {task.status === "completed" ? "Done" : "Mark Done"}
                </button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-8 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm text-muted-foreground">No tasks in this category</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1.5">
          <Heart className="h-2.5 w-2.5 text-rose-400/50" />
          Sweeney Family Hub · Family Mode
          <Heart className="h-2.5 w-2.5 text-rose-400/50" />
        </p>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(MaintenancePage), { ssr: false });

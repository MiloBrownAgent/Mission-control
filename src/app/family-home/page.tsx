"use client";

import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/lib/app-mode";
import {
  ShieldAlert,
  Heart,
  UtensilsCrossed,
  MapPin,
  ChevronDown,
  CalendarDays,
  Baby,
  Cloud,
  Sun,
  Moon,
  Dumbbell,
  ShoppingCart,
  Plus,
  Wrench,
  Clock,
  Timer,
  Sunrise,
  Sunset,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Plane,
  TreePine,
  ArrowRight,
} from "lucide-react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  description: string;
  emoji: string;
  location: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreetingIcon() {
  const hour = new Date().getHours();
  if (hour < 6) return Moon;
  if (hour < 12) return Sunrise;
  if (hour < 17) return Sun;
  if (hour < 20) return Sunset;
  return Moon;
}

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  const days = Math.floor(diffDays - months * 30.4375);
  return { months, days };
}

function getWeekStart(date: Date): string {
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  return format(mon, "yyyy-MM-dd");
}

function getDaysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const upcomingEvents = [
  { name: "Wooster Group — Walker Art Center", date: "2026-02-28", time: "3–5 PM", icon: Sparkles },
  { name: "Mike watches Soren", date: "2026-03-06", time: "5–9 PM", icon: Baby },
  { name: "Savannah Trip", date: "2026-03-11", time: "Mar 11–17", icon: Plane },
  { name: "Dave\u2019s 37th Birthday", date: "2026-03-30", icon: Sun },
  { name: "Japan Trip", date: "2026-04-02", time: "Apr 2–11", icon: Plane },
  { name: "Beau & Albert\u2019s 3rd Birthday", date: "2026-04-11", icon: Heart },
  { name: "Kate & Tim\u2019s Wedding", date: "2026-05-16", icon: Heart },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type DayName = typeof DAY_NAMES[number];

const mealTypeConfig = {
  breakfast: { label: "Breakfast", icon: Sunrise, color: "text-[#C07A1A]" },
  lunch: { label: "Lunch", icon: Sun, color: "text-[#2A4E8A]" },
  dinner: { label: "Dinner", icon: Moon, color: "text-[#6B5A9B]" },
} as const;

function SectionHeader({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <h2 className="text-lg md:text-xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/15" />
      {href && (
        <Link href={href} className="text-xs text-[#B8965A] hover:text-[#A6854F] transition-colors flex items-center gap-1 shrink-0">
          View all <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}

function LuxuryCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E8E4DD] p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}

function FamilyHomePage() {
  const mode = useAppMode();
  const router = useRouter();

  useEffect(() => {
    if (mode === 'work') {
      router.replace('/');
    }
  }, [mode, router]);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [now, setNow] = useState(new Date());
  const [groceryInput, setGroceryInput] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => null);
  }, []);

  const classBookings = useQuery(api.classBookings.listUpcoming, { daysAhead: 14 });
  const groceryItems = useQuery(api.groceryItems.getAll);
  const daycareReport = useQuery(api.daycareReports.getLatest);
  const weekendData = useQuery(api.weekendActivities.getLatest);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const addGroceryItem = useMutation(api.groceryItems.addItem);
  const toggleGroceryItem = useMutation(api.groceryItems.toggleItem);
  const clearCheckedItems = useMutation(api.groceryItems.clearChecked);
  const uncheckedGrocery = groceryItems?.filter((i) => !i.checked) ?? [];
  const checkedGrocery = groceryItems?.filter((i) => i.checked) ?? [];

  const CATEGORY_ORDER = ["Produce", "Proteins", "Dairy", "Pantry", "Bakery", "Baby", "Household", "Other"];
  const groupByCategory = (items: typeof uncheckedGrocery) => {
    const groups: Record<string, typeof uncheckedGrocery> = {};
    for (const item of items) {
      const cat = item.category ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return CATEGORY_ORDER
      .filter(c => groups[c]?.length)
      .map(c => ({ category: c, items: groups[c] }))
      .concat(
        Object.keys(groups)
          .filter(c => !CATEGORY_ORDER.includes(c))
          .map(c => ({ category: c, items: groups[c] }))
      );
  };

  const currentWeekStart = getWeekStart(now);
  const meals = useQuery(api.meals.getWeek, { weekStart: currentWeekStart });

  const nextWeekStart = getWeekStart(addDays(now, 7));
  const nextWeekMeals = useQuery(api.meals.getWeek, { weekStart: nextWeekStart });
  const approveMeal = useMutation(api.meals.approveMeal);
  const denyMeal = useMutation(api.meals.denyMeal);
  const replaceMeal = useMutation(api.meals.replaceMeal);
  const [deniedId, setDeniedId] = useState<string | null>(null);

  const todayDayName: DayName = DAY_NAMES[now.getDay()];
  const todayMeals = meals?.filter((m) => m.day === todayDayName) ?? [];
  const breakfastToday = todayMeals.find((m) => m.mealType === "breakfast");
  const lunchToday = todayMeals.find((m) => m.mealType === "lunch");
  const dinnerToday = todayMeals.find((m) => m.mealType === "dinner");

  const sorenAge = getSorenAge();
  const GreetingIcon = getGreetingIcon();

  return (
    <div className="space-y-12 max-w-2xl mx-auto pb-12">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-white rounded-xl border border-[#E8E4DD] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/[0.03] blur-3xl" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8965A]/8 shrink-0">
              <GreetingIcon className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] leading-tight">
                {getGreeting()}, Sweeneys
              </h1>
              <p className="text-sm text-[#8A7E72] mt-1 tracking-wide">
                {format(now, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Weather */}
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-[#F8F5F0] px-4 py-3">
            <Cloud className="h-4 w-4 text-[#8A7E72] shrink-0" strokeWidth={1.5} />
            {weather ? (
              <p className="text-sm text-[#2C2C2C]">
                <span className="font-medium">{weather.temp}°F</span>
                <span className="text-[#8A7E72]"> — {weather.description}</span>
                <span className="text-[#8A7E72] text-xs ml-2">↑{weather.high}° ↓{weather.low}°</span>
              </p>
            ) : (
              <div className="h-5 w-48 animate-pulse rounded bg-[#E8E4DD]" />
            )}
          </div>
        </div>
      </div>

      {/* ── Soren Today ── */}
      <div>
        <SectionHeader>Soren Today</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5C6B5E]/8">
              <Baby className="h-5 w-5 text-[#5C6B5E]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Soren Sweeney</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-light text-[#B8965A] font-[family-name:var(--font-display)]">{sorenAge.months}</span>
            <span className="text-sm text-[#8A7E72]">months</span>
            <span className="text-3xl font-light text-[#8A7E72] ml-2 font-[family-name:var(--font-display)]">{sorenAge.days}</span>
            <span className="text-sm text-[#8A7E72]">days old</span>
          </div>
        </LuxuryCard>
      </div>

      {/* ── Daycare Report ── */}
      {daycareReport !== undefined && (
        <div>
          <SectionHeader>Daycare Report</SectionHeader>
          <LuxuryCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A4E8A]/8">
                <Baby className="h-4.5 w-4.5 text-[#2A4E8A]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Last Daycare Day</h3>
              </div>
              {daycareReport && (
                <span className="text-xs text-[#8A7E72]">{daycareReport.date}</span>
              )}
            </div>
            {!daycareReport ? (
              <p className="text-sm text-[#8A7E72]">No report yet — check back after the first daycare day.</p>
            ) : (
              <div className="space-y-4">
                {daycareReport.photoUrl && (
                  <div className="w-full overflow-hidden rounded-lg" style={{ maxHeight: "400px" }}>
                    <img
                      src={daycareReport.photoUrl}
                      alt="Soren at daycare"
                      className="w-full h-auto block object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {daycareReport.totalTime && (
                    <div className="rounded-lg bg-[#F8F5F0] px-4 py-3">
                      <p className="text-[11px] text-[#8A7E72] tracking-wide">Time</p>
                      <p className="text-sm font-medium text-[#2C2C2C] mt-0.5">{daycareReport.totalTime}</p>
                      {daycareReport.checkIn && daycareReport.checkOut && (
                        <p className="text-xs text-[#8A7E72] mt-0.5">{daycareReport.checkIn} – {daycareReport.checkOut}</p>
                      )}
                    </div>
                  )}
                  {daycareReport.totalSleep !== undefined && (
                    <div className="rounded-lg bg-[#F8F5F0] px-4 py-3">
                      <p className="text-[11px] text-[#8A7E72] tracking-wide">Sleep</p>
                      <p className="text-sm font-medium text-[#2C2C2C] mt-0.5">{daycareReport.totalSleep}</p>
                      {daycareReport.totalNaps !== undefined && (
                        <p className="text-xs text-[#8A7E72] mt-0.5">{daycareReport.totalNaps} nap{daycareReport.totalNaps !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                  {daycareReport.meals !== undefined && (
                    <div className="rounded-lg bg-[#F8F5F0] px-4 py-3">
                      <p className="text-[11px] text-[#8A7E72] tracking-wide">Meals</p>
                      <p className="text-sm font-medium text-[#2C2C2C] mt-0.5">{daycareReport.meals} feedings</p>
                    </div>
                  )}
                  {daycareReport.pees != null && (
                    <div className="rounded-lg bg-[#F8F5F0] px-4 py-3">
                      <p className="text-[11px] text-[#8A7E72] tracking-wide">Diapers</p>
                      <p className="text-sm font-medium text-[#2C2C2C] mt-0.5">
                        {daycareReport.pees}x wet{daycareReport.poops != null ? ` · ${daycareReport.poops}x solid` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </LuxuryCard>
        </div>
      )}

      {/* ── Gym Classes ── */}
      <div>
        <SectionHeader>Upcoming Classes</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A85570]/8">
              <Dumbbell className="h-4.5 w-4.5 text-[#A85570]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Life Time Classes</h3>
          </div>

          {classBookings === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F8F5F0]" />
              ))}
            </div>
          ) : classBookings.length === 0 ? (
            <p className="text-sm text-[#8A7E72] italic">No classes booked in the next 2 weeks.</p>
          ) : (
            <div className="space-y-2.5">
              {classBookings.map((cls) => {
                const isWaitlist = cls.status === "waitlisted";
                const date = new Date(cls.classDate + "T12:00:00");
                const dateLabel = format(date, "EEE, MMM d");
                return (
                  <div
                    key={cls._id}
                    className="flex items-center gap-3 rounded-lg bg-[#F8F5F0] px-4 py-3.5"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                      isWaitlist ? 'bg-[#C07A1A]/10' : 'bg-[#5C6B5E]/10'
                    }`}>
                      {isWaitlist ? (
                        <Timer className="h-4 w-4 text-[#C07A1A]" strokeWidth={1.5} />
                      ) : (
                        <Check className="h-4 w-4 text-[#5C6B5E]" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2C2C2C] truncate">{cls.className}</p>
                      <p className="text-xs text-[#8A7E72] mt-0.5">
                        {dateLabel} · {cls.classTime}
                        {cls.location ? ` · ${cls.location.split(",")[0]}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        cls.member === "Amanda"
                          ? "text-[#A85570] bg-[#A85570]/10"
                          : "text-[#2A4E8A] bg-[#2A4E8A]/10"
                      }`}>
                        {cls.member}
                      </span>
                      {isWaitlist && (
                        <span className="text-[10px] text-[#C07A1A] tracking-wider">Waitlist</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </LuxuryCard>
      </div>

      {/* ── Today's Meals ── */}
      <div>
        <SectionHeader href="/meals">Today&apos;s Meals</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C07A1A]/8">
              <UtensilsCrossed className="h-4.5 w-4.5 text-[#C07A1A]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Meals</h3>
            <span className="ml-auto text-xs text-[#8A7E72]">{todayDayName}</span>
          </div>

          {meals === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-[#F8F5F0]" />
              ))}
            </div>
          ) : todayMeals.length === 0 ? (
            <div className="rounded-lg bg-[#F8F5F0] p-6 text-center">
              <p className="text-sm text-[#8A7E72]">No meals planned for today</p>
              <Link href="/meals" className="text-xs text-[#B8965A] hover:text-[#A6854F] mt-2 inline-block transition-colors">
                Open Meal Planner
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {([
                { key: "breakfast", meal: breakfastToday },
                { key: "lunch", meal: lunchToday },
                { key: "dinner", meal: dinnerToday },
              ] as const).map(({ key, meal }) => {
                const config = mealTypeConfig[key];
                const MealIcon = config.icon;
                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-lg bg-[#F8F5F0] px-4 py-3.5"
                  >
                    <MealIcon className={`h-4 w-4 mt-0.5 ${config.color}`} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium ${config.color} tracking-wide`}>
                        {config.label}
                      </p>
                      {meal ? (
                        <>
                          <p className="text-sm font-medium mt-0.5 text-[#2C2C2C]">{meal.name}</p>
                          {meal.sorenMeal && (
                            <p className="text-xs text-[#8A7E72] mt-0.5 flex items-center gap-1">
                              <Baby className="h-3 w-3" strokeWidth={1.5} /> Soren: {meal.sorenMeal}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-[#8A7E72] mt-0.5 italic">Not planned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </LuxuryCard>
      </div>

      {/* ── Next Week Meal Approval ── */}
      {nextWeekMeals !== undefined && nextWeekMeals.some(m => m.status === "pending") && (() => {
        const DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
        const pendingDinners = nextWeekMeals.filter(m => m.mealType === "dinner");
        const pendingLunches = nextWeekMeals.filter(m => m.mealType === "lunch" && m.status === "pending");
        const allPending = [...pendingDinners, ...pendingLunches];
        const totalPending = allPending.filter(m => m.status === "pending").length;

        return (
          <div>
            <SectionHeader>Approve Meals</SectionHeader>
            <LuxuryCard className="!border-[#B8965A]/25">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B8965A]/8">
                  <UtensilsCrossed className="h-4.5 w-4.5 text-[#B8965A]" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Next Week</h3>
                <span className="ml-auto text-xs font-medium text-[#B8965A] bg-[#B8965A]/10 px-3 py-1 rounded-full">
                  {totalPending} pending
                </span>
              </div>
              <p className="text-xs text-[#8A7E72] mb-5 ml-[52px]">Week of {format(addDays(now, 7), "MMM d")}</p>

              <div className="space-y-3">
                {DAYS_ORDER.map(day => {
                  const dinner = nextWeekMeals.find(m => m.day === day && m.mealType === "dinner");
                  const lunch = nextWeekMeals.find(m => m.day === day && m.mealType === "lunch");
                  if (!dinner && !lunch) return null;

                  return (
                    <div key={day} className="rounded-lg border border-[#E8E4DD] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#F8F5F0] border-b border-[#E8E4DD]">
                        <p className="text-[11px] font-medium text-[#8A7E72] tracking-wide">{day}</p>
                      </div>
                      <div className="divide-y divide-[#E8E4DD]">
                        {[dinner, lunch].filter(Boolean).map(meal => {
                          if (!meal) return null;
                          const isApproved = meal.status === "approved";
                          const isDenied = meal.status === "denied" || deniedId === meal._id;
                          const isPending = !isApproved && !isDenied;
                          const MealIcon = meal.mealType === "dinner" ? Moon : Sun;

                          return (
                            <div key={meal._id} className="px-4 py-3.5">
                              <div className="flex items-start gap-3">
                                <MealIcon className="h-4 w-4 mt-0.5 text-[#8A7E72]" strokeWidth={1.5} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-[#8A7E72] tracking-wide">{meal.mealType === "dinner" ? "Dinner" : "Lunch"}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {meal.url ? (
                                      <a href={meal.url} target="_blank" rel="noopener noreferrer"
                                        className="text-sm font-medium text-[#2C2C2C] hover:text-[#B8965A] transition-colors leading-tight">
                                        {meal.name}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-medium text-[#2C2C2C] leading-tight">{meal.name}</p>
                                    )}
                                  </div>
                                  {meal.notes && (
                                    <p className="text-xs text-[#8A7E72] mt-0.5">{meal.notes}</p>
                                  )}
                                </div>
                                {isApproved && (
                                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#5C6B5E]/10">
                                    <Check className="h-4 w-4 text-[#5C6B5E]" strokeWidth={1.5} />
                                  </span>
                                )}
                                {isPending && (
                                  <div className="flex gap-2 shrink-0">
                                    <button
                                      onClick={() => approveMeal({ id: meal._id })}
                                      className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#5C6B5E] active:bg-[#4A5D4C] text-white transition-colors"
                                    >
                                      <Check className="h-4 w-4" strokeWidth={1.5} />
                                    </button>
                                    <button
                                      onClick={() => { denyMeal({ id: meal._id }); setDeniedId(meal._id); }}
                                      className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 active:bg-red-100 text-red-500 transition-colors"
                                    >
                                      <X className="h-4 w-4" strokeWidth={1.5} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isDenied && meal.replacements && meal.replacements.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-xs text-[#B8965A] font-medium tracking-wide">Pick a replacement</p>
                                  {meal.replacements.map((r, i) => (
                                    <button
                                      key={i}
                                      onClick={() => { replaceMeal({ id: meal._id, name: r.name, url: r.url, notes: r.notes }); setDeniedId(null); }}
                                      className="w-full text-left rounded-lg bg-[#F8F5F0] hover:bg-[#F0ECE4] px-4 py-3.5 transition-colors"
                                    >
                                      <p className="text-sm font-medium text-[#2C2C2C]">{r.name}</p>
                                      {r.notes && <p className="text-xs text-[#8A7E72] mt-0.5">{r.notes}</p>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </LuxuryCard>
          </div>
        );
      })()}

      {/* ── Upcoming Events ── */}
      <div>
        <SectionHeader href="/family">Upcoming</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6B5A9B]/8">
              <CalendarDays className="h-4.5 w-4.5 text-[#6B5A9B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Events</h3>
          </div>
          <div className="space-y-2.5">
            {upcomingEvents
              .map(e => ({ ...e, daysUntil: getDaysUntil(e.date) }))
              .filter(e => e.daysUntil >= 0)
              .slice(0, 4)
              .map(e => {
                const EventIcon = e.icon;
                return (
                  <div key={e.name} className="flex items-center gap-3.5 rounded-lg bg-[#F8F5F0] px-4 py-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6B5A9B]/8 shrink-0">
                      <EventIcon className="h-4.5 w-4.5 text-[#6B5A9B]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[#2C2C2C]">{e.name}</p>
                      {e.time && <p className="text-xs text-[#8A7E72] mt-0.5">{e.time}</p>}
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${
                      e.daysUntil === 0 ? 'text-red-600' : e.daysUntil <= 7 ? 'text-[#B8965A]' : 'text-[#8A7E72]'
                    }`}>
                      {e.daysUntil === 0 ? 'Today' : e.daysUntil === 1 ? 'Tomorrow' : `${e.daysUntil}d`}
                    </span>
                  </div>
                );
              })}
          </div>
        </LuxuryCard>
      </div>

      {/* ── Weekend Activities ── */}
      <div>
        <SectionHeader>Weekend Activities</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5C6B5E]/8">
              <TreePine className="h-4.5 w-4.5 text-[#5C6B5E]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Weekend with Soren</h3>
            {weekendData?.weekOf && (
              <span className="ml-auto text-xs text-[#8A7E72]">{weekendData.weekOf}</span>
            )}
          </div>

          {weekendData === undefined ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F8F5F0]" />
              ))}
            </div>
          ) : !weekendData.activities?.length ? (
            <div className="rounded-lg bg-[#F8F5F0] p-8 text-center">
              <CalendarDays className="h-6 w-6 text-[#8A7E72]/40 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#2C2C2C]">Weekend ideas coming Thursday</p>
              <p className="text-xs text-[#8A7E72] mt-1">Milo searches events every Thursday and populates this list</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weekendData.activities.map((activity) => {
                const isOpen = expandedActivity === activity._id;
                return (
                  <div
                    key={activity._id}
                    className={`rounded-lg border transition-all duration-200 ${isOpen ? "border-[#B8965A]/25 bg-white" : "border-transparent bg-[#F8F5F0]"}`}
                  >
                    <button
                      onClick={() => setExpandedActivity(isOpen ? null : activity._id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left min-h-[52px]"
                    >
                      <span className="text-xs font-medium text-[#B8965A] tabular-nums w-5 shrink-0">{activity.rank}.</span>
                      <p className="text-sm font-medium text-[#2C2C2C] flex-1 min-w-0">{activity.title}</p>
                      <ChevronDown className={`h-4 w-4 text-[#8A7E72] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-[#E8E4DD] pt-3 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-[#5C6B5E]/8 px-3 py-1 text-[11px] text-[#5C6B5E] tracking-wide">{activity.category}</span>
                          {activity.cost && (
                            <span className="rounded-full bg-[#B8965A]/8 px-3 py-1 text-[11px] text-[#B8965A]">{activity.cost}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#5C6B5E] leading-relaxed">{activity.description}</p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {activity.location && (
                            <span className="text-xs text-[#8A7E72] flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" strokeWidth={1.5} />{activity.location}
                            </span>
                          )}
                          {activity.driveTime && (
                            <span className="text-xs text-[#8A7E72] flex items-center gap-1.5">
                              <Clock className="h-3 w-3" strokeWidth={1.5} />{activity.driveTime}
                            </span>
                          )}
                          {activity.ageNote && (
                            <span className="text-xs text-[#2A4E8A] flex items-center gap-1.5">
                              <Baby className="h-3 w-3" strokeWidth={1.5} />{activity.ageNote}
                            </span>
                          )}
                          {activity.url && (
                            <a href={activity.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B8965A] flex items-center gap-1 hover:text-[#A6854F] transition-colors">
                              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />Details
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </LuxuryCard>
      </div>

      {/* ── Grocery List ── */}
      <div>
        <SectionHeader href="/grocery">Grocery List</SectionHeader>
        <LuxuryCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C07A1A]/8">
              <ShoppingCart className="h-4.5 w-4.5 text-[#C07A1A]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">Shopping</h3>
          </div>

          {groceryItems === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F8F5F0]" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#8A7E72]">
                  {uncheckedGrocery.length === 0
                    ? "List is empty"
                    : `${uncheckedGrocery.length} item${uncheckedGrocery.length !== 1 ? "s" : ""} to get`}
                </p>
                {checkedGrocery.length > 0 && (
                  <button
                    onClick={() => clearCheckedItems({})}
                    className="text-xs text-[#8A7E72] hover:text-red-500 transition-colors py-1"
                  >
                    Clear {checkedGrocery.length} done
                  </button>
                )}
              </div>

              {uncheckedGrocery.length > 0 && (
                <div className="space-y-5 mb-5">
                  {groupByCategory(uncheckedGrocery).map(({ category, items }) => (
                    <div key={category}>
                      <p className="text-[11px] font-medium text-[#B8965A]/60 mb-2.5 px-1 tracking-wide">
                        {category}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <button
                            key={item._id}
                            onClick={() => toggleGroceryItem({ id: item._id })}
                            className="w-full flex items-center gap-3 rounded-lg bg-[#F8F5F0] hover:bg-[#F0ECE4] px-4 py-3.5 text-left transition-colors min-h-[48px]"
                          >
                            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#B8965A]/25 flex items-center justify-center" />
                            <span className="text-sm text-[#2C2C2C] leading-snug">{item.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {checkedGrocery.length > 0 && (
                <div className="space-y-1 mb-5 opacity-35">
                  {checkedGrocery.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => toggleGroceryItem({ id: item._id })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left min-h-[44px]"
                    >
                      <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#5C6B5E]/25 bg-[#5C6B5E]/8 flex items-center justify-center">
                        <Check className="h-3 w-3 text-[#5C6B5E]" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm text-[#8A7E72] line-through leading-snug">{item.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick-add */}
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={groceryInput}
                  onChange={(e) => setGroceryInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && groceryInput.trim()) {
                      await addGroceryItem({ text: groceryInput.trim() });
                      setGroceryInput("");
                    }
                  }}
                  placeholder="Add an item..."
                  className="flex-1 rounded-lg border border-[#E8E4DD] bg-[#F8F5F0] px-4 py-3.5 text-base text-[#2C2C2C] placeholder:text-[#B8B0A4] focus:outline-none focus:ring-2 focus:ring-[#B8965A]/15 focus:border-[#B8965A]/30 transition-colors"
                />
                <button
                  onClick={async () => {
                    if (groceryInput.trim()) {
                      await addGroceryItem({ text: groceryInput.trim() });
                      setGroceryInput("");
                    }
                  }}
                  className="flex h-[48px] w-[48px] items-center justify-center rounded-lg bg-[#B8965A] hover:bg-[#A6854F] active:bg-[#947545] text-white transition-colors shrink-0 shadow-sm"
                >
                  <Plus className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            </>
          )}
        </LuxuryCard>
      </div>

      {/* ── Quick Links ── */}
      <div>
        <SectionHeader>Quick Links</SectionHeader>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Link href="/emergency">
            <div className="bg-white rounded-xl border border-[#E8E4DD] p-5 md:p-6 transition-all hover:shadow-sm active:scale-[0.98] min-h-[110px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-400 rounded-r-full" />
              <ShieldAlert className="h-6 w-6 text-red-400" strokeWidth={1.5} />
              <div className="mt-3">
                <p className="font-medium text-[#2C2C2C] text-sm">Emergency</p>
                <p className="text-xs text-[#8A7E72] mt-0.5">Contacts & protocols</p>
              </div>
            </div>
          </Link>

          <Link href="/family">
            <div className="bg-white rounded-xl border border-[#E8E4DD] p-5 md:p-6 transition-all hover:shadow-sm active:scale-[0.98] min-h-[110px] flex flex-col justify-between">
              <Heart className="h-6 w-6 text-[#B8965A]" strokeWidth={1.5} />
              <div className="mt-3">
                <p className="font-medium text-[#2C2C2C] text-sm">Family Hub</p>
                <p className="text-xs text-[#8A7E72] mt-0.5">Soren, contacts & more</p>
              </div>
            </div>
          </Link>

          <Link href="/meals">
            <div className="bg-white rounded-xl border border-[#E8E4DD] p-5 md:p-6 transition-all hover:shadow-sm active:scale-[0.98] min-h-[110px] flex flex-col justify-between">
              <UtensilsCrossed className="h-6 w-6 text-[#C07A1A]" strokeWidth={1.5} />
              <div className="mt-3">
                <p className="font-medium text-[#2C2C2C] text-sm">Meal Planner</p>
                <p className="text-xs text-[#8A7E72] mt-0.5">This week&apos;s meals</p>
              </div>
            </div>
          </Link>

          <Link href="/maintenance">
            <div className="bg-white rounded-xl border border-[#E8E4DD] p-5 md:p-6 transition-all hover:shadow-sm active:scale-[0.98] min-h-[110px] flex flex-col justify-between">
              <Wrench className="h-6 w-6 text-[#5C6B5E]" strokeWidth={1.5} />
              <div className="mt-3">
                <p className="font-medium text-[#2C2C2C] text-sm">Maintenance</p>
                <p className="text-xs text-[#8A7E72] mt-0.5">Home upkeep</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-10 bg-[#B8965A]/15" />
          <p className="text-[11px] text-[#B8B0A4] tracking-[0.2em]">
            sweeney.family
          </p>
          <div className="h-px w-10 bg-[#B8965A]/15" />
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(FamilyHomePage), { ssr: false });

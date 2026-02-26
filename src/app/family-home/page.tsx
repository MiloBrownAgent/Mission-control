"use client";

import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
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
  if (hour < 12) return Sun;
  if (hour < 17) return Sun;
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
  { name: "Cammie's 70th Birthday 🎂", date: "2026-02-25", emoji: "🎂" },
  { name: "Wooster Group — Walker Art Center", date: "2026-02-28", time: "3–5 PM", emoji: "🎭" },
  { name: "Mike watches Soren", date: "2026-03-06", time: "5–9 PM", emoji: "👴" },
  { name: "Savannah Trip ✈️", date: "2026-03-11", time: "Mar 11–17", emoji: "✈️" },
  { name: "Dave's 37th Birthday", date: "2026-03-30", emoji: "🎂" },
  { name: "Japan Trip 🇯🇵", date: "2026-04-02", time: "Apr 2–11", emoji: "✈️" },
  { name: "Beau & Albert's 3rd Birthday", date: "2026-04-11", emoji: "🎉" },
  { name: "Kate & Tim's Wedding", date: "2026-05-16", emoji: "💍" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type DayName = typeof DAY_NAMES[number];

const mealTypeConfig = {
  breakfast: { label: "Breakfast", emoji: "🌅", color: "text-[#C07A1A]" },
  lunch: { label: "Lunch", emoji: "☀️", color: "text-[#2A4E8A]" },
  dinner: { label: "Dinner", emoji: "🌙", color: "text-[#6B5A9B]" },
} as const;

function FamilyHomePage() {
  const mode = useAppMode();
  const router = useRouter();

  // Redirect work mode users to the main dashboard
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
  const uncheckedGrocery = groceryItems?.filter((i) => !i.checked) ?? [];

  const currentWeekStart = getWeekStart(now);
  const meals = useQuery(api.meals.getWeek, { weekStart: currentWeekStart });

  // Next week meal plan (approval flow)
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
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Section 1: Today at a Glance ── */}
      <div className="relative overflow-hidden rounded-[20px] border border-[#C4533A]/15 bg-gradient-to-br from-[#C4533A]/5 via-[#C07A1A]/3 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#C4533A]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#C07A1A]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C4533A] to-[#C07A1A] shadow-lg">
              <GreetingIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-display)] text-[#1C1208]">
                {getGreeting()}, Sweeney Family 👋
              </h1>
              <p className="text-sm text-[#6B5B4E] mt-0.5">
                {format(now, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Weather row */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#2A4E8A]/15 bg-[#2A4E8A]/5 px-4 py-3">
            <Cloud className="h-4 w-4 text-[#2A4E8A] shrink-0" />
            {weather ? (
              <p className="text-sm text-[#1C1208]">
                <span className="text-lg mr-1">{weather.emoji}</span>
                <span className="font-semibold">{weather.temp}°F</span>
                <span className="text-[#6B5B4E]"> — {weather.description}</span>
                <span className="text-[#6B5B4E] text-xs ml-2">↑{weather.high}° ↓{weather.low}°</span>
              </p>
            ) : (
              <div className="h-5 w-48 animate-pulse rounded bg-[#E5DDD4]" />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Soren Today ── */}
      <Card className="rounded-[20px] border-[#2E6B50]/20 bg-gradient-to-br from-[#2E6B50]/5 via-[#2E6B50]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E6B50]/10">
            <Baby className="h-4 w-4 text-[#2E6B50]" />
          </div>
          <h2 className="font-bold text-[#2E6B50] text-xl font-[family-name:var(--font-display)]">Soren Today 👶</h2>
          <span className="ml-auto text-xl">🐻</span>
        </div>

        {/* Age */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-[#2E6B50]">{sorenAge.months}</span>
          <span className="text-[#6B5B4E] text-sm">months</span>
          <span className="text-2xl font-bold text-[#2E6B50]/70 ml-1">{sorenAge.days}</span>
          <span className="text-[#6B5B4E] text-sm">days old</span>
        </div>
      </Card>

      {/* ── Section 2b: Soren's Daycare Report ── */}
      {daycareReport !== undefined && (
        <Card className="rounded-[20px] border-[#2A4E8A]/20 bg-gradient-to-br from-[#2A4E8A]/5 via-[#2A4E8A]/3 to-transparent p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A4E8A]/10">
              <Baby className="h-4 w-4 text-[#2A4E8A]" />
            </div>
            <h2 className="font-bold text-[#2A4E8A] text-xl font-[family-name:var(--font-display)]">Soren&apos;s Last Daycare Day</h2>
            {daycareReport && (
              <span className="ml-auto text-xs text-[#2A4E8A]/70">{daycareReport.date}</span>
            )}
          </div>
          {!daycareReport ? (
            <p className="text-sm text-[#6B5B4E]">No report yet — check back after the first daycare day.</p>
          ) : (
            <div className="space-y-3">
              {daycareReport.photoUrl && (
                <img
                  src={daycareReport.photoUrl}
                  alt="Soren at daycare"
                  className="w-full rounded-xl object-cover max-h-48"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                {daycareReport.totalTime && (
                  <div className="rounded-lg border border-[#2A4E8A]/15 bg-[#2A4E8A]/5 px-3 py-2">
                    <p className="text-xs text-[#6B5B4E]">Time at Daycare</p>
                    <p className="text-sm font-semibold text-[#1C1208]">{daycareReport.totalTime}</p>
                    {daycareReport.checkIn && daycareReport.checkOut && (
                      <p className="text-xs text-[#6B5B4E]">{daycareReport.checkIn} – {daycareReport.checkOut}</p>
                    )}
                  </div>
                )}
                {daycareReport.totalSleep !== undefined && (
                  <div className="rounded-lg border border-[#2A4E8A]/15 bg-[#2A4E8A]/5 px-3 py-2">
                    <p className="text-xs text-[#6B5B4E]">Sleep</p>
                    <p className="text-sm font-semibold text-[#1C1208]">{daycareReport.totalSleep}</p>
                    {daycareReport.totalNaps !== undefined && (
                      <p className="text-xs text-[#6B5B4E]">{daycareReport.totalNaps} nap{daycareReport.totalNaps !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                )}
                {daycareReport.meals !== undefined && (
                  <div className="rounded-lg border border-[#2A4E8A]/15 bg-[#2A4E8A]/5 px-3 py-2">
                    <p className="text-xs text-[#6B5B4E]">Meals</p>
                    <p className="text-sm font-semibold text-[#1C1208]">{daycareReport.meals} feedings</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Section 2c: Gym Classes ── */}
      <Card className="rounded-[20px] border-[#A85570]/20 bg-gradient-to-br from-[#A85570]/5 via-[#A85570]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85570]/10">
            <Dumbbell className="h-4 w-4 text-[#A85570]" />
          </div>
          <h2 className="font-bold text-[#A85570] text-xl font-[family-name:var(--font-display)]">Upcoming Classes 🏋️</h2>
        </div>

        {classBookings === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[#E5DDD4]" />
            ))}
          </div>
        ) : classBookings.length === 0 ? (
          <p className="text-sm text-[#6B5B4E] italic px-1">No classes booked in the next 2 weeks.</p>
        ) : (
          <div className="space-y-2">
            {classBookings.map((cls) => {
              const isWaitlist = cls.status === "waitlisted";
              const memberColor = cls.member === "Amanda" ? "#A85570" : "#2A4E8A";
              const date = new Date(cls.classDate + "T12:00:00");
              const dateLabel = format(date, "EEE, MMM d");
              return (
                <div
                  key={cls._id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                  style={{ borderColor: `${memberColor}22`, backgroundColor: `${memberColor}08` }}
                >
                  <span className="text-base">{isWaitlist ? "⏳" : "✅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1208] truncate">{cls.className}</p>
                    <p className="text-xs text-[#6B5B4E]">
                      {dateLabel} · {cls.classTime}
                      {cls.location ? ` · ${cls.location.split(",")[0]}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: memberColor, backgroundColor: `${memberColor}18` }}
                    >
                      {cls.member}
                    </span>
                    {isWaitlist && (
                      <span className="text-xs text-[#C07A1A]">Waitlist</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Section 3: Today's Meals ── */}
      <Card className="rounded-[20px] border-[#C07A1A]/20 bg-gradient-to-br from-[#C07A1A]/5 via-[#C07A1A]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C07A1A]/10">
            <UtensilsCrossed className="h-4 w-4 text-[#C07A1A]" />
          </div>
          <h2 className="font-bold text-[#C07A1A] text-xl font-[family-name:var(--font-display)]">Today&apos;s Meals</h2>
          <span className="ml-auto text-xs text-[#6B5B4E]">{todayDayName}</span>
        </div>

        {meals === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#E5DDD4]" />
            ))}
          </div>
        ) : todayMeals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#C07A1A]/30 bg-[#C07A1A]/5 p-4 text-center">
            <p className="text-sm text-[#6B5B4E]">No meals planned for today</p>
            <Link href="/meals" className="text-xs text-[#C07A1A] hover:text-[#C07A1A]/80 mt-1 inline-block">
              → Open Meal Planner
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {([
              { key: "breakfast", meal: breakfastToday },
              { key: "lunch", meal: lunchToday },
              { key: "dinner", meal: dinnerToday },
            ] as const).map(({ key, meal }) => {
              const config = mealTypeConfig[key];
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-lg border border-[#C07A1A]/15 bg-[#C07A1A]/5 px-3 py-2.5"
                >
                  <span className="text-base mt-0.5">{config.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${config.color} uppercase tracking-wide`}>
                      {config.label}
                    </p>
                    {meal ? (
                      <>
                        <p className="text-sm font-medium mt-0.5 text-[#1C1208]">{meal.name}</p>
                        {meal.sorenMeal && (
                          <p className="text-xs text-[#C07A1A]/70 mt-0.5">👶 Soren: {meal.sorenMeal}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[#6B5B4E] mt-0.5 italic">Not planned</p>
                    )}
                  </div>
                </div>
              );
            })}
            <Link
              href="/meals"
              className="flex items-center justify-center gap-1.5 text-xs text-[#C07A1A] hover:text-[#C07A1A]/80 py-1 transition-colors"
            >
              <UtensilsCrossed className="h-3 w-3" />
              Full meal planner →
            </Link>
          </div>
        )}
      </Card>

      {/* ── Section 3b: Next Week's Meal Plan (Approval) ── */}
      {nextWeekMeals !== undefined && nextWeekMeals.some(m => m.status === "pending") && (() => {
        const DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
        const pendingDinners = nextWeekMeals.filter(m => m.mealType === "dinner");
        const pendingLunches = nextWeekMeals.filter(m => m.mealType === "lunch" && m.status === "pending");
        const allPending = [...pendingDinners, ...pendingLunches];
        const totalPending = allPending.filter(m => m.status === "pending").length;
        const totalMeals = allPending.length;
        const allApproved = totalPending === 0;

        return (
          <Card className="rounded-[20px] border-[#C07A1A]/30 bg-gradient-to-br from-[#C07A1A]/5 via-[#C07A1A]/3 to-transparent p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C07A1A]/10">
                <UtensilsCrossed className="h-4 w-4 text-[#C07A1A]" />
              </div>
              <h2 className="font-bold text-[#C07A1A] text-xl font-[family-name:var(--font-display)]">Next Week&apos;s Meals</h2>
              {!allApproved && (
                <span className="ml-auto text-xs font-medium text-[#C07A1A] bg-[#C07A1A]/10 px-2 py-0.5 rounded-full">
                  {totalPending} to approve
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B5B4E] mb-4">Week of Mar 2 · Approve or swap each meal</p>

            <div className="space-y-3">
              {DAYS_ORDER.map(day => {
                const dinner = nextWeekMeals.find(m => m.day === day && m.mealType === "dinner");
                const lunch = nextWeekMeals.find(m => m.day === day && m.mealType === "lunch");
                if (!dinner && !lunch) return null;

                return (
                  <div key={day} className="rounded-xl border border-[#C07A1A]/15 bg-white/40 overflow-hidden">
                    <div className="px-3 py-1.5 bg-[#C07A1A]/8 border-b border-[#C07A1A]/10">
                      <p className="text-xs font-semibold text-[#C07A1A] uppercase tracking-wide">{day}</p>
                    </div>
                    <div className="divide-y divide-[#C07A1A]/10">
                      {[dinner, lunch].filter(Boolean).map(meal => {
                        if (!meal) return null;
                        const isApproved = meal.status === "approved";
                        const isDenied = meal.status === "denied" || deniedId === meal._id;
                        const isPending = !isApproved && !isDenied;
                        const label = meal.mealType === "dinner" ? "🌙 Dinner" : "☀️ Lunch";

                        return (
                          <div key={meal._id} className="px-3 py-2.5">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#6B5B4E] font-medium">{label}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {meal.url ? (
                                    <a href={meal.url} target="_blank" rel="noopener noreferrer"
                                      className="text-sm font-medium text-[#1C1208] hover:text-[#C07A1A] hover:underline transition-colors leading-tight">
                                      {meal.name}
                                    </a>
                                  ) : (
                                    <p className="text-sm font-medium text-[#1C1208] leading-tight">{meal.name}</p>
                                  )}
                                </div>
                                {meal.notes && (
                                  <p className="text-xs text-[#6B5B4E]/70 mt-0.5">{meal.notes}</p>
                                )}
                              </div>
                              {/* Status badge / buttons */}
                              {isApproved && (
                                <span className="shrink-0 text-xs font-semibold text-[#2E6B50] bg-[#2E6B50]/10 px-2 py-0.5 rounded-full mt-0.5">✓</span>
                              )}
                              {isPending && (
                                <div className="flex gap-1.5 shrink-0 mt-0.5">
                                  <button
                                    onClick={() => approveMeal({ id: meal._id })}
                                    className="text-xs font-semibold text-white bg-[#2E6B50] hover:bg-[#2E6B50]/80 px-2.5 py-1 rounded-lg transition-colors"
                                  >✓</button>
                                  <button
                                    onClick={() => { denyMeal({ id: meal._id }); setDeniedId(meal._id); }}
                                    className="text-xs font-semibold text-white bg-[#C4533A] hover:bg-[#C4533A]/80 px-2.5 py-1 rounded-lg transition-colors"
                                  >✕</button>
                                </div>
                              )}
                            </div>

                            {/* Replacement picker */}
                            {isDenied && meal.replacements && meal.replacements.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                <p className="text-xs text-[#C4533A] font-medium">Pick a replacement:</p>
                                {meal.replacements.map((r, i) => (
                                  <button
                                    key={i}
                                    onClick={() => { replaceMeal({ id: meal._id, name: r.name, url: r.url, notes: r.notes }); setDeniedId(null); }}
                                    className="w-full text-left rounded-lg border border-[#C07A1A]/20 bg-[#C07A1A]/5 hover:bg-[#C07A1A]/10 px-3 py-2 transition-colors"
                                  >
                                    <p className="text-xs font-medium text-[#1C1208]">{r.name}</p>
                                    {r.notes && <p className="text-xs text-[#6B5B4E]">{r.notes}</p>}
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
          </Card>
        );
      })()}

      {/* ── Section 4: Upcoming Events ── */}
      <Card className="rounded-[20px] border-[#6B5A9B]/20 bg-gradient-to-br from-[#6B5A9B]/5 via-[#6B5A9B]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B5A9B]/10">
            <CalendarDays className="h-4 w-4 text-[#6B5A9B]" />
          </div>
          <h2 className="font-bold text-[#6B5A9B] text-xl font-[family-name:var(--font-display)]">Upcoming</h2>
          <Link href="/family" className="ml-auto text-xs text-[#6B5A9B] hover:text-[#6B5A9B]/80 transition-colors">
            See all →
          </Link>
        </div>
        <div className="space-y-2">
          {upcomingEvents
            .map(e => ({ ...e, daysUntil: getDaysUntil(e.date) }))
            .filter(e => e.daysUntil >= 0)
            .slice(0, 4)
            .map(e => (
              <div key={e.name} className="flex items-center gap-3 rounded-lg border border-[#6B5A9B]/15 bg-[#6B5A9B]/5 px-3 py-2.5">
                <span className="text-xl w-7 text-center shrink-0">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#1C1208]">{e.name}</p>
                  {e.time && <p className="text-xs text-[#6B5B4E]">{e.time}</p>}
                </div>
                <span className={`text-xs font-semibold shrink-0 ${e.daysUntil === 0 ? 'text-red-600' : e.daysUntil <= 7 ? 'text-[#C07A1A]' : 'text-[#6B5B4E]'}`}>
                  {e.daysUntil === 0 ? 'Today' : e.daysUntil === 1 ? 'Tomorrow' : `${e.daysUntil}d`}
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* ── Section 4c: Weekend with Soren ── */}
      <Card className="rounded-[20px] border-[#2E6B50]/20 bg-gradient-to-br from-[#2E6B50]/5 via-[#2A4E8A]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E6B50]/10">
            <MapPin className="h-4 w-4 text-[#2E6B50]" />
          </div>
          <h2 className="font-bold text-[#2E6B50] text-xl font-[family-name:var(--font-display)]">Weekend with Soren 🧸</h2>
          {weekendData?.weekOf && (
            <span className="ml-auto text-xs text-[#6B5B4E]">Wknd of {weekendData.weekOf}</span>
          )}
        </div>

        {weekendData === undefined ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl border border-[#E5DDD4] bg-[#F0EBE3]/30" />
            ))}
          </div>
        ) : !weekendData.activities?.length ? (
          <div className="rounded-xl border border-dashed border-[#2E6B50]/30 bg-[#2E6B50]/5 p-5 text-center">
            <p className="text-2xl mb-1">🗓️</p>
            <p className="text-sm font-medium text-[#1C1208]">Weekend ideas coming Thursday</p>
            <p className="text-xs text-[#6B5B4E] mt-1">Milo searches events every Thursday and populates this list</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {weekendData.activities.map((activity) => {
              const isOpen = expandedActivity === activity._id;
              return (
                <div
                  key={activity._id}
                  className={`rounded-xl border bg-[#FFFCF7] transition-all ${isOpen ? "border-[#2E6B50]/30 shadow-sm" : "border-[#2E6B50]/15"}`}
                >
                  {/* Header row — always visible, clickable */}
                  <button
                    onClick={() => setExpandedActivity(isOpen ? null : activity._id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="text-xs font-bold text-[#2E6B50]/50 tabular-nums w-5 shrink-0">{activity.rank}.</span>
                    <p className="text-sm font-semibold text-[#1C1208] flex-1 min-w-0">{activity.title}</p>
                    <ChevronDown className={`h-3.5 w-3.5 text-[#6B5B4E] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-[#2E6B50]/10 pt-2.5 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-[#2E6B50]/10 px-2 py-0.5 text-[10px] font-medium text-[#2E6B50]">{activity.category}</span>
                        {activity.cost && (
                          <span className="rounded-full bg-[#C07A1A]/10 px-2 py-0.5 text-[10px] text-[#C07A1A]">{activity.cost}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B5B4E] leading-relaxed">{activity.description}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {activity.location && (
                          <span className="text-[10px] text-[#6B5B4E] flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />{activity.location}
                          </span>
                        )}
                        {activity.driveTime && (
                          <span className="text-[10px] text-[#6B5B4E]">🚗 {activity.driveTime}</span>
                        )}
                        {activity.ageNote && (
                          <span className="text-[10px] text-[#2A4E8A]">👶 {activity.ageNote}</span>
                        )}
                        {activity.url && (
                          <a href={activity.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#C4533A] underline hover:no-underline">Details →</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Section 4b: Grocery List ── */}
      <Card className="rounded-[20px] border-[#C07A1A]/20 bg-gradient-to-br from-[#C07A1A]/5 via-[#C4533A]/3 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C07A1A]/10">
            <ShoppingCart className="h-4 w-4 text-[#C07A1A]" />
          </div>
          <h2 className="font-bold text-[#C07A1A] text-xl font-[family-name:var(--font-display)]">Grocery List</h2>
          <Link href="/grocery" className="ml-auto text-xs text-[#C07A1A] hover:text-[#C07A1A]/80 transition-colors">
            See full list →
          </Link>
        </div>

        {groceryItems === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[#E5DDD4]" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-[#6B5B4E] mb-3">
              🛒 {uncheckedGrocery.length} item{uncheckedGrocery.length !== 1 ? "s" : ""} on the list
            </p>

            {uncheckedGrocery.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {uncheckedGrocery.slice(0, 3).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-2 rounded-lg border border-[#C07A1A]/15 bg-[#C07A1A]/5 px-3 py-2"
                  >
                    <span className="text-xs text-[#C07A1A]">•</span>
                    <span className="text-sm flex-1 truncate text-[#1C1208]">{item.text}</span>
                    {item.category && (
                      <span className="text-[10px] text-[#6B5B4E]">{item.category}</span>
                    )}
                  </div>
                ))}
                {uncheckedGrocery.length > 3 && (
                  <p className="text-xs text-[#6B5B4E] px-1">
                    +{uncheckedGrocery.length - 3} more items
                  </p>
                )}
              </div>
            )}

            {/* Quick-add */}
            <div className="flex gap-2">
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
                placeholder="Quick add..."
                className="flex-1 rounded-lg border border-[#C07A1A]/20 bg-[#C07A1A]/5 px-3 py-1.5 text-sm text-[#1C1208] placeholder:text-[#6B5B4E] focus:outline-none focus:ring-2 focus:ring-[#C07A1A]/30"
              />
              <button
                onClick={async () => {
                  if (groceryInput.trim()) {
                    await addGroceryItem({ text: groceryInput.trim() });
                    setGroceryInput("");
                  }
                }}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#C4533A] to-[#C07A1A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </>
        )}
      </Card>

      {/* ── Section 5: Quick Links ── */}
      <div>
        <h2 className="text-sm font-semibold text-[#6B5B4E] uppercase tracking-wide mb-3 font-[family-name:var(--font-display)]">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/emergency">
            <div className="group relative overflow-hidden rounded-[20px] border-2 border-red-500/30 bg-gradient-to-br from-red-500/8 to-red-600/3 p-5 transition-all duration-200 hover:border-red-500/50 hover:shadow-lg active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🚨</span>
              <div>
                <p className="font-bold text-red-700 text-sm mt-2">Emergency Info</p>
                <p className="text-xs text-red-600/60">Contacts &amp; protocols</p>
              </div>
            </div>
          </Link>

          <Link href="/family">
            <div className="group relative overflow-hidden rounded-[20px] border-2 border-[#C4533A]/20 bg-gradient-to-br from-[#C4533A]/6 to-[#A85570]/3 p-5 transition-all duration-200 hover:border-[#C4533A]/40 hover:shadow-lg active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">👨‍👩‍👧</span>
              <div>
                <p className="font-bold text-[#C4533A] text-sm mt-2">Family Hub</p>
                <p className="text-xs text-[#C4533A]/60">Soren, contacts &amp; more</p>
              </div>
            </div>
          </Link>

          <Link href="/meals">
            <div className="group relative overflow-hidden rounded-[20px] border-2 border-[#C07A1A]/20 bg-gradient-to-br from-[#C07A1A]/6 to-[#C07A1A]/3 p-5 transition-all duration-200 hover:border-[#C07A1A]/40 hover:shadow-lg active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🍽️</span>
              <div>
                <p className="font-bold text-[#C07A1A] text-sm mt-2">Meal Planner</p>
                <p className="text-xs text-[#C07A1A]/60">This week&apos;s meals</p>
              </div>
            </div>
          </Link>

          <Link href="/maintenance">
            <div className="group relative overflow-hidden rounded-[20px] border-2 border-[#2E6B50]/20 bg-gradient-to-br from-[#2E6B50]/6 to-[#2E6B50]/3 p-5 transition-all duration-200 hover:border-[#2E6B50]/40 hover:shadow-lg active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🏠</span>
              <div>
                <p className="font-bold text-[#2E6B50] text-sm mt-2">Maintenance</p>
                <p className="text-xs text-[#2E6B50]/60">Home upkeep tracker</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer mode indicator */}
      <div className="text-center pb-4">
        <p className="text-[10px] text-[#6B5B4E]/50 flex items-center justify-center gap-1.5">
          <Heart className="h-2.5 w-2.5 text-[#C4533A]/50" />
          Sweeney Family Hub · Family Mode
          <Heart className="h-2.5 w-2.5 text-[#C4533A]/50" />
        </p>
      </div>
    </div>
  );
}

// Disable SSR to prevent hydration mismatch from time-dependent rendering
export default dynamic(() => Promise.resolve(FamilyHomePage), { ssr: false });

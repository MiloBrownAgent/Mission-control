"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
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
  CalendarDays,
  Baby,
  Cloud,
  Sun,
  Moon,
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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type DayName = typeof DAY_NAMES[number];

const mealTypeConfig = {
  breakfast: { label: "Breakfast", emoji: "🌅", color: "text-amber-600" },
  lunch: { label: "Lunch", emoji: "☀️", color: "text-sky-600" },
  dinner: { label: "Dinner", emoji: "🌙", color: "text-purple-600" },
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

  const currentWeekStart = getWeekStart(now);
  const meals = useQuery(api.meals.getWeek, { weekStart: currentWeekStart });

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
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/30 bg-gradient-to-br from-rose-50/10 via-amber-50/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-amber-500 shadow-lg">
              <GreetingIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {getGreeting()}, Sweeney Family 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(now, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Weather row */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
            <Cloud className="h-4 w-4 text-sky-400 shrink-0" />
            {weather ? (
              <p className="text-sm text-sky-300">
                <span className="text-lg mr-1">{weather.emoji}</span>
                <span className="font-semibold">{weather.temp}°F</span>
                <span className="text-muted-foreground"> — {weather.description}</span>
                <span className="text-muted-foreground text-xs ml-2">↑{weather.high}° ↓{weather.low}°</span>
              </p>
            ) : (
              <div className="h-5 w-48 animate-pulse rounded bg-white/5" />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Soren Today ── */}
      <Card className="border-blue-400/30 bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
            <Baby className="h-4 w-4 text-blue-400" />
          </div>
          <h2 className="font-semibold text-blue-300 text-base">Soren Today 👶</h2>
          <span className="ml-auto text-xl">🐻</span>
        </div>

        {/* Age */}
        <div className="mb-4 flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-blue-300">{sorenAge.months}</span>
          <span className="text-muted-foreground text-sm">months</span>
          <span className="text-2xl font-bold text-blue-200 ml-1">{sorenAge.days}</span>
          <span className="text-muted-foreground text-sm">days old</span>
        </div>

        <div className="space-y-3 text-sm">
          {/* Nap schedule */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-400/20 bg-blue-500/5 px-3 py-2.5">
            <span className="text-base mt-0.5">😴</span>
            <div>
              <p className="font-medium text-blue-200">Nap Schedule</p>
              <p className="text-muted-foreground text-xs mt-0.5">Nap 1 ~9 AM &middot; Nap 2 ~1 PM</p>
            </div>
          </div>

          {/* Bedtime */}
          <div className="flex items-start gap-3 rounded-lg border border-indigo-400/20 bg-indigo-500/5 px-3 py-2.5">
            <span className="text-base mt-0.5">🌙</span>
            <div>
              <p className="font-medium text-indigo-200">Bedtime Routine</p>
              <p className="text-muted-foreground text-xs mt-0.5">Routine starts at 6:15 PM — crib by 7:30 PM</p>
            </div>
          </div>

          {/* Feeding */}
          <div className="flex items-start gap-3 rounded-lg border border-sky-400/20 bg-sky-500/5 px-3 py-2.5">
            <span className="text-base mt-0.5">🍼</span>
            <div>
              <p className="font-medium text-sky-200">Feeding</p>
              <p className="text-muted-foreground text-xs mt-0.5">Breast milk + formula + solids</p>
              <p className="text-red-400/80 text-xs mt-0.5 font-medium">⚠️ No honey · No whole milk · No added salt</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 3: Today's Meals ── */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <UtensilsCrossed className="h-4 w-4 text-amber-400" />
          </div>
          <h2 className="font-semibold text-amber-300 text-base">Today&apos;s Meals</h2>
          <span className="ml-auto text-xs text-muted-foreground">{todayDayName}</span>
        </div>

        {meals === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : todayMeals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">No meals planned for today</p>
            <Link href="/meals" className="text-xs text-amber-400 hover:text-amber-300 mt-1 inline-block">
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
                  className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
                >
                  <span className="text-base mt-0.5">{config.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${config.color} uppercase tracking-wide`}>
                      {config.label}
                    </p>
                    {meal ? (
                      <>
                        <p className="text-sm font-medium mt-0.5">{meal.name}</p>
                        {meal.sorenMeal && (
                          <p className="text-xs text-amber-400/70 mt-0.5">👶 Soren: {meal.sorenMeal}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Not planned</p>
                    )}
                  </div>
                </div>
              );
            })}
            <Link
              href="/meals"
              className="flex items-center justify-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 py-1 transition-colors"
            >
              <UtensilsCrossed className="h-3 w-3" />
              Full meal planner →
            </Link>
          </div>
        )}
      </Card>

      {/* ── Section 4: Quick Links ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/emergency">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/20 to-red-600/10 p-5 transition-all duration-200 hover:border-red-500/70 hover:from-red-500/30 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🚨</span>
              <div>
                <p className="font-bold text-red-300 text-sm mt-2">Emergency Info</p>
                <p className="text-xs text-red-400/70">Contacts &amp; protocols</p>
              </div>
            </div>
          </Link>

          <Link href="/family">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-rose-400/30 bg-gradient-to-br from-rose-500/15 to-pink-500/10 p-5 transition-all duration-200 hover:border-rose-400/50 hover:from-rose-500/25 hover:shadow-lg hover:shadow-rose-500/15 active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">👨‍👩‍👧</span>
              <div>
                <p className="font-bold text-rose-300 text-sm mt-2">Family Hub</p>
                <p className="text-xs text-rose-400/70">Soren, contacts &amp; more</p>
              </div>
            </div>
          </Link>

          <Link href="/meals">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-5 transition-all duration-200 hover:border-amber-400/50 hover:from-amber-500/25 hover:shadow-lg hover:shadow-amber-500/15 active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🍽️</span>
              <div>
                <p className="font-bold text-amber-300 text-sm mt-2">Meal Planner</p>
                <p className="text-xs text-amber-400/70">This week&apos;s meals</p>
              </div>
            </div>
          </Link>

          <Link href="/calendar">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-sky-400/30 bg-gradient-to-br from-sky-500/15 to-blue-500/10 p-5 transition-all duration-200 hover:border-sky-400/50 hover:from-sky-500/25 hover:shadow-lg hover:shadow-sky-500/15 active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">📅</span>
              <div>
                <p className="font-bold text-sky-300 text-sm mt-2">Calendar</p>
                <p className="text-xs text-sky-400/70">Events &amp; schedule</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer mode indicator */}
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

// Disable SSR to prevent hydration mismatch from time-dependent rendering
export default dynamic(() => Promise.resolve(FamilyHomePage), { ssr: false });

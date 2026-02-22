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

interface DayStatus {
  status: "booked" | "not_booked" | "unknown";
  date: string;
  classId?: string;
}

interface CtrData {
  saturday: DayStatus;
  sunday: DayStatus;
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
  const [ctrStatus, setCtrStatus] = useState<CtrData | null>(null);
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

  useEffect(() => {
    fetch("/api/ctr-status")
      .then((r) => r.json())
      .then(setCtrStatus)
      .catch(() => null);
  }, []);

  const groceryItems = useQuery(api.groceryItems.getAll);
  const daycareReport = useQuery(api.daycareReports.getLatest);
  const addGroceryItem = useMutation(api.groceryItems.addItem);
  const uncheckedGrocery = groceryItems?.filter((i) => !i.checked) ?? [];

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
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-blue-300">{sorenAge.months}</span>
          <span className="text-muted-foreground text-sm">months</span>
          <span className="text-2xl font-bold text-blue-200 ml-1">{sorenAge.days}</span>
          <span className="text-muted-foreground text-sm">days old</span>
        </div>
      </Card>

      {/* ── Section 2b: Soren's Daycare Report ── */}
      {daycareReport !== undefined && (
        <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
              <Baby className="h-4 w-4 text-indigo-400" />
            </div>
            <h2 className="font-semibold text-indigo-300 text-base">Soren&apos;s Last Daycare Day</h2>
            {daycareReport && (
              <span className="ml-auto text-xs text-indigo-400/70">{daycareReport.date}</span>
            )}
          </div>
          {!daycareReport ? (
            <p className="text-sm text-muted-foreground">No report yet — check back after the first daycare day.</p>
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
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Time at Daycare</p>
                    <p className="text-sm font-semibold">{daycareReport.totalTime}</p>
                    {daycareReport.checkIn && daycareReport.checkOut && (
                      <p className="text-xs text-muted-foreground">{daycareReport.checkIn} – {daycareReport.checkOut}</p>
                    )}
                  </div>
                )}
                {daycareReport.totalSleep !== undefined && (
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Sleep</p>
                    <p className="text-sm font-semibold">{daycareReport.totalSleep}</p>
                    {daycareReport.totalNaps !== undefined && (
                      <p className="text-xs text-muted-foreground">{daycareReport.totalNaps} nap{daycareReport.totalNaps !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                )}
                {daycareReport.meals !== undefined && (
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Meals</p>
                    <p className="text-sm font-semibold">{daycareReport.meals} feedings</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Section 2c: Amanda's CTR Classes ── */}
      <Card className="border-rose-400/30 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20">
            <Dumbbell className="h-4 w-4 text-rose-400" />
          </div>
          <h2 className="font-semibold text-rose-300 text-base">Amanda&apos;s CTR Classes 🏋️</h2>
        </div>

        {ctrStatus === null ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {([
              { label: "Saturday", data: ctrStatus.saturday },
              { label: "Sunday", data: ctrStatus.sunday },
            ] as const).map(({ label, data }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5"
              >
                <span className="text-base">
                  {data.status === "booked" ? "✅" : data.status === "not_booked" ? "⏳" : "❓"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{data.date}</p>
                </div>
                <span className={`text-xs font-semibold ${
                  data.status === "booked" ? "text-emerald-400" : data.status === "not_booked" ? "text-amber-400" : "text-muted-foreground"
                }`}>
                  {data.status === "booked" ? "Booked" : data.status === "not_booked" ? "Not yet" : "Unknown"}
                </span>
              </div>
            ))}
          </div>
        )}
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

      {/* ── Section 4: Upcoming Events ── */}
      <Card className="border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <CalendarDays className="h-4 w-4 text-violet-400" />
          </div>
          <h2 className="font-semibold text-violet-300 text-base">Upcoming</h2>
          <Link href="/family" className="ml-auto text-xs text-violet-400 hover:text-violet-300 transition-colors">
            See all →
          </Link>
        </div>
        <div className="space-y-2">
          {upcomingEvents
            .map(e => ({ ...e, daysUntil: getDaysUntil(e.date) }))
            .filter(e => e.daysUntil >= 0)
            .slice(0, 4)
            .map(e => (
              <div key={e.name} className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                <span className="text-xl w-7 text-center shrink-0">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  {e.time && <p className="text-xs text-muted-foreground">{e.time}</p>}
                </div>
                <span className={`text-xs font-semibold shrink-0 ${e.daysUntil === 0 ? 'text-red-400' : e.daysUntil <= 7 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {e.daysUntil === 0 ? 'Today' : e.daysUntil === 1 ? 'Tomorrow' : `${e.daysUntil}d`}
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* ── Section 4b: Grocery List ── */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <ShoppingCart className="h-4 w-4 text-amber-400" />
          </div>
          <h2 className="font-semibold text-amber-300 text-base">Grocery List</h2>
          <Link href="/grocery" className="ml-auto text-xs text-amber-400 hover:text-amber-300 transition-colors">
            See full list →
          </Link>
        </div>

        {groceryItems === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              🛒 {uncheckedGrocery.length} item{uncheckedGrocery.length !== 1 ? "s" : ""} on the list
            </p>

            {uncheckedGrocery.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {uncheckedGrocery.slice(0, 3).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                  >
                    <span className="text-xs">•</span>
                    <span className="text-sm flex-1 truncate">{item.text}</span>
                    {item.category && (
                      <span className="text-[10px] text-muted-foreground">{item.category}</span>
                    )}
                  </div>
                ))}
                {uncheckedGrocery.length > 3 && (
                  <p className="text-xs text-muted-foreground px-1">
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
                className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={async () => {
                  if (groceryInput.trim()) {
                    await addGroceryItem({ text: groceryInput.trim() });
                    setGroceryInput("");
                  }
                }}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
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

          <Link href="/maintenance">
            <div className="group relative overflow-hidden rounded-2xl border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 transition-all duration-200 hover:border-emerald-400/50 hover:from-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/15 active:scale-95 min-h-[100px] flex flex-col justify-between">
              <span className="text-3xl">🏠</span>
              <div>
                <p className="font-bold text-emerald-300 text-sm mt-2">Maintenance</p>
                <p className="text-xs text-emerald-400/70">Home upkeep tracker</p>
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

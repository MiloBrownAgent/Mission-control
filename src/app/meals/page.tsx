"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  ShoppingCart,
  CalendarDays,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

type Day = typeof DAYS[number];
type MealType = typeof MEAL_TYPES[number];

function getWeekStart(date: Date): string {
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  return format(mon, "yyyy-MM-dd");
}

function formatWeekLabel(weekStart: string): string {
  const mon = new Date(weekStart + "T12:00:00");
  const sun = addDays(mon, 6);
  return `${format(mon, "MMM d")} – ${format(sun, "MMM d, yyyy")}`;
}

const mealTypeConfig = {
  breakfast: { label: "Breakfast", emoji: "🌅", color: "text-amber-400", bg: "bg-amber-500/10" },
  lunch: { label: "Lunch", emoji: "☀️", color: "text-sky-400", bg: "bg-sky-500/10" },
  dinner: { label: "Dinner", emoji: "🌙", color: "text-purple-400", bg: "bg-purple-500/10" },
};

interface MealCellProps {
  weekStart: string;
  day: Day;
  mealType: MealType;
  meal: { name: string; sorenMeal?: string; notes?: string } | undefined;
}

function MealCell({ weekStart, day, mealType, meal }: MealCellProps) {
  const [editing, setEditing] = useState(false);
  const [mealName, setMealName] = useState(meal?.name ?? "");
  const [sorenMeal, setSorenMeal] = useState(meal?.sorenMeal ?? "");

  const setMealMutation = useMutation(api.meals.setMeal);
  const clearMealMutation = useMutation(api.meals.clearMeal);

  const handleSave = useCallback(async () => {
    if (mealName.trim()) {
      await setMealMutation({
        weekStart,
        day,
        mealType,
        name: mealName.trim(),
        sorenMeal: sorenMeal.trim() || undefined,
      });
    } else if (meal) {
      await clearMealMutation({ weekStart, day, mealType });
    }
    setEditing(false);
  }, [weekStart, day, mealType, mealName, sorenMeal, meal, setMealMutation, clearMealMutation]);

  const handleCancel = useCallback(() => {
    setMealName(meal?.name ?? "");
    setSorenMeal(meal?.sorenMeal ?? "");
    setEditing(false);
  }, [meal]);

  if (editing) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 space-y-1.5">
        <Input
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          placeholder="Meal name..."
          className="h-7 text-xs bg-background/50 border-border/50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Input
          value={sorenMeal}
          onChange={(e) => setSorenMeal(e.target.value)}
          placeholder="Soren's meal (optional)..."
          className="h-7 text-xs bg-background/50 border-border/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 px-2 text-[10px] bg-amber-500 hover:bg-amber-600 text-black" onClick={handleSave}>
            <Check className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group w-full rounded-lg border text-left transition-all duration-150 p-2 min-h-[48px] ${
        meal
          ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10"
          : "border-dashed border-border/40 hover:border-amber-500/30 hover:bg-amber-500/5"
      }`}
    >
      {meal ? (
        <>
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-medium leading-snug">{meal.name}</p>
            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
          </div>
          {meal.sorenMeal && (
            <p className="text-[10px] text-amber-400/70 mt-1 leading-snug">
              👶 {meal.sorenMeal}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
            + add meal
          </p>
        </div>
      )}
    </button>
  );
}

export default function MealsPage() {
  const [activeTab, setActiveTab] = useState<"plan" | "grocery">("plan");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  const meals = useQuery(api.meals.getWeek, { weekStart: currentWeekStart });
  const groceryList = useQuery(api.meals.getGroceryList, { weekStart: currentWeekStart });
  const setGroceryList = useMutation(api.meals.setGroceryList);
  const seedMeals = useMutation(api.meals.seedMeals);

  const [groceryText, setGroceryText] = useState<string | null>(null);
  const [grocerySaving, setGrocerySaving] = useState(false);

  const displayedGrocery = groceryText !== null ? groceryText : (groceryList?.items ?? "");

  const prevWeek = () => {
    const d = new Date(currentWeekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(format(d, "yyyy-MM-dd"));
    setGroceryText(null);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(format(d, "yyyy-MM-dd"));
    setGroceryText(null);
  };

  const handleGrocerySave = async () => {
    if (groceryText === null) return;
    setGrocerySaving(true);
    await setGroceryList({ weekStart: currentWeekStart, items: groceryText });
    setGrocerySaving(false);
    setGroceryText(null);
  };

  const getMeal = (day: Day, mealType: MealType) => {
    return meals?.find((m) => m.day === day && m.mealType === mealType);
  };

  const weekLabel = formatWeekLabel(currentWeekStart);
  const totalMeals = meals?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Meal Planner</h1>
              <p className="text-sm text-muted-foreground">Sweeney Family Kitchen 🍳</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              {totalMeals} meals planned
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              👶 Soren-friendly
            </Badge>
          </div>
        </div>
      </div>

      {/* Week navigator + tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-amber-400" />
            Week of {weekLabel}
          </div>
          <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "plan"
                ? "bg-amber-500/20 text-amber-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🗓 Meal Plan
          </button>
          <button
            onClick={() => setActiveTab("grocery")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "grocery"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Grocery List
          </button>
        </div>
      </div>

      {/* Seed button if empty */}
      {activeTab === "plan" && meals !== undefined && meals.length === 0 && (
        <Card className="border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <p className="text-muted-foreground mb-4">No meals planned for this week.</p>
          <Button
            onClick={() => seedMeals({})}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            🌱 Seed sample meals (week of Feb 23)
          </Button>
        </Card>
      )}

      {/* Meal Plan Grid */}
      {activeTab === "plan" && (
        <div className="w-full">
          {/* Desktop grid */}
          <div className="hidden lg:block">
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Column headers */}
              <div className="grid bg-card border-b border-border" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                <div className="p-3" />
                {DAYS.map((day) => {
                  const weekMonday = new Date(currentWeekStart + "T12:00:00");
                  const dayIndex = DAYS.indexOf(day);
                  const date = addDays(weekMonday, dayIndex);
                  return (
                    <div key={day} className="p-3 text-center border-l border-border/50">
                      <p className="text-xs font-semibold text-foreground">{day.slice(0, 3)}</p>
                      <p className="text-[10px] text-muted-foreground">{format(date, "MMM d")}</p>
                    </div>
                  );
                })}
              </div>
              {/* Meal rows */}
              {MEAL_TYPES.map((mealType) => {
                const config = mealTypeConfig[mealType];
                return (
                  <div key={mealType} className="grid border-b border-border/50 last:border-0" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                    <div className={`flex flex-col items-center justify-center p-3 ${config.bg} border-r border-border/50`}>
                      <span className="text-base">{config.emoji}</span>
                      <span className={`text-[10px] font-medium mt-0.5 ${config.color}`}>{config.label}</span>
                    </div>
                    {DAYS.map((day) => {
                      const meal = getMeal(day, mealType);
                      return (
                        <div key={day} className="p-1.5 border-l border-border/30">
                          <MealCell
                            weekStart={currentWeekStart}
                            day={day}
                            mealType={mealType}
                            meal={meal ? { name: meal.name, sorenMeal: meal.sorenMeal, notes: meal.notes } : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile view — card per day */}
          <div className="lg:hidden space-y-4">
            {DAYS.map((day) => {
              const weekMonday = new Date(currentWeekStart + "T12:00:00");
              const dayIndex = DAYS.indexOf(day);
              const date = addDays(weekMonday, dayIndex);
              return (
                <Card key={day} className="border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-amber-500/5">
                    <span className="font-semibold text-sm">{day}</span>
                    <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {MEAL_TYPES.map((mealType) => {
                      const config = mealTypeConfig[mealType];
                      const meal = getMeal(day, mealType);
                      return (
                        <div key={mealType} className="flex items-start gap-2">
                          <div className={`flex items-center gap-1 rounded-md px-2 py-1 ${config.bg} shrink-0`}>
                            <span className="text-xs">{config.emoji}</span>
                            <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                          </div>
                          <div className="flex-1">
                            <MealCell
                              weekStart={currentWeekStart}
                              day={day}
                              mealType={mealType}
                              meal={meal ? { name: meal.name, sorenMeal: meal.sorenMeal, notes: meal.notes } : undefined}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Grocery list tab */}
      {activeTab === "grocery" && (
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold">Grocery List — {weekLabel}</h2>
          </div>
          <Textarea
            value={displayedGrocery}
            onChange={(e) => setGroceryText(e.target.value)}
            placeholder="Paste or type your grocery list here...&#10;&#10;Proteins: chicken thighs, eggs...&#10;Produce: bananas, avocados...&#10;Baby: puffs, pouches..."
            className="min-h-[320px] font-mono text-sm bg-background/50 border-emerald-500/20 focus:border-emerald-500/40 resize-none"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              {displayedGrocery ? `${displayedGrocery.split("\n").filter(Boolean).length} lines` : "Empty list"}
            </p>
            <Button
              onClick={handleGrocerySave}
              disabled={grocerySaving || groceryText === null}
              className="bg-emerald-500 hover:bg-emerald-600 text-black disabled:opacity-50"
            >
              {grocerySaving ? "Saving..." : "Save List"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

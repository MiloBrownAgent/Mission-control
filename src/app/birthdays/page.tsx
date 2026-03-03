"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Gift,
  Calendar,
  Cake,
  X,
  Plus,
  Trash2,
} from "lucide-react";

interface Birthday {
  id: string;
  name: string;
  date: string; // MM-DD
  relation: string;
}

const DEFAULT_BIRTHDAYS: Birthday[] = [
  { id: "dave", name: "Dave Sweeney", date: "03-30", relation: "Dad" },
  { id: "amanda", name: "Amanda Sweeney", date: "12-15", relation: "Mom" },
  { id: "soren", name: "Soren Sweeney", date: "06-21", relation: "Son" },
  { id: "cammie", name: "Cammie Sweeney", date: "02-25", relation: "Dave\u2019s mom" },
  { id: "filippa", name: "Filippa", date: "11-15", relation: "Vienna & Dylan\u2019s daughter" },
];

const STORAGE_KEY = "mc-birthdays";
const GIFTS_STORAGE_KEY = "mc-birthday-gifts";

function loadBirthdays(): Birthday[] {
  if (typeof window === "undefined") return DEFAULT_BIRTHDAYS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_BIRTHDAYS;
}

function saveBirthdays(birthdays: Birthday[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
}

function loadGifts(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(GIFTS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveGifts(gifts: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GIFTS_STORAGE_KEY, JSON.stringify(gifts));
}

function getDaysUntilBirthday(mmdd: string): number {
  const now = new Date();
  const [month, day] = mmdd.split("-").map(Number);
  const thisYear = now.getFullYear();

  let nextBirthday = new Date(thisYear, month - 1, day);
  nextBirthday.setHours(0, 0, 0, 0);
  const today = new Date(thisYear, now.getMonth(), now.getDate());

  if (nextBirthday < today) {
    nextBirthday = new Date(thisYear + 1, month - 1, day);
  }

  return Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000);
}

function formatBirthdayDate(mmdd: string): string {
  const [month, day] = mmdd.split("-").map(Number);
  const date = new Date(2026, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<Birthday[]>(DEFAULT_BIRTHDAYS);
  const [gifts, setGifts] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBirthdays(loadBirthdays());
    setGifts(loadGifts());
    setMounted(true);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setBirthdays(prev => {
      const updated = prev.filter(b => b.id !== id);
      saveBirthdays(updated);
      return updated;
    });
  }, []);

  const handleGiftChange = useCallback((id: string, value: string) => {
    setGifts(prev => {
      const updated = { ...prev, [id]: value };
      saveGifts(updated);
      return updated;
    });
  }, []);

  const sortedBirthdays = useMemo(() => {
    return [...birthdays]
      .map((b) => ({
        ...b,
        daysUntil: getDaysUntilBirthday(b.date),
        formatted: formatBirthdayDate(b.date),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [birthdays]);

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto pb-8">
        <div className="h-32 animate-pulse rounded-2xl bg-[#F7F4EF] border border-[#E8E4DD]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8965A]/10">
            <Cake className="h-7 w-7 text-[#B8965A]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Birthdays & Gifts
            </h1>
            <p className="text-sm text-[#5C6B5E]">{sortedBirthdays.length} people tracked</p>
          </div>
        </div>
      </div>

      {/* Birthday Cards */}
      <section>
        <SectionHeader>Upcoming</SectionHeader>
        <div className="space-y-3">
          {sortedBirthdays.map((person) => {
            const isToday = person.daysUntil === 0;
            const isSoon = person.daysUntil <= 30 && person.daysUntil > 0;

            return (
              <div
                key={person.id}
                className={`rounded-2xl border p-5 transition-all ${
                  isToday
                    ? "border-[#B8965A]/40 bg-[#B8965A]/5"
                    : isSoon
                    ? "border-[#B8965A]/20 bg-white"
                    : "border-[#E8E4DD] bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 ${
                    isToday ? "bg-[#B8965A]/15" : "bg-[#F7F4EF]"
                  }`}>
                    <Cake className={`h-6 w-6 ${isToday ? "text-[#B8965A]" : "text-[#5C6B5E]"}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] font-medium text-[#2C2C2C]">{person.name}</h3>
                        <p className="text-xs text-[#8A7E72] mt-0.5">{person.relation}</p>
                      </div>
                      <button
                        onClick={() => handleRemove(person.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A7E72] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 min-h-[44px] min-w-[44px]"
                        aria-label={`Remove ${person.name}`}
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {person.formatted}
                      </span>
                    </div>

                    {/* Gift Ideas */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Gift className="h-3.5 w-3.5 text-[#5C6B5E]/60" strokeWidth={1.5} />
                        <p className="text-xs text-[#5C6B5E]/60 uppercase tracking-wider">Gift Ideas</p>
                      </div>
                      <textarea
                        value={gifts[person.id] || ""}
                        onChange={(e) => handleGiftChange(person.id, e.target.value)}
                        placeholder="Add gift ideas..."
                        rows={2}
                        className="w-full rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-3 py-2.5 text-sm text-[#2C2C2C] placeholder:text-[#5C6B5E]/40 focus:outline-none focus:border-[#B8965A]/30 focus:ring-2 focus:ring-[#B8965A]/10 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="text-right shrink-0">
                    {isToday ? (
                      <div className="rounded-lg bg-[#B8965A] px-3 py-1.5">
                        <p className="text-sm font-medium text-white">Today!</p>
                      </div>
                    ) : (
                      <>
                        <p className={`text-2xl font-light font-[family-name:var(--font-display)] ${isSoon ? "text-[#B8965A]" : "text-[#8A7E72]"}`}>
                          {person.daysUntil}
                        </p>
                        <p className="text-[10px] text-[#8A7E72] tracking-wide">days</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reset button if items were removed */}
      {birthdays.length < DEFAULT_BIRTHDAYS.length && (
        <button
          onClick={() => {
            setBirthdays(DEFAULT_BIRTHDAYS);
            saveBirthdays(DEFAULT_BIRTHDAYS);
          }}
          className="w-full rounded-xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 text-xs text-[#5C6B5E] hover:border-[#B8965A]/30 hover:text-[#B8965A] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Restore removed birthdays
        </button>
      )}
    </div>
  );
}

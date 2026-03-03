"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  Sun,
  Baby,
  UtensilsCrossed,
  Cloud,
  Bell,
  Clock,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();

  // Calculate months and remaining days accurately
  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  // Get the day in the current month cycle
  let dayOfBorn = born.getDate();
  let dayOfNow = now.getDate();

  if (dayOfNow < dayOfBorn) {
    months--;
    // Get last day of previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    dayOfNow += prevMonth.getDate();
  }

  const remainingDays = dayOfNow - dayOfBorn;
  const diffMs = now.getTime() - born.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return { months, remainingDays, totalDays };
}

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning, Sweeneys", Icon: Sunrise };
  if (hour < 17) return { text: "Good afternoon, Sweeneys", Icon: Sun };
  return { text: "Good evening, Sweeneys", Icon: Sunset };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

export default function TodayPage() {
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return now.toLocaleDateString("en-US", options);
  }, []);

  const sorenAge = useMemo(() => getSorenAge(), []);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Date Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/[0.03] blur-3xl" />
        <div className="relative text-center">
          <greeting.Icon className="h-8 w-8 text-[#B8965A] mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="text-2xl md:text-3xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] tracking-wide">
            {today}
          </h1>
          <p className="text-sm text-[#8A7E72] mt-2 tracking-wide">{greeting.text}</p>
        </div>
      </div>

      {/* Weather */}
      <section>
        <SectionHeader>Weather</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
              <Cloud className="h-5 w-5 text-[#5C6B5E]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#2C2C2C]">Weather</p>
              <p className="text-xs text-[#5C6B5E]">Loading...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section>
        <SectionHeader>Schedule</SectionHeader>
        <div className="rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#5C6B5E]/40" strokeWidth={1.5} />
            <p className="text-sm text-[#5C6B5E]/60">No upcoming events</p>
          </div>
        </div>
      </section>

      {/* Soren */}
      <section>
        <SectionHeader>Soren</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
              <Baby className="h-5 w-5 text-[#5C6B5E]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#2C2C2C]">
                {sorenAge.months} months, {sorenAge.remainingDays} days old
              </p>
              <p className="text-xs text-[#5C6B5E]">Day {sorenAge.totalDays}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 text-center">
              <Clock className="h-4 w-4 text-[#B8965A] mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-[#5C6B5E]">Nap ~9 AM</p>
            </div>
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 text-center">
              <Sun className="h-4 w-4 text-[#B8965A] mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-[#5C6B5E]">Nap ~1 PM</p>
            </div>
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 text-center">
              <Moon className="h-4 w-4 text-[#B8965A] mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-[#5C6B5E]">Bed 6:45 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reminders */}
      <section>
        <SectionHeader>Reminders</SectionHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[44px]">
            <Bell className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-[#2C2C2C]">Rigs — evening walk before dinner</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[44px]">
            <Bell className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-[#2C2C2C]">Soren bath at 6:15 PM</p>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Calendar,
  Sun,
  Baby,
  Cloud,
  Bell,
  Clock,
  Moon,
  Sunrise,
  Sunset,
  Utensils,
  Droplets,
  BedDouble,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  let months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth());
  let dayOfBorn = born.getDate();
  let dayOfNow = now.getDate();
  if (dayOfNow < dayOfBorn) {
    months--;
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

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  description: string;
  emoji: string;
  location: string;
}

export default function TodayPage() {
  const [greeting, setGreeting] = useState<ReturnType<typeof getGreeting> | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [sorenAge, setSorenAge] = useState<ReturnType<typeof getSorenAge> | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);

  // Convex queries
  const allEvents = useQuery(api.events.list);
  const daycareReport = useQuery(api.daycareReports.getLatest);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("weather failed");
      const data = await res.json();
      setWeather(data);
      setWeatherError(false);
    } catch {
      setWeatherError(true);
    }
  }, []);

  useEffect(() => {
    setGreeting(getGreeting());
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setToday(now.toLocaleDateString("en-US", options));
    setSorenAge(getSorenAge());

    // Refresh greeting every minute
    const greetingInterval = setInterval(() => setGreeting(getGreeting()), 60_000);

    // Fetch weather now + every 10 min
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 10 * 60_000);

    return () => {
      clearInterval(greetingInterval);
      clearInterval(weatherInterval);
    };
  }, [fetchWeather]);

  // Today's events filtered from Convex (re-evaluated whenever allEvents updates)
  const todayEvents = useMemo(() => {
    if (!allEvents) return [];
    const today = todayStr();
    return allEvents
      .filter((e) => e.date === today)
      .sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [allEvents]);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Date Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/[0.03] blur-3xl" />
        <div className="relative text-center">
          {greeting ? (
            <greeting.Icon className="h-8 w-8 text-[#B8965A] mx-auto mb-3" strokeWidth={1.5} />
          ) : (
            <Sun className="h-8 w-8 text-[#B8965A] mx-auto mb-3" strokeWidth={1.5} />
          )}
          <h1 className="text-2xl md:text-3xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] tracking-wide">
            {today ?? ""}
          </h1>
          <p className="text-sm text-[#8A7E72] mt-2 tracking-wide">
            {greeting?.text ?? ""}
          </p>
        </div>
      </div>

      {/* Weather */}
      <section>
        <SectionHeader>Weather</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
          {weather ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl leading-none">{weather.emoji}</div>
                <div>
                  <p className="text-2xl font-light text-[#2C2C2C]">
                    {weather.temp}°F
                  </p>
                  <p className="text-sm text-[#5C6B5E] capitalize">
                    {weather.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#5C6B5E]">
                  <span className="text-[#2C2C2C] font-medium">{weather.high}°</span> /{" "}
                  <span>{weather.low}°</span>
                </p>
                <p className="text-xs text-[#8A7E72] mt-1">
                  Feels like {weather.feelsLike}°
                </p>
                <p className="text-xs text-[#8A7E72]">{weather.location}</p>
              </div>
            </div>
          ) : weatherError ? (
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-[#5C6B5E]/40" strokeWidth={1.5} />
              <p className="text-sm text-[#8A7E72]">Weather unavailable</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-[#5C6B5E]/40 animate-pulse" strokeWidth={1.5} />
              <p className="text-sm text-[#8A7E72]">Loading weather…</p>
            </div>
          )}
        </div>
      </section>

      {/* Schedule */}
      <section>
        <SectionHeader>Schedule</SectionHeader>
        {allEvents === undefined ? (
          <div className="rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#5C6B5E]/40 animate-pulse" strokeWidth={1.5} />
              <p className="text-sm text-[#5C6B5E]/60">Loading schedule…</p>
            </div>
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#5C6B5E]/40" strokeWidth={1.5} />
              <p className="text-sm text-[#5C6B5E]/60">Nothing scheduled today</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <div
                key={event._id}
                className="flex items-start gap-3 rounded-xl border border-[#E8E4DD] bg-white px-4 py-3.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6B5E]/10 shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4 text-[#5C6B5E]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#2C2C2C] leading-snug">
                    {event.title}
                  </p>
                  {event.time && (
                    <p className="text-xs text-[#B8965A] mt-0.5">{event.time}</p>
                  )}
                  {event.description && (
                    <p className="text-xs text-[#8A7E72] mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Soren */}
      <section>
        <SectionHeader>Soren</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5 space-y-4">
          {/* Age */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
              <Baby className="h-5 w-5 text-[#5C6B5E]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#2C2C2C]">
                {sorenAge
                  ? `${sorenAge.months} months, ${sorenAge.remainingDays} days old`
                  : ""}
              </p>
              <p className="text-xs text-[#5C6B5E]">
                {sorenAge ? `Day ${sorenAge.totalDays}` : ""}
              </p>
            </div>
          </div>

          {/* Daycare report */}
          {daycareReport ? (
            <div className="space-y-3">
              {/* Photo */}
              {daycareReport.photoUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#F7F4EF]">
                  <Image
                    src={daycareReport.photoUrl}
                    alt="Soren at daycare"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Report header */}
              <div className="flex items-center gap-2 text-xs text-[#8A7E72]">
                <CheckCircle className="h-3.5 w-3.5 text-[#5C6B5E]" strokeWidth={2} />
                <span>
                  Tierra Encantada —{" "}
                  {daycareReport.date
                    ? new Date(daycareReport.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "today"}
                </span>
                {daycareReport.checkIn && (
                  <span className="ml-auto">
                    In {daycareReport.checkIn}
                    {daycareReport.checkOut ? ` · Out ${daycareReport.checkOut}` : ""}
                  </span>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {daycareReport.totalSleep && (
                  <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[11px] text-[#8A7E72] uppercase tracking-wide">Sleep</p>
                      <p className="text-sm font-medium text-[#2C2C2C]">{daycareReport.totalSleep}</p>
                    </div>
                  </div>
                )}
                {typeof daycareReport.totalNaps === "number" && (
                  <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 flex items-center gap-2">
                    <Moon className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[11px] text-[#8A7E72] uppercase tracking-wide">Naps</p>
                      <p className="text-sm font-medium text-[#2C2C2C]">{daycareReport.totalNaps}</p>
                    </div>
                  </div>
                )}
                {typeof daycareReport.meals === "number" && (
                  <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[11px] text-[#8A7E72] uppercase tracking-wide">Meals</p>
                      <p className="text-sm font-medium text-[#2C2C2C]">{daycareReport.meals}</p>
                    </div>
                  </div>
                )}
                {(typeof daycareReport.pees === "number" || typeof daycareReport.poops === "number") && (
                  <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3 flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[11px] text-[#8A7E72] uppercase tracking-wide">Diapers</p>
                      <p className="text-sm font-medium text-[#2C2C2C]">
                        {daycareReport.pees ?? 0}💧 {daycareReport.poops ?? 0}💩
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No daycare report — show schedule cards */
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
          )}

          {/* Always show nap/bedtime schedule if report exists too */}
          {daycareReport && (
            <div className="grid grid-cols-3 gap-2 pt-1">
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
          )}
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

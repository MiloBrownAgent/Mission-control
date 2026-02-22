"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Baby, Dog, User, Calendar, Gift, Clock, MapPin } from "lucide-react";
import { useMemo } from "react";

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  const diffMs = now.getTime() - born.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  const remainingDays = Math.floor(diffDays - months * 30.4375);
  return { months, days: remainingDays, totalDays: diffDays };
}

function getDaysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const familyMembers = [
  {
    name: "Dave Sweeney",
    role: "Dad & Husband",
    emoji: "👨",
    note: "Photographer, retoucher, man of the house. Runs on coffee.",
    color: "from-indigo-500/20 to-blue-500/10",
    border: "border-indigo-500/20",
  },
  {
    name: "Amanda Sweeney",
    role: "Wife & Mom",
    emoji: "👩",
    note: "The real boss of the house.",
    color: "from-rose-500/20 to-pink-500/10",
    border: "border-rose-500/20",
  },
  {
    name: "Cammie Sweeney",
    role: "Dave's Mom",
    emoji: "🎂",
    note: "Turning 70 on Feb 25! Lives in Greensboro.",
    color: "from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/20",
    badge: "🎉 70th Birthday!",
  },
  {
    name: "Mike Sweeney",
    role: "Dave's Dad",
    emoji: "👴",
    note: "Winters in Savannah, GA · Summers in Wayzata, MN. Watches Soren on March 6 (5–9 PM).",
    color: "from-blue-500/20 to-sky-500/10",
    border: "border-blue-500/20",
  },
  {
    name: "Chris Barrier",
    role: "Amanda's Dad",
    emoji: "👴",
    note: "Lives in Laguna Beach.",
    color: "from-cyan-500/20 to-teal-500/10",
    border: "border-cyan-500/20",
  },
  {
    name: "Lisa Barrier",
    role: "Amanda's Mom",
    emoji: "👵",
    note: "Lives in Sacramento.",
    color: "from-purple-500/20 to-violet-500/10",
    border: "border-purple-500/20",
  },
  {
    name: "Rigs",
    role: "Lagotto Romagnolo 🐾",
    emoji: "🐕",
    note: "Short for Rigatoni. The goodest boy. Supreme floof.",
    color: "from-emerald-500/20 to-green-500/10",
    border: "border-emerald-500/20",
  },
];

const upcomingEvents = [
  {
    name: "Cammie's 70th Birthday",
    date: "2026-02-25",
    note: "Big one! 🎉",
    emoji: "🎂",
    urgent: true,
  },
  {
    name: "Wooster Group — Walker Art Center",
    date: "2026-02-28",
    time: "3:00–5:00 PM",
    note: "Walker Art Center, Minneapolis.",
    emoji: "🎭",
  },
  {
    name: "Mike watches Soren",
    date: "2026-03-06",
    time: "5:00–9:00 PM",
    note: "Grandpa duty. Date night? 👀",
    emoji: "👴",
  },
  {
    name: "Savannah Trip",
    date: "2026-03-11",
    time: "Mar 11–17",
    note: "Flying to Savannah — visiting Mike. Dinner at Common Thread on the 14th.",
    emoji: "✈️",
  },
  {
    name: "Dave's 37th Birthday 🎂",
    date: "2026-03-30",
    note: "The big 37. Make it count.",
    emoji: "🎂",
  },
  {
    name: "Japan Trip 🇯🇵",
    date: "2026-04-02",
    time: "Apr 2–11",
    note: "Tokyo (Andaz) → Kyoto (Ace Hotel) → Tokyo. 10 days.",
    emoji: "✈️",
  },
  {
    name: "Beau & Albert's 3rd Birthday Party",
    date: "2026-04-11",
    note: "Edinborough Park, Edina",
    emoji: "🎉",
    location: "Edinborough Park, Edina",
  },
  {
    name: "Kate & Tim's Wedding",
    date: "2026-05-16",
    note: "The Hamptons.",
    emoji: "💍",
  },
];

export default function FamilyPage() {
  const sorenAge = useMemo(() => getSorenAge(), []);
  const daysTo9Months = getDaysUntil("2026-03-21");
  const cammieCountdown = getDaysUntil("2026-02-25");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">The Sweeney Family</h1>
            <p className="text-sm text-muted-foreground">Dave · Amanda · Soren · Rigs</p>
          </div>
        </div>
      </div>

      {/* Soren Card — hero */}
      <Card className="relative overflow-hidden border-blue-400/30 bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-sky-500 shadow-lg shadow-blue-500/20 text-3xl">
            👶
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold">Soren Sweeney</h2>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                Born June 21, 2025
              </Badge>
            </div>

            {/* Age display */}
            <div className="mt-4 flex gap-4">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-blue-300">{sorenAge.months}</p>
                <p className="text-xs text-muted-foreground mt-0.5">months</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-blue-300">{sorenAge.days}</p>
                <p className="text-xs text-muted-foreground mt-0.5">days</p>
              </div>
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-sky-300">{sorenAge.totalDays}</p>
                <p className="text-xs text-muted-foreground mt-0.5">days old</p>
              </div>
            </div>

            {/* 9-month milestone */}
            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Baby className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Next milestone: 9 months</span>
                <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-[10px]">
                  March 21, 2026
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-blue-500/20">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all"
                    style={{ width: `${Math.min(100, ((sorenAge.months * 30 + sorenAge.days) / (9 * 30)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-blue-300 font-medium shrink-0">
                  {daysTo9Months > 0 ? `${daysTo9Months} days away` : "🎉 9 months!"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Family Members Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-rose-400" />
          Family Members
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {familyMembers.map((member) => (
            <Card
              key={member.name}
              className={`border bg-gradient-to-br ${member.color} ${member.border} p-4 transition-all hover:shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{member.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{member.name}</h3>
                    {member.badge && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                        {member.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{member.note}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Family Events */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-rose-400" />
          Upcoming Family Events
        </h2>
        <div className="space-y-3">
          {upcomingEvents.map((event) => {
            const daysUntil = getDaysUntil(event.date);
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
            const isPast = daysUntil < 0;

            return (
              <Card
                key={event.name}
                className={`border p-4 transition-all ${
                  isUrgent
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-border bg-card hover:border-rose-500/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{event.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{event.name}</h3>
                      {isUrgent && !isPast && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                          🔥 {daysUntil === 0 ? "Today!" : `${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Past
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Gift className="h-3 w-3" />
                        {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.note && (
                      <p className="mt-1 text-xs text-muted-foreground">{event.note}</p>
                    )}
                  </div>
                  {!isPast && daysUntil > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-rose-400">{daysUntil}</p>
                      <p className="text-[10px] text-muted-foreground">days</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

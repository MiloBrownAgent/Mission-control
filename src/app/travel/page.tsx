"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Plane,
  Calendar,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  Search,
  TrendingDown,
  Globe,
  Filter,
  Clock,
} from "lucide-react";

/* ─── Types ─── */
type SortMode = "score" | "price" | "nonstop";
type Tab = "all" | "domestic" | "international";

/* ─── Helpers ─── */
function buildFlightSearchUrl(origin: string, destination: string, departureDate: string, returnDate?: string | null): string {
  const orig = origin.toUpperCase();
  const dest = destination.toUpperCase();
  if (returnDate) return `https://www.kayak.com/flights/${orig}-${dest}/${departureDate}/${returnDate}?adults=2`;
  return `https://www.kayak.com/flights/${orig}-${dest}/${departureDate}?adults=2`;
}

function getDaysUntil(dateStr: string) {
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/* ─── Trip Data ─── */
const upcomingTrips = [
  {
    id: "savannah-2026",
    destination: "Savannah, GA",
    dates: "March 11–17, 2026",
    startDate: "2026-03-11",
    description: "Ford Field & River Club with Mike. Dinner at Common Thread.",
    href: "/travel/savannah-2026",
  },
  {
    id: "japan-2026",
    destination: "Tokyo & Kyoto, Japan",
    dates: "April 2–11, 2026",
    startDate: "2026-04-02",
    description: "Andaz Toranomon Hills, Ace Hotel Kyoto, Shinkansen.",
    href: "/travel/japan-2026",
  },
];

/* ─── Main Page ─── */
export default function TravelPage() {
  const deals = useQuery(api.flightDeals.getThisWeek);
  const [sort, setSort] = useState<SortMode>("score");
  const [tab, setTab] = useState<Tab>("all");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchReturn, setSearchReturn] = useState("");
  const [showDeals, setShowDeals] = useState(false);

  const filtered = (deals ?? [])
    .filter((d) => {
      if (tab === "domestic") return !d.isInternational;
      if (tab === "international") return d.isInternational;
      return true;
    })
    .sort((a, b) => {
      if (sort === "score") return b.dealScore - a.dealScore;
      if (sort === "price") return a.cashPricePerPerson - b.cashPricePerPerson;
      if (sort === "nonstop") {
        if (a.isNonstop !== b.isNonstop) return a.isNonstop ? -1 : 1;
        return b.dealScore - a.dealScore;
      }
      return 0;
    });

  function buildSearchUrl() {
    if (!searchTo || !searchDate) return "#";
    return buildFlightSearchUrl("MSP", searchTo.toUpperCase().trim(), searchDate, searchReturn || null);
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8965A]/10">
            <Plane className="h-7 w-7 text-[#B8965A]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Travel
            </h1>
            <p className="text-sm text-[#5C6B5E]">Trips, flights, and adventure planning</p>
          </div>
        </div>
      </div>

      {/* Upcoming Trips */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">Upcoming Trips</h2>
          <div className="flex-1 h-px bg-[#B8965A]/20" />
        </div>

        <div className="space-y-3">
          {upcomingTrips.map((trip) => {
            const daysUntil = getDaysUntil(trip.startDate);
            return (
              <Link
                key={trip.id}
                href={trip.href}
                className="group block rounded-2xl border border-[#E8E4DD] bg-white p-5 hover:border-[#B8965A]/30 hover:shadow-sm transition-all active:bg-[#F7F4EF]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5C6B5E]/8 shrink-0">
                    <Plane className="h-6 w-6 text-[#5C6B5E]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">
                      {trip.destination}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {trip.dates}
                      </span>
                    </div>
                    <p className="text-sm text-[#8A7E72] mt-2 leading-relaxed">{trip.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {daysUntil > 0 && (
                      <div className="text-right">
                        <p className="text-2xl font-light text-[#B8965A] font-[family-name:var(--font-display)]">{daysUntil}</p>
                        <p className="text-[10px] text-[#8A7E72] tracking-wide">days</p>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-[#B8965A] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Flight Deals Toggle */}
      <section>
        <button
          onClick={() => setShowDeals(!showDeals)}
          className="w-full flex items-center gap-3 mb-5"
        >
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">Flight Deals from MSP</h2>
          <div className="flex-1 h-px bg-[#B8965A]/20" />
          <span className="text-xs text-[#B8965A] font-medium">{showDeals ? "Hide" : "Show"}</span>
        </button>

        {showDeals && (
          <div className="space-y-4">
            {/* Update badge */}
            <div className="flex items-center gap-1.5 text-xs text-[#5C6B5E]/60">
              <Clock className="h-3 w-3" />
              <span>Updates every Sunday</span>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-1 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-1">
                {(["all", "domestic", "international"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all min-h-[36px] ${
                      tab === t
                        ? "bg-white text-[#2C2C2C] shadow-sm border border-[#E8E4DD]"
                        : "text-[#5C6B5E]/70 hover:text-[#2C2C2C]"
                    }`}
                  >
                    {t === "all" && <Globe className="h-3.5 w-3.5" />}
                    {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-1">
                <Filter className="h-3 w-3 text-[#5C6B5E]/50 ml-2" />
                {([["score", "Best"], ["price", "Cheapest"], ["nonstop", "Non-stop"]] as [SortMode, string][]).map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                      sort === s
                        ? "bg-white text-[#2C2C2C] shadow-sm border border-[#E8E4DD]"
                        : "text-[#5C6B5E]/70 hover:text-[#2C2C2C]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal cards */}
            {deals === undefined ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl bg-[#F7F4EF] border border-[#E8E4DD]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-12 text-center">
                <Plane className="h-6 w-6 text-[#5C6B5E]/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-[#2C2C2C]">Deals update weekly</p>
                <p className="text-xs text-[#5C6B5E]/60 mt-1">Check back Sunday evening for this week&apos;s best fares from MSP.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((deal) => (
                  <div
                    key={deal._id}
                    className="rounded-xl border border-[#E8E4DD] bg-white p-4 space-y-3 hover:border-[#B8965A]/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#2C2C2C] font-[family-name:var(--font-display)] text-lg">
                          {deal.destinationCity}
                        </p>
                        <p className="text-xs text-[#5C6B5E]">{deal.origin} → {deal.destination}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            deal.dealScore >= 8
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : deal.dealScore >= 6
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-[#F7F4EF] text-[#5C6B5E] border-[#E8E4DD]"
                          }`}
                        >
                          {deal.dealScore}/10
                        </span>
                        <span className="text-[10px] text-[#5C6B5E] font-medium px-2 py-0.5 rounded-full border border-[#E8E4DD] bg-[#F7F4EF]">
                          {deal.cabinClass}
                        </span>
                      </div>
                    </div>

                    {/* Airline + nonstop */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#B8965A]">{deal.airline}</span>
                      <span className="text-[#E8E4DD]">·</span>
                      {deal.isNonstop ? (
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Plane className="h-3 w-3" /> Non-stop
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#5C6B5E]">1 stop</span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] px-3 py-2.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">
                          ${deal.cashPricePerPerson.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#5C6B5E]">per person</span>
                        <span className="text-[#E8E4DD]">·</span>
                        <span className="text-lg font-light text-[#B8965A] font-[family-name:var(--font-display)]">
                          ${deal.cashPriceTotal.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#5C6B5E]">for 2</span>
                      </div>
                      <p className="text-[10px] text-[#5C6B5E]/60 mt-1">
                        {"priceSource" in deal && (deal as {priceSource?: string}).priceSource
                          ? `From ${(deal as {priceSource?: string}).priceSource}`
                          : "Round-trip"}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                      <Calendar className="h-3 w-3" />
                      <span>Departs {deal.departureDate}</span>
                      {deal.returnDate && (
                        <>
                          <span>→</span>
                          <span>Returns {deal.returnDate}</span>
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <a
                      href={buildFlightSearchUrl(deal.origin, deal.destination, deal.departureDate, deal.returnDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B8965A] hover:bg-[#A6854F] px-3 py-2.5 text-sm font-medium text-white transition-colors min-h-[44px]"
                    >
                      <Search className="h-4 w-4" />
                      Search on Kayak
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Search a Route */}
            <div className="rounded-xl border border-[#E8E4DD] bg-[#FDFCFA] p-5 space-y-4">
              <h3 className="text-sm font-medium text-[#2C2C2C]">Search a Route</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider mb-1 block">From</label>
                  <div className="rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] px-3 py-2.5 text-sm text-[#5C6B5E] min-h-[44px] flex items-center">
                    MSP
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider mb-1 block">To</label>
                  <input
                    type="text"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value.toUpperCase())}
                    placeholder="JFK, CDG..."
                    maxLength={3}
                    className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2.5 placeholder:text-[#5C6B5E]/40 focus:outline-none focus:ring-2 focus:ring-[#B8965A]/20 focus:border-[#B8965A]/30 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider mb-1 block">Depart</label>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#B8965A]/20 focus:border-[#B8965A]/30 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider mb-1 block">Return</label>
                  <input
                    type="date"
                    value={searchReturn}
                    onChange={(e) => setSearchReturn(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#B8965A]/20 focus:border-[#B8965A]/30 min-h-[44px]"
                  />
                </div>
              </div>
              <a
                href={buildSearchUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
                  searchTo && searchDate
                    ? "bg-[#B8965A] hover:bg-[#A6854F] text-white"
                    : "bg-[#F7F4EF] text-[#5C6B5E]/40 pointer-events-none border border-[#E8E4DD]"
                }`}
              >
                <Search className="h-4 w-4" />
                Search on Kayak
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

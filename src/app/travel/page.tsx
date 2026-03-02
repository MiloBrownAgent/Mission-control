"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  France: "🇫🇷",
  UK: "🇬🇧",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Germany: "🇩🇪",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Netherlands: "🇳🇱",
  Canada: "🇨🇦",
  Thailand: "🇹🇭",
  Australia: "🇦🇺",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Ireland: "🇮🇪",
  Iceland: "🇮🇸",
};

function getFlag(country: string) {
  return COUNTRY_FLAGS[country] ?? "🌍";
}

function formatMiles(miles: number) {
  return miles.toLocaleString();
}

function buildFlightSearchUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string | null,
): string {
  const orig = origin.toUpperCase();
  const dest = destination.toUpperCase();
  // Kayak has a reliable deep-link format that always lands on search results
  if (returnDate) {
    return `https://www.kayak.com/flights/${orig}-${dest}/${departureDate}/${returnDate}?adults=2`;
  }
  return `https://www.kayak.com/flights/${orig}-${dest}/${departureDate}?adults=2`;
}

function normalizeDeltaCabin(cabinClass?: string): string {
  const raw = (cabinClass ?? "").toLowerCase();
  if (raw.includes("business")) return "BUSINESS";
  if (raw.includes("first")) return "FIRST";
  if (raw.includes("comfort") || raw.includes("premium")) return "FIRST_CLASS"; // Delta Comfort+
  return "ECONOMY";
}

function buildDeltaAwardUrl(origin: string, destination: string, departureDate: string, returnDate?: string | null, cabinClass?: string): string {
  const cabin = normalizeDeltaCabin(cabinClass);
  const tripType = returnDate ? "ROUND_TRIP" : "ONE_WAY";
  return `https://www.delta.com/flight-search/book-a-flight#/results/outbound/1/${cabin}/${origin}/${destination}/${departureDate}/MILES/${tripType}/2/0/0/0`;
}

function buildAirlineUrl(
  _airline: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string | null,
): string {
  return buildFlightSearchUrl(origin, destination, departureDate, returnDate);
}

type SortMode = "score" | "price" | "nonstop";
type Tab = "all" | "domestic" | "international";

export default function TravelPage() {
  const deals = useQuery(api.flightDeals.getThisWeek);
  const [sort, setSort] = useState<SortMode>("score");
  const [tab, setTab] = useState<Tab>("all");

  // Search form
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchReturn, setSearchReturn] = useState("");

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
    const dest = searchTo.toUpperCase().trim();
    return buildFlightSearchUrl("MSP", dest, searchDate, searchReturn || null);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl border border-[#1A1816] bg-[#0D0C0A] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A1816] text-2xl">
              ✈️
            </div>
            <div>
              <h1 className="text-2xl font-bold font-[family-name:var(--font-syne)] text-[#E8E4DF]">
                Travel ✈️
              </h1>
              <p className="text-sm text-[#6B6560]">
                Best Delta cash fares for 2 from MSP — real prices from Expedia & Travelocity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6B6560] bg-[#0D0C0A] border border-[#1A1816] rounded-lg px-3 py-2">
            <span>🔄</span>
            <span>Updates Sundays</span>
          </div>
        </div>
      </div>

      {/* Tabs + Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-[#1A1816] bg-[#0D0C0A] p-1">
          {(["all", "domestic", "international"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t
                  ? "bg-[#B8956A]/20 text-[#B8956A]"
                  : "text-[#6B6560] hover:text-[#E8E4DF]"
              }`}
            >
              {t === "all" ? "🌐 All" : t === "domestic" ? "🇺🇸 Domestic" : "🌍 International"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 rounded-lg border border-[#1A1816] bg-[#0D0C0A] p-1">
          <span className="text-xs text-[#6B6560] px-2">Sort:</span>
          {([["score", "Best Deal"], ["price", "Cheapest"], ["nonstop", "Non-stop first"]] as [SortMode, string][]).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                sort === s
                  ? "bg-[#B8956A]/20 text-[#B8956A]"
                  : "text-[#6B6560] hover:text-[#E8E4DF]"
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
            <div key={i} className="h-44 animate-pulse rounded-xl bg-[#0D0C0A]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1A1816] bg-[#0D0C0A] p-12 text-center">
          <p className="text-3xl mb-3">✈️</p>
          <p className="text-[#E8E4DF] font-semibold mb-1">Deals update weekly</p>
          <p className="text-sm text-[#6B6560]">Check back Sunday evening for this week&apos;s best fares from MSP.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((deal) => (
            <div
              key={deal._id}
              className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 space-y-3 hover:border-[#B8956A]/30 transition-colors"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFlag(deal.destinationCountry)}</span>
                    <div>
                      <p className="font-bold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
                        {deal.destinationCity}
                      </p>
                      <p className="text-xs text-[#6B6560]">{deal.origin} → {deal.destination}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      deal.dealScore >= 8
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : deal.dealScore >= 6
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-[#1A1816] text-[#6B6560] border-[#1A1816]"
                    }`}
                  >
                    ⭐ {deal.dealScore}/10
                  </span>
                  <span className="text-[10px] text-[#6B6560] font-medium px-2 py-0.5 rounded-full border border-[#1A1816] bg-[#060606]">
                    {deal.cabinClass}
                  </span>
                </div>
              </div>

              {/* Airline + nonstop */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#B8956A]">{deal.airline}</span>
                <span className="text-[#1A1816]">·</span>
                {deal.isNonstop ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    ✈️ Non-stop
                  </span>
                ) : (
                  <span className="text-[10px] text-[#6B6560]">1 stop</span>
                )}
              </div>

              {/* Price */}
              <div className="rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-[#E8E4DF]">
                    ${deal.cashPricePerPerson.toLocaleString()}
                  </span>
                  <span className="text-sm text-[#6B6560]">per person</span>
                  <span className="text-[#2A2825]">·</span>
                  <span className="text-lg font-bold text-[#B8956A]">
                    ${deal.cashPriceTotal.toLocaleString()}
                  </span>
                  <span className="text-sm text-[#6B6560]">for 2</span>
                </div>
                <p className="text-[10px] text-[#6B6560] mt-1">
                  {"priceSource" in deal && (deal as {priceSource?: string}).priceSource
                    ? `From ${(deal as {priceSource?: string}).priceSource}`
                    : "Round-trip · Economy"}
                </p>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5 text-xs text-[#6B6560]">
                <span>📅</span>
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B8956A] hover:bg-[#CDAA7E] px-3 py-2.5 text-sm font-bold text-[#060606] transition-colors"
              >
                🔍 Search on Kayak
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Search a Route */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5 space-y-4">
        <h2 className="font-bold font-[family-name:var(--font-syne)] text-[#E8E4DF]">
          Search a Route
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">From</label>
            <div className="rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#6B6560] cursor-not-allowed">
              MSP
            </div>
          </div>
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">To (airport code)</label>
            <input
              type="text"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value.toUpperCase())}
              placeholder="JFK, CDG..."
              maxLength={3}
              className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 placeholder:text-[#6B6560] focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">Depart</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">Passengers</label>
            <div className="rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#6B6560] cursor-not-allowed">
              2 passengers
            </div>
          </div>
        </div>
        <a
          href={buildSearchUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-opacity ${
            searchTo && searchDate
              ? "bg-[#B8956A] hover:bg-[#CDAA7E] text-[#060606]"
              : "bg-[#1A1816] text-[#6B6560] pointer-events-none"
          }`}
        >
          ✈️ Search on Kayak
        </a>
      </div>
    </div>
  );
}

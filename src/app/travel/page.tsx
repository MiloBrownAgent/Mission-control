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

function buildGoogleFlightsUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string | null,
): string {
  const orig = origin.toUpperCase();
  const dest = destination.toUpperCase();
  if (returnDate) {
    return `https://www.google.com/flights?hl=en#flt=${orig}.${dest}.${departureDate}*${dest}.${orig}.${returnDate};c:USD;e:1;sd:1`;
  }
  return `https://www.google.com/flights?hl=en#flt=${orig}.${dest}.${departureDate};c:USD;e:1;sd:1`;
}

function buildDeltaAwardUrl(): string {
  return "https://www.delta.com";
}

function buildAirlineUrl(
  _airline: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string | null,
): string {
  return buildGoogleFlightsUrl(origin, destination, departureDate, returnDate);
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
    return buildGoogleFlightsUrl("MSP", dest, searchDate, searchReturn || null);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#B8956A]/30 bg-gradient-to-br from-[#B8956A]/10 via-[#B8956A]/5 to-transparent p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8956A]/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#B8956A] to-[#CDAA7E] shadow-lg text-2xl">
              ✈️
            </div>
            <div>
              <h1 className="text-2xl font-bold font-[family-name:var(--font-syne)] text-[#E8E4DF]">
                Travel ✈️
              </h1>
              <p className="text-sm text-[#6B6560]">
                Best Delta + partner fares for 2, departing 4–8 weeks out from MSP
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
              <div className="rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 space-y-1.5">
                <div>
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-wide font-semibold mb-0.5">Miles</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl font-bold text-[#B8956A]">
                      {formatMiles(deal.skyMilesPerPerson)}
                    </span>
                    <span className="text-xs text-[#6B6560]">SkyMiles/person</span>
                    <span className="text-[#1A1816]">·</span>
                    <span className="text-sm font-semibold text-[#B8956A]">
                      {formatMiles(deal.skyMilesTotal)}
                    </span>
                    <span className="text-xs text-[#6B6560]">total for 2</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-wide font-semibold mb-0.5">Cash (taxes + fees)</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[#E8E4DF]">
                      ${deal.cashPricePerPerson.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#6B6560]">per person</span>
                    <span className="text-[#1A1816]">·</span>
                    <span className="text-sm font-semibold text-[#E8E4DF]">
                      ${deal.cashPriceTotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#6B6560]">total for 2</span>
                  </div>
                </div>
                <p className="text-[10px] text-[#6B6560]/60">Award pricing from Delta.com</p>
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
              <div className="flex gap-2">
                <a
                  href={buildGoogleFlightsUrl(deal.origin, deal.destination, deal.departureDate, deal.returnDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#B8956A] to-[#CDAA7E] px-3 py-2 text-xs font-bold text-[#060606] hover:opacity-90 transition-opacity"
                >
                  🔍 Search flights
                </a>
                <a
                  href={buildDeltaAwardUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#B8956A]/40 px-3 py-2 text-xs font-semibold text-[#B8956A] hover:bg-[#B8956A]/10 transition-colors"
                  title="Open Delta.com"
                >
                  ✈️ SkyMiles
                </a>
              </div>
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
              ? "bg-gradient-to-r from-[#B8956A] to-[#CDAA7E] text-[#060606] hover:opacity-90"
              : "bg-[#1A1816] text-[#6B6560] pointer-events-none"
          }`}
        >
          ✈️ Search on Delta.com
        </a>
      </div>
    </div>
  );
}

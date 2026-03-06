"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plane,
  Calendar,
  MapPin,
  Clock,
  Building,
  Train,
  Baby,
  ChevronDown,
  ChevronRight,
  Phone,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  ShoppingBag,
  Camera,
  Coffee,
  Utensils,
  Ticket,
  CreditCard,
  Armchair,
  Gauge,
  Download,
  FileText,
} from "lucide-react";

/* ─── Helpers ─── */
function gmaps(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function MapsLink({ name, className }: { name: string; className?: string }) {
  return (
    <a href={gmaps(name)} target="_blank" rel="noopener noreferrer" className={className || "text-[#B8965A] underline underline-offset-2 decoration-[#B8965A]/30 hover:decoration-[#B8965A]"}>
      {name}
    </a>
  );
}

function PhoneLink({ number }: { number: string }) {
  return (
    <a href={`tel:${number}`} className="text-[#B8965A] underline underline-offset-2 decoration-[#B8965A]/30 hover:decoration-[#B8965A] font-mono text-xs">
      {number}
    </a>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

/* ─── Collapsible Day Card ─── */
interface DayCardProps {
  day: string;
  date: string;
  title: string;
  city: string;
  children: React.ReactNode;
}

function DayCard({ day, date, title, city, children }: DayCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#E8E4DD] bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left active:bg-[#F7F4EF] transition-colors min-h-[72px]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">{day}</p>
            <span className="text-xs font-medium text-[#B8965A] bg-[#B8965A]/10 px-2 py-0.5 rounded-full">{city}</span>
          </div>
          <p className="text-lg font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">{date}</p>
          <p className="text-xs text-[#5C6B5E] mt-0.5">{title}</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-[#B8965A] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[#E8E4DD] pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function DayItem({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px]">
      <Icon className="h-4 w-4 text-[#B8965A] shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-sm text-[#2C2C2C] leading-relaxed">{children}</div>
    </div>
  );
}

/* ─── Reservation Checklist ─── */
type ReservationStatus = "booked" | "not-booked" | "concierge" | "optional";

interface Reservation {
  item: string;
  date: string;
  status: ReservationStatus;
  note?: string;
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  switch (status) {
    case "booked":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
          <CheckCircle className="h-3 w-3" strokeWidth={1.5} /> Booked
        </span>
      );
    case "not-booked":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> Not Yet Booked
        </span>
      );
    case "concierge":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#5C6B5E] bg-[#F7F4EF] border border-[#E8E4DD] px-2 py-1 rounded-full">
          <MessageCircle className="h-3 w-3" strokeWidth={1.5} /> Via Concierge
        </span>
      );
    case "optional":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#8A7E72] bg-[#F7F4EF] border border-[#E8E4DD] px-2 py-1 rounded-full">
          Optional
        </span>
      );
  }
}

const reservations: Reservation[] = [
  { item: "Shinkansen Tokyo \u2192 Kyoto", date: "Apr 6, 11:00 AM", status: "booked", note: "Nozomi 255 \u2014 Car 4, Seats 19A & 19B \u2014 \u00A527,540 (~$185)" },
  { item: "Shinkansen Kyoto \u2192 Tokyo", date: "Apr 9, 3:01 PM", status: "booked", note: "Nozomi 28 \u2014 arrives Tokyo 5:15 PM \u2014 \u00A527,540 (~$185)" },
  { item: "teamLab Biovortex", date: "Apr 7, 1 PM", status: "booked", note: "2 adults + 1 child" },
  { item: "teamLab Borderless", date: "Apr 10", status: "optional", note: "\u00A5500 (~$3) off coupon from Biovortex email" },
  { item: "Baby amenities (crib, diaper pail, humidifier)", date: "Apr 2 & Apr 9", status: "booked", note: "Confirmed by Andaz front office \u2014 both stays" },
  { item: "Luggage forwarding Tokyo \u2192 Kyoto", date: "Apr 6", status: "booked", note: "Confirmed \u2014 tell front desk by 5 PM, max \u00A55,410 (~$36)/bag" },
  { item: "Gonpachi Nishiazabu lunch", date: "Apr 3, 12:00 PM", status: "booked", note: "2 adults + 1 baby \u2014 arrive on time, 15-min cancel window. Amanda: walnut/pecan allergy noted." },
  { item: "Dashin Soan dinner (Shimokitazawa)", date: "Apr 4, 5:30 PM", status: "booked", note: "Course menu \u00A58,000 (~$54)/person. Cancel 4+ days out; \u00A58,800 (~$59)/person fee <3 days." },
  { item: "Tavern Grill & Lounge \u2014 arrival dinner", date: "Apr 2, ~7:30 PM", status: "concierge", note: "In-hotel, 51F \u2014 reservation requested via Andaz concierge" },
  { item: "Ace Hotel CC Authorization", date: "ASAP", status: "not-booked", note: "Required before dining guarantees. Complete Canary Tech link from Reina's email." },
  { item: "Bed guard for Soren — Kyoto", date: "Apr 6 check-in", status: "booked", note: "Confirmed by Ace Hotel (Yuko Tanaka)" },
  { item: "Apr 6 dinner — Mr. Maurice (in-hotel)", date: "Apr 6", status: "optional", note: "Italian, kid-friendly, Ace recommends for arrival night" },
  { item: "Apr 7 dinner — Gion Tanto (okonomiyaki)", date: "Apr 7", status: "not-booked", note: "Walk-in only — no reservations. Arrive early. Backup: Manmaru no Tsuki" },
  { item: "Apr 8 lunch — Nakagyo (soba/udon/ramen)", date: "Apr 8", status: "optional", note: "Walk-in friendly — most don't take reservations. See Ace rec list." },
  { item: "Apr 9 lunch — Sushi Ishimatsu", date: "Apr 9", status: "optional", note: "Walk-in only — arrive before opening. Near Philosopher\u2019s Path." },
];

/* ─── Main Page ─── */
export default function JapanTripPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Back */}
      <Link href="/travel" className="inline-flex items-center gap-2 text-sm text-[#5C6B5E] hover:text-[#B8965A] transition-colors min-h-[44px]">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Travel
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#5C6B5E]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8965A]/10">
              <Plane className="h-7 w-7 text-[#B8965A]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
                Japan 2026
              </h1>
              <p className="text-sm text-[#5C6B5E] mt-1">April 1-10 &middot; Tokyo &amp; Kyoto</p>
            </div>
          </div>
          <p className="text-sm text-[#8A7E72] mt-4 leading-relaxed">
            Cherry blossom season. 10 days across Tokyo and Kyoto with Soren. Andaz Toranomon Hills, Ace Hotel Kyoto, Shinkansen, vintage shopping, temples, and teamLab.
          </p>
        </div>
      </div>

      {/* Flights */}
      <section>
        <SectionHeader>Flights</SectionHeader>
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
                <Plane className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-medium text-[#2C2C2C]">DL121</h3>
                  <span className="text-xs text-[#B8965A] bg-[#B8965A]/10 px-2 py-0.5 rounded-full">Outbound</span>
                </div>
                <p className="text-sm text-[#5C6B5E] mt-1">MSP &rarr; Tokyo Haneda</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#8A7E72] flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> Apr 1</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> Departs 10:25 AM</span>
                </div>
                <p className="text-xs text-[#5C6B5E]/60 mt-1">Arrives Apr 2, 1:05 PM (local)</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
                <Plane className="h-5 w-5 text-[#5C6B5E] rotate-180" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-medium text-[#2C2C2C]">DL120</h3>
                  <span className="text-xs text-[#5C6B5E] bg-[#5C6B5E]/10 px-2 py-0.5 rounded-full">Return</span>
                </div>
                <p className="text-sm text-[#5C6B5E] mt-1">Tokyo Haneda &rarr; MSP</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#8A7E72] flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" strokeWidth={1.5} /> Apr 10</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> Departs 4:20 PM</span>
                </div>
                <p className="text-xs text-[#5C6B5E]/60 mt-1">Arrives Apr 10, 1:50 PM (same day)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hotels */}
      <section>
        <SectionHeader>Hotels</SectionHeader>
        <div className="space-y-3">
          <a href={gmaps("Andaz Tokyo Toranomon Hills")} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-[#E8E4DD] bg-white p-5 active:bg-[#F7F4EF] transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
                <Building className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-medium text-[#2C2C2C]">Andaz Tokyo Toranomon Hills</h3>
                <p className="text-xs text-[#5C6B5E] mt-0.5">Apr 2-6 &amp; Apr 9-10</p>
                <p className="text-xs text-[#5C6B5E]/60 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} /> Toranomon Hills Station (Hibiya Line)
                </p>
                <p className="text-xs text-emerald-600 mt-1">Breakfast included</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#B8965A] shrink-0 mt-1" strokeWidth={1.5} />
            </div>
          </a>

          <a href={gmaps("Ace Hotel Kyoto")} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-[#E8E4DD] bg-white p-5 active:bg-[#F7F4EF] transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
                <Building className="h-5 w-5 text-[#5C6B5E]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-medium text-[#2C2C2C]">Ace Hotel Kyoto</h3>
                <p className="text-xs text-[#5C6B5E] mt-0.5">Apr 6-9</p>
                <p className="text-xs text-[#5C6B5E]/60 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} /> Karasuma Oike Station (direct)
                </p>
                <p className="text-xs text-[#8A7E72] mt-1">No breakfast</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#B8965A] shrink-0 mt-1" strokeWidth={1.5} />
            </div>
          </a>
        </div>
      </section>

      {/* Shinkansen */}
      <section>
        <SectionHeader>Shinkansen</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Train className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Bullet Train</h3>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium ml-auto">Tickets Booked via Smart-EX</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-[#2C2C2C]">Tokyo &rarr; Kyoto</p>
              <span className="text-xs text-emerald-700 font-medium">Apr 6 · Confirmed</span>
            </div>
            <p className="text-xs text-[#5C6B5E]">Nozomi 255 &middot; 11:00 AM &rarr; 1:15 PM</p>
            <p className="text-xs text-[#5C6B5E] mt-0.5">Car 4 &middot; Seats 19A &amp; 19B &middot; &yen;27,540 (~$185)</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-[#2C2C2C]">Kyoto &rarr; Tokyo</p>
              <span className="text-xs text-emerald-700 font-medium">Apr 9 · Confirmed</span>
            </div>
            <p className="text-xs text-[#5C6B5E]">Nozomi 28 &middot; 3:01 PM &rarr; 5:15 PM</p>
            <p className="text-xs text-[#5C6B5E] mt-0.5">&yen;27,540 (~$185) &middot; Reservation #2003</p>
          </div>

          <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-3">
            <p className="text-xs text-[#5C6B5E]">Soren is a lap infant &mdash; no Shinkansen ticket needed (under 6). Total: &yen;55,080 (~$370).</p>
          </div>
        </div>
      </section>

      {/* Day-by-Day */}
      <section>
        <SectionHeader>Day-by-Day Itinerary</SectionHeader>
        <div className="space-y-3">

          {/* Apr 2 */}
          <DayCard day="Day 1" date="April 2, Wednesday" title="Arrival & Light Reset" city="Tokyo">
            <div className="space-y-2">
              <DayItem icon={Plane}>Taxi Haneda &rarr; Andaz (20-25 min)</DayItem>
              <DayItem icon={Building}>Request luggage forwarding to Kyoto + baby amenities at check-in</DayItem>
              <DayItem icon={MapPin}>
                Evening: <MapsLink name="Hamarikyu Gardens" /> (flat, stroller-perfect)
              </DayItem>
              <DayItem icon={Utensils}>Dinner: <MapsLink name="Tavern Grill & Lounge Andaz Tokyo" /> (51F, in-hotel) &mdash; reservation requested via Andaz concierge</DayItem>
              <DayItem icon={Baby}>Priority: get Soren on local time</DayItem>
            </div>
          </DayCard>

          {/* Apr 3 */}
          <DayCard day="Day 2" date="April 3, Thursday" title="Ginza Shopping & OJAS / Roppongi" city="Tokyo">
            <div className="space-y-2">
              <DayItem icon={Clock}>
                <span className="font-medium">7:30 AM:</span> Subway Toranomon Hills &rarr; Higashi-Ginza (Hibiya, 2 stops)
              </DayItem>
              <DayItem icon={ShoppingBag}>
                <MapsLink name="CRESE Ginza" /> (locked) &middot; <MapsLink name="Jack Road Ginza" /> &amp; Betty &middot; <MapsLink name="Rolex Boutique Ginza" /> &middot; <MapsLink name="Dover Street Market Ginza" /> &middot; <MapsLink name="Ozeki Tokyo Gallery" /> &middot; <MapsLink name="Turret Coffee Tokyo" />
              </DayItem>
              <DayItem icon={Baby}>9-10:30 AM: Soren morning nap in stroller through Ginza</DayItem>
              <DayItem icon={Utensils}>
                <span className="font-medium">Lunch: <MapsLink name="Gonpachi Nishiazabu" /></span> &mdash; 12:00 PM, BOOKED (2 adults + 1 baby). Arrive on time, 15-min window. Amanda walnut/pecan allergy noted.
              </DayItem>
              <DayItem icon={Camera}>
                <span className="font-medium">1-2:30 PM:</span> Soren nap &rarr; <MapsLink name="OJAS Karimoku Research Center Nishiazabu" /> (Between Space &amp; Sound, noon-6 PM, Thu-Fri, free)
              </DayItem>
              <DayItem icon={MapPin}>
                <span className="font-medium">Afternoon:</span> Taxi to Roppongi &middot; <MapsLink name="Mori Art Museum Tokyo" /> (52F) &middot; <MapsLink name="National Art Center Tokyo" /> (YBA &amp; Beyond, to May 11)
              </DayItem>
              <DayItem icon={Utensils}>Dinner: Toranomon Hills complex, casual</DayItem>
            </div>
          </DayCard>

          {/* Apr 4 */}
          <DayCard day="Day 3" date="April 4, Friday" title="Meiji, Omotesando, Shibuya Vintage, Shimokitazawa" city="Tokyo">
            <div className="space-y-2">
              <DayItem icon={Clock}><span className="font-medium">7:30 AM:</span> Taxi to <MapsLink name="Meiji Shrine Tokyo" /></DayItem>
              <DayItem icon={MapPin}><MapsLink name="Nezu Museum Omotesando" /> (beautiful garden)</DayItem>
              <DayItem icon={ShoppingBag}>
                Omotesando boutiques &middot; <MapsLink name="Herz Leather Shibuya" /> &middot; <MapsLink name="Paradise Vintage Shibuya" /> &middot; <MapsLink name="Brand Off Shibuya" /> &middot; <MapsLink name="Hive Preloved Meguro" /> (optional)
              </DayItem>
              <DayItem icon={Baby}>Morning nap in stroller. Afternoon nap during bag shops.</DayItem>
              <DayItem icon={Coffee}>
                <span className="font-medium">3 PM:</span> <MapsLink name="Shimokitazawa Tokyo" /> &mdash; vintage shops, caf&eacute;s
              </DayItem>
              <DayItem icon={Utensils}><span className="font-medium">Dinner: <MapsLink name="Dashin Soan Shimokitazawa" /></span> &mdash; 5:30 PM, BOOKED (2 adults + 1 baby). Course menu. No perfume. Arrive on time.</DayItem>
            </div>
          </DayCard>

          {/* Apr 5 */}
          <DayCard day="Day 4" date="April 5, Saturday" title="Asakusa, Kuramae, Yanaka" city="Tokyo">
            <div className="space-y-2">
              <DayItem icon={Clock}><span className="font-medium">7:00 AM:</span> Taxi to <MapsLink name="Senso-ji Temple Asakusa" /> (early, peaceful)</DayItem>
              <DayItem icon={MapPin}><MapsLink name="Senso-ji" /> + Nakamise street</DayItem>
              <DayItem icon={ShoppingBag}><MapsLink name="Kakimori Kuramae" /> &mdash; bespoke pens, stationery (5-10 min walk)</DayItem>
              <DayItem icon={Baby}>Morning nap: taxi to <MapsLink name="Yanaka Ginza Tokyo" /></DayItem>
              <DayItem icon={MapPin}>Yanaka Ginza wander + lunch</DayItem>
              <DayItem icon={Clock}>Afternoon: flexible &mdash; last afternoon in Tokyo. Wander Ueno, revisit anything, or decompress.</DayItem>
              <DayItem icon={Utensils}>
                <span className="font-medium">4:00 PM:</span> <MapsLink name="Tonkatsu Maisen Aoyama Omotesando" /> (former bathhouse, walk-in only, arrive ~4 PM to skip line)
              </DayItem>
              <DayItem icon={Utensils}>
                Dinner: <MapsLink name="Miyashin Yakitori Ginza" /> or casual near hotel
              </DayItem>
            </div>
          </DayCard>

          {/* Apr 6 */}
          <DayCard day="Day 5" date="April 6, Sunday" title="Tokyo to Kyoto" city="Travel">
            <div className="space-y-2">
              <DayItem icon={Baby}>Morning: Soren sleeps while Dave &amp; Amanda pack and check out</DayItem>
              <DayItem icon={Building}>Taxi Andaz &rarr; Tokyo Station (10-15 min)</DayItem>
              <DayItem icon={Train}>Nozomi 255, 11:00 AM Tokyo &rarr; Kyoto, Family car</DayItem>
              <DayItem icon={Building}>Arrive Kyoto 1:15 PM, taxi to <MapsLink name="Ace Hotel Kyoto" /></DayItem>
              <DayItem icon={Baby}>Afternoon nap: Dave &amp; Amanda unpack</DayItem>
              <DayItem icon={MapPin}>Gentle Nakagyo wander near hotel</DayItem>
              <DayItem icon={Utensils}>Light dinner, early Soren bedtime in new room</DayItem>
            </div>
          </DayCard>

          {/* Apr 7 */}
          <DayCard day="Day 6" date="April 7, Monday" title="Keage Incline, Nanzen-ji, teamLab, Gion" city="Kyoto">
            <div className="space-y-2">
              <DayItem icon={Clock}><span className="font-medium">7:30 AM:</span> Taxi to <MapsLink name="Keage Incline Kyoto" /> &mdash; cherry blossoms on old railway</DayItem>
              <DayItem icon={MapPin}><MapsLink name="Nanzen-ji Temple Kyoto" /> (10 min walk) &middot; <MapsLink name="Tenjuan Nanzen-ji Kyoto" /> sub-temple (moss garden, koi pond)</DayItem>
              <DayItem icon={Baby}>9:30-11 AM: Soren morning nap, return to hotel or caf&eacute;</DayItem>
              <DayItem icon={Ticket}>
                <span className="font-medium">1:00 PM: <MapsLink name="teamLab Biovortex Kyoto" /></span> &mdash; BOOKED (2 adults + 1 child, use carrier inside)
              </DayItem>
              <DayItem icon={MapPin}>
                <span className="font-medium">4:00 PM:</span> Taxi to Gion &middot; <MapsLink name="Gion Komori Kyoto" /> (mochi + tea) &middot; <MapsLink name="Momotaro Jeans Higashiyama Kyoto" /> (selvedge denim)
              </DayItem>
              <DayItem icon={Utensils}>
                Dinner: <MapsLink name="Gion Tanto Kyoto" /> (okonomiyaki) &mdash; walk-in only, no reservations. Arrive by 5 PM. Backup: <MapsLink name="Okonomiyaki Manmaru no Tsuki Kyoto" />
              </DayItem>
              <DayItem icon={Baby}>Return to Ace by 6:30 PM</DayItem>
            </div>
          </DayCard>

          {/* Apr 8 */}
          <DayCard day="Day 7" date="April 8, Tuesday" title="Fushimi Inari, Nakagyo Shops, Awomb, Nishiki Market" city="Kyoto">
            <div className="space-y-2">
              <DayItem icon={Clock}><span className="font-medium">7:00 AM:</span> Taxi to <MapsLink name="Fushimi Inari Taisha Kyoto" /> (20-25 min)</DayItem>
              <DayItem icon={MapPin}>Lower gates only (~45 min). Carrier for any steps above base.</DayItem>
              <DayItem icon={Baby}>Return to Nakagyo, Soren morning nap</DayItem>
              <DayItem icon={ShoppingBag}>
                <MapsLink name="Kikuo Shoten Kyoto" /> (rare books) &middot; <MapsLink name="Tsujikura Kyoto" /> (oldest umbrella store) &middot; <MapsLink name="Katayama Bunzaburo Shibori Kyoto" />
              </DayItem>
              <DayItem icon={Utensils}>
                Lunch: Walk-in soba, udon, or ramen in Nakagyo &mdash; all family-friendly, no booking needed
              </DayItem>
              <DayItem icon={MapPin}>
                <MapsLink name="Nishiki Market Kyoto" /> &mdash; covered food market, 5 min from Ace. Use CARRIER (too narrow for stroller). 45 min.
              </DayItem>
              <DayItem icon={Baby}>~1:30 PM: Hotel. Soren afternoon nap. Decompress.</DayItem>
              <DayItem icon={ShoppingBag}>
                Remaining shops at zero pressure: <MapsLink name="Ryouen Kyoto" /> &middot; <MapsLink name="Angers Kyoto" /> &middot; <MapsLink name="Itoh Kyuemon Kyoto" /> &middot; <MapsLink name="Le Labo Kyoto" /> &middot; <MapsLink name="Yugen Kyoto" />
              </DayItem>
              <DayItem icon={Utensils}>
                Dinner: <MapsLink name="Men-Ya Inoichi Kyoto" /> (ramen) or <MapsLink name="Torichu Higashiyama Kyoto" /> (ramen)
              </DayItem>
            </div>
          </DayCard>

          {/* Apr 9 */}
          <DayCard day="Day 8" date="April 9, Wednesday" title="Philosopher's Path, Ginkaku-ji, Return to Tokyo" city="Kyoto &rarr; Tokyo">
            <div className="space-y-2">
              <DayItem icon={Coffee}>
                <span className="font-medium">7:00 AM:</span> <MapsLink name="Walden Woods Kyoto" /> coffee &middot; <MapsLink name="Archi Coffee Kyoto" /> en route
              </DayItem>
              <DayItem icon={ShoppingBag}>Any remaining Nakagyo shops (<MapsLink name="Le Labo Kyoto" />, <MapsLink name="Yugen Kyoto" />)</DayItem>
              <DayItem icon={Baby}>Soren morning nap: taxi to <MapsLink name="Ginkaku-ji Kyoto" /></DayItem>
              <DayItem icon={MapPin}>
                <span className="font-medium">9:30 AM:</span> <MapsLink name="Ginkaku-ji Silver Pavilion Kyoto" /> &mdash; garden, UNESCO, cherry blossoms
              </DayItem>
              <DayItem icon={MapPin}>Walk <MapsLink name="Philosopher's Path Kyoto" /> south (stone canal, flat, stroller-perfect, 45 min)</DayItem>
              <DayItem icon={Utensils}>
                Lunch: <MapsLink name="Sushi Ishimatsu Kyoto" /> (affordable omakase, walk-in only &mdash; arrive before opening)
              </DayItem>
              <DayItem icon={Building}>1:30 PM: Return to Ace, check out, taxi to Kyoto Station</DayItem>
              <DayItem icon={Train}>Shinkansen 3 or 4 PM Kyoto &rarr; Tokyo (Family car)</DayItem>
              <DayItem icon={Building}>Arrive Tokyo ~5:15-6:15 PM, taxi to <MapsLink name="Andaz Tokyo Toranomon Hills" /></DayItem>
              <DayItem icon={Baby}>Quiet hotel evening, Soren bedtime</DayItem>
            </div>
          </DayCard>

          {/* Apr 10 */}
          <DayCard day="Day 9" date="April 10, Thursday" title="Departure" city="Tokyo">
            <div className="space-y-2">
              <DayItem icon={Utensils}>Andaz breakfast (included)</DayItem>
              <DayItem icon={Ticket}>
                Optional: <MapsLink name="teamLab Borderless Azabudai Hills Tokyo" /> (5 min walk, 10 AM open, &yen;500 off coupon)
              </DayItem>
              <DayItem icon={Clock}>Leave for Haneda by 1:30 PM at latest (taxi 20-25 min)</DayItem>
              <DayItem icon={Plane}>DL120 departs 4:20 PM, arrives MSP 1:50 PM same day</DayItem>
            </div>
          </DayCard>

        </div>
      </section>

      {/* Not Possible */}
      <section>
        <div className="rounded-xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-4">
          <p className="text-xs font-medium text-[#5C6B5E] mb-1">Not Possible This Trip</p>
          <p className="text-xs text-[#5C6B5E]/60">
            <MapsLink name="Saiho-Ji Moss Garden Kyoto" className="text-[#5C6B5E]/60 underline underline-offset-2 decoration-[#5C6B5E]/20" /> &mdash; requires written reservation months in advance. Top priority for next Japan trip.
          </p>
        </div>
      </section>

      {/* Reservation Checklist */}
      <section>
        <SectionHeader>Reservation Checklist</SectionHeader>
        <div className="space-y-2">
          {reservations.map((r, i) => (
            <div key={i} className="rounded-xl border border-[#E8E4DD] bg-white px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2C2C2C]">{r.item}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[#5C6B5E]">{r.date}</span>
                    {r.note && <span className="text-xs text-[#5C6B5E]/50">&middot; {r.note}</span>}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Traveling with Soren */}
      <section>
        <SectionHeader>Traveling with Soren</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Baby className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Key Notes</h3>
          </div>
          <div className="space-y-2">
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
              <p className="text-sm text-[#2C2C2C]">Soren will be ~10 months old</p>
              <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Lap infant on flights, no Shinkansen ticket needed (under 6)</p>
            </div>
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
              <p className="text-sm text-[#2C2C2C]">Schedule shapes every day</p>
              <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Wake ~6 AM, nap ~9 AM &amp; ~1 PM (45-90 min), bed 6:45 PM</p>
            </div>
            <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
              <p className="text-sm text-[#2C2C2C]">7-8 AM starts beat cherry blossom crowds</p>
              <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Aligns with Soren&apos;s best window. Stroller for nap transitions, carrier for narrow venues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Delta / Travel UI Containers */}
      <section>
        <SectionHeader>Delta SkyMiles &amp; Flight Status</SectionHeader>
        <div className="space-y-3">
          {/* SkyMiles Balance */}
          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
                <CreditCard className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">SkyMiles Balance</p>
                <p className="text-xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)]">&mdash;</p>
              </div>
            </div>
          </div>

          {/* Seat Assignments */}
          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Armchair className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-[#2C2C2C]">Seat Assignments</h3>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">DL121 &middot; MSP &rarr; HND</p>
                    <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Apr 1</p>
                  </div>
                  <span className="text-sm text-[#8A7E72] font-mono">&mdash;</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">DL120 &middot; HND &rarr; MSP</p>
                    <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Apr 10</p>
                  </div>
                  <span className="text-sm text-[#8A7E72] font-mono">&mdash;</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Status */}
          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-[#2C2C2C]">Flight Status</h3>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">DL121 &middot; Apr 1</p>
                    <p className="text-xs text-[#5C6B5E]/60 mt-0.5">MSP &rarr; HND &middot; 10:25 AM</p>
                  </div>
                  <span className="text-xs text-[#8A7E72] bg-[#F7F4EF] border border-[#E8E4DD] px-2 py-1 rounded-full">Status: &mdash;</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">DL120 &middot; Apr 10</p>
                    <p className="text-xs text-[#5C6B5E]/60 mt-0.5">HND &rarr; MSP &middot; 4:20 PM</p>
                  </div>
                  <span className="text-xs text-[#8A7E72] bg-[#F7F4EF] border border-[#E8E4DD] px-2 py-1 rounded-full">Status: &mdash;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Itinerary */}
      <section>
        <SectionHeader>Itinerary PDF</SectionHeader>
        <a
          href="/japan-2026-itinerary.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-2xl border border-[#B8965A]/20 bg-[#B8965A]/5 p-5 hover:bg-[#B8965A]/10 transition-colors active:bg-[#B8965A]/15"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
            <FileText className="h-6 w-6 text-[#B8965A]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-medium text-[#2C2C2C]">Japan 2026 — Full Itinerary</h3>
            <p className="text-xs text-[#5C6B5E] mt-0.5">Complete day-by-day guide, reservations, hotels, and travel notes</p>
          </div>
          <Download className="h-4 w-4 text-[#B8965A] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
        </a>
      </section>

      {/* Footer */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-[#B8965A]/20" />
          <p className="text-[10px] text-[#5C6B5E]/40 uppercase tracking-[0.2em]">sweeney.family</p>
          <div className="h-px w-8 bg-[#B8965A]/20" />
        </div>
      </div>
    </div>
  );
}

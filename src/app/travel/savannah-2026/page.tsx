"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Plane,
  Calendar,
  MapPin,
  Phone,
  Clock,
  Building,
  UtensilsCrossed,
  Users,
  ExternalLink,
  Compass,
} from "lucide-react";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
      <Icon className="h-4 w-4 text-[#B8965A] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-[#2C2C2C]">{value}</p>
        {sub && <p className="text-xs text-[#5C6B5E]/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function SavannahTripPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Back */}
      <Link href="/travel" className="inline-flex items-center gap-2 text-sm text-[#5C6B5E] hover:text-[#B8965A] transition-colors min-h-[44px]">
        <ArrowLeft className="h-4 w-4" />
        Back to Travel
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#5C6B5E]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5C6B5E]/10">
              <Plane className="h-7 w-7 text-[#5C6B5E]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
                Savannah, Georgia
              </h1>
              <p className="text-sm text-[#5C6B5E] mt-1">March 11–17, 2026</p>
            </div>
          </div>
          <p className="text-sm text-[#8A7E72] mt-4 leading-relaxed">
            A week at The Ford Field & River Club with Mike. Visiting the Low Country, exploring Savannah, and enjoying family time.
          </p>
        </div>
      </div>

      {/* Flights */}
      <section>
        <SectionHeader>Flights</SectionHeader>
        <div className="space-y-2">
          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="h-4 w-4 text-[#B8965A]" />
              <h3 className="text-sm font-medium text-[#2C2C2C]">Outbound — March 11</h3>
            </div>
            <div className="space-y-2">
              <InfoRow icon={Plane} label="Flight" value="Delta DL 2574" />
              <InfoRow icon={MapPin} label="Route" value="MSP → SAV" />
              <InfoRow icon={Clock} label="Departure" value="10:00 AM CST" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="h-4 w-4 text-[#B8965A] rotate-180" />
              <h3 className="text-sm font-medium text-[#2C2C2C]">Return — March 17</h3>
            </div>
            <div className="space-y-2">
              <InfoRow icon={Plane} label="Flight" value="Delta DL 2574" />
              <InfoRow icon={MapPin} label="Route" value="SAV → MSP" />
              <InfoRow icon={Clock} label="Departure" value="1:31 PM EST" />
            </div>
          </div>
        </div>
      </section>

      {/* Accommodation */}
      <section>
        <SectionHeader>Accommodation</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
              <Building className="h-5 w-5 text-[#B8965A]" />
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-[#2C2C2C]">The Ford Field & River Club</h3>
              <p className="text-xs text-[#5C6B5E]">Private sporting club, 1,800 acres of Low Country</p>
            </div>
          </div>
          <a
            href="tel:+19127565666"
            className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px] active:bg-[#E8E4DD] transition-colors mt-3"
          >
            <Phone className="h-4 w-4 text-[#B8965A]" />
            <span className="text-sm text-[#2C2C2C]">(912) 756-5666</span>
          </a>
        </div>
      </section>

      {/* Key Events */}
      <section>
        <SectionHeader>Key Events</SectionHeader>
        <div className="space-y-2">
          <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-4 w-4 text-[#B8965A] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2C2C2C]">Dinner — Common Thread</p>
                <p className="text-xs text-[#5C6B5E]">March 14, 7:00 PM</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-[#B8965A] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2C2C2C]">Visiting Mike Sweeney</p>
                <p className="text-xs text-[#5C6B5E]">Dave&apos;s dad — winters in Savannah</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Savannah Guide Link */}
      <section>
        <SectionHeader>Full Savannah Guide</SectionHeader>
        <Link
          href="/s/savannah-march-2026"
          className="group flex items-center gap-4 rounded-2xl border border-[#B8965A]/20 bg-[#B8965A]/5 p-5 hover:bg-[#B8965A]/10 transition-colors active:bg-[#B8965A]/15"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
            <Compass className="h-6 w-6 text-[#B8965A]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-medium text-[#2C2C2C]">Welcome to Savannah</h3>
            <p className="text-xs text-[#5C6B5E] mt-0.5">Complete guide for Vienna, Dylan & Filippa — restaurants, activities, Ford amenities, baby tips</p>
          </div>
          <ExternalLink className="h-4 w-4 text-[#B8965A] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </Link>
        <p className="text-xs text-[#5C6B5E]/60 mt-2 px-1">Shareable link — no login required</p>
      </section>
    </div>
  );
}

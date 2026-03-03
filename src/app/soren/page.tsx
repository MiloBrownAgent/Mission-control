"use client";

import { useMemo } from "react";
import {
  Baby,
  Heart,
  Clock,
  Moon,
  Sun,
  Sunrise,
  Phone,
  UtensilsCrossed,
  Shield,
  Milestone,
  TrendingUp,
  Bath,
  Droplet,
  School,
} from "lucide-react";

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  const diffMs = now.getTime() - born.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  const weeks = Math.floor(diffDays / 7);
  const remainingDays = Math.floor(diffDays - months * 30.4375);
  return { months, days: remainingDays, totalDays: diffDays, weeks };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
      <Icon className="h-4 w-4 text-[#B8965A] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#5C6B5E]/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-[#2C2C2C]">{value}</p>
      </div>
    </div>
  );
}

export default function SorenPage() {
  const age = useMemo(() => getSorenAge(), []);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#5C6B5E]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5C6B5E]/10">
            <Baby className="h-7 w-7 text-[#5C6B5E]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Soren Sweeney
            </h1>
            <p className="text-sm text-[#5C6B5E]">Born June 21, 2025</p>
          </div>
        </div>

        {/* Age display */}
        <div className="mt-5 flex gap-3">
          <div className="rounded-xl bg-[#F7F4EF] border border-[#E8E4DD] px-4 py-3 text-center flex-1">
            <p className="text-3xl font-light text-[#B8965A]">{age.months}</p>
            <p className="text-[10px] text-[#5C6B5E]/60 mt-0.5 uppercase tracking-wider">months</p>
          </div>
          <div className="rounded-xl bg-[#F7F4EF] border border-[#E8E4DD] px-4 py-3 text-center flex-1">
            <p className="text-3xl font-light text-[#5C6B5E]">{age.days}</p>
            <p className="text-[10px] text-[#5C6B5E]/60 mt-0.5 uppercase tracking-wider">days</p>
          </div>
          <div className="rounded-xl bg-[#F7F4EF] border border-[#E8E4DD] px-4 py-3 text-center flex-1">
            <p className="text-3xl font-light text-[#5C6B5E]">{age.weeks}</p>
            <p className="text-[10px] text-[#5C6B5E]/60 mt-0.5 uppercase tracking-wider">weeks</p>
          </div>
        </div>
      </div>

      {/* Current Schedule */}
      <section>
        <SectionHeader>Current Schedule</SectionHeader>
        <div className="space-y-2">
          <InfoRow icon={Sunrise} label="Morning Nap" value="~9:00 AM — 45–90 min" />
          <InfoRow icon={Sun} label="Afternoon Nap" value="~1:00 PM — 45–90 min" />
          <InfoRow icon={Bath} label="Bath Time" value="6:15 PM" />
          <InfoRow icon={Droplet} label="Bottle" value="After bath" />
          <InfoRow icon={Moon} label="Bedtime Routine" value="Sleep sack \u2192 story in rocking chair \u2192 white noise \u2192 lights off \u2192 crib" />
          <InfoRow icon={Clock} label="In Crib By" value="6:45 PM" />
        </div>
      </section>

      {/* Feeding */}
      <section>
        <SectionHeader>Feeding</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="h-4 w-4 text-[#B8965A]" />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Current Diet</h3>
          </div>
          <p className="text-sm text-[#5C6B5E] leading-relaxed mb-4">
            Mix of breast milk, formula, and solids. Exploring new foods regularly.
          </p>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-red-500" />
              <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Avoid</p>
            </div>
            <p className="text-sm text-red-600">No honey, no whole milk, no added salt</p>
          </div>
        </div>
      </section>

      {/* Daycare */}
      <section>
        <SectionHeader>Daycare</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-2">
            <School className="h-4 w-4 text-[#B8965A]" />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Tierra Encantada — Hiawatha</h3>
          </div>
          <p className="text-sm text-[#5C6B5E]">Bilingual early childhood education</p>
        </div>
      </section>

      {/* Health */}
      <section>
        <SectionHeader>Health</SectionHeader>
        <a
          href="tel:+19529224200"
          className="flex items-center gap-3 rounded-2xl border border-[#E8E4DD] bg-[#F7F4EF] px-5 py-4 active:bg-[#E8E4DD] transition-colors min-h-[56px]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
            <Heart className="h-5 w-5 text-[#B8965A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2C2C2C]">Dr. Rebecca Mahady</p>
            <p className="text-xs text-[#5C6B5E]">Pediatric Services \u2022 (952) 922-4200</p>
            <p className="text-xs text-[#5C6B5E]/60">4700 Park Glen Rd, St. Louis Park MN 55416</p>
          </div>
          <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
        </a>
      </section>

      {/* Milestones */}
      <section>
        <SectionHeader>Milestones</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Milestone className="h-4 w-4 text-[#B8965A]" />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Achievements</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8965A]/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-[#B8965A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2C2C2C]">Pulled himself up</p>
                <p className="text-xs text-[#5C6B5E]/60">~February 24, 2026</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Growth (placeholder) */}
      <section>
        <SectionHeader>Growth</SectionHeader>
        <div className="rounded-2xl border border-dashed border-[#E8E4DD] bg-[#F7F4EF] p-8 text-center">
          <TrendingUp className="h-6 w-6 text-[#5C6B5E]/30 mx-auto mb-2" />
          <p className="text-sm text-[#5C6B5E]/60">Growth charts coming soon</p>
        </div>
      </section>
    </div>
  );
}

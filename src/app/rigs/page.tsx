"use client";

import {
  Dog,
  Clock,
  UtensilsCrossed,
  Footprints,
  Heart,
  Stethoscope,
  Phone,
  MapPin,
  Dumbbell,
  Gamepad2,
  Search,
} from "lucide-react";

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

const trainingCommands = [
  { command: "Sit", desc: "" },
  { command: "Wait", desc: "" },
  { command: "Off", desc: "Get off" },
  { command: "Down", desc: "Lay down" },
  { command: "Quiet", desc: "" },
  { command: "Back", desc: "Backup" },
  { command: "Spin", desc: "" },
  { command: "Twinkle Toes", desc: "" },
  { command: "Up", desc: "" },
  { command: "Side", desc: "Walk at right side" },
  { command: "Heel", desc: "Walk at left side" },
  { command: "NO!", desc: "Stop / Bad" },
  { command: "Middle", desc: "Goes between legs" },
];

export default function RigsPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#5C6B5E]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5C6B5E]/10">
            <Dog className="h-7 w-7 text-[#5C6B5E]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Rigs
            </h1>
            <p className="text-sm text-[#5C6B5E]">Lagotto Romagnolo</p>
            <p className="text-xs text-[#5C6B5E]/60 mt-0.5">Short for Rigatoni. Supreme floof.</p>
          </div>
        </div>
      </div>

      {/* Feeding */}
      <section>
        <SectionHeader>Feeding Schedule</SectionHeader>
        <div className="space-y-2">
          <InfoRow icon={UtensilsCrossed} label="Morning" value="1 cup kibble — 6:30 AM" />
          <InfoRow icon={UtensilsCrossed} label="Evening" value="1 cup kibble — 5:30 PM" />
        </div>
      </section>

      {/* Exercise */}
      <section>
        <SectionHeader>Exercise</SectionHeader>
        <div className="space-y-2">
          <InfoRow icon={Footprints} label="Walks" value="2x per day, 15–20 min each" />
          <InfoRow icon={Clock} label="Routine" value="Morning walk + evening walk" />
        </div>
      </section>

      {/* Veterinarian */}
      <section>
        <SectionHeader>Veterinarian</SectionHeader>
        <a
          href="tel:+17635354250"
          className="flex items-center gap-3 rounded-2xl border border-[#E8E4DD] bg-[#F7F4EF] px-5 py-4 active:bg-[#E8E4DD] transition-colors min-h-[56px]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
            <Stethoscope className="h-5 w-5 text-[#B8965A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2C2C2C]">Bass Lake Pet Hospital</p>
            <p className="text-xs text-[#5C6B5E]">Dr. Graham Engle</p>
            <p className="text-xs text-[#5C6B5E]">(763) 535-4250</p>
          </div>
          <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
        </a>
        <a
          href="https://basslakepethospital.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-2 px-5 text-xs text-[#5C6B5E] hover:text-[#B8965A] transition-colors"
        >
          <MapPin className="h-3 w-3" />
          <span>New Hope, MN — basslakepethospital.com</span>
        </a>
      </section>

      {/* Training Commands */}
      <section>
        <SectionHeader>Training Commands</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="h-4 w-4 text-[#B8965A]" />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Known Commands</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trainingCommands.map((cmd) => (
              <div
                key={cmd.command}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px]"
              >
                <span className="text-sm font-semibold text-[#2C2C2C]">{cmd.command}</span>
                {cmd.desc && (
                  <span className="text-xs text-[#5C6B5E]/70">— {cmd.desc}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section>
        <SectionHeader>Games</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-[#B8965A]" />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Find It!</h3>
          </div>
          <p className="text-sm text-[#5C6B5E] leading-relaxed">
            Hide some of his treats with him out of the room, then tell him &ldquo;Find it!&rdquo; and he will sniff the treats out.
          </p>
        </div>
      </section>
    </div>
  );
}

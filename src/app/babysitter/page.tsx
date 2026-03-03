"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Shield,
  Baby,
  Moon,
  UtensilsCrossed,
  Dog,
  Wifi,
  MapPin,
  Heart,
  AlertTriangle,
  Clock,
  Share2,
  Droplet,
  Bath,
  Link as LinkIcon,
  Check,
} from "lucide-react";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function PhoneRow({ name, number, sub }: { name: string; number: string; sub?: string }) {
  return (
    <a
      href={`tel:${number}`}
      className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[56px] active:bg-[#E8E4DD] transition-colors"
    >
      <Phone className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2C2C2C]">{name}</p>
        {sub && <p className="text-xs text-[#5C6B5E]/60">{sub}</p>}
      </div>
      <span className="text-sm text-[#B8965A] font-mono shrink-0">{number}</span>
    </a>
  );
}

export default function BabysitterPage() {
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    const shareUrl = "https://sweeney.family/s/babysitter";
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = shareUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-8">
      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 rounded-xl border border-[#E8E4DD] bg-white px-5 py-3 shadow-lg">
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#2C2C2C]">Link copied!</p>
          </div>
        </div>
      )}

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="w-full rounded-2xl border-2 border-[#B8965A]/30 bg-[#B8965A]/5 px-5 py-4 text-sm font-medium text-[#B8965A] flex items-center justify-center gap-3 min-h-[56px] active:bg-[#B8965A]/10 transition-colors"
      >
        <LinkIcon className="h-5 w-5" strokeWidth={1.5} />
        Share This Page
      </button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8965A]/10">
            <Baby className="h-7 w-7 text-[#B8965A]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#2C2C2C]">
              Babysitter Mode
            </h1>
            <p className="text-sm text-[#5C6B5E]">Everything you need to know</p>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <section>
        <SectionHeader>Emergency Contacts</SectionHeader>
        <div className="space-y-2">
          <PhoneRow name="Dave Sweeney" number="(952) 239-0143" sub="Dad" />
          <PhoneRow name="Amanda Sweeney" number="(916) 529-5298" sub="Mom" />
          <PhoneRow name="Dr. Rebecca Mahady" number="(952) 922-4200" sub="Pediatrician — Pediatric Services" />
          <PhoneRow name="Poison Control" number="(800) 222-1222" />
          <a href="tel:911" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 min-h-[56px] active:bg-red-100 transition-colors">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" strokeWidth={1.5} />
            <p className="text-sm font-medium text-red-700">911 — Emergency</p>
          </a>
        </div>
      </section>

      {/* Soren Bedtime Routine */}
      <section>
        <SectionHeader>Soren&apos;s Bedtime Routine</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Target: in crib by 6:45 PM</h3>
          </div>
          <div className="space-y-2">
            {[
              { time: "6:15 PM", icon: Bath, text: "Bath time" },
              { time: "6:25 PM", icon: Droplet, text: "Bottle after bath" },
              { time: "6:30 PM", icon: Clock, text: "Fill humidifier" },
              { time: "6:35 PM", icon: Baby, text: "Sleep sack on" },
              { time: "6:35 PM", icon: Heart, text: "Story in rocking chair" },
              { time: "6:40 PM", icon: Moon, text: "White noise on, all lights off" },
              { time: "6:45 PM", icon: Moon, text: "In crib — goodnight!" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px]">
                <span className="text-xs font-mono text-[#B8965A] shrink-0 w-14">{step.time}</span>
                <step.icon className="h-4 w-4 text-[#5C6B5E] shrink-0" strokeWidth={1.5} />
                <p className="text-sm text-[#2C2C2C]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feeding */}
      <section>
        <SectionHeader>Soren&apos;s Feeding</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Current Diet</h3>
          </div>
          <p className="text-sm text-[#5C6B5E] leading-relaxed mb-4">
            Mix of breast milk, formula, and solids. Exploring new foods regularly.
          </p>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-red-500" strokeWidth={1.5} />
              <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Avoid</p>
            </div>
            <p className="text-sm text-red-600">No honey, no whole milk, no added salt</p>
          </div>
        </div>
      </section>

      {/* Rigs */}
      <section>
        <SectionHeader>Rigs the Dog</SectionHeader>
        <div className="rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Dog className="h-4 w-4 text-[#B8965A]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#2C2C2C]">Lagotto Romagnolo</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px]">
              <UtensilsCrossed className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-[#2C2C2C]">Morning: 1 cup kibble — 6:30 AM</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3 min-h-[44px]">
              <UtensilsCrossed className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-[#2C2C2C]">Evening: 1 cup kibble — 5:30 PM</p>
            </div>
          </div>
          <p className="text-sm text-[#5C6B5E] mt-3">
            Key commands: Sit, Wait, Off, Down, Quiet. Treats are in the kitchen pantry.
          </p>
        </div>
      </section>

      {/* House Info */}
      <section>
        <SectionHeader>House Info</SectionHeader>
        <div className="space-y-2">
          <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <Wifi className="h-4 w-4 text-[#B8965A] shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-[#2C2C2C]">WiFi: BoxerFarmer1941</p>
                <p className="text-xs text-[#5C6B5E]">Password: Toni2Times</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-red-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-[#2C2C2C]">First Aid & LifeVac</p>
                <p className="text-xs text-[#5C6B5E]">Hallway closet, bottom floor</p>
              </div>
            </div>
          </div>
          <a
            href="https://maps.google.com/?q=3740+48th+Ave+S,+Minneapolis,+MN+55406"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] px-4 py-3.5 min-h-[52px] active:bg-[#E8E4DD] transition-colors"
          >
            <MapPin className="h-4 w-4 text-[#5C6B5E] shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-[#2C2C2C]">3740 48th Ave S</p>
              <p className="text-xs text-[#5C6B5E]">Minneapolis, MN 55406</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}

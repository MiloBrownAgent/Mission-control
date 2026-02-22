"use client";

import type { ReactNode } from "react";
import { ShieldAlert, Phone, MapPin, Wifi } from "lucide-react";

function PhoneLink({ number, display }: { number: string; display?: string }) {
  return (
    <a
      href={`tel:${number.replace(/\D/g, "")}`}
      className="inline-flex items-center gap-1.5 font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg px-3 py-1.5 transition-colors text-lg leading-none"
    >
      <Phone className="h-4 w-4 shrink-0" />
      {display ?? number}
    </a>
  );
}

function Section({
  icon,
  title,
  children,
  accent,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  accent?: "red" | "blue" | "green" | "purple" | "amber";
}) {
  const accentMap = {
    red: "border-red-500/40 bg-red-950/40",
    blue: "border-blue-500/30 bg-blue-950/30",
    green: "border-emerald-500/30 bg-emerald-950/30",
    purple: "border-purple-500/30 bg-purple-950/30",
    amber: "border-amber-500/30 bg-amber-950/20",
  };
  const titleMap = {
    red: "text-red-300",
    blue: "text-blue-300",
    green: "text-emerald-300",
    purple: "text-purple-300",
    amber: "text-amber-300",
  };
  const cls = accentMap[accent ?? "blue"];
  const titleCls = titleMap[accent ?? "blue"];
  return (
    <div className={`rounded-2xl border-2 p-6 ${cls}`}>
      <div className={`flex items-center gap-3 mb-5 ${titleCls}`}>
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3 py-2.5 border-b border-white/10 last:border-0">
      <span className="text-sm text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-base text-gray-200">
      <span className="mt-1 text-gray-500 shrink-0">›</span>
      <span>{children}</span>
    </li>
  );
}

function getLiveAge(dob: Date): string {
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());
  if (months < 1) {
    const days = Math.floor((now.getTime() - dob.getTime()) / 86400000);
    return `${days} days old`;
  }
  if (months < 12) {
    const days = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), dob.getMonth() + months, dob.getDate()).getTime()) / 86400000
    );
    return `${months}mo ${days}d old`;
  }
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}m old` : `${years} years old`;
}

export default function EmergencyPage() {
  const sorenDOB = new Date("2025-06-21");
  const age = getLiveAge(sorenDOB);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-950 via-red-900/60 to-transparent p-6">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/30">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Emergency Info</h1>
              <p className="text-red-300 text-sm mt-0.5">Sweeney Family</p>
            </div>
          </div>
          {/* Address — prominent for emergency services */}
          <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4">
            <p className="text-xs text-red-300 font-semibold uppercase tracking-widest mb-1">📍 Home Address</p>
            <p className="text-white text-2xl font-bold tracking-tight">3740 48th Ave S</p>
            <p className="text-white text-2xl font-bold tracking-tight">Minneapolis, MN 55406</p>
          </div>
        </div>
      </div>

      {/* SECTION 1 — Emergency Contacts */}
      <Section icon="🚨" title="Emergency Contacts" accent="red">
        <Row label="Fire / Police / Medical">
          <PhoneLink number="911" display="911" />
        </Row>
        <Row label="Dave (Dad)">
          <PhoneLink number="19522390143" display="(952) 239-0143" />
        </Row>
        <Row label="Amanda (Mom)">
          <PhoneLink number="19165295298" display="(916) 529-5298" />
        </Row>
        <Row label="Leah (neighbor)">
          <div className="space-y-0.5">
            <PhoneLink number="16122031975" display="(612) 203-1975" />
            <p className="text-gray-400 text-sm">Family friend next door</p>
          </div>
        </Row>
        <Row label="Poison Control">
          <PhoneLink number="18002221222" display="1-800-222-1222" />
        </Row>
        <Row label="Children's MN Hospital">
          <div className="space-y-1">
            <PhoneLink number="16128136100" display="(612) 813-6100" />
            <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              2525 Chicago Ave S, Minneapolis
            </div>
          </div>
        </Row>
        <Row label="Urgent Care">
          <div className="space-y-0.5">
            <span className="font-semibold text-white">Minute Clinic — Hiawatha</span>
            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              4040 E Lake St, Minneapolis
            </div>
          </div>
        </Row>
      </Section>

      {/* SECTION 2 — Soren's Info */}
      <Section icon="👶" title="Soren's Info" accent="blue">
        <Row label="Full name">
          <span className="text-white font-semibold text-lg">Soren Sweeney</span>
        </Row>
        <Row label="Date of birth">
          <span className="text-white font-semibold">June 21, 2025</span>
          <span className="ml-2 text-blue-300 text-sm">({age})</span>
        </Row>
        <Row label="Pediatrician">
          <div className="space-y-1">
            <span className="text-white font-semibold">Dr. Rebecca Mahady</span>
            <p className="text-gray-400 text-sm">Pediatric Services</p>
            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              4700 Park Glen Rd, St. Louis Park, MN 55416
            </div>
            <PhoneLink number="19529224200" display="(952) 922-4200" />
          </div>
        </Row>
        <Row label="Allergies">
          <span className="text-emerald-300 font-semibold">None known</span>
        </Row>
        <Row label="Feeding">
          <span className="text-white">Mix of breast milk, formula, and solids</span>
          <p className="text-red-300 text-sm mt-1 font-medium">⚠️ No honey · No whole milk · No added salt</p>
        </Row>
        <Row label="Bedtime routine">
          <ol className="text-white space-y-1 text-sm list-none">
            <li><span className="text-gray-400">6:15 PM</span> — Bath</li>
            <li>Bottle</li>
            <li>Fill humidifier</li>
            <li>Sleep sack</li>
            <li>Story time in arms — rocking chair</li>
            <li>White noise on · All lights off</li>
            <li>Into crib 🌙</li>
          </ol>
          <p className="text-blue-300 text-sm mt-2 font-medium">Target: in crib by 7:30 PM</p>
        </Row>
        <Row label="Nap schedule">
          <span className="text-white">2 naps/day — ~9 AM and ~1 PM (45–90 min each)</span>
        </Row>
      </Section>

      {/* SECTION 3 — Home Info */}
      <Section icon="🏠" title="Home Info" accent="green">
        <Row label="Address">
          <span className="text-white font-semibold">3740 48th Ave S, Minneapolis, MN 55406</span>
        </Row>
        <Row label="WiFi">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">BoxerFarmer1941</p>
              <p className="text-gray-400 text-sm">Password: <span className="text-white font-mono">Toni2Times</span></p>
            </div>
          </div>
        </Row>
        <Row label="First aid kit">
          <span className="text-white">Hallway closet, bottom floor — includes LifeVac</span>
        </Row>
        <Row label="Rigs (dog)">
          <span className="text-white">Lagotto Romagnolo. Very friendly 🐕 Food in pantry, leash by front door.</span>
        </Row>
      </Section>

      {/* SECTION 4 — Babysitter Notes */}
      <Section icon="📋" title="Babysitter Notes" accent="amber">
        <ul className="space-y-2.5 pl-1">
          <Note>Help yourself to anything in the kitchen 🍕</Note>
          <Note>Soren&apos;s bedtime routine is listed above — <strong>aim for crib by 7:30 PM</strong></Note>
          <Note>Rigs needs to go out every few hours — leash is by the front door</Note>
          <Note><span className="text-red-300 font-bold">🚫 Do NOT open the door to strangers</span></Note>
          <Note>Text Dave or Amanda if anything comes up — we respond fast 📱</Note>
          <Note>Leah next door is a trusted neighbor — knock if you need anything</Note>
        </ul>
      </Section>

      {/* Footer */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-600">🔒 Private — For household use only · Sweeney Family</p>
      </div>
    </div>
  );
}

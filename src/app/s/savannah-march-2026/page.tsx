"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Phone,
  TreePine,
  Landmark,
  UtensilsCrossed,
  Waves,
  Heart,
  Baby,
  Car,
  Flower2,
  Church,
  BookOpen,
  Sun,
  Shield,
  Send,
  Sparkles,
  Building,
  Clock,
  Navigation,
  Users,
  Flag,
  Shell,
  Mountain,
  Compass,
  CheckCircle,
  Loader2,
  Leaf,
  Wifi,
  Copy,
  Check,
  Cloud,
  CloudRain,
  CloudSun,
  Plane,
  Home,
  Camera,
  Upload,
  Download,
  X,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

/* ─── Dynamic Map Import (SSR disabled) ─── */
const SavannahMap = dynamic(() => import("./SavannahMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] rounded-2xl bg-[#F7F4EF] border border-[#E8E4DD] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-[#B8965A] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#5C6B5E]">Loading map…</p>
      </div>
    </div>
  ),
});

/* ─── Design tokens ─── */
const bg = "bg-[#FDFCFA]";
const bgAlt = "bg-[#F7F4EF]";
const textPrimary = "text-[#2C2C2C]";
const textSecondary = "text-[#5C6B5E]";
const borderColor = "border-[#E8E4DD]";

/* ─── Ford Field images ─── */
const IMAGES = {
  hero: "/savannah-hero.jpg",
  golf: "https://fordfieldandriverclub.com/wp-content/uploads/2025/05/ford-golf-course.jpg",
  mainHouse: "https://fordfieldandriverclub.com/wp-content/uploads/2021/06/gardens-lawn-large.jpg",
  marina: "https://fordfieldandriverclub.com/wp-content/uploads/2021/02/marina.jpg",
  equestrian: "https://fordfieldandriverclub.com/wp-content/uploads/2025/05/equestrian-homepage-3.jpg",
  aerial: "https://fordfieldandriverclub.com/wp-content/uploads/2022/03/DJI_0122-1024x683.jpg",
  oaks: "https://fordfieldandriverclub.com/wp-content/uploads/2025/05/div.col-6-10-1.jpg",
};

/* ─── Tab definitions ─── */
const TABS = [
  { id: "welcome", label: "Welcome", icon: Home },
  { id: "essentials", label: "Essentials", icon: Compass },
  { id: "dining", label: "Dining", icon: UtensilsCrossed },
  { id: "explore", label: "Explore", icon: TreePine },
  { id: "baby", label: "Baby Tips", icon: Baby },
  { id: "map", label: "Map", icon: MapPin },
  { id: "photos", label: "Photos", icon: Camera },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Weather types & fallback ─── */
interface WeatherDay {
  day: string;
  date: number;
  high: number;
  low: number;
  condition: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FORECAST_FALLBACK: WeatherDay[] = [
  { day: "Wed", date: 12, high: 71, low: 52, condition: "Sunny", icon: Sun },
  { day: "Thu", date: 13, high: 69, low: 51, condition: "Partly Cloudy", icon: CloudSun },
  { day: "Fri", date: 14, high: 72, low: 54, condition: "Sunny", icon: Sun },
  { day: "Sat", date: 15, high: 70, low: 53, condition: "Partly Cloudy", icon: CloudSun },
  { day: "Sun", date: 16, high: 67, low: 48, condition: "Scattered Showers", icon: CloudRain },
];

/* ─── WMO code → condition/icon ─── */
function wmoToCondition(code: number): {
  condition: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  if (code === 0) return { condition: "Clear", icon: Sun };
  if (code === 1 || code === 2) return { condition: "Mostly Clear", icon: CloudSun };
  if (code === 3) return { condition: "Overcast", icon: Cloud };
  if (code === 45 || code === 48) return { condition: "Foggy", icon: Cloud };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return { condition: "Rain", icon: CloudRain };
  return { condition: "Partly Cloudy", icon: CloudSun };
}

/* ─── Scroll animation hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => {
      observer.unobserve(node);
    };
  }, []);

  return { ref, isVisible };
}

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function PhoneButton({
  number,
  label,
  icon: Icon,
}: {
  number: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const IconComponent = Icon || Phone;
  return (
    <a
      href={`tel:${number}`}
      className={`flex items-center gap-3 rounded-2xl border ${borderColor} ${bgAlt} px-5 py-4 active:bg-[#E8E4DD] transition-colors min-h-[56px]`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8965A]/10 shrink-0">
        <IconComponent className="h-5 w-5 text-[#B8965A]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
        <p className="text-xs text-[#5C6B5E]">{number}</p>
      </div>
      <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
    </a>
  );
}

function MapButton({ address, label }: { address: string; label: string }) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-2xl border ${borderColor} ${bgAlt} px-5 py-4 active:bg-[#E8E4DD] transition-colors min-h-[56px]`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
        <Navigation className="h-5 w-5 text-[#5C6B5E]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
        <p className="text-xs text-[#5C6B5E]">{address}</p>
      </div>
      <MapPin className="h-4 w-4 text-[#5C6B5E] shrink-0" />
    </a>
  );
}

function InfoCard({
  title,
  children,
  icon: Icon,
  image,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  image?: string;
}) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bg} overflow-hidden`}>
      {image && (
        <div className="w-full h-48 md:h-56 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8965A]/10">
            <Icon className="h-4 w-4 text-[#B8965A]" />
          </div>
          <h3 className={`font-medium ${textPrimary} text-[15px]`}>{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Restaurant Card ─── */
function RestaurantCard({
  name,
  address,
  phone,
  desc,
  reservation,
  kidNote,
  icon: Icon = UtensilsCrossed,
  iconBg = "bg-[#C07A1A]/10",
  iconColor = "text-[#C07A1A]",
}: {
  name: string;
  address: string;
  phone: string;
  desc: string;
  reservation: string;
  kidNote: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bgAlt} p-5`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shrink-0 mt-0.5`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium ${textPrimary}`}>{name}</p>
          <p className={`text-sm ${textSecondary} mt-1.5 leading-relaxed`}>{desc}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DD] bg-white px-3 py-2 text-xs text-[#2C2C2C] active:bg-[#E8E4DD] transition-colors min-h-[36px]"
            >
              <Phone className="h-3 w-3 text-[#B8965A]" />
              {phone}
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DD] bg-white px-3 py-2 text-xs text-[#2C2C2C] active:bg-[#E8E4DD] transition-colors min-h-[36px]"
            >
              <MapPin className="h-3 w-3 text-[#5C6B5E]" />
              {address}
            </a>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#B8965A]/10 px-2.5 py-1 text-[11px] text-[#B8965A] font-medium">
              <Clock className="h-3 w-3" />
              {reservation}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#5C6B5E]/10 px-2.5 py-1 text-[11px] text-[#5C6B5E] font-medium">
              <Baby className="h-3 w-3" />
              {kidNote}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Weather Forecast ─── */
function WeatherForecast({
  forecast,
  loading,
}: {
  forecast: WeatherDay[];
  loading: boolean;
}) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bg} p-5 overflow-hidden`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8965A]/10">
          <Sun className="h-4 w-4 text-[#B8965A]" />
        </div>
        <h3 className={`font-medium ${textPrimary} text-[15px]`}>
          Savannah Weather — March 12–16
        </h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`rounded-xl border ${borderColor} ${bgAlt} p-3 text-center animate-pulse`}
            >
              <div className="h-3 bg-[#E8E4DD] rounded mb-2 mx-1" />
              <div className="h-6 w-6 bg-[#E8E4DD] rounded-full mx-auto my-2" />
              <div className="h-4 bg-[#E8E4DD] rounded mb-1 mx-3" />
              <div className="h-3 bg-[#E8E4DD] rounded mb-1 mx-4" />
              <div className="h-2 bg-[#E8E4DD] rounded mt-1 mx-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {forecast.map((day) => {
            const WeatherIcon = day.icon;
            return (
              <div
                key={`${day.day}-${day.date}`}
                className={`rounded-xl border ${borderColor} ${bgAlt} p-3 text-center`}
              >
                <p className={`text-xs font-medium ${textPrimary}`}>
                  {day.day} {day.date}
                </p>
                <WeatherIcon className="h-6 w-6 text-[#B8965A] mx-auto my-2" />
                <p className={`text-sm font-medium ${textPrimary}`}>{day.high}°</p>
                <p className="text-xs text-[#5C6B5E]/60">{day.low}°</p>
                <p className="text-[10px] text-[#5C6B5E]/50 mt-1 leading-tight">
                  {day.condition}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-[#5C6B5E]/40 mt-3 text-right">Updated live</p>
    </div>
  );
}

/* ─── WiFi Card ─── */
function WifiCard() {
  const [copied, setCopied] = useState(false);
  const password = "TopDawg2019";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = password;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-2xl border-2 border-[#B8965A]/30 ${bg} p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/[0.06] blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B8965A]/10 shrink-0">
          <Wifi className="h-6 w-6 text-[#B8965A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${textSecondary} mb-1`}>
            WiFi
          </p>
          <p
            className={`text-lg font-medium ${textPrimary} font-[family-name:var(--font-display)]`}
          >
            Belted King
          </p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-[#5C6B5E] font-mono tracking-wide">{password}</p>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all min-h-[36px] ${
                copied
                  ? "border-[#5C6B5E]/30 bg-[#5C6B5E]/10 text-[#5C6B5E]"
                  : "border-[#B8965A]/30 bg-[#B8965A]/10 text-[#B8965A] active:bg-[#B8965A]/20"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Baby Essentials Card ─── */
function BabyEssentialsCard() {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bg} p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#5C6B5E]/[0.04] blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5C6B5E]/10 shrink-0">
          <Baby className="h-6 w-6 text-[#5C6B5E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.2em] ${textSecondary} mb-1`}
          >
            For Filippa
          </p>
          <p className={`text-[15px] font-medium ${textPrimary}`}>Baby essentials are ready</p>
          <p className={`text-sm ${textSecondary} mt-2 leading-relaxed`}>
            A crib (pack and play) and baby monitor will be set up and waiting when you arrive.
            One less thing to pack, one less thing to think about. We&apos;ve also got a box of
            size 2 diapers waiting for Filippa.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Airport Pickup Card ─── */
function AirportPickupCard() {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bg} p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/[0.04] blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B8965A]/10 shrink-0">
          <Plane className="h-6 w-6 text-[#B8965A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.2em] ${textSecondary} mb-1`}
          >
            Airport Pickup
          </p>
          <p className={`text-[15px] font-medium ${textPrimary}`}>
            We&apos;ve got you at the airport
          </p>
          <p className={`text-sm ${textSecondary} mt-2 leading-relaxed`}>
            Your flight lands at 11:46 AM on Wednesday — we&apos;ll be there. SAV is a small
            airport, so we&apos;ll meet you right at baggage claim.
          </p>
          <p className={`text-sm ${textSecondary} mt-2`}>
            Text Dave if the flight&apos;s delayed:{" "}
            <a href="tel:+19522390143" className="text-[#B8965A] font-medium hover:underline">
              +1 (952) 239-0143
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E8E4DD] mb-5">
      <img src={src} alt={alt} className="w-full h-48 md:h-64 object-cover" />
    </div>
  );
}

/* ─── Tab Content Components ─── */

function WelcomeTab({
  forecast,
  weatherLoading,
  formData,
  setFormData,
  formState,
  handleSubmit,
}: {
  forecast: WeatherDay[];
  weatherLoading: boolean;
  formData: { coffee: string; dietary: string; breakfast: string; activities: string; other: string };
  setFormData: React.Dispatch<React.SetStateAction<{ coffee: string; dietary: string; breakfast: string; activities: string; other: string }>>;
  formState: "idle" | "sending" | "sent" | "error";
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {/* Personal Note */}
      <AnimatedSection>
        <div className="bg-[#F7F4EF] border border-[#E8E4DD] rounded-2xl p-6">
          <p className="font-[family-name:var(--font-display)] text-[#2C2C2C] text-[16px] leading-relaxed italic">
            So pumped you guys are coming. Zero agenda — just hanging out, eating well, and
            watching our kids lose their minds on the lawn. Everything you need is in here.
            See y&apos;all soon.
          </p>
          <p className="text-[#B8965A] text-sm mt-4 tracking-wide">— D &amp; A</p>
        </div>
      </AnimatedSection>

      {/* Live Weather */}
      <AnimatedSection>
        <WeatherForecast forecast={forecast} loading={weatherLoading} />
      </AnimatedSection>

      {/* Airport Pickup */}
      <AnimatedSection>
        <AirportPickupCard />
      </AnimatedSection>

      {/* Flights */}
      <AnimatedSection>
        <div className={`rounded-2xl border ${borderColor} ${bg} p-5 space-y-3`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6B5E]/10">
              <Plane className="h-4 w-4 text-[#5C6B5E]" />
            </div>
            <h3 className={`font-medium ${textPrimary} text-[15px]`}>Your Flights</h3>
          </div>
          <div className="grid gap-2">
            <div className={`rounded-xl border ${borderColor} ${bgAlt} p-4`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#5C6B5E] mb-1">
                Arriving
              </p>
              <p className={`font-medium ${textPrimary} text-[14px]`}>
                DL 2574 — MSP → SAV
              </p>
              <p className="text-sm text-[#5C6B5E] mt-1">
                Wed, March 12 · 9:00 AM – 11:46 AM
              </p>
            </div>
            <div className={`rounded-xl border ${borderColor} ${bgAlt} p-4`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#5C6B5E] mb-1">
                Departing
              </p>
              <p className={`font-medium ${textPrimary} text-[14px]`}>
                DL 2574 — SAV → MSP
              </p>
              <p className="text-sm text-[#5C6B5E] mt-1">
                Sun, March 16 · 12:31 PM – 3:39 PM
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* WiFi */}
      <AnimatedSection>
        <WifiCard />
      </AnimatedSection>

      {/* Address */}
      <AnimatedSection>
        <a
          href="https://www.google.com/maps/search/?api=1&query=35+Belted+Kingfisher+Ln+Richmond+Hill+GA+31324"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white border border-[#E8E4DD] rounded-xl p-4 hover:border-[#B8965A] transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#B8965A]/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#B8965A]" />
          </div>
          <div>
            <p className="text-[#2C2C2C] font-medium text-[15px]">35 Belted Kingfisher Ln</p>
            <p className="text-[#8A7E72] text-sm">Richmond Hill, GA 31324 — Tap for directions</p>
          </div>
        </a>
      </AnimatedSection>

      {/* Baby Essentials */}
      <AnimatedSection>
        <BabyEssentialsCard />
      </AnimatedSection>

      {/* Preferences Form */}
      <AnimatedSection>
        {formState === "sent" ? (
          <div className={`rounded-2xl border ${borderColor} ${bgAlt} p-6 text-center`}>
            <CheckCircle className="h-8 w-8 text-[#5C6B5E] mx-auto mb-3" />
            <p className={`font-medium ${textPrimary} text-[15px]`}>Got it — thank you!</p>
            <p className={`text-sm ${textSecondary} mt-1`}>
              We&apos;ll make sure everything&apos;s ready.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E8C4C4]/40 bg-[#FDF2F0] p-6 space-y-5"
          >
            <div>
              <h2 className="text-xl font-light font-[family-name:var(--font-display)] text-[#2C2C2C] tracking-wide">
                Help us get things ready
              </h2>
              <p className={`text-sm ${textSecondary} mt-1`}>
                A few quick things so the fridge is stocked and the coffee is right.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}
                >
                  How do you take your coffee?
                </label>
                <input
                  type="text"
                  placeholder="Black, oat milk latte, don't drink coffee..."
                  value={formData.coffee}
                  onChange={(e) => setFormData({ ...formData, coffee: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}
                >
                  Any dietary restrictions or allergies?
                </label>
                <input
                  type="text"
                  placeholder="None, vegetarian, gluten-free..."
                  value={formData.dietary}
                  onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}
                >
                  What would you love for breakfast?
                </label>
                <input
                  type="text"
                  placeholder="Yogurt, eggs, fruit, pastries..."
                  value={formData.breakfast}
                  onChange={(e) => setFormData({ ...formData, breakfast: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}
                >
                  Anything you&apos;re especially hoping to do?
                </label>
                <input
                  type="text"
                  placeholder="Golf, spa, explore downtown Savannah..."
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}
                >
                  Anything else we should know?
                </label>
                <textarea
                  placeholder="Filippa's schedule, things you're bringing, whatever..."
                  value={formData.other}
                  onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  rows={3}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors resize-none`}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formState === "sending"}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#5C6B5E] text-white py-3.5 text-sm font-medium hover:bg-[#4A5A4C] active:bg-[#3F4E41] transition-colors disabled:opacity-60 min-h-[48px]"
            >
              {formState === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </form>
        )}
      </AnimatedSection>
    </div>
  );
}

function EssentialsTab() {
  return (
    <div className="space-y-10">
      {/* Essential Contacts */}
      <AnimatedSection>
        <section>
          <SectionHeader>Essential Contacts</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PhoneButton number="+1 (952) 239-0143" label="Dave Sweeney" icon={Users} />
            <PhoneButton number="+1 (916) 529-5298" label="Amanda Sweeney" icon={Users} />
            <PhoneButton
              number="+1 (912) 756-5666"
              label="Ford Field & River Club — Main"
              icon={Building}
            />
            <PhoneButton number="+1 (912) 756-5666" label="Ford Pro Shop" icon={Flag} />
            <PhoneButton number="+1 (912) 756-5666" label="Ford Spa" icon={Sparkles} />
            <PhoneButton
              number="+1 (912) 412-0001"
              label="Jimmy — Driver if needed"
              icon={Car}
            />
            <PhoneButton
              number="+1 (912) 691-2424"
              label="Pediatric Associates of Savannah"
              icon={Shield}
            />
            <PhoneButton number="+1 (912) 350-8000" label="Memorial Health ER" icon={Shield} />
          </div>
        </section>
      </AnimatedSection>

      {/* Ford Field & River Club */}
      <AnimatedSection>
        <section>
          <SectionHeader>The Ford Field &amp; River Club</SectionHeader>
          <InfoCard title="History & Heritage" icon={Landmark} image={IMAGES.mainHouse}>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                In 1917, Henry Ford and his wife Clara purchased land along the banks of the
                Ogeechee River outside Savannah. What began as a private winter retreat became one
                of the most storied properties in the American South.
              </p>
              <p>
                The Main House, built in the Georgian Revival style, served as the Fords&apos;
                seasonal residence. Henry hosted Thomas Edison and Harvey Firestone here during
                their famous road trips. The property is listed on the National Register of
                Historic Places.
              </p>
              <p>
                Today, Ford Field &amp; River Club operates as a private sporting club set across
                1,800 acres of pristine Low Country landscape. The property holds Audubon
                International certification for its environmental stewardship.
              </p>
            </div>
          </InfoCard>
        </section>
      </AnimatedSection>

      {/* On-Property Amenities */}
      <AnimatedSection>
        <section>
          <SectionHeader>On-Property Amenities</SectionHeader>
          <div className="space-y-3">
            <InfoCard title="Pete Dye Golf Course" icon={Flag} image={IMAGES.golf}>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                A stunning Pete Dye-designed course spanning 250 acres of the property. No tee
                times required — simply arrive and play. One of the most exclusive layouts in the
                Southeast, shaped by freshwater lakes, lush meadows, and scenic coastline.
              </p>
            </InfoCard>

            <SectionImage src={IMAGES.marina} alt="Ford Field Marina" />

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Spa & Wellness", icon: Sparkles, desc: "Full-service spa" },
                { name: "Marina", icon: Waves, desc: "36-slip deepwater" },
                { name: "Equestrian Center", icon: Mountain, desc: "22-stall, 10mi trails" },
                { name: "Clubhouse", icon: Building, desc: "Dining & social" },
                { name: "Oyster House", icon: Shell, desc: "Waterfront raw bar" },
                { name: "Naturalist Center", icon: TreePine, desc: "Wildlife programs" },
                { name: "Sports Barn & Pool", icon: Flag, desc: "Indoor recreation" },
                { name: "Great Lawn", icon: Leaf, desc: "Events & gathering" },
              ].map((amenity) => (
                <div
                  key={amenity.name}
                  className={`rounded-2xl border ${borderColor} ${bgAlt} p-4 min-h-[80px] flex flex-col justify-between`}
                >
                  <amenity.icon className="h-5 w-5 text-[#B8965A]" />
                  <div className="mt-2">
                    <p className={`text-sm font-medium ${textPrimary}`}>{amenity.name}</p>
                    <p className="text-xs text-[#5C6B5E]/60">{amenity.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}

function DiningTab() {
  return (
    <div className="space-y-10">
      <AnimatedSection>
        <section>
          <SectionHeader>Savannah Dining</SectionHeader>

          <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-3`}>
            Fine Dining &amp; Special Occasions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            <RestaurantCard
              name="The Olde Pink House"
              address="23 Abercorn St, Savannah, GA"
              phone="(912) 232-4286"
              desc="18th-century mansion. Southern fine dining at its best. Dinner only."
              reservation="Phone reservations"
              kidNote="Fine dining but spacious — babies okay early dinner"
            />
            <RestaurantCard
              name="The Grey"
              address="109 MLK Jr Blvd, Savannah, GA"
              phone="(912) 662-5999"
              desc="James Beard Award-winning restaurant in a restored 1938 Greyhound bus terminal. One of the best in the South."
              reservation="Resy"
              kidNote="Upscale but accommodating — doable with babies at brunch"
            />
            <RestaurantCard
              name="Husk Savannah"
              address="12 W Oglethorpe Ave, Savannah, GA 31401"
              phone="(912) 349-2600"
              desc="Chef Sean Brock's modern Southern cuisine in an 1890s building on Oglethorpe Square. Changing menu celebrates Low Country ingredients."
              reservation="Resy"
              kidNote="Upscale — better as a date night if you can get a sitter"
            />
            <RestaurantCard
              name="Common Thread"
              address="122 E 37th St, Savannah, GA 31401"
              phone="(912) 944-7482"
              desc="New American with Southern roots. Intimate, thoughtful menu — one of Savannah's best kept secrets. We have a reservation here Friday the 14th."
              reservation="Reservations recommended"
              kidNote="Intimate space — best enjoyed without the little ones"
            />
          </div>

          <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-3`}>
            Casual &amp; Family-Friendly
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            <RestaurantCard
              name="Mrs. Wilkes' Dining Room"
              address="107 W Jones St, Savannah, GA"
              phone="(912) 232-5997"
              desc="Legendary boarding house-style lunch. Communal tables, fried chicken, collard greens. Cash only."
              reservation="Walk-in only (expect a line)"
              kidNote="Family-style — very kid-friendly"
            />
            <RestaurantCard
              name="Treylor Park"
              address="115 E Bay St, Savannah, GA"
              phone="(912) 495-5557"
              desc="Creative Southern comfort. Great cocktails. Casual but excellent."
              reservation="Walk-ins + some reservations"
              kidNote="Very casual — great with kids"
            />
            <RestaurantCard
              name="The Pirates' House"
              address="20 E Broad St, Savannah, GA"
              phone="(912) 233-5757"
              desc="Historic tavern since 1753. Fun atmosphere, solid seafood."
              reservation="Reservations accepted"
              kidNote="Very kid-friendly, touristy but fun"
            />
            <RestaurantCard
              name="Little Duck Diner"
              address="102 E Broad St, Savannah, GA"
              phone="(912) 235-7809"
              desc="Elevated diner fare. Brunch favorite. Charming, compact."
              reservation="Walk-in"
              kidNote="Very casual, baby-friendly"
            />
            <RestaurantCard
              name="Huey's on the River"
              address="115 E River St, Savannah, GA"
              phone="(912) 234-7385"
              desc="New Orleans-style on River Street. Beignets and views."
              reservation="Reservations accepted"
              kidNote="Casual waterfront — kid-friendly"
            />
          </div>

          <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-3`}>
            Waterfront &amp; Outdoor
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RestaurantCard
              name="The Wyld Dock Bar"
              address="2740 Livingston Ave, Savannah, GA 31404"
              phone="(912) 692-1219"
              desc="Casual waterfront spot on the marsh — outdoor seating with incredible views. Seafood, craft cocktails, live music sometimes. Perfect for a laid-back afternoon."
              reservation="No reservations"
              kidNote="Spacious outdoor layout — very baby-friendly"
              icon={Waves}
              iconBg="bg-[#5C6B5E]/10"
              iconColor="text-[#5C6B5E]"
            />
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}

function ExploreTab() {
  return (
    <div className="space-y-10">
      {/* Things to Do */}
      <AnimatedSection>
        <section>
          <SectionHeader>Things to Do</SectionHeader>
          <div className="space-y-3">
            {[
              {
                name: "Forsyth Park",
                desc: "Savannah\u2019s crown jewel. 30 acres of live oaks, the iconic fountain, and a Saturday farmers market. Perfect for a stroller walk.",
                address: "Forsyth Park, Savannah, GA",
                icon: TreePine,
              },
              {
                name: "The Squares",
                desc: "Wander through Savannah\u2019s 22 historic squares. Each one is different. Highlights: Chippewa, Monterey, Madison, and Lafayette.",
                address: "Chippewa Square, Savannah, GA",
                icon: Compass,
              },
              {
                name: "River Street",
                desc: "Nine blocks of shops, galleries, and restaurants along the Savannah River on restored cotton warehouses. Cobblestone — watch the stroller wheels.",
                address: "River Street, Savannah, GA",
                icon: Waves,
              },
              {
                name: "Wormsloe Historic Site",
                desc: "A mile-long avenue of 400+ live oaks draped in Spanish moss. One of the most photographed spots in the South. Colonial estate ruins at the end.",
                address: "Wormsloe Historic Site, Savannah, GA",
                icon: TreePine,
              },
              {
                name: "Bonaventure Cemetery",
                desc: "Hauntingly beautiful Victorian cemetery on a bluff over the Wilmington River. Made famous by Midnight in the Garden of Good and Evil.",
                address: "Bonaventure Cemetery, Savannah, GA",
                icon: Flower2,
              },
              {
                name: "SCAD Museum of Art",
                desc: "Contemporary art museum housed in a stunning 1853 railroad building. World-class rotating exhibitions.",
                address: "SCAD Museum of Art, Savannah, GA",
                icon: Sparkles,
              },
              {
                name: "Cathedral of St. John the Baptist",
                desc: "French Gothic cathedral built in 1876. Breathtaking stained glass and soaring spires. Free to visit.",
                address: "Cathedral of St. John the Baptist, Savannah, GA",
                icon: Church,
              },
              {
                name: "Leopold\u2019s Ice Cream",
                desc: "Iconic Savannah ice cream shop since 1919. Always a line, always worth it. Try the Tutti Frutti or Lemon Custard.",
                address: "Leopold's Ice Cream, 212 E Broughton St, Savannah, GA",
                icon: Heart,
              },
              {
                name: "Tybee Island Beach",
                desc: "Just 20 minutes east of Savannah. Wide, sandy beach perfect for a relaxed morning or afternoon. Tybee Island Light Station \u2014 one of the tallest in America \u2014 is worth a visit. Laid-back beach town with casual seafood spots. Very baby-friendly \u2014 bring sunscreen, a pop-up tent, and enjoy the waves.",
                address: "Tybee Island, GA",
                icon: Sun,
              },
            ].map((place) => (
              <a
                key={place.name}
                href={`https://maps.google.com/?q=${encodeURIComponent(place.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-2xl border ${borderColor} ${bgAlt} p-5 active:bg-[#E8E4DD] transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0 mt-0.5">
                    <place.icon className="h-5 w-5 text-[#5C6B5E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-medium ${textPrimary}`}>{place.name}</p>
                    <p className={`text-sm ${textSecondary} mt-1.5 leading-relaxed`}>
                      {place.desc}
                    </p>
                    <p className="text-xs text-[#5C6B5E]/60 flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />
                      Open in Maps
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* Live Oaks & Spanish Moss */}
      <AnimatedSection>
        <section>
          <SectionHeader>The Live Oaks &amp; Spanish Moss</SectionHeader>
          <SectionImage src={IMAGES.oaks} alt="Live oaks draped in Spanish moss" />
          <div className={`rounded-2xl border ${borderColor} ${bg} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6B5E]/10">
                <TreePine className="h-4 w-4 text-[#5C6B5E]" />
              </div>
              <h3 className={`font-medium ${textPrimary} text-[15px]`}>
                A Landscape Unlike Anywhere Else
              </h3>
            </div>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                Nothing prepares you for the live oaks. <em>Quercus virginiana</em> — massive,
                ancient trees with sprawling horizontal branches that reach impossibly wide, some
                of them centuries old. Their canopies are so broad they create cathedral-like
                spaces beneath, filtering the Georgia sun into dappled pools of light.
              </p>
              <p>
                And from every branch hangs Spanish moss — silvery-grey curtains of{" "}
                <em>Tillandsia usneoides</em>, swaying in the slightest breeze. Despite the name,
                it&apos;s not actually moss. It&apos;s an epiphytic bromeliad, an air plant that
                drapes itself on branches without harming the tree. It draws moisture and nutrients
                from the air alone. When the light catches it just right — early morning, golden
                hour — the effect is almost otherworldly.
              </p>
              <p>
                The most iconic avenue is at <strong>Wormsloe Historic Site</strong>: a mile-long
                tunnel of 400+ live oaks dripping with moss, one of the most photographed spots in
                the American South. But you&apos;ll find them everywhere — canopying the squares of
                downtown Savannah, arching over the paths at Forsyth Park, standing sentinel at
                Bonaventure Cemetery, and all across the Ford property itself.
              </p>
              <p className="text-[#B8965A] italic">
                The dappled light through moss-draped oaks is the visual signature of the Low
                Country. Once you see it in person, you&apos;ll understand why people fall in love
                with this place.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: "Wormsloe Historic Site", note: "The famous mile-long oak avenue" },
                { name: "Forsyth Park", note: "30 acres of canopied paths" },
                { name: "Bonaventure Cemetery", note: "Hauntingly beautiful oak alleys" },
                { name: "The Ford Property", note: "1,800 acres of ancient oaks" },
              ].map((spot) => (
                <div key={spot.name} className={`rounded-xl border ${borderColor} ${bgAlt} px-4 py-3`}>
                  <p className={`text-sm font-medium ${textPrimary}`}>{spot.name}</p>
                  <p className="text-xs text-[#5C6B5E]/60">{spot.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Peak Azalea Season */}
      <AnimatedSection>
        <section>
          <SectionHeader>Peak Azalea Season</SectionHeader>
          <div className={`rounded-2xl border ${borderColor} ${bg} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8965A]/10">
                <Flower2 className="h-4 w-4 text-[#B8965A]" />
              </div>
              <h3 className={`font-medium ${textPrimary} text-[15px]`}>The City in Bloom</h3>
            </div>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                Mid-March is peak azalea season in Savannah. The entire city erupts in color —
                pinks, whites, reds, and purples lining every square and garden path. Forsyth Park
                and Bonaventure Cemetery are especially stunning this time of year.
              </p>
              <p className="text-[#B8965A] italic">
                You&apos;re coming at one of the most beautiful times to visit.
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Savannah History */}
      <AnimatedSection>
        <section>
          <SectionHeader>A Brief History of Savannah</SectionHeader>
          <InfoCard title="The Hostess City" icon={BookOpen}>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                Founded in 1733 by General James Oglethorpe, Savannah was the first city in the
                Colony of Georgia and one of the first planned cities in North America.
                Oglethorpe&apos;s famous grid of public squares — 22 of which survive today —
                remains one of the most celebrated examples of urban planning in the world.
              </p>
              <p>
                During the Civil War, General William Tecumseh Sherman completed his devastating
                March to the Sea in Savannah. Rather than burn the city, he famously presented it
                to President Lincoln as a Christmas gift in December 1864, sparing its architecture
                and charm.
              </p>
              <p>
                Today, Savannah&apos;s Historic District is the largest National Historic Landmark
                District in the United States. The city&apos;s cobblestone streets, live oaks
                draped in Spanish moss, and antebellum architecture make it one of the most
                beautiful cities in America.
              </p>
            </div>
          </InfoCard>
        </section>
      </AnimatedSection>
    </div>
  );
}

function BabyTipsTab() {
  return (
    <div className="space-y-10">
      <AnimatedSection>
        <section>
          <SectionHeader>Traveling with Baby</SectionHeader>
          <div className="space-y-3">
            <InfoCard title="March Weather" icon={Sun}>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                Expect highs of 65–72°F with mild humidity. Pack light layers and a sun hat for
                Filippa. Evenings can dip into the mid-50s.
              </p>
            </InfoCard>

            <InfoCard title="Baby-Friendly Spots" icon={Heart}>
              <div className={`text-sm ${textSecondary} leading-relaxed space-y-2`}>
                <p>
                  <strong>Forsyth Park</strong> — Wide, flat paths perfect for strollers. Shaded
                  benches everywhere. Saturday farmers market is fun with babies.
                </p>
                <p>
                  <strong>The Wyld Dock Bar</strong> — Spacious outdoor layout on the marsh.
                  Relaxed vibe, easy with babies.
                </p>
                <p>
                  <strong>Tybee Island Beach</strong> — Wide sandy beach, calm waves. Bring a
                  pop-up tent for shade.
                </p>
                <p>
                  <strong>Leopold&apos;s Ice Cream</strong> — Quick stop, always a treat. The
                  line moves fast.
                </p>
                <p>
                  <strong>River Street</strong> — Fun to walk but cobblestone can be rough on
                  strollers. Stick to the upper level walkway where possible.
                </p>
              </div>
            </InfoCard>

            <InfoCard title="Stroller Tips" icon={Navigation}>
              <div className={`text-sm ${textSecondary} leading-relaxed space-y-2`}>
                <p>
                  Savannah is very walkable but some surfaces are tricky. The historic district
                  has a mix of brick sidewalks, cobblestone, and paved paths.
                </p>
                <p>
                  <strong>Best for strollers:</strong> Forsyth Park paths, the squares (paved
                  crossings), Broughton Street shopping district.
                </p>
                <p>
                  <strong>Trickier:</strong> River Street cobblestones, some narrow sidewalks in
                  the Historic District. A lightweight, maneuverable stroller is your friend here.
                </p>
              </div>
            </InfoCard>

            <div className="space-y-2">
              <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-2`}>
                Emergency Pediatric Care
              </p>
              <PhoneButton
                number="+1 (912) 691-2424"
                label="Pediatric Associates of Savannah"
                icon={Baby}
              />
              <PhoneButton
                number="+1 (912) 350-8000"
                label="Memorial Health — Emergency"
                icon={Shield}
              />
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}

function MapTab() {
  return (
    <div className="space-y-6">
      <AnimatedSection>
        <section>
          <SectionHeader>Savannah — All Locations</SectionHeader>
          <SavannahMap />
        </section>
      </AnimatedSection>
    </div>
  );
}

/* ─── Photos Tab ─── */

interface Photo {
  name: string;
  path: string;
  size: number;
  modified: string;
  thumbnailUrl: string | null;
}

interface UploadStatus {
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
}

function parsePhotoMeta(name: string): { uploader: string; date: string } {
  // Format: [name]-[timestamp]-[original filename]
  const parts = name.split("-");
  if (parts.length >= 3) {
    const uploaderRaw = parts[0];
    const tsRaw = parts[1];
    const uploader = uploaderRaw.replace(/_/g, " ");
    const ts = parseInt(tsRaw, 10);
    if (!isNaN(ts) && ts > 1000000000000) {
      const date = new Date(ts);
      return {
        uploader,
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    }
  }
  return { uploader: "", date: "" };
}

function PhotosTab() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploaderName, setUploaderName] = useState("");
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploader name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("savannah_uploader_name");
    if (saved) setUploaderName(saved);
  }, []);

  const saveUploaderName = (name: string) => {
    setUploaderName(name);
    localStorage.setItem("savannah_uploader_name", name);
  };

  const fetchPhotos = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/savannah-photos/list");
      const data = await res.json();
      if (data.photos) setPhotos(data.photos);
    } catch (e) {
      console.error("Failed to fetch photos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchPhotos(true), 30000);
    return () => clearInterval(interval);
  }, [fetchPhotos]);

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) =>
      ["image/jpeg", "image/png", "image/heic", "image/heif", "image/gif", "image/webp"].includes(f.type) ||
      /\.(jpg|jpeg|png|heic|heif|gif|webp)$/i.test(f.name)
    );
    if (imageFiles.length === 0) return;

    const newUploads: UploadStatus[] = imageFiles.map((file) => ({
      file,
      status: "uploading" as const,
      progress: 0,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    await Promise.all(
      imageFiles.map(async (file, idx) => {
        const globalIdx = uploads.length + idx;
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("uploaderName", uploaderName || "guest");

          const res = await fetch("/api/savannah-photos/upload", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            setUploads((prev) =>
              prev.map((u, i) =>
                i === globalIdx ? { ...u, status: "done", progress: 100 } : u
              )
            );
          } else {
            setUploads((prev) =>
              prev.map((u, i) =>
                i === globalIdx ? { ...u, status: "error" } : u
              )
            );
          }
        } catch {
          setUploads((prev) =>
            prev.map((u, i) =>
              i === globalIdx ? { ...u, status: "error" } : u
            )
          );
        }
      })
    );

    // Refresh gallery after all uploads
    await fetchPhotos(true);

    // Clear done uploads after 3s
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status !== "done"));
    }, 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const openLightbox = async (photo: Photo) => {
    setLightbox(photo);
    setLightboxSrc(null);
    setLightboxLoading(true);
    try {
      const res = await fetch(`/api/savannah-photos/download?path=${encodeURIComponent(photo.path)}`);
      const data = await res.json();
      if (data.url) setLightboxSrc(data.url);
    } catch {
      // keep null
    } finally {
      setLightboxLoading(false);
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const res = await fetch(`/api/savannah-photos/download?path=${encodeURIComponent(photo.path)}`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = photo.name;
        a.target = "_blank";
        a.click();
      }
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatedSection>
        {/* Upload section */}
        <div className={`rounded-2xl border ${borderColor} ${bg} p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8965A]/10">
                <Camera className="h-4 w-4 text-[#B8965A]" />
              </div>
              <h3 className={`font-medium ${textPrimary} text-[15px]`}>Trip Photos</h3>
            </div>
            <button
              onClick={() => fetchPhotos(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-[#5C6B5E] hover:text-[#B8965A] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Name field */}
          <div>
            <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>
              Your name
            </label>
            <input
              type="text"
              placeholder="Vienna, Dylan, Dave…"
              value={uploaderName}
              onChange={(e) => saveUploaderName(e.target.value)}
              className={`w-full rounded-xl border ${borderColor} bg-[#F7F4EF] px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#B8965A] bg-[#B8965A]/5"
                : "border-[#E8E4DD] hover:border-[#B8965A]/50 hover:bg-[#F7F4EF]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/gif,image/webp,.heic,.heif"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 text-[#B8965A]/50 mx-auto mb-3" />
            <p className={`text-sm font-medium ${textPrimary}`}>Drop photos here or tap to browse</p>
            <p className="text-xs text-[#5C6B5E]/60 mt-1">JPG, PNG, HEIC · Max 50MB each</p>
          </div>

          {/* Upload progress */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              {uploads.map((u, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border ${borderColor} bg-[#F7F4EF] px-4 py-3`}>
                  <ImageIcon className="h-4 w-4 text-[#B8965A] shrink-0" />
                  <p className={`text-sm ${textPrimary} flex-1 truncate`}>{u.file.name}</p>
                  {u.status === "uploading" && (
                    <Loader2 className="h-4 w-4 text-[#B8965A] animate-spin shrink-0" />
                  )}
                  {u.status === "done" && (
                    <span className="text-xs text-[#5C6B5E] font-medium shrink-0">Added! ✓</span>
                  )}
                  {u.status === "error" && (
                    <span className="text-xs text-red-500 font-medium shrink-0">Failed</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Gallery */}
      <AnimatedSection>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-[#F7F4EF] border border-[#E8E4DD] animate-pulse"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className={`rounded-2xl border ${borderColor} ${bg} p-12 text-center`}>
            <Camera className="h-12 w-12 text-[#B8965A]/30 mx-auto mb-4" />
            <p className={`text-[15px] font-medium ${textPrimary} mb-2`}>No photos yet</p>
            <p className={`text-sm ${textSecondary}`}>
              Be the first to add one from the trip!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => {
              const { uploader, date } = parsePhotoMeta(photo.name);
              return (
                <div
                  key={photo.path}
                  className="group relative cursor-pointer"
                  onClick={() => openLightbox(photo)}
                >
                  <div className="aspect-square rounded-xl overflow-hidden border border-[#E8E4DD] bg-[#F7F4EF]">
                    {photo.thumbnailUrl ? (
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-[#B8965A]/30" />
                      </div>
                    )}
                  </div>
                  {(uploader || date) && (
                    <div className="mt-1.5 px-0.5">
                      {uploader && (
                        <p className={`text-xs font-medium ${textPrimary} truncate`}>{uploader}</p>
                      )}
                      {date && (
                        <p className="text-[10px] text-[#5C6B5E]/60">{date}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AnimatedSection>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => { setLightbox(null); setLightboxSrc(null); }}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70 text-sm truncate pr-4">{lightbox.name}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadPhoto(lightbox)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#B8965A] text-white px-3 py-2 text-xs font-medium hover:bg-[#A07845] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => { setLightbox(null); setLightboxSrc(null); }}
                  className="rounded-lg bg-white/10 text-white p-2 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 min-h-[300px]">
              {lightboxLoading ? (
                <Loader2 className="h-8 w-8 text-[#B8965A] animate-spin" />
              ) : lightboxSrc ? (
                <img
                  src={lightboxSrc}
                  alt={lightbox.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl"
                />
              ) : (
                <p className="text-white/50 text-sm">Failed to load image</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function SavannahGuidePage() {
  const [formData, setFormData] = useState({
    coffee: "",
    dietary: "",
    breakfast: "",
    activities: "",
    other: "",
  });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("welcome");
  const [forecast, setForecast] = useState<WeatherDay[]>(FORECAST_FALLBACK);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const tabBarRef = useRef<HTMLDivElement>(null);

  /* ─── Parallax scroll ─── */
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ─── Live weather fetch ─── */
  useEffect(() => {
    fetch("/api/savannah-weather")
      .then((res) => res.json())
      .then((data) => {
        if (data?.daily?.time && Array.isArray(data.daily.time)) {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const liveForecast: WeatherDay[] = data.daily.time.map(
            (dateStr: string, i: number) => {
              const date = new Date(dateStr + "T12:00:00");
              const wmo = data.daily.weathercode?.[i] ?? 0;
              const { condition, icon } = wmoToCondition(wmo);
              return {
                day: days[date.getDay()],
                date: date.getDate(),
                high: Math.round(data.daily.temperature_2m_max?.[i] ?? 70),
                low: Math.round(data.daily.temperature_2m_min?.[i] ?? 52),
                condition,
                icon,
              };
            }
          );
          setForecast(liveForecast);
        }
      })
      .catch(() => {
        // keep fallback data
      })
      .finally(() => {
        setWeatherLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState === "sent") return;
    setFormState("sending");
    try {
      const res = await fetch("/api/guest-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormState("sent");
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (tabBarRef.current) {
        const tabBarTop =
          tabBarRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: tabBarTop - 8, behavior: "smooth" });
      }
    },
    []
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "welcome":
        return (
          <WelcomeTab
            forecast={forecast}
            weatherLoading={weatherLoading}
            formData={formData}
            setFormData={setFormData}
            formState={formState}
            handleSubmit={handleSubmit}
          />
        );
      case "essentials":
        return <EssentialsTab />;
      case "dining":
        return <DiningTab />;
      case "explore":
        return <ExploreTab />;
      case "baby":
        return <BabyTipsTab />;
      case "map":
        return <MapTab />;
      case "photos":
        return <PhotosTab />;
    }
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* ── Hero — full bleed with parallax ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={IMAGES.hero}
            alt="The Ford Field & River Club"
            className="w-full h-full object-cover"
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2C2C2C]/70 via-[#2C2C2C]/50 to-[#2C2C2C]/80" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#B8965A]/40" />
            <Compass className="h-5 w-5 text-[#B8965A]" />
            <div className="h-px w-8 bg-[#B8965A]/40" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#B8965A] mb-4">
            March 12–16, 2026
          </p>
          <h1 className="text-4xl md:text-6xl font-light tracking-wide font-[family-name:var(--font-display)] text-white mb-3">
            Welcome to Savannah
          </h1>
          <p className="text-base text-white/70 max-w-md mx-auto leading-relaxed">
            A guide for Vienna, Dylan &amp; Filippa — your complete companion to The Ford Field
            &amp; River Club, Savannah dining, and everything you need for a perfect week in the
            Low Country.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="h-px w-8 bg-[#B8965A]/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#B8965A]/40" />
            <div className="h-px w-8 bg-[#B8965A]/20" />
          </div>
        </div>
      </div>

      {/* ── Sticky Tab Bar ── */}
      <div
        ref={tabBarRef}
        className="sticky top-0 z-50 bg-[#FDFCFA]/95 backdrop-blur-md border-b border-[#E8E4DD]"
      >
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-200 relative min-h-[48px] flex-1 justify-center ${
                  isActive
                    ? "text-[#2C2C2C]"
                    : "text-[#5C6B5E]/60 hover:text-[#5C6B5E]"
                }`}
              >
                <TabIcon
                  className={`h-4 w-4 ${isActive ? "text-[#B8965A]" : ""}`}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#B8965A] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        <div
          key={activeTab}
          className="animate-in fade-in duration-300"
          style={{ animation: "fadeIn 300ms ease-out" }}
        >
          {renderTabContent()}
        </div>
      </div>

      {/* ── Footer area ── */}
      <div className="max-w-4xl mx-auto px-5 pb-8 space-y-10">
        {/* Forrest Gump */}
        <AnimatedSection>
          <div className="max-w-[50%] mx-auto">
            <div className="rounded-2xl overflow-hidden border border-[#E8E4DD]">
              <video
                src="https://media.tenor.com/4EElxXeHiZwAAAPo/forrest-gump-wave.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full"
              />
            </div>
            <div className="bg-[#F7F4EF] px-5 py-4 text-center rounded-b-2xl border border-t-0 border-[#E8E4DD]">
              <p className="text-lg italic text-[#5C6B5E] font-[family-name:var(--font-display)]">
                See y&apos;all soon.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Footer */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 bg-[#B8965A]/20" />
            <Compass className="h-4 w-4 text-[#B8965A]/40" />
            <div className="h-px w-8 bg-[#B8965A]/20" />
          </div>
          <p className="text-[10px] text-[#5C6B5E]/40 uppercase tracking-[0.2em]">
            Prepared with care for the Sweeney Family
          </p>
        </div>
      </div>

      {/* ── Fade-in animation keyframe ── */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
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
} from "lucide-react";

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

function PhoneButton({ number, label, icon: Icon }: { number: string; label: string; icon?: React.ComponentType<{ className?: string }> }) {
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

function InfoCard({ title, children, icon: Icon, image }: { title: string; children: React.ReactNode; icon: React.ComponentType<{ className?: string }>; image?: string }) {
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

function WifiCard() {
  const [copied, setCopied] = useState(false);
  const password = "TopDawg2019";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
          <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${textSecondary} mb-1`}>WiFi</p>
          <p className={`text-lg font-medium ${textPrimary} font-[family-name:var(--font-display)]`}>Belted King</p>
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

function BabyEssentialsCard() {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bg} p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#5C6B5E]/[0.04] blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5C6B5E]/10 shrink-0">
          <Baby className="h-6 w-6 text-[#5C6B5E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${textSecondary} mb-1`}>For Filippa</p>
          <p className={`text-[15px] font-medium ${textPrimary}`}>Baby essentials are ready</p>
          <p className={`text-sm ${textSecondary} mt-2 leading-relaxed`}>
            A crib (pack and play) and baby monitor will be set up and waiting when you arrive. One less thing to pack, one less thing to think about.
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

export default function SavannahGuidePage() {
  const [formData, setFormData] = useState({
    coffee: "",
    dietary: "",
    breakfast: "",
    activities: "",
    other: "",
  });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Hero with Ford property image */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.hero} alt="The Ford Field & River Club" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2C2C2C]/70 via-[#2C2C2C]/50 to-[#2C2C2C]/80" />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#B8965A]/40" />
            <Compass className="h-5 w-5 text-[#B8965A]" />
            <div className="h-px w-8 bg-[#B8965A]/40" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8965A] mb-4">March 11–17, 2026</p>
          <h1 className="text-3xl md:text-5xl font-light tracking-wide font-[family-name:var(--font-display)] text-white mb-3">
            Welcome to Savannah
          </h1>
          <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
            A guide for Vienna, Dylan &amp; Filippa — your complete companion to The Ford Field &amp; River Club, Savannah dining, and everything you need for a perfect week in the Low Country.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="h-px w-8 bg-[#B8965A]/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#B8965A]/40" />
            <div className="h-px w-8 bg-[#B8965A]/20" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-10">

        {/* ── Address ── */}
        <a
          href="https://www.google.com/maps/search/?api=1&query=35+Belted+Kingfisher+Richmond+Hill+GA"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white border border-[#E8E4DD] rounded-xl p-4 hover:border-[#B8965A] transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#B8965A]/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#B8965A]" />
          </div>
          <div>
            <p className="text-[#2C2C2C] font-medium text-[15px]">35 Belted Kingfisher</p>
            <p className="text-[#8A7E72] text-sm">Richmond Hill, GA — Tap for directions</p>
          </div>
        </a>

        {/* ── Personal Note ── */}
        <div className="bg-[#F7F4EF] border border-[#E8E4DD] rounded-2xl p-6 md:p-8">
          <p className="font-[family-name:var(--font-display)] text-[#2C2C2C] text-[17px] md:text-[19px] leading-relaxed italic">
            Really glad you guys are coming down. No plans, no itinerary — just good hangs, good food, and two babies causing chaos on the lawn. We put this together so you have everything in one spot if you need it. See you soon.
          </p>
          <p className="text-[#B8965A] text-sm mt-4 tracking-wide">— D & A</p>
        </div>

        {/* ── Preferences ── */}
        {formState === "sent" ? (
          <div className={`rounded-2xl border ${borderColor} ${bgAlt} p-6 text-center`}>
            <CheckCircle className="h-8 w-8 text-[#5C6B5E] mx-auto mb-3" />
            <p className={`font-medium ${textPrimary} text-[15px]`}>Got it — thank you!</p>
            <p className={`text-sm ${textSecondary} mt-1`}>We&apos;ll make sure everything&apos;s ready.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`rounded-2xl border ${borderColor} ${bg} p-6 md:p-8 space-y-5`}>
            <div>
              <p className={`font-medium ${textPrimary} text-[15px] font-[family-name:var(--font-display)]`}>Help us get things ready</p>
              <p className={`text-sm ${textSecondary} mt-1`}>A few quick things so the fridge is stocked and the coffee is right.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>How do you take your coffee?</label>
                <input
                  type="text"
                  placeholder="Black, oat milk latte, don't drink coffee..."
                  value={formData.coffee}
                  onChange={(e) => setFormData({ ...formData, coffee: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>Any dietary restrictions or allergies?</label>
                <input
                  type="text"
                  placeholder="None, vegetarian, gluten-free..."
                  value={formData.dietary}
                  onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>What would you love to have for breakfast in your fridge?</label>
                <input
                  type="text"
                  placeholder="Yogurt, eggs, fruit, pastries..."
                  value={formData.breakfast}
                  onChange={(e) => setFormData({ ...formData, breakfast: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>Anything you&apos;re especially hoping to do?</label>
                <input
                  type="text"
                  placeholder="Golf, spa, explore downtown Savannah..."
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  className={`w-full rounded-xl border ${borderColor} ${bgAlt} px-4 py-3 text-sm ${textPrimary} placeholder:text-[#B5AFA7] focus:outline-none focus:border-[#B8965A] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-[0.15em] ${textSecondary} mb-2`}>Anything else we should know?</label>
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

        {/* ── WiFi & Baby Essentials ── */}
        <div className="space-y-4">
          <WifiCard />
          <BabyEssentialsCard />
        </div>

        {/* ── Essential Contacts ── */}
        <section>
          <SectionHeader>Essential Contacts</SectionHeader>
          <div className="space-y-3">
            <PhoneButton number="+1 (952) 239-0143" label="Dave Sweeney" icon={Users} />
            <PhoneButton number="+1 (916) 529-5298" label="Amanda Sweeney" icon={Users} />
            <PhoneButton number="+1 (912) 756-5666" label="Ford Field & River Club — Main" icon={Building} />
            <PhoneButton number="+1 (912) 756-5666" label="Ford Pro Shop" icon={Flag} />
            <PhoneButton number="+1 (912) 756-5666" label="Ford Spa" icon={Sparkles} />
            <PhoneButton number="+1 (912) 412-0001" label="Jimmy — Driver if needed" icon={Car} />
            <PhoneButton number="+1 (912) 691-2424" label="Pediatric Associates of Savannah" icon={Shield} />
            <PhoneButton number="+1 (912) 350-8000" label="Memorial Health ER" icon={Shield} />
          </div>
        </section>

        {/* ── Ford Field & River Club ── */}
        <section>
          <SectionHeader>The Ford Field &amp; River Club</SectionHeader>
          <InfoCard title="History & Heritage" icon={Landmark} image={IMAGES.mainHouse}>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                In 1917, Henry Ford and his wife Clara purchased land along the banks of the Ogeechee River outside Savannah. What began as a private winter retreat became one of the most storied properties in the American South.
              </p>
              <p>
                The Main House, built in the Georgian Revival style, served as the Fords&apos; seasonal residence. Henry hosted Thomas Edison and Harvey Firestone here during their famous road trips. The property is listed on the National Register of Historic Places.
              </p>
              <p>
                Today, Ford Field &amp; River Club operates as a private sporting club set across 1,800 acres of pristine Low Country landscape. The property holds Audubon International certification for its environmental stewardship.
              </p>
            </div>
          </InfoCard>
        </section>

        {/* ── On-Property Amenities ── */}
        <section>
          <SectionHeader>On-Property Amenities</SectionHeader>
          <div className="space-y-3">
            <InfoCard title="Pete Dye Golf Course" icon={Flag} image={IMAGES.golf}>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                A stunning Pete Dye-designed course spanning 250 acres of the property. No tee times required — simply arrive and play. One of the most exclusive layouts in the Southeast, shaped by freshwater lakes, lush meadows, and scenic coastline.
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

        {/* ── Live Oaks & Spanish Moss ── */}
        <section>
          <SectionHeader>The Live Oaks &amp; Spanish Moss</SectionHeader>
          <SectionImage src={IMAGES.oaks} alt="Live oaks draped in Spanish moss" />
          <div className={`rounded-2xl border ${borderColor} ${bg} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6B5E]/10">
                <TreePine className="h-4 w-4 text-[#5C6B5E]" />
              </div>
              <h3 className={`font-medium ${textPrimary} text-[15px]`}>A Landscape Unlike Anywhere Else</h3>
            </div>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                Nothing prepares you for the live oaks. <em>Quercus virginiana</em> — massive, ancient trees with sprawling horizontal branches that reach impossibly wide, some of them centuries old. Their canopies are so broad they create cathedral-like spaces beneath, filtering the Georgia sun into dappled pools of light.
              </p>
              <p>
                And from every branch hangs Spanish moss — silvery-grey curtains of <em>Tillandsia usneoides</em>, swaying in the slightest breeze. Despite the name, it&apos;s not actually moss. It&apos;s an epiphytic bromeliad, an air plant that drapes itself on branches without harming the tree. It draws moisture and nutrients from the air alone. When the light catches it just right — early morning, golden hour — the effect is almost otherworldly.
              </p>
              <p>
                The most iconic avenue is at <strong>Wormsloe Historic Site</strong>: a mile-long tunnel of 400+ live oaks dripping with moss, one of the most photographed spots in the American South. But you&apos;ll find them everywhere — canopying the squares of downtown Savannah, arching over the paths at Forsyth Park, standing sentinel at Bonaventure Cemetery, and all across the Ford property itself.
              </p>
              <p className="text-[#B8965A] italic">
                The dappled light through moss-draped oaks is the visual signature of the Low Country. Once you see it in person, you&apos;ll understand why people fall in love with this place.
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

        {/* ── Golf ── */}
        <section>
          <SectionHeader>Golf for Dylan</SectionHeader>
          <div className="space-y-3">
            <InfoCard title="Pete Dye Course at Ford" icon={Flag}>
              <p className={`text-sm ${textSecondary} leading-relaxed mb-3`}>
                250 acres, no tee times needed. The signature course right on property.
              </p>
            </InfoCard>

            <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mt-6 mb-2`}>Nearby Courses</p>

            <div className="space-y-2">
              {[
                { name: "Southbridge Golf Club", phone: "+19126515455", display: "(912) 651-5455" },
                { name: "Club at Savannah Harbor", phone: "+19122012007", display: "(912) 201-2007" },
                { name: "Hunter Golf Club", phone: "+19123159115", display: "(912) 315-9115" },
              ].map((course) => (
                <a key={course.name} href={`tel:${course.phone}`} className={`flex items-center gap-3 rounded-2xl border ${borderColor} ${bgAlt} px-5 py-4 active:bg-[#E8E4DD] transition-colors min-h-[56px]`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0">
                    <Flag className="h-5 w-5 text-[#5C6B5E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary}`}>{course.name}</p>
                    <p className="text-xs text-[#5C6B5E]">{course.display}</p>
                  </div>
                  <Phone className="h-4 w-4 text-[#B8965A] shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Restaurants ── */}
        <section>
          <SectionHeader>Savannah Dining</SectionHeader>

          <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-3`}>Fine Dining &amp; Dinner</p>
          <div className="space-y-3 mb-8">
            {[
              { name: "The Olde Pink House", address: "23 Abercorn St, Savannah, GA", desc: "18th-century mansion. Southern fine dining at its best. Reservation recommended." },
              { name: "Mrs. Wilkes\u2019 Dining Room", address: "107 W Jones St, Savannah, GA", desc: "Legendary boarding house-style lunch. Communal tables, fried chicken, collard greens. Cash only, expect a line." },
              { name: "Treylor Park", address: "115 E Bay St, Savannah, GA", desc: "Creative Southern comfort. Great cocktails. Casual but excellent." },
              { name: "The Pirates\u2019 House", address: "20 E Broad St, Savannah, GA", desc: "Historic tavern since 1753. Fun atmosphere, solid seafood." },
              { name: "Little Duck Diner", address: "131 W Congress St, Savannah, GA", desc: "Elevated diner fare. Brunch favorite. Charming, compact." },
              { name: "Huey\u2019s on the River", address: "115 E River St, Savannah, GA", desc: "New Orleans-style on River Street. Beignets and views." },
            ].map((restaurant) => (
              <a
                key={restaurant.name}
                href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-2xl border ${borderColor} ${bgAlt} p-5 active:bg-[#E8E4DD] transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C07A1A]/10 shrink-0 mt-0.5">
                    <UtensilsCrossed className="h-5 w-5 text-[#C07A1A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-medium ${textPrimary}`}>{restaurant.name}</p>
                    <p className="text-xs text-[#5C6B5E] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />{restaurant.address}
                    </p>
                    <p className={`text-sm ${textSecondary} mt-2 leading-relaxed`}>{restaurant.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-3`}>Casual &amp; Waterfront</p>
          <div className="space-y-3">
            <div className={`rounded-2xl border ${borderColor} ${bgAlt} p-5`}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5C6B5E]/10 shrink-0 mt-0.5">
                  <Waves className="h-5 w-5 text-[#5C6B5E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-medium ${textPrimary}`}>The Wyld Dock Bar</p>
                  <p className="text-xs text-[#5C6B5E] flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />2740 Livingston Ave, Savannah, GA 31404
                  </p>
                  <p className={`text-sm ${textSecondary} mt-2 leading-relaxed`}>
                    Casual waterfront spot on the marsh — outdoor seating with incredible views. Seafood, craft cocktails, live music sometimes. Very baby-friendly (spacious outdoor layout). Perfect for a laid-back afternoon.
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <a
                      href="tel:+19126921219"
                      className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DD] bg-white px-3 py-2 text-xs text-[#2C2C2C] active:bg-[#E8E4DD] transition-colors min-h-[36px]"
                    >
                      <Phone className="h-3 w-3 text-[#B8965A]" />
                      (912) 692-1219
                    </a>
                    <a
                      href="https://maps.google.com/?q=2740+Livingston+Ave,+Savannah,+GA+31404"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DD] bg-white px-3 py-2 text-xs text-[#2C2C2C] active:bg-[#E8E4DD] transition-colors min-h-[36px]"
                    >
                      <MapPin className="h-3 w-3 text-[#5C6B5E]" />
                      Open in Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Savannah History ── */}
        <section>
          <SectionHeader>A Brief History of Savannah</SectionHeader>
          <InfoCard title="The Hostess City" icon={BookOpen}>
            <div className={`text-sm ${textSecondary} leading-relaxed space-y-3`}>
              <p>
                Founded in 1733 by General James Oglethorpe, Savannah was the first city in the Colony of Georgia and one of the first planned cities in North America. Oglethorpe&apos;s famous grid of public squares — 22 of which survive today — remains one of the most celebrated examples of urban planning in the world.
              </p>
              <p>
                During the Civil War, General William Tecumseh Sherman completed his devastating March to the Sea in Savannah. Rather than burn the city, he famously presented it to President Lincoln as a Christmas gift in December 1864, sparing its architecture and charm.
              </p>
              <p>
                Today, Savannah&apos;s Historic District is the largest National Historic Landmark District in the United States. The city&apos;s cobblestone streets, live oaks draped in Spanish moss, and antebellum architecture make it one of the most beautiful cities in America.
              </p>
            </div>
          </InfoCard>
        </section>

        {/* ── Things to Do ── */}
        <section>
          <SectionHeader>Things to Do</SectionHeader>
          <div className="space-y-3">
            {[
              { name: "Forsyth Park", desc: "Savannah\u2019s crown jewel. 30 acres of live oaks, the iconic fountain, and a Saturday farmers market. Perfect for a stroller walk.", address: "Forsyth Park, Savannah, GA", icon: TreePine },
              { name: "The Squares", desc: "Wander through Savannah\u2019s 22 historic squares. Each one is different. Highlights: Chippewa, Monterey, Madison, and Lafayette.", address: "Chippewa Square, Savannah, GA", icon: Compass },
              { name: "River Street", desc: "Nine blocks of shops, galleries, and restaurants along the Savannah River on restored cotton warehouses. Cobblestone — watch the stroller wheels.", address: "River Street, Savannah, GA", icon: Waves },
              { name: "Wormsloe Historic Site", desc: "A mile-long avenue of 400+ live oaks draped in Spanish moss. One of the most photographed spots in the South. Colonial estate ruins at the end.", address: "Wormsloe Historic Site, Savannah, GA", icon: TreePine },
              { name: "Bonaventure Cemetery", desc: "Hauntingly beautiful Victorian cemetery on a bluff over the Wilmington River. Made famous by Midnight in the Garden of Good and Evil.", address: "Bonaventure Cemetery, Savannah, GA", icon: Flower2 },
              { name: "SCAD Museum of Art", desc: "Contemporary art museum housed in a stunning 1853 railroad building. World-class rotating exhibitions.", address: "SCAD Museum of Art, Savannah, GA", icon: Sparkles },
              { name: "Cathedral of St. John the Baptist", desc: "French Gothic cathedral built in 1876. Breathtaking stained glass and soaring spires. Free to visit.", address: "Cathedral of St. John the Baptist, Savannah, GA", icon: Church },
              { name: "Leopold\u2019s Ice Cream", desc: "Iconic Savannah ice cream shop since 1919. Always a line, always worth it. Try the Tutti Frutti or Lemon Custard.", address: "Leopold's Ice Cream, 212 E Broughton St, Savannah, GA", icon: Heart },
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
                    <p className={`text-sm ${textSecondary} mt-1.5 leading-relaxed`}>{place.desc}</p>
                    <p className="text-xs text-[#5C6B5E]/60 flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />Open in Maps
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Baby Tips ── */}
        <section>
          <SectionHeader>Traveling with Baby</SectionHeader>
          <div className="space-y-3">
            <InfoCard title="March Weather" icon={Sun}>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                Expect highs of 65–72°F with mild humidity. Pack light layers and a sun hat for Filippa. Evenings can dip into the mid-50s.
              </p>
            </InfoCard>

            <div className="space-y-2">
              <p className={`text-xs ${textSecondary} uppercase tracking-[0.2em] mb-2`}>Emergency Pediatric Care</p>
              <PhoneButton number="+1 (912) 691-2424" label="Pediatric Associates of Savannah" icon={Baby} />
              <PhoneButton number="+1 (912) 350-8000" label="Memorial Health — Emergency" icon={Shield} />
            </div>
          </div>
        </section>

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
    </div>
  );
}

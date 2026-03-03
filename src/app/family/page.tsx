"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Baby,
  User,
  Dog,
  Phone,
  Mail,
  ChevronRight,
  Calendar,
} from "lucide-react";

function getSorenAge() {
  const born = new Date("2025-06-21");
  const now = new Date();
  const diffMs = now.getTime() - born.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  return { months };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C6B5E] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-[#B8965A]/20" />
    </div>
  );
}

interface FamilyMemberCardProps {
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  phone?: string;
  email?: string;
  detail?: string;
  href?: string;
}

function FamilyMemberCard({ name, role, icon: Icon, phone, email, detail, href }: FamilyMemberCardProps) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5C6B5E]/8 shrink-0">
        <Icon className="h-6 w-6 text-[#5C6B5E]" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-medium text-[#2C2C2C]">{name}</h3>
        <p className="text-xs text-[#8A7E72] mt-0.5 tracking-wide">{role}</p>
        {detail && <p className="text-sm text-[#5C6B5E] mt-2 leading-relaxed">{detail}</p>}
        {(phone || email) && (
          <div className="flex gap-3 mt-2 flex-wrap">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-[#B8965A]" onClick={(e) => e.stopPropagation()}>
                <Phone className="h-3 w-3" />{phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-xs text-[#B8965A]" onClick={(e) => e.stopPropagation()}>
                <Mail className="h-3 w-3" />{email}
              </a>
            )}
          </div>
        )}
      </div>
      {href && <ChevronRight className="h-4 w-4 text-[#B8965A] shrink-0 mt-4 opacity-40" />}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl border border-[#E8E4DD] bg-white p-5 hover:border-[#B8965A]/30 hover:shadow-sm transition-all active:bg-[#F7F4EF]">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8E4DD] bg-white p-5">
      {content}
    </div>
  );
}

export default function FamilyPage() {
  const sorenAge = useMemo(() => getSorenAge(), []);

  return (
    <div className="space-y-10 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/[0.03] blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#B8965A]/8 shrink-0">
            <Heart className="h-7 w-7 text-[#B8965A]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] tracking-wide">
              Family Directory
            </h1>
            <p className="text-sm text-[#8A7E72] mt-1 tracking-wide">The Sweeney Family</p>
          </div>
        </div>
      </div>

      {/* Core Family */}
      <section>
        <SectionHeader>Our Family</SectionHeader>
        <div className="space-y-3">
          <FamilyMemberCard
            name="Dave Sweeney"
            role="Dad"
            icon={User}
            phone="(952) 239-0143"
            email="davesweeney2.8@gmail.com"
            detail="Photographer & retoucher. Birthday: March 30."
          />
          <FamilyMemberCard
            name="Amanda Sweeney"
            role="Mom"
            icon={Heart}
            phone="(916) 529-5298"
            email="arbarrier33@gmail.com"
            detail="Birthday: December 15."
          />
          <FamilyMemberCard
            name="Soren Sweeney"
            role={`${sorenAge.months} months old`}
            icon={Baby}
            detail="Born June 21, 2025. Daycare at Tierra Encantada."
            href="/soren"
          />
          <FamilyMemberCard
            name="Rigs"
            role="Lagotto Romagnolo"
            icon={Dog}
            detail="Short for Rigatoni. Supreme floof."
            href="/rigs"
          />
        </div>
      </section>

      {/* Extended Family */}
      <section>
        <SectionHeader>Extended Family</SectionHeader>
        <div className="space-y-3">
          <FamilyMemberCard
            name="Cammie Sweeney"
            role="Dave's Mom"
            icon={User}
            email="cammiesweeney@gmail.com"
            detail="Birthday: February 25. Lives in Greensboro."
          />
          <FamilyMemberCard
            name="Mike Sweeney"
            role="Dave's Dad"
            icon={User}
            email="mtsweeney1@gmail.com"
            detail="Winters in Savannah, GA. Summers in Wayzata, MN."
          />
          <FamilyMemberCard
            name="Katie Sweeney"
            role="Dave's Sister"
            icon={User}
            detail="Primary guardian for Soren. Successor trustee."
          />
          <FamilyMemberCard
            name="Chris Barrier"
            role="Amanda's Dad"
            icon={User}
            detail="Lives in Laguna Beach."
          />
          <FamilyMemberCard
            name="Lisa Barrier"
            role="Amanda's Mom"
            icon={User}
            detail="Lives in Sacramento."
          />
        </div>
      </section>

      {/* Footer */}
      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-10 bg-[#B8965A]/15" />
          <p className="text-[10px] text-[#B8B0A4] tracking-[0.2em]">sweeney.family</p>
          <div className="h-px w-10 bg-[#B8965A]/15" />
        </div>
      </div>
    </div>
  );
}

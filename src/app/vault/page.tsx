"use client";

import { useState } from "react";
import {
  FolderLock,
  BookOpen,
  Shield,
  HeartPulse,
  Scale,
  Car,
  Home,
  MoreHorizontal,
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Plus,
  Calendar,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  dateAdded: string;
  fileType: string;
}

interface Category {
  id: string;
  name: string;
  subtitle: string;
  icon: typeof FolderLock;
  color: string;
  bgColor: string;
  documents: Document[];
}

const categories: Category[] = [
  {
    id: "passports",
    name: "Passports",
    subtitle: "3 documents",
    icon: BookOpen,
    color: "text-[#2A4E8A]",
    bgColor: "bg-[#2A4E8A]",
    documents: [
      { id: "1", name: "Dave Sweeney — Passport", dateAdded: "2025-08-15", fileType: "PDF" },
      { id: "2", name: "Amanda Sweeney — Passport", dateAdded: "2025-08-15", fileType: "PDF" },
      { id: "3", name: "Soren Sweeney — Passport", dateAdded: "2025-09-20", fileType: "PDF" },
    ],
  },
  {
    id: "insurance",
    name: "Insurance",
    subtitle: "4 documents",
    icon: Shield,
    color: "text-[#5C6B5E]",
    bgColor: "bg-[#5C6B5E]",
    documents: [
      { id: "4", name: "Homeowners Policy — State Farm", dateAdded: "2026-01-10", fileType: "PDF" },
      { id: "5", name: "Auto Policy — State Farm", dateAdded: "2026-01-10", fileType: "PDF" },
      { id: "6", name: "Umbrella Policy", dateAdded: "2026-01-10", fileType: "PDF" },
      { id: "7", name: "Life Insurance — Dave", dateAdded: "2025-11-05", fileType: "PDF" },
    ],
  },
  {
    id: "medical",
    name: "Medical Records",
    subtitle: "3 documents",
    icon: HeartPulse,
    color: "text-[#A85570]",
    bgColor: "bg-[#A85570]",
    documents: [
      { id: "8", name: "Soren — Vaccination Record", dateAdded: "2026-02-01", fileType: "PDF" },
      { id: "9", name: "Soren — Pediatrician Notes", dateAdded: "2026-02-15", fileType: "PDF" },
      { id: "10", name: "Amanda — Dental Records", dateAdded: "2025-12-20", fileType: "PDF" },
    ],
  },
  {
    id: "legal",
    name: "Legal & Trust",
    subtitle: "5 documents",
    icon: Scale,
    color: "text-[#6B5A9B]",
    bgColor: "bg-[#6B5A9B]",
    documents: [
      { id: "11", name: "Sweeney Family Trust", dateAdded: "2025-10-01", fileType: "PDF" },
      { id: "12", name: "Dave — Last Will & Testament", dateAdded: "2025-10-01", fileType: "PDF" },
      { id: "13", name: "Amanda — Last Will & Testament", dateAdded: "2025-10-01", fileType: "PDF" },
      { id: "14", name: "Power of Attorney — Dave", dateAdded: "2025-10-01", fileType: "PDF" },
      { id: "15", name: "Power of Attorney — Amanda", dateAdded: "2025-10-01", fileType: "PDF" },
    ],
  },
  {
    id: "vehicle",
    name: "Vehicle",
    subtitle: "2 documents",
    icon: Car,
    color: "text-[#C07A1A]",
    bgColor: "bg-[#C07A1A]",
    documents: [
      { id: "16", name: "Volvo XC90 — Title", dateAdded: "2025-06-15", fileType: "PDF" },
      { id: "17", name: "Volvo XC90 — Registration", dateAdded: "2026-01-05", fileType: "PDF" },
    ],
  },
  {
    id: "home",
    name: "Home",
    subtitle: "3 documents",
    icon: Home,
    color: "text-[#2E6B50]",
    bgColor: "bg-[#2E6B50]",
    documents: [
      { id: "18", name: "Mortgage Statement — January 2026", dateAdded: "2026-01-15", fileType: "PDF" },
      { id: "19", name: "Home Purchase Agreement", dateAdded: "2023-04-01", fileType: "PDF" },
      { id: "20", name: "Home Inspection Report", dateAdded: "2023-03-15", fileType: "PDF" },
    ],
  },
  {
    id: "other",
    name: "Other",
    subtitle: "1 document",
    icon: MoreHorizontal,
    color: "text-[#8A7E72]",
    bgColor: "bg-[#8A7E72]",
    documents: [
      { id: "21", name: "Rigs — AKC Registration", dateAdded: "2024-03-10", fileType: "PDF" },
    ],
  },
];

export default function VaultPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const activeCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-xl border border-[#E8E4DD] p-6 md:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8965A]/[0.03] blur-3xl" />
        <div className="flex items-center gap-4">
          {selectedCategory ? (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F5F0] hover:bg-[#F0ECE4] transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-[#8A7E72]" strokeWidth={1.5} />
            </button>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8965A]/8 shrink-0">
              <FolderLock className="h-5 w-5 text-[#B8965A]" strokeWidth={1.5} />
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-[#2C2C2C] font-[family-name:var(--font-display)] leading-tight">
              {activeCategory ? activeCategory.name : "Document Vault"}
            </h1>
            <p className="text-sm text-[#8A7E72] mt-1 tracking-wide">
              {activeCategory
                ? `${activeCategory.documents.length} document${activeCategory.documents.length !== 1 ? 's' : ''}`
                : "Secure family documents"}
            </p>
          </div>
        </div>
      </div>

      {/* Category Grid or Document List */}
      {!selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="bg-white rounded-xl border border-[#E8E4DD] p-6 md:p-7 text-left transition-all hover:shadow-sm hover:border-[#D4CFC6] active:scale-[0.98] min-h-[130px] flex flex-col justify-between"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${category.bgColor}/8`}>
                  <IconComponent className={`h-5.5 w-5.5 ${category.color}`} strokeWidth={1.5} />
                </div>
                <div className="mt-4">
                  <p className="font-medium text-[#2C2C2C] text-base">{category.name}</p>
                  <p className="text-xs text-[#8A7E72] mt-0.5 tracking-wide">{category.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : activeCategory ? (
        <div className="space-y-2.5">
          {activeCategory.documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-[#E8E4DD] p-5 md:p-6 flex items-center gap-4 transition-all hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F8F5F0] shrink-0">
                <FileText className="h-5 w-5 text-[#8A7E72]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2C2C2C] truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3 text-[#B8B0A4]" strokeWidth={1.5} />
                  <span className="text-xs text-[#8A7E72]">
                    {new Date(doc.dateAdded + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-[#B8B0A4]">·</span>
                  <span className="text-xs text-[#8A7E72]">{doc.fileType}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#F8F5F0] transition-colors text-[#8A7E72] hover:text-[#2C2C2C]">
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#F8F5F0] transition-colors text-[#8A7E72] hover:text-[#2C2C2C]">
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Floating add button */}
      <button className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#B8965A] hover:bg-[#A6854F] active:bg-[#947545] text-white shadow-lg hover:shadow-xl transition-all z-20">
        <Plus className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {/* Footer */}
      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-10 bg-[#B8965A]/15" />
          <p className="text-[11px] text-[#B8B0A4] tracking-[0.2em]">
            sweeney.family
          </p>
          <div className="h-px w-10 bg-[#B8965A]/15" />
        </div>
      </div>
    </div>
  );
}

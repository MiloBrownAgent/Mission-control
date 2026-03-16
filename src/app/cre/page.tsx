"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import {
  Landmark,
  MapPin,
  DollarSign,
  TrendingUp,
  Bell,
  Star,
  Filter,
  ChevronRight,
  ChevronDown,
  Building2,
  AlertTriangle,
  ExternalLink,
  Tag,
  Clock,
  BarChart3,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MainTab = "overview" | "listings" | "watchlist";

type PropertyType =
  | "office"
  | "retail"
  | "industrial"
  | "multifamily"
  | "mixed_use"
  | "land"
  | "special_purpose";

const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  office: "bg-blue-500/10 text-blue-400",
  retail: "bg-purple-500/10 text-purple-400",
  industrial: "bg-orange-500/10 text-orange-400",
  multifamily: "bg-green-500/10 text-green-400",
  mixed_use: "bg-cyan-500/10 text-cyan-400",
  land: "bg-yellow-500/10 text-yellow-400",
  special_purpose: "bg-pink-500/10 text-pink-400",
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  multifamily: "Multifamily",
  mixed_use: "Mixed Use",
  land: "Land",
  special_purpose: "Special Purpose",
};

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500/10 text-green-400 border border-green-500/20"
      : score >= 60
        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        : "bg-red-500/10 text-red-400 border border-red-500/20";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", color)}>
      {score}
    </span>
  );
}

function TypeBadge({ type }: { type: PropertyType }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        PROPERTY_TYPE_COLORS[type]
      )}
    >
      {PROPERTY_TYPE_LABELS[type]}
    </span>
  );
}

function FlagBadge({
  flag,
  previousPrice,
}: {
  flag: string;
  previousPrice?: number;
}) {
  if (flag === "NEW")
    return (
      <span className="rounded-full bg-blue-500/10 text-blue-400 px-2 py-0.5 text-[10px] font-semibold">
        NEW
      </span>
    );
  if (flag === "PRICE_DROP")
    return (
      <span className="rounded-full bg-red-500/10 text-red-400 px-2 py-0.5 text-[10px] font-semibold">
        PRICE DROP{previousPrice ? ` (was ${fmt$(previousPrice)})` : ""}
      </span>
    );
  if (flag === "UPDATED")
    return (
      <span className="rounded-full bg-yellow-500/10 text-yellow-400 px-2 py-0.5 text-[10px] font-semibold">
        UPDATED
      </span>
    );
  return null;
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function CREPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [showUpdatesPanel, setShowUpdatesPanel] = useState(false);
  const updatesPanelRef = useRef<HTMLDivElement | null>(null);

  const notificationFeed = useQuery(api.cre.listNotificationUpdates, { limit: 40 });
  const markRead = useMutation(api.cre.markNotificationRead);
  const markAllRead = useMutation(api.cre.markAllNotificationsRead);

  const unreadCount = notificationFeed?.unreadCount ?? 0;
  const notificationItems = notificationFeed?.items ?? [];

  useEffect(() => {
    if (!showUpdatesPanel) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!updatesPanelRef.current?.contains(e.target as Node))
        setShowUpdatesPanel(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowUpdatesPanel(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showUpdatesPanel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)] flex items-center gap-2">
            <Landmark className="h-6 w-6 text-[#B8956A]" />
            CRE Scanner
          </h1>
          <p className="mt-1 text-sm text-[#6B6560]">Minneapolis · St. Paul</p>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={updatesPanelRef}>
          <button
            onClick={() => setShowUpdatesPanel((o) => !o)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              showUpdatesPanel
                ? "border-[#B8956A]/40 bg-[#B8956A]/10 text-[#E8E4DF]"
                : "border-[#1A1816] text-[#6B6560] hover:border-[#6B6560] hover:text-[#E8E4DF] hover:bg-[#1A1816]"
            )}
            aria-label={`CRE updates${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <span className="relative inline-flex">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0D0C0A]" />
              )}
            </span>
            <span className="hidden sm:inline">Updates</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                {unreadCount}
              </span>
            )}
          </button>
          {showUpdatesPanel && (
            <CREUpdatesPanel
              items={notificationItems}
              unreadCount={unreadCount}
              onMarkRead={(key) => markRead({ updateKey: key })}
              onMarkAllRead={() =>
                markAllRead({
                  updateKeys: notificationItems
                    .filter((i) => i.unread)
                    .map((i) => i.updateKey),
                })
              }
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-1 rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-1 min-w-full sm:min-w-0 sm:w-fit">
          {[
            { key: "overview" as MainTab, label: "Overview", icon: BarChart3 },
            { key: "listings" as MainTab, label: "All Listings", icon: Building2 },
            { key: "watchlist" as MainTab, label: "Watchlist", icon: Star },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-[#B8956A] text-[#060606] shadow-sm"
                  : "text-[#6B6560] hover:text-[#E8E4DF]"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "listings" && <AllListingsTab />}
      {activeTab === "watchlist" && <WatchlistTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UPDATES PANEL
   ═══════════════════════════════════════════════════════════ */

function CREUpdatesPanel({
  items,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: {
  items: Array<{
    updateKey: string;
    kind: "new_listing" | "updated" | "price_drop";
    address: string;
    propertyType: string;
    askPrice: number;
    previousPrice?: number;
    score: number;
    title: string;
    summary: string;
    createdAt: number;
    unread: boolean;
  }>;
  unreadCount: number;
  onMarkRead: (key: string) => Promise<unknown>;
  onMarkAllRead: () => Promise<unknown>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const kindColor = (kind: string) => {
    if (kind === "new_listing") return "bg-blue-500/10 text-blue-400";
    if (kind === "price_drop") return "bg-red-500/10 text-red-400";
    return "bg-yellow-500/10 text-yellow-400";
  };
  const kindLabel = (kind: string) => {
    if (kind === "new_listing") return "New";
    if (kind === "price_drop") return "Price Drop";
    return "Updated";
  };

  return (
    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-[#1A1816] bg-[#0D0C0A] shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-[#1A1816] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[#E8E4DF]">CRE Updates</p>
          <p className="mt-1 text-xs text-[#6B6560]">
            {unreadCount > 0
              ? `${unreadCount} unread — new listings, price drops, updates.`
              : "All caught up."}
          </p>
        </div>
        <button
          onClick={async () => {
            if (markingAll || unreadCount === 0) return;
            setMarkingAll(true);
            try {
              await onMarkAllRead();
            } finally {
              setMarkingAll(false);
            }
          }}
          disabled={markingAll || unreadCount === 0}
          className="rounded-lg border border-[#1A1816] px-3 py-1.5 text-xs text-[#E8E4DF] hover:bg-[#1A1816] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {markingAll ? "Marking…" : "Mark all read"}
        </button>
      </div>
      <div className="max-h-[28rem] divide-y divide-[#1A1816] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#6B6560]">
            No updates yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.updateKey}
              className={cn("px-5 py-4", item.unread && "bg-[#1A1816]/30")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shrink-0",
                    kindColor(item.kind)
                  )}
                >
                  {kindLabel(item.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#E8E4DF]">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#6B6560]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6B6560]">{item.summary}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!item.unread || busyKey === item.updateKey) return;
                    setBusyKey(item.updateKey);
                    try {
                      await onMarkRead(item.updateKey);
                    } finally {
                      setBusyKey(null);
                    }
                  }}
                  disabled={!item.unread || busyKey === item.updateKey}
                  className="rounded-md border border-[#1A1816] px-2.5 py-1 text-[11px] text-[#E8E4DF] hover:bg-[#1A1816] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {item.unread ? (busyKey === item.updateKey ? "…" : "Mark read") : "Read"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════ */

function OverviewTab() {
  const stats = useQuery(api.cre.getStats);
  const topProperties = useQuery(api.cre.listProperties, {
    sortBy: "score",
    limit: 10,
  });
  const watchlistItems = useQuery(api.cre.listWatchlist);
  const watchlistIds = new Set((watchlistItems ?? []).map((w) => w.propertyId));

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Active Listings"
          value={stats?.totalActive != null ? String(stats.totalActive) : "—"}
        />
        <StatCard
          label="New Today"
          value={stats?.newToday != null ? String(stats.newToday) : "—"}
        />
        <StatCard
          label="Price Drops"
          value={stats?.priceDrops != null ? String(stats.priceDrops) : "—"}
        />
        <StatCard
          label="Avg $/SF"
          value={
            stats?.avgPriceSF ? `$${stats.avgPriceSF.toLocaleString()}` : "—"
          }
        />
        <StatCard
          label="Avg Cap Rate"
          value={stats?.avgCapRate ? `${stats.avgCapRate}%` : "—"}
        />
      </div>

      {/* By Type Breakdown */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <span
              key={type}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                PROPERTY_TYPE_COLORS[type as PropertyType] ?? "bg-[#1A1816] text-[#6B6560]"
              )}
            >
              {PROPERTY_TYPE_LABELS[type as PropertyType] ?? type} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Top Opportunities */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#B8956A]" />
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Top Opportunities
          </h2>
          <span className="text-xs text-[#6B6560]">by score</span>
        </div>
        {!topProperties ? (
          <div className="text-center py-12 text-[#6B6560] text-sm">
            Loading…
          </div>
        ) : topProperties.length === 0 ? (
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
            <p className="text-sm font-medium text-[#E8E4DF]">No listings yet</p>
            <p className="text-xs text-[#6B6560] mt-1">
              Run the CRE scanner to populate listings
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProperties.map((p) => (
              <PropertyCard
                key={p._id}
                property={p}
                isWatchlisted={watchlistIds.has(p._id)}
                defaultOpen={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALL LISTINGS TAB
   ═══════════════════════════════════════════════════════════ */

function AllListingsTab() {
  const [filterType, setFilterType] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("score");

  const properties = useQuery(api.cre.listProperties, {
    propertyType: filterType || undefined,
    sortBy,
    limit: 100,
  });
  const watchlistItems = useQuery(api.cre.listWatchlist);
  const watchlistIds = new Set((watchlistItems ?? []).map((w) => w.propertyId));

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-[#6B6560]">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-1.5 text-xs text-[#E8E4DF] focus:border-[#B8956A] focus:outline-none"
        >
          <option value="">All Types</option>
          {(
            [
              "office",
              "retail",
              "industrial",
              "multifamily",
              "mixed_use",
              "land",
              "special_purpose",
            ] as PropertyType[]
          ).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-1.5 text-xs text-[#E8E4DF] focus:border-[#B8956A] focus:outline-none"
        >
          <option value="score">Sort: Score</option>
          <option value="price">Sort: Price</option>
          <option value="newest">Sort: Newest</option>
          <option value="priceSF">Sort: $/SF</option>
        </select>
        {properties && (
          <span className="ml-auto text-xs text-[#6B6560]">
            {properties.length} listing{properties.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Listings */}
      {!properties ? (
        <div className="text-center py-12 text-[#6B6560] text-sm">Loading…</div>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
          <p className="text-sm font-medium text-[#E8E4DF]">No listings found</p>
          <p className="text-xs text-[#6B6560] mt-1">
            Try adjusting your filters or run the scanner
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <PropertyCard
              key={p._id}
              property={p}
              isWatchlisted={watchlistIds.has(p._id)}
              defaultOpen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WATCHLIST TAB
   ═══════════════════════════════════════════════════════════ */

function WatchlistTab() {
  const watchlistItems = useQuery(api.cre.listWatchlist);
  const removeFromWatchlist = useMutation(api.cre.removeFromWatchlist);
  const updateNotes = useMutation(api.cre.updateWatchlistNotes);

  if (!watchlistItems) {
    return <div className="text-center py-12 text-[#6B6560] text-sm">Loading…</div>;
  }

  if (watchlistItems.length === 0) {
    return (
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-16 text-center">
        <Star className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
        <p className="text-sm font-medium text-[#E8E4DF]">No properties watchlisted</p>
        <p className="text-xs text-[#6B6560] mt-1">
          Star a property from All Listings to track it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {watchlistItems.map((item) => (
        <WatchlistCard
          key={item._id}
          item={item}
          onRemove={() => removeFromWatchlist({ propertyId: item.propertyId })}
          onUpdateNotes={(notes) =>
            updateNotes({ propertyId: item.propertyId, notes })
          }
        />
      ))}
    </div>
  );
}

function WatchlistCard({
  item,
  onRemove,
  onUpdateNotes,
}: {
  item: any;
  onRemove: () => void;
  onUpdateNotes: (notes: string) => Promise<unknown>;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await onUpdateNotes(notesVal);
      setEditingNotes(false);
    } finally {
      setSaving(false);
    }
  };

  const p = item.property;

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <MapPin className="h-3.5 w-3.5 text-[#B8956A] shrink-0" />
            <span className="text-sm font-bold text-[#E8E4DF]">{p.address}</span>
            <span className="text-xs text-[#6B6560]">{p.city}</span>
            <TypeBadge type={p.propertyType} />
            <ScoreBadge score={p.score} />
          </div>
          <div className="flex items-center gap-4 text-xs text-[#6B6560] flex-wrap mt-1">
            <span className="font-semibold text-[#E8E4DF]">{fmt$(p.askPrice)}</span>
            {p.pricePerSF && <span>${p.pricePerSF}/SF</span>}
            {p.squareFeet && <span>{p.squareFeet.toLocaleString()} SF</span>}
            {p.capRate && <span>{p.capRate}% cap</span>}
          </div>

          {/* Notes */}
          <div className="mt-3">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  rows={3}
                  placeholder="Add notes…"
                  className="w-full rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-xs text-[#E8E4DF] placeholder-[#6B6560]/50 focus:border-[#B8956A] focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md bg-[#B8956A] px-3 py-1 text-xs text-[#060606] hover:bg-[#CDAA7E] disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setNotesVal(item.notes ?? "");
                      setEditingNotes(false);
                    }}
                    className="flex items-center gap-1 rounded-md border border-[#1A1816] px-3 py-1 text-xs text-[#6B6560] hover:text-[#E8E4DF] hover:bg-[#1A1816]"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="flex items-center gap-1.5 text-xs text-[#6B6560] hover:text-[#E8E4DF] transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {item.notes ? (
                  <span className="text-[#E8E4DF]/70">{item.notes}</span>
                ) : (
                  <span className="italic">Add notes…</span>
                )}
              </button>
            )}
          </div>

          {p.flags && p.flags.filter((f: string) => f !== "UPDATED").length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {p.flags
                .filter((f: string) => f !== "UPDATED")
                .map((f: string) => (
                  <FlagBadge key={f} flag={f} previousPrice={p.previousPrice} />
                ))}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg border border-[#1A1816] p-1.5 text-[#6B6560] hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
          title="Remove from watchlist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {p.source && (
        <div className="mt-3 pt-3 border-t border-[#1A1816] flex items-center gap-2 text-[10px] text-[#6B6560]">
          <Tag className="h-3 w-3" />
          <span>{p.source}</span>
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-[#B8956A] hover:underline flex items-center gap-1"
            >
              View listing <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <span className="ml-auto text-[#6B6560]">
            Added {new Date(item.addedAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPERTY CARD (used in Overview + All Listings)
   ═══════════════════════════════════════════════════════════ */

function PropertyCard({
  property,
  isWatchlisted,
  defaultOpen,
}: {
  property: any;
  isWatchlisted: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const addToWatchlist = useMutation(api.cre.addToWatchlist);
  const removeFromWatchlist = useMutation(api.cre.removeFromWatchlist);
  const [watchBusy, setWatchBusy] = useState(false);

  const displayFlags = (property.flags ?? []).filter(
    (f: string) => f === "NEW" || f === "PRICE_DROP"
  );

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (watchBusy) return;
    setWatchBusy(true);
    try {
      if (isWatchlisted) {
        await removeFromWatchlist({ propertyId: property._id });
      } else {
        await addToWatchlist({ propertyId: property._id });
      }
    } finally {
      setWatchBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
      {/* Card Header Row */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-[#1A1816]/30 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-[#6B6560] transition-transform mt-0.5 shrink-0",
            open && "rotate-90"
          )}
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Address + city */}
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="h-3.5 w-3.5 text-[#B8956A] shrink-0" />
            <span className="text-sm font-bold text-[#E8E4DF]">
              {property.address}
            </span>
            <span className="text-xs text-[#6B6560]">{property.city}</span>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={property.propertyType} />
            <ScoreBadge score={property.score} />
            {displayFlags.map((f: string) => (
              <FlagBadge key={f} flag={f} previousPrice={property.previousPrice} />
            ))}
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-[#6B6560]">
            <span className="font-semibold text-[#E8E4DF]">
              {fmt$(property.askPrice)}
            </span>
            {property.pricePerSF && <span>${property.pricePerSF}/SF</span>}
            {property.squareFeet && (
              <span>{property.squareFeet.toLocaleString()} SF</span>
            )}
            {property.capRate && <span>{property.capRate}% cap</span>}
            {property.daysOnMarket && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {property.daysOnMarket}d on market
              </span>
            )}
          </div>

          {/* Source badges */}
          {property.allSources && property.allSources.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {property.allSources.map((s: any) => (
                <span
                  key={s.source}
                  className="rounded bg-[#1A1816] px-1.5 py-0.5 text-[10px] text-[#6B6560]"
                >
                  {s.source}
                </span>
              ))}
            </div>
          ) : (
            <span className="inline-block rounded bg-[#1A1816] px-1.5 py-0.5 text-[10px] text-[#6B6560]">
              {property.source}
            </span>
          )}
        </div>

        {/* Watchlist star */}
        <button
          onClick={toggleWatchlist}
          disabled={watchBusy}
          className={cn(
            "rounded-lg p-1.5 transition-colors shrink-0",
            isWatchlisted
              ? "text-[#B8956A] bg-[#B8956A]/10"
              : "text-[#6B6560] hover:text-[#B8956A] hover:bg-[#B8956A]/10"
          )}
          title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star
            className={cn("h-4 w-4", isWatchlisted && "fill-[#B8956A]")}
          />
        </button>
      </button>

      {/* Expanded Detail */}
      {open && (
        <div className="border-t border-[#1A1816]">
          <PropertyDetail property={property} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPERTY DETAIL (expanded panel)
   ═══════════════════════════════════════════════════════════ */

function PropertyDetail({ property }: { property: any }) {
  return (
    <div className="px-5 py-5 space-y-5">
      {/* Property Info Header */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {property.yearBuilt && (
          <DetailCell label="Year Built" value={String(property.yearBuilt)} />
        )}
        {property.zoning && (
          <DetailCell label="Zoning" value={property.zoning} />
        )}
        {property.units && (
          <DetailCell label="Units" value={String(property.units)} />
        )}
        {property.listingAgent && (
          <DetailCell label="Listing Agent" value={property.listingAgent} />
        )}
        {property.listingBrokerage && (
          <DetailCell label="Brokerage" value={property.listingBrokerage} />
        )}
        {property.listingDate && (
          <DetailCell label="Listed" value={property.listingDate} />
        )}
      </div>

      {/* Assessed Value Comparison */}
      {property.assessedValue && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider mb-3">
            Assessed vs. Ask
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-[#6B6560]">Assessed Value</p>
              <p className="text-lg font-bold text-[#E8E4DF]">
                {fmt$(property.assessedValue)}
              </p>
              {property.assessedValueSource && (
                <p className="text-[10px] text-[#6B6560]">
                  {property.assessedValueSource}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#6B6560]">Ask Price</p>
              <p className="text-lg font-bold text-[#E8E4DF]">
                {fmt$(property.askPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B6560]">Ask vs. Assessed</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  property.askPrice < property.assessedValue
                    ? "text-green-400"
                    : "text-red-400"
                )}
              >
                {(
                  (property.askPrice / property.assessedValue) *
                  100
                ).toFixed(0)}
                %
              </p>
              <p className="text-[10px] text-[#6B6560]">of assessed</p>
            </div>
          </div>
        </div>
      )}

      {/* Investment Memo */}
      {property.investmentMemo && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider mb-3">
            Investment Memo
          </p>
          <div className="text-sm text-[#E8E4DF]/80 leading-relaxed cre-memo">
            <MarkdownContent content={property.investmentMemo} />
          </div>
        </div>
      )}

      {/* Score Justification (if no full memo) */}
      {!property.investmentMemo && property.scoreJustification && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider mb-2">
            Score Justification
          </p>
          <p className="text-sm text-[#6B6560]">{property.scoreJustification}</p>
        </div>
      )}

      {/* Comps Table */}
      {property.comps && property.comps.length > 0 && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
          <div className="border-b border-[#1A1816] px-4 py-3">
            <p className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider">
              Comparable Properties
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1A1816] text-[#6B6560]">
                  <th className="px-4 py-2 text-left font-medium">Address</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">$/SF</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Distance</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1816]">
                {property.comps.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-[#1A1816]/30">
                    <td className="px-4 py-2 text-[#E8E4DF] max-w-[180px] truncate">
                      {c.address}
                    </td>
                    <td className="px-3 py-2 text-[#6B6560]">{c.type}</td>
                    <td className="px-3 py-2 text-right text-[#E8E4DF]">
                      {fmt$(c.price)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#6B6560]">
                      {c.pricePerSF ? `$${c.pricePerSF}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-[#6B6560]">{c.date ?? "—"}</td>
                    <td className="px-3 py-2 text-[#6B6560]">
                      {c.distance ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[#6B6560]">
                      {c.sourceUrl ? (
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#B8956A] hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.source ?? "link"}{" "}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        c.source ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {property.riskFlags && property.riskFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Risk Flags
            </p>
          </div>
          <ul className="space-y-1">
            {property.riskFlags.map((f: string) => (
              <li key={f} className="text-sm text-red-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price History */}
      {property.priceHistory && property.priceHistory.length > 1 && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-xs font-semibold text-[#B8956A] uppercase tracking-wider mb-3">
            Price History
          </p>
          <div className="space-y-1">
            {[...property.priceHistory].reverse().map((h: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-[#6B6560]">{h.date}</span>
                <span className="text-[#E8E4DF] font-medium">
                  {fmt$(h.price)}
                </span>
                {h.source && (
                  <span className="text-[#6B6560]">{h.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Links */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1A1816]">
        {property.sourceUrl && (
          <a
            href={property.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#B8956A] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            View on {property.source}
          </a>
        )}
        {property.allSources &&
          property.allSources
            .filter((s: any) => s.url && s.source !== property.source)
            .map((s: any) => (
              <a
                key={s.source}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#B8956A] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                View on {s.source}
              </a>
            ))}
        <span className="ml-auto text-[10px] text-[#6B6560]">
          Updated {new Date(property.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   MARKDOWN RENDERER (lightweight — no external dependency)
   ═══════════════════════════════════════════════════════════ */

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inTable = false;
  let key = 0;

  const flushTable = () => {
    if (tableHeaders.length > 0) {
      elements.push(
        <div key={key++} className="overflow-x-auto my-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1A1816]">
                {tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-medium text-[#6B6560]"
                  >
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#1A1816]/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[#E8E4DF]">
                      <InlineMarkdown text={cell.trim()} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table separator row (|---|---|)
    if (/^\|[\s\-:|]+\|$/.test(line)) {
      continue;
    }

    // Table row
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    // If we were in a table and hit a non-table line, flush
    if (inTable) {
      flushTable();
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(
        <hr key={key++} className="border-[#1A1816] my-3" />
      );
      continue;
    }

    // Headings
    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={key++}
          className="text-sm font-semibold text-[#B8956A] mt-4 mb-2"
        >
          {line.slice(3)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2
          key={key++}
          className="text-base font-bold text-[#E8E4DF] mt-4 mb-2"
        >
          {line.slice(2)}
        </h2>
      );
      continue;
    }

    // List items
    if (/^[-•*]\s/.test(line)) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[#6B6560] shrink-0 mt-0.5">•</span>
          <span>
            <InlineMarkdown text={line.replace(/^[-•*]\s/, "")} />
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="my-1">
        <InlineMarkdown text={line} />
      </p>
    );
  }

  // Flush any remaining table
  if (inTable) flushTable();

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Parse bold (**text**), italic (*text*), and links [text](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    // Italic: *text* (but not inside bold)
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);

    // Find the earliest match
    type MatchInfo = { type: string; index: number; match: RegExpMatchArray };
    const candidates: MatchInfo[] = [];

    if (boldMatch && boldMatch[1] !== undefined) {
      candidates.push({ type: "bold", index: boldMatch[1].length, match: boldMatch });
    }
    if (linkMatch && linkMatch[1] !== undefined) {
      candidates.push({ type: "link", index: linkMatch[1].length, match: linkMatch });
    }
    if (italicMatch && italicMatch[1] !== undefined && (!boldMatch || italicMatch[1].length < boldMatch[1].length)) {
      candidates.push({ type: "italic", index: italicMatch[1].length, match: italicMatch });
    }

    if (candidates.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const winner = candidates[0];

    if (winner.type === "bold") {
      const m = winner.match;
      if (m[1]) parts.push(<span key={key++}>{m[1]}</span>);
      parts.push(
        <strong key={key++} className="font-semibold text-[#E8E4DF]">
          {m[2]}
        </strong>
      );
      remaining = m[3];
    } else if (winner.type === "italic") {
      const m = winner.match;
      if (m[1]) parts.push(<span key={key++}>{m[1]}</span>);
      parts.push(
        <em key={key++} className="italic text-[#E8E4DF]/70">
          {m[2]}
        </em>
      );
      remaining = m[3];
    } else if (winner.type === "link") {
      const m = winner.match;
      if (m[1]) parts.push(<span key={key++}>{m[1]}</span>);
      parts.push(
        <a
          key={key++}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B8956A] hover:underline"
        >
          {m[2]}
        </a>
      );
      remaining = m[4];
    }
  }

  return <>{parts}</>;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
      <p className="text-xs text-[#6B6560] mb-1">{label}</p>
      <p className="text-xl font-bold text-[#E8E4DF]">{value}</p>
      {sub && <p className="text-[10px] text-[#6B6560] mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#6B6560]">{label}</p>
      <p className="text-sm text-[#E8E4DF] font-medium">{value}</p>
    </div>
  );
}

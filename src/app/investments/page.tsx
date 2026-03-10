"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  X,
  ChevronRight,
  Bell,
  Check,
  Shield,
  Flame,
  Lightbulb,
  Activity,
  Gauge,
  Brain,
  Home,
  Target,
  Radio,
  BarChart3,
  Trophy,
  Clock,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  BookOpen,
  Zap,
  Globe,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const MonteCarloTab = dynamic(() => import("@/components/quant/MonteCarloTab"), { ssr: false });
const PaperTradesTab = dynamic(() => import("@/components/quant/PaperTradesTab"), { ssr: false });
const SentimentTab = dynamic(() => import("@/components/quant/SentimentTab"), { ssr: false });

type MainTab = "home" | "positions" | "signal_engine" | "trade_system" | "track_record";

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Investment Hub
          </h1>
          <p className="mt-1 text-sm text-[#6B6560]">
            Portfolio pulse · Signals · Trade system · Track record
          </p>
        </div>
        {activeTab === "positions" && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#B8956A] px-4 py-2 text-sm font-medium text-[#060606] hover:bg-[#CDAA7E] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Position
          </button>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-1 w-fit">
        {[
          { key: "home" as MainTab, label: "Home", icon: Home },
          { key: "positions" as MainTab, label: "Positions", icon: Target },
          { key: "signal_engine" as MainTab, label: "Signal Engine", icon: Radio },
          { key: "trade_system" as MainTab, label: "Trade System", icon: BarChart3 },
          { key: "track_record" as MainTab, label: "Track Record", icon: Trophy },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
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

      {/* Tab Content */}
      {activeTab === "home" && <HomeTab />}
      {activeTab === "positions" && <PositionsTab />}
      {activeTab === "signal_engine" && <SignalEngineTab />}
      {activeTab === "trade_system" && <TradeSystemTab />}
      {activeTab === "track_record" && <TrackRecordTab />}

      {/* Add Position Modal */}
      {showAddForm && <AddPositionModal onClose={() => setShowAddForm(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 1: HOME — Portfolio Pulse
   ═══════════════════════════════════════════════════════════ */

function HomeTab() {
  const allPositions = useQuery(api.investments.listPositions, {});
  const alerts = useQuery(api.investments.listAlerts, { acknowledged: false, limit: 5 });
  const latestBriefing = useQuery(api.signals.getLatestBriefing);

  const activePositions = useMemo(
    () => allPositions?.filter((p) => p.status === "active") ?? [],
    [allPositions]
  );
  const highRisk = activePositions.filter((p) => p.portfolioType === "high_risk");
  const lowRisk = activePositions.filter((p) => p.portfolioType === "low_risk");

  const totalValue = useMemo(() => {
    return activePositions.reduce((sum, p) => {
      if (p.shares && p.entryPrice) return sum + p.shares * p.entryPrice;
      return sum;
    }, 0);
  }, [activePositions]);

  const criticalAlerts = alerts?.filter((a) => a.severity === "high" || a.severity === "critical") ?? [];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Portfolio Value" value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} />
        <StatCard label="Today's P&L" value="—" muted />
        <StatCard label="Unrealized P&L" value="—" muted />
        <StatCard label="Positions" value={String(activePositions.length)} />
        <StatCard
          label="Risk Budget"
          value={`${highRisk.length}H / ${lowRisk.length}L`}
          sub={`${activePositions.length} total`}
        />
      </div>

      {/* Quick Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Active Alerts</span>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div key={alert._id} className="flex items-start gap-3 text-sm">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5",
                  alert.severity === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
                )}>
                  {alert.severity}
                </span>
                <div>
                  <span className="text-[#B8956A] font-medium mr-2">{alert.ticker}</span>
                  <span className="text-[#E8E4DF]">{alert.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PortfolioColumn
          title="High Risk"
          icon={<Flame className="h-5 w-5 text-red-400" />}
          positions={highRisk}
          color="red"
        />
        <PortfolioColumn
          title="Low Risk"
          icon={<Shield className="h-5 w-5 text-blue-400" />}
          positions={lowRisk}
          color="blue"
        />
      </div>

      {/* Latest Signal */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-4 w-4 text-[#B8956A]" />
          <span className="text-sm font-semibold text-[#E8E4DF]">Latest Signal</span>
        </div>
        {latestBriefing ? (
          <div>
            <p className="text-xs text-[#6B6560] mb-1">{latestBriefing.date} · {latestBriefing.marketStatus}</p>
            {latestBriefing.sections.slice(0, 2).map((s, i) => (
              <p key={i} className="text-sm text-[#E8E4DF]/80">
                {s.ticker && <span className="text-[#B8956A] mr-1">{s.ticker}</span>}
                {s.title}: {s.summary.slice(0, 120)}{s.summary.length > 120 ? "..." : ""}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B6560]">No signals yet. Morning briefing generates at 6:00 AM CT.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
      <p className="text-xs text-[#6B6560] mb-1">{label}</p>
      <p className={cn("text-xl font-bold", muted ? "text-[#6B6560]" : "text-[#E8E4DF]")}>{value}</p>
      {sub && <p className="text-[10px] text-[#6B6560] mt-0.5">{sub}</p>}
    </div>
  );
}

function PortfolioColumn({
  title,
  icon,
  positions,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  positions: any[];
  color: "red" | "blue";
}) {
  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#1A1816] px-5 py-4">
        {icon}
        <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">{title}</h2>
        <span className={cn(
          "ml-auto rounded-full px-2.5 py-0.5 text-xs",
          color === "red" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
        )}>
          {positions.length} active
        </span>
      </div>
      <div className="divide-y divide-[#1A1816]">
        {positions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#6B6560]">
            No {title.toLowerCase()} positions yet.
          </div>
        ) : (
          positions.map((pos) => (
            <div key={pos._id} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#E8E4DF]">{pos.ticker}</span>
                <span className="text-xs text-[#6B6560]">{pos.name}</span>
                {pos.shares && pos.entryPrice && (
                  <span className="ml-auto text-xs text-[#6B6560]">
                    {pos.shares} @ ${pos.entryPrice}
                  </span>
                )}
              </div>
              {pos.thesis && (
                <p className="mt-1 text-xs text-[#6B6560] line-clamp-1">{pos.thesis}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2: POSITIONS — Full Pitzy Model (preserved)
   ═══════════════════════════════════════════════════════════ */

type PositionsSubTab = "portfolios" | "alerts" | "opportunities" | "track_record" | "monte_carlo" | "paper_trades" | "sentiment";

function PositionsTab() {
  const [subTab, setSubTab] = useState<PositionsSubTab>("portfolios");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex items-center gap-1 border-b border-[#1A1816] pb-3 flex-wrap">
        {[
          { key: "portfolios" as PositionsSubTab, label: "Portfolios" },
          { key: "alerts" as PositionsSubTab, label: "Alerts" },
          { key: "opportunities" as PositionsSubTab, label: "Opportunities" },
          { key: "track_record" as PositionsSubTab, label: "Track Record" },
          { key: "monte_carlo" as PositionsSubTab, label: "Monte Carlo" },
          { key: "paper_trades" as PositionsSubTab, label: "Paper Trades" },
          { key: "sentiment" as PositionsSubTab, label: "Sentiment" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              subTab === tab.key
                ? "text-[#E8E4DF] bg-[#1A1816]"
                : "text-[#6B6560] hover:text-[#E8E4DF]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "portfolios" && (
        <PortfolioView
          selectedPosition={selectedPosition}
          setSelectedPosition={setSelectedPosition}
        />
      )}
      {subTab === "alerts" && <AlertsView />}
      {subTab === "opportunities" && <OpportunitiesView />}
      {subTab === "track_record" && <OpportunityTrackRecordView />}
      {subTab === "monte_carlo" && <MonteCarloTab />}
      {subTab === "paper_trades" && <PaperTradesTab />}
      {subTab === "sentiment" && <SentimentTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3: SIGNAL ENGINE
   ═══════════════════════════════════════════════════════════ */

type SignalSubTab = "briefing" | "events" | "macro";

function SignalEngineTab() {
  const [subTab, setSubTab] = useState<SignalSubTab>("briefing");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-[#1A1816] pb-3">
        {[
          { key: "briefing" as SignalSubTab, label: "Morning Briefing" },
          { key: "events" as SignalSubTab, label: "Event Scanner" },
          { key: "macro" as SignalSubTab, label: "Macro Context" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              subTab === tab.key
                ? "text-[#E8E4DF] bg-[#1A1816]"
                : "text-[#6B6560] hover:text-[#E8E4DF]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "briefing" && <MorningBriefing />}
      {subTab === "events" && <EventScanner />}
      {subTab === "macro" && <MacroContext />}
    </div>
  );
}

function MorningBriefing() {
  const today = new Date().toISOString().split("T")[0];
  const briefing = useQuery(api.signals.getBriefingByDate, { date: today });
  const latestBriefing = useQuery(api.signals.getLatestBriefing);
  const data = briefing ?? latestBriefing;

  const sectionTypes = ["Overnight Developments", "SEC Filings", "Insider Transactions", "Unusual Activity", "Macro Events"];

  if (!data) {
    return (
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-16 text-center">
        <Clock className="mx-auto h-10 w-10 text-[#6B6560] mb-4" />
        <p className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Morning Briefing</p>
        <p className="text-sm text-[#6B6560] mt-2">Generates at 6:00 AM CT</p>
        <p className="text-xs text-[#6B6560] mt-1">Market intelligence, SEC filings, insider activity, and macro events</p>
      </div>
    );
  }

  const getMarketStatusColor = (status: string) => {
    if (status.toLowerCase().includes("open")) return "text-green-400 bg-green-500/10";
    if (status.toLowerCase().includes("pre")) return "text-yellow-400 bg-yellow-500/10";
    if (status.toLowerCase().includes("after")) return "text-blue-400 bg-blue-500/10";
    return "text-[#6B6560] bg-[#1A1816]";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">{data.date}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", getMarketStatusColor(data.marketStatus))}>
          {data.marketStatus}
        </span>
      </div>

      {/* Sections */}
      {sectionTypes.map((sType) => {
        const items = data.sections.filter((s) => s.type === sType);
        if (items.length === 0) return null;
        return (
          <div key={sType} className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
            <div className="border-b border-[#1A1816] px-5 py-3">
              <h3 className="text-sm font-semibold text-[#E8E4DF]">{sType}</h3>
            </div>
            <div className="divide-y divide-[#1A1816]">
              {items.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <ImportanceBadge importance={item.importance} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.ticker && <span className="text-xs font-semibold text-[#B8956A]">{item.ticker}</span>}
                      <span className="text-sm font-medium text-[#E8E4DF]">{item.title}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#6B6560]">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportanceBadge({ importance }: { importance: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5",
      importance === "high" ? "bg-red-500/10 text-red-400" :
      importance === "medium" ? "bg-yellow-500/10 text-yellow-400" :
      "bg-[#1A1816] text-[#6B6560]"
    )}>
      {importance}
    </span>
  );
}

function EventScanner() {
  const events = useQuery(api.signals.listEventScans, { status: "active", limit: 50 });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  const eventTypes = ["Insider Cluster", "Activist 13D", "Merger Arb", "FDA Calendar", "Earnings Whisper"];

  const filtered = useMemo(() => {
    if (!events) return [];
    let result = events;
    if (typeFilter !== "all") result = result.filter((e) => e.eventType === typeFilter);
    if (sectorFilter !== "all") result = result.filter((e) => e.sector === sectorFilter);
    return result;
  }, [events, typeFilter, sectorFilter]);

  const sectors = useMemo(() => {
    if (!events) return [];
    return [...new Set(events.map((e) => e.sector).filter(Boolean))];
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-16 text-center">
        <Search className="mx-auto h-10 w-10 text-[#6B6560] mb-4" />
        <p className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Event Scanner</p>
        <p className="text-sm text-[#6B6560] mt-2">Runs continuously during market hours</p>
        <p className="text-xs text-[#6B6560] mt-1">Tracks insider clusters, activist filings, merger arb, FDA calendar, earnings whispers</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-[#6B6560]" />
          <span className="text-xs text-[#6B6560]">Filter:</span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-1.5 text-xs text-[#E8E4DF] focus:border-[#B8956A] focus:outline-none"
        >
          <option value="all">All Types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {sectors.length > 0 && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-1.5 text-xs text-[#E8E4DF] focus:border-[#B8956A] focus:outline-none"
          >
            <option value="all">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s!}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Event Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((event) => (
          <div key={event._id} className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-[#B8956A]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#B8956A]">
                {event.eventType}
              </span>
              {event.sector && (
                <span className="rounded-full bg-[#1A1816] px-2 py-0.5 text-[10px] text-[#6B6560]">
                  {event.sector}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-[#E8E4DF]">{event.ticker}</span>
              <span className="text-sm text-[#E8E4DF]">{event.title}</span>
            </div>
            <p className="text-sm text-[#6B6560] mb-3">{event.summary}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6B6560]">Pitzy Score:</span>
                <span className={cn(
                  "text-sm font-bold",
                  event.pitzyScore >= 7 ? "text-green-400" :
                  event.pitzyScore >= 4 ? "text-yellow-400" :
                  "text-red-400"
                )}>
                  {event.pitzyScore}/10
                </span>
              </div>
              <span className="text-[10px] text-[#6B6560]">
                {new Date(event.detectedAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroContext() {
  const macro = useQuery(api.signals.getLatestMacro);
  const positions = useQuery(api.investments.listPositions, {});
  const activePositions = positions?.filter((p) => p.status === "active") ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Fed Funds Rate */}
        <MacroCard title="Fed Funds Rate" icon={<DollarSign className="h-4 w-4" />}>
          {macro?.fedFundsRate != null ? (
            <div>
              <p className="text-2xl font-bold text-[#E8E4DF]">{macro.fedFundsRate}%</p>
              {macro.fedNextMeeting && <p className="text-xs text-[#6B6560] mt-1">Next meeting: {macro.fedNextMeeting}</p>}
              {macro.fedChangeProb != null && <p className="text-xs text-[#6B6560]">Change prob: {macro.fedChangeProb}%</p>}
            </div>
          ) : (
            <MacroEmpty text="Fed rate data pending" />
          )}
        </MacroCard>

        {/* VIX */}
        <MacroCard title="VIX" icon={<Activity className="h-4 w-4" />}>
          {macro?.vix != null ? (
            <div>
              <p className={cn(
                "text-2xl font-bold",
                macro.vix < 15 ? "text-green-400" :
                macro.vix <= 25 ? "text-yellow-400" :
                "text-red-400"
              )}>
                {macro.vix}
              </p>
              {macro.vixTrend && (
                <div className="flex items-center gap-1 mt-1">
                  {macro.vixTrend === "up" && <ArrowUp className="h-3 w-3 text-red-400" />}
                  {macro.vixTrend === "down" && <ArrowDown className="h-3 w-3 text-green-400" />}
                  {macro.vixTrend === "flat" && <Minus className="h-3 w-3 text-[#6B6560]" />}
                  <span className="text-xs text-[#6B6560] capitalize">{macro.vixTrend}</span>
                </div>
              )}
            </div>
          ) : (
            <MacroEmpty text="VIX data pending" />
          )}
        </MacroCard>

        {/* Yield Curve */}
        <MacroCard title="Yield Curve" icon={<LineChart className="h-4 w-4" />}>
          {macro?.yieldCurveStatus ? (
            <div>
              <span className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold",
                macro.yieldCurveStatus === "Normal" ? "bg-green-500/10 text-green-400" :
                macro.yieldCurveStatus === "Flat" ? "bg-yellow-500/10 text-yellow-400" :
                "bg-red-500/10 text-red-400"
              )}>
                {macro.yieldCurveStatus}
              </span>
              {macro.yield2y10ySpread != null && (
                <p className="text-xs text-[#6B6560] mt-2">2Y-10Y Spread: {macro.yield2y10ySpread}bps</p>
              )}
            </div>
          ) : (
            <MacroEmpty text="Yield curve data pending" />
          )}
        </MacroCard>

        {/* Dollar Index */}
        <MacroCard title="Dollar Index (DXY)" icon={<Globe className="h-4 w-4" />}>
          {macro?.dxy != null ? (
            <div>
              <p className="text-2xl font-bold text-[#E8E4DF]">{macro.dxy}</p>
              {macro.dxyTrend && (
                <div className="flex items-center gap-1 mt-1">
                  {macro.dxyTrend === "up" && <ArrowUp className="h-3 w-3 text-green-400" />}
                  {macro.dxyTrend === "down" && <ArrowDown className="h-3 w-3 text-red-400" />}
                  {macro.dxyTrend === "flat" && <Minus className="h-3 w-3 text-[#6B6560]" />}
                  <span className="text-xs text-[#6B6560] capitalize">{macro.dxyTrend}</span>
                </div>
              )}
            </div>
          ) : (
            <MacroEmpty text="DXY data pending" />
          )}
        </MacroCard>

        {/* Sector Rotation */}
        <MacroCard title="Sector Rotation" icon={<BarChart3 className="h-4 w-4" />}>
          {macro?.sectorRotation ? (
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(macro.sectorRotation as Record<string, number>).map(([sector, value]) => (
                <div
                  key={sector}
                  className={cn(
                    "rounded px-2 py-1 text-center text-[10px]",
                    (value as number) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}
                >
                  {sector}
                </div>
              ))}
            </div>
          ) : (
            <MacroEmpty text="Sector data pending" />
          )}
        </MacroCard>

        {/* Earnings Calendar */}
        <MacroCard title="Earnings Calendar" icon={<Calendar className="h-4 w-4" />}>
          {macro?.earningsCalendar && macro.earningsCalendar.length > 0 ? (
            <div className="space-y-1.5">
              {macro.earningsCalendar.slice(0, 5).map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#E8E4DF]">{e.ticker}</span>
                  <span className="text-[#6B6560]">{e.date}</span>
                  {e.estimate && <span className="text-[#6B6560]">Est: {e.estimate}</span>}
                </div>
              ))}
            </div>
          ) : activePositions.length > 0 ? (
            <MacroEmpty text="No upcoming earnings for your positions" />
          ) : (
            <MacroEmpty text="Add positions to track earnings" />
          )}
        </MacroCard>
      </div>
    </div>
  );
}

function MacroCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
      <div className="flex items-center gap-2 mb-3 text-[#B8956A]">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function MacroEmpty({ text }: { text: string }) {
  return <p className="text-sm text-[#6B6560]">{text}</p>;
}

/* ═══════════════════════════════════════════════════════════
   TAB 4: TRADE SYSTEM
   ═══════════════════════════════════════════════════════════ */

function TradeSystemTab() {
  const positions = useQuery(api.investments.listPositions, {});
  const tradeRules = useQuery(api.trades.listTradeRules);
  const decisions = useQuery(api.trades.listTradeDecisions, { limit: 30 });

  const activePositions = positions?.filter((p) => p.status === "active") ?? [];

  const rulesMap = useMemo(() => {
    const map = new Map<string, any>();
    tradeRules?.forEach((r) => map.set(r.positionId, r));
    return map;
  }, [tradeRules]);

  return (
    <div className="space-y-6">
      {/* Position Trade Zones */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="border-b border-[#1A1816] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Trade Zones</h2>
          <p className="text-xs text-[#6B6560] mt-1">Entry, add, trim, and stop zones for each position</p>
        </div>
        <div className="divide-y divide-[#1A1816]">
          {activePositions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Target className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
              <p className="text-sm text-[#6B6560]">Add active positions to define trade zones</p>
            </div>
          ) : (
            activePositions.map((pos) => {
              const rule = rulesMap.get(pos._id);
              return (
                <div key={pos._id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-[#E8E4DF]">{pos.ticker}</span>
                    <span className="text-xs text-[#6B6560]">{pos.name}</span>
                    {pos.entryPrice && (
                      <span className="ml-auto text-xs text-[#6B6560]">Entry: ${pos.entryPrice}</span>
                    )}
                  </div>
                  {rule ? (
                    <PriceRuler rule={rule} currentEntry={pos.entryPrice} />
                  ) : (
                    <p className="text-xs text-[#6B6560] italic">No trade zones defined yet. Use Milo to set zones for {pos.ticker}.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Decision Log */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="border-b border-[#1A1816] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Decision Log</h2>
          <p className="text-xs text-[#6B6560] mt-1">Trade decisions and system compliance</p>
        </div>
        <div className="divide-y divide-[#1A1816] max-h-[400px] overflow-y-auto">
          {(!decisions || decisions.length === 0) ? (
            <div className="px-5 py-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
              <p className="text-sm text-[#6B6560]">Decision log builds as you make trades</p>
              <p className="text-xs text-[#6B6560] mt-1">Every buy, sell, add, and trim gets logged here</p>
            </div>
          ) : (
            decisions.map((d) => (
              <div key={d._id} className="px-5 py-3 flex items-center gap-3">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  d.action === "buy" ? "bg-green-500/10 text-green-400" :
                  d.action === "sell" ? "bg-red-500/10 text-red-400" :
                  d.action === "add" ? "bg-blue-500/10 text-blue-400" :
                  d.action === "trim" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-[#1A1816] text-[#6B6560]"
                )}>
                  {d.action}
                </span>
                <span className="text-sm font-semibold text-[#E8E4DF]">{d.ticker}</span>
                <span className="text-xs text-[#6B6560]">${d.price}</span>
                {d.shares && <span className="text-xs text-[#6B6560]">{d.shares} shares</span>}
                {d.followedSystem != null && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px]",
                    d.followedSystem ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {d.followedSystem ? "✓ System" : "✗ Override"}
                  </span>
                )}
                {d.notes && <span className="text-xs text-[#6B6560] truncate max-w-[200px]">{d.notes}</span>}
                <span className="ml-auto text-[10px] text-[#6B6560]">
                  {new Date(d.decidedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PriceRuler({ rule, currentEntry }: { rule: any; currentEntry?: number }) {
  const zones = [
    { key: "stopZone", label: "Stop", color: "bg-red-500", textColor: "text-red-400", zone: rule.stopZone },
    { key: "entryZone", label: "Entry", color: "bg-green-500", textColor: "text-green-400", zone: rule.entryZone },
    { key: "addZone", label: "Add", color: "bg-blue-500", textColor: "text-blue-400", zone: rule.addZone },
    { key: "trimZone", label: "Trim", color: "bg-yellow-500", textColor: "text-yellow-400", zone: rule.trimZone },
  ].filter((z) => z.zone);

  if (zones.length === 0) {
    return <p className="text-xs text-[#6B6560] italic">No zones set</p>;
  }

  return (
    <div className="space-y-2">
      {zones.map((z) => (
        <div key={z.key} className="flex items-center gap-3">
          <span className={cn("text-xs w-12 text-right", z.textColor)}>{z.label}</span>
          <div className="flex-1 relative h-4 rounded-full bg-[#1A1816] overflow-hidden">
            <div className={cn("absolute inset-y-0 rounded-full opacity-30", z.color)} style={{ left: "20%", right: "20%" }} />
          </div>
          <span className="text-xs text-[#6B6560] w-32 text-right">
            ${z.zone.low} – ${z.zone.high}
          </span>
        </div>
      ))}
      {rule.notes && <p className="text-xs text-[#6B6560] mt-2">{rule.notes}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 5: TRACK RECORD
   ═══════════════════════════════════════════════════════════ */

function TrackRecordTab() {
  const closedTrades = useQuery(api.trades.listClosedTrades, { limit: 100 });
  const exitedPositions = useQuery(api.investments.listPositions, {});

  const exited = exitedPositions?.filter((p) => p.status === "exited") ?? [];

  const stats = useMemo(() => {
    if (!closedTrades || closedTrades.length === 0) return null;
    const wins = closedTrades.filter((t) => t.returnPct > 0);
    const losses = closedTrades.filter((t) => t.returnPct <= 0);
    const winRate = (wins.length / closedTrades.length) * 100;
    const avgGain = wins.length > 0 ? wins.reduce((s, t) => s + t.returnPct, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.returnPct), 0) / losses.length : 0;
    const profitFactor = avgLoss > 0 ? (avgGain * wins.length) / (avgLoss * losses.length) : 0;
    const totalReturn = closedTrades.reduce((s, t) => s + t.returnDollars, 0);
    const avgWinDays = wins.length > 0 ? wins.reduce((s, t) => s + t.holdDays, 0) / wins.length : 0;
    const avgLossDays = losses.length > 0 ? losses.reduce((s, t) => s + t.holdDays, 0) / losses.length : 0;

    return { winRate, avgGain, avgLoss, profitFactor, totalReturn, totalTrades: closedTrades.length, wins: wins.length, losses: losses.length, avgWinDays, avgLossDays };
  }, [closedTrades]);

  if (!closedTrades || (closedTrades.length === 0 && exited.length === 0)) {
    return (
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-16 text-center">
        <Trophy className="mx-auto h-10 w-10 text-[#6B6560] mb-4" />
        <p className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Track Record</p>
        <p className="text-sm text-[#6B6560] mt-2">Track record builds as you close positions</p>
        <p className="text-xs text-[#6B6560] mt-1">Every exit gets logged with return, hold days, and thesis outcome</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} />
          <StatCard label="Avg Gain" value={`+${stats.avgGain.toFixed(1)}%`} />
          <StatCard label="Avg Loss" value={`-${stats.avgLoss.toFixed(1)}%`} />
          <StatCard label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
          <StatCard
            label="Total Return"
            value={`$${stats.totalReturn.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          />
        </div>
      )}

      {/* Behavioral Insight */}
      {stats && stats.avgWinDays > 0 && stats.avgLossDays > 0 && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-[#B8956A]" />
            <span className="text-sm font-semibold text-[#E8E4DF]">Behavioral Insight</span>
          </div>
          <p className="text-sm text-[#6B6560]">
            {stats.avgLossDays > stats.avgWinDays
              ? `You hold losers ${Math.round(stats.avgLossDays - stats.avgWinDays)} days longer than winners (avg ${Math.round(stats.avgLossDays)}d vs ${Math.round(stats.avgWinDays)}d). Consider tighter stop discipline.`
              : `You cut losers ${Math.round(stats.avgWinDays - stats.avgLossDays)} days faster than winners (avg ${Math.round(stats.avgLossDays)}d vs ${Math.round(stats.avgWinDays)}d). Good discipline.`
            }
          </p>
        </div>
      )}

      {/* Closed Trades Table */}
      {closedTrades && closedTrades.length > 0 && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
          <div className="border-b border-[#1A1816] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Closed Trades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A1816] text-[#6B6560] text-xs">
                  <th className="px-5 py-3 text-left font-medium">Ticker</th>
                  <th className="px-3 py-3 text-left font-medium">Entry</th>
                  <th className="px-3 py-3 text-left font-medium">Exit</th>
                  <th className="px-3 py-3 text-right font-medium">Entry $</th>
                  <th className="px-3 py-3 text-right font-medium">Exit $</th>
                  <th className="px-3 py-3 text-right font-medium">Return</th>
                  <th className="px-3 py-3 text-right font-medium">Days</th>
                  <th className="px-3 py-3 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1816]">
                {closedTrades.map((t) => (
                  <tr key={t._id} className="hover:bg-[#1A1816]/30">
                    <td className="px-5 py-3 font-semibold text-[#E8E4DF]">{t.ticker}</td>
                    <td className="px-3 py-3 text-[#6B6560]">{t.entryDate}</td>
                    <td className="px-3 py-3 text-[#6B6560]">{t.exitDate}</td>
                    <td className="px-3 py-3 text-right text-[#6B6560]">${t.entryPrice.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#6B6560]">${t.exitPrice.toFixed(2)}</td>
                    <td className={cn(
                      "px-3 py-3 text-right font-medium",
                      t.returnPct >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {t.returnPct >= 0 ? "+" : ""}{t.returnPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-right text-[#6B6560]">{t.holdDays}</td>
                    <td className="px-3 py-3 text-[#6B6560] text-xs">{t.exitReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SPY Comparison Placeholder */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-[#B8956A]" />
          <span className="text-sm font-semibold text-[#E8E4DF]">vs SPY Benchmark</span>
        </div>
        <p className="text-sm text-[#6B6560]">
          {stats
            ? `Your ${stats.totalTrades} closed trades returned $${stats.totalReturn.toLocaleString()}. SPY comparison coming soon.`
            : "SPY comparison will show once you have closed trades."
          }
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESERVED COMPONENTS from original page
   ═══════════════════════════════════════════════════════════ */

function PortfolioView({
  selectedPosition,
  setSelectedPosition,
}: {
  selectedPosition: string | null;
  setSelectedPosition: (id: string | null) => void;
}) {
  const highRisk = useQuery(api.investments.listPositions, { portfolioType: "high_risk" });
  const lowRisk = useQuery(api.investments.listPositions, { portfolioType: "low_risk" });

  if (selectedPosition) {
    return (
      <PositionDetail
        id={selectedPosition as Id<"investmentPositions">}
        onBack={() => setSelectedPosition(null)}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* High Risk */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#1A1816] px-5 py-4">
          <Flame className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            High Risk
          </h2>
          <span className="ml-auto rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400">
            {highRisk?.filter((p) => p.status === "active").length ?? 0} active
          </span>
        </div>
        <div className="divide-y divide-[#1A1816]">
          {(!highRisk || highRisk.filter((p) => p.status !== "exited").length === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-[#6B6560]">
              No high risk positions yet. Add one to get started.
            </div>
          ) : (
            highRisk
              .filter((p) => p.status !== "exited")
              .map((pos) => (
                <PositionRow
                  key={pos._id}
                  position={pos}
                  onClick={() => setSelectedPosition(pos._id)}
                />
              ))
          )}
        </div>
      </div>

      {/* Low Risk */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#1A1816] px-5 py-4">
          <Shield className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Low Risk
          </h2>
          <span className="ml-auto rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-400">
            {lowRisk?.filter((p) => p.status === "active").length ?? 0} active
          </span>
        </div>
        <div className="divide-y divide-[#1A1816]">
          {(!lowRisk || lowRisk.filter((p) => p.status !== "exited").length === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-[#6B6560]">
              No low risk positions yet. Add one to get started.
            </div>
          ) : (
            lowRisk
              .filter((p) => p.status !== "exited")
              .map((pos) => (
                <PositionRow
                  key={pos._id}
                  position={pos}
                  onClick={() => setSelectedPosition(pos._id)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function PositionRow({
  position,
  onClick,
}: {
  position: any;
  onClick: () => void;
}) {
  const alerts = useQuery(api.investments.listAlerts, {
    ticker: position.ticker,
    acknowledged: false,
    limit: 1,
  });

  const hasUnacked = alerts && alerts.length > 0;
  const latestAlert = hasUnacked ? alerts[0] : null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#1A1816]/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-[#E8E4DF]">{position.ticker}</span>
          <span className="text-sm text-[#6B6560]">{position.name}</span>
          {position.status === "watching" && (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400">
              watching
            </span>
          )}
        </div>
        {position.thesis ? (
          <p className="mt-1 text-sm text-[#6B6560] line-clamp-1">{position.thesis}</p>
        ) : (
          <p className="mt-1 text-sm text-[#B8956A] italic">Generating thesis...</p>
        )}
      </div>
      {hasUnacked && latestAlert && (
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs",
            latestAlert.severity === "critical"
              ? "bg-red-500/10 text-red-400"
              : latestAlert.severity === "high"
                ? "bg-orange-500/10 text-orange-400"
                : "bg-yellow-500/10 text-yellow-400"
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {latestAlert.severity}
        </div>
      )}
      <ChevronRight className="h-4 w-4 text-[#6B6560]" />
    </button>
  );
}

function PositionDetail({
  id,
  onBack,
}: {
  id: Id<"investmentPositions">;
  onBack: () => void;
}) {
  const position = useQuery(api.investments.getPosition, { id });
  const alerts = useQuery(api.investments.listAlerts, {
    ticker: position?.ticker ?? "",
    limit: 20,
  });
  const acknowledgeAlert = useMutation(api.investments.acknowledgeAlert);
  const updatePosition = useMutation(api.investments.updatePosition);

  if (!position) {
    return (
      <div className="text-center py-12 text-[#6B6560]">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-[#1A1816] p-2 hover:bg-[#1A1816] transition-colors text-[#6B6560] hover:text-[#E8E4DF]"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#E8E4DF]">{position.ticker}</h2>
            <span className="text-lg text-[#6B6560]">{position.name}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs",
                position.portfolioType === "high_risk"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-blue-500/10 text-blue-400"
              )}
            >
              {position.portfolioType === "high_risk" ? "High Risk" : "Low Risk"}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-[#6B6560]">
            {position.shares && <span>{position.shares} shares</span>}
            {position.entryPrice && <span>@ ${position.entryPrice}</span>}
            {position.timeHorizon && (
              <span className="capitalize">{position.timeHorizon} horizon</span>
            )}
          </div>
        </div>
        {position.status === "active" && (
          <button
            onClick={() => updatePosition({ id: position._id, status: "exited" })}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Exit Position
          </button>
        )}
      </div>

      {/* Thesis */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6">
        <h3 className="text-sm font-semibold text-[#B8956A] uppercase tracking-wider mb-3">
          Investment Thesis
        </h3>
        {position.thesis ? (
          <>
            <div className="text-sm text-[#E8E4DF]/80 whitespace-pre-wrap">
              {position.thesis}
            </div>
            {position.thesisSources && position.thesisSources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1A1816]">
                <p className="text-xs font-medium text-[#6B6560] mb-3">
                  Sources · {position.thesisSources.length} articles
                </p>
                <div className="space-y-2.5">
                  {[...position.thesisSources]
                    .sort((a: any, b: any) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
                    .map((src: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <span className="text-[10px] text-[#6B6560] font-mono mt-0.5 shrink-0">
                        [{i + 1}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#B8956A] hover:underline leading-relaxed"
                        >
                          {src.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {src.publisher && (
                            <span className="text-[10px] text-[#6B6560]">{src.publisher}</span>
                          )}
                          {src.publishedAt && (
                            <span className="text-[10px] text-[#6B6560]">
                              · {new Date(src.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {src.compositeScore != null && (
                            <div className="flex items-center gap-1 ml-1">
                              <span className={cn(
                                "text-[9px] font-mono px-1 py-0.5 rounded",
                                (src.quality ?? 0) >= 4 ? "bg-green-500/10 text-green-400" :
                                (src.quality ?? 0) >= 3 ? "bg-yellow-500/10 text-yellow-400" :
                                "bg-red-500/10 text-red-400"
                              )}>
                                Q:{src.quality}
                              </span>
                              <span className={cn(
                                "text-[9px] font-mono px-1 py-0.5 rounded",
                                (src.trustworthiness ?? 0) >= 4 ? "bg-green-500/10 text-green-400" :
                                (src.trustworthiness ?? 0) >= 3 ? "bg-yellow-500/10 text-yellow-400" :
                                "bg-red-500/10 text-red-400"
                              )}>
                                T:{src.trustworthiness}
                              </span>
                              <span className={cn(
                                "text-[9px] font-mono px-1 py-0.5 rounded",
                                (src.relevance ?? 0) >= 4 ? "bg-green-500/10 text-green-400" :
                                (src.relevance ?? 0) >= 3 ? "bg-yellow-500/10 text-yellow-400" :
                                "bg-red-500/10 text-red-400"
                              )}>
                                R:{src.relevance}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded",
                                src.compositeScore >= 4 ? "bg-green-500/15 text-green-400 border border-green-500/20" :
                                src.compositeScore >= 3 ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" :
                                "bg-red-500/15 text-red-400 border border-red-500/20"
                              )}>
                                {src.compositeScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {position.thesisGeneratedAt && (
              <p className="mt-2 text-[10px] text-[#6B6560]">
                Generated {new Date(position.thesisGeneratedAt).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#B8956A]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#B8956A] border-t-transparent" />
            Thesis generation pending — will be generated on next monitoring cycle
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#1A1816] px-5 py-4">
          <Bell className="h-4 w-4 text-[#B8956A]" />
          <h3 className="text-sm font-semibold text-[#E8E4DF]">Alerts</h3>
          {alerts && (
            <span className="ml-auto text-xs text-[#6B6560]">
              {alerts.filter((a) => !a.acknowledged).length} unread
            </span>
          )}
        </div>
        <div className="divide-y divide-[#1A1816] max-h-96 overflow-y-auto">
          {(!alerts || alerts.length === 0) ? (
            <div className="px-5 py-6 text-center text-sm text-[#6B6560]">
              No alerts yet. Monitoring will generate alerts when thesis risks are detected.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert._id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-1",
                      alert.severity === "critical"
                        ? "bg-red-500/10 text-red-400"
                        : alert.severity === "high"
                          ? "bg-orange-500/10 text-orange-400"
                          : alert.severity === "medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-blue-500/10 text-blue-400"
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#E8E4DF]">{alert.title}</span>
                      <span className="text-[10px] text-[#6B6560]">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#6B6560]">{alert.summary}</p>
                    {alert.sources && alert.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.sources.map((src: any, i: number) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#B8956A] hover:underline"
                          >
                            [{i + 1}] {src.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert({ id: alert._id })}
                      className="rounded-md border border-[#1A1816] p-1.5 text-[#6B6560] hover:bg-[#1A1816] hover:text-[#E8E4DF] transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AlertsView() {
  const alerts = useQuery(api.investments.listAlerts, { limit: 50 });
  const acknowledgeAlert = useMutation(api.investments.acknowledgeAlert);

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
      <div className="border-b border-[#1A1816] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
          All Alerts
        </h2>
      </div>
      <div className="divide-y divide-[#1A1816] max-h-[600px] overflow-y-auto">
        {(!alerts || alerts.length === 0) ? (
          <div className="px-5 py-12 text-center text-sm text-[#6B6560]">
            No alerts yet. Add positions and monitoring will begin.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert._id}
              className={cn(
                "px-5 py-4",
                !alert.acknowledged && "bg-[#1A1816]/20"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 rounded-full p-1",
                    alert.severity === "critical"
                      ? "bg-red-500/10 text-red-400"
                      : alert.severity === "high"
                        ? "bg-orange-500/10 text-orange-400"
                        : alert.severity === "medium"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-blue-400"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#B8956A]">{alert.ticker}</span>
                    <span className="text-sm font-medium text-[#E8E4DF]">{alert.title}</span>
                    <span className="text-[10px] text-[#6B6560]">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6B6560]">{alert.summary}</p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert({ id: alert._id })}
                    className="rounded-md border border-[#1A1816] px-2 py-1 text-xs text-[#6B6560] hover:bg-[#1A1816] hover:text-[#E8E4DF] transition-colors"
                  >
                    Ack
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function isToday(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function OpportunityCard({ opp, defaultOpen }: { opp: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const returnPct = opp.returnPct;
  const hasTracking = opp.priceAtRecommendation != null;

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#1A1816]/30 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-[#6B6560] transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="text-base font-bold text-[#E8E4DF]">{opp.ticker}</span>
        <span className="text-sm text-[#6B6560]">{opp.name}</span>
        {hasTracking && returnPct != null && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              returnPct >= 0
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            )}
          >
            {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
          </span>
        )}
        {opp.expectedUpside && (
          <span className="ml-auto rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-400">
            {opp.expectedUpside} upside
          </span>
        )}
        <span className="text-[10px] text-[#6B6560]">
          {new Date(opp.createdAt).toLocaleDateString()}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[#1A1816]">
          <div className="pt-4">
            {hasTracking && (
              <div className="flex items-center gap-4 mb-3 text-xs text-[#6B6560]">
                <span>Rec price: ${opp.priceAtRecommendation?.toFixed(2)}</span>
                {opp.currentPrice && <span>Current: ${opp.currentPrice.toFixed(2)}</span>}
                {opp.status && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5",
                    opp.status === "hit_target" ? "bg-green-500/10 text-green-400" :
                    opp.status === "stopped_out" ? "bg-red-500/10 text-red-400" :
                    "bg-yellow-500/10 text-yellow-400"
                  )}>
                    {opp.status.replace("_", " ")}
                  </span>
                )}
              </div>
            )}
            <p className="text-sm text-[#E8E4DF]/80 whitespace-pre-wrap">{opp.thesis}</p>
            {opp.catalysts && opp.catalysts.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-[#B8956A] mb-1">Catalysts</p>
                <ul className="list-disc list-inside text-sm text-[#6B6560] space-y-0.5">
                  {opp.catalysts.map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {opp.risks && opp.risks.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-red-400 mb-1">Risks</p>
                <ul className="list-disc list-inside text-sm text-[#6B6560] space-y-0.5">
                  {opp.risks.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {opp.weeklyNotes && opp.weeklyNotes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-[#E8E4DF] mb-1">Weekly Updates</p>
                <div className="space-y-1">
                  {opp.weeklyNotes.map((note: any, i: number) => (
                    <div key={i} className="text-xs text-[#6B6560]">
                      <span className="text-[#B8956A]">{note.date}</span> (${note.price}) — {note.note}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {opp.sources && opp.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1A1816]">
                <div className="flex flex-wrap gap-3">
                  {opp.sources.map((src: any, i: number) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#B8956A] hover:underline"
                    >
                      [{i + 1}] {src.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-[10px] text-[#6B6560]">
              {opp.timeHorizon && `${opp.timeHorizon}`}
              {opp.priceUpdatedAt && ` · Updated ${new Date(opp.priceUpdatedAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunitiesView() {
  const opportunities = useQuery(api.investments.listOpportunities, { limit: 50 });

  return (
    <div className="space-y-3">
      {(!opportunities || opportunities.length === 0) ? (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-12 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-[#6B6560] mb-3" />
          <p className="text-sm text-[#6B6560]">
            No opportunities yet. The daily scanner runs at 8 AM CST.
          </p>
        </div>
      ) : (
        opportunities.map((opp) => (
          <OpportunityCard
            key={opp._id}
            opp={opp}
            defaultOpen={isToday(opp.createdAt)}
          />
        ))
      )}
    </div>
  );
}

function OpportunityTrackRecordView() {
  const allOpps = useQuery(api.investments.listAllOpportunitiesTracked);
  const weeklySummaries = useQuery(api.investments.listWeeklySummaries, { limit: 52 });

  const winners = allOpps?.filter((o) => (o.returnPct ?? 0) > 0).length ?? 0;
  const losers = allOpps?.filter((o) => (o.returnPct ?? 0) < 0).length ?? 0;
  const tracked = allOpps?.filter((o) => o.priceAtRecommendation != null) ?? [];
  const avgReturn = tracked.length > 0
    ? tracked.reduce((sum, o) => sum + (o.returnPct ?? 0), 0) / tracked.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Scorecard */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Picks", value: allOpps?.length ?? 0, color: "text-[#E8E4DF]" },
          { label: "Winners", value: winners, color: "text-green-400" },
          { label: "Losers", value: losers, color: "text-red-400" },
          { label: "Avg Return", value: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`, color: avgReturn >= 0 ? "text-green-400" : "text-red-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 text-center">
            <p className="text-xs text-[#6B6560] mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Summaries */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="border-b border-[#1A1816] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Weekly Summaries
          </h2>
        </div>
        <div className="divide-y divide-[#1A1816] max-h-[400px] overflow-y-auto">
          {(!weeklySummaries || weeklySummaries.length === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-[#6B6560]">
              No weekly summaries yet. First review runs Friday 4 PM CT.
            </div>
          ) : (
            weeklySummaries.map((ws) => (
              <WeeklySummaryRow key={ws._id} summary={ws} />
            ))
          )}
        </div>
      </div>

      {/* All Tracked Opportunities */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
        <div className="border-b border-[#1A1816] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            All Proposed Opportunities
          </h2>
          <p className="text-xs text-[#6B6560] mt-1">Every pick tracked with performance history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A1816] text-[#6B6560] text-xs">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-3 py-3 text-left font-medium">Ticker</th>
                <th className="px-3 py-3 text-left font-medium">Name</th>
                <th className="px-3 py-3 text-right font-medium">Rec Price</th>
                <th className="px-3 py-3 text-right font-medium">Current</th>
                <th className="px-3 py-3 text-right font-medium">Return</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-left font-medium">Updates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1816]">
              {allOpps?.map((opp) => (
                <tr key={opp._id} className="hover:bg-[#1A1816]/30">
                  <td className="px-5 py-3 text-[#6B6560]">
                    {new Date(opp.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#E8E4DF]">{opp.ticker}</td>
                  <td className="px-3 py-3 text-[#6B6560]">{opp.name}</td>
                  <td className="px-3 py-3 text-right text-[#6B6560]">
                    {opp.priceAtRecommendation ? `$${opp.priceAtRecommendation.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-[#E8E4DF]">
                    {opp.currentPrice ? `$${opp.currentPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className={cn(
                    "px-3 py-3 text-right font-medium",
                    (opp.returnPct ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {opp.returnPct != null ? `${opp.returnPct >= 0 ? "+" : ""}${opp.returnPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px]",
                      opp.status === "hit_target" ? "bg-green-500/10 text-green-400" :
                      opp.status === "stopped_out" ? "bg-red-500/10 text-red-400" :
                      opp.status === "expired" ? "bg-[#1A1816] text-[#6B6560]" :
                      "bg-yellow-500/10 text-yellow-400"
                    )}>
                      {(opp.status ?? "active").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-[#6B6560]">
                    {opp.weeklyNotes?.length ?? 0} notes
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WeeklySummaryRow({ summary }: { summary: any }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#1A1816]/30 transition-colors"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 text-[#6B6560] transition-transform", open && "rotate-90")} />
        <span className="text-sm font-medium text-[#E8E4DF]">Week of {summary.weekOf}</span>
        <div className="flex items-center gap-3 ml-auto text-xs">
          <span className="text-green-400">{summary.winnersCount}W</span>
          <span className="text-red-400">{summary.losersCount}L</span>
          {summary.avgReturn != null && (
            <span className={cn(
              summary.avgReturn >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {summary.avgReturn >= 0 ? "+" : ""}{summary.avgReturn.toFixed(1)}%
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[#1A1816]/50">
          <div className="pt-3 text-sm text-[#E8E4DF]/80 whitespace-pre-wrap">{summary.summary}</div>
          {summary.bestPicker && (
            <p className="mt-2 text-xs text-green-400">
              Best: {summary.bestPicker.ticker} (+{summary.bestPicker.returnPct.toFixed(1)}%)
            </p>
          )}
          {summary.worstPicker && (
            <p className="text-xs text-red-400">
              Worst: {summary.worstPicker.ticker} ({summary.worstPicker.returnPct.toFixed(1)}%)
            </p>
          )}
          {summary.positionUpdates && (
            <div className="mt-2 text-xs text-[#6B6560]">{summary.positionUpdates}</div>
          )}
        </div>
      )}
    </div>
  );
}

function AddPositionModal({ onClose }: { onClose: () => void }) {
  const addPosition = useMutation(api.investments.addPosition);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [portfolioType, setPortfolioType] = useState<"high_risk" | "low_risk">("high_risk");
  const [shares, setShares] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [timeHorizon, setTimeHorizon] = useState<"short" | "medium" | "long">("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      await addPosition({
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        portfolioType,
        shares: shares ? parseFloat(shares) : undefined,
        entryPrice: entryPrice ? parseFloat(entryPrice) : undefined,
        timeHorizon,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to add position");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060606]/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Add Position
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6B6560] hover:bg-[#1A1816] hover:text-[#E8E4DF] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B6560] mb-1.5">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="AAPL"
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#E8E4DF] placeholder-[#6B6560]/50 focus:border-[#B8956A] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6560] mb-1.5">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apple Inc."
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#E8E4DF] placeholder-[#6B6560]/50 focus:border-[#B8956A] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#6B6560] mb-1.5">Portfolio</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortfolioType("high_risk")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  portfolioType === "high_risk"
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-[#1A1816] text-[#6B6560] hover:border-[#6B6560]"
                )}
              >
                High Risk
              </button>
              <button
                type="button"
                onClick={() => setPortfolioType("low_risk")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  portfolioType === "low_risk"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                    : "border-[#1A1816] text-[#6B6560] hover:border-[#6B6560]"
                )}
              >
                Low Risk
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B6560] mb-1.5">Shares (optional)</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="100"
                step="any"
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#E8E4DF] placeholder-[#6B6560]/50 focus:border-[#B8956A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6560] mb-1.5">Entry Price (optional)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="150.00"
                step="any"
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] px-3 py-2 text-sm text-[#E8E4DF] placeholder-[#6B6560]/50 focus:border-[#B8956A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#6B6560] mb-1.5">Time Horizon</label>
            <div className="grid grid-cols-3 gap-2">
              {(["short", "medium", "long"] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setTimeHorizon(h)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs capitalize transition-colors",
                    timeHorizon === h
                      ? "border-[#B8956A]/50 bg-[#B8956A]/10 text-[#B8956A]"
                      : "border-[#1A1816] text-[#6B6560] hover:border-[#6B6560]"
                  )}
                >
                  {h === "short" ? "Days-Weeks" : h === "medium" ? "Months" : "Years"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !ticker.trim() || !name.trim()}
            className="w-full rounded-lg bg-[#B8956A] px-4 py-2.5 text-sm font-medium text-[#060606] hover:bg-[#CDAA7E] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Adding..." : "Add Position"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
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
  Search,
  Lightbulb,
  Activity,
  Gauge,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const MonteCarloTab = dynamic(() => import("@/components/quant/MonteCarloTab"), { ssr: false });
const PaperTradesTab = dynamic(() => import("@/components/quant/PaperTradesTab"), { ssr: false });
const SentimentTab = dynamic(() => import("@/components/quant/SentimentTab"), { ssr: false });

type TopTab = "pitzy" | "monte_carlo" | "paper_trades" | "sentiment";
type PitzySubTab = "portfolios" | "alerts" | "opportunities" | "track_record";

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<TopTab>("pitzy");
  const [pitzySubTab, setPitzySubTab] = useState<PitzySubTab>("portfolios");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            Pitzy Model
          </h1>
          <p className="mt-1 text-sm text-[#6B6560]">
            Investment thesis engine · Portfolio monitoring · Quant tools
          </p>
        </div>
        {activeTab === "pitzy" && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#B8956A] px-4 py-2 text-sm font-medium text-[#060606] hover:bg-[#CDAA7E] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Position
          </button>
        )}
      </div>

      {/* Top-level Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-1 w-fit">
        {[
          { key: "pitzy" as TopTab, label: "Pitzy Model", icon: Brain },
          { key: "monte_carlo" as TopTab, label: "Monte Carlo", icon: TrendingUp },
          { key: "paper_trades" as TopTab, label: "Paper Trades", icon: Activity },
          { key: "sentiment" as TopTab, label: "Sentiment", icon: Gauge },
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

      {/* Content */}
      {activeTab === "pitzy" && (
        <div className="space-y-4">
          {/* Sub-nav */}
          <div className="flex items-center gap-1 border-b border-[#1A1816] pb-3">
            {[
              { key: "portfolios" as PitzySubTab, label: "Portfolios" },
              { key: "alerts" as PitzySubTab, label: "Alerts" },
              { key: "opportunities" as PitzySubTab, label: "Opportunities" },
              { key: "track_record" as PitzySubTab, label: "Track Record" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPitzySubTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  pitzySubTab === tab.key
                    ? "text-[#E8E4DF] bg-[#1A1816]"
                    : "text-[#6B6560] hover:text-[#E8E4DF]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {pitzySubTab === "portfolios" && (
            <PortfolioView
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
            />
          )}
          {pitzySubTab === "alerts" && <AlertsView />}
          {pitzySubTab === "opportunities" && <OpportunitiesView />}
          {pitzySubTab === "track_record" && <TrackRecordView />}
        </div>
      )}
      {activeTab === "monte_carlo" && <MonteCarloTab />}
      {activeTab === "paper_trades" && <PaperTradesTab />}
      {activeTab === "sentiment" && <SentimentTab />}

      {/* Add Position Modal */}
      {showAddForm && <AddPositionModal onClose={() => setShowAddForm(false)} />}
    </div>
  );
}

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
            <div className="prose prose-invert prose-sm max-w-none text-[#E8E4DF]/80 whitespace-pre-wrap">
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

function TrackRecordView() {
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
                🔥 High Risk
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
                🛡 Low Risk
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
                  {h === "short" ? "Days–Weeks" : h === "medium" ? "Months" : "Years"}
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

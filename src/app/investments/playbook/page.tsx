"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "pitzy",
    title: "1. Pitzy Model — Event-Driven Thesis Engine",
    content: [
      {
        subtitle: "Philosophy",
        text: `Retail investors have ONE structural advantage over institutions: speed and flexibility. Institutions can't buy micro-caps, can't hold through volatility, can't concentrate in single names. The Pitzy Model finds event-driven catalysts where this nimbleness creates asymmetric returns.`,
      },
      {
        subtitle: "Scoring Dimensions",
        items: [
          "Event Certainty (1-10): How concrete is the catalyst? A signed merger agreement scores higher than 'management said they're exploring options'",
          "Asymmetry (1-10): What's the upside vs downside? A 5:1 reward-to-risk ratio scores higher than 2:1",
          "Retail Edge (1-10): Can institutions trade this easily? Micro-caps, illiquid names, and complex situations score higher",
          "Timing (1-10): How soon does the catalyst resolve? Near-term catalysts score higher",
        ],
      },
      {
        subtitle: "Thesis Generation Pipeline",
        items: [
          "Yahoo Finance API — current price, 52-week range, market cap, volume, beta",
          "Yahoo Profile — sector, industry, margins, P/E, PEG, short interest, insider/institutional ownership, analyst targets",
          "Yahoo News RSS — last 15 articles within 7 days",
          "Brave Search — additional news and analyst coverage",
          "SEC EDGAR — 8-K, 10-K, 10-Q, S-3, SC 13G filings from last 90 days",
          "Deep web search — 5 targeted queries for analyst opinions, competitive landscape, insider activity",
        ],
      },
      {
        subtitle: "Article Quality Scoring (3 dimensions, 1-5 each)",
        items: [
          "Quality: depth of analysis, original reporting vs aggregation",
          "Trustworthiness: publisher credibility tier",
          "Relevance: how directly it relates to the investment thesis",
          "Composite score must be ≥ 3.0 to be included. Only articles from last 7 days.",
        ],
      },
      {
        subtitle: "Publisher Credibility Tiers",
        items: [
          "Tier 1 (score 5): Reuters, Bloomberg, WSJ, Financial Times",
          "Tier 2 (score 4): CNBC, MarketWatch, Yahoo Finance, Barron's",
          "Tier 3 (score 3): Seeking Alpha, Motley Fool, Investor's Business Daily",
          "Tier 4 (score 2): Insider Monkey, Simply Wall St, GuruFocus",
          "Unknown (score 1): unrecognized publishers",
        ],
      },
      {
        subtitle: "Thesis Structure",
        items: [
          "Position summary with entry price, current price, unrealized P&L",
          "Bull case narrative (the core reason to own it)",
          "Key catalysts (specific, dated events)",
          "Risk factors (honest assessment of what can go wrong)",
          "Valuation framework (what it's worth and why)",
          "Pitzy Model assessment (does it fit the framework?)",
          "Decision framework (hold/add/trim/exit price levels)",
        ],
      },
      {
        subtitle: "Influences",
        items: [
          "Rule One Investing (Phil Town) — wonderful companies at attractive prices",
          "Warren Buffett — margin of safety, moat analysis, long-term compounding",
          "Event-driven hedge fund strategies — catalyst identification, timeline analysis",
          "Retail investor behavioral finance — exploiting institutional constraints",
        ],
      },
    ],
  },
  {
    id: "monte-carlo",
    title: "2. Monte Carlo Simulation",
    content: [
      {
        subtitle: "How It Works",
        items: [
          "Take historical return data for each position",
          "Assume returns follow a log-normal distribution",
          "Run 10,000+ random simulations of future price paths",
          "Each simulation randomly draws daily/weekly returns from the historical distribution",
          "Plot the distribution of outcomes",
        ],
      },
      {
        subtitle: "Key Outputs",
        items: [
          "Median expected return (50th percentile)",
          "Best case (95th percentile)",
          "Worst case (5th percentile)",
          "Probability of hitting a specific target",
          "Value at Risk (VaR) — maximum loss at a given confidence level",
        ],
      },
      {
        subtitle: "The Math",
        text: `P(t+1) = P(t) × e^(μΔt + σ√Δt × Z)

Where P(t) = price at time t, μ = drift (expected return minus half the variance), σ = volatility, Δt = time step, Z = random draw from standard normal distribution N(0,1).`,
      },
      {
        subtitle: "Limitations",
        items: [
          "Assumes future volatility resembles past volatility (not always true)",
          "Doesn't model regime changes (crashes, paradigm shifts)",
          "Garbage in, garbage out — short history = unreliable simulations",
          "Correlations between positions aren't always captured",
        ],
      },
    ],
  },
  {
    id: "sentiment",
    title: "3. Sentiment Analysis",
    content: [
      {
        subtitle: "Data Sources",
        items: [
          "Twitter/X posts mentioning the ticker",
          "Yahoo Finance comment sections",
          "Reddit (WallStreetBets, individual stock subreddits)",
          "StockTwits",
          "News headline sentiment",
        ],
      },
      {
        subtitle: "Scoring",
        text: `Sentiment Score = (Bullish Count - Bearish Count) / Total Count × 100

Range: -100 (extreme fear) to +100 (extreme greed)`,
      },
      {
        subtitle: "How It's Used",
        items: [
          "Contrarian indicator: extreme bullishness often precedes pullbacks",
          "Confirmation: sentiment aligning with thesis strengthens conviction",
          "Early warning: sentiment turning negative before price drops can signal information leaking",
          "Volume spikes: sudden attention increase often precedes volatility",
        ],
      },
      {
        subtitle: "Limitations",
        items: [
          "Social media is noisy — bots, pump-and-dump schemes, coordinated campaigns",
          "Retail sentiment is often wrong at extremes",
          "Lagging indicator — by the time sentiment shifts, smart money has already moved",
          "Works better for popular stocks than illiquid micro-caps",
        ],
      },
    ],
  },
  {
    id: "monitor",
    title: "4. Investment Monitoring Engine",
    content: [
      {
        subtitle: "Price Monitoring Thresholds",
        items: [
          "Daily drop ≥ 10% → High severity",
          "Daily drop ≥ 5% → Medium severity",
          "Daily surge ≥ 15% → Medium severity",
          "Down ≥ 25% from entry → Critical severity",
          "Down ≥ 15% from entry → High severity",
          "Within 10% of 52-week low → Medium severity",
          "Within 5% of analyst mean target → Low severity",
        ],
      },
      {
        subtitle: "Short Interest Monitoring",
        items: [
          "Short interest > 25% of float → High severity",
          "Short interest > 15% of float → Medium severity",
        ],
      },
      {
        subtitle: "News Analysis Keywords",
        text: `Negative: downgrade, lawsuit, investigation, SEC probe, fraud, class action, recall, FDA warning, bankruptcy, dilution, short seller report, earnings miss, guidance cut, insider selling

Positive: upgrade, beat estimate, raised guidance, partnership, contract win, FDA approval, price target raised, insider buying, record revenue, buyback

3+ negative articles in 7 days → High. 1-2 negative → Low. 2+ positive → Low (thesis evolution).`,
      },
      {
        subtitle: "Thesis Freshness",
        items: [
          "Thesis > 60 days old → Medium severity",
          "Thesis > 30 days old → Low severity",
        ],
      },
      {
        subtitle: "Deduplication & Routing",
        text: "Alerts are deduplicated within 24 hours. High and Critical alerts → Telegram notification to Dave. Medium and Low → logged in Alerts tab, no push notification.",
      },
    ],
  },
  {
    id: "trade-system",
    title: "5. Trade System",
    content: [
      {
        subtitle: "Trade Zones (set BEFORE entering)",
        items: [
          "Entry Zone: Price range where initial purchase makes sense",
          "Add Zone: Lower price where adding is justified",
          "Trim Zone: Higher price where taking partial profits is smart",
          "Stop Zone: Price where the thesis is broken — exit",
        ],
      },
      {
        subtitle: "Decision Logging",
        text: "Every trade action (buy, sell, add, trim, hold) is logged with date, price, whether it followed system rules, what the system recommended vs what you actually did, and notes on reasoning. Over time this shows: Do you follow your own rules? When you deviate, does it help or hurt?",
      },
    ],
  },
  {
    id: "track-record",
    title: "6. Track Record & Performance Analytics",
    content: [
      {
        subtitle: "Metrics Tracked",
        items: [
          "Win Rate: % of closed trades that were profitable",
          "Average Gain: mean return on winning trades",
          "Average Loss: mean return on losing trades",
          "Profit Factor: (total gains) / (total losses) — above 1.0 = profitable",
          "Hold Period: average days positions are held",
        ],
      },
      {
        subtitle: "Behavioral Analysis",
        items: [
          '"You hold losers X days longer than winners" — disposition effect',
          '"You sell winners too early" — cutting flowers and watering weeds',
          '"You add to losers more than winners" — averaging down bias',
        ],
      },
      {
        subtitle: "SPY Benchmark",
        text: "All returns compared to simply buying SPY over the same period. If you're not beating the index, the honest answer is to buy the index.",
      },
    ],
  },
  {
    id: "opportunities",
    title: "7. Opportunity Pipeline",
    content: [
      {
        subtitle: "How Opportunities Are Generated",
        items: [
          "Event-driven catalysts (mergers, FDA decisions, earnings surprises)",
          "Institutional flow signals (13F filings, insider buying clusters)",
          "Valuation dislocations (high growth at low multiples)",
        ],
      },
      {
        subtitle: "Tracking",
        items: [
          "Price at time of recommendation",
          "Current price (updated every 15 min during market hours)",
          "Return since recommendation",
          "Weekly notes on developments",
          "Status: active, hit target, stopped out, expired",
        ],
      },
      {
        subtitle: "Moral Screens (Non-Negotiable)",
        items: [
          "NO PLTR (Palantir) — surveillance/defense concerns",
          "NO META (Meta Platforms) — societal harm concerns",
          "These override ALL other signals",
        ],
      },
    ],
  },
  {
    id: "crons",
    title: "8. Automated Crons & Scheduled Jobs",
    content: [
      {
        subtitle: "Investment Monitor",
        text: "Every 15 minutes, Mon-Fri 9:00 AM – 4:00 PM ET. Checks all active positions for price moves, news, short interest, thesis staleness. Creates alerts. Sends Telegram for high/critical. Updates opportunity prices.",
      },
      {
        subtitle: "Sunday Investment Memo",
        text: "Every Sunday at 5:30 AM CT. Gathers all portfolio data, macro context (VIX, S&P, Fed), news. Writes comprehensive weekly memo: portfolio snapshot, position-by-position review, watchlist update, prioritized action items, risk check. Emailed to Dave and saved to MC.",
      },
      {
        subtitle: "Investment Opportunity Scanner",
        text: "Every weekday at 8:00 AM CT. Scans for new Pitzy Model opportunities — insider buying clusters, activist filings, merger arb, valuation dislocations.",
      },
      {
        subtitle: "Portfolio Check",
        text: "Every 30 minutes, Mon-Fri 9:00 AM – 2:00 PM CT. Quick portfolio health check during market hours.",
      },
      {
        subtitle: "Event-Driven Triggers (Not Cron)",
        items: [
          "New Position → Telegram notification → Milo generates thesis",
          "Thesis Generation → Convex action → Vercel collects research → agent writes thesis",
          "Alert Creation → monitor script → Convex + Telegram for high/critical",
        ],
      },
    ],
  },
  {
    id: "architecture",
    title: "9. Architecture",
    content: [
      {
        subtitle: "Data Flow",
        items: [
          "Yahoo Finance API → prices, fundamentals, analyst targets",
          "Yahoo News RSS → articles scored by quality/trust/relevance",
          "SEC EDGAR → regulatory filings (8-K, 10-K, 13F, S-3, SC 13G)",
          "Brave Search → additional news and analyst coverage",
          "All data → Convex (source of truth) → Next.js (MC)",
          "Alerts → Convex + Telegram",
          "Weekly memo → Email (Resend) + Convex",
        ],
      },
      {
        subtitle: "Infrastructure",
        items: [
          "Frontend: Next.js on Vercel (mc.lookandseen.com)",
          "Backend: Convex (proper-rat-443.convex.cloud)",
          "Monitoring: OpenClaw crons on Mac mini",
          "Notifications: Telegram Bot API",
          "Email: Resend API",
          "Repository: github.com/MiloBrownAgent/Mission-control",
        ],
      },
    ],
  },
];

export default function PlaybookPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/investments"
          className="rounded-lg p-2 text-[#6B6560] hover:bg-[#1A1816] hover:text-[#E8E4DF] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
            The Playbook
          </h1>
          <p className="mt-1 text-sm text-[#6B6560]">
            Every model, theory, and system powering the Investment Hub
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6">
        <h2 className="text-sm font-semibold text-[#B8956A] uppercase tracking-wider mb-4">
          Contents
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm text-[#6B6560] hover:text-[#E8E4DF] transition-colors py-1"
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div
          key={section.id}
          id={section.id}
          className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden"
        >
          <div className="border-b border-[#1A1816] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
              {section.title}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-6">
            {section.content.map((block, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-[#B8956A] mb-3">
                  {block.subtitle}
                </h3>
                {block.text && (
                  <p className="text-sm text-[#E8E4DF] leading-relaxed whitespace-pre-line">
                    {block.text}
                  </p>
                )}
                {block.items && (
                  <ul className="space-y-2">
                    {block.items.map((item, j) => (
                      <li
                        key={j}
                        className="text-sm text-[#E8E4DF] leading-relaxed flex gap-3"
                      >
                        <span className="text-[#B8956A] shrink-0 mt-1">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-[#6B6560] text-center py-4">
        Last updated: March 10, 2026
      </p>
    </div>
  );
}

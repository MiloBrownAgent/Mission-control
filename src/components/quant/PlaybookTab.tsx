"use client";

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
          "Yahoo Earnings — estimate revisions (7d/30d up/down), beat/miss history, growth estimates",
          "Peer Comparable Analysis — 5 direct competitors' valuations (P/E, EV/Rev, EV/EBITDA, margins, growth)",
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
        subtitle: "Thesis Structure (10-Section Institutional Format)",
        items: [
          "1. Position Summary — ticker, entry, current price, P&L, shares, portfolio weight",
          "Critical numeric facts (especially current price and market cap) come from a deterministic verified-facts layer before the model writes any narrative",
          "2. Bull Case — specific catalysts with hard data points, no generic statements",
          "3. Peer Comparable Analysis — valuation vs 5 direct competitors (P/E, EV/Rev, EV/EBITDA, margins, growth). Is the premium/discount justified?",
          "4. Simplified DCF — 3-scenario model (bear/base/bull): revenue projection → FCF → terminal value → per-share fair value. Real math, 10% base discount rate.",
          "5. Probability-Weighted Catalysts — each catalyst gets: probability %, price impact if it hits, timeline, expected value contribution. Summed for a probability-weighted price target.",
          "6. Earnings Revision Momentum — analyst estimate revisions (up/down last 7d and 30d), beat/miss track record, what the revision trend predicts",
          "7. Management Quality Score (1-10) — track record on guidance, insider ownership alignment, capital allocation history, investor communication quality",
          "8. Risk Factors — brutally honest. What kills this thesis? Specific downside scenarios with price impacts.",
          "9. Pitzy Model Assessment — scored on Event Certainty, Asymmetry, Retail Edge, Timing (each 1-10)",
          "10. Decision Framework — specific hold/add/trim/exit price levels with reasoning for each",
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
    id: "peer-comps",
    title: "2. Peer Comparable Analysis",
    content: [
      {
        subtitle: "What It Is",
        text: "Every thesis now includes a direct comparison table of the subject company vs 5 industry peers. This answers the most important valuation question: is this stock cheap or expensive RELATIVE to its competitors?",
      },
      {
        subtitle: "Metrics Compared",
        items: [
          "Market cap — size context",
          "Revenue and revenue growth — are you paying for faster growth?",
          "Gross margin and operating margin — operational efficiency",
          "Forward P/E — what you're paying per dollar of future earnings",
          "EV/Revenue — enterprise value relative to sales (important for unprofitable companies)",
          "EV/EBITDA — enterprise value relative to cash earnings",
          "Short % of float — market's bet against the stock",
        ],
      },
      {
        subtitle: "Peer Groups (Hardcoded)",
        items: [
          "HIMS → TDOC, AMWL, GH, DOCS, NTRA (digital health/telehealth)",
          "IREN → MARA, RIOT, CORZ, CLSK, HUT (AI infra / crypto mining)",
          "ONDS → AVAV, KTOS, RCAT, JOBY, LUNR (defense / autonomous systems)",
          "PTRN → UPST, AFRM, SOFI, LC (fintech / pattern recognition)",
          "VST → CEG, NRG, AES, EXC, NEE (nuclear / power generation)",
          "AAPL → MSFT, GOOGL, AMZN, NVDA (mega-cap tech)",
        ],
      },
      {
        subtitle: "How It's Used",
        text: "If HIMS trades at 4x forward earnings and TDOC trades at 15x, either HIMS is massively undervalued or TDOC is overvalued. The thesis must explain WHY the gap exists and whether it's justified. This is how institutional analysts think about valuation — relative, not absolute.",
      },
    ],
  },
  {
    id: "dcf",
    title: "3. Simplified DCF Valuation",
    content: [
      {
        subtitle: "What It Is",
        text: "A Discounted Cash Flow model projects what the company's future cash flows are worth today. We run 3 scenarios to capture the range of outcomes instead of pretending we can predict a single number.",
      },
      {
        subtitle: "Three Scenarios",
        items: [
          "BEAR case — conservative revenue growth, margin compression, higher discount rate (12%). What's the floor?",
          "BASE case — consensus analyst growth, stable margins, standard 10% discount rate. What's fair value?",
          "BULL case — upside growth scenario, margin expansion, catalyst success, 8% discount rate. What's the ceiling?",
        ],
      },
      {
        subtitle: "The Math",
        text: `For each scenario:
1. Project revenue 5 years forward using growth assumptions
2. Apply FCF margin to get Free Cash Flow each year
3. Discount each year's FCF back to present value: PV = FCF / (1 + r)^n
4. Calculate terminal value: TV = FCF_year5 × (1 + g) / (r - g) where g = 3% perpetual growth
5. Sum discounted FCFs + discounted terminal value = Enterprise Value
6. Subtract debt, add cash = Equity Value
7. Divide by shares outstanding = Per-share fair value`,
      },
      {
        subtitle: "Why 3 Scenarios?",
        text: "Single-point price targets are lies. The bear case tells you what you're risking, the base case tells you fair value, and the bull case tells you what you're hoping for. Smart money always thinks in ranges.",
      },
    ],
  },
  {
    id: "probability-catalysts",
    title: "4. Probability-Weighted Catalyst Analysis",
    content: [
      {
        subtitle: "What It Is",
        text: "Instead of just listing catalysts, each one is assigned a probability, price impact, and timeline. This produces an expected value for each catalyst and a probability-weighted price target for the whole position.",
      },
      {
        subtitle: "How It Works",
        text: `For each catalyst:
— Probability of occurring: 0-100%
— Price impact if it occurs: +/- dollar amount or percentage
— Timeline: when does it resolve?
— Expected value: probability × impact

Example: HIMS Novo Nordisk branded GLP-1 launch
— Probability: 85% (deal signed, regulatory path clear)
— Impact: +$8-12/share (opens $2B+ TAM)
— Timeline: Q3 2026
— Expected value: 85% × $10 = $8.50/share contribution`,
      },
      {
        subtitle: "Why It Matters",
        text: "A merger with 90% probability and $5 upside is worth $4.50. A speculative catalyst with 20% probability and $15 upside is worth $3.00. Expected value math prevents you from overweighting low-probability moonshots and underweighting high-probability catalysts.",
      },
    ],
  },
  {
    id: "earnings-revisions",
    title: "5. Earnings Estimate Revisions",
    content: [
      {
        subtitle: "Why This Is the #1 Short-Term Predictor",
        text: "Academic research (Zacks, S&P) shows that earnings estimate revisions are the single most predictive signal for short-term stock price movement. When analysts revise estimates UP, stocks tend to outperform over the next 1-3 months. When they revise DOWN, stocks underperform. We now track this automatically.",
      },
      {
        subtitle: "What We Track",
        items: [
          "EPS estimates for current quarter, next quarter, current year, next year",
          "Number of analysts covering the stock",
          "Upward revisions in last 7 days and 30 days",
          "Downward revisions in last 7 days and 30 days",
          "Revenue estimate consensus",
          "Earnings growth projections",
        ],
      },
      {
        subtitle: "Beat/Miss History",
        text: "We track the last 4 quarters of earnings surprises. A company that beats 4/4 quarters has a very different risk profile than one that misses 2/4. Consistent beaters tend to keep beating. Consistent missers have a management credibility problem.",
      },
      {
        subtitle: "Revision Momentum Signal",
        items: [
          "More up than down revisions in 30 days = POSITIVE momentum — historically bullish",
          "More down than up = NEGATIVE momentum — historically bearish",
          "Equal = NEUTRAL — wait for direction",
        ],
      },
    ],
  },
  {
    id: "management",
    title: "6. Management Quality Score",
    content: [
      {
        subtitle: "Scored 1-10 on Four Dimensions",
        items: [
          "Track Record: Have they hit previous guidance? Have prior strategic moves worked? Do they under-promise and over-deliver?",
          "Insider Ownership: Are executives and directors significant shareholders? Skin in the game matters.",
          "Capital Allocation: Are they buying back stock (good), making accretive acquisitions (good), or diluting shareholders (bad)?",
          "Communication: Are they transparent about challenges? Do earnings calls have real information or corporate-speak?",
        ],
      },
      {
        subtitle: "Why It Matters",
        text: "A great business with bad management will eventually become a bad business. A mediocre business with great management can surprise you. Management quality is the hardest thing to quantify but one of the most important factors in long-term returns.",
      },
    ],
  },
  {
    id: "monte-carlo",
    title: "7. Monte Carlo Simulation",
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
    title: "8. Sentiment Analysis",
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
    title: "9. Investment Monitoring Engine",
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
    title: "10. Trade System",
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
    title: "11. Track Record & Performance Analytics",
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
    title: "12. Opportunity Pipeline",
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
    title: "13. Automated Crons & Scheduled Jobs",
    content: [
      {
        subtitle: "Investment Monitor",
        text: "Every 15 minutes, Mon-Fri 9:00 AM – 4:00 PM ET. Checks all active positions for price moves, news, short interest, thesis staleness. Creates alerts. Sends Telegram for high/critical. Refreshes theses through the hardened verified-facts pipeline. Updates opportunity prices.",
      },
      {
        subtitle: "Sunday Investment Memo",
        text: "Every Sunday at 5:30 AM CT. Gathers all portfolio data, macro context (VIX, S&P, Fed), news. Writes comprehensive weekly memo: portfolio snapshot, position-by-position review, watchlist update, prioritized action items, risk check. Emailed to Dave and saved to MC.",
      },
      {
        subtitle: "Investment Opportunity Scanner",
        text: "Every weekday at 8:00 AM CT. Scans for new Pitzy Model opportunities — insider buying clusters, activist filings, merger arb, valuation dislocations. Keeps today's opportunity slate populated for the Home tab.",
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
    title: "14. Architecture",
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

export default function PlaybookTab() {
  return (
    <div className="space-y-6 max-w-4xl">
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

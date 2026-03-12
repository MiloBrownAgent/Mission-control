# The Playbook

A complete reference for every model, theory, and system powering the Investment Hub.

---

## 1. Pitzy Model — Event-Driven Thesis Engine

The core investment thesis framework. Named after the retail investor advantage: being nimble enough to act on catalysts before institutions can reposition.

### Philosophy
- Retail investors have ONE structural advantage over institutions: speed and flexibility
- Institutions can't buy micro-caps, can't hold through volatility, can't concentrate in single names
- The Pitzy Model finds event-driven catalysts where this nimbleness creates asymmetric returns

### Scoring Dimensions
Every thesis is evaluated on four axes:

1. Event Certainty (1-10): How concrete is the catalyst? A signed merger agreement scores higher than "management said they're exploring options"
2. Asymmetry (1-10): What's the upside vs downside? A 5:1 reward-to-risk ratio scores higher than 2:1
3. Retail Edge (1-10): Can institutions trade this easily? Micro-caps, illiquid names, and complex situations score higher
4. Timing (1-10): How soon does the catalyst resolve? Near-term catalysts score higher than "sometime in the next 2 years"

### Thesis Generation Pipeline
For every ticker added to the system:

1. Yahoo Finance chart + quoteSummary/price — pulls current price, 52-week range, exchange, currency, and raw identity fields
2. Verified-facts resolver — deterministically locks critical numeric facts before the model writes any narrative:
   - direct market cap from `quoteSummary.price.marketCap`
   - else regularMarketPrice × sharesOutstanding
   - else regularMarketPrice × impliedSharesOutstanding
   - else validation fails and the thesis cannot save as final
3. Pre-save validation gate — ticker identity, company identity, current price, and market cap must all verify
4. Yahoo Profile — sector, industry, gross margins, P/E, PEG ratio, short interest, insider ownership, institutional ownership, analyst price targets
5. Yahoo News RSS — pulls last 15 articles within 7 days
6. Brave Search — news and analyst coverage (when API key is configured)
7. SEC EDGAR — recent filings: 8-K (material events), 10-K (annual), 10-Q (quarterly), S-3 (shelf offerings), SC 13G (institutional stakes) from the last 90 days
8. Deep web search — 5 targeted queries for analyst opinions, competitive landscape, insider activity
9. Post-generation sanity check — hard numbers in the thesis are compared back to verified facts. If market cap/current price drift materially, the thesis is stored only as PARTIAL instead of final

### Article Quality Scoring
Every news article is scored on three dimensions (1-5 scale):

- Quality: depth of analysis, original reporting vs aggregation
- Trustworthiness: publisher credibility tier (see below)
- Relevance: how directly it relates to the investment thesis

Composite score = weighted average. Only articles scoring 3.0+ are included in the thesis.

### Publisher Credibility Tiers
- Tier 1 (score 5): Reuters, Bloomberg, WSJ, Financial Times
- Tier 2 (score 4): CNBC, MarketWatch, Yahoo Finance, Barron's
- Tier 3 (score 3): Seeking Alpha, Motley Fool, Investor's Business Daily
- Tier 4 (score 2): Insider Monkey, Simply Wall St, GuruFocus
- Unknown (score 1): unrecognized publishers

### Thesis Structure (10-Section Institutional Format)
Every generated thesis now includes:
1. POSITION SUMMARY — ticker, entry, current price, P&L, shares, portfolio weight
2. BULL CASE — specific catalysts with hard data points
3. PEER COMPARABLE ANALYSIS — valuation vs 5 direct competitors (P/E, EV/Rev, EV/EBITDA, margins, growth). Premium/discount justified?
4. SIMPLIFIED DCF — 3-scenario model (bear/base/bull): revenue → FCF → terminal value → per-share value. Real math, 10% base discount rate.
5. PROBABILITY-WEIGHTED CATALYSTS — each catalyst: probability %, price impact, timeline, expected value. Summed for probability-weighted target.
6. EARNINGS REVISION MOMENTUM — analyst estimate revisions (7d/30d up/down), beat/miss track record
7. MANAGEMENT QUALITY SCORE (1-10) — track record, insider ownership, capital allocation, communication
8. RISK FACTORS — brutally honest, specific downside scenarios with price impacts
9. PITZY MODEL ASSESSMENT — scored on Event Certainty, Asymmetry, Retail Edge, Timing
10. DECISION FRAMEWORK — specific hold/add/trim/exit price levels with reasoning

### Additional Data Sources (Senior Analyst Upgrade)
- Yahoo Earnings Trend — EPS estimate revisions (7d/30d up/down counts), earnings growth projections
- Yahoo Earnings History — beat/miss track record for last 4 quarters
- Peer Comparable Data — 5 direct competitors: market cap, revenue, growth, margins, P/E, EV/Rev, EV/EBITDA, short interest

### Peer Groups (Hardcoded)
- HIMS → TDOC, AMWL, GH, DOCS, NTRA (digital health)
- IREN → MARA, RIOT, CORZ, CLSK, HUT (AI infra / mining)
- ONDS → AVAV, KTOS, RCAT, JOBY, LUNR (defense / autonomous)
- PTRN → UPST, AFRM, SOFI, LC (fintech)
- VST → CEG, NRG, AES, EXC, NEE (nuclear / power)
- AAPL → MSFT, GOOGL, AMZN, NVDA (mega-cap tech)

### Influences
- Rule One Investing (Phil Town) — focus on "wonderful companies at attractive prices"
- Warren Buffett — margin of safety, moat analysis, long-term compounding
- Event-driven hedge fund strategies — catalyst identification, timeline analysis
- Retail investor behavioral finance — exploiting institutional constraints

---

## 2. Monte Carlo Simulation

A probability-based method for modeling future portfolio outcomes by running thousands of randomized scenarios.

### How It Works
1. Take historical return data for each position
2. Assume returns follow a distribution (typically log-normal)
3. Run 10,000+ random simulations of future price paths
4. Each simulation randomly draws daily/weekly returns from the historical distribution
5. Plot the distribution of outcomes

### Key Outputs
- Median expected return (50th percentile)
- Best case (95th percentile)
- Worst case (5th percentile)
- Probability of hitting a specific target
- Value at Risk (VaR) — the maximum loss at a given confidence level

### Math
For each simulation step:
```
P(t+1) = P(t) × e^(μΔt + σ√Δt × Z)
```
Where:
- P(t) = price at time t
- μ = drift (expected return minus half the variance)
- σ = volatility (standard deviation of returns)
- Δt = time step
- Z = random draw from standard normal distribution N(0,1)

### Why It Matters
It answers: "Given what we know about how this stock moves, what's the range of outcomes over the next X months?" Instead of a single price target, you get a probability distribution. Much more honest than "my target is $50."

### Limitations
- Assumes future volatility resembles past volatility (not always true)
- Doesn't model regime changes (crashes, paradigm shifts)
- Garbage in, garbage out — short history = unreliable simulations
- Correlations between positions aren't always captured

---

## 3. Sentiment Analysis

Measures market mood around a ticker by analyzing social media, news, and discussion forums.

### Data Sources
- Twitter/X posts mentioning the ticker
- Yahoo Finance comment sections
- Reddit (WallStreetBets, individual stock subreddits)
- StockTwits
- News headline sentiment

### Classification
Each piece of content is classified as:
- Bullish: positive outlook, buy recommendations, price target increases
- Bearish: negative outlook, sell recommendations, warnings
- Neutral: factual reporting, no directional opinion

### Scoring
Sentiment Score = (Bullish Count - Bearish Count) / Total Count × 100

Range: -100 (extreme fear) to +100 (extreme greed)

### Tracked Metrics
- Overall sentiment score
- Tweet/post count (volume indicates attention)
- Bullish vs bearish ratio
- Top bullish and bearish arguments (representative quotes)
- Price at time of check (for correlation analysis)
- Trend over time (is sentiment improving or deteriorating?)

### How It's Used
- Contrarian indicator: extreme bullishness often precedes pullbacks
- Confirmation: sentiment aligning with thesis strengthens conviction
- Early warning: sentiment turning negative before price drops can signal information leaking
- Volume spikes: sudden attention increase often precedes volatility

### Limitations
- Social media is noisy — bots, pump-and-dump schemes, coordinated campaigns
- Retail sentiment is often wrong at extremes
- Lagging indicator — by the time sentiment shifts, smart money has already moved
- Works better for popular stocks (HIMS, AAPL) than illiquid micro-caps

---

## 4. Investment Monitoring Engine

Automated surveillance system that runs every 15 minutes during market hours (Mon-Fri 9AM-4PM ET).

### Price Monitoring
Checks every active position against these thresholds:

| Condition | Severity |
|-----------|----------|
| Daily drop ≥ 10% | High |
| Daily drop ≥ 5% | Medium |
| Daily surge ≥ 10% | Medium |
| Down ≥ 25% from entry | Critical |
| Down ≥ 15% from entry | High |
| Within 10% of 52-week low | Medium |
| Within 5% of analyst mean target | Low |

### Short Interest Monitoring
| Condition | Severity |
|-----------|----------|
| Short interest > 25% of float | High |
| Short interest > 15% of float | Medium |

### News Analysis
Scans Yahoo Finance headlines for keyword patterns:

Negative keywords: downgrade, lawsuit, investigation, SEC probe, fraud, class action, recall, FDA warning, bankruptcy, dilution, short seller report, earnings miss, guidance cut, insider selling

Positive keywords: upgrade, beat estimate, raised guidance, partnership, contract win, FDA approval, price target raised, insider buying, record revenue, buyback

| Condition | Severity |
|-----------|----------|
| 3+ negative articles in 7 days | High |
| 1-2 negative articles | Low |
| 2+ positive articles | Low (thesis evolution) |

### Thesis Freshness
| Condition | Severity |
|-----------|----------|
| Thesis > 60 days old | Medium |
| Thesis > 30 days old | Low |

### Deduplication
Alerts are deduplicated within 24 hours — the same alert won't fire twice in a day.

### Notification Routing
- High and Critical alerts → Telegram message to Dave
- Medium and Low → logged in the Alerts tab, no push notification

---

## 5. Trade System

Rules-based framework for removing emotion from buy/sell decisions.

### Trade Zones
Every portfolio position has four price zones defined BEFORE entering:

1. Entry Zone: The price range where initial purchase makes sense
2. Add Zone: Lower price where adding to the position is justified (averaging down)
3. Trim Zone: Higher price where taking partial profits is smart
4. Stop Zone: Price where the thesis is broken and you exit

### Decision Logging
Every trade action (buy, sell, add, trim, hold) is logged with:
- Date and price
- Whether it followed the system rules
- What the system recommended vs what you actually did
- Notes on reasoning

### Purpose
Over time, this builds a dataset showing:
- Do you follow your own rules?
- When you deviate, does it help or hurt?
- What's your actual behavior pattern?

---

## 6. Track Record & Performance Analytics

### Metrics Tracked
- Win Rate: % of closed trades that were profitable
- Average Gain: mean return on winning trades
- Average Loss: mean return on losing trades
- Profit Factor: (total gains) / (total losses) — above 1.0 means profitable overall
- Hold Period: average days positions are held
- Winners vs losers hold time comparison

### Behavioral Analysis
The system tracks patterns like:
- "You hold losers X days longer than winners" — disposition effect
- "You sell winners too early" — cutting flowers and watering weeds
- "You add to losers more than winners" — averaging down bias

### SPY Benchmark
All returns compared to simply buying SPY (S&P 500 ETF) over the same period. If you're not beating the index, the honest answer is to buy the index.

---

## 7. Opportunity Pipeline

### How Opportunities Are Generated
Proactive scans for tickers matching Pitzy Model criteria:
- Event-driven catalysts (mergers, FDA decisions, earnings surprises)
- Institutional flow signals (13F filings, insider buying clusters)
- Valuation dislocations (high growth at low multiples)

### Tracking
Each opportunity is tracked with:
- Price at time of recommendation
- Current price (updated every 15 min during market hours)
- Return since recommendation
- Weekly notes on developments
- Status: active, hit target, stopped out, expired

### Moral Screens
Two tickers are permanently excluded:
- PLTR (Palantir) — surveillance/defense concerns
- META (Meta Platforms) — societal harm concerns

These are non-negotiable and override all other signals.

---

## 8. Article Quality Filter

### Three-Dimensional Scoring
Every news article feeding into thesis generation is scored:

1. Quality (1-5): Is this original analysis or rehashed content?
   - 5: Deep investigative reporting with original data
   - 4: Solid analysis with specific numbers and context
   - 3: Competent summary with some analysis
   - 2: Aggregated/rehashed content
   - 1: Clickbait or content-farm material

2. Trustworthiness (1-5): Based on publisher credibility tier (see above)

3. Relevance (1-5): How directly does this relate to the investment thesis?
   - 5: Directly about the company's core catalyst/risk
   - 4: About the company with meaningful context
   - 3: About the sector/industry
   - 2: Tangentially related
   - 1: Barely relevant

### Composite Score
Composite = (Quality + Trustworthiness + Relevance) / 3

Minimum threshold: 3.0 to be included in thesis sources.

### Recency Filter
Only articles from the last 7 days are considered. Older articles are excluded regardless of quality.

---

## Summary of Data Sources

| Source | What It Provides | Update Frequency |
|--------|-----------------|------------------|
| Yahoo Finance API | Price, volume, fundamentals, analyst targets | Real-time |
| Yahoo Finance RSS | News articles, headlines | Every thesis generation |
| Brave Search | Additional news, analyst coverage | Every thesis generation |
| SEC EDGAR | Regulatory filings (8-K, 10-K, 13F, etc.) | Every thesis generation |
| Twitter/X | Sentiment data, retail mood | Periodic checks |
| Convex DB | All stored positions, alerts, theses | Real-time |
| OpenClaw Cron | Monitoring triggers every 15 min | Market hours Mon-Fri |
| Telegram | Alert notifications | On high/critical alerts |

---

## 9. Automated Crons & Scheduled Jobs

Every recurring job that powers the investment system. All times are Central Time (CT).

### Investment Monitor
- Schedule: Every 15 minutes, Mon-Fri 9:00 AM – 4:00 PM ET
- Cron ID: `8d77fefd-6eeb-470e-ba34-1802814ba369`
- Agent: finance
- What it does: Checks all active positions for price moves, news, short interest, thesis staleness. Creates alerts in Convex. Sends Telegram notification for high/critical alerts. Also updates opportunity track record prices.
- Script: `scripts/investment-monitor-v2.js`

### Sunday Investment Memo
- Schedule: Every Sunday at 5:30 AM CT
- Cron ID: `cdb06ad3-71a9-495c-a0a8-591204e3dfdb`
- Agent: finance
- What it does: Gathers all portfolio data, macro context (VIX, S&P, Fed), and news. Writes a comprehensive weekly memo with portfolio snapshot, position-by-position review, watchlist update, prioritized action items, and risk check. Emails to Dave and saves to Convex for display on MC.

### Investment Opportunity Scanner
- Schedule: Every weekday at 8:00 AM CT
- Cron ID: `ab0afdeb-3caf-45a1-ad86-bffe14e4e3c3`
- What it does: Scans for new Pitzy Model opportunities — insider buying clusters, activist filings, merger arb, valuation dislocations. Updates the Opportunities section on the Home tab and keeps today's opportunity slate populated.

### End-of-Day Investment Roundup
- Schedule: Intended for weekdays after the close (path added in repo; wire your OpenClaw cron to this script if not already scheduled)
- Script: `scripts/investment-eod-roundup.js`
- What it does: Writes a same-day JSON roundup to `logs/`, records an activity-log checkpoint, and flags any partial/missing theses that still need attention before the next session.

### Portfolio Check (30-min)
- Schedule: Every 30 minutes, Mon-Fri 9:00 AM – 2:00 PM CT
- Cron ID: `fc482e6b-c669-437b-afe2-cd63e76f6b75`
- Agent: main
- What it does: Quick portfolio health check during market hours. Verifies positions, flags anomalies.

### Convex Scheduled Jobs
These run on Convex's infrastructure (not the Mac):

- **Daycare report sync**: Every 30 min, 2-6 PM CT weekdays (not investment-related, shared Convex instance)
- **WHOOP sync**: Every 2 hours (not investment-related)

### Event-Driven Triggers (Not Cron)
These fire on specific events, not on a schedule:

- **New Position Notification**: When `addPosition` mutation fires in Convex → sends Telegram message to Milo & Team group (topic 6) → Milo generates thesis
- **Thesis Generation**: Triggered by new position or refresh request → Convex action calls Vercel API → verified facts are locked first → research data collected → model writes narrative → post-generation sanity gate decides FINAL vs PARTIAL save
- **Alert Creation**: Triggered by monitor script → creates alert in Convex → high/critical alerts notify via Telegram

### Moral Screens (Applied Everywhere)
- NO PLTR (Palantir) — surveillance/defense. Non-negotiable.
- NO META (Meta Platforms) — societal harm. Non-negotiable.
- These screens apply to: thesis generation, opportunity scanning, weekly memo recommendations, and all automated suggestions.

---

## 10. Architecture Overview

```
Dave adds ticker on MC
        ↓
Convex addPosition mutation
        ↓
    ┌───────────────────┐
    │ Telegram notify    │ → Milo sees it → writes thesis
    │ Thesis trigger     │ → Vercel collects research data
    └───────────────────┘
        ↓
Thesis saved to Convex → displays on MC
        ↓
    ┌───────────────────┐
    │ Monitor (15 min)   │ → price, news, short interest
    │ Weekly Memo (Sun)  │ → full portfolio analysis
    │ Opp Scanner (8AM)  │ → new opportunities
    └───────────────────┘
        ↓
Alerts → Convex + Telegram (high/critical)
Memo → Email + Convex
Opportunities → Convex → Home tab
```

### Data Flow
1. Yahoo Finance API → prices, fundamentals, analyst targets
2. Yahoo News RSS → articles scored by quality/trust/relevance
3. SEC EDGAR → regulatory filings (8-K, 10-K, 13F, S-3, SC 13G)
4. Brave Search → additional news and analyst coverage
5. All data → Convex (source of truth) → Next.js frontend (MC)
6. Alerts → Convex + Telegram
7. Weekly memo → Email (Resend) + Convex

### Infrastructure
- Frontend: Next.js on Vercel (mc.lookandseen.com)
- Backend: Convex (proper-rat-443.convex.cloud)
- Monitoring: OpenClaw crons on Mac mini
- Notifications: Telegram Bot API
- Email: Resend API
- Repository: github.com/MiloBrownAgent/Mission-control

---

Last updated: March 10, 2026

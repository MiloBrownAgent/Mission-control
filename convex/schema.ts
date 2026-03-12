import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    assignee: v.union(v.literal("Dave"), v.literal("Milo")),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  memories: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).searchIndex("search_memories", {
    searchField: "content",
    filterFields: ["category"],
  }),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    type: v.union(
      v.literal("task"),
      v.literal("cron"),
      v.literal("reminder"),
      v.literal("event")
    ),
    createdAt: v.number(),
  }),

  content: defineTable({
    title: v.string(),
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Twitter"),
      v.literal("LinkedIn"),
      v.literal("Blog")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("scheduled"),
      v.literal("published")
    ),
    scheduledDate: v.optional(v.string()),
    notes: v.string(),
    mediaUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  contacts: defineTable({
    name: v.string(),
    role: v.string(),
    company: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  clients: defineTable({
    name: v.string(),
    website: v.optional(v.string()),
    category: v.union(
      v.literal("DTC/CPG"),
      v.literal("Agency"),
      v.literal("E-commerce"),
      v.literal("Fashion"),
      v.literal("AI Opportunity"),
      v.literal("Production House"),
      v.literal("Retail"),
      v.literal("Healthcare"),
      v.literal("Tech")
    ),
    location: v.optional(v.string()),
    estimatedRevenue: v.optional(v.string()),
    status: v.union(
      v.literal("prospect"),
      v.literal("contacted"),
      v.literal("responded"),
      v.literal("meeting"),
      v.literal("proposal"),
      v.literal("active"),
      v.literal("inactive")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  crmContacts: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    emailConfidence: v.optional(
      v.union(v.literal("verified"), v.literal("constructed"), v.literal("unknown"))
    ),
    linkedIn: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimary: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_client", ["clientId"]),

  outreach: defineTable({
    contactId: v.id("crmContacts"),
    type: v.union(
      v.literal("initial"),
      v.literal("followUp1"),
      v.literal("followUp2"),
      v.literal("breakup")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("opened"),
      v.literal("replied"),
      v.literal("bounced")
    ),
    sentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
  }).index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_nextFollowUp", ["nextFollowUpDate"]),

  pipeline: defineTable({
    clientId: v.id("clients"),
    service: v.union(
      v.literal("retouching"),
      v.literal("digitalTech"),
      v.literal("aiImageGen"),
      v.literal("other")
    ),
    value: v.optional(v.number()),
    stage: v.union(
      v.literal("lead"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("negotiation"),
      v.literal("closed_won"),
      v.literal("closed_lost")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"])
    .index("by_stage", ["stage"]),

  prospectEmails: defineTable({
    prospectName: v.string(),
    company: v.string(),
    role: v.string(),
    email: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("bounced"),
      v.literal("replied"),
      v.literal("skipped")
    ),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  activityLog: defineTable({
    message: v.string(),
    type: v.union(v.literal("success"), v.literal("info"), v.literal("warning")),
    category: v.union(v.literal("cron"), v.literal("task"), v.literal("system")),
    timestamp: v.number(),
  }),

  meals: defineTable({
    weekStart: v.string(),
    day: v.union(
      v.literal("Monday"),
      v.literal("Tuesday"),
      v.literal("Wednesday"),
      v.literal("Thursday"),
      v.literal("Friday"),
      v.literal("Saturday"),
      v.literal("Sunday")
    ),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner")
    ),
    name: v.string(),
    notes: v.optional(v.string()),
    sorenMeal: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
    url: v.optional(v.string()),
    replacements: v.optional(v.array(v.object({
      name: v.string(),
      url: v.optional(v.string()),
      notes: v.optional(v.string()),
    }))),
    imageUrl: v.optional(v.string()),
    ingredients: v.optional(v.array(v.string())),
    servings: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week", ["weekStart"])
    .index("by_week_day_meal", ["weekStart", "day", "mealType"]),

  groceryLists: defineTable({
    weekStart: v.string(),
    items: v.string(),
    updatedAt: v.number(),
  }).index("by_week", ["weekStart"]),

  groceryItems: defineTable({
    text: v.string(),
    checked: v.boolean(),
    category: v.optional(v.string()),
    addedAt: v.number(),
    addedBy: v.optional(v.string()),
  })
    .index("by_checked", ["checked"])
    .index("by_added", ["addedAt"]),

  daycareReports: defineTable({
    date: v.string(),           // "2026-02-18"
    childName: v.string(),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    totalTime: v.optional(v.string()),
    meals: v.optional(v.number()),
    totalSleep: v.optional(v.string()),
    totalNaps: v.optional(v.number()),
    pees: v.optional(v.number()),
    poops: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    rawSubject: v.optional(v.string()),
    parsedAt: v.number(),
  }).index("by_date", ["date"]),

  weekendActivities: defineTable({
    title: v.string(),
    description: v.string(),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    driveTime: v.optional(v.string()),
    cost: v.optional(v.string()),
    category: v.string(),
    ageNote: v.optional(v.string()),
    url: v.optional(v.string()),
    source: v.optional(v.string()),
    weekOf: v.string(),       // Saturday date: "2026-02-28"
    rank: v.number(),         // 1–15
  })
    .index("by_week", ["weekOf"])
    .index("by_week_rank", ["weekOf", "rank"]),

  classBookings: defineTable({
    member: v.string(),                // "Amanda" | "Dave"
    className: v.string(),             // "CTR" | "Alpha Strength: Squat + Pull"
    classDate: v.string(),             // "2026-03-01"
    classTime: v.string(),             // "10:00 AM"
    location: v.optional(v.string()),  // "Reformer Studio, Highland Park"
    instructor: v.optional(v.string()),
    status: v.union(
      v.literal("booked"),
      v.literal("waitlisted"),
      v.literal("cancelled"),
    ),
    regId: v.optional(v.number()),
    spot: v.optional(v.string()),
    waitlistSpot: v.optional(v.string()),
    bookedAt: v.number(),
  })
    .index("by_date", ["classDate"])
    .index("by_member_date", ["member", "classDate"]),

  clientLinks: defineTable({
    token: v.string(),
    clientSlug: v.string(),
    folderPath: v.string(),
    label: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_client", ["clientSlug"]),

  dropboxConfig: defineTable({
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    connectedAt: v.number(),
    proxyUrl: v.optional(v.string()),
  }),

  actionItems: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("LS"),
      v.literal("OurFable"),
      v.literal("Personal"),
      v.literal("Ops"),
    ),
    impact: v.string(),
    effort: v.string(),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("implementing"),
      v.literal("done"),
      v.literal("skipped"),
    ),
    generatedDate: v.string(),
    approvedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_date", ["generatedDate"])
    .index("by_status", ["status"]),

  cleaningTasks: defineTable({
    room: v.string(),
    task: v.string(),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("must"), v.literal("if_time"), v.literal("skip")),
    recurring: v.boolean(),
    completedAt: v.optional(v.number()),
    addedAt: v.number(),
  }).index("by_room", ["room"]).index("by_priority", ["priority"]),

  cleaningConfig: defineTable({
    key: v.string(), // singleton: always "config"
    nextVisitDate: v.number(), // timestamp ms
    lastVisitDate: v.optional(v.number()),
  }).index("by_key", ["key"]),

  whoop_tokens: defineTable({
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  whoop_data: defineTable({
    type: v.string(),   // "recovery" | "sleep"
    date: v.string(),   // "2026-02-28"
    data: v.any(),
    storedAt: v.number(),
  })
    .index("by_type_date", ["type", "date"])
    .index("by_type", ["type"]),

  flightDeals: defineTable({
    origin: v.string(),
    destination: v.string(),
    destinationCity: v.string(),
    destinationCountry: v.string(),
    isInternational: v.boolean(),
    airline: v.string(),
    isNonstop: v.boolean(),
    departureDate: v.string(),
    returnDate: v.optional(v.string()),
    cashPricePerPerson: v.number(),  // round-trip cash fare per person
    cashPriceTotal: v.number(),      // round-trip cash fare for 2
    cashFarePerPerson: v.optional(v.number()),
    cashFareTotal: v.optional(v.number()),
    skyMilesPerPerson: v.optional(v.number()),
    skyMilesTotal: v.optional(v.number()),
    centsPerMile: v.optional(v.number()),
    priceSource: v.optional(v.string()),  // e.g. "Expedia confirmed Mar 1"
    cabinClass: v.string(),
    dealScore: v.number(),
    sourceUrl: v.optional(v.string()),
    pulledAt: v.number(),
    weekOf: v.string(),
  }).index("by_week", ["weekOf"]).index("by_score", ["dealScore"]),

  btc_candle_signals: defineTable({
    candle_open_time: v.string(),    // ISO: "2026-02-28T23:00:00Z"
    interval: v.string(),             // "1H" | "15M"
    open_price: v.number(),
    signal_price: v.number(),         // BTC price when signal was generated (15-20 min in)
    signal_direction: v.union(v.literal("UP"), v.literal("DOWN")),
    signal_confidence: v.number(),    // 0-100: abs % move at signal time (e.g. 0.29)
    polymarket_url: v.string(),
    my_probability: v.number(),       // my estimated probability at signal time (e.g. 65)
    close_price: v.optional(v.number()),
    outcome: v.optional(v.union(v.literal("UP"), v.literal("DOWN"))),  // actual candle close
    correct: v.optional(v.boolean()),
    created_at: v.number(),
    resolved_at: v.optional(v.number()),
  }).index("by_created", ["created_at"]).index("by_resolved", ["outcome"]),

  hims_sentiment: defineTable({
    score: v.number(),
    tweetCount: v.number(),
    bullishCount: v.number(),
    bearishCount: v.number(),
    neutralCount: v.number(),
    topBullish: v.optional(v.string()),
    topBearish: v.optional(v.string()),
    priceAtCheck: v.optional(v.number()),
    checkedAt: v.number(),
  }).index("by_checked", ["checkedAt"]),

  deployRequests: defineTable({
    project: v.string(),   // "look-and-seen" | "mission-control"
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("failed")),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  vault_documents: defineTable({
    name: v.string(),
    category: v.string(),
    fileType: v.string(),
    storageId: v.string(),
    iv: v.string(),
    authTag: v.string(),
    dateAdded: v.string(),
    addedBy: v.string(),
    fileSize: v.number(),
    originalName: v.optional(v.string()),
  }).index("by_category", ["category"]),

  soren_activities: defineTable({
    weekOf: v.string(),           // "2026-03-08" (start of week, Saturday)
    items: v.array(v.object({
      title: v.string(),
      description: v.string(),
      location: v.optional(v.string()),
      url: v.optional(v.string()),
      type: v.union(v.literal("event"), v.literal("idea")),
      date: v.optional(v.string()),  // specific date if known e.g. "March 9"
    })),
    generatedAt: v.number(),
    sources: v.optional(v.array(v.string())),
  }).index("by_week", ["weekOf"]),

  investmentPositions: defineTable({
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.union(v.literal("high_risk"), v.literal("low_risk")),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    entryDate: v.optional(v.string()),
    stage: v.optional(v.union(v.literal("research"), v.literal("portfolio"))),
    thesis: v.optional(v.string()),
    thesisStatus: v.optional(v.union(v.literal("pending"), v.literal("partial"), v.literal("final"))),
    thesisValidationIssues: v.optional(v.array(v.string())),
    verifiedFacts: v.optional(v.object({
      ticker: v.string(),
      companyName: v.string(),
      exchange: v.optional(v.string()),
      currency: v.optional(v.string()),
      currentPrice: v.number(),
      marketCap: v.number(),
      marketCapSource: v.union(
        v.literal("quoteSummary.price.marketCap"),
        v.literal("price_x_sharesOutstanding"),
        v.literal("price_x_impliedSharesOutstanding")
      ),
      sharesOutstanding: v.optional(v.number()),
      impliedSharesOutstanding: v.optional(v.number()),
      fiftyTwoWeekHigh: v.optional(v.number()),
      fiftyTwoWeekLow: v.optional(v.number()),
      sector: v.optional(v.string()),
      industry: v.optional(v.string()),
      revenue: v.optional(v.number()),
      revenueGrowth: v.optional(v.number()),
      grossMargin: v.optional(v.number()),
      operatingMargin: v.optional(v.number()),
      freeCashflow: v.optional(v.number()),
      totalDebt: v.optional(v.number()),
      totalCash: v.optional(v.number()),
      forwardPE: v.optional(v.number()),
      shortPercentOfFloat: v.optional(v.number()),
      analystConsensus: v.optional(v.string()),
      targetMeanPrice: v.optional(v.number()),
      validatedAt: v.number(),
    })),
    thesisSources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      publisher: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      quality: v.optional(v.number()),
      trustworthiness: v.optional(v.number()),
      relevance: v.optional(v.number()),
      compositeScore: v.optional(v.number()),
    }))),
    thesisGeneratedAt: v.optional(v.number()),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
    status: v.union(v.literal("active"), v.literal("watching"), v.literal("exited")),
    addedAt: v.number(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_type", ["portfolioType"])
    .index("by_status", ["status"]),

  investmentAlerts: defineTable({
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    alertType: v.union(
      v.literal("thesis_risk"),
      v.literal("thesis_evolution"),
      v.literal("opportunity"),
      v.literal("price_alert")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    title: v.string(),
    summary: v.string(),
    sources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    acknowledged: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_severity", ["severity"])
    .index("by_acknowledged", ["acknowledged"])
    .index("by_created", ["createdAt"]),

  investmentOpportunities: defineTable({
    ticker: v.string(),
    name: v.string(),
    opportunityType: v.string(),
    thesis: v.string(),
    sources: v.array(v.object({
      title: v.string(),
      url: v.string(),
    })),
    expectedUpside: v.optional(v.string()),
    catalysts: v.optional(v.array(v.string())),
    risks: v.optional(v.array(v.string())),
    timeHorizon: v.optional(v.string()),
    moralScreenPass: v.boolean(),
    emailedAt: v.optional(v.number()),
    createdAt: v.number(),
    firstSeenAt: v.optional(v.number()),
    lastRefreshedAt: v.optional(v.number()),
    // Tracking fields
    priceAtRecommendation: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
    weeklyNotes: v.optional(v.array(v.object({
      date: v.string(),
      price: v.number(),
      note: v.string(),
    }))),
  })
    .index("by_ticker", ["ticker"])
    .index("by_created", ["createdAt"]),

  investmentUpdateReads: defineTable({
    updateKey: v.string(),
    readAt: v.number(),
  })
    .index("by_update_key", ["updateKey"])
    .index("by_read_at", ["readAt"]),

  investmentWeeklySummaries: defineTable({
    weekOf: v.string(),
    summary: v.string(),
    totalPicks: v.number(),
    winnersCount: v.number(),
    losersCount: v.number(),
    bestPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    worstPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    avgReturn: v.optional(v.number()),
    positionUpdates: v.optional(v.string()),
    emailedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_week", ["weekOf"])
    .index("by_created", ["createdAt"]),

  polymarket_trades: defineTable({
    question: v.string(),                          // "US recession by end of 2026?"
    position: v.union(v.literal("Yes"), v.literal("No")),
    entry_price: v.number(),                       // 0–100 (e.g. 31 = 31¢)
    my_probability: v.number(),                    // 0–100 (my estimate)
    kelly_stake: v.number(),                       // paper $ amount staked
    market_url: v.string(),                        // polymarket.com/event/...
    category: v.string(),                          // "Macro" | "Fed" | "Recession" | "Trade" | "Other"
    resolve_date: v.string(),                      // "2026-03-18"
    resolved: v.boolean(),
    outcome: v.optional(v.boolean()),              // true = Yes resolved, false = No resolved
    pnl: v.optional(v.number()),                   // realized P&L on resolution
    notes: v.string(),
    created_at: v.number(),
  }).index("by_resolved", ["resolved"]).index("by_created", ["created_at"]),

  // ── Investment Hub: Signal Engine ──────────────────────

  signalBriefings: defineTable({
    date: v.string(),
    marketStatus: v.string(),
    sections: v.array(v.object({
      type: v.string(),
      title: v.string(),
      summary: v.string(),
      ticker: v.optional(v.string()),
      importance: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    })),
    generatedAt: v.number(),
  }).index("by_date", ["date"]),

  eventScans: defineTable({
    ticker: v.string(),
    eventType: v.string(),
    title: v.string(),
    summary: v.string(),
    pitzyScore: v.number(),
    sector: v.optional(v.string()),
    sources: v.optional(v.array(v.object({ title: v.string(), url: v.string() }))),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("acted_on")),
    detectedAt: v.number(),
  }).index("by_type", ["eventType"]).index("by_detected", ["detectedAt"]).index("by_status", ["status"]),

  macroSnapshots: defineTable({
    date: v.string(),
    fedFundsRate: v.optional(v.number()),
    fedNextMeeting: v.optional(v.string()),
    fedChangeProb: v.optional(v.number()),
    vix: v.optional(v.number()),
    vixTrend: v.optional(v.string()),
    yieldCurveStatus: v.optional(v.string()),
    yield2y10ySpread: v.optional(v.number()),
    dxy: v.optional(v.number()),
    dxyTrend: v.optional(v.string()),
    sectorRotation: v.optional(v.any()),
    earningsCalendar: v.optional(v.array(v.object({ ticker: v.string(), date: v.string(), estimate: v.optional(v.string()) }))),
    generatedAt: v.number(),
  }).index("by_date", ["date"]),

  // ── Investment Hub: Trade System ──────────────────────

  tradeRules: defineTable({
    positionId: v.id("investmentPositions"),
    ticker: v.string(),
    entryZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    addZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    trimZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    stopZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_position", ["positionId"]).index("by_ticker", ["ticker"]),

  tradeDecisions: defineTable({
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    action: v.union(v.literal("buy"), v.literal("sell"), v.literal("add"), v.literal("trim"), v.literal("hold")),
    price: v.number(),
    shares: v.optional(v.number()),
    followedSystem: v.optional(v.boolean()),
    systemSaid: v.optional(v.string()),
    notes: v.optional(v.string()),
    decidedAt: v.number(),
  }).index("by_ticker", ["ticker"]).index("by_decided", ["decidedAt"]),

  closedTrades: defineTable({
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.string(),
    entryPrice: v.number(),
    exitPrice: v.number(),
    shares: v.number(),
    entryDate: v.string(),
    exitDate: v.string(),
    returnPct: v.number(),
    returnDollars: v.number(),
    holdDays: v.number(),
    thesis: v.optional(v.string()),
    exitReason: v.optional(v.string()),
    closedAt: v.number(),
  }).index("by_closed", ["closedAt"]).index("by_ticker", ["ticker"]),
});

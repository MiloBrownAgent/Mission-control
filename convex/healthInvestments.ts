import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("investmentAccounts").collect();
  },
});

export const getHoldings = query({
  args: { accountNumber: v.string() },
  handler: async (ctx, { accountNumber }) => {
    return await ctx.db
      .query("investmentHoldings")
      .withIndex("by_account", (q) => q.eq("accountNumber", accountNumber))
      .collect();
  },
});

export const getAllHoldings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("investmentHoldings").collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const addAccount = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    accountNumber: v.string(),
    institution: v.string(),
    advisor: v.optional(v.string()),
    totalValue: v.number(),
    asOfDate: v.string(),
    taxStatus: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("investmentAccounts", args);
  },
});

export const addHolding = mutation({
  args: {
    accountNumber: v.string(),
    ticker: v.string(),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
    marketValue: v.number(),
    estimatedAnnualIncome: v.optional(v.number()),
    annualYield: v.optional(v.number()),
    unrealizedGainLoss: v.optional(v.number()),
    asOfDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("investmentHoldings", args);
  },
});

export const seedPortfolio = mutation({
  args: {},
  handler: async (ctx) => {
    // Wipe existing data first
    const existingAccounts = await ctx.db.query("investmentAccounts").collect();
    for (const a of existingAccounts) await ctx.db.delete(a._id);
    const existingHoldings = await ctx.db.query("investmentHoldings").collect();
    for (const h of existingHoldings) await ctx.db.delete(h._id);

    const asOf = "2026-02-28";

    // ── Account 1: Irrevocable Trust (5785-3281) ─────────────────────────────
    await ctx.db.insert("investmentAccounts", {
      name: "Irrevocable Trust",
      type: "Taxable",
      accountNumber: "5785-3281",
      institution: "Wells Fargo Advisors",
      advisor: "Linda Netjes",
      totalValue: 122976.21,
      asOfDate: asOf,
      taxStatus: "Taxable",
    });

    const trust: Array<{
      ticker: string; name: string; quantity: number; price: number; marketValue: number;
      estimatedAnnualIncome?: number; annualYield?: number; unrealizedGainLoss?: number;
    }> = [
      { ticker: "QQQM",  name: "Invesco NASDAQ 100 ETF",        quantity: 37.546,  price: 250.06, marketValue: 9388.75,  estimatedAnnualIncome: 47,  annualYield: 0.50 },
      { ticker: "ICLN",  name: "iShares Global Clean Energy",   quantity: 1.401,   price: 18.22,  marketValue: 25.52,    estimatedAnnualIncome: 0,   annualYield: 1.47 },
      { ticker: "IWD",   name: "iShares Russell 1000 Value",    quantity: 19.413,  price: 225.52, marketValue: 4378.01,  estimatedAnnualIncome: 69,  annualYield: 1.57 },
      { ticker: "IJH",   name: "iShares Core S&P Mid",          quantity: 166.989, price: 71.49,  marketValue: 11938.04, estimatedAnnualIncome: 149, annualYield: 1.25 },
      { ticker: "IJR",   name: "iShares Core S&P SmallCap",     quantity: 75.104,  price: 129.70, marketValue: 9740.98,  estimatedAnnualIncome: 130, annualYield: 1.33 },
      { ticker: "VEA",   name: "Vanguard FTSE Developed Mkts",  quantity: 18.494,  price: 70.24,  marketValue: 1299.01,  estimatedAnnualIncome: 37,  annualYield: 2.86 },
      { ticker: "VNQ",   name: "Vanguard Real Estate Index",    quantity: 29.535,  price: 95.69,  marketValue: 2826.20,  estimatedAnnualIncome: 103, annualYield: 3.62 },
      { ticker: "VOO",   name: "Vanguard S&P 500 ETF",          quantity: 8.427,   price: 631.04, marketValue: 5317.77,  estimatedAnnualIncome: 60,  annualYield: 1.12 },
      { ticker: "VWO",   name: "Vanguard FTSE Emerging Mkts",   quantity: 152.277, price: 58.10,  marketValue: 8847.29,  estimatedAnnualIncome: 228, annualYield: 2.57 },
      { ticker: "VXUS",  name: "Vanguard Total Intl Stock",     quantity: 96.703,  price: 83.81,  marketValue: 8104.67,  estimatedAnnualIncome: 232, annualYield: 2.86 },
      { ticker: "VTI",   name: "Vanguard Total Stock Mkt",      quantity: 156.374, price: 338.77, marketValue: 52974.81, estimatedAnnualIncome: 587, annualYield: 1.10 },
      { ticker: "SWISX", name: "Schwab Intl Index",             quantity: 1.599,   price: 31.61,  marketValue: 50.54,    estimatedAnnualIncome: 2,   annualYield: 3.22 },
      { ticker: "SWPPX", name: "Schwab S&P 500 Fund",           quantity: 451.897, price: 17.65,  marketValue: 7975.98,  estimatedAnnualIncome: 88,  annualYield: 1.10 },
      { ticker: "CASH",  name: "Bank Deposit Sweep",            quantity: 1,       price: 108.64, marketValue: 108.64 },
    ];
    for (const h of trust) {
      await ctx.db.insert("investmentHoldings", { ...h, accountNumber: "5785-3281", asOfDate: asOf });
    }

    // ── Account 2: SEP IRA (4328-9960) ───────────────────────────────────────
    await ctx.db.insert("investmentAccounts", {
      name: "SEP IRA",
      type: "Retirement",
      accountNumber: "4328-9960",
      institution: "Wells Fargo Advisors",
      advisor: "Linda Netjes",
      totalValue: 46414.89,
      asOfDate: asOf,
      taxStatus: "Retirement",
    });

    const sepIra: typeof trust = [
      { ticker: "HIMS", name: "Hims & Hers Health", quantity: 33,   price: 14.52, marketValue: 479.16 },
      { ticker: "ONDS", name: "Ondas Holdings",      quantity: 4556, price: 10.08, marketValue: 45924.48, unrealizedGainLoss: -11184.98 },
      { ticker: "CASH", name: "Bank Deposit Sweep",  quantity: 1,    price: 11.25, marketValue: 11.25 },
    ];
    for (const h of sepIra) {
      await ctx.db.insert("investmentHoldings", { ...h, accountNumber: "4328-9960", asOfDate: asOf });
    }

    // ── Account 3: WellsTrade Taxable (6073-1434) ─────────────────────────────
    await ctx.db.insert("investmentAccounts", {
      name: "WellsTrade",
      type: "Taxable",
      accountNumber: "6073-1434",
      institution: "Wells Fargo (WellsTrade)",
      totalValue: 38870.88,
      asOfDate: asOf,
      taxStatus: "Taxable",
    });

    const wellsTrade: typeof trust = [
      { ticker: "IREN", name: "IREN Ltd",           quantity: 927, price: 40.95,  marketValue: 37960.65 },
      { ticker: "CASH", name: "Bank Deposit Sweep", quantity: 1,   price: 910.23, marketValue: 910.23 },
    ];
    for (const h of wellsTrade) {
      await ctx.db.insert("investmentHoldings", { ...h, accountNumber: "6073-1434", asOfDate: asOf });
    }

    // ── Account 4: Roth IRA (7700-1347) ──────────────────────────────────────
    await ctx.db.insert("investmentAccounts", {
      name: "Roth IRA",
      type: "Retirement",
      accountNumber: "7700-1347",
      institution: "Wells Fargo Advisors",
      advisor: "Linda Netjes",
      totalValue: 139166.65,
      asOfDate: asOf,
      taxStatus: "Retirement",
    });

    const rothIra: typeof trust = [
      { ticker: "HIMS", name: "Hims & Hers Health", quantity: 9581, price: 14.52, marketValue: 139116.12 },
      { ticker: "CASH", name: "Cash + Sweep",        quantity: 1,    price: 50.53, marketValue: 50.53 },
    ];
    for (const h of rothIra) {
      await ctx.db.insert("investmentHoldings", { ...h, accountNumber: "7700-1347", asOfDate: asOf });
    }

    // ── Account 5: Taxable Brokerage (8690-7716) ──────────────────────────────
    await ctx.db.insert("investmentAccounts", {
      name: "Taxable Brokerage",
      type: "Taxable",
      accountNumber: "8690-7716",
      institution: "Wells Fargo Advisors",
      advisor: "Linda Netjes",
      totalValue: 13898.72,
      asOfDate: asOf,
      taxStatus: "Taxable",
    });

    const taxBrokerage: typeof trust = [
      { ticker: "HIMS", name: "Hims & Hers Health", quantity: 957, price: 14.52, marketValue: 13895.64 },
      { ticker: "CASH", name: "Bank Deposit Sweep",  quantity: 1,   price: 3.08,  marketValue: 3.08 },
    ];
    for (const h of taxBrokerage) {
      await ctx.db.insert("investmentHoldings", { ...h, accountNumber: "8690-7716", asOfDate: asOf });
    }

    return { ok: true, accounts: 5 };
  },
});

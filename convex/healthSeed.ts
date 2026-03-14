import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("compounds").collect();
    if (existing.length > 0) {
      return { message: "Already seeded" };
    }

    // Seed compounds
    await ctx.db.insert("compounds", {
      name: "Retatrutide (Reta)",
      dose: "1.25 mg/week",
      frequency: "Weekly",
      route: "SubQ injection",
      startDate: "2026-03-01",
      status: "active",
      notes: "GLP-1/GIP/glucagon triple agonist. Monitor weight, appetite, energy. Titrate up slowly.",
      sortOrder: 1,
    });

    await ctx.db.insert("compounds", {
      name: "AG1 (Athletic Greens)",
      dose: "1 scoop",
      frequency: "Daily",
      route: "Oral",
      startDate: "2026-01-01",
      status: "active",
      notes: "Greens powder, foundational micronutrients.",
      sortOrder: 2,
    });

    await ctx.db.insert("compounds", {
      name: "BPC-157",
      dose: "250–500 mcg/day",
      frequency: "Daily",
      route: "SubQ injection",
      startDate: "2026-04-11",
      status: "planned",
      notes: "Peptide for tissue repair and gut health. Starting post-Japan trip (April 11+).",
      sortOrder: 3,
    });

    await ctx.db.insert("compounds", {
      name: "GHK-Cu",
      dose: "TBD",
      frequency: "TBD",
      route: "SubQ injection",
      startDate: "2026-04-11",
      status: "planned",
      notes: "Copper peptide. Starting post-Japan, after BPC-157 introduction.",
      sortOrder: 4,
    });

    await ctx.db.insert("compounds", {
      name: "TRT (Testosterone Replacement)",
      dose: "TBD (pending bloodwork)",
      frequency: "Weekly",
      route: "SubQ injection",
      startDate: "2026-04-01",
      status: "planned",
      notes: "Pending baseline bloodwork on March 23, 2026. Protocol TBD based on results.",
      sortOrder: 5,
    });

    // Seed protocol notes
    await ctx.db.insert("protocolNotes", {
      date: "2026-03-01",
      phase: "Phase 1",
      note: "Initiated Phase 1: Retatrutide 1.25 mg/week SubQ + AG1 daily. Goal: establish baseline, assess tolerability, begin body recomp.",
    });

    await ctx.db.insert("protocolNotes", {
      date: "2026-03-23",
      phase: "Phase 2",
      note: "Bloodwork scheduled: comprehensive metabolic panel, testosterone, estradiol, lipids, CBC. Baseline for TRT decision.",
    });

    await ctx.db.insert("protocolNotes", {
      date: "2026-04-11",
      phase: "Phase 3",
      note: "Post-Japan return. Planned additions: BPC-157 (tissue repair, gut), then GHK-Cu (regenerative). Introduce one at a time, 2-week intervals.",
    });

    return { message: "Seeded successfully" };
  },
});

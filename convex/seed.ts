import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTasks = await ctx.db.query("tasks").first();
    if (existingTasks) return "Already seeded";

    const now = Date.now();

    // Seed tasks
    const tasks = [
      {
        title: "Build OurFable.ai MVP",
        description: "Custom storybook platform — upload a photo, AI generates a personalized storybook with that person as the main character. Need: image upload, face swap/gen, story generation, book layout, payments.",
        assignee: "Milo" as const,
        status: "todo" as const,
        priority: "high" as const,
      },
      {
        title: "Build Look & Seen website",
        description: "Portfolio and business site for Look & Seen, Inc. Showcase retouching/digital tech work, services, contact info. Target audience: commercial photo clients.",
        assignee: "Milo" as const,
        status: "todo" as const,
        priority: "medium" as const,
      },
      {
        title: "Set up Google Calendar + Gmail integration",
        description: "Configure gog CLI with OAuth credentials for Dave's Google account. Need: Google Cloud project, OAuth client, API enablement for Gmail, Calendar, Drive, Contacts.",
        assignee: "Dave" as const,
        status: "in_progress" as const,
        priority: "high" as const,
      },
      {
        title: "Set up Spotify integration",
        description: "Install and configure spotify-player skill so Milo can control playback and make recommendations.",
        assignee: "Milo" as const,
        status: "todo" as const,
        priority: "low" as const,
      },
      {
        title: "Install Tailscale on laptop",
        description: "Before Naples trip — install Tailscale on laptop with same account so Dave has remote access to Mac mini.",
        assignee: "Dave" as const,
        status: "todo" as const,
        priority: "urgent" as const,
      },
      {
        title: "Configure Mission Control as persistent service",
        description: "Set up Mission Control (Next.js + Convex) as a LaunchAgent so it auto-starts on boot, similar to OpenClaw gateway.",
        assignee: "Milo" as const,
        status: "todo" as const,
        priority: "medium" as const,
      },
    ];

    for (const task of tasks) {
      await ctx.db.insert("tasks", {
        ...task,
        createdAt: now - Math.random() * 2 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    }

    // Seed memories
    const memories = [
      {
        title: "Day One — Bootstrap",
        content: "Milo Brown came online for the first time on Feb 18, 2026. Dave named me, set up Telegram (@MiloBrownbot), configured Brave Search, installed QMD skill, set up Tailscale for remote access, and built Mission Control with Claude Code. Dave's communication style: no fluff, direct, mix of casual and serious. We're 51/49 partners — Dave has final say.",
        category: "Identity",
        tags: ["bootstrap", "setup", "day-one"],
      },
      {
        title: "Dave's Work Setup",
        content: "Dave is a digital technician and retoucher running Look & Seen, Inc in Minneapolis. Main client: Target. Tools: Capture One, Photoshop, ChronoSync, Dropbox. Getting into AI image generation as a service offering. Runs OpenClaw on a Mac mini (Tailscale IP: 100.125.94.36).",
        category: "Work",
        tags: ["dave", "photography", "tools", "setup"],
      },
      {
        title: "The Sweeney Family",
        content: "Dave Sweeney, Amanda Sweeney (wife), Soren Sweeney (son, born 6/21/2025), and Rigs the Lagotto Romagnolo (short for Rigatoni). Dave's mom's 70th birthday is Feb 25, 2026 — celebrating in Naples, FL.",
        category: "Family",
        tags: ["family", "sweeney", "personal"],
      },
      {
        title: "OurFable.ai — Product Vision",
        content: "Custom AI storybook website. Users upload a photo of a person/child, pick a story theme, and AI generates a personalized storybook with that person as the main character. Dave's photography eye gives a quality advantage over competitors. Stack TBD but likely Next.js + Convex. Revenue: per-book purchase or subscription.",
        category: "Projects",
        tags: ["ourfable", "ai", "product", "startup"],
      },
      {
        title: "Milo's Identity",
        content: "Name: Milo Brown. Email: MiloBrownAgent@gmail.com. Emoji: 🤙. AI partner — the 49% who actually does things. Direct, proactive, no fluff. Serious when it counts, casual when it doesn't. Push back on Dave's thinking, offer alternatives, but respect the 51/49.",
        category: "Identity",
        tags: ["milo", "identity", "personality"],
      },
    ];

    for (const memory of memories) {
      await ctx.db.insert("memories", {
        ...memory,
        createdAt: now - Math.random() * 1 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    }

    // Seed events
    const events = [
      {
        title: "Travel to Naples, FL",
        description: "Family trip to celebrate Dave's mom's 70th birthday",
        date: "2026-02-19",
        type: "event" as const,
      },
      {
        title: "Mom's 70th Birthday 🎂",
        description: "Dave's mom's 70th birthday celebration in Naples, FL",
        date: "2026-02-25",
        type: "event" as const,
      },
      {
        title: "Soren turns 8 months",
        description: "Soren Sweeney — 8 months old",
        date: "2026-02-21",
        type: "reminder" as const,
      },
      {
        title: "Mission Control — Phase 1 Complete",
        description: "Tasks Board, Memory Browser, Calendar built with Next.js + Convex. Phase 2: Content Pipeline, Team view, Office view.",
        date: "2026-02-18",
        time: "16:30",
        type: "task" as const,
      },
      {
        title: "Google Workspace Setup",
        description: "Finish OAuth setup for Gmail + Calendar access via gog CLI",
        date: "2026-02-20",
        type: "task" as const,
      },
    ];

    for (const event of events) {
      await ctx.db.insert("events", {
        ...event,
        createdAt: now,
      });
    }

    return "Seeded successfully";
  },
});

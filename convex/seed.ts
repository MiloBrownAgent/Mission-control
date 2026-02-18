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
        title: "Review photo editing workflow",
        description:
          "Document the current Lightroom → Photoshop pipeline and identify bottlenecks",
        assignee: "Dave" as const,
        status: "todo" as const,
        priority: "high" as const,
      },
      {
        title: "Set up automated backup system",
        description:
          "Configure incremental backups for the photo library to NAS and cloud",
        assignee: "Milo" as const,
        status: "in_progress" as const,
        priority: "urgent" as const,
      },
      {
        title: "Update portfolio website",
        description: "Add recent wedding shoots and update the about section",
        assignee: "Dave" as const,
        status: "todo" as const,
        priority: "medium" as const,
      },
      {
        title: "Research AI upscaling tools",
        description:
          "Compare Topaz, Gigapixel, and other AI upscaling options for print work",
        assignee: "Milo" as const,
        status: "todo" as const,
        priority: "low" as const,
      },
      {
        title: "Client delivery system",
        description:
          "Set up automated gallery delivery with download tracking",
        assignee: "Milo" as const,
        status: "done" as const,
        priority: "high" as const,
      },
      {
        title: "Color calibrate monitors",
        description:
          "Run SpyderX calibration on both editing monitors",
        assignee: "Dave" as const,
        status: "in_progress" as const,
        priority: "medium" as const,
      },
    ];

    for (const task of tasks) {
      await ctx.db.insert("tasks", {
        ...task,
        createdAt: now - Math.random() * 7 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    }

    // Seed memories
    const memories = [
      {
        title: "Dave's Editing Preferences",
        content:
          "Dave prefers a warm tone in portraits with lifted shadows. Uses VSCO Film 01 as a starting point. Skin retouching should be minimal — no frequency separation unless specifically requested. Always deliver in both sRGB (web) and Adobe RGB (print).",
        category: "Preferences",
        tags: ["editing", "portraits", "color"],
      },
      {
        title: "Studio Equipment List",
        content:
          "Main: Canon R5 Mark II, RF 28-70 f/2, RF 85 f/1.2. Lighting: 2x Profoto B10 Plus, 1x Profoto A2. Modifiers: 4ft octabox, strip boxes, beauty dish. Backgrounds: Savage seamless (thunder gray, super white).",
        category: "Equipment",
        tags: ["camera", "lighting", "studio"],
      },
      {
        title: "Client Communication Templates",
        content:
          "Booking confirmation: Send within 2 hours. Include date, location, package details, payment link. Follow up 1 week before shoot with preparation guide. Gallery delivery: 3-4 weeks turnaround, send preview within 48 hours.",
        category: "Workflow",
        tags: ["clients", "communication", "templates"],
      },
      {
        title: "Minneapolis Shoot Locations",
        content:
          "Favorite spots: Mill City Museum ruins (golden hour), Stone Arch Bridge, Minnehaha Falls (spring/summer), Lake Harriet bandshell. Indoor alternatives: North Loop warehouses, Aria event center. Permit required for most parks if using lighting equipment.",
        category: "Locations",
        tags: ["minneapolis", "locations", "outdoor"],
      },
      {
        title: "Pricing Structure 2024",
        content:
          "Portraits: $350/hr, minimum 2 hours. Weddings: packages from $3,500 to $8,000. Commercial: $500/hr + licensing. Retouching: included for portraits (basic), $50/image for advanced compositing.",
        category: "Business",
        tags: ["pricing", "business", "packages"],
      },
    ];

    for (const memory of memories) {
      await ctx.db.insert("memories", {
        ...memory,
        createdAt: now - Math.random() * 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    }

    // Seed events
    const events = [
      {
        title: "Wedding Shoot — Johnson",
        description: "Full day wedding at Aria Event Center. Ceremony at 3pm, reception until 11pm.",
        date: "2026-02-21",
        time: "14:00",
        type: "event" as const,
      },
      {
        title: "Portfolio Review",
        description: "Review and select images for website update",
        date: "2026-02-19",
        time: "10:00",
        type: "task" as const,
      },
      {
        title: "Backup Cron — Weekly",
        description: "Automated weekly backup of photo library to cloud storage",
        date: "2026-02-22",
        time: "02:00",
        type: "cron" as const,
      },
      {
        title: "Client Gallery Delivery",
        description: "Send final edited gallery to Martinez family",
        date: "2026-02-20",
        type: "reminder" as const,
      },
      {
        title: "Equipment Maintenance",
        description: "Clean sensors, check lens calibration, update firmware",
        date: "2026-02-25",
        time: "09:00",
        type: "task" as const,
      },
      {
        title: "Headshot Session — Corporate",
        description: "Team headshots for Bright Financial, 15 people",
        date: "2026-02-27",
        time: "13:00",
        type: "event" as const,
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

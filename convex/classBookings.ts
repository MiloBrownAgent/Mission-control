import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all upcoming class bookings (from today forward, not cancelled)
export const listUpcoming = query({
  args: { daysAhead: v.optional(v.number()) },
  handler: async (ctx, { daysAhead = 14 }) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAhead);
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

    const bookings = await ctx.db
      .query("classBookings")
      .withIndex("by_date", (q) => q.gte("classDate", todayStr).lte("classDate", endStr))
      .collect();

    // Convert "YYYY-MM-DD" + "8:00 AM" → sortable integer (avoids new Date() in Convex runtime)
    function toSortKey(date: string, time: string): number {
      const [timePart, meridiem] = time.split(" ");
      const [hStr, mStr] = timePart.split(":");
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || "0", 10);
      if (meridiem === "PM" && h !== 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      const dateNum = parseInt(date.replace(/-/g, ""), 10); // e.g. 20260228
      return dateNum * 10000 + h * 100 + m;
    }

    return bookings
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => toSortKey(a.classDate, a.classTime) - toSortKey(b.classDate, b.classTime));
  },
});

// Get bookings for a specific member on a specific date
export const getByMemberDate = query({
  args: { member: v.string(), classDate: v.string() },
  handler: async (ctx, { member, classDate }) => {
    return await ctx.db
      .query("classBookings")
      .withIndex("by_member_date", (q) => q.eq("member", member).eq("classDate", classDate))
      .collect();
  },
});

// Upsert a class booking (insert or update by member + date + className)
export const upsertClassBooking = mutation({
  args: {
    member: v.string(),
    className: v.string(),
    classDate: v.string(),
    classTime: v.string(),
    location: v.optional(v.string()),
    instructor: v.optional(v.string()),
    status: v.union(v.literal("booked"), v.literal("waitlisted"), v.literal("cancelled")),
    regId: v.optional(v.number()),
    spot: v.optional(v.string()),
    waitlistSpot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exists by member + date + className
    const existing = await ctx.db
      .query("classBookings")
      .withIndex("by_member_date", (q) => q.eq("member", args.member).eq("classDate", args.classDate))
      .collect();
    const match = existing.find((b) => b.className === args.className);

    if (match) {
      await ctx.db.patch(match._id, { ...args, bookedAt: Date.now() });
      return match._id;
    } else {
      return await ctx.db.insert("classBookings", { ...args, bookedAt: Date.now() });
    }
  },
});

// Cancel a booking by ID
export const cancelClassBooking = mutation({
  args: { id: v.id("classBookings") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "cancelled" });
  },
});

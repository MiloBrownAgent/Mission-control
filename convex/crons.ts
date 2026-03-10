import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daycare report sync: check Gmail for LineLeader emails
// Every 30 min, 2 PM – 6 PM CT (19:00–23:00 UTC), Mon–Fri
crons.cron(
  "daycare-report-sync",
  "0,30 19-23 * * 1-5",
  internal.daycareSync.syncDaycareReport
);

// WHOOP data sync: pull fresh recovery/sleep/workout every 2 hours
// Keeps the dashboard current even if webhooks stop firing
crons.interval("whoop-sync", { hours: 2 }, internal.whoopSync.syncAll);

export default crons;

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Manual trigger endpoint: POST /daycare-sync
http.route({
  path: "/daycare-sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.DAYCARE_WEBHOOK_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    await ctx.runAction(internal.daycareSync.syncDaycareReport, {});

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

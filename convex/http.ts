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

// CRE ingest endpoint: POST /api/cre/ingest
http.route({
  path: "/api/cre/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const result = await ctx.runMutation(internal.cre.batchUpsertProperties, {
      properties: body.properties,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

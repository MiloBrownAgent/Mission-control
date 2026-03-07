#!/usr/bin/env node
/**
 * soren-activities.js
 *
 * Curates 15 weekly activity ideas for Soren.
 * Calendar-aware: checks where the family will be that weekend and tailors to the location.
 *
 * Sources:
 *  - MN Parent emails (boxerfarmer1941@gmail.com)
 *  - Longfellow Whatever emails (boxerfarmer1941@gmail.com)
 *  - Minneapolis/Savannah/destination-specific family event sites
 *
 * Stores in Convex soren_activities table.
 * Notifies Dave + Amanda via Telegram.
 *
 * Cron: Thursdays 5 PM CST (0 23 * * 4)
 */

const https  = require("https");
const http   = require("http");
const { execSync } = require("child_process");

const CONVEX_URL     = "https://proper-rat-443.convex.cloud";
const DAVE_CHAT_ID   = "8510702982";
const AMANDA_CHAT_ID = "8086673232";

const TELEGRAM_BOT_TOKEN = (() => {
  try {
    const cfg = JSON.parse(require("fs").readFileSync("/Users/milo/.openclaw/openclaw.json", "utf8"));
    return cfg?.channels?.telegram?.botToken || null;
  } catch { return process.env.TELEGRAM_BOT_TOKEN || null; }
})();

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({ hostname, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    }, (res) => {
      let out = "";
      res.on("data", d => out += d);
      res.on("end", () => { try { resolve(JSON.parse(out)); } catch { resolve(out); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function fetchUrl(url, maxRedirects = 4) {
  return new Promise((resolve) => {
    try {
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" }, timeout: 10000 }, (res) => {
        if ((res.statusCode >= 301 && res.statusCode <= 303) && res.headers.location && maxRedirects > 0) {
          return fetchUrl(res.headers.location, maxRedirects - 1).then(resolve);
        }
        let data = "";
        res.on("data", d => data += d);
        res.on("end", () => resolve(data));
      });
      req.on("error", () => resolve(""));
      req.on("timeout", () => { req.destroy(); resolve(""); });
    } catch { resolve(""); }
  });
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/\s+/g, " ").trim();
}

async function convexMutation(path, args) {
  return httpsPost("proper-rat-443.convex.cloud", "/api/mutation", { path, args, format: "json" });
}

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) { console.log("[telegram] No token"); return; }
  return httpsPost("api.telegram.org", `/bot${TELEGRAM_BOT_TOKEN.trim()}/sendMessage`,
    { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}

// ── Calendar: detect location for coming weekend ──────────────────────────────

async function detectLocation() {
  // Check boxerfarmer1941 calendar for travel events in next 7 days
  try {
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const today   = new Date().toISOString().split("T")[0];
    const endDate = nextWeek.toISOString().split("T")[0];
    // gog calendar list outputs events as table rows; use plain text and parse
    const result = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog calendar list --account davesweeney2.8@gmail.com 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );
    // Parse plain text output: each line has ID, START, END, SUMMARY
    const lines = result.split("\n").slice(1).filter(l => l.trim());
    const evList = lines.map(l => {
      const parts = l.trim().split(/\s{2,}/);
      return { summary: parts[3] || parts[parts.length - 1] || "", start: parts[1] || "" };
    }).filter(e => {
      if (!e.start) return false;
      const d = new Date(e.start);
      return d >= new Date(today) && d <= new Date(endDate);
    });

    // Look for travel/flight events
    const travelKeywords = /flight|travel|savannah|chicago|new york|austin|nashville|portland|denver|miami|san diego|tokyo|kyoto|japan|vacation|trip/i;
    for (const ev of evList) {
      const title = (ev.summary || ev.title || "").toLowerCase();
      const desc  = (ev.description || "").toLowerCase();
      if (travelKeywords.test(title) || travelKeywords.test(desc)) {
        // Detect destination
        if (/savannah|sav|georgia|richmond hill/i.test(title + desc)) return { city: "Savannah", state: "GA", label: "Savannah, GA" };
        if (/japan|tokyo|kyoto/i.test(title + desc))                  return { city: "Tokyo", state: null, label: "Tokyo, Japan" };
        if (/chicago/i.test(title + desc))                            return { city: "Chicago", state: "IL", label: "Chicago, IL" };
      }
    }
  } catch (e) {
    console.log("[location] Calendar check failed:", e.message);
  }

  // Default: Minneapolis
  return { city: "Minneapolis", state: "MN", label: "Minneapolis, MN" };
}

// ── Email reading ─────────────────────────────────────────────────────────────

function readEmailBody(msgId, account) {
  try {
    const result = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog gmail thread get ${msgId} --account ${account} -j 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );
    const data = JSON.parse(result);
    const msgs = Array.isArray(data) ? data : [data];
    let text = "";
    const extractParts = (part) => {
      const body = part?.body?.data;
      if (body && (part.mimeType || "").includes("text")) {
        try {
          const dec = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
          text += stripHtml(dec) + " ";
        } catch {}
      }
      (part.parts || []).forEach(extractParts);
    };
    msgs.forEach(m => extractParts(m.payload || m));
    return text.slice(0, 5000);
  } catch { return ""; }
}

function getRecentEmails(query, account) {
  try {
    const result = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog gmail search "${query}" --account ${account} --limit 3 -j 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );
    const data = JSON.parse(result);
    if (Array.isArray(data)) return data;
    if (data.threads) return data.threads;
    if (data.messages) return data.messages;
    return [];
  } catch { return []; }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekOf() {
  // Next Saturday from today
  const now = new Date();
  const day = now.getDay();
  const daysUntilSat = day === 6 ? 7 : (6 - day);
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSat);
  return sat.toISOString().split("T")[0];
}

function getWeekLabel() {
  const now  = new Date();
  const end  = new Date(now); end.setDate(now.getDate() + 7);
  const opts = { month: "long", day: "numeric" };
  return `${now.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

// ── Activity pools by location ────────────────────────────────────────────────

function getMplsActivities(emailContent) {
  const extracted = extractFromEmails(emailContent);
  const standby = [
    { title: "Como Zoo & Conservatory", description: "Free admission always. The conservatory is warm and tropical in winter — Soren can see fish, birds, and lush plants up close. Perfect cold-weather outing.", location: "Como Park, St. Paul", url: "https://comozooconservatory.org", type: "idea" },
    { title: "Minneapolis Institute of Art (Mia)", description: "Free always. Lower level has a family art room with sensory materials. The galleries have wild colors and textures that light Soren up. Bring the stroller.", location: "2400 3rd Ave S, Minneapolis", url: "https://new.artsmia.org", type: "idea" },
    { title: "Hennepin County Library — Baby Story Time", description: "Free. East Lake branch has baby lapsit story time (songs, rhymes, books). Great for Soren's language development and you'll meet other parents.", location: "2727 E Lake St, Minneapolis", url: "https://www.hclib.org/programs/early-childhood", type: "idea" },
    { title: "Midtown Global Market", description: "Free to browse. Walk the stalls, let Soren take in sounds, smells, and lights. Grab a great lunch. Rigs-friendly outside.", location: "920 E Lake St, Minneapolis", url: "https://midtownglobalmarket.org", type: "idea" },
    { title: "Minnesota Children's Museum", description: "The 'World We Make' exhibit is designed specifically for babies under 2. Crawling tunnels, soft climbers, sensory walls. Soren will love it.", location: "10 W 7th St, St. Paul", url: "https://mcm.org", type: "idea" },
    { title: "Minnehaha Falls", description: "Bundle up and hit the falls if temps are above 30°F. Short walk, dramatic winter scenery. Bring Rigs too — he'll love the trail.", location: "Minnehaha Park, Minneapolis", type: "idea" },
    { title: "Lake Harriet Bandshell Walk", description: "Paved path around the lake — great stroller walk. Coffee at Bread & Pickle after. Even in March it's beautiful on a sunny day.", location: "Lake Harriet, Minneapolis", type: "idea" },
    { title: "Sensory Bin at Home", description: "Fill a shallow bin with oatmeal, dried pasta, or soft scarves. Soren is at peak sensory curiosity — 20 minutes of this beats a lot of outings.", type: "idea" },
    { title: "Target Field Neighborhood Walk + Eat", description: "Stroller walk through North Loop, stop at any coffee shop with space for a stroller. Weather-flexible and always fun.", location: "North Loop, Minneapolis", type: "idea" },
    { title: "Bde Maka Ska Stroller Loop", description: "Flat paved path around the lake — perfect stroller distance. Watch for ice patches in March. Pack a thermos.", location: "Bde Maka Ska, Minneapolis", type: "idea" },
    { title: "Mall of America — Nickelodeon Universe", description: "Free to walk around — you only pay for rides. Great on a cold wet day. Indoor, warm, and endlessly stimulating for a baby.", location: "Bloomington, MN", url: "https://www.mallofamerica.com", type: "idea" },
    { title: "Farmer's Market (Indoor Winter)", description: "Minneapolis Farmer's Market has an indoor winter market Saturdays. Fresh produce, local vendors, people-watching with Soren in the carrier.", location: "312 E Lyndale Ave N, Minneapolis", url: "https://mplsfarmersmarket.com", type: "idea" },
    { title: "Tummy Time & Music Session", description: "Put on a playlist of varied music (jazz, classical, anything with rhythm) and do tummy time on a blanket. Watch Soren track the sound. Simple and powerful.", type: "idea" },
    { title: "Hiawatha Coffee + Neighborhood Walk", description: "Grab coffee from Angry Catfish or Peace Coffee roastery, stroll the Longfellow neighborhood. 30-minute outing that resets everyone's mood.", location: "Longfellow, Minneapolis", type: "idea" },
    { title: "Baby Storytime at St. Paul Public Library", description: "Free. Multiple branches, multiple times per week. Rice Street branch has a particularly good baby program. Check schedule online.", location: "St. Paul", url: "https://sppl.org/programs/", type: "idea" },
  ];

  return [...extracted, ...standby].slice(0, 15);
}

function getSavannahActivities() {
  return [
    { title: "Forsyth Park Walk", description: "Savannah's most iconic park — wide paths, fountains, Spanish moss canopy. Perfect stroller outing. Grab coffee on the way.", location: "Forsyth Park, Savannah, GA", type: "idea" },
    { title: "Savannah History Museum", description: "Easy to navigate with a stroller, good air conditioning. Rich history and Soren will stare at the exhibits.", location: "303 Martin Luther King Jr Blvd, Savannah", url: "https://www.chsgeorgia.org", type: "idea" },
    { title: "River Street Stroll", description: "Walk the cobblestones along River Street with Soren in the carrier. Watch the ships go by, plenty of spots to stop and sit.", location: "River Street, Savannah, GA", type: "idea" },
    { title: "Bonaventure Cemetery Walk", description: "One of the most beautiful cemeteries in America — quiet, shaded, Spanish moss everywhere. Surreal and peaceful stroller walk.", location: "Bonaventure Cemetery, Savannah, GA", type: "idea" },
    { title: "Tybee Island Beach", description: "20 min from Savannah — let Soren feel sand for the first time if weather cooperates (March in Savannah is 60-70°F). First beach moment.", location: "Tybee Island, GA", type: "idea" },
    { title: "Savannah Squares Stroll — Chippewa & Monterey", description: "Walk the shaded squares with the stroller. Spanish moss, fountains, benches. Some of the best people-watching in the South.", location: "Downtown Savannah, GA", type: "idea" },
    { title: "The Olde Pink House or Cotton & Rye Lunch", description: "Bring Soren to a proper Savannah lunch. Both are stroller-friendly and have outdoor options if weather is nice.", location: "Savannah, GA", type: "idea" },
    { title: "Oatland Island Wildlife Center", description: "Local nature center with wolves, bison, and native Georgia wildlife. Stroller-friendly paths, great for an outdoor morning with Soren.", location: "711 Sandtown Rd, Savannah", url: "https://oatlandisland.org", type: "idea" },
    { title: "Wormsloe Historic Site", description: "The famous avenue of live oaks draped in Spanish moss — one of the most photographed spots in the South. Pure magic for family photos with Soren.", location: "7601 Skidaway Rd, Savannah", url: "https://gastateparks.org/Wormsloe", type: "idea" },
    { title: "Ford Field — Backyard Morning", description: "Lay a blanket in the yard, let Soren explore the grass. First real Southern spring air. No agenda.", location: "35 Belted Kingfisher Ln, Richmond Hill, GA", type: "idea" },
    { title: "Richmond Hill City Park", description: "Close to the house — walk, playground area, pond. Quick outing when you want to get outside without driving.", location: "Richmond Hill, GA", type: "idea" },
    { title: "Savannah Children's Museum (outdoors)", description: "Outdoor nature-based play area on the grounds of the Coastal Georgia Botanical Gardens. Good for an exploratory morning.", location: "Beaumont Dr, Savannah", url: "https://www.savannahbg.org", type: "idea" },
    { title: "Common Thread Dinner (March 14)", description: "Already booked — your Saturday dinner reservation. Great opportunity to dress Soren up and show him off to Vienna & Dylan.", location: "Common Thread, Savannah", type: "event", date: "March 14" },
    { title: "Fort Pulaski National Monument", description: "Easy stroller paths around the Civil War fort and salt marshes. Free with National Parks pass. Dramatic scenery and wild Georgia coast.", location: "Fort Pulaski, Savannah", url: "https://www.nps.gov/fopu", type: "idea" },
    { title: "Leopold's Ice Cream", description: "Savannah institution since 1919. Yes, Soren is too young for ice cream — but you're not. Take him for the vibe.", location: "212 E Broughton St, Savannah", type: "idea" },
  ];
}

function getGenericActivities(city, state) {
  return [
    { title: `Explore ${city} with the Stroller`, description: `Find a walkable neighborhood in ${city} and take Soren for a morning stroll. New sights, sounds, smells — all great for development.`, type: "idea" },
    { title: "Local Farmers Market", description: `Check if ${city} has a weekend farmers market. Great sensory experience for Soren — colors, sounds, people.`, type: "idea" },
    { title: "Local Children's Museum or Library", description: `Search for baby story time or an infant play area near your hotel/house. Most cities have a library program.`, url: `https://www.google.com/search?q=baby+story+time+${encodeURIComponent(city)}+${state || ""}`, type: "idea" },
    { title: "Tummy Time at the Hotel/House", description: "Set up a clean blanket wherever you're staying. Tummy time + new environment = great for Soren's development.", type: "idea" },
    { title: "Local Park Walk", description: `Find a park near you in ${city}. Fresh air, stroller-friendly paths, Rigs can come.`, type: "idea" },
  ];
}

function extractFromEmails(content) {
  if (!content || content.length < 100) return [];
  const eventKeywords = /museum|zoo|library|story.?time|class|workshop|exhibit|festival|market|aquarium|farm|nature|play|swim|sing|music|dance|art|craft|sensory|concert|fair/i;
  const lines = content.split(/\n|•|·|\||(?:\s{2,})/).map(l => l.trim()).filter(l => l.length > 25 && l.length < 250);
  const hits = [];
  for (const line of lines) {
    if (eventKeywords.test(line) && !/unsubscribe|privacy|click here|view online|footer/i.test(line)) {
      hits.push({ title: line.slice(0, 70), description: line, type: "event" });
    }
  }
  return hits.slice(0, 4);
}

// ── Main gather ───────────────────────────────────────────────────────────────

async function run() {
  console.log("[soren-activities] Detecting location...");
  const location = await detectLocation();
  console.log(`[soren-activities] Location: ${location.label}`);

  const sources = [location.label];
  let emailContent = "";

  // Only pull Minneapolis emails if we're home
  if (location.city === "Minneapolis") {
    console.log("[soren-activities] Reading emails...");
    const mnEmails = getRecentEmails("from:hello@mnparent.com", "boxerfarmer1941@gmail.com");
    for (const e of mnEmails.slice(0, 2)) {
      const body = readEmailBody(e.id || e.ID, "boxerfarmer1941@gmail.com");
      if (body) { emailContent += `\nMN PARENT (${e.subject || ""}):\n${body}\n`; sources.push("MN Parent"); }
    }
    const lfEmails = getRecentEmails("from:longfellowwhatever@ghost.io", "boxerfarmer1941@gmail.com");
    for (const e of lfEmails.slice(0, 1)) {
      const body = readEmailBody(e.id || e.ID, "boxerfarmer1941@gmail.com");
      if (body) { emailContent += `\nLONGFELLOW WHATEVER (${e.subject || ""}):\n${body}\n`; sources.push("Longfellow Whatever"); }
    }
  }

  // Generate items based on location
  let items;
  if (location.city === "Savannah") {
    items = getSavannahActivities();
  } else if (location.city === "Minneapolis") {
    items = getMplsActivities(emailContent);
  } else {
    items = getGenericActivities(location.city, location.state);
  }

  items = items.slice(0, 15);

  const weekOf    = getWeekOf();
  const weekLabel = getWeekLabel();

  console.log(`[soren-activities] ${items.length} items for week of ${weekOf} in ${location.label}`);

  // Save to Convex
  const result = await convexMutation("sorenActivities:saveWeeklyActivities", { weekOf, items, sources: [...new Set(sources)] });
  console.log("[convex] Saved:", result?.value || result);

  // Notify Dave + Amanda
  const eventItems = items.filter(i => i.type === "event");
  const ideaItems  = items.filter(i => i.type === "idea");
  const preview = items.slice(0, 5).map(i => {
    const emoji = i.type === "event" ? "📅" : "💡";
    const loc = i.location ? ` · ${i.location.split(",")[0]}` : "";
    return `${emoji} <b>${i.title}</b>${loc}`;
  }).join("\n");

  const locationTag = location.city !== "Minneapolis" ? ` · 📍${location.label}` : "";
  const msg = `🧒 <b>Soren's Week${locationTag}: ${weekLabel}</b>\n\n${preview}\n\n<i>+${items.length - 5} more ideas · sweeney.family/soren</i>`;

  console.log("[notify] Sending to Dave + Amanda...");
  await sendTelegram(DAVE_CHAT_ID, msg);
  await sendTelegram(AMANDA_CHAT_ID, msg);
  console.log("[soren-activities] Done ✅");
}

run().catch(err => { console.error("[soren-activities] Fatal:", err.message); process.exit(1); });

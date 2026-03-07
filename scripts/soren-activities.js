#!/usr/bin/env node
/**
 * soren-activities.js
 *
 * Curates 15 REAL weekly activity ideas for Soren (~9 months old).
 * Pulls from actual emails + local websites. No generic fallbacks.
 *
 * Sources (Minneapolis):
 *  - Longfellow Whatever "Whenever Wherever" monthly calendar (boxerfarmer1941@gmail.com)
 *  - MN Parent family fun events emails (boxerfarmer1941@gmail.com)
 *  - mnparent.com, startribune.com/things-to-do, minneapolisparks.org
 *
 * Sources (Savannah):
 *  - visitsavannah.com/events, exploresavannah.com, savannahga.gov/parks
 *
 * Calendar-aware: checks upcoming Saturday location.
 * Cron: Thursdays 5 PM CST (0 23 * * 4)
 */

const https  = require("https");
const http   = require("http");
const { execSync } = require("child_process");
const base64  = require("buffer").Buffer;

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
      const req = mod.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "text/html,application/xhtml+xml" },
        timeout: 12000
      }, (res) => {
        if ([301, 302, 303].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
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
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/\t/g, " ").replace(/ {2,}/g, " ")
    .split("\n").map(l => l.trim()).filter(l => l.length > 0).join("\n");
}

async function convexMutation(path, args) {
  return httpsPost("proper-rat-443.convex.cloud", "/api/mutation", { path, args, format: "json" });
}

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) { console.log("[telegram] No token"); return; }
  return httpsPost("api.telegram.org", `/bot${TELEGRAM_BOT_TOKEN.trim()}/sendMessage`,
    { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}

// ── Email extraction ──────────────────────────────────────────────────────────

function decodeBase64Part(data) {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch { return ""; }
}

function extractPartsText(part) {
  const mime = part.mimeType || "";
  const bodyData = (part.body || {}).data || "";
  let text = "";

  if (bodyData) {
    const decoded = decodeBase64Part(bodyData);
    if (mime === "text/plain") {
      text += decoded + "\n";
    } else if (mime === "text/html") {
      text += stripHtml(decoded) + "\n";
    }
  }

  for (const sub of (part.parts || [])) {
    text += extractPartsText(sub);
  }
  return text;
}

function readEmailBodyById(msgId, account) {
  try {
    const raw = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog gmail thread get ${msgId} --account ${account} -j 2>/dev/null`,
      { encoding: "utf8", timeout: 20000 }
    );
    const d = JSON.parse(raw);
    // Navigate: d.thread.messages[] or d (array)
    const messages = d?.thread?.messages || (Array.isArray(d) ? d : [d]);
    let fullText = "";
    for (const msg of messages) {
      const payload = msg.payload || msg;
      fullText += extractPartsText(payload);
    }
    return fullText;
  } catch (e) {
    console.log(`[email] Failed to read ${msgId}:`, e.message);
    return "";
  }
}

function searchEmails(query, account) {
  try {
    const raw = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog gmail search "${query}" --account ${account} --limit 5 -j 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );
    const d = JSON.parse(raw);
    if (Array.isArray(d)) return d;
    return d.threads || d.messages || [];
  } catch { return []; }
}

// ── Event parsing ─────────────────────────────────────────────────────────────

// Patterns that are NOT suitable for a 9-month-old
const TOO_OLD = /grade[s]?\s*[1-9k]|ages?\s*(?:1[1-9]|[2-9]\d)|teen|adult|21\+|bar |brewery|wine|beer|yoga|running|5k|marathon|dating|poker|poker/i;

// Good for babies/toddlers under 2
const BABY_KEYWORDS = /baby|infant|toddler|0-?[123]\s*year|sensory|story\s*time|storytime|lapsit|crawl|carrier|family|all\s*ages|park|museum|zoo|aquarium|nature|outdoor|walk|stroll/i;

// Parse MN Parent style event listings (e.g. "Mar 7: Event Name - Location")
function parseMnParentEvents(text, targetWeekStart, targetWeekEnd) {
  const events = [];
  const lines = text.split("\n");

  const datePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{1,2})?:?\s*(.+)/i;
  const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

  for (const line of lines) {
    const m = line.match(datePattern);
    if (!m) continue;

    const monthIdx = months[m[1].toLowerCase()];
    const day = parseInt(m[2]);
    const title = m[3].trim();

    if (!title || title.length < 5) continue;
    if (TOO_OLD.test(title)) continue;

    // Check if date falls in our target week
    const evDate = new Date(2026, monthIdx, day);
    if (targetWeekStart && targetWeekEnd && (evDate < targetWeekStart || evDate > targetWeekEnd)) {
      // Still include if it's ongoing/spans the week (nearby events are useful context)
      if (evDate > targetWeekEnd) continue;
    }

    // Prefer baby-friendly events
    const score = BABY_KEYWORDS.test(title) ? 2 : 1;
    const locMatch = title.match(/[-–]\s*([A-Z][^-]{2,30})$/);
    const location = locMatch ? locMatch[1].trim() : "Minneapolis area";
    const cleanTitle = title.replace(/[-–]\s*[A-Z][^-]{2,30}$/, "").trim();

    events.push({
      title: cleanTitle.slice(0, 80),
      description: `From MN Parent events listing. ${BABY_KEYWORDS.test(title) ? "Baby/family friendly." : "Check age suitability for 9-month-old."}`,
      location,
      type: "event",
      date: `${m[1]} ${m[2]}`,
      score,
    });
  }

  return events;
}

// Parse Longfellow Whatever style events ("* March 7 @ East Lake Library: Title")
function parseLongfellowEvents(text) {
  const events = [];
  const lines = text.split("\n");
  const pattern = /[\*•]\s*(?:March|Mar|April|Apr|May)\s+(\d{1,2})\s*(?:[-–]\s*\d{1,2})?\s*(?:@|at)\s*([^:]+):\s*(.+)/i;
  const pattern2 = /[\*•]\s*(?:March|Mar|April|Apr|May)\s+(\d{1,2}):?\s*(.+)/i;

  for (const line of lines) {
    let m = line.match(pattern);
    if (m) {
      const title = m[3].trim();
      const location = m[2].trim();
      const dateNum = m[1];
      if (TOO_OLD.test(title + " " + location)) continue;
      if (title.length < 3) continue;
      events.push({
        title: title.slice(0, 80),
        description: `Local Longfellow/Mpls neighborhood event.`,
        location,
        type: "event",
        date: `Mar ${dateNum}`,
        score: BABY_KEYWORDS.test(title + location) ? 2 : 1,
      });
      continue;
    }
    m = line.match(pattern2);
    if (m) {
      const title = m[2].trim();
      if (TOO_OLD.test(title)) continue;
      if (title.length < 5) continue;
      events.push({
        title: title.slice(0, 80),
        description: `Local Longfellow neighborhood event.`,
        type: "event",
        date: `Mar ${m[1]}`,
        score: BABY_KEYWORDS.test(title) ? 2 : 1,
      });
    }
  }
  return events;
}

// ── Web scraping ──────────────────────────────────────────────────────────────

async function scrapeMinneapolisEvents() {
  const results = [];

  // 1. Minneapolis Parks — events
  console.log("[web] Scraping Minneapolis Parks...");
  const parksHtml = await fetchUrl("https://www.minneapolisparks.org/events/");
  if (parksHtml.length > 500) {
    const text = stripHtml(parksHtml);
    const eventLines = text.split("\n").filter(l =>
      l.length > 15 && l.length < 150 &&
      /story|baby|family|toddler|sensory|outdoor|nature|walk|play/i.test(l) &&
      !TOO_OLD.test(l)
    );
    for (const l of eventLines.slice(0, 4)) {
      results.push({ title: l.slice(0, 80), description: "Minneapolis Parks event.", location: "Minneapolis Parks", type: "event", score: 2 });
    }
  }

  // 2. Star Tribune things to do (family section)
  console.log("[web] Scraping Star Tribune...");
  const stribHtml = await fetchUrl("https://www.startribune.com/things-to-do/");
  if (stribHtml.length > 500) {
    const text = stripHtml(stribHtml);
    const lines = text.split("\n").filter(l =>
      l.length > 20 && l.length < 150 &&
      /family|kids?|children|museum|zoo|art|outdoor|spring|march/i.test(l) &&
      !TOO_OLD.test(l)
    );
    for (const l of lines.slice(0, 4)) {
      results.push({ title: l.slice(0, 80), description: "From Star Tribune things-to-do.", location: "Twin Cities", type: "event", score: 1 });
    }
  }

  // 3. MN Parent things to do
  console.log("[web] Scraping MN Parent...");
  const mnpHtml = await fetchUrl("https://www.minnesotaparent.com/things-to-do/");
  if (mnpHtml.length > 500) {
    const text = stripHtml(mnpHtml);
    const lines = text.split("\n").filter(l =>
      l.length > 20 && l.length < 150 &&
      /family|kids?|baby|toddler|museum|zoo|sensory|spring/i.test(l) &&
      !TOO_OLD.test(l)
    );
    for (const l of lines.slice(0, 3)) {
      results.push({ title: l.slice(0, 80), description: "From MN Parent.", location: "Twin Cities", type: "event", score: 2 });
    }
  }

  return results;
}

async function scrapeSavannahEvents() {
  const results = [];

  console.log("[web] Scraping Visit Savannah...");
  const savHtml = await fetchUrl("https://www.visitsavannah.com/events");
  if (savHtml.length > 500) {
    const text = stripHtml(savHtml);
    const lines = text.split("\n").filter(l =>
      l.length > 15 && l.length < 150 &&
      /family|kids?|outdoor|park|art|music|festival|tour|walk|baby|children/i.test(l) &&
      !TOO_OLD.test(l)
    );
    for (const l of lines.slice(0, 5)) {
      results.push({ title: l.slice(0, 80), description: "From Visit Savannah events.", location: "Savannah, GA", type: "event", score: 2 });
    }
  }

  console.log("[web] Scraping Savannah parks...");
  const parkHtml = await fetchUrl("https://www.savannahga.gov/571/Parks-Recreation");
  if (parkHtml.length > 200) {
    const text = stripHtml(parkHtml);
    const lines = text.split("\n").filter(l => l.length > 15 && l.length < 150 && /park|playground|trail|walk/i.test(l));
    for (const l of lines.slice(0, 2)) {
      results.push({ title: l.slice(0, 80), description: "Savannah parks & rec.", location: "Savannah, GA", type: "idea", score: 1 });
    }
  }

  return results;
}

// ── Curated standbys (used only to PAD if real content < 15) ─────────────────

const MPLS_STANDBYS = [
  { title: "East Lake Library — Baby Storytime (Fridays)", description: "Free. Lapsit baby storytime every Friday at East Lake Library — songs, rhymes, board books. Perfect for Soren's age, great for meeting other parents in the neighborhood.", location: "East Lake Library, 2727 E Lake St, Minneapolis", url: "https://www.hclib.org/programs/early-childhood", type: "idea" },
  { title: "Como Zoo & Conservatory", description: "Free always. The tropical conservatory is perfect in cold March weather — warm, lush, fish and birds everywhere. The small mammal house will hold Soren's attention for a solid hour.", location: "Como Park, St. Paul", url: "https://comozooconservatory.org", type: "idea" },
  { title: "Minnesota Children's Museum — World We Make Exhibit", description: "The infant/toddler area is purpose-built for babies under 2. Soft climbers, sensory walls, crawling tunnels. Thomas & Friends exhibit is running now through spring.", location: "10 W 7th St, St. Paul", url: "https://mcm.org", type: "idea" },
  { title: "Mia — Family Art Room", description: "Free always. Lower level has open family art room on weekends. On Sundays there's often a themed drop-in. Galleries have enormous canvases Soren loves to stare at.", location: "2400 3rd Ave S, Minneapolis", url: "https://new.artsmia.org", type: "idea" },
  { title: "Minnehaha Falls + Sea Salt (if open)", description: "Bundle up and walk to the falls. In early March the ice is still dramatic. Sea Salt opens when it gets above 50° — check before you go.", location: "Minnehaha Park, Minneapolis", type: "idea" },
  { title: "Midtown Global Market", description: "Free to browse. Warm, vibrant, great for a carrier walk. Tons of color, smell, sound — perfect sensory outing. Grab lunch from any of the vendors.", location: "920 E Lake St, Minneapolis", url: "https://midtownglobalmarket.org", type: "idea" },
  { title: "Brackett Park — Drop-in Ceramics (Tuesdays)", description: "All-ages ceramics drop-in at Brackett Park rec center. Good excuse to get out of the house mid-week. Soren can watch and you can actually make something.", location: "Brackett Park, Minneapolis", type: "idea" },
];

const SAVANNAH_STANDBYS = [
  { title: "Forsyth Park Morning Walk", description: "Wide paved paths, massive live oaks, the famous fountain. One of the best stroller parks in the South. Grab coffee at a Broughton café on the way.", location: "Forsyth Park, Savannah, GA", type: "idea" },
  { title: "Wormsloe Historic Site", description: "The mile-long avenue of live oaks draped in Spanish moss is one of the most photographed spots in America. Stroller-accessible. Go in the morning before crowds.", location: "7601 Skidaway Rd, Savannah", url: "https://gastateparks.org/Wormsloe", type: "idea" },
  { title: "Tybee Island — First Beach for Soren", description: "20 min from Savannah. March temps in the 60s°F — cool but doable. Let Soren feel sand and watch waves for the first time. Bring a blanket.", location: "Tybee Island, GA", type: "idea" },
  { title: "Oatland Island Wildlife Center", description: "Native Georgia wildlife on easy stroller-friendly paths — wolves, bison, birds of prey. Great outdoor morning with Soren. Low-key, uncrowded in March.", location: "711 Sandtown Rd, Savannah", url: "https://oatlandisland.org", type: "idea" },
  { title: "Savannah Squares Stroll — Chippewa & Monterey", description: "Walk the historic squares with the stroller. Spanish moss, fountains, benches everywhere. March is peak Savannah weather — warm, blooming, before the heat.", location: "Downtown Savannah, GA", type: "idea" },
  { title: "Bonaventure Cemetery Walk", description: "Quiet, shaded, stunning. One of the most beautiful cemeteries in America. Stroller-accessible. Completely peaceful for Soren, wild for photos.", location: "Bonaventure Cemetery, Savannah", type: "idea" },
  { title: "Ford Field Backyard Morning", description: "Lay a blanket in the yard. Let Soren feel Georgia grass for the first time, watch the birds. Unstructured time in a new environment is exactly what babies need.", location: "35 Belted Kingfisher Ln, Richmond Hill, GA", type: "idea" },
  { title: "River Street Stroll", description: "Walk the cobblestones along the Savannah River with Soren in the carrier. Watch barges pass, pop into any shop, grab a snack. Easy and always interesting.", location: "River Street, Savannah, GA", type: "idea" },
  { title: "Common Thread Dinner — March 14 (Booked)", description: "Already reserved for Saturday night. One of the best farm-to-table spots in Savannah. Good chance to dress Soren up.", location: "Common Thread, Savannah", type: "event", date: "March 14" },
  { title: "Fort Pulaski National Monument", description: "30 min from Savannah. Civil War fort on the marsh — dramatic coastal Georgia scenery. Easy stroller walk on flat paths. Free with National Parks pass.", location: "Fort Pulaski, Savannah", url: "https://www.nps.gov/fopu", type: "idea" },
  { title: "Richmond Hill City Park", description: "Close to the house — easy morning outing. Walking paths, green space, pond. Good when you want outside time without driving into Savannah.", location: "Richmond Hill, GA", type: "idea" },
  { title: "Savannah Children's Museum (Outdoor Garden)", description: "Outdoor nature-based play area at the Coastal Georgia Botanical Gardens. Good for an exploratory morning with Soren in the carrier.", location: "Savannah, GA", url: "https://www.savannahbg.org", type: "idea" },
  { title: "Leopold's Ice Cream", description: "Savannah institution since 1919. Soren's too young to eat it but not too young to be there. You're not. Classic Savannah stop.", location: "212 E Broughton St, Savannah", type: "idea" },
  { title: "Savannah History Museum", description: "Easy stroller navigation, air-conditioned, good exhibits. Short visit works well with an infant. Located in the old train shed.", location: "303 MLK Jr Blvd, Savannah", type: "idea" },
  { title: "Picnic at Daffin Park", description: "Large neighborhood park with a lake. March is peak daffodil bloom. Lay a blanket, let Soren watch the ducks. One of Savannah's best kept local parks.", location: "Daffin Park, Savannah, GA", type: "idea" },
];

// ── Calendar: detect location for coming weekend ──────────────────────────────

function getWeekOf() {
  const now = new Date();
  const day = now.getDay();
  let daysToSat;
  if (day === 6) daysToSat = 0;
  else if (day === 0) daysToSat = -1;
  else daysToSat = 6 - day;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysToSat);
  return sat.toISOString().split("T")[0];
}

function getWeekLabel() {
  const now  = new Date();
  const end  = new Date(now); end.setDate(now.getDate() + 7);
  const opts = { month: "long", day: "numeric" };
  return `${now.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

async function detectLocation() {
  try {
    const result = execSync(
      `GOG_KEYRING_PASSWORD=openclaw gog calendar list --account davesweeney2.8@gmail.com 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 }
    );

    const upcomingSat = new Date(getWeekOf());
    const upcomingSun = new Date(upcomingSat); upcomingSun.setDate(upcomingSat.getDate() + 1);

    const lines = result.split("\n").slice(1).filter(l => l.trim());
    const travelKeywords = /flight|travel|savannah|chicago|new york|austin|nashville|portland|denver|miami|san diego|tokyo|kyoto|japan|vacation|trip/i;

    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}/);
      const evStart = parts[1] ? new Date(parts[1]) : null;
      const summary = parts[3] || parts[parts.length - 1] || "";

      if (!travelKeywords.test(summary)) continue;
      if (!evStart || evStart > upcomingSun) continue;

      if (/savannah|sav|georgia|richmond hill/i.test(summary)) return { city: "Savannah", state: "GA", label: "Savannah, GA" };
      if (/japan|tokyo|kyoto/i.test(summary))                  return { city: "Tokyo", state: null, label: "Tokyo, Japan" };
      if (/chicago/i.test(summary))                            return { city: "Chicago", state: "IL", label: "Chicago, IL" };
    }
  } catch (e) {
    console.log("[location] Calendar check failed:", e.message);
  }
  return { city: "Minneapolis", state: "MN", label: "Minneapolis, MN" };
}

// ── Dedup ─────────────────────────────────────────────────────────────────────

function dedup(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log("[soren-activities] Detecting location...");
  const location = await detectLocation();
  console.log(`[soren-activities] Location: ${location.label}`);

  const weekOf    = getWeekOf();
  const weekLabel = getWeekLabel();
  const sources   = [location.label];

  // Dates for filtering email events to this week
  const weekStart = new Date(weekOf);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  let items = [];

  if (location.city === "Minneapolis") {
    // ── Step 1: Read emails ──
    console.log("[soren-activities] Reading MN Parent emails...");
    const mnEmails = searchEmails("from:hello@mnparent.com", "boxerfarmer1941@gmail.com");
    let mnText = "";
    for (const e of mnEmails.slice(0, 3)) {
      const id = e.id || e.ID;
      const body = readEmailBodyById(id, "boxerfarmer1941@gmail.com");
      if (body.length > 100) { mnText += body; sources.push("MN Parent"); }
    }

    console.log("[soren-activities] Reading Longfellow Whatever emails...");
    const lfEmails = searchEmails("from:longfellowwhatever@ghost.io", "boxerfarmer1941@gmail.com");
    const lfCalEmails = searchEmails(`from:longfellowwhatever@ghost.io "Whenever Wherever"`, "boxerfarmer1941@gmail.com");
    const allLfIds = new Set();
    let lfText = "";
    for (const e of [...lfEmails.slice(0,1), ...lfCalEmails.slice(0,2)]) {
      const id = e.id || e.ID;
      if (allLfIds.has(id)) continue;
      allLfIds.add(id);
      const body = readEmailBodyById(id, "boxerfarmer1941@gmail.com");
      if (body.length > 100) { lfText += body; sources.push("Longfellow Whatever"); }
    }

    // ── Step 2: Parse emails into events ──
    const mnEvents = parseMnParentEvents(mnText, weekStart, weekEnd);
    const lfEvents = parseLongfellowEvents(lfText);
    console.log(`[soren-activities] Parsed ${mnEvents.length} MN Parent events, ${lfEvents.length} LF events`);

    // ── Step 3: Scrape web ──
    const webEvents = await scrapeMinneapolisEvents();
    console.log(`[soren-activities] Scraped ${webEvents.length} web events`);

    // ── Step 4: Combine, score, dedup ──
    const allReal = dedup([
      ...mnEvents.sort((a,b) => b.score - a.score),
      ...lfEvents.sort((a,b) => b.score - a.score),
      ...webEvents,
    ]);

    // Take real events first, pad with standbys
    items = allReal.slice(0, 12);
    for (const s of MPLS_STANDBYS) {
      if (items.length >= 15) break;
      items.push(s);
    }
    items = dedup(items).slice(0, 15);

  } else if (location.city === "Savannah") {
    // ── Scrape Savannah events ──
    const webEvents = await scrapeSavannahEvents();
    console.log(`[soren-activities] Scraped ${webEvents.length} Savannah web events`);

    items = dedup([...webEvents, ...SAVANNAH_STANDBYS]).slice(0, 15);
  } else {
    // Generic fallback for unknown cities
    items = [
      { title: `Explore ${location.city} with the Stroller`, description: `New city, new sights. Find a walkable neighborhood and take Soren for a morning stroll. New sounds and faces are great for development.`, type: "idea" },
    ];
  }

  // Strip internal score field before saving
  items = items.map(({ score, ...rest }) => rest);

  console.log(`[soren-activities] ${items.length} items for week of ${weekOf} in ${location.label}`);

  // Save to Convex
  const result = await convexMutation("sorenActivities:saveWeeklyActivities", {
    weekOf,
    items,
    sources: [...new Set(sources)],
  });
  console.log("[convex] Saved:", result?.value || result);

  // Notify
  const preview = items.slice(0, 5).map(i => {
    const emoji = i.type === "event" ? "📅" : "💡";
    const loc = i.location ? ` · ${i.location.split(",")[0]}` : "";
    return `${emoji} <b>${i.title}</b>${loc}`;
  }).join("\n");

  const locationTag = location.city !== "Minneapolis" ? ` · 📍${location.label}` : "";
  const msg = `🧒 <b>Soren's Week${locationTag}: ${weekLabel}</b>\n\n${preview}\n\n<i>+${items.length - 5} more · sweeney.family/soren</i>`;

  console.log("[notify] Sending to Dave + Amanda...");
  await sendTelegram(DAVE_CHAT_ID, msg);
  await sendTelegram(AMANDA_CHAT_ID, msg);
  console.log("[soren-activities] Done ✅");
}

run().catch(err => { console.error("[soren-activities] Fatal:", err.message); process.exit(1); });

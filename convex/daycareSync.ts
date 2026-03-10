import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Gmail API helpers

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `Missing Gmail OAuth credentials. CLIENT_ID=${clientId ? "set" : "missing"}, SECRET=${clientSecret ? "set" : "missing"}, TOKEN=${refreshToken ? "set" : "missing"}`
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

async function searchGmail(
  accessToken: string,
  query: string
): Promise<{ id: string; threadId: string }[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail search failed: ${res.status} ${err}`);
  }

  const data: any = await res.json();
  return data.messages || [];
}

async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail get message failed: ${res.status} ${err}`);
  }

  return res.json();
}

// Base64url decode (no Buffer in Convex V8 runtime)
function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to multiple of 4
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

// Extract HTML body from Gmail message payload
function extractHtmlBody(payload: any): string {
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return base64urlDecode(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return base64urlDecode(part.body.data);
      }
      if (part.parts) {
        const nested = extractHtmlBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

// Get subject from headers
function getSubject(message: any): string {
  const headers = message.payload?.headers || [];
  const subjectHeader = headers.find(
    (h: any) => h.name.toLowerCase() === "subject"
  );
  return subjectHeader?.value || "";
}

// Strip HTML to text
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse LineLeader report from HTML
function parseReport(html: string) {
  const text = stripHtml(html);

  // Check In / Check Out
  const checkInMatch =
    text.match(/Check[- ]?in\s*@\s*(\d+:\d+\s*[ap]m)/i) ||
    html.match(
      /Check In<\/span>\s*<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*>\s*<span[^>]*>([\d:]+\s*[AP]M)<\/span>/i
    );
  const checkOutMatch =
    text.match(/Check[- ]?out\s*@\s*(\d+:\d+\s*[ap]m)/i) ||
    html.match(
      /Check Out<\/span>\s*<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*>\s*<span[^>]*>([\d:]+\s*[AP]M)<\/span>/i
    );

  const checkInText = text.match(/Check In\s+([\d:]+\s*[AP]M)/i);
  const checkOutText = text.match(/Check Out\s+([\d:]+\s*[AP]M)/i);

  const checkIn =
    checkInMatch?.[1] || checkInText?.[1] || null;
  const checkOut =
    checkOutMatch?.[1] || checkOutText?.[1] || null;

  // Total time
  const totalTimeMatch = text.match(/Total time:\s*([\dhm\s]+)/i);
  const totalTime = totalTimeMatch ? totalTimeMatch[1].trim() : null;

  // Sleep
  const totalSleepMatch = text.match(/Total Sleep:\s*([\dNaAnh\s]+m)/i);
  let totalSleep: string | null = null;
  if (totalSleepMatch) {
    const rawSleep = totalSleepMatch[1].trim();
    if (!rawSleep.includes("NaN")) totalSleep = rawSleep;
  }

  const totalNapsMatch = text.match(/Total Naps:\s*(\d+)/i);
  const totalNaps = totalNapsMatch ? parseInt(totalNapsMatch[1], 10) : null;

  // Meals
  const mealsMatch = text.match(/Meals:\s*(\d+)/i);
  const meals = mealsMatch ? parseInt(mealsMatch[1], 10) : null;

  // Potty
  const peeMatch =
    text.match(/Mojado\s*(\d+)/i) || text.match(/Wet\s*(\d+)/i);
  const poopMatch =
    text.match(/Sucio\s*(\d+)/i) || text.match(/Poop\s*(\d+)/i);
  const pees = peeMatch ? parseInt(peeMatch[1], 10) : null;
  const poops = poopMatch ? parseInt(poopMatch[1], 10) : null;

  // Photo URL
  const photoMatch =
    html.match(
      /href="https:\/\/app\.momentpath[^"]+">[\s\S]*?<img src="(https:\/\/tendlymr\.s3[^"]+medium\.jpg)"/i
    ) ||
    html.match(
      /alt="child-image2"[^>]*>[\s\S]{0,200}?src="(https:\/\/tendlymr\.s3[^"]+\.jpg)"/i
    ) ||
    html.match(
      /src="(https:\/\/tendlymr\.s3\.amazonaws\.com\/resized\/[^"]+medium\.jpg)"/i
    );
  const photoUrl = photoMatch ? photoMatch[1] : null;

  return { checkIn, checkOut, totalTime, totalSleep, totalNaps, meals, pees, poops, photoUrl };
}

// Parse date from email subject
function parseDateFromSubject(subject: string): string {
  const dateMatch = subject.match(/(\w+)\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (dateMatch) {
    const d = new Date(`${dateMatch[2]} ${dateMatch[3]}, ${dateMatch[4]}`);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export const syncDaycareReport = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔍 Daycare sync: fetching latest LineLeader report...");

    const accessToken = await getAccessToken();

    const messages = await searchGmail(
      accessToken,
      'from:no-reply@lineleader.com subject:"Tierra Encantada"'
    );

    if (messages.length === 0) {
      console.log("📭 No LineLeader emails found");
      return { status: "no_emails" };
    }

    const messageId = messages[0].id;
    const message = await getGmailMessage(accessToken, messageId);

    const subject = getSubject(message);
    const htmlBody = extractHtmlBody(message.payload);

    if (!htmlBody) {
      console.log("❌ Could not extract email body");
      return { status: "no_body" };
    }

    console.log(`📧 Found: ${subject} (${htmlBody.length} chars)`);

    const date = parseDateFromSubject(subject);
    const parsed = parseReport(htmlBody);

    console.log(`📊 Parsed for ${date}:`, JSON.stringify(parsed));

    const args: any = {
      date,
      childName: "Soren Sweeney",
      rawSubject: subject,
      parsedAt: Date.now(),
    };

    if (parsed.checkIn) args.checkIn = parsed.checkIn;
    if (parsed.checkOut) args.checkOut = parsed.checkOut;
    if (parsed.totalTime) args.totalTime = parsed.totalTime;
    if (parsed.totalSleep) args.totalSleep = parsed.totalSleep;
    if (parsed.totalNaps != null) args.totalNaps = parsed.totalNaps;
    if (parsed.meals != null) args.meals = parsed.meals;
    if (parsed.pees != null) args.pees = parsed.pees;
    if (parsed.poops != null) args.poops = parsed.poops;
    if (parsed.photoUrl) args.photoUrl = parsed.photoUrl;

    await ctx.runMutation(internal.daycareReports.upsertInternal, args);

    console.log(`✅ Daycare report saved for ${date}`);
    return { status: "synced", date, parsed };
  },
});

#!/usr/bin/env node
// book-dirty-french.js — Auto-books Dirty French New York on Resy
// Target: May 18, 2026 | Party of 3 | 6 PM (fallback: 6:30 PM, 7 PM)
// Run at: April 17, 2026 11:00 PM CST (midnight ET — Resy 30-day window opens)
//
// Usage:
//   node book-dirty-french.js          → live run (books for real)
//   node book-dirty-french.js --dry    → dry run (auth + find slots, no booking)

const https   = require('https');
const fs      = require('fs');
const path    = require('path');

// ─── Config ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry');

const CONFIG = {
  // Resy credentials
  email:          'davesweeney2.8@gmail.com',
  password:       'Dtsmyman1',
  apiKey:         'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5',

  // Booking target
  venueId:        35679,           // Dirty French New York
  venueName:      'Dirty French New York',
  date:           '2026-05-18',
  partySize:      3,
  preferredTimes: ['18:00', '18:30', '19:00'],  // 6 PM, 6:30 PM, 7 PM

  // Resy polling (slots open at midnight ET — script fires at 11 PM CST)
  pollStartMs:    0,          // start immediately
  pollIntervalMs: 3000,       // retry every 3 seconds
  pollTimeoutMs:  600_000,    // give up after 10 minutes

  // Telegram
  telegramBotToken: '8214613908:AAGhMq6p7ygcybeS6fdWnf-DnpuUEJvDfOY',
  telegramChatId:   '8510702982',

  logFile: path.join(__dirname, 'book-dirty-french.log'),
};

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(...args) {
  const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const line = `[${ts}] ${DRY_RUN ? '[DRY] ' : ''}${args.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(CONFIG.logFile, line + '\n'); } catch(e) {}
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function request(method, url, headers, body, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method,
      headers:  { ...headers },
      timeout:  timeoutMs,
    };

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyStr);
    }
    req.end();
  });
}

// ─── Telegram ────────────────────────────────────────────────────────────────

async function sendTelegram(text) {
  try {
    const body = JSON.stringify({
      chat_id:    CONFIG.telegramChatId,
      text,
      parse_mode: 'HTML',
    });
    await request('POST',
      `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`,
      { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      body,
    );
    log('Telegram sent');
  } catch (e) {
    log('Telegram error:', e.message);
  }
}

// ─── Resy API helpers ─────────────────────────────────────────────────────────

function resyHeaders(token = null) {
  const h = {
    'Authorization': `ResyAPI api_key="${CONFIG.apiKey}"`,
    'Content-Type':  'application/x-www-form-urlencoded',
    'User-Agent':    'Mozilla/5.0 (compatible; ResyBot/1.0)',
    'Origin':        'https://resy.com',
    'Referer':       'https://resy.com',
  };
  if (token) h['X-Resy-Auth-Token'] = token;
  return h;
}

function encodeForm(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// ─── Step 1: Auth ────────────────────────────────────────────────────────────

async function authenticate() {
  log('Authenticating with Resy...');
  const body = encodeForm({ email: CONFIG.email, password: CONFIG.password });
  const res = await request('POST',
    'https://api.resy.com/3/auth/password',
    { ...resyHeaders(), 'Content-Length': Buffer.byteLength(body) },
    body,
  );

  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Auth failed: ${res.status} — ${JSON.stringify(res.body)}`);
  }

  const { token, payment_method_id } = res.body;
  log(`Auth OK — user ID: ${res.body.id}, payment method: ${payment_method_id}`);
  return { token, paymentMethodId: payment_method_id };
}

// ─── Step 2: Find slots ───────────────────────────────────────────────────────

async function findSlots(token) {
  const url = new URL('https://api.resy.com/4/find');
  url.searchParams.set('lat',        '0');
  url.searchParams.set('long',       '0');
  url.searchParams.set('day',        CONFIG.date);
  url.searchParams.set('party_size', CONFIG.partySize.toString());
  url.searchParams.set('venue_id',   CONFIG.venueId.toString());

  const res = await request('GET', url.toString(), resyHeaders(token));

  if (res.status !== 200) {
    log(`Find slots error: ${res.status}`);
    return [];
  }

  const venues = res.body?.results?.venues || [];
  const slots  = venues.flatMap(v => v.slots || []);
  return slots;
}

// ─── Step 3: Pick best slot ───────────────────────────────────────────────────

function pickSlot(slots) {
  // slots have .date.start like "2026-05-18 18:00:00"
  for (const pref of CONFIG.preferredTimes) {
    const match = slots.find(s => {
      const start = s.date?.start || '';
      return start.includes(pref);
    });
    if (match) {
      log(`✓ Matched preferred time ${pref}`);
      return match;
    }
  }

  // Fallback: any slot between 17:00–21:00
  const fallback = slots.find(s => {
    const start = s.date?.start || '';
    const m = start.match(/(\d{2}):(\d{2})/);
    if (!m) return false;
    const hour = parseInt(m[1]);
    return hour >= 17 && hour <= 21;
  });

  if (fallback) {
    log(`Using fallback slot: ${fallback.date?.start}`);
    return fallback;
  }

  return null;
}

// ─── Step 4: Get booking details (config_id + book_token) ────────────────────

async function getSlotDetails(token, slot) {
  const configToken = slot.config?.token;
  if (!configToken) throw new Error('No config token in slot');

  const body = encodeForm({
    config_id:  configToken,
    day:        CONFIG.date,
    party_size: CONFIG.partySize.toString(),
  });

  const res = await request('POST',
    'https://api.resy.com/3/details',
    { ...resyHeaders(token), 'Content-Length': Buffer.byteLength(body) },
    body,
  );

  if (res.status !== 200 || !res.body) {
    throw new Error(`Details failed: ${res.status} — ${JSON.stringify(res.body)}`);
  }

  const bookToken    = res.body.book_token?.value;
  const configId     = res.body.config?.token;

  log(`Slot details OK — book_token: ${bookToken?.slice(0, 30)}...`);
  return { bookToken, configId, details: res.body };
}

// ─── Step 5: Book ────────────────────────────────────────────────────────────

async function book(token, bookToken, paymentMethodId, slot) {
  if (DRY_RUN) {
    log(`[DRY] Would book: ${slot.date?.start} — token: ${bookToken?.slice(0,20)}...`);
    return { dry: true };
  }

  const body = encodeForm({
    book_token:        bookToken,
    payment_method_id: paymentMethodId.toString(),
    source_id:         'resy.com-venue-details',
  });

  const res = await request('POST',
    'https://api.resy.com/3/book',
    { ...resyHeaders(token), 'Content-Length': Buffer.byteLength(body) },
    body,
  );

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Booking failed: ${res.status} — ${JSON.stringify(res.body)}`);
  }

  log(`Booked! Response: ${JSON.stringify(res.body)}`);
  return res.body;
}

// ─── Polling loop ─────────────────────────────────────────────────────────────

async function pollForSlots(token) {
  const deadline = Date.now() + CONFIG.pollTimeoutMs;
  let attempt    = 0;

  while (Date.now() < deadline) {
    attempt++;
    log(`Polling for slots (attempt ${attempt})...`);

    const slots = await findSlots(token);

    if (slots.length > 0) {
      log(`Found ${slots.length} slot(s): ${slots.map(s => s.date?.start).join(', ')}`);
      return slots;
    }

    log(`No slots yet. Retrying in ${CONFIG.pollIntervalMs / 1000}s...`);
    await new Promise(r => setTimeout(r, CONFIG.pollIntervalMs));
  }

  throw new Error('Timed out waiting for slots to open');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`=== Dirty French Booking Script START (dry=${DRY_RUN}) ===`);
  log(`Target: ${CONFIG.venueName} | ${CONFIG.date} | Party of ${CONFIG.partySize}`);
  log(`Preferred times: ${CONFIG.preferredTimes.join(', ')}`);

  let token, paymentMethodId;

  // Step 1: Authenticate
  try {
    ({ token, paymentMethodId } = await authenticate());
  } catch (err) {
    log('ERROR — Auth failed:', err.message);
    await sendTelegram(
      `❌ <b>Dirty French booking FAILED</b>\n\nAuth error: ${err.message}\n\nManual action needed: https://resy.com/cities/new-york-ny/venues/dirty-french`
    );
    process.exit(1);
  }

  // Step 2: Poll for slots (opens at midnight ET)
  let slots;
  try {
    slots = await pollForSlots(token);
  } catch (err) {
    log('ERROR — No slots found:', err.message);
    await sendTelegram(
      `❌ <b>Dirty French booking FAILED</b>\n\nNo slots found for May 18, 2026 (party of 3).\n\n${err.message}\n\nTry manually: https://resy.com/cities/new-york-ny/venues/dirty-french?date=2026-05-18&seats=3`
    );
    process.exit(1);
  }

  // Step 3: Pick the best slot
  const slot = pickSlot(slots);
  if (!slot) {
    const allTimes = slots.map(s => s.date?.start).join(', ');
    log(`ERROR — None of the preferred times available. Available: ${allTimes}`);
    await sendTelegram(
      `⚠️ <b>Dirty French — No Preferred Times</b>\n\nMay 18, 2026 (party of 3) — no 6 PM / 6:30 PM / 7 PM slots.\n\nAvailable: ${allTimes}\n\nBook manually: https://resy.com/cities/new-york-ny/venues/dirty-french?date=2026-05-18&seats=3`
    );
    process.exit(1);
  }

  const slotTime = slot.date?.start || 'unknown time';
  log(`Selected slot: ${slotTime}`);

  // Step 4: Get slot details for book_token
  let bookToken;
  try {
    const details = await getSlotDetails(token, slot);
    bookToken = details.bookToken;
  } catch (err) {
    log('ERROR — Slot details failed:', err.message);
    await sendTelegram(
      `❌ <b>Dirty French booking FAILED</b>\n\nCould not get slot details for ${slotTime}\n${err.message}`
    );
    process.exit(1);
  }

  // Step 5: Book
  let result;
  try {
    result = await book(token, bookToken, paymentMethodId, slot);
  } catch (err) {
    log('ERROR — Booking failed:', err.message);
    await sendTelegram(
      `❌ <b>Dirty French booking FAILED</b>\n\nSlot found (${slotTime}) but booking threw an error:\n${err.message}\n\nTry manually: https://resy.com/cities/new-york-ny/venues/dirty-french?date=2026-05-18&seats=3`
    );
    process.exit(1);
  }

  // Format the booked time nicely
  const timeMatch    = slotTime.match(/(\d{2}):(\d{2})/);
  let   displayTime  = slotTime;
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    displayTime = `${h}:${m} ${ampm}`;
  }

  const confirmNum = result?.reservation_id
    || result?.resy_token
    || result?.id
    || result?.booking_id
    || 'Check Resy app';

  if (DRY_RUN) {
    log(`=== DRY RUN COMPLETE ===`);
    log(`Would book: ${displayTime} on ${CONFIG.date} for ${CONFIG.partySize} at ${CONFIG.venueName}`);
    log(`Payment method: ${paymentMethodId}`);
    log(`Venue ID confirmed: ${CONFIG.venueId}`);
    log(`Slots found: ${slots.length}`);
    console.log('\n✅ Dry run passed — all systems go for April 17 11 PM CST.');
    return;
  }

  log(`=== BOOKING CONFIRMED ===`);
  log(`Time: ${displayTime} | Confirmation: ${confirmNum}`);

  await sendTelegram(
    `🍽️ <b>Dirty French — BOOKED!</b>\n\n` +
    `📅 May 18, 2026 — ${displayTime}\n` +
    `👥 Party of 3 (Dave, Amanda, Soren)\n` +
    `📍 Dirty French New York\n` +
    `🎫 Confirmation: ${confirmNum}\n\n` +
    `Happy anniversary dinner! 🥂`
  );
}

main().catch(async err => {
  log('FATAL:', err.message, err.stack);
  try {
    await sendTelegram(`❌ <b>Dirty French script crashed</b>\n\n${err.message}`);
  } catch {}
  process.exit(1);
});

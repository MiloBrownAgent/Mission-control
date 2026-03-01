#!/usr/bin/env node
// BTC Candle Signal Generator
//
// Default mode: 5-minute candles (INTERVAL=5M)
// Secondary:    1-hour candles  (INTERVAL=1H)
//
// Cron schedules:
//   5M  →  */5 * * * *   (every 5 min)
//   1H  →  15 * * * *    (every hour at :15)
//
// On each run:
//   1. Fetch last N candles from Kraken
//   2. Resolve any previous unresolved signal using the last CLOSED candle
//   3. Check current forming candle — emit signal if move ≥ threshold

const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

const INTERVAL    = (process.env.INTERVAL || '5M').toUpperCase();
// .convex.cloud = Convex client HTTP API (queries/mutations)
// .convex.site  = HTTP actions only — NOT what we want here
const CONVEX_URL  = process.env.CONVEX_URL || 'https://proper-rat-443.convex.cloud';

const CONFIGS = {
  '5M': {
    krakenInterval: 5,
    threshold: 0.0005,      // 0.05% — fires on nearly every candle
    count: 6,               // fetch 6 candles — plenty to get 1 closed + 1 forming
    probBase: 56,
    probStrong: 66,          // "strong" at >0.20%
    strongMoveThreshold: 0.0020,
  },
  '1H': {
    krakenInterval: 60,
    threshold: 0.0015,      // 0.15%
    count: 4,
    probBase: 60,
    probStrong: 72,          // "strong" at >0.40%
    strongMoveThreshold: 0.004,
  },
};

const cfg = CONFIGS[INTERVAL];
if (!cfg) {
  console.error(`Unknown INTERVAL="${INTERVAL}". Use 5M or 1H.`);
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP timeout')); });
  });
}

function convexQuery(name, args) {
  return convexCall('query', name, args);
}

function convexMutation(name, args) {
  return convexCall('mutation', name, args);
}

function convexCall(type, name, args) {
  const parsed = new URL(`${CONVEX_URL}/api/${type}`);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ path: name, args });
    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || 443,
      path:     parsed.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          // Convex HTTP API envelope: { status: "success", value: ... }
          //                        or { status: "error", errorMessage: "..." }
          if (r.status === 'error') {
            reject(new Error(`Convex error: ${r.errorMessage || JSON.stringify(r)}`));
          } else {
            // Use 'in' check so null values (e.g. no unresolved signal) are preserved
            resolve('value' in r ? r.value : r);
          }
        } catch (e) {
          reject(new Error(`Convex parse error: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPrice(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(3)}%`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  console.log(`\n[btc-signal] ${now.toISOString()} | INTERVAL=${INTERVAL}`);
  console.log(`─────────────────────────────────────────────────`);

  // 1. Fetch candles from Kraken
  const url = `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${cfg.krakenInterval}&count=${cfg.count}`;
  console.log(`Fetching: ${url}`);
  const data = await fetchJson(url);

  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API: ${data.error.join(', ')}`);
  }

  const candles = data.result.XXBTZUSD;
  if (!candles || candles.length < 2) {
    throw new Error('Not enough candle data from Kraken');
  }

  // Kraken returns candles ascending. The LAST entry is the current forming candle.
  // The SECOND-TO-LAST is the most recently CLOSED candle.
  const forming  = candles[candles.length - 1];  // current (incomplete)
  const closed   = candles[candles.length - 2];  // most recent closed

  // Kraken OHLC: [time, open, high, low, close, vwap, volume, count]
  const closedOpenTime  = new Date(closed[0] * 1000).toISOString();
  const closedOpen      = parseFloat(closed[1]);
  const closedClose     = parseFloat(closed[4]);
  const closedDir       = closedClose >= closedOpen ? 'UP' : 'DOWN';

  const formingOpenTime = new Date(forming[0] * 1000).toISOString();
  const formingOpen     = parseFloat(forming[1]);
  const formingLive     = parseFloat(forming[4]); // latest tick price

  console.log(`Closed candle:  ${closedOpenTime} | open ${fmtPrice(closedOpen)} → close ${fmtPrice(closedClose)} [${closedDir}]`);
  console.log(`Forming candle: ${formingOpenTime} | open ${fmtPrice(formingOpen)} | live ${fmtPrice(formingLive)}`);

  // ── Step 2: Auto-resolve previous unresolved signal ──────────────────────────

  let unresolvedSignal = null;
  try {
    unresolvedSignal = await convexQuery('btcSignals:getUnresolved', { interval: INTERVAL });
  } catch (e) {
    console.warn(`Could not fetch unresolved signal: ${e.message}`);
  }

  if (unresolvedSignal) {
    console.log(`\nFound unresolved signal: ${unresolvedSignal._id}`);
    console.log(`  Candle: ${unresolvedSignal.candle_open_time} | Direction: ${unresolvedSignal.signal_direction}`);

    // Does the closed candle match this signal's candle?
    // If the signal was for the closed candle (or earlier), resolve it now.
    const signalCandleTime = unresolvedSignal.candle_open_time;
    const closedCandleTime = closedOpenTime;

    if (signalCandleTime <= closedCandleTime) {
      // Resolve using the closed candle's data
      // If signal was for an older candle, we still use closedOpen/Close as best proxy
      // (for 5M this is ≤5 min stale at worst)
      try {
        const res = await convexMutation('btcSignals:resolveSignal', {
          id:          unresolvedSignal._id,
          close_price: closedClose,
          outcome:     closedDir,
        });
        const mark = res.correct ? '✓ CORRECT' : '✗ WRONG';
        console.log(`  Resolved: ${res.signal_direction} → actual ${res.outcome} → ${mark}`);
      } catch (e) {
        console.warn(`  Resolve failed: ${e.message}`);
      }
    } else {
      console.log(`  Signal is for future candle (${signalCandleTime}) — skipping resolution`);
    }
  } else {
    console.log(`\nNo unresolved signal to resolve.`);
  }

  // ── Step 3: Signal based on CLOSED candle → bet momentum continues into next ─

  // Strategy: the just-closed candle moved X% in direction D.
  // We bet the NEXT (forming) candle continues in direction D.
  // Signal is placed immediately at candle close; resolved on next run.

  const closedMove = (closedClose - closedOpen) / closedOpen;
  const closedAbs  = Math.abs(closedMove);

  console.log(`\nClosed candle move: ${fmtPct(closedMove)} → ${closedDir}`);

  if (closedAbs < cfg.threshold) {
    console.log(`Move ${(closedAbs * 100).toFixed(3)}% < threshold ${(cfg.threshold * 100).toFixed(2)}% — no signal`);
    return;
  }

  // Check if we already have a signal for the FORMING candle (avoid dupes)
  // The forming candle's open time IS the signal target (we're betting on it)
  const existingCheck = unresolvedSignal && unresolvedSignal.candle_open_time === formingOpenTime;
  if (existingCheck) {
    console.log(`Signal for ${formingOpenTime} already exists — skipping`);
    return;
  }

  // Probability scoring: base + strong move bonus + two-candle momentum bonus
  const prevClosed = candles[candles.length - 3]; // candle before closed
  const prevDir    = prevClosed ? (parseFloat(prevClosed[4]) >= parseFloat(prevClosed[1]) ? 'UP' : 'DOWN') : null;

  let prob = closedAbs > cfg.strongMoveThreshold ? cfg.probStrong : cfg.probBase;
  if (prevDir === closedDir) prob += 4; // two consecutive candles same direction
  prob = Math.min(prob, 78);

  console.log(`\n✅ SIGNAL: ${closedDir} (continuation) | Prob: ${prob}% | Closed move: ${fmtPct(closedMove)}`);
  console.log(`   Betting next candle (${formingOpenTime}) continues ${closedDir}`);

  // Store — candle_open_time is the FORMING candle (the one we're betting on)
  const result = await convexMutation('btcSignals:addSignal', {
    candle_open_time:  formingOpenTime,
    interval:          INTERVAL,
    open_price:        formingOpen,
    signal_price:      formingOpen,   // signal placed at candle open
    signal_direction:  closedDir,     // bet on continuation
    signal_confidence: parseFloat((closedAbs * 100).toFixed(4)),
    polymarket_url:    'https://polymarket.com/crypto/bitcoin',
    my_probability:    prob,
  });
  console.log(`Stored signal: ${JSON.stringify(result)}`);
}

main().catch(e => {
  console.error(`[btc-signal] FATAL: ${e.message}`);
  process.exit(1);
});

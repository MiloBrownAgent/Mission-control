const fs = require('fs');
const path = require('path');

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/app/investments/page.tsx'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'convex/schema.ts'), 'utf8');
const investments = fs.readFileSync(path.join(root, 'convex/investments.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const homeTabStart = page.indexOf('function HomeTab()');
const homeTabEnd = page.indexOf('function UpdatesPanel(');
assert(homeTabStart >= 0 && homeTabEnd > homeTabStart, 'HomeTab block not found');
const homeTab = page.slice(homeTabStart, homeTabEnd);
const oppIndex = homeTab.indexOf('>Opportunities<');
const alertIndex = homeTab.indexOf('>Alerts<');
assert(oppIndex >= 0, 'Opportunities section missing from HomeTab');
assert(alertIndex >= 0, 'Alerts section missing from HomeTab');
assert(oppIndex < alertIndex, 'Alerts section appears before Opportunities in HomeTab');

assert(schema.includes('investmentUpdateReads: defineTable({'), 'investmentUpdateReads table missing from schema');
assert(investments.includes('export const listNotificationUpdates = query({'), 'listNotificationUpdates query missing');
assert(investments.includes('export const markNotificationRead = mutation({'), 'markNotificationRead mutation missing');
assert(investments.includes('export const markAllNotificationUpdatesRead = mutation({'), 'markAllNotificationUpdatesRead mutation missing');
assert(investments.includes('mergeOpportunitiesByTicker(args.opportunities)'), 'notification feed is not reusing deduped opportunities');
assert(investments.includes('dedupeEventScans(args.eventScans)'), 'notification feed is not deduping repeated event scans');

const shareFnStart = page.indexOf('function buildThesisShareText(');
const shareFnEnd = page.indexOf('export default function InvestmentsPage()');
assert(shareFnStart >= 0 && shareFnEnd > shareFnStart, 'buildThesisShareText block not found');
const shareFn = page.slice(shareFnStart, shareFnEnd);
assert(!shareFn.includes('entryPrice'), 'buildThesisShareText should not include entryPrice');
assert(!shareFn.includes('shares'), 'buildThesisShareText should not include shares');

assert(page.includes('Updates feed'), 'Updates panel heading missing');
assert(page.includes('Mark all read'), 'Mark all read UI missing');
assert(page.includes('Opportunities and alerts stay in their own sections below.'), 'MorningBriefing fallback still mixes sections');
assert(page.includes('No active event-scan updates yet. Opportunities and alerts remain separated below.'), 'EventScanner fallback still mixes sections');

console.log(JSON.stringify({
  ok: true,
  checks: [
    'home-tab-order',
    'notification-schema',
    'notification-convex-api',
    'dedupe-usage',
    'share-text-safe',
    'updates-panel-ui',
    'fallback-separation-copy'
  ]
}, null, 2));

// Deliveries from the parent food bank to the pantry.
// SAMPLE DATA for the prototype: the orders, invoice lines, truck and schedule are made up.
// The process they follow is real (NTFB Agency Partner Guidebook 2023, see docs/parent-food-bank-research.md):
// a standing appointment with a delivery window, an invoice checked and signed at the door,
// and 3 business days to claim a credit for short or damaged lines.
// Later this would come from the food bank's ordering system (Agency Express or Primarius) and fleet tracking.

export const PARENT = {
  name: 'Tarrant Area Food Bank',
  short: 'the food bank',
  place: 'Fort Worth warehouse',
  lat: 32.7466, // approximate: 2525 Cullen St, Fort Worth
  lon: -97.3530,
};
// Shared stop: the truck drops another pantry's order here first (a fictional partner).
export const HUB = {name: 'Argyle Community Pantry', place: 'shared stop in Argyle', lat: 33.1210, lon: -97.1836};
export const TRUCK = 'Box truck 12, white International, logo on both sides';

const line = (name, pack, cases, lb, storage) => ({name, pack, cases, lb, storage});
export const ORDER_LINES = [
  line('Canned green beans', '24 × 14.5 oz', 4, 88, 'dry'),
  line('Creamy peanut butter', '12 × 18 oz', 3, 41, 'dry'),
  line('Long-grain white rice', '12 × 2 lb', 4, 100, 'dry'),
  line('Canned tuna in water', '48 × 5 oz', 2, 36, 'dry'),
  line('Shelf-stable 1% milk', '12 × 32 oz', 3, 78, 'dry'),
  line('Spaghetti', '20 × 1 lb', 3, 63, 'dry'),
  line('Fresh carrots', '50 lb', 2, 100, 'cool'),
  line('Gala apples', '40 lb', 3, 120, 'cool'),
  line('Frozen chicken leg quarters', '40 lb', 2, 80, 'frozen'),
  line('Frozen ground beef', '40 × 1 lb', 1, 40, 'frozen'),
  line('Large eggs', '15 dozen', 2, 46, 'cold'),
  line('Low-fat yogurt cups', '48 × 5.3 oz', 2, 34, 'cold'),
];
export const orderLb = (lines) => lines.reduce((a, l) => a + l.lb, 0);
export const isCold = (l) => l.storage === 'cold' || l.storage === 'frozen';

// Demo cadence: a new delivery every 2 hours, so a demo always shows a truck on the road or at the door.
// The appointment window is the 2-hour block; the truck leaves 25 minutes before it opens.
const CYCLE = 2 * 3600000;
const LEAD = 25 * 60000;
export const HUB_DWELL = 15 * 60000;

// Every third delivery hits slow traffic, so the board also shows what "running late" looks like.
export function deliveryFor(now = Date.now(), drive) {
  const start = Math.floor(now / CYCLE) * CYCLE;
  const d = new Date(start);
  const id = `AI-${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
  const slow = Math.floor(start / CYCLE) % 3 === 1;
  const delay = slow ? 35 * 60000 : 0;
  const departAt = start - LEAD;
  // drive: {legs: [toHub, toPantry]} durations in ms from the router; a fixed guess until it loads.
  const toHub = drive?.legs[0] ?? 50 * 60000;
  const toPantry = drive?.legs[1] ?? 18 * 60000;
  const etaAt = departAt + toHub + HUB_DWELL + toPantry + delay;
  return {
    id, windowStart: start, windowEnd: start + CYCLE, departAt, etaAt, delay,
    reason: slow ? 'Slow traffic on I-35W' : null,
    lines: ORDER_LINES, truck: TRUCK,
    // Where the truck is: 'road-hub' | 'hub' | 'road' | 'here'
    phase: now < departAt + toHub + delay / 2 ? 'road-hub' : now < departAt + toHub + delay / 2 + HUB_DWELL ? 'hub' : now < etaAt ? 'road' : 'here',
    // Share of each leg driven, for placing the truck on the map.
    legFrac: [
      Math.min(1, Math.max(0, (now - departAt) / (toHub + delay / 2))),
      Math.min(1, Math.max(0, (now - (departAt + toHub + delay / 2 + HUB_DWELL)) / (toPantry + delay / 2))),
    ],
  };
}

// 3 business days after `t`, at 5 PM: the credit request deadline.
export function creditDeadline(t) {
  const d = new Date(t);
  let n = 0;
  while (n < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  d.setHours(17, 0, 0, 0);
  return d.getTime();
}

// Receipts live on this device for the prototype.
// shortcut: localStorage only, so another iPad at the pantry can't see them; store in D1 before launch.
const KEY = 'freshroute:receipts';
export function loadReceipts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return saved;
  } catch {
    /* fall through to the sample */
  }
  return sampleReceipts();
}
export function saveReceipts(r) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* private mode: the receipt stays on screen only */
  }
}

// Yesterday's delivery, received with one short and one damaged line, so Credits isn't empty on first open.
function sampleReceipts() {
  const at = Date.now() - 24 * 3600000;
  const d = new Date(at);
  const id = `AI-${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-10`;
  const lines = Object.fromEntries(ORDER_LINES.map((l) => [l.name, {status: 'ok', cases: 0}]));
  lines['Gala apples'] = {status: 'damaged', cases: 1, note: 'Crushed case, bruised fruit'};
  lines['Large eggs'] = {status: 'short', cases: 1};
  return {[id]: {id, at, lines, temp: '38', blanket: true, receiver: 'Cody', photos: 2, sample: true}};
}

// What a receipt claims: short and damaged lines with their pounds.
// A receipt keeps the order's own lines (orderLines); older sample receipts use the sample invoice.
export function claimsOf(receipt) {
  return (receipt.orderLines || ORDER_LINES).filter((l) => receipt.lines?.[l.name] && receipt.lines[l.name].status !== 'ok').map((l) => {
    const r = receipt.lines[l.name];
    return {...l, status: r.status, missing: r.cases, missingLb: Math.round((l.lb / l.cases) * r.cases), note: r.note};
  });
}

// Invoice lines typed or pasted by the pantry, one per line: "4 Canned green beans", "2 x Frozen chicken (frozen)".
// A leading number is the case count; "cold", "chilled" or "frozen" in the line marks it as cold storage.
export function parseLines(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)\s*(?:x|×|cases?\s+of|cases?)?\s+(.+)$/i);
      const cases = m ? Math.max(1, Number(m[1])) : 1;
      const name = (m ? m[2] : l).replace(/\s*\((cold|chilled|frozen)\)\s*$/i, '').trim();
      const storage = /\bfrozen\b/i.test(l) ? 'frozen' : /\b(cold|chilled)\b/i.test(l) ? 'cold' : 'dry';
      return {name, pack: cases === 1 ? '1 case' : `${cases} cases`, cases, lb: 0, storage};
    });
}

// 'HH:MM' on the given day, as a timestamp.
export const atTime = (day, hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
};

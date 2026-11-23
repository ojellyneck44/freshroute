// FreshRoute final presentation. Structure follows the team's whiteboard template.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const {applyTheme} = require('/Users/stevi/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/4fda1e4e-bff1-4ec4-9c46-2cd48d77ef17/82994720-5a99-4f09-b4f3-f95850a10e98/skills/pptx/scripts/apply_theme.js');

const OUT = process.argv[2] || 'FreshRoute-Final-Presentation.pptx';
const DIMS = JSON.parse(fs.readFileSync('dims.json'));
const IMG = (f) => 'img/' + f;

// Brand palette from DESIGN.md (charcoal dark mode). dk1 is the slide background, lt1 the main text.
const THEME = {
  name: 'FreshRoute', headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: {dk1: '1A1C20', lt1: 'F3F4F6', dk2: '23262B', lt2: 'BBC0C8', accent1: 'B4EC6A', accent2: '86D9F2', accent3: 'FFBE5C', accent4: 'FF8A76', accent5: '2D3036', accent6: '959BA5', hlink: '86D9F2', folHlink: 'BBC0C8'},
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'FreshRoute: Know when the food gets here';
pres.author = 'Alyssa Cuarenta, Stevie McLane, Rosly Tavarez, Anaya Smith';
pres.theme = {headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace};
const C = pres.SchemeColor;
const BG = C.text1, TXT = C.background1, SURF = C.text2, TXT2 = C.background2;
const SPROUT = C.accent1, FROST = C.accent2, APR = C.accent3, TOM = C.accent4, RAISED = C.accent5, TXT3 = C.accent6;
const W = 13.333, H = 7.5, M = 0.6;

// ---------- Layouts ----------
const footer = [
  {text: {text: 'FreshRoute', options: {x: M, y: H - 0.45, w: 5, h: 0.3, fontSize: 10, color: TXT3, margin: 0}}},
];
// The R-D-U tracker from the whiteboard: three linked pills, the current section filled.
const tracker = (cur) => {
  const out = [{line: {x: 9.55, y: 0.73, w: 2.9, h: 0, line: {color: HEX.accent5, width: 1.5}}}];
  ['Research', 'Design', 'Usability'].forEach((t, i) => {
    const on = t === cur;
    out.push({rect: {x: 9.15 + i * 1.33, y: 0.55, w: 1.2, h: 0.36, fill: {color: on ? HEX.accent1 : HEX.dk2}, line: {color: on ? HEX.accent1 : HEX.accent5, width: 1}, rectRadius: 0.18}});
    out.push({text: {text: t, options: {x: 9.15 + i * 1.33, y: 0.55, w: 1.2, h: 0.36, fontSize: 11, bold: on, color: on ? BG : TXT2, align: 'center', valign: 'middle', margin: 0}}});
  });
  return out;
};
const titlePh = {placeholder: {options: {name: 'title', type: 'title', x: M, y: 0.42, w: 8.3, h: 0.95, fontSize: 34, bold: true, color: TXT, valign: 'middle', align: 'left', margin: 0}, text: 'Title'}};
const kickerPh = {placeholder: {options: {name: 'kicker', type: 'body', x: M, y: 0.15, w: 8, h: 0.3, fontSize: 12, color: SPROUT, margin: 0, bold: true, align: 'left'}, text: 'Section'}};
const content = (name, cur) => pres.defineSlideMaster({
  title: name, background: {color: HEX.dk1}, margin: [0.5, 0.6, 0.6, 0.6],
  objects: [...(cur ? tracker(cur) : []), ...footer, kickerPh, titlePh],
  slideNumber: {x: W - 1.1, y: H - 0.45, w: 0.5, h: 0.3, fontSize: 10, color: TXT3, align: 'right'},
});
content('RESEARCH', 'Research');
content('DESIGN', 'Design');
content('USABILITY', 'Usability');
content('PLAIN', null);
pres.defineSlideMaster({title: 'TITLE', background: {color: HEX.dk1}, objects: []});

// ---------- Helpers ----------
const sharp = require('sharp');
const PPI = 170, RADIUS = 0.14; // rounded corners on every image, painted in the slide background colour
fs.mkdirSync('prep', {recursive: true});
let prepN = 0;
async function prep(f, w, h, mode) {
  const W = Math.round(w * PPI), H = Math.round(h * PPI), r = Math.round(RADIUS * PPI);
  const out = `prep/${++prepN}-${f.replace(/\.[a-z]+$/i, '')}.jpg`;
  const base = sharp(IMG(f)).rotate().flatten({background: '#' + HEX.dk1}); // .rotate() applies the photo's EXIF orientation
  const img = mode === 'cover' ? base.resize(W, H, {fit: 'cover', position: sharp.strategy.attention}) : base.resize(W, H, {fit: 'fill'});
  const mask = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const rounded = await img.composite([{input: mask, blend: 'dest-in'}]).png().toBuffer();
  await sharp({create: {width: W, height: H, channels: 3, background: '#' + HEX.dk1}}).composite([{input: rounded}]).jpeg({quality: 88}).toFile(out);
  return out;
}
const orient = async (f) => { const m = await sharp(IMG(f)).metadata(); const [w, h] = [m.width, m.height]; return m.orientation >= 5 ? [h, w] : [w, h]; };
// contain: whole image, aspect kept, centred in the box
const fit = async (f, x, y, w, h, extra = {}) => {
  const [iw, ih] = await orient(f);
  const r = Math.min(w / iw, h / ih), ww = iw * r, hh = ih * r;
  return {path: await prep(f, ww, hh, 'fill'), x: x + (w - ww) / 2, y: y + (h - hh) / 2, w: ww, h: hh, ...extra};
};
// cover: fills the box, cropped (never stretched)
const cover = async (f, x, y, w, h, extra = {}) => ({path: await prep(f, w, h, 'cover'), x, y, w, h, ...extra});
const t = (s, text, o) => s.addText(text, {isTextBox: true, margin: 0, color: TXT, fontSize: 16, valign: 'top', ...o});
const card = (s, x, y, w, h, fill = SURF) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x, y, w, h, fill: {color: fill}, line: {color: fill}, rectRadius: 0.12});
const bullets = (items, o = {}) => items.map((it, i) => ({text: it, options: {bullet: {indent: 16}, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 8}}));
const slide = (master, section, kicker, title) => {
  const s = pres.addSlide({masterName: master, sectionTitle: section});
  s.addText(kicker, {placeholder: 'kicker', align: 'left'});
  s.addText(title, {placeholder: 'title', align: 'left'});
  return s;
};
const caption = (s, text, x, y, w) => t(s, text, {x, y, w, h: 0.3, fontSize: 11, color: TXT3});
const stat = (s, big, label, x, y, w, color = SPROUT) => {
  t(s, big, {x, y, w, h: 0.9, fontSize: 48, bold: true, color});
  t(s, label, {x, y: y + 0.92, w, h: 0.8, fontSize: 14, color: TXT2});
};

(async () => {
// =====================================================================
// 1. TITLE (Rosly)
pres.addSection({title: '1 · Intro'});
{
  const s = pres.addSlide({masterName: 'TITLE', sectionTitle: '1 · Intro'});
  s.addImage(await fit('08-option-b-pantry-sees-truck-live.jpg', 6.6, 0.6, 6.13, 6.3));
  s.addImage({path: IMG('icon.png'), x: M, y: 0.8, w: 0.9, h: 0.9});
  t(s, 'FreshRoute', {x: M + 1.1, y: 0.95, w: 5, h: 0.6, fontSize: 26, bold: true});
  t(s, 'FOOD REDISTRIBUTION', {x: M, y: 2.3, w: 5.6, h: 0.4, fontSize: 14, bold: true, color: SPROUT, charSpacing: 3});
  t(s, 'Know when the food gets here', {x: M, y: 2.75, w: 5.7, h: 2.0, fontSize: 46, bold: true});
  t(s, 'Live delivery tracking, receiving and cold-chain proof for food pantries', {x: M, y: 4.85, w: 5.4, h: 0.8, fontSize: 16, color: TXT2});
  t(s, 'Rosly Tavarez · Anaya Smith · Stevie McLane · Alyssa Cuarenta', {x: M, y: 6.4, w: 5.8, h: 0.6, fontSize: 13, color: TXT3});
  s.addNotes(`PRESENTER: Rosly

Hi everyone. Our project is FreshRoute, and our six-word catchphrase is: "Know when the food gets here."

FreshRoute is an iPad app for food pantries. It shows when food is on its way (from the parent food bank or from the pantry's own volunteer drivers), helps staff check deliveries in at the door, and keeps proof that cold food stayed cold.

Board note (yellow sticky): "What we learned?" Open by telling the audience what they'll walk away with: how a pantry like the Diamond Eagle Basic Needs Hub at UNT actually receives food, and where it breaks down.`);
}

// 2. PROJECT OVERVIEW (Rosly)
{
  const s = slide('PLAIN', '1 · Intro', 'PROJECT OVERVIEW', 'Texas leads the nation in hunger');
  card(s, M, 1.65, 5.6, 4.9);
  t(s, '1 in 5', {x: M + 0.45, y: 1.95, w: 5, h: 1.3, fontSize: 88, bold: true, color: SPROUT});
  t(s, 'Texans faced hunger in 2026: 6.06 million people, a 19.4% food insecurity rate, the highest in the US. In Dallas–Fort Worth, 1 in 4 children are food insecure.', {x: M + 0.45, y: 3.4, w: 4.8, h: 1.6, fontSize: 17, color: TXT});
  t(s, 'Tarrant Area Food Bank & North Texas Food Bank, July 2026 (Feeding America, Map the Meal Gap)', {x: M + 0.45, y: 5.65, w: 4.8, h: 0.6, fontSize: 11, color: TXT3});
  t(s, 'Our goals', {x: 7.0, y: 1.75, w: 5.6, h: 0.5, fontSize: 20, bold: true});
  const goals = [
    ['1', 'Identify pain points and design opportunities in the current workflow', 'How food moves from a parent food bank and local stores into a pantry, and where time, food and trust get lost.'],
    ['2', 'Design a system that fits into the existing workflow', "No new process to learn: the pantry's ordering portal, delivery windows and receiving steps stay. FreshRoute makes them visible."],
  ];
  goals.forEach(([n, h, d], i) => {
    const y = 2.45 + i * 2.05;
    s.addShape(pres.shapes.OVAL, {x: 7.0, y, w: 0.6, h: 0.6, fill: {color: SPROUT}, line: {color: SPROUT}});
    t(s, n, {x: 7.0, y, w: 0.6, h: 0.6, fontSize: 20, bold: true, color: BG, align: 'center', valign: 'middle'});
    t(s, h, {x: 7.85, y: y - 0.02, w: 4.9, h: 0.75, fontSize: 18, bold: true});
    t(s, d, {x: 7.85, y: y + 0.8, w: 4.9, h: 0.95, fontSize: 14, color: TXT2});
  });
  s.addNotes(`PRESENTER: Rosly

Compelling fact: Texas has the highest food insecurity rate in the country. 6.06 million Texans, about 1 in 5, faced hunger in the latest Feeding America Map the Meal Gap data, and in Dallas–Fort Worth 1 in 4 children are food insecure. (Source: Tarrant Area Food Bank / North Texas Food Bank press release, July 28 2026.)

Pantries are the last step that gets that food to families, and they run on very little staff time.

Our two goals:
1. Identify the pain points and design opportunities in how a pantry receives food today.
2. Design a system that fits into that existing workflow instead of replacing it.

Board note (yellow sticky, "what we learned?"): we learned the hardest part isn't getting food donated, it's coordinating the handoff: knowing when it arrives, whether it stayed cold, and whether everything on the invoice made it.`);
}

// 3. APPROACH (Rosly)
{
  const s = slide('PLAIN', '1 · Intro', 'OUR APPROACH', 'Research, design, then test')
  const steps = [
    ['R', 'Research', ['What metrics: weekly visits, pounds ordered, delivery windows, time out of the fridge', 'What methods: interview, contextual inquiry, competitive analysis, audits, desk research']],
    ['D', 'Design', ['Need statements and big ideas', 'Design studio and prioritization', 'Wireframes to a working iPad prototype']],
    ['U', 'Usability', ['Heuristic evaluation (Nielsen\'s 10) of the live prototype', 'User testing is planned next, with pantry staff and volunteers']],
  ];
  steps.forEach(([l, h, items], i) => {
    const x = M + i * 4.1, cx = x + 1.35;
    if (i < 2) s.addShape(pres.shapes.LINE, {x: cx + 0.75, y: 2.45, w: 2.6, h: 0, line: {color: HEX.accent5, width: 2}});
    s.addShape(pres.shapes.OVAL, {x: cx - 0.75, y: 1.7, w: 1.5, h: 1.5, fill: {color: i === 0 ? SPROUT : SURF}, line: {color: SPROUT, width: 2}});
    t(s, l, {x: cx - 0.75, y: 1.7, w: 1.5, h: 1.5, fontSize: 44, bold: true, color: i === 0 ? BG : SPROUT, align: 'center', valign: 'middle'});
    t(s, h, {x, y: 3.45, w: 3.7, h: 0.5, fontSize: 22, bold: true, align: 'center'});
    t(s, bullets(items, {gap: 6}), {x: x + 0.1, y: 4.05, w: 3.5, h: 2.6, fontSize: 14, color: TXT2});
  });
  s.addNotes(`PRESENTER: Rosly

Our process had three phases, and you'll see the same R, D, U tracker at the top of every slide so you always know where we are.

Research: which metrics matter (household visits, pounds ordered, delivery windows, how long cold food has been out of the fridge) and which methods we used to find them.

Design: our solution, from need statements and big ideas through a design studio to a working prototype.

Usability: we planned user testing ("maybe" on our board). Because we haven't been able to run sessions with pantry staff yet, we did the fallback from our plan: a heuristic audit of the live prototype. Anaya takes it from here with research.`);
}

// =====================================================================
// 4. RESEARCH: METHODS (Anaya)
pres.addSection({title: '2 · Research'});
{
  const s = slide('RESEARCH', '2 · Research', 'RESEARCH', 'How we learned the workflow');
  const methods = [
    ['Contextual inquiry + interview', 'Cody Kimpton, Diamond Eagle Basic Needs Hub (UNT), at the Hub'],
    ['Food bank interview', 'Poncho, manager and driver at Tarrant Area Food Bank'],
    ['Competitive feature analysis', 'Too Good To Go, HelloFresh, Plentiful, Misfits Market'],
    ['Heuristic + perspective audits', 'Careit, the donation platform pantries use today (40 findings)'],
    ['Desk research', 'How parent food banks supply pantries (Tarrant Area and North Texas Food Banks)'],
  ];
  methods.forEach(([h, d], i) => {
    const y = 1.7 + i * 0.98;  // five methods, evenly spaced
    s.addShape(pres.shapes.OVAL, {x: M, y: y + 0.05, w: 0.22, h: 0.22, fill: {color: SPROUT}, line: {color: SPROUT}});
    t(s, h, {x: M + 0.4, y, w: 5.6, h: 0.4, fontSize: 17, bold: true});
    t(s, d, {x: M + 0.4, y: y + 0.4, w: 5.6, h: 0.5, fontSize: 13, color: TXT2});
  });
  s.addImage(await cover('p08.jpg', 7.0, 1.7, 5.7, 3.4));
  caption(s, 'Interviewing Cody at the Diamond Eagle Basic Needs Hub at UNT', 7.0, 5.2, 5.7);
  s.addImage(await cover('p17.jpg', 7.0, 5.55, 2.75, 1.25));
  s.addImage(await cover('p09.jpg', 9.95, 5.55, 2.75, 1.25));
  s.addNotes(`PRESENTER: Anaya

We used five methods.

1. Contextual inquiry and interview with Cody Kimpton, the coordinator at the Diamond Eagle Basic Needs Hub at UNT. We interviewed him at his desk and walked the pantry with him (shelves, fridges, the low-stock area) and watched him use the Tarrant Area Food Bank ordering portal.
2. An interview with Poncho, a manager and driver at Tarrant Area Food Bank, the parent food bank that supplies the Hub. He picks up store donations (ALDI, and Walmart through manager contacts), weighs and checks them, and logs temperature and weight by hand into a Google Form. Food comes out in carts he loads himself, and cold food rides under blankets. He flagged three pain points: he can't see a pickup before he gets there, blankets are his only cold storage so they limit how far he can go, and moving the food is hard work. (We also reached out to Albertsons and WinCo managers for the store's perspective.)
3. A competitive feature analysis of four apps, one per team member.
4. A heuristic audit and a perspective-based audit of Careit, the donation platform pantries use today. That produced 40 findings.
5. Desk research on how parent food banks like Tarrant Area Food Bank supply their partner pantries: ordering deadlines, delivery windows, receiving rules.

Photos: Cody's interview, the protein shelf, and his ordering portal.`);
}

// 5. MARKET LANDSCAPE (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'DESK RESEARCH', 'Market landscape');
  const stats = [
    ['73.9M', 'tons of surplus food in the US in 2023, worth $382 billion', 'ReFED, 2025'],
    ['~2%', 'of surplus food gets donated; most is wasted before it reaches a pantry', 'ReFED'],
    ['560+', 'partner pantries and agencies supplied by Tarrant Area Food Bank across 13 counties, including Denton', 'TAFB'],
  ];
  stats.forEach(([b, l, src], i) => {
    const x = M + i * 4.1;
    card(s, x, 1.7, 3.85, 2.75);
    t(s, b, {x: x + 0.35, y: 1.95, w: 3.3, h: 0.95, fontSize: 52, bold: true, color: i === 1 ? APR : SPROUT});
    t(s, l, {x: x + 0.35, y: 2.95, w: 3.2, h: 1.05, fontSize: 14, color: TXT});
    t(s, src, {x: x + 0.35, y: 4.0, w: 3.2, h: 0.3, fontSize: 11, color: TXT3});
  });
  t(s, 'How a pantry gets food from its parent food bank', {x: M, y: 4.8, w: 7, h: 0.45, fontSize: 18, bold: true});
  t(s, bullets([
    'Orders in an online portal, due 3 business days ahead; once released, nothing can change',
    'Truck arrives in a standing delivery window; the pantry waits the whole window before it counts as late',
    'Volunteers check the invoice and sign before the driver leaves; credits must be claimed within 3 business days',
  ], {gap: 4}), {x: M, y: 5.3, w: 12, h: 1.5, fontSize: 14, color: TXT2});
  s.addNotes(`PRESENTER: Anaya

Desk research. Three numbers frame the opportunity:
- 73.9 million tons of surplus food in the US in 2023, worth $382 billion (ReFED, U.S. Food Waste Report 2025).
- Only about 2% of surplus food is donated (ReFED).
- Tarrant Area Food Bank alone supplies 560+ partner agencies across 13 counties, including Denton, where the Diamond Eagle Basic Needs Hub at UNT is.

How the parent food bank works (from the North Texas Food Bank partner guidebook; TAFB doesn't publish its handbook, and both use the same ordering software):
- Orders are placed in an online portal 3 business days ahead.
- The truck comes in a standing delivery window, and pantries are told to wait out the whole window.
- Volunteers check the invoice and sign before the driver leaves; anything short or damaged must be claimed within 3 business days.

Board note (pink sticky): this matters to parent food banks because metrics are how they measure their wants and needs. Every pantry reports pounds and households monthly, so anything we capture at the door feeds that report.`);
}

// 6. COMPETITORS (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'FEATURE COMPARISON', 'Competitors');
  const Y = '✓', N = '–';
  const cols = ['Feature', 'Too Good To Go', 'HelloFresh', 'Plentiful', 'Misfits Market', 'FreshRoute'];
  const rows = [
    ['Push or text notifications', N, Y, Y, Y, Y],
    ['Delivery tracking', N, Y, N, Y, Y],
    ['Choose pickup or delivery time', Y, Y, N, Y, Y],
    ['Map of nearby locations', N, N, Y, N, Y],
    ['Digital check-in at pickup', Y, N, Y, N, Y],
    ['Tools for partner organizations', Y, N, N, N, Y],
    ['Works without the app (SMS / link)', N, N, N, Y, Y],
  ];
  const head = cols.map((c, i) => ({text: c, options: {bold: true, color: i === 5 ? BG : TXT, fill: {color: i === 5 ? HEX.accent1 : HEX.accent5}, align: i ? 'center' : 'left', fontSize: i ? 11 : 13}}));
  const body = rows.map((r) => r.map((c, i) => ({text: c, options: {color: i === 0 ? TXT : c === Y ? (i === 5 ? SPROUT : TXT) : TXT3, fill: {color: HEX.dk2}, align: i ? 'center' : 'left', fontSize: i ? 16 : 13, bold: i === 5 && c === Y}})));
  s.addTable([head, ...body], {x: M, y: 1.7, w: 7.9, colW: [2.4, 1.1, 1.1, 1.1, 1.1, 1.1], rowH: 0.52, border: {type: 'solid', pt: 1, color: HEX.dk1}, fontFace: 'Arial', valign: 'middle', margin: [0, 0.1, 0, 0.1]});
  caption(s, 'Each teammate inspected one app (Oct 2026). FreshRoute column = our design.', M, 5.95, 7.9);
  card(s, 8.85, 1.7, 3.85, 4.55);
  t(s, 'What we learned', {x: 9.15, y: 1.95, w: 3.3, h: 0.45, fontSize: 18, bold: true, color: SPROUT});
  t(s, bullets([
    'Tracking exists, but only for consumers waiting on a meal kit. No tool tracks food into a pantry.',
    'Check-in at pickup works well when it is one scan or tap.',
    'Careit, the tool pantries use, lists no quantities or storage needs and stops at delivery.',
  ], {gap: 10}), {x: 9.15, y: 2.5, w: 3.3, h: 3.6, fontSize: 14, color: TXT2});
  s.addNotes(`PRESENTER: Anaya

Each of us inspected one app: Rosly took Too Good To Go, Stevie HelloFresh, Anaya Plentiful, and Alyssa Misfits Market. The full sheet compared about 30 features; these are the ones that matter for a pantry.

The last column is FreshRoute, our design.

What we learned from our competitors (yellow sticky on the board):
- Delivery tracking exists, but only for consumers waiting on a meal kit. Nothing tracks food going into a pantry.
- Check-in at pickup works when it's a single scan or tap (Plentiful, Too Good To Go).
- Careit, the tool pantries actually use, lists no quantities or storage needs, has confusing statuses, and its process stops at delivery instead of distribution.

Board note (pink sticky): gaps and opportunities in current systems indicate flows and the need for improvement.`);
}

// 7. STAKEHOLDER MAP (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'STAKEHOLDERS', 'Who touches a delivery');
  const cx = 4.0, cy = 4.15;
  const nodes = [
    ['Volunteer drivers', 'Pickup runs to stores', 4.0, 1.95, SPROUT],
    ['Tarrant Area Food Bank', 'Poncho: truck and deliveries', 1.65, 3.45, FROST],
    ['Grocery stores', 'Donate surplus', 6.4, 3.45, SPROUT],
    ['Households', '~600 visits a week', 1.85, 5.85, TXT2],
    ['Anti-persona', 'Shrinkage risk', 6.15, 5.85, TOM],
  ];
  nodes.forEach(([, , x, y]) => s.addShape(pres.shapes.LINE, {x: Math.min(cx, x), y: Math.min(cy, y), w: Math.abs(x - cx) || 0.01, h: Math.abs(y - cy) || 0.01, flipH: (x < cx) !== (y < cy), line: {color: HEX.accent5, width: 2}}));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: cx - 1.15, y: cy - 0.85, w: 2.3, h: 1.7, fill: {color: SPROUT}, line: {color: SPROUT}, rectRadius: 0.18});
  t(s, 'Pantry coordinator', {x: cx - 1.0, y: cy - 0.5, w: 2.0, h: 0.6, fontSize: 15, bold: true, color: BG, align: 'center', valign: 'middle'});
  t(s, 'Primary user', {x: cx - 1.0, y: cy + 0.1, w: 2.0, h: 0.4, fontSize: 12, color: BG, align: 'center'});
  nodes.forEach(([h, d, x, y, col]) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: x - 1.05, y: y - 0.6, w: 2.1, h: 1.2, fill: {color: SURF}, line: {color: col, width: 2}, rectRadius: 0.16});
    t(s, h, {x: x - 0.85, y: y - 0.45, w: 1.7, h: 0.55, fontSize: 12, bold: true, align: 'center', valign: 'middle'});
    t(s, d, {x: x - 0.85, y: y + 0.1, w: 1.7, h: 0.35, fontSize: 11, color: TXT2, align: 'center'});
  });
  t(s, bullets([
    'The pantry coordinator decides whether a tool gets adopted, and gains the most from it.',
    'Volunteer drivers are the ones recorded, so the app has to be useful to them too.',
    "The food bank's partner services receive receipts and credit requests.",
    'Stores only need an arrival time and a "ready" button, with no account.',
  ], {gap: 12}), {x: 8.2, y: 1.85, w: 4.5, h: 4.6, fontSize: 15, color: TXT2});
  s.addNotes(`PRESENTER: Anaya

Our stakeholder map, centred on the pantry coordinator, someone like Cody.

- Volunteer drivers do pickup runs from grocery stores (or the food bank warehouse). They're the ones being recorded, so the app has to be worth it to them.
- Tarrant Area Food Bank, the parent food bank: their truck delivers the weekly order (Poncho, whom we interviewed, manages and drives these runs), and their partner services team handles receipts and credits.
- Grocery stores donate surplus. They only need to know when the driver arrives and a way to say "ready at the dock", with no account.
- Households, about 600 visits a week at the Hub, never touch the app, but they're who it's for.
- The anti-persona (next slides) represents shrinkage risk.

Board note (pink sticky): stakeholders make or break every project. If the coordinator doesn't adopt it, nothing else matters.`);
}

// 8. PERSONA (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'DESIGN DRIVERS · PERSONA', 'Maya, food pantry coordinator');
  s.addImage(await cover('maya.jpg', M, 1.7, 3.1, 3.6));
  t(s, '"You could be sending an important email and then it\'s like, oh, the truck\'s here."', {x: M, y: 5.45, w: 3.2, h: 1.3, fontSize: 14, italic: true, color: SPROUT});
  t(s, 'Runs a pantry with ~600 household visits a week, one other staff member and rotating volunteers. Orders 3,000–6,000 lb a week from the regional food bank portal.', {x: 4.1, y: 1.7, w: 8.6, h: 0.95, fontSize: 15, color: TXT});
  const cols = [
    ['Goals', SPROUT, ['Predictable, well-described donations', 'Keep staples stocked: protein, eggs, instant meals', 'Serve as many people as possible without waste']],
    ['Pain points', APR, ['Donations arrive with little warning', "Can't accept perishables if nobody knows how long they were out of the fridge", 'Few cleared drivers, little time']],
    ['Design drivers', FROST, ['Warn before the truck arrives', 'Time cold food from pickup', 'Show quantities and storage up front']],
  ];
  cols.forEach(([h, col, items], i) => {
    const x = 4.1 + i * 2.95;
    card(s, x, 2.85, 2.75, 3.9);
    t(s, h, {x: x + 0.25, y: 3.05, w: 2.3, h: 0.4, fontSize: 16, bold: true, color: col});
    t(s, bullets(items, {gap: 8}), {x: x + 0.25, y: 3.55, w: 2.3, h: 3.1, fontSize: 13, color: TXT2});
  });
  s.addNotes(`PRESENTER: Anaya

Our persona, Maya, is built from Cody's interview and our contextual inquiry. Her quote is close to Cody's own words: "You could be sending an important email and then it's like, oh, the truck's here."

She runs a pantry with about 600 household visits a week, one other staff member and rotating volunteers, and orders 3,000 to 6,000 pounds a week from the regional food bank's portal.

Goals: predictable, well-described donations; staples always stocked; serve as many people as possible without wasting food.

Pain points: donations arrive with little warning; she can't accept perishables when nobody knows how long they've been out of the fridge; there are few cleared drivers and little time.

These became our design drivers: warn before the truck arrives, time cold food from the moment it's loaded, and show quantities and storage needs up front.`);
}

// 9. ANTI-PERSONA (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'DESIGN DRIVERS · ANTI-PERSONA', 'Max, the food scammer');
  s.addImage(await cover('max.jpg', M, 1.7, 3.1, 3.6));
  t(s, '"They\'ll be alright, they already have enough stock."', {x: M, y: 5.45, w: 3.2, h: 1.0, fontSize: 14, italic: true, color: TOM});
  t(s, "A trusted volunteer who takes poorly tracked food and resells it online. He's who we design against: not to catch people, but to close the gaps that make shrinkage easy.", {x: 4.1, y: 1.7, w: 8.6, h: 0.95, fontSize: 15});
  const gaps = [
    ['Solo pickups', 'Front camera records the driver; counts at pickup must match drop-off'],
    ['Untracked handoffs', 'Every receipt records who signed and what was short or damaged'],
    ['No timeline', 'Hard-brake, stop and gap markers on the drive video show what happened when'],
  ];
  gaps.forEach(([h, d], i) => {
    const y = 2.9 + i * 1.3;
    card(s, 4.1, y, 8.6, 1.1);
    t(s, h, {x: 4.4, y: y + 0.18, w: 2.4, h: 0.7, fontSize: 16, bold: true, color: TOM, valign: 'middle'});
    t(s, d, {x: 6.9, y: y + 0.18, w: 5.6, h: 0.7, fontSize: 14, color: TXT2, valign: 'middle'});
  });
  s.addNotes(`PRESENTER: Anaya

Our anti-persona is Max: a trusted volunteer who quietly takes food that isn't well tracked and resells it online. His quote: "They'll be alright, they already have enough stock."

We don't design for Max, we design against him. The goal isn't to catch people, it's to close the gaps that make shrinkage easy:
- Solo pickups: the front camera records the driver, and counts at the store must match counts at drop-off.
- Untracked handoffs: every receipt records who signed and what was short or damaged.
- No timeline: the drive video carries markers for hard brakes, stops and recording gaps.

In practice it's rarely a villain; more often it's a miscount or a long stop. The same record protects honest drivers.

Board note (pink sticky): this matters to food banks because shrinkage is a real issue that our design should account for.`);
}

// 10. USER INTENTIONS (Anaya)
{
  const s = slide('RESEARCH', '2 · Research', 'DESIGN DRIVERS · USER INTENTIONS', 'In their words');
  const q = [
    ['"Every Thursday, we get a truck from Tarrant Area Food Bank … I kind of call them our big mama food bank."', 'Wants to plan the day around a delivery he can\'t see coming'],
    ['"Unless they\'re actively timing when they took it out of the fridge, we don\'t know how long it\'s been out … we can\'t accept it."', 'Wants proof that cold food stayed cold'],
    ['"It\'s mostly just having the time for someone to go and pick up. Time slash staffing."', 'Wants pickups that fit the staff he has'],
    ['Poncho (Tarrant Area Food Bank): he can\'t see a pickup before he gets there, and with blankets as his only cold storage, how far he can drive is limited.', 'Wants to see each pickup, and how long it can stay cold, before he leaves'],
  ];
  q.forEach(([quote, intent], i) => {
    const y = 1.65 + i * 1.22;
    t(s, String(i + 1), {x: M, y, w: 0.6, h: 1.05, fontSize: 36, bold: true, color: i === 3 ? FROST : SPROUT, valign: 'middle'});
    t(s, quote, {x: M + 0.8, y, w: 7.4, h: 1.05, fontSize: 15, italic: i < 3, color: i < 3 ? TXT : TXT2, valign: 'middle'});
    card(s, 8.95, y + 0.05, 3.78, 0.95);
    t(s, intent, {x: 9.2, y: y + 0.05, w: 3.35, h: 0.95, fontSize: 14, color: TXT2, valign: 'middle'});
  });
  caption(s, '1–3: Cody Kimpton, Diamond Eagle Basic Needs Hub (UNT), lightly edited. 4: Poncho, Tarrant Area Food Bank, from our interview notes.', M, 6.6, 11);
  s.addNotes(`PRESENTER: Anaya

Three things Cody said, and one from Poncho, that shaped what we built. (Quotes are from our interview transcript, lightly cleaned up where the transcription garbled words.)

1. "Every Thursday, we get a truck from Tarrant Area Food Bank … I kind of call them our big mama food bank." Intention: he wants to plan his day around a delivery he can't see coming.
2. "Unless they're actively timing when they took it out of the fridge, we don't know how long it's been out … we can't accept it." Intention: proof that cold food stayed cold.
3. "It's mostly just having the time for someone to go and pick up. Time slash staffing." Intention: pickups that fit the staff he actually has.

4. From our interview with Poncho, manager and driver at Tarrant Area Food Bank (from our notes, not a direct quote). He marked three pain points: "Can't see pickup beforehand"; cold storage is "blankets only", which "restricts range"; and "ease of transportation" (the food comes out in carts he loads himself). He also said everything is logged by hand into a Google Form, and nearly all his communication goes through Tarrant Area Food Bank by phone, sometimes email. Intention: see each pickup, and how long its cold food can stay out, before he leaves.

These intentions map onto FreshRoute's live arrival time, cold-chain timer, pickup planning, and the "How pickup works here" note on every store page.`);
}

// 11. JOURNEY MAP (Anaya to Stevie)
{
  const s = slide('RESEARCH', '2 · Research', 'CURRENT STATE', 'Journey map: a manager\'s week');
  const stages = [
    ['Check supply', 'Portal only takes orders on certain days', -0.2],
    ['Contact supplier', 'Listings don\'t say what or how much', 0.55],
    ['Schedule pickup', 'Finding a cleared driver who is free', 0.9],
    ['Pick up & transport', 'No cooling; damaged or warm food', -0.55],
    ['Organize & log', 'Weighing and logging by hand, hours', -1.0],
    ['Distribute', 'Hard to connect back to ordering', 0.05],
  ];
  const x0 = M, cw = 2.02, top = 1.75, mid = 3.0, amp = 0.85;
  stages.forEach(([h], i) => {
    card(s, x0 + i * cw + 0.03, top, cw - 0.12, 0.62, RAISED);
    t(s, `${i + 1}. ${h}`, {x: x0 + i * cw + 0.13, y: top, w: cw - 0.3, h: 0.62, fontSize: 13, bold: true, valign: 'middle'});
  });
  const pts = stages.map(([, , e], i) => [x0 + i * cw + cw / 2, mid + 0.55 - e * amp]);
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    s.addShape(pres.shapes.LINE, {x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]) || 0.01, flipV: b[1] < a[1], line: {color: HEX.lt2, width: 2}});
  }
  pts.forEach(([x, y], i) => {
    const e = stages[i][2];
    const col = e > 0.3 ? SPROUT : e < -0.3 ? TOM : APR;
    s.addShape(pres.shapes.OVAL, {x: x - 0.14, y: y - 0.14, w: 0.28, h: 0.28, fill: {color: col}, line: {color: HEX.dk1, width: 2}});
  });
  stages.forEach(([, p], i) => {
    t(s, p, {x: x0 + i * cw + 0.13, y: 4.75, w: cw - 0.3, h: 0.95, fontSize: 13, color: TXT2});
  });
  t(s, 'Pain points', {x: x0, y: 4.45, w: 3, h: 0.3, fontSize: 11, bold: true, color: TXT3});
  card(s, M, 5.85, 12.1, 0.9);
  t(s, [{text: 'Lowest points: ', options: {bold: true, color: TOM}}, {text: 'transport and logging, where food is out of sight and staff time disappears. That is where FreshRoute focuses.', options: {color: TXT}}], {x: M + 0.3, y: 5.85, w: 11.5, h: 0.9, fontSize: 15, valign: 'middle'});
  s.addNotes(`PRESENTER: Anaya (hand-off to Stevie)

Our current-state journey map follows a food bank manager through a weekly, repeating cycle (Nielsen Norman Group template):
1. Check supply: the portal only takes orders on certain days.
2. Contact supplier: listings don't say what or how much (Cody's five pallets of popcorn).
3. Schedule pickup: finding a cleared driver who's free.
4. Pick up and transport: no cooling in the van; food arrives damaged or warm.
5. Organize and log: weighing, sorting and logging by hand takes hours.
6. Distribute: hard to connect what went out back to what to order next.

The emotion line drops hardest at transport and logging, where food is out of sight and staff time disappears.

Board note (yellow sticky): this helped us identify our user needs. Arrow to Stevie: those needs are where design starts.`);
}

// =====================================================================
// 12. USER NEEDS + BIG IDEAS (Stevie)
pres.addSection({title: '3 · Design'});
{
  const s = slide('DESIGN', '3 · Design', 'DESIGN', 'User needs and big ideas');
  card(s, M, 1.7, 5.6, 2.35);
  t(s, 'Need #1', {x: M + 0.3, y: 1.88, w: 2, h: 0.35, fontSize: 13, bold: true, color: SPROUT});
  t(s, 'Food bank managers need a way to monitor deliveries so that they can accurately predict turnaround time, prepare, and ensure donations arrive reliably.', {x: M + 0.3, y: 2.25, w: 5.0, h: 1.05, fontSize: 15});
  t(s, [{text: 'Pain point: ', options: {bold: true, color: SPROUT}}, {text: '"Can\'t see pickup beforehand" (Poncho, Tarrant Area Food Bank)', options: {italic: true}}], {x: M + 0.3, y: 3.4, w: 5.0, h: 0.5, fontSize: 13, color: TXT2});
  card(s, M, 4.25, 5.6, 2.35);
  t(s, 'Need #2', {x: M + 0.3, y: 4.43, w: 2, h: 0.35, fontSize: 13, bold: true, color: FROST});
  t(s, 'Food bank managers need a way to simplify inventory management so that they always know what\'s on hand, can sort it by category and expiration date, and distribute it before it spoils.', {x: M + 0.3, y: 4.8, w: 5.0, h: 1.7, fontSize: 15});
  t(s, 'Big ideas', {x: 6.75, y: 1.7, w: 3, h: 0.4, fontSize: 18, bold: true});
  s.addImage(await fit('mi-3.png', 6.75, 2.15, 5.95, 3.75));
  t(s, [{text: 'Need #1: ', options: {bold: true, color: SPROUT}}, {text: 'Notifications from FreshRoute · Handy Footage', options: {breakLine: true}}, {text: 'Need #2: ', options: {bold: true, color: FROST}}, {text: 'Camera Detection · Grocery Store Scanner'}], {x: 6.75, y: 5.95, w: 5.95, h: 0.75, fontSize: 13, color: TXT2});
  s.addNotes(`PRESENTER: Stevie

From the journey map we wrote two need statements.

Need 1: food bank managers need a way to monitor deliveries so they can predict turnaround time, prepare, and make sure donations arrive reliably. Poncho, who drives for Tarrant Area Food Bank, marked the same gap from the driver's side as a pain point in our interview: he "can't see pickup beforehand". Both ends of the trip are working blind.
Need 2: food bank managers need a way to simplify inventory management so they always know what's on hand, sorted by category and expiration, and get it out before it spoils.

We sketched big ideas for each. For need 1: Notifications from FreshRoute (the store and the pantry get the driver's live arrival time) and Handy Footage (a camera explains damage after the fact). For need 2: Camera Detection (categorizing food on arrival) and a Grocery Store Scanner (stores log items as they scan them).

The storyboards on screen are our original sketches.`);
}

// 13. WHAT WE WILL FOCUS ON (Stevie)
{
  const s = slide('DESIGN', '3 · Design', 'PRIORITIES', 'What we will focus on');
  s.addImage(await fit('mi-5.png', M, 1.65, 5.9, 3.7));
  caption(s, 'Our prioritization matrix: impact vs. feasibility', M, 5.45, 5.9);
  const f = [
    ['Live arrival time for every delivery', 'The no-brainer: notifications won on impact and feasibility.'],
    ['Check-in at the door, with credits', 'Receive line by line, then claim anything short or damaged.'],
    ['Cold-chain and drive record', 'Handy Footage became recording with motion markers and a cold timer.'],
  ];
  f.forEach(([h, d], i) => {
    const y = 1.7 + i * 1.6;
    t(s, String(i + 1), {x: 6.95, y, w: 0.6, h: 0.7, fontSize: 36, bold: true, color: SPROUT});
    t(s, h, {x: 7.6, y: y + 0.02, w: 5.1, h: 0.45, fontSize: 18, bold: true});
    t(s, d, {x: 7.6, y: y + 0.5, w: 5.1, h: 0.85, fontSize: 14, color: TXT2});
  });
  s.addNotes(`PRESENTER: Stevie

We placed the four big ideas on an impact-versus-feasibility matrix: differentiators, performance payoffs, no-brainers, and unwise bets.

Notifications from FreshRoute landed in the no-brainer corner: high impact, and it uses GPS and notifications drivers' devices already have. Handy Footage was easy to build but only explains problems after they happen; notifications prevent them. Camera Detection and the Grocery Store Scanner were harder to build, so we saved them for later.

So we focused on three things:
1. A live arrival time for every delivery, for the food bank truck and the pantry's own runs.
2. Check-in at the door: receive the order line by line and turn problems into a credit claim.
3. A cold-chain and drive record: Handy Footage grew into recording with motion markers and a cold-food timer.`);
}

// 14. DESIGN STUDIO (Stevie)
{
  const s = slide('DESIGN', '3 · Design', 'DESIGN STUDIO', 'Sketch, vote, combine');
  const ph = [['p21.jpg', 'Individual sketches and dot votes'], ['p02.jpg', 'Grouping into three main ideas'], ['p06.jpg', 'Working the big idea']];
  for (const [i, [f, c]] of ph.entries()) {
    const x = M + i * 4.1;
    s.addImage(await cover(f, x, 1.7, 3.85, 3.6));
    t(s, c, {x, y: 5.4, w: 3.85, h: 0.35, fontSize: 14, bold: true});
  }
  t(s, 'Top votes: colour creates urgency · user input feeds store descriptions · multiple destinations · useful metrics. Cut by vote: gamification (it distracted and stressed drivers).', {x: M, y: 5.95, w: 12.1, h: 0.8, fontSize: 14, color: TXT2});
  s.addNotes(`PRESENTER: Stevie

In our design studio, each of us sketched alone, then we posted the sketches, dot-voted, and combined the strongest ideas into three main concepts.

Top votes: colour creates urgency (number one), user input feeding store descriptions (also number one), multiple destinations, and useful metrics. Those all made it into the product: the green, amber and red arrival ring; driver notes that appear on store pages; multi-stop routes; and the drive report.

One thing we cut by vote: gamification. It distracted and stressed drivers, which is the last thing you want behind the wheel.`);
}

// 15. BIG IDEA: WHO WHAT WOW (Stevie)
{
  const s = slide('DESIGN', '3 · Design', 'BIG IDEA', 'Safe Transport: who, what, wow');
  s.addImage(await cover('p04.jpg', M, 1.7, 5.2, 3.9));
  caption(s, 'Our who, what, wow board', M, 5.7, 5.2);
  const www = [
    ['Who', 'Food bank managers, and the drivers and store managers they depend on'],
    ['What', 'Real-time transit with live feedback; alert the store before the driver arrives; secure food on rough roads'],
    ['Wow', 'Food arrives in the same state it was picked up, and a bad actor gets caught by the record, not by suspicion'],
  ];
  www.forEach(([h, d], i) => {
    const y = 1.7 + i * 1.6;
    card(s, 6.2, y, 6.5, 1.4);
    t(s, h, {x: 6.5, y, w: 1.3, h: 1.4, fontSize: 22, bold: true, color: SPROUT, valign: 'middle'});
    t(s, d, {x: 7.85, y, w: 4.65, h: 1.4, fontSize: 14, color: TXT2, valign: 'middle'});
  });
  s.addNotes(`PRESENTER: Stevie

We framed the winning concept as a big idea called Safe Transport, using who, what, wow.

Who: food bank managers, plus the drivers and store managers they depend on.
What: real-time transit with live feedback; alerting the grocery store before the driver arrives so donations are packed; securing food on rough roads.
Wow: food arrives in the same state it was picked up, and if something goes missing, the record explains it, not suspicion.`);
}

// 16. WIREFRAMES (Stevie)
{
  const s = slide('DESIGN', '3 · Design', 'WIREFRAMES', 'Two flows, 26 screens');
  s.addImage(await fit('wf-3.png', M, 1.6, 7.9, 4.95));
  card(s, 8.85, 1.7, 3.85, 4.85);
  t(s, 'Mid-fidelity, then inspection', {x: 9.15, y: 1.9, w: 3.3, h: 0.75, fontSize: 17, bold: true, color: SPROUT});
  t(s, bullets([
    'Flow 1: driver, from finding food to the drive report (14 screens)',
    'Flow 2: manager, knowing what\'s coming and checking what happened (7 screens)',
    'Annotated in grayscale on purpose: structure, flow and content before visual style',
    'Inspected against our persona and heuristics before building',
  ], {gap: 8}), {x: 9.15, y: 2.7, w: 3.3, h: 3.7, fontSize: 13, color: TXT2});
  s.addNotes(`PRESENTER: Stevie

Before any visual design, we laid out both flows as annotated mid-fidelity wireframes: 26 pages in all.

Flow 1 follows a driver from finding food to the drive report. Flow 2 follows the manager, knowing what's coming and checking what happened.

They're grayscale on purpose, so feedback stays on structure, flow and content rather than colour. Then we inspected them against our persona and heuristics before building.

Since then the pantry became the main user, and we added the food bank delivery and receiving flow you'll see in the demo.`);
}

// 17–18. HIGH-FIDELITY BEFORE / AFTER (Stevie)
const beforeAfter = async (title, pairs, notes) => {
  const s = slide('DESIGN', '3 · Design', 'HIGH-FIDELITY VISUALS', title);
  const n = pairs.length, gap = 0.2, lw = 1.15;
  const cw = (12.1 - lw - gap * (n - 1)) / n, ch = cw / 1.43;
  t(s, 'BEFORE', {x: M, y: 1.75, w: lw, h: ch, fontSize: 14, bold: true, color: TXT3, valign: 'middle'});
  t(s, 'AFTER', {x: M, y: 1.95 + ch, w: lw, h: ch, fontSize: 14, bold: true, color: SPROUT, valign: 'middle'});
  for (const [i, [wf, shot, label]] of pairs.entries()) {
    const x = M + lw + i * (cw + gap);
    s.addImage(await cover(wf, x, 1.75, cw, ch));
    s.addImage(await cover(shot, x, 1.95 + ch, cw, ch));
    t(s, label, {x, y: 2.05 + 2 * ch, w: cw, h: 0.6, fontSize: 13, bold: true, align: 'center'});
  }
  s.addNotes(notes);
  return s;
};
await beforeAfter('Driver flow, wireframe to app', [
  ['wf6.png', '22-pickups-list-and-map.jpg', 'Pickups and map'],
  ['wf8.png', '23-store-detail.jpg', 'Store detail'],
  ['wf11.png', '26-navigation.jpg', 'Navigation'],
  ['wf17.png', '35-drive-report.jpg', 'Drive report'],
], `PRESENTER: Stevie

Before and after for the driver flow: the mid-fidelity wireframe on top, the working app below.

1. Pickups and map: the list-left, map-right layout held. We added a map key, filters for open now and cold items, and real Denton stores.
2. Store detail: what the store usually donates, with pack sizes, weights and storage type. That came straight from Cody's popcorn story.
3. Navigation: camera top-left, ETA ring top-right, as sketched. The map now shows only the road to the next stop, and the camera is picture-in-picture: front camera on the driver, road camera in the corner.
4. Drive report: the schedule chart now explains itself in a sentence, for example "the stop at Walmart took 24 min against the 12 planned".`);
await beforeAfter('Pantry flow, wireframe to app', [
  ['wf19.png', '08-option-b-pantry-sees-truck-live.jpg', 'Incoming'],
  ['wf20.png', '29-volunteer-run-live-video.jpg', 'Run, live'],
  ['wf22.png', '40-pantry-run-report.jpg', 'Report review'],
], `PRESENTER: Stevie

The pantry side. The wireframes said "food bank manager"; research moved us to the pantry coordinator, and Incoming now leads with the delivery from Tarrant Area Food Bank.

1. Incoming: the food bank truck's live arrival time against the delivery window, with the truck on the map, plus volunteer runs below.
2. A run, live: near-live video, the ring, and every stop with a link the store can open.
3. Report review: the same report the driver sees, with no approval needed.

Alyssa will now take you through usability.`);

// =====================================================================
// 19. SCENARIO (Alyssa)
pres.addSection({title: '4 · Usability'});
{
  const s = slide('USABILITY', '4 · Usability', 'USABILITY', 'Scenario: a Thursday delivery');
  t(s, bullets([
    'Cody adds this week\'s Tarrant Area Food Bank order from his portal confirmation.',
    'The truck leaves the Fort Worth warehouse. Cody sees it live, against his delivery window.',
    'About 15 minutes out, the iPad gives a heads-up: bring the pallet blanket for the cold lines.',
    'At the door, a volunteer checks each line. One case of apples arrived crushed.',
    'FreshRoute turns it into a credit request, due within 3 business days.',
  ], {gap: 12}), {x: M, y: 1.75, w: 5.6, h: 4.9, fontSize: 16, color: TXT});
  s.addImage(await fit('09-heads-up-truck-close.jpg', 6.5, 1.7, 6.2, 4.4));
  caption(s, 'The heads-up, 15 minutes before the truck arrives', 6.5, 6.2, 6.2);
  s.addNotes(`PRESENTER: Alyssa

Here's the scenario we evaluated, built from Cody's real Thursday.

1. Cody adds this week's Tarrant Area Food Bank order from his portal confirmation.
2. The truck leaves the Fort Worth warehouse, and Cody watches it come in against his delivery window.
3. About 15 minutes out, the iPad gives a heads-up, and reminds him to bring the pallet blanket for the cold lines.
4. At the door, a volunteer checks each line against the invoice. One case of apples arrived crushed.
5. FreshRoute turns that into a credit request, which the food bank accepts for 3 business days.`);
}

// 20. PROTOTYPE DEMO (Alyssa)
{
  const s = slide('USABILITY', '4 · Usability', 'PROTOTYPE', 'Live demo');
  s.addImage(await fit('08-option-b-pantry-sees-truck-live.jpg', M, 1.65, 7.3, 5.1));
  s.addShape(pres.shapes.OVAL, {x: M + 3.65 - 0.6, y: 1.65 + 2.55 - 0.6, w: 1.2, h: 1.2, fill: {color: HEX.accent1}, line: {color: HEX.dk1, width: 3}});
  s.addShape(pres.shapes.ISOSCELES_TRIANGLE, {x: M + 3.65 - 0.2, y: 1.65 + 2.55 - 0.25, w: 0.5, h: 0.5, rotate: 90, fill: {color: HEX.dk1}, line: {color: HEX.dk1}});
  card(s, 8.2, 1.7, 4.5, 5.0);
  t(s, 'freshroute.pages.dev', {x: 8.5, y: 1.95, w: 4, h: 0.5, fontSize: 18, bold: true, color: SPROUT});
  t(s, 'A working iPad web app, installable to the home screen', {x: 8.5, y: 2.45, w: 3.9, h: 0.7, fontSize: 13, color: TXT2});
  t(s, bullets([
    'Pantry adds an order',
    'Food bank truck goes live',
    'Heads-up 15 min out',
    'Receive line by line',
    'Credit request',
    'Volunteer pickup run with recording',
  ], {gap: 6}), {x: 8.5, y: 3.3, w: 3.9, h: 3.2, fontSize: 15});
  s.addNotes(`PRESENTER: Alyssa

DEMO: open freshroute.pages.dev on the iPad (or play the screen recording if the network is unreliable).

Suggested order (about 2 minutes):
1. Incoming: tap Add a delivery, enter an order.
2. Show the food bank truck live on the map (option B: the driver uses FreshRoute) or log a call-ahead (option A: they don't).
3. The heads-up banner about 15 minutes out.
4. Receive delivery: mark the apples damaged, enter the temperature, sign.
5. Receiving: the credit request with its deadline.
6. Optional: a volunteer pickup run, with the camera and the drive report.

Tip: the drives in the demo are simulated at 8× speed so a 40-minute route plays in about 5 minutes. Hold the FreshRoute logo for a second to open test mode if you need it.`);
}

// 21. HEURISTIC SCORECARD (Alyssa)
{
  const s = slide('USABILITY', '4 · Usability', 'HEURISTIC EVALUATION', 'The heuristic scorecard');
  const rows = [
    ['1', 'Visibility of system status', '2', 'Live ETA, heads-up, "Updated 8:16"'],
    ['2', 'Match with the real world', '1', 'Plain-language schedule chart'],
    ['3', 'User control and freedom', '3', 'Remove order, Switch person'],
    ['4', 'Consistency and standards', '1', 'One status vocabulary, one ring'],
    ['5', 'Error prevention', '2', 'Temperature and signer required'],
    ['6', 'Recognition over recall', '2', 'Map keys on every map'],
    ['7', 'Flexibility and efficiency', '1', 'One-tap call-ahead, defaults'],
    ['8', 'Aesthetic, minimalist design', '2', 'Navigation shows one leg only'],
    ['9', 'Recover from errors', '1', 'Location errors name the fix'],
    ['10', 'Help and documentation', '2', 'Helper text, map keys'],
  ];
  const sev = {'1': HEX.accent6, '2': HEX.accent3, '3': HEX.accent4};
  const head = ['#', 'Heuristic', 'Worst issue', 'What works'].map((c, i) => ({text: c, options: {bold: true, color: TXT, fill: {color: HEX.accent5}, fontSize: 12, align: i === 2 ? 'center' : 'left'}}));
  const body = rows.map(([n, h, v, w]) => [
    {text: n, options: {color: TXT3, fill: {color: HEX.dk2}, fontSize: 12}},
    {text: h, options: {color: TXT, fill: {color: HEX.dk2}, fontSize: 13, bold: true}},
    {text: v, options: {color: HEX.dk1, fill: {color: sev[v]}, fontSize: 14, bold: true, align: 'center'}},
    {text: w, options: {color: TXT2, fill: {color: HEX.dk2}, fontSize: 12}},
  ]);
  s.addTable([head, ...body], {x: M, y: 1.65, w: 8.4, colW: [0.5, 3.0, 1.2, 3.7], rowH: 0.44, border: {type: 'solid', pt: 1, color: HEX.dk1}, fontFace: 'Arial', valign: 'middle', margin: [0, 0.1, 0, 0.1]});
  card(s, 9.35, 1.7, 3.35, 4.85);
  t(s, 'Severity 0–4', {x: 9.65, y: 1.9, w: 2.8, h: 0.4, fontSize: 16, bold: true});
  [['3', 'Major', sev['3']], ['2', 'Minor', sev['2']], ['1', 'Cosmetic', sev['1']]].forEach(([n, l, col], i) => {
    const y = 2.45 + i * 0.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: 9.65, y, w: 0.45, h: 0.38, fill: {color: col}, line: {color: col}, rectRadius: 0.06});
    t(s, n, {x: 9.65, y, w: 0.45, h: 0.38, fontSize: 13, bold: true, color: BG, align: 'center', valign: 'middle'});
    t(s, l, {x: 10.25, y, w: 2.2, h: 0.38, fontSize: 14, color: TXT2, valign: 'middle'});
  });
  t(s, 'No catastrophes (4). One major issue, six minor, four cosmetic.', {x: 9.65, y: 4.25, w: 2.8, h: 0.9, fontSize: 14, color: TXT});
  t(s, 'Expert review of the live app on iPad, all three flows', {x: 9.65, y: 5.4, w: 2.8, h: 0.9, fontSize: 12, color: TXT3});
  s.addNotes(`PRESENTER: Alyssa

Our plan said: user testing, and if we couldn't, a heuristic audit. We haven't been able to run sessions with pantry staff yet, so we evaluated the live prototype against Nielsen's 10 usability heuristics, on an iPad, across all three flows: pantry, volunteer driver and food bank driver.

Severity uses Nielsen's 0 to 4 scale. The column shows the worst open issue for each heuristic.

Result: no catastrophes, one major issue (user control: a signed receipt can't be edited), and the rest minor or cosmetic.

Important caveat: this is an expert review. It tells us where the design breaks rules, not how real volunteers behave. That's why user testing is the first next step. Full write-up: docs/heuristic-audit-2026-11-21.md.`);
}

// 22. KEY FINDINGS (Alyssa)
{
  const s = slide('USABILITY', '4 · Usability', 'KEY FINDINGS', 'What to fix first');
  const f = [
    ['3', 'A signed receipt is final', 'Mark the wrong line and the credit request is wrong, with no way back. Fix: editable until the credit is sent.', '13-credit-to-claim.jpg'],
    ['2', 'The truck can "finish" before the pantry signs', '"I\'m at the pantry" shows from 39 miles away. Fix: show it only on arrival; wait for the signature.', '07-option-b-food-bank-truck-navigation.jpg'],
    ['2', 'Invoice entry depends on syntax', 'Volunteers must remember to type "(frozen)". Fix: a storage picker per line, or portal import.', '03-add-a-delivery.jpg'],
  ];
  for (const [i, [sv, h, d, img]] of f.entries()) {
    const y = 1.7 + i * 1.7;
    s.addImage(await cover(img, M, y, 2.3, 1.45));
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: 3.15, y: y + 0.05, w: 0.45, h: 0.4, fill: {color: sv === '3' ? HEX.accent4 : HEX.accent3}, line: {color: HEX.dk1}, rectRadius: 0.06});
    t(s, sv, {x: 3.15, y: y + 0.05, w: 0.45, h: 0.4, fontSize: 14, bold: true, color: BG, align: 'center', valign: 'middle'});
    t(s, h, {x: 3.8, y, w: 8.9, h: 0.5, fontSize: 18, bold: true});
    t(s, d, {x: 3.8, y: y + 0.55, w: 8.9, h: 0.9, fontSize: 14, color: TXT2});
  }
  s.addNotes(`PRESENTER: Alyssa

The three findings we'd fix first:

1. A signed receipt is final (severity 3). If a volunteer marks the wrong line, the credit request is wrong and there's no way back. Fix: allow edits until the credit request is sent.
2. The food bank driver can finish before the pantry signs (severity 2). The "I'm at the pantry" button shows even 39 miles away. Fix: show it only inside the arrival zone, and wait for the pantry's signature.
3. Invoice entry depends on syntax (severity 2). Volunteers have to remember to type "(frozen)" or "(cold)". Fix: a storage picker per line, or import the order straight from the food bank's portal.

Also on the list: the Incoming card gets crowded (up to 7 controls), and there's no first-run help for a new volunteer.`);
}

// 23. BEFORE & AFTER (Alyssa)
{
  const s = slide('USABILITY', '4 · Usability', 'BEFORE & AFTER', 'Fixed during this review cycle');
  const pairs = [
    ['before-plan.jpg', '22-pickups-list-and-map.jpg', 'Maps explain themselves', 'Before: pins with no key, "FB" and "P" badges that read like app logos. After: a key on every map, house and warehouse pins.'],
    ['before-chart.jpg', '36-drive-report-schedule-chart.jpg', 'The chart tells you why', 'Before: "Promise vs forecast", a line nobody could read. After: "Did the truck stay on schedule?" with the cause in a sentence.'],
  ];
  for (const [i, [b, a, h, d]] of pairs.entries()) {
    const y = 1.7 + i * 2.55;
    s.addImage(b === 'before-chart.jpg' ? await fit(b, M, y, 3.4, 2.3) : await cover(b, M, y, 3.4, 2.3));
    t(s, '→', {x: M + 3.4, y, w: 0.6, h: 2.3, fontSize: 28, color: SPROUT, align: 'center', valign: 'middle'});
    s.addImage(await cover(a, M + 4.0, y, 3.4, 2.3));
    t(s, h, {x: 8.25, y: y + 0.2, w: 4.45, h: 0.5, fontSize: 18, bold: true});
    t(s, d, {x: 8.25, y: y + 0.75, w: 4.45, h: 1.4, fontSize: 14, color: TXT2});
  }
  s.addNotes(`PRESENTER: Alyssa

Two fixes from our own review, before and after.

1. Maps: before, the pins had no key, and the pantry and food bank showed as "P" and "FB" badges that looked like app logos. After: every map has a key that says what it's for, and the places use house and warehouse pins.
2. The schedule chart: before, it was called "Promise vs forecast", and even we found it hard to read. After: it's "Did the truck stay on schedule?", with a sentence that names the cause, like "the stop at Walmart took 24 min, against the 12 planned".

We also passed an accessibility audit: no contrast failures, no tap targets under 44 points, and no skipped heading levels across 9 screens.`);
}

// 24. TESTIMONIAL (Alyssa)
{
  const s = slide('USABILITY', '4 · Usability', 'STAKEHOLDER FEEDBACK', 'Testimonials: next, with real users');
  card(s, M, 1.7, 7.4, 4.9);
  t(s, '“  ”', {x: M + 0.4, y: 1.8, w: 2, h: 1.2, fontSize: 72, bold: true, color: SPROUT});
  t(s, 'To be collected when we test with Cody and his volunteers.', {x: M + 0.4, y: 3.1, w: 6.6, h: 1.2, fontSize: 22, bold: true});
  t(s, 'We haven\'t run user testing yet, so we won\'t put words in anyone\'s mouth. This slide will carry a direct quote and how many of the stakeholders we test with would use FreshRoute.', {x: M + 0.4, y: 4.4, w: 6.6, h: 1.5, fontSize: 15, color: TXT2});
  card(s, 8.35, 1.7, 4.35, 4.9);
  t(s, '_ / 5', {x: 8.65, y: 1.95, w: 3.8, h: 1.3, fontSize: 66, bold: true, color: TXT3});
  t(s, 'stakeholders who would use it', {x: 8.65, y: 3.3, w: 3.8, h: 0.6, fontSize: 15, color: TXT2});
  t(s, bullets(['Pantry coordinator', 'Two volunteer drivers', 'Food bank partner services', 'A grocery store manager'], {gap: 6}), {x: 8.65, y: 4.1, w: 3.8, h: 2.2, fontSize: 14, color: TXT2});
  s.addNotes(`PRESENTER: Alyssa

Our template has a testimonial and a "4 of 5 stakeholders" result. We haven't tested with real users yet, so this slide is honest about that rather than inventing a quote.

Plan: test with five stakeholders: Cody, two volunteer drivers, someone from the food bank's partner services, and a grocery store manager. Then replace this slide with a direct quote and the real count of who would use it.

(TEAM: update this slide after testing.)`);
}

// =====================================================================
// 25. NEXT STEPS (Rosly)
pres.addSection({title: '5 · Next steps'});
{
  const s = slide('PLAIN', '5 · Next steps', 'NEXT STEPS', 'Where FreshRoute goes from here');
  const big = [
    ['Test it', 'User testing with Cody, his volunteers and a store manager'],
    ['Connect it', "Read orders from the food bank's portal; track the truck through their fleet system"],
    ['Make it real', 'Accounts and permissions, so a pantry can run it day to day'],
  ];
  big.forEach(([h, d], i) => {
    const x = M + i * 4.1;
    card(s, x, 1.75, 3.85, 3.4);
    t(s, `0${i + 1}`, {x: x + 0.35, y: 2.0, w: 2, h: 0.8, fontSize: 40, bold: true, color: SPROUT});
    t(s, h, {x: x + 0.35, y: 2.9, w: 3.2, h: 0.5, fontSize: 22, bold: true});
    t(s, d, {x: x + 0.35, y: 3.5, w: 3.2, h: 1.4, fontSize: 15, color: TXT2});
  });
  t(s, 'Our measures of success: less time waiting at the dock, deliveries prepped before the truck arrives, less food spoiled in the handoff.', {x: M, y: 5.55, w: 12.1, h: 0.9, fontSize: 16});
  s.addNotes(`PRESENTER: Rosly

Three things take FreshRoute from prototype to something a pantry could rely on:
1. Test it: with Cody, his volunteers and a grocery store manager.
2. Connect it: read orders straight from the food bank's ordering portal, and get the truck's location from the food bank's own fleet tracking instead of asking their drivers to use our app.
3. Make it real: proper accounts and permissions.

How we'll measure success (from our "Moving Insights" plan): less time waiting at the dock, deliveries prepped before the truck arrives, and less food spoiled during the handoff.`);
}

// 26. IMMEDIATE NEXT STEPS (Rosly)
{
  const s = slide('PLAIN', '5 · Next steps', 'NEXT STEPS', 'Immediate next steps');
  const steps = ['Build the Figma file from the live app', 'Refine the prototype: fix the top 3 findings', 'Internal review as a team', 'Use AI tools to check accessibility issues', 'Refine the prototype again', 'Usability test with pantry staff and volunteers'];
  steps.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.15, y = 1.75 + row * 1.5;
    card(s, x, y, 5.95, 1.25);
    t(s, String(i + 1), {x: x + 0.3, y, w: 0.6, h: 1.25, fontSize: 30, bold: true, color: SPROUT, valign: 'middle'});
    t(s, st, {x: x + 1.05, y, w: 4.7, h: 1.25, fontSize: 17, valign: 'middle'});
  });
  t(s, 'Try it: freshroute.pages.dev', {x: M, y: 6.3, w: 8, h: 0.45, fontSize: 15, bold: true, color: SPROUT});
  s.addNotes(`PRESENTER: Rosly

Our immediate next steps, from the board:
1. Build the Figma file from the live app, so the design system lives somewhere the team can edit.
2. Refine the prototype: fix the top three findings from the heuristic audit.
3. Internal review as a team.
4. Use AI tools to check for accessibility issues.
5. Refine the prototype again.
6. Usability test with pantry staff and volunteers.

You can try it now at freshroute.pages.dev.

Board note (pink sticky): this matters to food banks because the system should be tailored to their needs. Every step here is about fitting how pantries already work.`);
}

// 27. OUR TEAM
{
  const s = slide('PLAIN', '5 · Next steps', 'THE TEAM', 'Our team');
  const team = [['Rosly Tavarez', 'Intro and next steps'], ['Anaya Smith', 'Research'], ['Stevie McLane', 'Design'], ['Alyssa Cuarenta', 'Usability']];
  team.forEach(([n, r], i) => {
    const x = M + i * 3.05, cx = x + 1.4;
    s.addShape(pres.shapes.OVAL, {x: cx - 1.05, y: 1.9, w: 2.1, h: 2.1, fill: {color: SURF}, line: {color: SPROUT, width: 2}});
    t(s, 'Photo', {x: cx - 1.05, y: 1.9, w: 2.1, h: 2.1, fontSize: 13, color: TXT3, align: 'center', valign: 'middle'});
    t(s, n, {x, y: 4.25, w: 2.8, h: 0.5, fontSize: 19, bold: true, align: 'center'});
    t(s, r, {x, y: 4.75, w: 2.8, h: 0.4, fontSize: 14, color: TXT2, align: 'center'});
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {x: cx - 0.35, y: 5.35, w: 0.7, h: 0.5, fill: {color: HEX.accent2}, line: {color: HEX.accent2}, rectRadius: 0.08});
    t(s, 'in', {x: cx - 0.35, y: 5.35, w: 0.7, h: 0.5, fontSize: 18, bold: true, color: BG, align: 'center', valign: 'middle'});
  });
  s.addNotes(`PRESENTER: everyone

Each of us says our name and what we led.

TEAM TO DO: replace each "Photo" circle with a headshot, and link each LinkedIn badge to your profile (select the badge, Insert > Link).`);
}

// =====================================================================
// APPENDIX
pres.addSection({title: 'Appendix'});
{
  const s = slide('PLAIN', 'Appendix', 'APPENDIX', 'Sources');
  t(s, bullets([
    'Tarrant Area Food Bank & North Texas Food Bank, "Texas Leads the Nation in Hunger; 1 in 4 Children in DFW are Food Insecure," July 28 2026 (Feeding America Map the Meal Gap data)',
    'ReFED, U.S. Food Waste Report 2025: 73.9M tons of surplus food in 2023, $382B; about 2% donated',
    'Tarrant Area Food Bank: 560+ partner agencies across 13 counties (tafb.org)',
    'North Texas Food Bank, Agency Partner Guidebook 2023: ordering deadlines, delivery windows, receiving and credit rules',
    'USDA ERS, Household Food Security in the United States in 2023: 13.5% of US households food insecure',
    'Nielsen, J., "10 Usability Heuristics for User Interface Design," Nielsen Norman Group',
    'Gibbons, S., Journey Map template, Nielsen Norman Group',
    'Our research: interviews with Cody Kimpton (Diamond Eagle Basic Needs Hub, UNT) and Poncho (Tarrant Area Food Bank), contextual inquiry at the Hub, competitive analysis sheet, Careit heuristic audit, persona and anti-persona, journey map',
  ], {gap: 8}), {x: M, y: 1.7, w: 12.1, h: 5.0, fontSize: 13, color: TXT2});
  s.addNotes('Reference slide. Not presented unless asked.');
}
{
  const s = slide('PLAIN', 'Appendix', 'APPENDIX', 'Persona sheets');
  s.addImage(await fit('persona-1.png', M, 1.6, 5.9, 5.2));
  s.addImage(await fit('anti-1.png', 6.8, 1.6, 5.9, 5.2));
  s.addNotes('Full persona (Maya) and anti-persona (Max) sheets, for reference during questions.');
}
{
  const s = slide('PLAIN', 'Appendix', 'APPENDIX · DIAMOND EAGLE BASIC NEEDS HUB, UNT', 'Contextual inquiry at the Hub');
  const ph = ['p14.jpg', 'p16.jpg', 'p17.jpg', 'p15.jpg', 'p20.jpg', 'p13.jpg'];
  for (const [i, f] of ph.entries()) {
    const col = i % 3, row = Math.floor(i / 3);
    s.addImage(await cover(f, M + col * 4.1, 1.65 + row * 2.6, 3.85, 2.4));
  }
  s.addNotes("Photos from our contextual inquiry at the Diamond Eagle Basic Needs Hub at UNT: fridges, the low-stock shelf, protein, hygiene, Cody's desk, and the Tarrant Area Food Bank ordering portal (shopping cart with gross weight). Useful backup if asked how the pantry works.");
}

  await pres.writeFile({fileName: OUT});
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
})();

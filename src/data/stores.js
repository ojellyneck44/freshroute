// Real Denton, TX grocery stores (locations from OpenStreetMap, 19 Nov 2026).
// Donation schedules, items and pickup notes are SAMPLE DATA for the prototype.
// Later these would come from a real system such as a food bank's agency portal,
// so everything the app needs is read through `stores` and `nextWindow()` only.

export const BANK = {
  id: 'north-loop',
  name: 'North Loop Food Pantry',
  address: '1200 E McKinney St, Denton',
  lat: 33.2105,
  lon: -97.118,
};

// days: 0 = Sunday … 6 = Saturday. Times are local 24 h.
const S = (id, name, address, lat, lon, schedule, items, how, cold = false) => ({id, name, address, lat, lon, schedule, items, how, cold});
const item = (name, pack, qty, lb, storage) => ({name, pack, qty, lb, storage});

export const stores = [
  S('kroger-loop288', 'Kroger', '1592 S Loop 288', 33.19525, -97.09575,
    [{days: [1, 3, 5], start: '08:30', end: '10:30'}],
    [item('Bakery bread', 'bagged loaves', 24, 18, 'dry'), item('Yogurt cups', '6-oz cups in trays', 48, 20, 'cold'), item('Bagged salad', '12-oz bags', 20, 15, 'cold')],
    'Back dock on the south side. Ask for the grocery lead. Items are unboxed and scanned one by one, so allow 15 minutes.', true),
  S('kroger-university', 'Kroger', '500 W University Dr', 33.23196, -97.13772,
    [{days: [2, 4], start: '09:00', end: '11:00'}],
    [item('Canned vegetables', '24-can case', 3, 45, 'dry'), item('Day-old pastries', 'clamshells', 18, 9, 'dry')],
    'Front customer service desk first, then they walk you to receiving. Cans come bagged, not boxed.'),
  S('kroger-teasley', 'Kroger', '5021 Teasley Ln', 33.14581, -97.10189,
    [{days: [1, 4], start: '07:30', end: '09:30'}],
    [item('Rotisserie chicken', 'chilled, sealed', 10, 25, 'cold'), item('Deli sandwiches', 'wrapped', 30, 15, 'cold')],
    'Receiving door at the back left. Cold items are staged in the walk-in; bring an insulated tote.', true),
  S('walmart-loop288', 'Walmart Supercenter', '1515 S Loop 288', 33.19108, -97.09373,
    [{days: [1, 2, 3, 4, 5], start: '06:30', end: '08:00'}],
    [item('Mixed produce', 'returnable crates', 6, 120, 'cool'), item('Dairy (milk, cheese)', 'gallons and blocks', 16, 70, 'cold'), item('Dry goods', 'mixed boxes', 8, 90, 'dry')],
    'Grocery receiving at the east loading bay. Every can is scanned before release, so arrive at the start of the window.', true),
  S('walmart-university', 'Walmart Supercenter', '2750 W University Dr', 33.23314, -97.16802,
    [{days: [2, 4, 6], start: '07:00', end: '08:30'}],
    [item('Bakery bread', 'bagged loaves', 40, 30, 'dry'), item('Frozen meals', 'boxed', 24, 22, 'frozen')],
    'Use the receiving bell on the west side. Frozen goods wait in the freezer until you sign the sheet.', true),
  S('walmart-teasley', 'Walmart Neighborhood Market', '3930 Teasley Ln', 33.15988, -97.10765,
    [{days: [3, 6], start: '08:00', end: '09:30'}],
    [item('Produce', 'banana boxes', 5, 75, 'cool'), item('Snacks', 'cases', 6, 30, 'dry')],
    'Small dock behind the store; park parallel. Staff bring items out on a cart.'),
  S('albertsons-university', 'Albertsons', '2321 W University Dr', 33.22837, -97.16295,
    [{days: [1, 3], start: '09:30', end: '11:00'}],
    [item('Deli and prepared food', 'trays', 12, 20, 'cold'), item('Bread', 'bagged loaves', 20, 15, 'dry')],
    'Ask at the deli counter; they call the store manager to sign off.', true),
  S('albertsons-2181', 'Albertsons', '4351 FM 2181', 33.13161, -97.04333,
    [{days: [2, 5], start: '10:00', end: '11:30'}],
    [item('Produce', 'crates', 4, 60, 'cool')],
    'Receiving door on the north side. Long drive from the pantry, so pair it with ALDI Swisher Rd.'),
  S('winco-university', 'WinCo Foods', '2645 W University Dr', 33.2275, -97.16682,
    [{days: [1, 4], start: '08:00', end: '09:30'}],
    [item('Bulk dry goods', '25-lb bags', 6, 150, 'dry'), item('Produce', 'crates', 5, 80, 'cool')],
    'Heavy loads: bring a hand truck. Bulk bags go on the floor of the van, never stacked on produce.'),
  S('aldi-loop288', 'ALDI', '1105 S Loop 288', 33.20016, -97.09038,
    [{days: [2, 5], start: '07:30', end: '08:30'}],
    [item('Produce', 'cardboard trays', 8, 60, 'cool'), item('Eggs', '18-count cartons', 12, 18, 'cold')],
    'Short window before opening. Knock at the side door; there is no dock, so items come out by hand.', true),
  S('aldi-ector', 'ALDI', '1317 Ector St', 33.22885, -97.15575,
    [{days: [3], start: '07:30', end: '08:30'}],
    [item('Bread', 'bagged loaves', 15, 11, 'dry')],
    'Side door by the cart corral. Small pickup, good to add to a University Dr route.'),
  S('aldi-swisher', 'ALDI', '3851 Swisher Rd', 33.13062, -97.04988,
    [{days: [2, 5], start: '08:30', end: '09:30'}],
    [item('Produce', 'cardboard trays', 6, 45, 'cool')],
    'Side door. Pairs well with Albertsons FM 2181 on the same morning.'),
  S('target-loop288', 'Target', '1801 S Loop 288', 33.18937, -97.09892,
    [{days: [1, 3, 5], start: '09:00', end: '10:00'}],
    [item('Dairy', 'mixed', 10, 35, 'cold'), item('Packaged food', 'mixed boxes', 6, 40, 'dry')],
    'Guest services first. Food is pre-weighed and logged; check the count sheet before you sign.', true),
  S('sprouts-teasley', 'Sprouts Farmers Market', '4930 Teasley Ln', 33.14795, -97.10668,
    [{days: [2, 4, 6], start: '08:00', end: '09:00'}],
    [item('Produce', 'banana boxes', 6, 70, 'cool'), item('Bulk bins overstock', 'bags', 8, 24, 'dry')],
    'Produce team hands off at the back. They sort out spoiled items first, so pickups are quick.'),
  S('natural-grocers-sherman', 'Natural Grocers', '110 E Sherman Dr', 33.23175, -97.13255,
    [{days: [5], start: '09:00', end: '10:00'}],
    [item('Dairy and alternatives', 'cartons', 10, 20, 'cold')],
    'Front counter. Small pickup; bring one insulated tote.', true),
  S('la-michoacana-university', 'La Michoacana Meat Market', '2006 W University Dr', 33.23006, -97.15511,
    [{days: [6], start: '08:00', end: '09:00'}],
    [item('Bakery (pan dulce)', 'trays', 6, 12, 'dry'), item('Produce', 'crates', 3, 40, 'cool')],
    'Back door off the side lot. Staff speak Spanish and English.'),
];

export const storeById = (id) => stores.find((s) => s.id === id);

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Next donation window at or after `now` (within 8 days). Returns {start: Date, end: Date, isOpen}.
export function nextWindow(store, now = new Date()) {
  for (let d = 0; d < 8; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    for (const w of store.schedule) {
      if (!w.days.includes(day.getDay())) continue;
      const start = new Date(day.getTime() + toMin(w.start) * 60000);
      const end = new Date(day.getTime() + toMin(w.end) * 60000);
      if (end > now) return {start, end, isOpen: start <= now};
    }
  }
  return null;
}

export const totalLb = (items) => items.reduce((a, i) => a + i.lb, 0);
export const needsCold = (items) => items.some((i) => i.storage === 'cold' || i.storage === 'frozen');

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
    [
     item('Whole wheat sandwich bread', '20-oz loaves', 18, 23, 'dry'),
     item('Plain bagels', '6-count bags', 10, 9, 'dry'),
     item('Strawberry Greek yogurt', '12-packs of 5.3-oz cups', 6, 24, 'cold'),
     item('Spring mix salad', '5-oz clamshells', 24, 8, 'cold'),
     item('Shredded cheddar cheese', '8-oz bags', 16, 8, 'cold'),
     item('Ripe bananas', '40-lb cases', 2, 80, 'cool'),
    ],
    'Back dock on the south side. Ask for the grocery lead. Items are unboxed and scanned one by one, so allow 15 minutes.', true),
  S('kroger-university', 'Kroger', '500 W University Dr', 33.23196, -97.13772,
    [{days: [2, 4], start: '09:00', end: '11:00'}],
    [
     item('Canned black beans', '15-oz cans', 48, 47, 'dry'),
     item('Canned sweet corn', '15.25-oz cans', 48, 48, 'dry'),
     item('Chicken noodle soup', '10.75-oz cans', 24, 17, 'dry'),
     item('Day-old blueberry muffins', '4-count clamshells', 12, 9, 'dry'),
     item('Creamy peanut butter', '16-oz jars', 12, 12, 'dry'),
    ],
    'Front customer service desk first, then they walk you to receiving. Cans come bagged, not boxed, so bring two milk crates.'),
  S('kroger-teasley', 'Kroger', '5021 Teasley Ln', 33.14581, -97.10189,
    [{days: [1, 4], start: '07:30', end: '09:30'}],
    [
     item('Rotisserie chickens', 'sealed domes', 10, 25, 'cold'),
     item('Turkey and Swiss sandwiches', 'wrapped singles', 24, 12, 'cold'),
     item('Cut fruit cups', '16-oz cups', 18, 18, 'cold'),
     item('2% milk', 'half-gallons', 12, 52, 'cold'),
     item('Classic hummus', '10-oz tubs', 10, 6, 'cold'),
    ],
    'Receiving door at the back left. Cold items are staged in the walk-in; bring an insulated tote.', true),
  S('walmart-loop288', 'Walmart Supercenter', '1515 S Loop 288', 33.19108, -97.09373,
    [{days: [1, 2, 3, 4, 5], start: '06:30', end: '08:00'}],
    [
     item('Russet potatoes', '10-lb bags', 8, 80, 'cool'),
     item('Yellow onions', '3-lb bags', 10, 30, 'cool'),
     item('Gala apples', '3-lb bags', 12, 36, 'cool'),
     item('Whole milk', 'gallons', 12, 104, 'cold'),
     item('Large eggs', '18-count cartons', 15, 24, 'cold'),
     item('Spaghetti', '1-lb boxes', 30, 30, 'dry'),
     item('Long-grain white rice', '2-lb bags', 20, 40, 'dry'),
    ],
    'Grocery receiving at the east loading bay. Every can is scanned before release, so arrive at the start of the window.', true),
  S('walmart-university', 'Walmart Supercenter', '2750 W University Dr', 33.23314, -97.16802,
    [{days: [2, 4, 6], start: '07:00', end: '08:30'}],
    [
     item('White sandwich bread', '20-oz loaves', 30, 38, 'dry'),
     item('Hamburger buns', '8-count bags', 16, 12, 'dry'),
     item('Frozen cheese pizza', '12-inch boxes', 12, 22, 'frozen'),
     item('Frozen mixed vegetables', '12-oz bags', 24, 18, 'frozen'),
     item('Frozen chicken breasts', '3-lb bags', 6, 18, 'frozen'),
    ],
    'Use the receiving bell on the west side. Frozen goods wait in the freezer until you sign the sheet.', true),
  S('walmart-teasley', 'Walmart Neighborhood Market', '3930 Teasley Ln', 33.15988, -97.10765,
    [{days: [3, 6], start: '08:00', end: '09:30'}],
    [
     item('Romaine hearts', '3-count bags', 12, 15, 'cool'),
     item('Carrots', '2-lb bags', 15, 30, 'cool'),
     item('Navel oranges', '4-lb bags', 8, 32, 'cool'),
     item('Oat granola bars', '12-count boxes', 18, 14, 'dry'),
     item('Applesauce cups', '6-count packs', 20, 18, 'dry'),
    ],
    'Small dock behind the store; park parallel. Staff bring items out on a cart.'),
  S('albertsons-university', 'Albertsons', '2321 W University Dr', 33.22837, -97.16295,
    [{days: [1, 3], start: '09:30', end: '11:00'}],
    [
     item('Deli fried chicken', '8-piece trays', 6, 18, 'cold'),
     item('Macaroni salad', '1-lb tubs', 10, 10, 'cold'),
     item('Sliced deli turkey', '1-lb packs', 8, 8, 'cold'),
     item('French baguettes', 'single loaves', 16, 12, 'dry'),
     item('Cinnamon rolls', '4-count trays', 8, 8, 'dry'),
    ],
    'Ask at the deli counter; they call the store manager to sign off.', true),
  S('albertsons-2181', 'Albertsons', '4351 FM 2181', 33.13161, -97.04333,
    [{days: [2, 5], start: '10:00', end: '11:30'}],
    [
     item('Roma tomatoes', '25-lb cases', 1, 25, 'cool'),
     item('Green bell peppers', '6-count bags', 10, 15, 'cool'),
     item('Hass avocados', '4-count bags', 12, 12, 'cool'),
     item('Corn tortillas', '30-count packs', 12, 18, 'dry'),
    ],
    'Receiving door on the north side. Long drive from the pantry, so pair it with ALDI Swisher Rd.'),
  S('winco-university', 'WinCo Foods', '2645 W University Dr', 33.2275, -97.16682,
    [{days: [1, 4], start: '08:00', end: '09:30'}],
    [
     item('Dry pinto beans', '25-lb bags', 2, 50, 'dry'),
     item('Rolled oats', '25-lb bags', 1, 25, 'dry'),
     item('Long-grain white rice', '25-lb bags', 2, 50, 'dry'),
     item('Green cabbage', '50-lb cases', 1, 50, 'cool'),
     item('Sweet potatoes', '40-lb cases', 1, 40, 'cool'),
    ],
    'Heavy loads: bring a hand truck. Bulk bags go on the floor of the van, never stacked on produce.'),
  S('aldi-loop288', 'ALDI', '1105 S Loop 288', 33.20016, -97.09038,
    [{days: [2, 5], start: '07:30', end: '08:30'}],
    [
     item('Strawberries', '1-lb clamshells', 24, 24, 'cold'),
     item('Blueberries', '18-oz clamshells', 12, 14, 'cold'),
     item('Large eggs', 'dozen cartons', 18, 27, 'cold'),
     item('Baby spinach', '6-oz bags', 15, 6, 'cold'),
     item('Whole grain bread', '24-oz loaves', 10, 15, 'dry'),
    ],
    'Short window before opening. Knock at the side door; there is no dock, so items come out by hand.', true),
  S('aldi-ector', 'ALDI', '1317 Ector St', 33.22885, -97.15575,
    [{days: [3], start: '07:30', end: '08:30'}],
    [
     item('Brioche hamburger buns', '8-count bags', 10, 10, 'dry'),
     item('Flour tortillas', '10-count packs', 14, 14, 'dry'),
     item('Pretzel twists', '16-oz bags', 12, 12, 'dry'),
    ],
    'Side door by the cart corral. Small pickup, good to add to a University Dr route.'),
  S('aldi-swisher', 'ALDI', '3851 Swisher Rd', 33.13062, -97.04988,
    [{days: [2, 5], start: '08:30', end: '09:30'}],
    [
     item('Cucumbers', 'loose, in crates', 30, 24, 'cool'),
     item('Zucchini', 'loose, in crates', 20, 12, 'cool'),
     item('Grape tomatoes', '1-pint clamshells', 16, 12, 'cool'),
     item('Lemons', '2-lb bags', 6, 12, 'cool'),
    ],
    'Side door. Pairs well with Albertsons FM 2181 on the same morning.'),
  S('target-loop288', 'Target', '1801 S Loop 288', 33.18937, -97.09892,
    [{days: [1, 3, 5], start: '09:00', end: '10:00'}],
    [
     item('Low-fat chocolate milk', '12-packs of 8-oz cartons', 4, 26, 'cold'),
     item('String cheese', '12-count bags', 10, 7, 'cold'),
     item('Macaroni and cheese', '7.25-oz boxes', 36, 16, 'dry'),
     item('Toasted oat cereal', '12-oz boxes', 18, 14, 'dry'),
     item('Canned light tuna', '5-oz cans', 48, 15, 'dry'),
    ],
    'Guest services first. Food is pre-weighed and logged; check the count sheet before you sign.', true),
  S('sprouts-teasley', 'Sprouts Farmers Market', '4930 Teasley Ln', 33.14795, -97.10668,
    [{days: [2, 4, 6], start: '08:00', end: '09:00'}],
    [
     item('Organic bananas', '40-lb cases', 1, 40, 'cool'),
     item('Ataulfo mangoes', 'loose, in trays', 24, 18, 'cool'),
     item('Mixed bell peppers', 'loose, in crates', 30, 15, 'cool'),
     item('Curly kale', 'bunches', 20, 10, 'cool'),
     item('Trail mix (bulk bins)', '1-lb bags', 10, 10, 'dry'),
     item('Unsweetened almond milk', 'half-gallons', 8, 34, 'cold'),
    ],
    'Produce team hands off at the back. They sort out spoiled items first, so pickups are quick.'),
  S('natural-grocers-sherman', 'Natural Grocers', '110 E Sherman Dr', 33.23175, -97.13255,
    [{days: [5], start: '09:00', end: '10:00'}],
    [
     item('Oat milk', 'half-gallons', 8, 34, 'cold'),
     item('Plain whole-milk yogurt', '32-oz tubs', 8, 16, 'cold'),
     item('Firm tofu', '14-oz blocks', 12, 11, 'cold'),
     item('Gluten-free sandwich bread', '15-oz loaves', 6, 6, 'dry'),
    ],
    'Front counter. Small pickup; bring one insulated tote.', true),
  S('la-michoacana-university', 'La Michoacana Meat Market', '2006 W University Dr', 33.23006, -97.15511,
    [{days: [6], start: '08:00', end: '09:00'}],
    [
     item('Conchas (pan dulce)', '6-count trays', 10, 9, 'dry'),
     item('Bolillo rolls', '10-count bags', 8, 10, 'dry'),
     item('Queso fresco', '12-oz rounds', 10, 8, 'cold'),
     item('Corn tortillas', '2-lb packs', 10, 20, 'dry'),
     item('Jalapeños', '2-lb bags', 5, 10, 'cool'),
     item('Tomatillos', '3-lb bags', 4, 12, 'cool'),
    ],
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

# How pantries get food from a parent food bank, and where FreshRoute fits

Research for the FreshRoute refocus, 20 Nov 2026. Sources are listed at the end.

**Caveat:** Tarrant Area Food Bank (TAFB) doesn't publish its partner handbook. Its website describes only the network. The step-by-step process below comes from the North Texas Food Bank (NTFB) Agency Partner Guidebook 2023 and from partner guides at other Feeding America food banks.

NTFB is TAFB's neighbour, and both list Denton County in their service areas. Most Feeding America food banks use the same ordering software, so the process is very likely close. Confirm the TAFB specifics with Cody (see the questions at the end).

## 1. The network

```
Feeding America (national: donors, MealConnect, food safety standards)
  └─ Regional food bank ("parent"): TAFB, 13 counties incl. Denton, 560+ partner agencies
       └─ Partner agencies: food pantries, meal programs, shelters (e.g. Cody's pantry)
            └─ Neighbours (households)
```

A pantry gets food from four places:

| Channel | Who moves the food | How often | Tracked today by |
|---|---|---|---|
| **Food bank order, delivered** | Food bank truck and driver | Standing weekly or biweekly appointment | Agency Express or Primarius order, paper invoice, a phone call from the driver |
| **Food bank order, picked up** | Pantry volunteers at the food bank warehouse | Scheduled appointment, Mon to Fri 6:30 AM to 3:30 PM (NTFB) | Same, with the invoice signed at the warehouse |
| **Retail rescue (direct retail)** | Pantry volunteers at assigned grocery stores | Several times a week | MealConnect (Feeding America), pounds logged per pickup |
| Food drives, local donors | Anyone | Irregular | Pantry's own records |

FreshRoute today covers only the third row.

## 2. A food bank delivery, step by step

1. **Order.** The pantry orders online in Agency Express or Primarius from live inventory, which updates every 3 to 5 minutes and is first come, first served. Orders are due by 5 PM three business days before the delivery date. A pantry can't order more than two weeks ahead.
2. **Order status.** Each order moves through New, Sent to Food Bank, Acknowledged, Released, then Invoiced.
   - The pantry can edit the order until it is Released.
   - Once it is Released, nothing can change.
   - The invoice can differ from the order, because stock runs out.
3. **Schedule.** Every delivery needs a standing appointment, set up when the pantry joins the network. The food bank sets the day and time window.
   - The truck goes either to the pantry, dropping at the entrance with no inside delivery, or to a **hub**, where several pantries meet one truck.
4. **On the road.** The rules here come from the NTFB guidebook:
   - "The driver will call the Agency before he leaves his prior stop to inform the Agency of his ETA."
   - Pantries should "give the truck the entire delivery window before it is considered late."
   - If the truck is late, the pantry files an *urgent service desk ticket* to find out where it is.
   - Bad weather and food bank closures move deliveries with little notice.
5. **Receiving.** Volunteers check the delivery against the invoice and **sign the invoice before the driver leaves**.
   - Refrigerated product can only be received with the pantry's pallet blanket. A lost blanket costs $95.
6. **Problems.** Possible discrepancies are missing items, wrong items, damaged goods and items not ordered.
   - A credit request must be filed **within 3 business days**.
   - About 20% of assorted produce can be unusable, and that isn't credited.
   - Refusing an order that's fit to use costs the greater of $250 or $0.08 per pound.
7. **Food safety.** Cold food stays at or below 41 °F. The danger zone is 41 to 135 °F for more than 4 hours. Food banks ask for temperatures at pickup and at drop-off, written on a shared log.
8. **Reporting.** Each month the pantry reports households served, plus the pounds from each source, retail pounds included.

## 3. What's hard for the pantry (and what FreshRoute can do)

| Pain | Today | FreshRoute |
|---|---|---|
| Volunteers wait at the door for a 2 to 4 hour window | Phone call from the driver, if it comes | **Live ETA for the incoming food bank truck**, with a heads-up 30 and 10 minutes out. Hub deliveries show every pantry's slot. |
| "Is the truck late?" | Urgent ticket, then waiting for a reply | The board shows on time, running late or delayed, and why (traffic, a stop running long). Running late before the window ends is visible without a ticket. |
| Checking 40 lines against a paper invoice while the driver waits | Clipboard | **Receiving checklist** built from the order: tap each line received, short or damaged. Photos, arrival temperature, pallet blanket used, signature. |
| 3-day credit deadline | Remember to file it | Discrepancies become a ready-to-send credit request with photos, and a reminder before the deadline |
| Cold-chain proof | Paper temperature log | Arrival temperature and cold timer attached to each delivery. Video of the drive if the food bank enables it. |
| Retail rescue by volunteers | MealConnect, plus pounds by hand | The current driver flow: stores, windows, counts, report |
| Monthly report | Adding up pounds by source | Pounds by source, already totalled |

## 4. Who uses what (proposed)

- **Pantry coordinator (primary user, the "antipersona-proof" seat):**
  - an *Incoming today* board covering food bank trucks, hub pickups, warehouse pickups and volunteer rescue runs;
  - the receiving checklist;
  - credits;
  - reports.
- **Pantry volunteer driver:** today's driver app, for retail rescue and warehouse pickups. Recording stays here, because this is where shrinkage is in the pantry's own hands.
- **Food bank truck driver:** shares a live ETA. They won't adopt a new app for one partner, so this has to cost them nothing.
  - **Prototype:** simulated food bank trucks.
  - **Real version, option A:** read the ETA from the food bank's own fleet tracking.
  - **Real version, option B:** a one-tap "share my trip" link.
- **Food bank partner services:** gets signed receipts, discrepancies and credit requests, without a phone call.

## 5. What changes in the app (proposed, needs your OK before building)

1. Welcome: "I run a food bank" becomes **"I run a pantry"**. The pantry is the home base, and "the food bank" means the parent, TAFB.
2. The manager home becomes **Incoming**, a timeline of today's deliveries. Food bank trucks come first, with live ETA, window, order number, pounds and cold items. Volunteer rescue runs come below.
3. A **Receive delivery** flow: invoice lines, received or short or damaged, photos, temperature, pallet blanket, signature. Then **Credits**, showing anything to claim within 3 business days.
4. Sample data:
   - fictional TAFB orders with real-looking line items;
   - a standing appointment, for example Tuesday 9 AM to 12 PM;
   - one hub delivery;
   - simulated food bank trucks moving on the map.
5. The driver app stays, renamed in the copy to a **volunteer pickup run** (stores or the food bank warehouse).
6. The vehicle picker is replaced with **vehicle description** (for example "White Ford Transit, plate ends 4KD") and **cold storage**. That is what a receiving volunteer needs to recognise the truck. "Van 1 / Van 2" meant nothing outside one pantry.

## 6. Questions for Cody

1. Does the pantry receive TAFB deliveries, pick up at the TAFB warehouse, or both? How long is the delivery window?
2. Which ordering system does the TAFB partner portal use (Agency Express, Primarius or another)? Can a pantry export an order or invoice?
3. Does the TAFB driver call ahead today? How often is the truck late, and what happens then?
4. What goes wrong most often at receiving: shorts, damage, temperature or paperwork?
5. Does the pantry do retail rescue pickups itself (MealConnect), and how many per week?

## Sources

- North Texas Food Bank, *Agency Partner Guidebook 2023*: <https://ntfb.org/wp-content/uploads/2023/08/Agency-Partner-Guidebook-2023.pdf> (ordering, delivery, receiving, returns, food safety and reporting sections)
- Tarrant Area Food Bank: <https://tafb.org/>, <https://tafb.org/find-food/>, <https://tafb.org/food-industry-partnerships/>
- TAFB service counties and partner count: <https://texvet.org/resources/tarrant-area-food-bank>, <https://tafb.org/?p=79323>
- Partner ordering guides: <https://www.feedingthegulfcoast.org/assets/files/Primarius-Web-Window-Guide.pdf>, <https://www.regionalfoodbank.org/wp-content/uploads/2022/06/Agency-Express-Order-Guide.pdf>
- Temperature logging at pickup and drop-off: <https://feedingsandiego.org/wp-content/uploads/2025/11/Thermometer-Handout-1.pdf>, <https://foodbankheartland.org/wp-content/uploads/Partner_Manual_3.2.26.pdf>
- MealConnect: <https://www.feedingamerica.org/hunger-blog/what-mealconnect-learn-about-feeding-americas-food-rescue-platform>

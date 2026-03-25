function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(p) {
  return Math.random() < p;
}

function parseTimeToMinutes(str) {
  const [hh, mm] = str.split(":").map(Number);
  return hh * 60 + mm;
}

function pickWeighted(items) {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function formatIsoLocal(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}

const STORES = [
  {
    name: "Frankfurter Allee 255",
    district: "Lichtenberg",
    postal_code: "10365",
    incomeIndex: 0.92,
    vibe: "residential",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "22:00"],
      2: ["11:00", "22:00"],
      3: ["11:00", "22:00"],
      4: ["11:00", "22:00"],
      5: ["11:00", "23:00"],
      6: ["11:00", "23:00"],
      0: ["11:00", "22:00"],
    },
  },
  {
    name: "Scharnweberstr. 83",
    district: "Reinickendorf",
    postal_code: "13405",
    incomeIndex: 0.95,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["10:30", "01:30"],
      2: ["10:30", "01:30"],
      3: ["10:30", "01:30"],
      4: ["10:30", "02:30"],
      5: ["10:30", "02:30"],
      6: ["10:30", "02:30"],
      0: ["10:30", "00:00"],
    },
  },
  {
    name: "Großbeerenstr. 35",
    district: "Kreuzberg",
    postal_code: "10965",
    incomeIndex: 1.0,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["10:30", "02:00"],
      2: ["10:30", "02:00"],
      3: ["10:30", "02:00"],
      4: ["10:30", "03:00"],
      5: ["10:30", "03:00"],
      6: ["10:30", "03:00"],
      0: ["10:30", "02:00"],
    },
  },
  {
    name: "Brunsbütteler Damm 263",
    district: "Spandau",
    postal_code: "13591",
    incomeIndex: 0.9,
    vibe: "residential",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "00:00"],
      2: ["11:00", "00:00"],
      3: ["11:00", "00:00"],
      4: ["11:00", "00:00"],
      5: ["11:00", "01:00"],
      6: ["11:00", "01:00"],
      0: ["11:00", "00:00"],
    },
  },
  {
    name: "Nonnendammallee 84",
    district: "Spandau",
    postal_code: "13629",
    incomeIndex: 0.9,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "01:00"],
      2: ["11:00", "01:00"],
      3: ["11:00", "01:00"],
      4: ["11:00", "01:00"],
      5: ["11:00", "03:00"],
      6: ["12:00", "03:00"],
      0: ["12:00", "01:00"],
    },
  },
  {
    name: "Potsdamerstr. 129",
    district: "Mitte",
    postal_code: "10783",
    incomeIndex: 1.2,
    vibe: "business",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "22:00"],
      2: ["11:00", "22:00"],
      3: ["11:00", "22:00"],
      4: ["11:00", "22:00"],
      5: ["11:00", "23:00"],
      6: ["11:00", "23:00"],
      0: ["11:00", "22:00"],
    },
  },
  {
    name: "Waldseeweg 31",
    district: "Marzahn",
    postal_code: "13467",
    incomeIndex: 0.9,
    vibe: "residential",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "22:00"],
      2: ["11:00", "22:00"],
      3: ["11:00", "22:00"],
      4: ["11:00", "22:00"],
      5: ["11:00", "23:00"],
      6: ["11:00", "23:00"],
      0: ["11:00", "22:00"],
    },
  },
  {
    name: "Bornholmer Str. 93",
    district: "Prenzlauer Berg",
    postal_code: "10439",
    incomeIndex: 1.08,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "03:00"],
      2: ["11:00", "03:00"],
      3: ["11:00", "03:00"],
      4: ["11:00", "03:00"],
      5: ["11:00", "03:00"],
      6: ["11:00", "03:00"],
      0: ["11:00", "03:00"],
    },
  },
  {
    name: "Friedrichshagener 1B",
    district: "Köpenick",
    postal_code: "12555",
    incomeIndex: 0.96,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "02:00"],
      2: ["11:00", "02:00"],
      3: ["11:00", "02:00"],
      4: ["11:00", "03:00"],
      5: ["11:00", "03:00"],
      6: ["11:00", "03:00"],
      0: ["11:00", "03:00"],
    },
  },
  {
    name: "Neuendorferstr. 51",
    district: "Spandau",
    postal_code: "13585",
    incomeIndex: 0.9,
    vibe: "residential",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "00:00"],
      2: ["11:00", "00:00"],
      3: ["11:00", "00:00"],
      4: ["11:00", "00:00"],
      5: ["11:00", "01:00"],
      6: ["11:00", "01:00"],
      0: ["11:00", "00:00"],
    },
  },
  {
    name: "Flughafenstr. 31",
    district: "Neukölln",
    postal_code: "12053",
    incomeIndex: 0.88,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "02:00"],
      2: ["11:00", "02:00"],
      3: ["11:00", "02:00"],
      4: ["11:00", "02:00"],
      5: ["11:00", "04:00"],
      6: ["11:00", "04:00"],
      0: ["11:00", "02:00"],
    },
  },
  {
    name: "Kurfürstendamm 71",
    district: "Charlottenburg",
    postal_code: "10709",
    incomeIndex: 1.3,
    vibe: "premium",
    deliveryOnly: true,
    hours: {
      1: ["10:00", "24:00"],
      2: ["10:00", "24:00"],
      3: ["10:00", "24:00"],
      4: ["10:00", "24:00"],
      5: ["10:00", "24:00"],
      6: ["10:00", "24:00"],
      0: ["10:00", "24:00"],
    },
  },
  {
    name: "Heinrich-Mann-Allee 7",
    district: "Potsdam",
    postal_code: "14473",
    incomeIndex: 1.04,
    vibe: "business",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "24:00"],
      2: ["11:00", "24:00"],
      3: ["11:00", "24:00"],
      4: ["11:00", "24:00"],
      5: ["11:00", "01:00"],
      6: ["11:00", "01:00"],
      0: ["11:00", "24:00"],
    },
  },
  {
    name: "Oberfeldstraße 10a",
    district: "Biesdorf",
    postal_code: "12683",
    incomeIndex: 0.92,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "02:00"],
      2: ["11:00", "02:00"],
      3: ["11:00", "02:00"],
      4: ["11:00", "03:00"],
      5: ["11:00", "03:00"],
      6: ["11:00", "03:00"],
      0: ["11:00", "02:00"],
    },
  },
  {
    name: "Schlesische Str. 18",
    district: "Kreuzberg",
    postal_code: "10997",
    incomeIndex: 1.02,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "24:00"],
      2: ["11:00", "24:00"],
      3: ["11:00", "24:00"],
      4: ["11:00", "24:00"],
      5: ["11:00", "02:00"],
      6: ["11:00", "02:00"],
      0: ["11:00", "24:00"],
    },
  },
  {
    name: "Janusz-Korczak-Straße 31c",
    district: "Hellersdorf",
    postal_code: "12627",
    incomeIndex: 0.9,
    vibe: "lateNight",
    deliveryOnly: false,
    hours: {
      1: ["10:00", "02:00"],
      2: ["10:00", "02:00"],
      3: ["10:00", "02:00"],
      4: ["10:00", "02:00"],
      5: ["10:00", "02:00"],
      6: ["10:00", "02:00"],
      0: ["10:00", "02:00"],
    },
  },
  {
    name: "Berliner Straße 8a",
    district: "Umland",
    postal_code: "14612",
    incomeIndex: 1.0,
    vibe: "residential",
    deliveryOnly: false,
    hours: {
      1: ["11:00", "22:45"],
      2: ["11:00", "22:45"],
      3: ["11:00", "22:45"],
      4: ["11:00", "22:45"],
      5: ["11:00", "22:45"],
      6: ["12:00", "22:45"],
      0: ["12:00", "22:45"],
    },
  },
];

const PRODUCTS = [
  { name: "Cheeseburger", category: "Burger", basePrice: 6.0, premiumBias: 1.0 },
  { name: "Double Burger", category: "Burger", basePrice: 8.0, premiumBias: 1.1 },
  { name: "Chicken Burger", category: "Burger", basePrice: 7.0, premiumBias: 1.0 },
  { name: "Veggie Burger", category: "Burger", basePrice: 7.5, premiumBias: 1.15 },
  { name: "Fries", category: "Side", basePrice: 3.0, premiumBias: 0.95 },
  { name: "Loaded Fries", category: "Side", basePrice: 5.5, premiumBias: 1.05 },
  { name: "Drink", category: "Drink", basePrice: 2.5, premiumBias: 0.95 },
  { name: "Milkshake", category: "Drink", basePrice: 4.2, premiumBias: 1.2 },
  { name: "Salad", category: "Side", basePrice: 4.8, premiumBias: 1.05 },
  { name: "Kids Menu", category: "Menu", basePrice: 6.5, premiumBias: 0.9 },
];

function getBusinessLoadFactor(store, weekday) {
  let factor = 1;

  if (store.vibe === "business") factor *= weekday >= 1 && weekday <= 5 ? 1.15 : 0.92;
  if (store.vibe === "premium") factor *= 1.08;
  if (store.vibe === "lateNight") factor *= weekday >= 5 || weekday === 6 ? 1.18 : 1.0;
  if (store.vibe === "residential") factor *= weekday === 0 ? 1.08 : 1.0;

  return factor;
}

function getDailyOrderBase(store, weekday, month) {
  let base = 52;

  if (store.vibe === "business") base += 16;
  if (store.vibe === "premium") base += 12;
  if (store.vibe === "lateNight") base += 18;
  if (store.vibe === "residential") base += 8;

  if (weekday === 5 || weekday === 6) base += 10;
  if (weekday === 0) base += 4;

  if (month === 11 || month === 12) base += 6;
  if (month === 1) base -= 4;

  return Math.max(28, Math.round(base * getBusinessLoadFactor(store, weekday)));
}

function generateUserPool() {
  const users = [];
  for (let i = 1; i <= 100; i++) {
    const userId = `U${String(i).padStart(6, "0")}`;
    const userFrequencyClass = pickWeighted([
      { value: "rare", weight: 50 },
      { value: "normal", weight: 35 },
      { value: "heavy", weight: 12 },
      { value: "veryHeavy", weight: 3 },
    ]);
    users.push({
      user_id: userId,
      userFrequencyClass,
    });
  }
  return users;
}

function pickUser(users) {
  return pickWeighted(
    users.map((u) => {
      let weight = 1;
      if (u.userFrequencyClass === "normal") weight = 2;
      if (u.userFrequencyClass === "heavy") weight = 4;
      if (u.userFrequencyClass === "veryHeavy") weight = 7;
      return { value: u, weight };
    })
  );
}

function generateBasketItemCount() {
  const r = Math.random();

  if (r < 0.56) return randInt(1, 2);
  if (r < 0.88) return randInt(3, 6);
  if (r < 0.97) return randInt(7, 12);
  return randInt(13, 28);
}

function pickProductForStore(store, hour) {
  const candidates = PRODUCTS.map((p) => {
    let weight = 1;

    if (p.category === "Burger") weight += 4;
    if (p.name === "Fries" || p.name === "Drink") weight += 2.5;
    if (p.name === "Milkshake" && (hour >= 14 && hour <= 20)) weight += 1.5;
    if (p.name === "Kids Menu" && (hour >= 17 && hour <= 20)) weight += 1.0;

    if (store.vibe === "premium") weight *= p.premiumBias;
    if (store.vibe === "business" && p.category === "Menu") weight *= 1.15;
    if (store.vibe === "lateNight" && p.name === "Loaded Fries") weight *= 1.2;

    return { value: p, weight };
  });

  return pickWeighted(candidates);
}

function generateQuantity(product, itemsCount) {
  if (itemsCount >= 10) {
    if (chance(0.28)) return randInt(2, 5);
  }
  if (product.category === "Drink" && chance(0.12)) return 2;
  return 1;
}

function getPrice(product, store) {
  const noise = 0.92 + Math.random() * 0.18;
  return Number((product.basePrice * store.incomeIndex * noise).toFixed(2));
}

function getOpenWindow(store, weekday) {
  const entry = store.hours[weekday];
  if (!entry) return null;

  const [start, end] = entry;
  const startMin = parseTimeToMinutes(start);
  let endMin = end === "24:00" ? 24 * 60 : parseTimeToMinutes(end);

  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  return { startMin, endMin };
}

function chooseOrderMinute(store, weekday) {
  const window = getOpenWindow(store, weekday);
  if (!window) return 12 * 60;

  const { startMin, endMin } = window;
  const openLength = endMin - startMin;

  const lunchStart = Math.max(startMin, 11 * 60);
  const lunchEnd = Math.min(endMin, 14 * 60);
  const dinnerStart = Math.max(startMin, 18 * 60);
  const dinnerEnd = Math.min(endMin, 22 * 60);
  const nightStart = Math.max(startMin, 22 * 60);
  const nightEnd = endMin;

  const buckets = [];

  buckets.push({
    type: "uniform",
    start: startMin,
    end: endMin,
    weight: 1.2,
  });

  if (lunchEnd - lunchStart > 20) {
    buckets.push({
      type: "uniform",
      start: lunchStart,
      end: lunchEnd,
      weight: store.vibe === "business" ? 3.8 : 2.6,
    });
  }

  if (dinnerEnd - dinnerStart > 20) {
    buckets.push({
      type: "uniform",
      start: dinnerStart,
      end: dinnerEnd,
      weight: store.vibe === "residential" ? 3.2 : 2.8,
    });
  }

  if (nightEnd - nightStart > 20) {
    buckets.push({
      type: "uniform",
      start: nightStart,
      end: nightEnd,
      weight: store.vibe === "lateNight" ? 3.6 : 1.2,
    });
  }

  const chosen = pickWeighted(
    buckets.map((b) => ({ value: b, weight: b.weight }))
  );

  if (!chosen || chosen.end <= chosen.start) {
    return startMin + Math.floor(openLength / 2);
  }

  return randInt(chosen.start, chosen.end - 1);
}

function createDateWithMinute(baseDate, minuteOfTimeline) {
  const d = new Date(baseDate);
  const dayOffset = Math.floor(minuteOfTimeline / (24 * 60));
  const minuteOfDay = minuteOfTimeline % (24 * 60);

  const hh = Math.floor(minuteOfDay / 60);
  const mm = minuteOfDay % 60;

  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);

  return d;
}

function generateOrders({
  startDate = "2025-09-01",
  endDate = "2025-09-03",
} = {}) {
  const users = generateUserPool();
  const rows = [];
  let orderCounter = 1;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    const month = d.getMonth() + 1;

    for (const store of STORES) {
      const orderCount = getDailyOrderBase(store, weekday, month);

      for (let i = 0; i < orderCount; i++) {
        const order_id = `O${String(orderCounter).padStart(8, "0")}`;
        orderCounter += 1;

        const user = pickUser(users);
        const minuteOfTimeline = chooseOrderMinute(store, weekday);
        const datetime = createDateWithMinute(d, minuteOfTimeline);

        const itemsCount = generateBasketItemCount();
        const orderItems = [];

        for (let x = 0; x < itemsCount; x++) {
          const minuteHour = datetime.getHours();
          const product = pickProductForStore(store, minuteHour);
          const qty = generateQuantity(product, itemsCount);
          const unit_price = getPrice(product, store);

          orderItems.push({
            order_id,
            user_id: user.user_id,
            datetime: formatIsoLocal(datetime),
            store: store.name,
            district: store.district,
            postal_code: store.postal_code,
            product: product.name,
            category: product.category,
            qty,
            unit_price,
          });
        }

        rows.push(...orderItems);
      }
    }
  }

  return rows;
}

module.exports = {
  STORES,
  generateOrders,
};
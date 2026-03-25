// src/lib/forecast_plus.js
// Forecast+ (calendar + payday + holidays + store events + optional weather)
// ML: Ridge regression per store on daily revenue
// Weather: Open-Meteo (no key). Works even if weather is not loaded.

function ymd(dt) {
  if (typeof dt === "string") return dt.slice(0, 10);
  return new Date(dt).toISOString().slice(0, 10);
}

function addDays(dateStr, k) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + k);
  return ymd(d);
}

function dow(dateStr) {
  // 0=Sun..6=Sat
  return new Date(`${dateStr}T00:00:00`).getDay();
}

function dayOfMonth(dateStr) {
  return Number(dateStr.slice(8, 10));
}

function daysInMonth(dateStr) {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  return new Date(y, m, 0).getDate();
}

function safeNum(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

/* -------------------- HOLIDAYS (Berlin + DE widely relevant) -------------------- */

function easterSunday(year) {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function dateShift(dateStr, deltaDays) {
  return addDays(dateStr, deltaDays);
}

function holidayNameBerlin(dateStr) {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));

  // Fixed-date holidays (DE-wide)
  const fixed = {
    "01-01": "Neujahr",
    "05-01": "Tag der Arbeit",
    "10-03": "Tag der Deutschen Einheit",
    "12-25": "1. Weihnachtstag",
    "12-26": "2. Weihnachtstag",
  };

  const key = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (fixed[key]) return fixed[key];

  // Berlin-specific (widely applicable for your use-case)
  // International Women's Day (Berlin)
  if (key === "03-08") return "Internationaler Frauentag (Berlin)";

  // Easter-based
  const easter = easterSunday(y);
  const goodFriday = dateShift(easter, -2);
  const easterMonday = dateShift(easter, 1);
  const ascension = dateShift(easter, 39);
  const whitMonday = dateShift(easter, 50);

  if (dateStr === goodFriday) return "Karfreitag";
  if (dateStr === easterMonday) return "Ostermontag";
  if (dateStr === ascension) return "Christi Himmelfahrt";
  if (dateStr === whitMonday) return "Pfingstmontag";

  return "";
}

export function getHolidayInfo(dateStr) {
  const name = holidayNameBerlin(dateStr);
  return {
    isHoliday: name ? 1 : 0,
    holidayName: name || "",
  };
}

/* -------------------- PAYDAY FEATURES -------------------- */

export function getPaydayInfo(dateStr) {
  const dom = dayOfMonth(dateStr);
  const dim = daysInMonth(dateStr);

  // Pragmatic: payroll effects often appear at month start and month end.
  const isPaydayStart = dom >= 1 && dom <= 3 ? 1 : 0;
  const isPaydayEnd = dom >= 25 && dom <= dim ? 1 : 0;

  // Convenience combined flag (for chart marker / simple feature)
  const isPayday = isPaydayStart || isPaydayEnd ? 1 : 0;

  return { isPaydayStart, isPaydayEnd, isPayday };
}

/* -------------------- DATA PREP -------------------- */

export function aggregateRevenueByStoreDay(facts) {
  // store -> Map(date -> revenue)
  const by = new Map();

  for (const f of facts || []) {
    const store = String(f.store ?? "").trim();
    const dt = f.datetime ? new Date(f.datetime) : null;
    if (!store || !dt || Number.isNaN(dt.getTime())) continue;

    const date = ymd(dt);
    const rev = safeNum(f.qty) * safeNum(f.unit_price);

    let m = by.get(store);
    if (!m) {
      m = new Map();
      by.set(store, m);
    }
    m.set(date, (m.get(date) || 0) + rev);
  }

  return by;
}

export function parseEventsCsv(text) {
  // Expected columns: date,store,intensity (optional: event)
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((s) => s.trim());
  const idx = (k) => header.findIndex((h) => h.toLowerCase() === k);

  const iDate = idx("date");
  const iStore = idx("store");
  const iIntensity = idx("intensity");
  const iEvent = idx("event");

  const out = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(",").map((s) => s.trim());
    const date = cols[iDate] || "";
    const store = cols[iStore] || "";
    const intensity = safeNum(cols[iIntensity], 0);
    const event = iEvent >= 0 ? (cols[iEvent] || "") : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!store) continue;

    out.push({ date, store, intensity, event });
  }
  return out;
}

export function eventsToMap(events) {
  // Map(store -> Map(date -> intensity))
  const m = new Map();
  for (const e of events || []) {
    const store = String(e.store ?? "").trim();
    const date = String(e.date ?? "").trim();
    if (!store || !date) continue;

    let dm = m.get(store);
    if (!dm) {
      dm = new Map();
      m.set(store, dm);
    }
    dm.set(date, safeNum(e.intensity, 0));
  }
  return m;
}

/* -------------------- WEATHER (Open-Meteo) -------------------- */

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export async function fetchWeatherDaily({ lat, lon, start, end }) {
  // Returns Map(date -> {tmax, tmean, precip})
  const today = ymd(new Date());
  const startStr = ymd(start);
  const endStr = ymd(end);

  const combined = new Map();

  // Past days: archive API
  if (startStr < today) {
    const archiveEnd = endStr < today ? endStr : addDays(today, -1);
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=${startStr}&end_date=${archiveEnd}` +
      `&daily=temperature_2m_max,temperature_2m_mean,precipitation_sum` +
      `&timezone=Europe%2FBerlin`;

    const j = await fetchJson(url);
    const d = j?.daily;
    if (d?.time?.length) {
      for (let i = 0; i < d.time.length; i++) {
        combined.set(d.time[i], {
          tmax: safeNum(d.temperature_2m_max?.[i], 0),
          tmean: safeNum(d.temperature_2m_mean?.[i], 0),
          precip: safeNum(d.precipitation_sum?.[i], 0),
        });
      }
    }
  }

  // Today+future: forecast API
  if (endStr >= today) {
    const forecastStart = startStr > today ? startStr : today;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=${forecastStart}&end_date=${endStr}` +
      `&daily=temperature_2m_max,temperature_2m_mean,precipitation_sum` +
      `&timezone=Europe%2FBerlin`;

    const j = await fetchJson(url);
    const d = j?.daily;
    if (d?.time?.length) {
      for (let i = 0; i < d.time.length; i++) {
        combined.set(d.time[i], {
          tmax: safeNum(d.temperature_2m_max?.[i], 0),
          tmean: safeNum(d.temperature_2m_mean?.[i], 0),
          precip: safeNum(d.precipitation_sum?.[i], 0),
        });
      }
    }
  }

  return combined;
}

/* -------------------- RIDGE REGRESSION -------------------- */

function transpose(A) {
  const r = A.length,
    c = A[0].length;
  const out = Array.from({ length: c }, () => Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[j][i] = A[i][j];
  return out;
}

function matMul(A, B) {
  const r = A.length,
    k = A[0].length,
    c = B[0].length;
  const out = Array.from({ length: r }, () => Array(c).fill(0));
  for (let i = 0; i < r; i++) {
    for (let t = 0; t < k; t++) {
      const a = A[i][t];
      for (let j = 0; j < c; j++) out[i][j] += a * B[t][j];
    }
  }
  return out;
}

function matVecMul(A, v) {
  const r = A.length,
    c = A[0].length;
  const out = Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}

function solveGaussian(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return Array(n).fill(0);

    [M[col], M[piv]] = [M[piv], M[col]];

    const div = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= div;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }

  return M.map((row) => row[n]);
}

function buildFeatures(date, eventIntensity, weather) {
  // weekday one-hot (Mon..Sat), Sunday baseline
  const d = dow(date);
  const dowDummies = [0, 0, 0, 0, 0, 0]; // Mon..Sat
  if (d >= 1 && d <= 6) dowDummies[d - 1] = 1;

  const weekend = d === 0 || d === 6 ? 1 : 0;

  const { isHoliday } = getHolidayInfo(date);
  const { isPaydayStart, isPaydayEnd } = getPaydayInfo(date);

  const evt = safeNum(eventIntensity, 0);

  // weather optional -> defaults 0
  const tmax = safeNum(weather?.tmax, 0);
  const precip = safeNum(weather?.precip, 0);

  // intercept + dow6 + weekend + holiday + paydayStart + paydayEnd + event + tmax + precip
  return [
    1,
    ...dowDummies,
    weekend,
    isHoliday,
    isPaydayStart,
    isPaydayEnd,
    evt,
    tmax,
    precip,
  ];
}

function trainRidge(X, y, lambda = 12) {
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const p = XtX.length;

  for (let i = 0; i < p; i++) XtX[i][i] += i === 0 ? lambda * 0.1 : lambda;

  const Xty = matVecMul(Xt, y);
  return solveGaussian(XtX, Xty);
}

function predict(beta, x) {
  let s = 0;
  for (let i = 0; i < beta.length; i++) s += beta[i] * x[i];
  return s;
}

function stdev(arr) {
  const a = arr.filter((x) => Number.isFinite(x));
  if (a.length < 2) return 0;
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  const v = a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1);
  return Math.sqrt(v);
}

/* -------------------- FORECAST -------------------- */

export function buildForecastForStore({
  store,
  revenueByDayMap, // Map(date->revenue)
  eventsByStoreMap, // Map(store->Map(date->intensity))
  weatherByDateMap, // Map(date->weather) OR null
  horizon = 14,
}) {
  const revMap = revenueByDayMap || new Map();
  const dates = Array.from(revMap.keys()).sort();
  if (!dates.length) return [];

  const last = dates[dates.length - 1];
  const eventMap = eventsByStoreMap?.get(store) || new Map();

  const X = [];
  const y = [];
  const out = [];

  for (const date of dates) {
    const actual = safeNum(revMap.get(date), 0);
    const evt = safeNum(eventMap.get(date), 0);
    const w = weatherByDateMap?.get(date) || { tmax: 0, precip: 0 };

    const hol = getHolidayInfo(date);
    const pd = getPaydayInfo(date);

    out.push({
      date,
      actual,
      kind: "history",
      eventIntensity: evt,

      // markers/meta
      isHoliday: hol.isHoliday,
      holidayName: hol.holidayName,
      isPayday: pd.isPayday,
      isPaydayStart: pd.isPaydayStart,
      isPaydayEnd: pd.isPaydayEnd,

      // weather (optional)
      tmax: safeNum(w.tmax, 0),
      precip: safeNum(w.precip, 0),
    });

    X.push(buildFeatures(date, evt, w));
    y.push(actual);
  }

  if (X.length < 10) {
    const lastVal = safeNum(revMap.get(last), 0);
    for (let k = 1; k <= horizon; k++) {
      const date = addDays(last, k);
      const hol = getHolidayInfo(date);
      const pd = getPaydayInfo(date);
      out.push({
        date,
        kind: "forecast",
        forecast: lastVal,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        isPayday: pd.isPayday,
        isPaydayStart: pd.isPaydayStart,
        isPaydayEnd: pd.isPaydayEnd,
        eventIntensity: safeNum(eventMap.get(date), 0),
        tmax: 0,
        precip: 0,
      });
    }
    return out;
  }

  const beta = trainRidge(X, y, 12);

  const residuals = [];
  for (let i = 0; i < X.length; i++) {
    const fit = predict(beta, X[i]);
    out[i].fitted = fit;
    residuals.push(y[i] - fit);
  }

  const sigma = stdev(residuals);
  const band = 1.28 * sigma;

  for (let k = 1; k <= horizon; k++) {
    const date = addDays(last, k);
    const evt = safeNum(eventMap.get(date), 0);
    const w = weatherByDateMap?.get(date) || { tmax: 0, precip: 0 };

    const hol = getHolidayInfo(date);
    const pd = getPaydayInfo(date);

    const fc = Math.max(0, predict(beta, buildFeatures(date, evt, w)));

    out.push({
      date,
      kind: "forecast",
      forecast: fc,
      lower: Math.max(0, fc - band),
      upper: fc + band,

      eventIntensity: evt,

      isHoliday: hol.isHoliday,
      holidayName: hol.holidayName,
      isPayday: pd.isPayday,
      isPaydayStart: pd.isPaydayStart,
      isPaydayEnd: pd.isPaydayEnd,

      tmax: safeNum(w.tmax, 0),
      precip: safeNum(w.precip, 0),
    });
  }

  return out;
}

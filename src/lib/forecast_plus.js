// src/lib/forecast_plus.js
// Forecast+ (calendar + store events + optional weather)
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

function isMonthStart(dateStr) {
  const day = Number(dateStr.slice(8, 10));
  return day >= 1 && day <= 3 ? 1 : 0;
}

function safeNum(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
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
  const r = A.length, c = A[0].length;
  const out = Array.from({ length: c }, () => Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[j][i] = A[i][j];
  return out;
}

function matMul(A, B) {
  const r = A.length, k = A[0].length, c = B[0].length;
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
  const r = A.length, c = A[0].length;
  const out = Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}

function solveGaussian(A, b) {
  // Gaussian elimination
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

  const ms = isMonthStart(date);
  const evt = safeNum(eventIntensity, 0);

  // weather optional -> defaults 0
  const tmax = safeNum(weather?.tmax, 0);
  const precip = safeNum(weather?.precip, 0);

  // [intercept, dow6, monthStart, eventIntensity, tmax, precip]
  return [1, ...dowDummies, ms, evt, tmax, precip];
}

function trainRidge(X, y, lambda = 12) {
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const p = XtX.length;

  // ridge penalty (lighter on intercept)
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
  const v =
    a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1);
  return Math.sqrt(v);
}

/* -------------------- FORECAST -------------------- */

export function buildForecastForStore({
  store,
  revenueByDayMap,   // Map(date->revenue)
  eventsByStoreMap,  // Map(store->Map(date->intensity))
  weatherByDateMap,  // Map(date->weather) OR null (optional)
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

  // ✅ Train always: if weatherByDateMap is null -> weather=0 defaults
  for (const date of dates) {
    const actual = safeNum(revMap.get(date), 0);
    const evt = safeNum(eventMap.get(date), 0);
    const w = weatherByDateMap?.get(date) || { tmax: 0, precip: 0 };

    out.push({
      date,
      actual,
      kind: "history",
      eventIntensity: evt,
      tmax: safeNum(w.tmax, 0),
      precip: safeNum(w.precip, 0),
    });

    X.push(buildFeatures(date, evt, w));
    y.push(actual);
  }

  // Too few data -> naive
  if (X.length < 10) {
    const lastVal = safeNum(revMap.get(last), 0);
    for (let k = 1; k <= horizon; k++) {
      out.push({ date: addDays(last, k), forecast: lastVal, kind: "forecast" });
    }
    return out;
  }

  const beta = trainRidge(X, y, 12);

  // fitted + residual band
  const residuals = [];
  for (let i = 0; i < X.length; i++) {
    const fit = predict(beta, X[i]);
    out[i].fitted = fit;
    residuals.push(y[i] - fit);
  }

  const sigma = stdev(residuals);
  const band = 1.28 * sigma; // ~80% band

  for (let k = 1; k <= horizon; k++) {
    const date = addDays(last, k);
    const evt = safeNum(eventMap.get(date), 0);
    const w = weatherByDateMap?.get(date) || { tmax: 0, precip: 0 };

    const fc = Math.max(0, predict(beta, buildFeatures(date, evt, w)));

    out.push({
      date,
      kind: "forecast",
      forecast: fc,
      lower: Math.max(0, fc - band),
      upper: fc + band,
      eventIntensity: evt,
      tmax: safeNum(w.tmax, 0),
      precip: safeNum(w.precip, 0),
    });
  }

  return out;
}

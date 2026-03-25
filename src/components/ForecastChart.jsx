import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";
import { revenueByDay } from "../lib/metrics";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(x) || 0);
}

function safeDateLabel(value) {
  if (value == null) return "";
  const str = String(value);
  return str.length >= 10 ? str.slice(5, 10) : str;
}

function addDays(dateStr, k) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + k);
  return d.toISOString().slice(0, 10);
}

function dow(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getDay();
}

/**
 * Forecast = Trend + weekly seasonality
 * - Trend via linear regression
 * - Weekly pattern via weekday average
 */
function forecastTrendWeekly(
  hist,
  horizon = 14,
  trendWindow = 21,
  weeklyWindow = 28
) {
  if (!hist?.length) return [];

  const data = hist
    .map((d) => ({
      date: d?.date,
      y: Number(d?.revenue ?? d?.total ?? d?.value ?? 0),
    }))
    .filter((r) => r.date && Number.isFinite(r.y))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!data.length) return [];

  const lastDate = data[data.length - 1].date;

  // Weekly pattern
  const ww = data.slice(Math.max(0, data.length - weeklyWindow));
  const sum = Array(7).fill(0);
  const cnt = Array(7).fill(0);

  for (const r of ww) {
    const k = dow(r.date);
    sum[k] += r.y;
    cnt[k] += 1;
  }

  const wavg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : null));
  const overallMean =
    ww.reduce((s, r) => s + r.y, 0) / Math.max(1, ww.length);

  for (let i = 0; i < 7; i++) {
    if (wavg[i] == null) wavg[i] = overallMean;
  }

  const patternMean = wavg.reduce((s, v) => s + v, 0) / 7;
  const delta = wavg.map((v) => v - patternMean);

  // Linear regression trend
  const tw = data.slice(Math.max(0, data.length - trendWindow));
  const n = tw.length;

  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = tw[i].y;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }

  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = n !== 0 ? (sy - slope * sx) / n : 0;

  const baseIndex = n;
  const out = [];

  for (let i = 1; i <= horizon; i++) {
    const date = addDays(lastDate, i);
    const wd = dow(date);

    const trend = intercept + slope * (baseIndex + (i - 1));
    const seasonal = delta[wd];
    const forecast = Math.max(0, trend + seasonal);

    out.push({ date, forecast });
  }

  return out;
}

export default function ForecastChart({ facts, fullscreen = false }) {
  const hist = useMemo(() => revenueByDay(facts), [facts]);
  const fc = useMemo(() => forecastTrendWeekly(hist, 14, 21, 28), [hist]);

  const merged = useMemo(() => {
    const m = new Map();

    for (const r of hist || []) {
      const actual = Number(r?.revenue ?? r?.total ?? r?.value ?? 0);
      if (!r?.date) continue;
      m.set(r.date, { date: r.date, actual });
    }

    for (const r of fc || []) {
      if (!r?.date) continue;
      m.set(r.date, {
        ...(m.get(r.date) || { date: r.date }),
        forecast: Number(r?.forecast || 0),
      });
    }

    return Array.from(m.values())
      .filter((r) => r && r.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [hist, fc]);

  if (!facts?.length) {
    return (
      <div className="chartWrap">
        <div className="card chartCard">
          <div className="label">Forecast</div>
          <div className="tinyHint">Bitte erst Daten hochladen.</div>
        </div>
      </div>
    );
  }

  if (!hist?.length) {
    return (
      <div className="chartWrap">
        <div className="card chartCard">
          <div className="label">Forecast</div>
          <div className="error">
            Keine Tagesumsätze berechnet. Prüfe <b>datetime</b> / Parsing in
            revenueByDay().
          </div>
        </div>
      </div>
    );
  }

  if (!merged.length) {
    return (
      <div className="chartWrap">
        <div className="card chartCard">
          <div className="label">Forecast</div>
          <div className="tinyHint">Keine Forecast-Daten verfügbar.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">
          Forecast (Trend + Wochenmuster) {fullscreen ? "(Zoom)" : ""}
        </div>

        <div className={`chartArea ${fullscreen ? "chartAreaFullscreen" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={merged}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="date"
                tickFormatter={safeDateLabel}
                interval="preserveStartEnd"
                tick={{ fontSize: fullscreen ? 12 : 10 }}
                minTickGap={20}
              />

              <YAxis
                tickFormatter={(v) => `${Math.round(Number(v) || 0)}`}
                width={fullscreen ? 60 : 52}
              />

              <Tooltip
                formatter={(v, name) => {
                  const val = Number(v) || 0;
                  if (name === "actual") return [fmtEUR(val), "Ist"];
                  if (name === "forecast") return [fmtEUR(val), "Forecast"];
                  return [val, name];
                }}
                labelFormatter={(label) => `Datum: ${String(label ?? "")}`}
              />

              <Line
                type="monotone"
                dataKey="actual"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="forecast"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />

              {merged.length > 2 && (
                <Brush
                  dataKey="date"
                  height={28}
                  travellerWidth={10}
                  tickFormatter={safeDateLabel}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="tinyHint">
          Kombi aus Trend (letzte 21 Tage) + Wochenmuster (letzte 28 Tage).
          Unten den Bereich ziehen = Zoom.
        </div>
      </div>
    </div>
  );
}
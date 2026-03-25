import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Scatter,
  Brush,
} from "recharts";

import {
  aggregateRevenueByStoreDay,
  parseEventsCsv,
  eventsToMap,
  fetchWeatherDaily,
  buildForecastForStore,
} from "../lib/forecast_plus";

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

// Optional: echte Koordinaten nachpflegen
const STORE_COORDS = {
  "Kurfürstendamm 71": { lat: 52.5032, lon: 13.3286 },
  "Potsdamerstr.129": { lat: 52.5096, lon: 13.376 },
  "Schlesische Str. 18": { lat: 52.5009, lon: 13.4447 },
  "Bornholmer Str. 93": { lat: 52.559, lon: 13.401 },
  "Frankfurter Allee 255": { lat: 52.5147, lon: 13.475 },
  "Nonnendammallee.84": { lat: 52.5389, lon: 13.28 },
};

const BERLIN_FALLBACK = { lat: 52.52, lon: 13.405 };

function markerY(row) {
  if (Number.isFinite(Number(row?.actual))) return Number(row.actual);
  if (Number.isFinite(Number(row?.forecast))) return Number(row.forecast);
  if (Number.isFinite(Number(row?.fitted))) return Number(row.fitted);
  return null;
}

export default function ForecastPlus({ facts, fullscreen = false }) {
  const revenueByStoreDay = useMemo(
    () => aggregateRevenueByStoreDay(facts),
    [facts]
  );

  const stores = useMemo(
    () => Array.from(revenueByStoreDay.keys()).sort(),
    [revenueByStoreDay]
  );

  const [store, setStore] = useState("ALL");
  const [horizon, setHorizon] = useState(14);
  const [useWeather, setUseWeather] = useState(false);

  const [events, setEvents] = useState([]);
  const eventsMap = useMemo(() => eventsToMap(events), [events]);

  const [weatherCache, setWeatherCache] = useState(new Map());
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const dateRange = useMemo(() => {
    let min = null;
    let max = null;

    for (const m of revenueByStoreDay.values()) {
      const ds = Array.from(m.keys()).sort();
      if (!ds.length) continue;
      if (!min || ds[0] < min) min = ds[0];
      if (!max || ds[ds.length - 1] > max) max = ds[ds.length - 1];
    }

    return { min, max };
  }, [revenueByStoreDay]);

  async function onEventsUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setEvents(parseEventsCsv(text));
  }

  async function loadWeather() {
    setWeatherError("");

    if (!dateRange.min || !dateRange.max) {
      setWeatherError(
        "Keine Datumsrange gefunden (prüfe datetime in deiner Datei)."
      );
      return;
    }

    if (!stores.length) return;

    setLoadingWeather(true);

    try {
      const endPlus = new Date(`${dateRange.max}T00:00:00`);
      endPlus.setDate(endPlus.getDate() + Number(horizon || 14));
      const endWithHorizon = endPlus.toISOString().slice(0, 10);

      const next = new Map(weatherCache);

      for (const s of stores) {
        const coords = STORE_COORDS[s] || BERLIN_FALLBACK;
        const wx = await fetchWeatherDaily({
          lat: coords.lat,
          lon: coords.lon,
          start: dateRange.min,
          end: endWithHorizon,
        });
        next.set(s, wx);
      }

      setWeatherCache(next);
    } catch (err) {
      setWeatherError(
        String(err?.message || "Wetterdaten konnten nicht geladen werden.")
      );
    } finally {
      setLoadingWeather(false);
    }
  }

  const hasWeatherForCurrent = useMemo(() => {
    if (!useWeather) return false;
    if (!stores.length) return false;
    if (store === "ALL") return weatherCache.has(stores[0]);
    return weatherCache.has(store);
  }, [useWeather, store, stores, weatherCache]);

  const chartData = useMemo(() => {
    if (!stores.length) return [];

    const wxFor = (s) => (useWeather ? weatherCache.get(s) || null : null);

    if (store === "ALL") {
      const sumMap = new Map();

      for (const s of stores) {
        const m = revenueByStoreDay.get(s);
        if (!m) continue;
        for (const [d, rev] of m.entries()) {
          sumMap.set(d, (sumMap.get(d) || 0) + rev);
        }
      }

      const wx = wxFor(stores[0]);

      return buildForecastForStore({
        store: stores[0],
        revenueByDayMap: sumMap,
        eventsByStoreMap: eventsMap,
        weatherByDateMap: wx,
        horizon: Number(horizon || 14),
      });
    }

    const revMap = revenueByStoreDay.get(store) || new Map();
    const wx = wxFor(store);

    return buildForecastForStore({
      store,
      revenueByDayMap: revMap,
      eventsByStoreMap: eventsMap,
      weatherByDateMap: wx,
      horizon: Number(horizon || 14),
    });
  }, [
    store,
    stores,
    revenueByStoreDay,
    eventsMap,
    weatherCache,
    horizon,
    useWeather,
  ]);

  const safeChartData = useMemo(() => {
    return Array.isArray(chartData)
      ? chartData.filter((r) => r && r.date)
      : [];
  }, [chartData]);

  const holidayPoints = useMemo(
    () =>
      safeChartData
        .filter((r) => r.isHoliday)
        .map((r) => ({
          date: r.date,
          y: markerY(r),
          name: r.holidayName || "Feiertag",
        }))
        .filter((r) => r.y != null),
    [safeChartData]
  );

  const paydayPoints = useMemo(
    () =>
      safeChartData
        .filter((r) => r.isPayday)
        .map((r) => ({
          date: r.date,
          y: markerY(r),
          name: r.isPaydayStart ? "Payday (Start)" : "Payday (Ende)",
        }))
        .filter((r) => r.y != null),
    [safeChartData]
  );

  const eventPoints = useMemo(
    () =>
      safeChartData
        .filter((r) => (r.eventIntensity || 0) > 0)
        .map((r) => ({
          date: r.date,
          y: markerY(r),
          name: `Event (Intensität ${r.eventIntensity})`,
        }))
        .filter((r) => r.y != null),
    [safeChartData]
  );

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">
          Forecast+ (Kalender + Payday + Feiertage + Events
          {useWeather ? " + Wetter" : ""}) {fullscreen ? "(Zoom)" : ""}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "end",
            marginBottom: 8,
          }}
        >
          <div className="field">
            <div className="label">Store</div>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              disabled={!stores.length}
            >
              <option value="ALL">Alle (Summe)</option>
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="label">Horizon (Tage)</div>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={21}>21</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Events CSV</div>
            <input type="file" accept=".csv" onChange={onEventsUpload} />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 6,
            }}
          >
            <input
              type="checkbox"
              checked={useWeather}
              onChange={(e) => setUseWeather(e.target.checked)}
            />
            <span className="label" style={{ margin: 0 }}>
              Wetter berücksichtigen
            </span>
          </label>

          <button
            className="btn"
            type="button"
            onClick={loadWeather}
            disabled={!useWeather || loadingWeather || !stores.length}
            title={
              !useWeather
                ? "Aktiviere erst 'Wetter berücksichtigen'"
                : "Wetterdaten laden"
            }
          >
            {loadingWeather ? "Wetter lädt..." : "Wetter laden"}
          </button>

          <div className="tinyHint" style={{ marginLeft: "auto" }}>
            {useWeather
              ? hasWeatherForCurrent
                ? "✅ Wetter geladen"
                : "⚠️ Wetter an, aber noch nicht geladen"
              : "ℹ️ Wetter aus"}
            {events.length ? ` • Events: ${events.length}` : ""}
          </div>
        </div>

        {weatherError ? <div className="error">{weatherError}</div> : null}

        {!safeChartData.length ? (
          <div className="tinyHint">Keine Forecast+-Daten verfügbar.</div>
        ) : (
          <div className={`chartArea ${fullscreen ? "chartAreaFullscreen" : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={safeChartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
  dataKey="date"
  tickFormatter={safeDateLabel}
  interval="preserveStartEnd"
  tick={{ fontSize: fullscreen ? 12 : 10 }}
  minTickGap={28}
  angle={-25}
  textAnchor="end"
  height={55}
/>

                <YAxis
                  tickFormatter={(v) => `${Math.round(Number(v) || 0)}`}
                  width={fullscreen ? 60 : 52}
                />

                <Tooltip
                  formatter={(v, name, item) => {
                    const val = Number(v) || 0;
                    const p = item?.payload;

                    if (name === "actual") return [fmtEUR(val), "Ist"];
                    if (name === "fitted") return [fmtEUR(val), "Fit"];
                    if (name === "forecast") return [fmtEUR(val), "Forecast"];
                    if (name === "upper") return [fmtEUR(val), "Band oben"];
                    if (name === "lower") return [fmtEUR(val), "Band unten"];

                    if (name === "y" && p?.name) return [p.name, "Marker"];

                    return [val, name];
                  }}
                  labelFormatter={(label) => `Datum: ${String(label ?? "")}`}
                />

                <Area
                  type="monotone"
                  dataKey="upper"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  dot={false}
                  isAnimationActive={false}
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
                  dataKey="fitted"
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

                <Scatter data={holidayPoints} dataKey="y" name="Feiertag" />
                <Scatter data={paydayPoints} dataKey="y" name="Payday" />
                <Scatter data={eventPoints} dataKey="y" name="Event" />

                {safeChartData.length > 2 && (
                  <Brush
                    dataKey="date"
                    height={28}
                    travellerWidth={10}
                    tickFormatter={safeDateLabel}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="tinyHint">
          Unten den Bereich ziehen = Zoom. Marker: Feiertag / Payday / Event.
        </div>
      </div>
    </div>
  );
}
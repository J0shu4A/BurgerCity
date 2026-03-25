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

export default function RevenueChart({ data = [], fullscreen = false }) {
  const safeData = Array.isArray(data)
    ? data.filter((r) => r && r.date != null && Number.isFinite(Number(r.revenue)))
    : [];

  if (!safeData.length) {
    return (
      <div className="chartWrap">
        <div className="card chartCard">
          <div className="label">Umsatz pro Tag</div>
          <div className="tinyHint">Keine Daten verfügbar.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">
          Umsatz pro Tag {fullscreen ? "(Fullscreen)" : ""}
        </div>

        <div className={`chartArea ${fullscreen ? "chartAreaFullscreen" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={safeData}
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
                width={fullscreen ? 60 : 40}
              />

              <Tooltip
                labelFormatter={(label) => `Datum: ${String(label ?? "")}`}
                formatter={(v) => fmtEUR(v)}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                dot={false}
                isAnimationActive={false}
              />

              {safeData.length > 2 && (
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
      </div>
    </div>
  );
}
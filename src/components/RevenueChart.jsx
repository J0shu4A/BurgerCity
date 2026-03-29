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
              // left: 15 gibt dem Chart links ein wenig mehr Luft zum Atmen
              margin={{ top: 8, right: 12, left: 15, bottom: 8 }}
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
                // Die Breite für die Zahlen wurde von 40/60 auf 65/80 erhöht!
                width={fullscreen ? 80 : 65}
                tick={{ fontSize: 12, fill: "#8b949e" }}
              />

              <Tooltip
                labelFormatter={(label) => `Datum: ${String(label ?? "")}`}
                formatter={(v) => fmtEUR(v)}
                contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", color: "#c9d1d9" }}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                dot={false}
                isAnimationActive={false}
                stroke="#58a6ff" // Macht die Linie passend zum Dark-Mode schön blau
                strokeWidth={2}
              />

              {safeData.length > 2 && (
                <Brush
                  dataKey="date"
                  height={28}
                  travellerWidth={10}
                  tickFormatter={safeDateLabel}
                  stroke="#30363d"
                  fill="#0d1117"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
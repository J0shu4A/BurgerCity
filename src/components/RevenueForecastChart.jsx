import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

export default function RevenueForecastChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Umsatzprognose (Tagesumsatz) – nächste 14 Tage</div>

        <div className="chartArea">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide={data.length > 24} />
              <YAxis tickFormatter={(v) => `${Math.round(v)}`} width={46} />
              <Tooltip
                formatter={(v, name) => {
                  if (name === "actual") return [fmtEUR(v), "Ist"];
                  if (name === "forecast") return [fmtEUR(v), "Forecast"];
                  if (name === "upper") return [fmtEUR(v), "Oberes Band"];
                  if (name === "lower") return [fmtEUR(v), "Unteres Band"];
                  return [v, name];
                }}
              />

              {/* Confidence band */}
              <Area type="monotone" dataKey="upper" dot={false} />
              <Area type="monotone" dataKey="lower" dot={false} />

              {/* Lines */}
              <Line type="monotone" dataKey="actual" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="tinyHint">
          Modell: Wochentags-Saison + exponentielle Glättung (browserbasiert).
        </div>
      </div>
    </div>
  );
}

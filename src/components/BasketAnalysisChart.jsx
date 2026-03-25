import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

function fmtPct(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

export default function BasketAnalysisChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Warenkorb: Ø Warenkorbwert (AOV) & Bundle-Quote pro Stunde</div>

        <div className="chartArea">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${Math.round(v)}`}
                width={46}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => fmtPct(v)}
                width={46}
              />
              <Tooltip
                formatter={(v, name) => {
                  if (name === "aov") return [fmtEUR(v), "AOV"];
                  if (name === "bundleRate") return [fmtPct(v), "Bundle-Quote"];
                  if (name === "orders") return [v, "Orders"];
                  return [v, name];
                }}
                labelFormatter={(h) => `${h}:00`}
              />
              <Bar yAxisId="left" dataKey="aov" name="aov" />
              <Line yAxisId="right" type="monotone" dataKey="bundleRate" name="bundleRate" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

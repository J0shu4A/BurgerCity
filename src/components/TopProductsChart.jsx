import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtEUR(x) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(x || 0);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "rgba(20,24,32,0.95)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 10,
        padding: "8px 12px",
        color: "#fff",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>Umsatz: {fmtEUR(payload[0].value)}</div>
    </div>
  );
}

export default function TopProductsChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Top-10 Produkte nach Umsatz</div>

        <div className="chartArea">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${Math.round(v)}`} />
              <YAxis
                type="category"
                dataKey="product"
                width={200}
                interval={0}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.85)" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="revenue" name="Umsatz" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

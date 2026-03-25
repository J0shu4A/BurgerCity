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
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(x || 0);
}

export default function BundlesChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Top Bundles (Cross-Selling) – nach Häufigkeit</div>

        <div className="chartArea">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="bundle" width={170} />
              <Tooltip formatter={(v, name) => (name === "revenue" ? fmtEUR(v) : v)} />
              <Bar dataKey="count" name="Häufigkeit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tinyHint">Umsatzhebel: Bundle als „1-Klick-Upgrade“ im Checkout anbieten → AOV steigt.</div>
      </div>
    </div>
  );
}

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

export default function HourRevenueChart({ data }) {
  return (
    <div className="chartWrap">
      <div className="card chartCard">
        <div className="label">Umsatz nach Uhrzeit</div>
        <div className="chartArea">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis width={40} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip formatter={(v) => fmtEUR(v)} />
              <Bar dataKey="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import React from "react";
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
    maximumFractionDigits: 0,
  }).format(x || 0);
}

export default function YearRevenueChart({ data = [] }) {
  if (!data?.length) {
    return (
      <div className="card">
        <h3>Jahresumsätze</h3>
        <div className="muted">Keine Jahresdaten verfügbar.</div>
      </div>
    );
  }

  return (
    <div className="card chartCard">
      <div className="chartHead">
        <h3 style={{ margin: 0 }}>Jahresumsätze</h3>
        <div className="tinyHint">Summe Umsatz je Jahr</div>
      </div>

      <div className="chartArea">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtEUR} />
            <Tooltip formatter={(v) => fmtEUR(v)} />
            <Bar dataKey="revenue" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

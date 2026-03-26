import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend // <-- 1. NEU: Legend importiert
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
        <h3>Jahresumsätze & Gewinn</h3>
        <div className="muted">Keine Jahresdaten verfügbar.</div>
      </div>
    );
  }

  return (
    <div className="card chartCard">
      <div className="chartHead">
        <h3 style={{ margin: 0 }}>Jahresumsätze & Gewinn</h3>
        <div className="tinyHint">Summe Umsatz und Gewinn je Jahr</div>
      </div>

      <div className="chartArea">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtEUR} />
            <Tooltip formatter={(v) => fmtEUR(v)} cursor={{ fill: 'transparent' }} />
            
            {/* 2. NEU: Legende anzeigen */}
            <Legend verticalAlign="top" height={36} />
            
            {/* 3. ANGEPASST: Umsatz bekommt Farbe (z.B. Blau) und einen Namen */}
            <Bar dataKey="revenue" name="Umsatz" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            
            {/* 4. NEU: Zweiter Balken für den Gewinn (Grün) */}
            <Bar dataKey="profit" name="Gewinn" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
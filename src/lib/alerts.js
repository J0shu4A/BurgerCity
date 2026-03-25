import { sum } from "./analytics";

function dateToTs(d) {
  return new Date(d + "T00:00:00").getTime();
}

// dailyRows: [{date, revenue, location?}, ...] — sortiert aufsteigend wäre gut
export function buildAlerts(dailyRows, options = {}) {
  const {
    forecastByDate = null,          // optional: Map { "YYYY-MM-DD": number }
    dropThreshold = -0.2,           // -20% unter Forecast
    minDailyRevenue = 500,          // Mindestumsatz pro Tag (Beispiel)
    anomalyWindowDays = 14,         // Vergleichsfenster
    anomalyZ = 2.5,                 // simple z-score Schwelle
    byLocation = false,             // true: Alerts pro Standort
  } = options;

  if (!dailyRows?.length) return [];

  const rows = dailyRows.slice().sort((a, b) => dateToTs(a.date) - dateToTs(b.date));
  const latest = rows[rows.length - 1];

  const scopeGroups = byLocation
    ? Object.groupBy(rows, (r) => r.location || "Unbekannt")
    : { Gesamt: rows };

  const alerts = [];

  for (const [scope, grp] of Object.entries(scopeGroups)) {
    if (!grp?.length) continue;
    const last = grp[grp.length - 1];

    // A) Unter Forecast
    if (forecastByDate && forecastByDate[last.date] != null) {
      const fc = Number(forecastByDate[last.date]) || 0;
      const actual = Number(last.revenue) || 0;
      if (fc > 0) {
        const diff = (actual - fc) / fc;
        if (diff <= dropThreshold) {
          alerts.push({
            severity: "high",
            code: "UNDER_FORECAST",
            scope,
            date: last.date,
            title: "Umsatz deutlich unter Forecast",
            message: `Am ${last.date} liegt der Umsatz ${Math.round(diff * 100)}% unter dem Forecast.`,
            meta: { actual, forecast: fc, diff },
          });
        }
      }
    }

    // B) Unter Mindestumsatz
    if ((Number(last.revenue) || 0) < minDailyRevenue) {
      alerts.push({
        severity: "medium",
        code: "UNDER_MIN",
        scope,
        date: last.date,
        title: "Umsatz unter Mindestwert",
        message: `Am ${last.date} wurde der Mindestumsatz (${minDailyRevenue} €) unterschritten.`,
        meta: { actual: Number(last.revenue) || 0, minDailyRevenue },
      });
    }

    // C) Anomalie (z-score auf letztem Tag vs. letzte N Tage)
    const n = Math.min(anomalyWindowDays, grp.length - 1);
    if (n >= 7) {
      const hist = grp.slice(grp.length - 1 - n, grp.length - 1).map((r) => Number(r.revenue) || 0);
      const mean = sum(hist) / hist.length;
      const variance = sum(hist, (x) => (x - mean) * (x - mean)) / hist.length;
      const sd = Math.sqrt(variance) || 0;

      if (sd > 0) {
        const z = ((Number(last.revenue) || 0) - mean) / sd;
        if (Math.abs(z) >= anomalyZ) {
          alerts.push({
            severity: Math.abs(z) >= anomalyZ + 1 ? "high" : "low",
            code: "ANOMALY",
            scope,
            date: last.date,
            title: "Auffällige Abweichung",
            message: `Am ${last.date} weicht der Umsatz stark vom letzten ${n}-Tage-Niveau ab (z≈${z.toFixed(1)}).`,
            meta: { z, mean, sd, actual: Number(last.revenue) || 0 },
          });
        }
      }
    }
  }

  // Sort: high -> medium -> low, neueste zuerst
  const sevRank = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => {
    const s = (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9);
    if (s !== 0) return s;
    return dateToTs(b.date) - dateToTs(a.date);
  });
}

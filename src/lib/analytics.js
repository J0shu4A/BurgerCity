// src/lib/analytics.js

export function yearOf(dateStr) {
  // erwartet "YYYY-MM-DD"
  return Number(dateStr?.slice(0, 4));
}

export function sum(arr, fn = (x) => x) {
  return (arr || []).reduce((acc, x) => acc + (Number(fn(x)) || 0), 0);
}

export function groupBy(arr, keyFn) {
  return (arr || []).reduce((m, x) => {
    const k = keyFn(x);
    if (!m[k]) m[k] = [];
    m[k].push(x);
    return m;
  }, {});
}

// Erwartet dailyRows: [{ date:"2026-02-15", revenue: 123.45, location?: "..." }, ...]
export function revenueByYear(dailyRows) {
  const g = groupBy(dailyRows, (r) => yearOf(r.date));
  const years = Object.keys(g).map(Number).sort((a, b) => a - b);

  return years.map((y) => ({
    year: y,
    revenue: sum(g[y], (r) => r.revenue),
  }));
}

export function ytdRevenue(dailyRows, refDateStr = null) {
  if (!dailyRows?.length) return 0;
  const ref = refDateStr ? new Date(refDateStr + "T00:00:00") : new Date(dailyRows[dailyRows.length - 1].date + "T00:00:00");
  const y = ref.getFullYear();
  return sum(dailyRows.filter((r) => yearOf(r.date) === y), (r) => r.revenue);
}

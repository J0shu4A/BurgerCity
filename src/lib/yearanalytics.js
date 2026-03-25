// src/lib/yearAnalytics.js

function yearOf(dateStr) {
  return Number(dateStr?.slice(0, 4));
}

function sum(arr, fn = (x) => x) {
  return (arr || []).reduce((acc, x) => acc + (Number(fn(x)) || 0), 0);
}

function groupBy(arr, keyFn) {
  return (arr || []).reduce((map, item) => {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

export function revenueByYear(dailyRows) {
  const grouped = groupBy(dailyRows, (r) => yearOf(r.date));
  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return years.map((year) => ({
    year,
    revenue: sum(grouped[year], (r) => r.revenue),
  }));
}

export function ytdRevenue(dailyRows) {
  if (!dailyRows?.length) return 0;

  const latestDate = dailyRows[dailyRows.length - 1].date;
  const currentYear = yearOf(latestDate);

  return sum(
    dailyRows.filter((r) => yearOf(r.date) === currentYear),
    (r) => r.revenue
  );
}

function pct(a, b) {
  if (!b) return null;
  return (a - b) / b;
}

export function computeYearKpis(dailyRows) {
  const yearlySeries = revenueByYear(dailyRows);

  const last = yearlySeries[yearlySeries.length - 1];
  const prev = yearlySeries[yearlySeries.length - 2];

  return {
    yearlySeries,
    yearRevenue: last?.revenue ?? 0,
    ytdRevenue: ytdRevenue(dailyRows),
    lastYearRevenue: prev?.revenue ?? 0,
    yoy: last && prev ? pct(last.revenue, prev.revenue) : null,
  };
}

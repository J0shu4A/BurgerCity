function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function priorityWeight(priority) {
  if (priority === "Hoch") return 3;
  if (priority === "Mittel") return 2;
  return 1;
}

export function buildStoreLocationBase(facts) {
  const byStore = new Map();

  for (const f of facts || []) {
    const store = String(f.store || "").trim();
    if (!store) continue;

    if (!byStore.has(store)) {
      byStore.set(store, {
        store,
        district: String(f.district || "").trim(),
        postal_code: String(f.postal_code || "").trim(),
        revenue: 0,
        orders: new Set(),
      });
    }

    const row = byStore.get(store);
    row.revenue += safeNum(f.revenue != null ? f.revenue : safeNum(f.qty) * safeNum(f.unit_price));
    if (f.order_id) row.orders.add(f.order_id);
  }

  return Array.from(byStore.values()).map((r) => {
    const orderCount = r.orders.size;
    const aov = orderCount ? r.revenue / orderCount : 0;

    return {
      store: r.store,
      district: r.district,
      postal_code: r.postal_code,
      revenue: Number(r.revenue.toFixed(2)),
      orderCount,
      aov: Number(aov.toFixed(2)),
    };
  });
}

export function mergeLocationIntelWithStoreMetrics(storeMetrics, intelRows) {
  const intelMap = new Map(
    (intelRows || []).map((r) => [String(r.store || "").trim(), r])
  );

  return (storeMetrics || []).map((s) => {
    const intel = intelMap.get(String(s.store || "").trim());

    return {
      ...s,
      fastFoodCompetitors: intel?.fastFoodCompetitors || 0,
      restaurantCompetitors: intel?.restaurantCompetitors || 0,
      totalCompetitors: intel?.totalCompetitors || 0,
      lat: intel?.lat ?? null,
      lon: intel?.lon ?? null,
      geocodedFrom: intel?.geocodedFrom || "",
      geoError: intel?.error || "",
    };
  });
}

export function locationInsights(rows) {
  if (!rows?.length) return [];

  const result = [];

  const sortedRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
  const sortedAov = [...rows].sort((a, b) => b.aov - a.aov);

  const bestRevenue = sortedRevenue[0]?.revenue || 1;
  const avgCompetitors =
    rows.reduce((sum, r) => sum + safeNum(r.totalCompetitors), 0) / rows.length;

  for (const r of rows) {
    if (r.geoError) {
      result.push({
        type: "warning",
        category: "Geo Marketing",
        priority: "Mittel",
        title: `Standortdaten unvollständig für ${r.store}`,
        text: `Für ${r.store} konnte die Umgebung nicht eindeutig bestimmt werden.`,
        recommendation:
          "Adresse oder genaue Koordinaten für diese Filiale ergänzen.",
      });
      continue;
    }

    if (r.totalCompetitors >= Math.max(12, avgCompetitors * 1.4) && r.aov >= sortedAov[0]?.aov * 0.9) {
      result.push({
        type: "success",
        category: "Geo Marketing",
        priority: "Mittel",
        title: `${r.store} performt trotz hoher Konkurrenz stark`,
        text: `${r.store} hat ${r.totalCompetitors} relevante Wettbewerber im Umfeld und erzielt trotzdem einen hohen AOV von ${r.aov.toFixed(2)} €.`,
        recommendation:
          "Diesen Standort als Benchmark für Preislogik, Sortiment und Kampagnen nutzen.",
      });
    }

    if (r.totalCompetitors <= 5 && r.revenue < bestRevenue * 0.55) {
      result.push({
        type: "warning",
        category: "Geo Marketing",
        priority: "Hoch",
        title: `${r.store} unterperformt trotz geringer Konkurrenz`,
        text: `${r.store} hat nur ${r.totalCompetitors} Wettbewerber im Umfeld, bleibt aber klar unter den Top-Standorten beim Umsatz.`,
        recommendation:
          "Lokale Sichtbarkeit, Promotions und Produktmix prüfen.",
      });
    }

    if (r.fastFoodCompetitors >= 8) {
      result.push({
        type: "opportunity",
        category: "Sales",
        priority: "Mittel",
        title: `${r.store} in starkem Fast-Food-Wettbewerb`,
        text: `Im direkten Umfeld liegen ${r.fastFoodCompetitors} Fast-Food-Wettbewerber.`,
        recommendation:
          "Bundles, Signature-Produkte und klare Preisanker stärker kommunizieren.",
      });
    }

    if (r.restaurantCompetitors >= 10 && r.aov < sortedAov[0]?.aov * 0.75) {
      result.push({
        type: "info",
        category: "Marketing",
        priority: "Niedrig",
        title: `${r.store} hat Potenzial für Premium-Upsell`,
        text: `Viele Restaurant-Alternativen im Umfeld deuten auf kaufbereite Nachfrage hin, der AOV ist aber noch ausbaufähig.`,
        recommendation:
          "Premium-Add-ons, Menüs und gezielte Upsell-Botschaften testen.",
      });
    }
  }

  return result
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 8);
}
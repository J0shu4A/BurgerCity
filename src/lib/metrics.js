import { formatYMD } from "./parse";

/* =========================================
   Helper
========================================= */

function revenueOf(f) {
  return (Number(f.qty) || 0) * (Number(f.unit_price) || 0);
}

function toDateObj(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hourKey(dt) {
  return String(dt.getHours()).padStart(2, "0");
}

function isBundleOrder(lines) {
  const set = new Set();
  for (const l of lines) {
    set.add(String(l.product ?? "").trim());
  }
  return set.size >= 2;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function priorityWeight(priority) {
  if (priority === "Hoch") return 3;
  if (priority === "Mittel") return 2;
  return 1;
}

/* =========================================
   Basic Helpers
========================================= */

export function uniqueStores(facts) {
  return Array.from(new Set(facts.map((f) => f.store).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function uniqueDates(facts) {
  const ds = facts
    .map((f) => (f.datetime ? formatYMD(f.datetime) : null))
    .filter(Boolean);

  return Array.from(new Set(ds)).sort((a, b) => (a > b ? 1 : -1));
}

export function filterFacts(facts, { store, fromDate, toDate }) {
  let out = facts || [];

  if (store && store !== "ALL") {
    out = out.filter((f) => f.store === store);
  }

  if (fromDate) {
    out = out.filter((f) => f.datetime && formatYMD(f.datetime) >= fromDate);
  }

  if (toDate) {
    out = out.filter((f) => f.datetime && formatYMD(f.datetime) <= toDate);
  }

  return out;
}

/* =========================================
   KPI
========================================= */

export function computeKpis(facts) {
  const totalRevenue = (facts || []).reduce((s, f) => s + revenueOf(f), 0);
  const orderCount = new Set((facts || []).map((f) => f.order_id).filter(Boolean)).size;
  const aov = orderCount ? totalRevenue / orderCount : 0;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    orderCount,
    aov: Number(aov.toFixed(2)),
  };
}

/* =========================================
   Charts
========================================= */

export function revenueByDay(facts) {
  const m = new Map();

  for (const f of facts || []) {
    if (!f.datetime) continue;

    const d = formatYMD(f.datetime);
    m.set(d, (m.get(d) || 0) + revenueOf(f));
  }

  return Array.from(m.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
    }));
}

export function revenueByHour(facts) {
  const m = new Map();

  for (const f of facts || []) {
    const dt = toDateObj(f.datetime);
    if (!dt) continue;

    const hh = hourKey(dt);
    m.set(hh, (m.get(hh) || 0) + revenueOf(f));
  }

  return Array.from({ length: 24 }, (_, i) => {
    const hh = String(i).padStart(2, "0");
    return {
      hour: hh,
      revenue: Number((m.get(hh) || 0).toFixed(2)),
    };
  });
}

export function topProductsByRevenue(facts, limit = 10) {
  const m = new Map();

  for (const f of facts || []) {
    const p = f.product || "Unbekannt";
    m.set(p, (m.get(p) || 0) + revenueOf(f));
  }

  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([product, revenue]) => ({
      product,
      revenue: Number(revenue.toFixed(2)),
    }));
}

export function storeRanking(facts) {
  const byStore = new Map();

  for (const f of facts || []) {
    const s = f.store || "Unbekannt";

    if (!byStore.has(s)) {
      byStore.set(s, { revenue: 0, orders: new Set() });
    }

    const d = byStore.get(s);
    d.revenue += revenueOf(f);
    if (f.order_id) d.orders.add(f.order_id);
  }

  return Array.from(byStore.entries())
    .map(([store, d]) => {
      const orderCount = d.orders.size;
      const aov = orderCount ? d.revenue / orderCount : 0;

      return {
        store,
        revenue: Number(d.revenue.toFixed(2)),
        orderCount,
        aov: Number(aov.toFixed(2)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function topBundles(facts, limit = 10) {
  const byOrder = new Map();

  for (const f of facts || []) {
    const id = f.order_id;
    if (!id) continue;

    const arr = byOrder.get(id) || [];
    arr.push(f);
    byOrder.set(id, arr);
  }

  const bundleMap = new Map();

  for (const lines of byOrder.values()) {
    const products = Array.from(
      new Set(lines.map((l) => String(l.product || "Unbekannt").trim()).filter(Boolean))
    ).sort();

    if (products.length < 2) continue;

    const key = products.join(" + ");
    bundleMap.set(key, (bundleMap.get(key) || 0) + 1);
  }

  return Array.from(bundleMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([bundle, count]) => ({
      bundle,
      count,
    }));
}

/* =========================================
   Basket
========================================= */

export function basketKpis(facts) {
  const byOrder = new Map();

  for (const f of facts || []) {
    const id = f.order_id;
    if (!id) continue;

    const cur = byOrder.get(id) || { revenue: 0, lines: [] };
    cur.revenue += revenueOf(f);
    cur.lines.push(f);
    byOrder.set(id, cur);
  }

  const orders = byOrder.size;
  let totalRevenue = 0;
  let bundleOrders = 0;

  for (const o of byOrder.values()) {
    totalRevenue += o.revenue;
    if (isBundleOrder(o.lines)) bundleOrders++;
  }

  return {
    orders,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    aov: Number((orders ? totalRevenue / orders : 0).toFixed(2)),
    bundleRate: orders ? bundleOrders / orders : 0,
  };
}

export function basketByHour(facts) {
  const byHourOrders = new Map();

  for (const f of facts || []) {
    const dt = toDateObj(f.datetime);
    if (!dt) continue;

    const id = f.order_id;
    if (!id) continue;

    const h = hourKey(dt);

    let ordersMap = byHourOrders.get(h);
    if (!ordersMap) {
      ordersMap = new Map();
      byHourOrders.set(h, ordersMap);
    }

    const cur = ordersMap.get(id) || { revenue: 0, lines: [] };
    cur.revenue += revenueOf(f);
    cur.lines.push(f);
    ordersMap.set(id, cur);
  }

  return Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    const ordersMap = byHourOrders.get(h) || new Map();

    const orders = ordersMap.size;
    let rev = 0;
    let bundleOrders = 0;

    for (const o of ordersMap.values()) {
      rev += o.revenue;
      if (isBundleOrder(o.lines)) bundleOrders++;
    }

    return {
      hour: h,
      orders,
      aov: Number((orders ? rev / orders : 0).toFixed(2)),
      bundleRate: orders ? bundleOrders / orders : 0,
    };
  });
}

/* =========================================
   PERFORMANCE SCORE
========================================= */

export function performanceByStore(facts) {
  if (!facts || facts.length === 0) return [];

  const byStore = new Map();

  for (const f of facts) {
    const store = f.store;
    if (!store) continue;

    const dt = f.datetime;
    const oid = f.order_id;

    if (!byStore.has(store)) {
      byStore.set(store, {
        revenue: 0,
        orders: new Set(),
        days: new Set(),
      });
    }

    const s = byStore.get(store);

    s.revenue += revenueOf(f);
    if (oid) s.orders.add(oid);

    if (dt) {
      const day = formatYMD(dt);
      s.days.add(day);
    }
  }

  const rows = Array.from(byStore.entries())
    .map(([store, s]) => {
      const orders = s.orders.size;
      const days = s.days.size;

      const aov = orders ? s.revenue / orders : 0;
      const revPerDay = days ? s.revenue / days : 0;
      const ordersPerDay = days ? orders / days : 0;

      return { store, revenue: s.revenue, orders, aov, revPerDay, ordersPerDay };
    })
    .filter((r) => r.orders > 0 && r.revenue > 0);

  if (!rows.length) return [];

  const maxRev = Math.max(...rows.map((r) => r.revPerDay), 1);
  const maxOrders = Math.max(...rows.map((r) => r.ordersPerDay), 1);
  const maxAov = Math.max(...rows.map((r) => r.aov), 1);

  return rows
    .map((r) => {
      const score =
        (r.revPerDay / maxRev) * 0.55 +
        (r.ordersPerDay / maxOrders) * 0.25 +
        (r.aov / maxAov) * 0.2;

      return {
        store: r.store,
        revenue: Number(r.revenue.toFixed(2)),
        orders: r.orders,
        aov: Number(r.aov.toFixed(2)),
        score: Math.round(score * 100),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/* =========================================
   Insights
========================================= */

export function insights(facts) {
  if (!facts || facts.length === 0) return [];

  const byHour = revenueByHour(facts);
  const topProducts = topProductsByRevenue(facts, 3);
  const stores = storeRanking(facts);
  const basket = basketKpis(facts);
  const bundles = topBundles(facts, 3);

  const bestHour = [...byHour].sort((a, b) => b.revenue - a.revenue)[0];
  const weakestHour = [...byHour].sort((a, b) => a.revenue - b.revenue)[0];
  const bestStore = stores[0];
  const bestProduct = topProducts[0];
  const bestBundle = bundles[0];

  const items = [];

  if (bestHour) {
    items.push({
      title: "Stärkste Umsatzzeit",
      text: `Die stärkste Stunde ist ${bestHour.hour}:00 Uhr mit ${bestHour.revenue.toFixed(
        2
      )} € Umsatz. In diesem Zeitfenster lohnen sich Personal- und Promotion-Fokus.`,
    });
  }

  if (weakestHour) {
    items.push({
      title: "Schwache Stunde",
      text: `Die schwächste Stunde ist ${weakestHour.hour}:00 Uhr. Hier könnten Happy-Hour-Aktionen oder Bundles helfen, die Auslastung zu verbessern.`,
    });
  }

  if (bestProduct) {
    items.push({
      title: "Top-Produkt",
      text: `${bestProduct.product} ist aktuell der stärkste Umsatztreiber mit ${bestProduct.revenue.toFixed(
        2
      )} € Umsatz.`,
    });
  }

  if (bestStore) {
    items.push({
      title: "Stärkste Filiale",
      text: `${bestStore.store} führt das Ranking an mit ${bestStore.revenue.toFixed(
        2
      )} € Umsatz und einem AOV von ${bestStore.aov.toFixed(2)} €. Diese Filiale eignet sich gut als Benchmark.`,
    });
  }

  if (basket) {
    items.push({
      title: "Warenkorb-Potenzial",
      text: `Der durchschnittliche Bestellwert liegt bei ${basket.aov.toFixed(
        2
      )} €. Die Bundle-Quote beträgt ${(basket.bundleRate * 100).toFixed(
        1
      )} %. Cross-Selling kann hier zusätzliches Potenzial heben.`,
    });
  }

  if (bestBundle) {
    items.push({
      title: "Beliebtestes Bundle",
      text: `Die Kombination "${bestBundle.bundle}" wurde ${bestBundle.count} Mal gemeinsam verkauft. Dieses Bundle eignet sich für gezielte Promotion oder Menü-Angebote.`,
    });
  }

  return items.slice(0, 6);
}

/* =========================================
   Marketing & Sales Insights
========================================= */

export function marketingInsights(facts) {
  if (!facts || facts.length === 0) return [];

  const result = [];

  const totalRevenue = facts.reduce((sum, f) => sum + revenueOf(f), 0);
  const totalQty = facts.reduce((sum, f) => sum + safeNum(f.qty), 0);

  const hourData = revenueByHour(facts).filter((h) => h.revenue > 0);
  const productData = topProductsByRevenue(facts, 10);
  const storeData = storeRanking(facts);
  const bundleData = topBundles(facts, 10);
  const basket = basketKpis(facts);

  const categoryMap = new Map();
  for (const f of facts) {
    const category = String(f.category || "Unbekannt").trim();
    categoryMap.set(category, (categoryMap.get(category) || 0) + revenueOf(f));
  }

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, revenue]) => ({
      category,
      revenue: Number(revenue.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  if (hourData.length) {
    const bestHour = [...hourData].sort((a, b) => b.revenue - a.revenue)[0];
    const weakestHour = [...hourData].sort((a, b) => a.revenue - b.revenue)[0];
    const avgHourRevenue =
      hourData.reduce((sum, h) => sum + h.revenue, 0) / hourData.length;

    if (bestHour && bestHour.revenue > avgHourRevenue * 1.2) {
      result.push({
        type: "opportunity",
        category: "Marketing",
        priority: "Hoch",
        title: "Peak Hour mit hohem Kampagnenpotenzial",
        text: `Um ${formatHourLabel(
          bestHour.hour
        )} wird deutlich mehr Umsatz als im Stundendurchschnitt erzielt.`,
        recommendation:
          "Schalte zeitgesteuerte Promotions, Ads oder Push-Angebote bevorzugt rund um dieses Zeitfenster.",
      });
    }

    if (weakestHour && weakestHour.revenue < avgHourRevenue * 0.75) {
      result.push({
        type: "info",
        category: "Marketing",
        priority: "Mittel",
        title: "Schwaches Zeitfenster identifiziert",
        text: `Um ${formatHourLabel(
          weakestHour.hour
        )} ist der Umsatz im Vergleich zu anderen Stunden besonders niedrig.`,
        recommendation:
          "Teste hier Happy-Hour-Angebote, Coupons oder lokale Aktionen zur Nachfrageaktivierung.",
      });
    }
  }

  if (productData.length) {
    const topProduct = productData[0];
    const productShare = totalRevenue > 0 ? topProduct.revenue / totalRevenue : 0;

    if (productShare >= 0.3) {
      result.push({
        type: "warning",
        category: "Sales",
        priority: "Hoch",
        title: "Starke Abhängigkeit von einem Umsatztreiber",
        text: `${topProduct.product} steht für ${Math.round(
          productShare * 100
        )}% des Gesamtumsatzes.`,
        recommendation:
          "Top-Produkt weiter bewerben, aber zusätzlich Alternativen über Bundles und Cross-Selling aufbauen.",
      });
    } else {
      result.push({
        type: "success",
        category: "Sales",
        priority: "Niedrig",
        title: "Umsatz auf mehrere Produkte verteilt",
        text: "Kein einzelnes Produkt dominiert den Umsatz übermäßig stark.",
        recommendation:
          "Mehrprodukt-Kampagnen und Sortimentskommunikation weiter ausbauen.",
      });
    }
  }

  if (categoryData.length) {
    const topCategory = categoryData[0];
    const categoryShare = totalRevenue > 0 ? topCategory.revenue / totalRevenue : 0;

    result.push({
      type: "info",
      category: "Sales",
      priority: "Mittel",
      title: "Umsatzstärkste Kategorie erkannt",
      text: `Die Kategorie ${topCategory.category} erzielt aktuell ${Math.round(
        categoryShare * 100
      )}% des Gesamtumsatzes.`,
      recommendation:
        "Diese Kategorie in Kampagnen, auf Bannern und in Bundle-Angeboten besonders prominent platzieren.",
    });
  }

  if (basket.orders > 0) {
    if (basket.bundleRate < 0.35) {
      result.push({
        type: "opportunity",
        category: "Sales",
        priority: "Hoch",
        title: "Niedrige Bundle-Quote",
        text: `Nur ${(basket.bundleRate * 100).toFixed(
          1
        )}% der Bestellungen enthalten mehrere Produkte.`,
        recommendation:
          "Bundles, Menü-Angebote und Add-ons stärker im Checkout und an den Hauptkontaktpunkten hervorheben.",
      });
    } else {
      result.push({
        type: "success",
        category: "Sales",
        priority: "Mittel",
        title: "Bundle-Quote auf gutem Niveau",
        text: `${(basket.bundleRate * 100).toFixed(
          1
        )}% der Bestellungen enthalten mehrere Produkte.`,
        recommendation:
          "Erfolgreiche Produktkombinationen weiter bewerben und als Standard-Angebote ausbauen.",
      });
    }

    if (basket.aov < 12) {
      result.push({
        type: "warning",
        category: "Sales",
        priority: "Hoch",
        title: "Niedriger durchschnittlicher Bestellwert",
        text: `Der aktuelle AOV liegt bei ${basket.aov.toFixed(2)} €.`,
        recommendation:
          "Setze auf Upselling mit Extras, Premium-Versionen und Mindestbestellwert-Aktionen.",
      });
    } else if (basket.aov < 18) {
      result.push({
        type: "info",
        category: "Sales",
        priority: "Mittel",
        title: "Solider Bestellwert mit Ausbaupotenzial",
        text: `Der durchschnittliche Bestellwert liegt bei ${basket.aov.toFixed(2)} €.`,
        recommendation:
          "Add-ons, Menüs und Produktempfehlungen können den Warenkorb weiter erhöhen.",
      });
    } else {
      result.push({
        type: "success",
        category: "Sales",
        priority: "Niedrig",
        title: "Starker durchschnittlicher Bestellwert",
        text: `Der durchschnittliche Bestellwert liegt bei ${basket.aov.toFixed(2)} €.`,
        recommendation:
          "Premium-Produkte und margenstarke Zusatzartikel weiter aktiv vermarkten.",
      });
    }
  }

  if (storeData.length >= 2) {
    const bestStore = storeData[0];
    const worstStore = storeData[storeData.length - 1];

    if (bestStore.revenue > worstStore.revenue * 1.5) {
      result.push({
        type: "opportunity",
        category: "Sales",
        priority: "Mittel",
        title: "Deutliche Unterschiede zwischen Filialen",
        text: `${bestStore.store} performt beim Umsatz klar stärker als ${worstStore.store}.`,
        recommendation:
          "Sortiment, Promotions und Peak-Hour-Strategien der Top-Filiale auf schwächere Standorte übertragen.",
      });
    }
  }

  if (bundleData.length) {
    const bestBundle = bundleData[0];
    result.push({
      type: "info",
      category: "Sales",
      priority: "Niedrig",
      title: "Bestes Bundle für Promotions gefunden",
      text: `Die Kombination "${bestBundle.bundle}" wurde ${bestBundle.count} Mal gemeinsam verkauft.`,
      recommendation:
        "Dieses Bundle als Menü, Aktion oder Empfehlung im Sales-&-Marketing-Panel hervorheben.",
    });
  }

  if (totalQty > 0) {
    const avgRevenuePerUnit = totalRevenue / totalQty;

    result.push({
      type: "info",
      category: "Marketing",
      priority: "Niedrig",
      title: "Absatz- und Preisniveau im Blick",
      text: `Es wurden ${totalQty} Einheiten mit durchschnittlich ${avgRevenuePerUnit.toFixed(
        2
      )} € Umsatz pro Einheit verkauft.`,
      recommendation:
        "Produkte mit hohem Absatz und stabiler Marge priorisiert in Kampagnen einsetzen.",
    });
  }

  return result
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 8);
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function topEntriesFromMap(map, limit = 3) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function topBundleFromMap(map) {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

export function getCustomerCluster(customer) {
  const aov = toNumber(customer.avg_order_value);
  const items = toNumber(customer.avg_items_per_order);

  // Kleine durchschnittliche Bestellungen
  if (aov < 18 && items <= 4) {
    return "Singles";
  }

  // Mittlere durchschnittliche Bestellungen
  if (aov >= 18 && aov < 45 && items <= 10) {
    return "Families";
  }

  // Große durchschnittliche Bestellungen
  return "Business/Events";
}

export function isLostCustomer(customer, today = new Date()) {
  if (!customer.last_order_date) return false;
  if (toNumber(customer.total_orders) < 5) return false;

  const diff = daysBetween(customer.last_order_date, today);
  return diff != null && diff > 30;
}

function buildPersonalizedBundles(customer) {
  const favoriteProducts = customer.favorite_products || [];
  const favoriteCategories = customer.favorite_categories || [];
  const favoriteBundle = customer.favorite_bundle;

  if (customer.is_lost) {
    return {
      campaign: "Rückgewinnungsaktion",
      message: favoriteProducts.length
        ? `Dieser Kunde war früher aktiv und hatte größere Bestellungen mit ${favoriteProducts
            .slice(0, 2)
            .join(" und ")}. Sende einen Flyer oder eine E-Mail mit Rückkehr-Angebot und diesen Favoriten.`
        : "Dieser Kunde war früher aktiv. Nutze eine Rückgewinnungs-E-Mail mit bekannten Lieblingsprodukten.",
      bundles: favoriteBundle
        ? [favoriteBundle, "Comeback Deal", "10–20% Rückkehr-Rabatt"]
        : ["Comeback Deal", "10–20% Rückkehr-Rabatt", "Favorite Bundle"],
    };
  }

  if (favoriteProducts.length) {
    return {
      campaign: `${favoriteProducts[0]} Fokus`,
      message: `Dieser Kunde hat besonders wertige bzw. größere Bestellungen mit ${favoriteProducts
        .slice(0, 2)
        .join(" und ")}. Plane Flyer oder E-Mails rund um diese Produkte und passende Add-ons.`,
      bundles: [
        favoriteBundle || `${favoriteProducts[0]} Bundle`,
        `${favoriteProducts[0]} + Drink`,
        favoriteProducts[1]
          ? `${favoriteProducts[0]} + ${favoriteProducts[1]}`
          : "Personal Favorite Combo",
      ],
    };
  }

  if (favoriteCategories.includes("Burger")) {
    return {
      campaign: "Burger Fokus",
      message:
        "Nutze Flyer oder E-Mails mit Burger-Bundles, Getränken und Beilagen.",
      bundles: ["Burger + Drink", "Burger + Fries", "Burger Menü"],
    };
  }

  if (favoriteCategories.includes("Pizza")) {
    return {
      campaign: "Pizza Fokus",
      message:
        "Nutze E-Mails oder Flyer mit Pizza-Kombis und Sharing-Angeboten.",
      bundles: ["Pizza + Drink", "2 Pizza Deal", "Pizza Bundle"],
    };
  }

  if (customer.base_cluster === "Singles") {
    return {
      campaign: "Single-Angebot",
      message:
        "Für dieses Segment passen kompakte Flyer oder E-Mails mit kleinen Menüs und schnellen Add-ons.",
      bundles: ["Burger + Drink", "Lunch Deal", "Small Combo"],
    };
  }

  if (customer.base_cluster === "Families") {
    return {
      campaign: "Family-Angebot",
      message:
        "Für dieses Segment passen Flyer oder E-Mails mit Family-Boxen, Gruppenmenüs und Wochenendangeboten.",
      bundles: ["Family Box", "4er Menü", "Weekend Bundle"],
    };
  }

  if (customer.base_cluster === "Business/Events") {
    return {
      campaign: "Business-/Event-Angebot",
      message:
        "Für dieses Segment eignen sich Angebotsmails oder Flyer mit Catering, Vorbestellung und Mengenrabatt.",
      bundles: ["Office Lunch Pack", "Meeting Bundle", "Event Catering Set"],
    };
  }

  return {
    campaign: "Standard-Angebot",
    message: "Keine spezifische Empfehlung verfügbar.",
    bundles: [],
  };
}

export function aggregateCustomers(orders = [], orderItems = []) {
  const customers = new Map();
  const orderMap = new Map();

  // 1) Erst alle Zeilen mit gleicher order_id zu EINER Bestellung zusammenfassen
  for (const row of orderItems) {
    const orderId = row.order_id ?? row.orderId;
    const userId = row.user_id ?? row.userId;
    const orderDate =
      row.order_date ??
      row.created_at ??
      row.date ??
      row.createdAt ??
      row.datetime ??
      null;

    const product =
      row.product ?? row.product_name ?? row.name ?? "Unknown Product";
    const category =
      row.category ?? row.product_category ?? "Unknown Category";
    const qty = toNumber(row.qty ?? row.quantity ?? 1);
    const unitPrice = toNumber(
      row.unit_price ?? row.unitPrice ?? row.price ?? 0
    );
    const lineRevenue =
      row.revenue != null ? toNumber(row.revenue) : qty * unitPrice;

    if (!orderId) continue;

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        order_id: orderId,
        user_id: userId || null,
        order_date: orderDate || null,
        total_items: 0,
        total_revenue: 0,
        products: [],
        categories: [],
      });
    }

    const order = orderMap.get(orderId);

    // falls in späteren Zeilen Infos drin sind, ergänzen
    if (!order.user_id && userId) order.user_id = userId;
    if (!order.order_date && orderDate) order.order_date = orderDate;

    order.total_items += qty;
    order.total_revenue += lineRevenue;

    for (let i = 0; i < qty; i += 1) {
      order.products.push(product);
      order.categories.push(category);
    }
  }

  // 2) Falls orders-Array zusätzliche Infos hat, auf Order-Ebene ergänzen
  for (const row of orders) {
    const orderId = row.order_id ?? row.id ?? row.orderId;
    const userId = row.user_id ?? row.userId;
    const orderDate =
      row.order_date ??
      row.created_at ??
      row.date ??
      row.createdAt ??
      row.datetime ??
      null;

    if (!orderId || !orderMap.has(orderId)) continue;

    const order = orderMap.get(orderId);

    if (!order.user_id && userId) order.user_id = userId;
    if (!order.order_date && orderDate) order.order_date = orderDate;
  }

  // 3) Jetzt jede aggregierte Bestellung genau EINMAL pro Kunde zählen
  for (const order of orderMap.values()) {
    const userId = order.user_id;
    const orderDate = order.order_date;

    if (!userId) continue;

    if (!customers.has(userId)) {
      customers.set(userId, {
        user_id: userId,
        total_orders: 0,
        total_revenue: 0,
        total_items: 0,
        last_order_date: null,
        productCounts: new Map(),
        categoryCounts: new Map(),
        bundleCounts: new Map(),
      });
    }

    const customer = customers.get(userId);

    // WICHTIG: eine order_id = eine Bestellung
    customer.total_orders += 1;
    customer.total_revenue += order.total_revenue;
    customer.total_items += order.total_items;

    if (
      orderDate &&
      (!customer.last_order_date ||
        new Date(orderDate) > new Date(customer.last_order_date))
    ) {
      customer.last_order_date = orderDate;
    }

    order.products.forEach((product) => {
      customer.productCounts.set(
        product,
        (customer.productCounts.get(product) || 0) + 1
      );
    });

    order.categories.forEach((category) => {
      customer.categoryCounts.set(
        category,
        (customer.categoryCounts.get(category) || 0) + 1
      );
    });

    const uniqueProductsInOrder = [...new Set(order.products)].sort();
    if (uniqueProductsInOrder.length >= 2) {
      const bundleName = uniqueProductsInOrder.slice(0, 3).join(" + ");
      customer.bundleCounts.set(
        bundleName,
        (customer.bundleCounts.get(bundleName) || 0) + 1
      );
    }
  }

  // 4) Kundenmetriken berechnen
  const result = [];

  for (const customer of customers.values()) {
    customer.avg_order_value =
      customer.total_orders > 0
        ? customer.total_revenue / customer.total_orders
        : 0;

    customer.avg_items_per_order =
      customer.total_orders > 0
        ? customer.total_items / customer.total_orders
        : 0;

    customer.favorite_products = topEntriesFromMap(customer.productCounts, 3);
    customer.favorite_categories = topEntriesFromMap(customer.categoryCounts, 3);
    customer.favorite_bundle = topBundleFromMap(customer.bundleCounts);

    customer.base_cluster = getCustomerCluster(customer);
    customer.is_lost = isLostCustomer(customer);
    customer.recommendation = buildPersonalizedBundles(customer);

    delete customer.productCounts;
    delete customer.categoryCounts;
    delete customer.bundleCounts;

    result.push(customer);
  }

  return result;
}

export function buildSegmentation(customers = []) {
  const clusters = {
    Singles: [],
    Families: [],
    "Business/Events": [],
    "Lost Customers": [],
  };

  for (const customer of customers) {
    if (clusters[customer.base_cluster]) {
      clusters[customer.base_cluster].push(customer);
    }

    if (customer.is_lost) {
      clusters["Lost Customers"].push(customer);
    }
  }

  for (const key of Object.keys(clusters)) {
    clusters[key] = clusters[key]
      .sort((a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue))
      .slice(0, 10);
  }

  return {
    summary: {
      singles: customers.filter((c) => c.base_cluster === "Singles").length,
      families: customers.filter((c) => c.base_cluster === "Families").length,
      businessEvents: customers.filter(
        (c) => c.base_cluster === "Business/Events"
      ).length,
      lostCustomers: customers.filter((c) => c.is_lost).length,
    },
    clusters,
  };
}
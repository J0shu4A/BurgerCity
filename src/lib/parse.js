import * as XLSX from "xlsx";
import Papa from "papaparse";

export function normalizeKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function parseDateTime(dt) {
  if (dt instanceof Date && !isNaN(dt.getTime())) return dt;
  const s = String(dt || "").trim();
  if (!s) return null;

  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  const d2 = new Date(s.replace(" ", "T"));
  if (!isNaN(d2.getTime())) return d2;

  return null;
}

export function formatYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function coerceColumns(row, mapping) {
  const out = {};
  for (const canon of Object.keys(mapping)) {
    for (const candidate of mapping[canon]) {
      if (row[candidate] !== undefined && String(row[candidate]).trim() !== "") {
        out[canon] = row[candidate];
        break;
      }
    }
    if (out[canon] === undefined) out[canon] = "";
  }
  return out;
}

// Canonical columns we want internally
const COLMAP = {
  order_id: ["order_id", "orderid", "bestell_id", "bestellid"],
  datetime: ["datetime", "date_time", "order_datetime", "datum", "zeitpunkt", "timestamp"],
  store: ["store", "filiale", "branch", "location"],
  product: ["product", "produkt", "item"],
  category: ["category", "kategorie", "product_category"],
  qty: ["qty", "quantity", "menge", "anzahl"],
  unit_price: ["unit_price", "price", "unitprice", "einzelpreis", "preis"],
};

function readSheetAsJson(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return raw.map((row) => {
    const out = {};
    Object.keys(row).forEach((k) => (out[normalizeKey(k)] = row[k]));
    return out;
  });
}

function detectSheetName(names, wanted) {
  const w = wanted.toLowerCase();
  return (
    names.find((n) => n.toLowerCase() === w) ||
    names.find((n) => n.toLowerCase().includes(w)) ||
    null
  );
}

/**
 * Facts format (line items):
 * { order_id, datetime: Date|null, store, product, category, qty, unit_price, revenue }
 */
function buildFactsFromSingleSheet(rows) {
  const norm = rows.map((r) => coerceColumns(r, COLMAP));
  return norm
    .map((r) => {
      const order_id = String(r.order_id).trim();
      const datetime = parseDateTime(r.datetime);
      const store = String(r.store || "").trim() || "Unbekannt";
      const product = String(r.product || "").trim() || "Unbekannt";
      const category = String(r.category || "").trim() || "Unbekannt";
      const qty = toNumber(r.qty);
      const unit_price = toNumber(r.unit_price);
      return {
        order_id,
        datetime,
        store,
        product,
        category,
        qty,
        unit_price,
        revenue: qty * unit_price,
      };
    })
    .filter((x) => x.order_id);
}

function buildFactsFromTwoSheets(orders, items) {
  const oNorm = orders.map((r) => coerceColumns(r, COLMAP));
  const iNorm = items.map((r) => coerceColumns(r, COLMAP));

  const orderById = new Map();
  for (const o of oNorm) {
    const id = String(o.order_id).trim();
    if (!id) continue;
    orderById.set(id, {
      order_id: id,
      datetime: parseDateTime(o.datetime),
      store: String(o.store || "").trim() || "Unbekannt",
    });
  }

  const facts = [];
  for (const it of iNorm) {
    const id = String(it.order_id).trim();
    if (!id) continue;
    const o = orderById.get(id);
    const qty = toNumber(it.qty);
    const unit_price = toNumber(it.unit_price);

    facts.push({
      order_id: id,
      datetime: o?.datetime || null,
      store: o?.store || "Unbekannt",
      product: String(it.product || "").trim() || "Unbekannt",
      category: String(it.category || "").trim() || "Unbekannt",
      qty,
      unit_price,
      revenue: qty * unit_price,
    });
  }
  return facts;
}

export async function parseCsvFile(file) {
  return await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          const rows = (res.data || []).map((row) => {
            const out = {};
            Object.keys(row).forEach((k) => (out[normalizeKey(k)] = row[k]));
            return out;
          });
          const facts = buildFactsFromSingleSheet(rows);
          resolve(facts);
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}

export async function parseXlsxFile(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const names = wb.SheetNames || [];

  const ordersName = detectSheetName(names, "orders");
  const itemsName =
    detectSheetName(names, "orderitems") || detectSheetName(names, "items") || detectSheetName(names, "positionen");

  if (ordersName && itemsName) {
    const orders = readSheetAsJson(wb, ordersName);
    const items = readSheetAsJson(wb, itemsName);
    return buildFactsFromTwoSheets(orders, items);
  }

  // fallback: first sheet as single table
  const first = names[0];
  const rows = readSheetAsJson(wb, first);
  return buildFactsFromSingleSheet(rows);
}

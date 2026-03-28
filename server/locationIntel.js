const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const router = express.Router();

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeDistrictKey(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\//g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (key.includes("friedrichshain") || key.includes("kreuzberg")) {
    return "friedrichshain-kreuzberg";
  }
  if (key.includes("charlottenburg") || key.includes("wilmersdorf")) {
    return "charlottenburg-wilmersdorf";
  }
  if (key.includes("steglitz") || key.includes("zehlendorf")) {
    return "steglitz-zehlendorf";
  }
  if (
    key.includes("tempelhof") ||
    key.includes("schoeneberg") ||
    key.includes("schoneberg")
  ) {
    return "tempelhof-schoeneberg";
  }
  if (
    key.includes("treptow") ||
    key.includes("koepenick") ||
    key.includes("kopenick")
  ) {
    return "treptow-koepenick";
  }
  if (key.includes("marzahn") || key.includes("hellersdorf")) {
    return "marzahn-hellersdorf";
  }
  if (key.includes("prenzlauer berg") || key.includes("pankow")) {
    return "pankow";
  }
  if (key.includes("neukoelln") || key.includes("neukolln")) {
    return "neukoelln";
  }
  if (key.includes("mitte")) return "mitte";
  if (key.includes("spandau")) return "spandau";
  if (key.includes("lichtenberg")) return "lichtenberg";
  if (key.includes("reinickendorf")) return "reinickendorf";

  return key.replace(/\s+/g, "-");
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dedupePlaces(rows) {
  const seen = new Set();

  return rows.filter((r) => {
    const key = [
      r.amenity,
      normalizeText(r.name || ""),
      r.lat?.toFixed(5),
      r.lon?.toFixed(5),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeNearbyByNameAndDistance(rows) {
  const seen = new Set();

  return rows.filter((r) => {
    const key = [
      r.amenity,
      normalizeText(r.name || "ohne-name"),
      r.lat.toFixed(4),
      r.lon.toFixed(4),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadRestaurantsCsv() {
  const filePath = path.join(__dirname, "data", "restaurants_berlin.csv");

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV nicht gefunden: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "latin1");

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_records_with_error: true,
    bom: true,
    on_skip: (err, record, info) => {
      console.warn("Fehlerhafte CSV-Zeile übersprungen:", {
        line: info?.lines,
        message: err.message,
        record,
      });
    },
  });

  let parsedRows = rows
    .map((r) => ({
      type: normalizeText(r["@type"] || r["type"] || ""),
      name: String(r["name"] || "").trim(),
      amenity: normalizeText(r["amenity"] || ""),
      postal_code: String(r["addr:postcode"] || "").trim(),
      suburb: String(r["addr:suburb"] || "").trim(),
      lat: toNum(r["@lat"] ?? r["lat"]),
      lon: toNum(r["@lon"] ?? r["lon"]),
    }))
    .filter((r) => r.lat != null && r.lon != null)
    .filter((r) => ["fast food", "restaurant"].includes(r.amenity))
    .filter(
      (r) =>
        r.lat >= 52.33 &&
        r.lat <= 52.68 &&
        r.lon >= 13.05 &&
        r.lon <= 13.80
    );

  parsedRows = dedupePlaces(parsedRows);

  return parsedRows;
}

function loadPopulationCsv() {
  const filePath = path.join(
    __dirname,
    "data",
    "berlin_population_by_district.csv"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Population CSV nicht gefunden: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const firstLine = raw.split(/\r?\n/)[0] || "";
  const delimiter = firstLine.includes(";") ? ";" : ",";

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    delimiter,
  });

  const parsed = rows.map((r) => ({
    district: String(r.district || r.bezirk || "").trim(),
    district_key: String(r.district_key || "").trim(),
    population: Number(r.population) || 0,
    population_index: Number(r.population_index) || 0,
  }));

  console.log("Population CSV geladen:", parsed.length, "Einträge");
  console.log("Population CSV Preview:", parsed.slice(0, 5));

  return parsed;
}

function getPriceIncreaseRecommendation(
  populationIndex,
  totalCompetitors,
  revenue
) {
  const revenueFactor =
    revenue >= 120000 ? 12 : revenue >= 90000 ? 8 : revenue >= 60000 ? 4 : 0;

  const pricingPower =
    populationIndex * 0.7 + revenueFactor - totalCompetitors * 0.6;

  if (pricingPower >= 65) return 8;
  if (pricingPower >= 50) return 6;
  if (pricingPower >= 38) return 4;
  if (pricingPower >= 26) return 2;
  return 0;
}

router.get("/location-intel-test", (req, res) => {
  try {
    const restaurants = loadRestaurantsCsv();

    const amenityCounts = {};
    for (const r of restaurants) {
      const key = r.amenity || "(leer)";
      amenityCounts[key] = (amenityCounts[key] || 0) + 1;
    }

    const testBase = {
      lat: 52.5208,
      lon: 13.4095,
    };

    const radiusKm = 0.6;

    const nearby = restaurants
      .map((r) => ({
        ...r,
        distanceKm: haversineKm(testBase.lat, testBase.lon, r.lat, r.lon),
      }))
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyAmenityCounts = {};
    for (const r of nearby) {
      const key = r.amenity || "(leer)";
      nearbyAmenityCounts[key] = (nearbyAmenityCounts[key] || 0) + 1;
    }

    res.json({
      ok: true,
      totalRows: restaurants.length,
      uniqueAmenities: Object.keys(amenityCounts).sort(),
      amenityCounts,
      testBase,
      radiusKm,
      nearbyCount: nearby.length,
      nearbyAmenityCounts,
      fastFoodMatches: nearby.filter((r) => r.amenity === "fast food").length,
      restaurantMatches: nearby.filter((r) => r.amenity === "restaurant").length,
      nearbySample: nearby.slice(0, 15).map((r) => ({
        name: r.name,
        amenity: r.amenity,
        distanceKm: Number(r.distanceKm.toFixed(3)),
        lat: r.lat,
        lon: r.lon,
      })),
    });
  } catch (err) {
    console.error("TEST ROUTE ERROR:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

router.get("/population-test", (req, res) => {
  try {
    const populationRows = loadPopulationCsv();

    const sampleDistricts = [
      "Spandau",
      "Mitte",
      "Neukölln",
      "Treptow-Köpenick",
      "Tempelhof-Schöneberg",
      "Pankow / Prenzlauer Berg",
      "Friedrichshain-Kreuzberg",
      "Charlottenburg-Wilmersdorf",
      "Lichtenberg",
      "Reinickendorf",
      "Marzahn-Hellersdorf",
      "Steglitz-Zehlendorf",
    ];

    const checks = sampleDistricts.map((district) => {
      const normalized = normalizeDistrictKey(district);
      const match = populationRows.find((p) => p.district_key === normalized);

      return {
        input: district,
        normalized,
        match: match || null,
      };
    });

    res.json({
      ok: true,
      loadedPopulationRows: populationRows.length,
      csvKeys: populationRows.map((p) => p.district_key),
      checks,
    });
  } catch (err) {
    console.error("POPULATION TEST ERROR:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

function getFallbackCoordsForBerlinArea({ district, postal_code }) {
  const d = normalizeText(district);
  const plz = String(postal_code || "").trim();

  const areas = [
    {
      keys: ["mitte", "10115", "10117", "10119", "10178", "10179"],
      lat: 52.5208,
      lon: 13.4095,
      label: "Mitte",
    },
    {
      keys: [
        "friedrichshain",
        "kreuzberg",
        "10243",
        "10245",
        "10247",
        "10249",
        "10961",
        "10963",
        "10965",
        "10967",
        "10969",
        "10997",
        "10999",
      ],
      lat: 52.5155,
      lon: 13.4549,
      label: "Friedrichshain-Kreuzberg",
    },
    {
      keys: [
        "charlottenburg",
        "wilmersdorf",
        "10623",
        "10625",
        "10627",
        "10629",
        "10707",
        "10709",
        "10711",
        "10715",
        "10717",
        "10719",
      ],
      lat: 52.5003,
      lon: 13.3041,
      label: "Charlottenburg-Wilmersdorf",
    },
    {
      keys: [
        "spandau",
        "13581",
        "13583",
        "13585",
        "13587",
        "13589",
        "13591",
        "13593",
        "13595",
        "13597",
        "13599",
      ],
      lat: 52.5366,
      lon: 13.1999,
      label: "Spandau",
    },
    {
      keys: [
        "steglitz",
        "zehlendorf",
        "12157",
        "12161",
        "12163",
        "12165",
        "12167",
        "12169",
        "14129",
        "14163",
        "14165",
        "14167",
        "14169",
        "14193",
        "14195",
      ],
      lat: 52.4309,
      lon: 13.2414,
      label: "Steglitz-Zehlendorf",
    },
    {
      keys: [
        "tempelhof",
        "schoeneberg",
        "schoneberg",
        "10823",
        "10825",
        "10827",
        "10829",
        "12099",
        "12101",
        "12103",
        "12105",
        "12107",
        "12109",
      ],
      lat: 52.4736,
      lon: 13.3831,
      label: "Tempelhof-Schöneberg",
    },
    {
      keys: [
        "neukoelln",
        "neukolln",
        "12043",
        "12045",
        "12047",
        "12049",
        "12051",
        "12053",
        "12055",
        "12057",
        "12059",
        "12347",
        "12349",
        "12351",
        "12353",
        "12355",
        "12357",
        "12359",
      ],
      lat: 52.4815,
      lon: 13.4351,
      label: "Neukölln",
    },
    {
      keys: [
        "treptow",
        "koepenick",
        "kopenick",
        "12435",
        "12437",
        "12439",
        "12459",
        "12487",
        "12489",
        "12524",
        "12526",
        "12527",
        "12555",
        "12557",
        "12559",
        "12587",
        "12589",
      ],
      lat: 52.445,
      lon: 13.574,
      label: "Treptow-Köpenick",
    },
    {
      keys: [
        "marzahn",
        "hellersdorf",
        "12619",
        "12621",
        "12623",
        "12627",
        "12629",
        "12679",
        "12681",
        "12683",
        "12685",
        "12687",
        "12689",
      ],
      lat: 52.5363,
      lon: 13.6047,
      label: "Marzahn-Hellersdorf",
    },
    {
      keys: [
        "lichtenberg",
        "10315",
        "10317",
        "10318",
        "10319",
        "10365",
        "10367",
        "10369",
        "13051",
        "13053",
        "13055",
        "13057",
        "13059",
      ],
      lat: 52.5265,
      lon: 13.4987,
      label: "Lichtenberg",
    },
    {
      keys: [
        "reinickendorf",
        "13403",
        "13405",
        "13407",
        "13409",
        "13435",
        "13437",
        "13439",
        "13465",
        "13467",
        "13469",
      ],
      lat: 52.5897,
      lon: 13.2877,
      label: "Reinickendorf",
    },
    {
      keys: [
        "pankow",
        "prenzlauer berg",
        "10405",
        "10407",
        "10409",
        "10435",
        "10437",
        "10439",
        "13086",
        "13088",
        "13089",
        "13125",
        "13127",
        "13129",
        "13156",
        "13158",
        "13187",
        "13189",
      ],
      lat: 52.5403,
      lon: 13.4246,
      label: "Pankow / Prenzlauer Berg",
    },
  ];

  const text = `${d} ${plz}`;

  for (const area of areas) {
    if (area.keys.some((k) => text.includes(normalizeText(k)))) {
      return {
        lat: area.lat,
        lon: area.lon,
        geocodedFrom: area.label,
      };
    }
  }

  return {
    lat: 52.5208,
    lon: 13.4095,
    geocodedFrom: "Berlin Mitte (Fallback)",
  };
}

router.post("/location-intel", async (req, res) => {
  try {
    const rawRadius = Number(req.body?.radius);
    const radiusKm = Number.isFinite(rawRadius) ? rawRadius / 1000 : 0.8;

    const stores = Array.isArray(req.body?.stores) ? req.body.stores : [];
    const restaurants = loadRestaurantsCsv();
    const populationRows = loadPopulationCsv();

    const results = stores.map((store) => {
      const hasRealCoords =
        Number.isFinite(Number(store.lat)) && Number.isFinite(Number(store.lon));

      const base = hasRealCoords
        ? {
            lat: Number(store.lat),
            lon: Number(store.lon),
            geocodedFrom: "Store coordinates",
          }
        : getFallbackCoordsForBerlinArea({
            district: store.district,
            postal_code: store.postal_code,
          });

      const districtKeyFromStore = normalizeDistrictKey(store.district);
      const districtKeyFromGeo = normalizeDistrictKey(base.geocodedFrom);

      const populationMatch =
        populationRows.find((p) => p.district_key === districtKeyFromStore) ||
        populationRows.find((p) => p.district_key === districtKeyFromGeo);

      const population = populationMatch?.population || 0;
      const populationIndex = populationMatch?.population_index || 0;

      const nearbyRaw = restaurants
        .map((r) => ({
          ...r,
          distanceKm: haversineKm(base.lat, base.lon, r.lat, r.lon),
        }))
        .filter((r) => r.distanceKm <= radiusKm);

      const nearby = dedupeNearbyByNameAndDistance(nearbyRaw);

      const fastFoodCompetitors = nearby.filter(
        (r) => r.amenity === "fast food"
      ).length;

      const restaurantCompetitors = nearby.filter(
        (r) => r.amenity === "restaurant"
      ).length;

      const totalCompetitors = fastFoodCompetitors + restaurantCompetitors;

      const priceIncreaseRecommendation = getPriceIncreaseRecommendation(
        populationIndex,
        totalCompetitors,
        Number(store.revenue) || 0
      );

      console.log("=== POPULATION DEBUG ===");
      console.log("Store:", store.store);
      console.log("Store district:", store.district);
      console.log("Normalized store district:", districtKeyFromStore);
      console.log("GeocodedFrom:", base.geocodedFrom);
      console.log("Normalized geocodedFrom:", districtKeyFromGeo);
      console.log("Available CSV keys:", populationRows.map((p) => p.district_key));
      console.log("Population match:", populationMatch);
      console.log("Population:", population);
      console.log("Population index:", populationIndex);

      return {
        store: store.store || "",
        district: store.district || "",
        postal_code: store.postal_code || "",
        lat: base.lat,
        lon: base.lon,
        geocodedFrom: base.geocodedFrom,
        radiusUsedKm: radiusKm,
        usedRealStoreCoords: hasRealCoords,
        rawNearbyCount: nearbyRaw.length,
        dedupedNearbyCount: nearby.length,
        population,
        populationIndex,
        fastFoodCompetitors,
        restaurantCompetitors,
        totalCompetitors,
        priceIncreaseRecommendation,
        revenue: Number(store.revenue) || 0,
        orderCount: Number(store.orderCount) || 0,
      };
    });

    res.json({
      ok: true,
      rows: results,
    });
  } catch (err) {
    console.error("LOCATION INTEL ERROR:", err);
    res.status(500).json({
      ok: false,
      message: "CSV-basierte Standortanalyse konnte nicht geladen werden.",
      error: err.message,
    });
  }
});

module.exports = router;
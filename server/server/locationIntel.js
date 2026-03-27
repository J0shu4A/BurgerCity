// server/locationIntel.js
const express = require("express");

const router = express.Router();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

/**
 * Sehr robuster Berlin-Matcher:
 * Erkennt Bezirke, Ortsteile und häufige Kieznamen.
 */
function resolveBerlinCoords({ store, district, postal_code }) {
  const text = normalizeText(
    `${store || ""} ${district || ""} ${postal_code || ""}`
  );

  const areas = [
    {
      keys: ["mitte", "moabit", "wedding", "tiergarten", "gesundbrunnen", "10115", "10117", "10119", "10178", "10179", "10551", "10553", "10555", "10557", "10559", "13347", "13349", "13351", "13353", "13355", "13357", "13359"],
      lat: 52.5208,
      lon: 13.4095,
      label: "Mitte",
    },
    {
      keys: ["friedrichshain", "kreuzberg", "bergmannkiez", "xberg", "10243", "10245", "10247", "10249", "10961", "10963", "10965", "10967", "10969", "10997", "10999"],
      lat: 52.5155,
      lon: 13.4549,
      label: "Friedrichshain-Kreuzberg",
    },
    {
      keys: ["pankow", "prenzlauer berg", "prenzlauerberg", "weissensee", "weissensee", "buch", "karow", "blankenburg", "10405", "10407", "10409", "10435", "10437", "10439", "13086", "13088", "13089", "13125", "13127", "13129", "13156", "13158", "13187", "13189"],
      lat: 52.5694,
      lon: 13.4019,
      label: "Pankow",
    },
    {
      keys: ["charlottenburg", "wilmersdorf", "halensee", "grunewald", "westend", "10585", "10587", "10589", "10623", "10625", "10627", "10629", "10707", "10709", "10711", "10715", "10717", "10719"],
      lat: 52.5003,
      lon: 13.3041,
      label: "Charlottenburg-Wilmersdorf",
    },
    {
      keys: ["spandau", "haselhorst", "siemensstadt", "staaken", "gatow", "kladow", "13581", "13583", "13585", "13587", "13589", "13591", "13593", "13595", "13597", "13599"],
      lat: 52.5511,
      lon: 13.1992,
      label: "Spandau",
    },
    {
      keys: ["steglitz", "zehlendorf", "lichterfelde", "wannsee", "dahlem", "schlachtensee", "14109", "14129", "14163", "14165", "14167", "14169", "14193", "14195", "12157", "12161", "12163", "12165", "12167", "12169"],
      lat: 52.4309,
      lon: 13.2414,
      label: "Steglitz-Zehlendorf",
    },
    {
      keys: ["tempelhof", "schoeneberg", "schoneberg", "friedenau", "mariendorf", "marienfelde", "lichtenrade", "10777", "10779", "10781", "10783", "10785", "10787", "10789", "10823", "10825", "10827", "10829", "12099", "12101", "12103", "12105", "12107", "12109", "12277", "12279", "12305", "12307", "12309"],
      lat: 52.4736,
      lon: 13.3831,
      label: "Tempelhof-Schöneberg",
    },
    {
      keys: ["neukoelln", "neukolln", "britz", "rudow", "buckow", "gropiusstadt", "12043", "12045", "12047", "12049", "12051", "12053", "12055", "12057", "12059", "12099", "12347", "12349", "12351", "12353", "12355", "12357", "12359"],
      lat: 52.4815,
      lon: 13.4351,
      label: "Neukölln",
    },
    {
      keys: ["treptow", "koepenick", "kopenick", "adlershof", "altglienicke", "oberschoeneweide", "oberschoneweide", "johannisthal", "12435", "12437", "12439", "12459", "12487", "12489", "12524", "12526", "12527", "12555", "12557", "12559", "12587", "12589"],
      lat: 52.445,
      lon: 13.574,
      label: "Treptow-Köpenick",
    },
    {
      keys: ["marzahn", "hellersdorf", "biesdorf", "kaulsdorf", "mahlsdorf", "12619", "12621", "12623", "12627", "12629", "12679", "12681", "12683", "12685", "12687", "12689"],
      lat: 52.5363,
      lon: 13.6047,
      label: "Marzahn-Hellersdorf",
    },
    {
      keys: ["lichtenberg", "hohenschoenhausen", "hohenschonhausen", "friedrichsfelde", "karlshorst", "10315", "10317", "10318", "10319", "10365", "10367", "10369", "13051", "13053", "13055", "13057", "13059"],
      lat: 52.5265,
      lon: 13.4987,
      label: "Lichtenberg",
    },
    {
      keys: ["reinickendorf", "tegel", "wittenau", "frohnau", "hermsdorf", "maerkisches viertel", "markisches viertel", "13403", "13405", "13407", "13409", "13435", "13437", "13439", "13465", "13467", "13469"],
      lat: 52.5897,
      lon: 13.2877,
      label: "Reinickendorf",
    },
  ];

  for (const area of areas) {
    if (area.keys.some((k) => text.includes(normalizeText(k)))) {
      return {
        lat: area.lat,
        lon: area.lon,
        display_name: area.label,
      };
    }
  }

  // Niemals null zurückgeben -> Berlin-Mitte als Fallback
  return {
    lat: 52.5208,
    lon: 13.4095,
    display_name: "Berlin Mitte (Fallback)",
  };
}

async function fetchCompetitionAround(lat, lon, radius = 800) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="fast_food"](around:${radius},${lat},${lon});
      way["amenity"="fast_food"](around:${radius},${lat},${lon});
      relation["amenity"="fast_food"](around:${radius},${lat},${lon});

      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center tags;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "BurgerCityDashboard/1.0",
    },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass error ${res.status}`);
  }

  const data = await res.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const namesSeen = new Set();
  let fastFoodCompetitors = 0;
  let restaurantCompetitors = 0;

  for (const el of elements) {
    const amenity = el.tags?.amenity;
    const name = String(el.tags?.name || `${amenity}-${el.id}`).trim();
    const dedupeKey = `${amenity}:${name.toLowerCase()}`;

    if (namesSeen.has(dedupeKey)) continue;
    namesSeen.add(dedupeKey);

    if (amenity === "fast_food") fastFoodCompetitors += 1;
    if (amenity === "restaurant") restaurantCompetitors += 1;
  }

  return {
    fastFoodCompetitors,
    restaurantCompetitors,
    totalCompetitors: fastFoodCompetitors + restaurantCompetitors,
  };
}

router.post("/location-intel", async (req, res) => {
  try {
    const { stores = [], radius = 800 } = req.body || {};
    const results = [];

    console.log("Incoming stores:", JSON.stringify(stores, null, 2));

    for (const s of stores) {
      const geo = resolveBerlinCoords({
        store: s.store,
        district: s.district,
        postal_code: s.postal_code,
      });

      const comp = await fetchCompetitionAround(geo.lat, geo.lon, radius);

      results.push({
        store: s.store,
        district: s.district || "",
        postal_code: s.postal_code || "",
        lat: geo.lat,
        lon: geo.lon,
        geocodedFrom: geo.display_name,
        ...comp,
      });

      await sleep(250);
    }

    res.json({ ok: true, rows: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: "Standortanalyse konnte nicht geladen werden.",
    });
  }
});

module.exports = router;
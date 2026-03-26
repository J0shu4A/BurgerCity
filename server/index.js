require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");


const app = express();

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const PORT = process.env.PORT || 5174;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const COOKIE_NAME = process.env.COOKIE_NAME || "eroglu_session";

const DATA_DIR = path.join(__dirname, "data");
const LATEST_JSON = path.join(DATA_DIR, "latest.json");
const LATEST_CSV = path.join(DATA_DIR, "latest.csv");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ------------------------------------------------ */
/* SIMPLE IN-MEMORY USER (für Start garantiert OK) */
/* ------------------------------------------------ */

const users = [
  {
    id: "u1",
    username: "admin",
    // Passwort: eroglu2026
    passwordHash: bcrypt.hashSync("eroglu2026", 10),
    role: "admin",
  },
];

/* ---------------- AUTH HELPERS ---------------- */

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 12,
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "UNAUTHENTICATED" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "INVALID_SESSION" });
  }
}

function toCSV(rows) {
  if (!rows.length) return "";

  const header = Object.keys(rows[0]);

  const escapeValue = (value) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = rows.map((row) =>
    header.map((col) => escapeValue(row[col])).join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

/* ---------------- BASIC ROUTES ---------------- */

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/* ---------------- AUTH ROUTES ---------------- */

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "MISSING_FIELDS" });
  }

  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: "BAD_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "BAD_CREDENTIALS" });

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  setSessionCookie(res, token);

  res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

/* ---------------- DATA / GENERATOR ROUTES ---------------- */

app.get("/api/stores", requireAuth, (req, res) => {
  res.json({
    ok: true,
    stores: STORES,
  });
});

app.post("/api/generate", requireAuth, (req, res) => {
  const { startDate, endDate } = req.body || {};

  const data = generateOrders({
    startDate: startDate || "2025-09-01",
    endDate: endDate || "2026-02-28",
  });

  fs.writeFileSync(LATEST_JSON, JSON.stringify(data, null, 2), "utf-8");
  fs.writeFileSync(LATEST_CSV, toCSV(data), "utf-8");

  res.json({
    ok: true,
    rows: data.length,
    orders: new Set(data.map((r) => r.order_id)).size,
    stores: [...new Set(data.map((r) => r.store))].length,
    generatedAt: new Date().toISOString(),
    data,
  });
});

app.get("/api/latest", requireAuth, (req, res) => {
  if (!fs.existsSync(LATEST_JSON)) {
    return res.status(404).json({
      ok: false,
      message: "Noch keine Daten generiert.",
    });
  }

  const data = JSON.parse(fs.readFileSync(LATEST_JSON, "utf-8"));

  res.json({
    ok: true,
    rows: data.length,
    orders: new Set(data.map((r) => r.order_id)).size,
    data,
  });
});

app.get("/api/download-csv", requireAuth, (req, res) => {
  if (!fs.existsSync(LATEST_CSV)) {
    return res.status(404).send("Noch keine CSV generiert.");
  }

  res.download(LATEST_CSV, "burgercity_latest.csv");
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log("===================================");
  console.log("🚀 AUTH + DATA SERVER RUNNING");
  console.log("👉 http://localhost:" + PORT);
  console.log("Login:");
  console.log("User: admin");
  console.log("Pass: eroglu2026");
  console.log("===================================");
});
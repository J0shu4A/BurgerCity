const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_PATH = path.join(__dirname, "users.json");

function readUsers() {
  const raw = fs.readFileSync(USERS_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

function findByUsername(username) {
  const db = readUsers();
  return db.users.find((u) => u.username === username) || null;
}

async function ensureAdminPassword() {
  // Wenn passwordHash leer ist, setze Default-PW: eroglu2026
  const db = readUsers();
  const admin = db.users.find((u) => u.username === "admin");
  if (!admin) return;

  if (!admin.passwordHash) {
    admin.passwordHash = await bcrypt.hash("eroglu2026", 12);
    writeUsers(db);
    console.log("✅ admin password initialized to: eroglu2026 (change it!)");
  }
}

module.exports = {
  readUsers,
  writeUsers,
  findByUsername,
  ensureAdminPassword,
};

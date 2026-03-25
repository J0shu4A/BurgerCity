const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.[process.env.COOKIE_NAME || "eroglu_session"];
  if (!token) return res.status(401).json({ error: "UNAUTHENTICATED" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // {sub, username, role}
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_SESSION" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

module.exports = { requireAuth, requireRole };

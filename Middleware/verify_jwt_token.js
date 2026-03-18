// File: Middleware/verify_jwt_token.js
const jwt = require("jsonwebtoken");
const db = require("../Model/index.js");

const User = db.user;

function extractToken(req) {
  // 1) Authorization: Bearer xxx
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === "string") {
    const parts = auth.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  // 2) token header (your old way)
  if (req.headers.token) return req.headers.token;

  // 3) x-access-token (common)
  if (req.headers["x-access-token"]) return req.headers["x-access-token"];

  return null;
}

module.exports = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        status: 401,
        message: "JWT token not provided. Use Authorization: Bearer <token>",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // extra expiration check (jwt.verify already checks exp if present)
    if (decoded?.exp && decoded.exp <= Date.now() / 1000) {
      return res.status(401).json({ status: 401, message: "JWT token has expired" });
    }

    // Find user in DB
    const user = await User.findOne({
      where: { id: decoded.user_id, email: decoded.email },
      attributes: ["id", "email", "role", "status"],
    });

    if (!user) {
      return res.status(403).json({ status: 403, message: "User does not exist" });
    }

    if (user.status && user.status !== "ACTIVE") {
      return res.status(403).json({ status: 403, message: "Account is not active" });
    }

    // ✅ Controllers will use this
    req.user = {
      user_id: user.id,
      email: user.email,
      role: user.role || "USER",
    };

    // optional: keep decoded also
    req.decodedToken = decoded;

    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(401).json({
      status: 401,
      message: "Invalid JWT token or session expired",
    });
  }
};
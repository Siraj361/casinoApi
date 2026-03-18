// File: Controller/ReferralTrackingController/ReferralTrackingController.js
const crypto = require("crypto");
const db = require("../../Model/index.js");

const User = db.user;
const ReferralClick = db.referralClick;

function hashValue(v) {
  const salt = process.env.IP_HASH_SALT || "default_salt";
  return crypto.createHash("sha256").update(String(v) + salt).digest("hex");
}

// POST /api/referral/track-click  { code, domain }
const trackClick = async (req, res) => {
  try {
    const code = (req.body.code || "").trim();
    const domain = (req.body.domain || "").trim() || null;

    if (!code) return res.status(400).json({ error: "code is required" });

    const referrer = await User.findOne({ where: { referral_code: code } });
    if (!referrer) return res.status(404).json({ error: "Invalid referral code" });

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
    const ua = req.headers["user-agent"] || "";

    await ReferralClick.create({
      referrer_user_id: referrer.id,
      domain,
      ip_hash: ip ? hashValue(ip) : null,
      ua_hash: ua ? hashValue(ua) : null,
    });

    return res.status(200).json({ message: "Click tracked" });
  } catch (e) {
    console.error("trackClick:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { trackClick };
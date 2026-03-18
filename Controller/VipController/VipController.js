// File: Controller/VipController/VipController.js
const db = require("../../Model/index.js");
const VipTier = db.vipTier;
const UserVip = db.userVip;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

const listTiers = async (req, res) => {
  try {
    const rows = await VipTier.findAll({ order: [["min_volume_atomic", "ASC"]] });
    return res.status(200).json({ message: "VIP tiers fetched", data: rows });
  } catch (e) {
    console.error("listTiers:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getMyVip = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const row = await UserVip.findOne({
      where: { user_id: userId },
      include: [{ model: VipTier, as: "tier" }],
    });

    return res.status(200).json({ message: "My VIP fetched", data: row || null });
  } catch (e) {
    console.error("getMyVip:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { listTiers, getMyVip };
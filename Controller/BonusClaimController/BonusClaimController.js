// File: Controller/BonusClaimController/BonusClaimController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const BonusClaim = db.bonusClaim;
const Bonus = db.bonus;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

const listScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const listMyBonusClaims = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const rows = await BonusClaim.findAll({
      where: { user_id: userId },
      include: [{ model: Bonus, as: "bonus" }],
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Bonus claims fetched", data: rows });
  } catch (e) {
    console.error("listMyBonusClaims:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { listMyBonusClaims };
// File: Controller/BonusController/BonusController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const Bonus = db.bonus;
const BonusClaim = db.bonusClaim;
const Wallet = db.wallet;


function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function ensureDemo(res) {
  if ((process.env.APP_MODE || "DEMO").toUpperCase() !== "DEMO") {
    res.status(501).json({
      error: "Bonus crediting disabled here for production. Implement compliant bonus rules.",
    });
    return false;
  }
  return true;
}

const claimScheme = Joi.object({
  code: Joi.string().min(2).max(50).required(),
  currency_network_id: Joi.number().integer().allow(null).optional(), // only needed if bonus has null currency_network_id
});

const listBonuses = async (req, res) => {
  try {
    const now = new Date();
    const rows = await Bonus.findAll({
      where: {}, // you can filter by starts/ends in UI
      order: [["id", "DESC"]],
    });

    // simple filter in JS (works for any dialect)
    const active = rows.filter((b) => {
      if (b.starts_at && new Date(b.starts_at) > now) return false;
      if (b.ends_at && new Date(b.ends_at) < now) return false;
      return true;
    });

    return res.status(200).json({ message: "Bonuses fetched", data: active });
  } catch (err) {
    console.error("List Bonuses Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const claimBonus = async (req, res) => {
  if (!ensureDemo(res)) return;

  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = claimScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const bonus = await Bonus.findOne({ where: { code: value.code }, transaction: t });
    if (!bonus) {
      await t.rollback();
      return res.status(404).json({ error: "Invalid bonus code" });
    }

    // prevent double claim
    const already = await BonusClaim.findOne({
      where: { user_id: userId, bonus_id: bonus.id },
      transaction: t,
    });
    if (already) {
      await t.rollback();
      return res.status(400).json({ error: "Bonus already claimed" });
    }

    // decide currency network
    const currencyNetworkId = bonus.currency_network_id || value.currency_network_id;
    if (!currencyNetworkId) {
      await t.rollback();
      return res.status(400).json({ error: "currency_network_id required for this bonus" });
    }

    const claim = await BonusClaim.create(
      { bonus_id: bonus.id, user_id: userId, status: "CLAIMED", wagered_atomic: "0" },
      { transaction: t }
    );

    // credit wallet
    const wallet = await Wallet.findOne({
      where: { user_id: userId, currency_network_id: currencyNetworkId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!wallet) {
      await t.rollback();
      return res.status(400).json({ error: "Wallet not found for this currency network" });
    }

    const newBal = (BigInt(wallet.balance_atomic.toString()) + BigInt(bonus.bonus_amount_atomic.toString())).toString();

    await Wallet.update(
      { balance_atomic: newBal },
      { where: { id: wallet.id }, transaction: t }
    );

    await Ledger.create(
      {
        user_id: userId,
        currency_network_id: currencyNetworkId,
        txn_type: "BONUS_CREDIT",
        amount_atomic: bonus.bonus_amount_atomic.toString(),
        comments: `Bonus claimed: ${bonus.code}`,
        ref_table: "bonus_claims",
        ref_id: claim.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Bonus claimed", claim });
  } catch (err) {
    await t.rollback();
    console.error("Claim Bonus Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { listBonuses, claimBonus };
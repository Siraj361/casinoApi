// File: Controller/ReferralController/ReferralController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const User = db.user;
const Referral = db.referral;
const ReferralClick = db.referralClick;
const ReferralCommission = db.referralCommission;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

const applyRefScheme = Joi.object({
  code: Joi.string().min(2).max(50).required(),
});

const getMyReferral = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "referral_code", "username", "email"],
    });

    return res.status(200).json({
      message: "Referral fetched",
      data: { referral_code: user?.referral_code || null },
    });
  } catch (err) {
    console.error("Get Referral Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const applyReferralCode = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = applyRefScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const me = await User.findOne({ where: { id: userId }, transaction: t });
    if (!me) {
      await t.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    const referrer = await User.findOne({
      where: { referral_code: value.code },
      transaction: t,
    });

    if (!referrer) {
      await t.rollback();
      return res.status(404).json({ error: "Invalid referral code" });
    }

    if (referrer.id === me.id) {
      await t.rollback();
      return res.status(400).json({ error: "You cannot refer yourself" });
    }

    const already = await Referral.findOne({
      where: { referred_user_id: me.id },
      transaction: t,
    });

    if (already) {
      await t.rollback();
      return res.status(400).json({ error: "Referral already applied" });
    }

    const row = await Referral.create(
      { referrer_user_id: referrer.id, referred_user_id: me.id },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Referral applied", data: row });
  } catch (err) {
    await t.rollback();
    console.error("Apply Referral Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getReferralStats = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const totalReferrals = await Referral.count({ where: { referrer_user_id: userId } });
    const totalClicks = await ReferralClick.count({ where: { referrer_user_id: userId } });

    const commissions = await ReferralCommission.findAll({
      where: { referrer_user_id: userId },
      attributes: ["amount_atomic", "currency_network_id"],
    });

    return res.status(200).json({
      message: "Referral stats fetched",
      data: { totalReferrals, totalClicks, commissions },
    });
  } catch (err) {
    console.error("Referral Stats Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getMyReferral, applyReferralCode, getReferralStats };
// File: Controller/AdminCrudController/AdminCrudController.js
const Joi = require("joi");
const { Op } = require("sequelize");
const db = require("../../Model/index.js");

const User = db.user;
const Game = db.game;
const Bonus = db.bonus;
const VipTier = db.vipTier;
const AppSetting = db.appSetting;
const Currency = db.currency;
const CurrencyNetwork = db.currencyNetwork;
const Bet = db.bet;


// ---------- helpers ----------
function now() { return new Date(); }

// ---------- schemas ----------
const gameCreate = Joi.object({
  code: Joi.string().min(2).max(20).required(),
  name: Joi.string().min(2).max(50).required(),
  house_edge_bps: Joi.number().integer().min(0).max(5000).default(100),
  is_active: Joi.boolean().default(true),
});
const gameUpdate = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  house_edge_bps: Joi.number().integer().min(0).max(5000).optional(),
  is_active: Joi.boolean().optional(),
});

const bonusCreate = Joi.object({
  code: Joi.string().min(2).max(50).required(),
  bonus_type: Joi.string().min(2).max(30).required(),
  currency_network_id: Joi.number().integer().allow(null).optional(),
  bonus_amount_atomic: Joi.string().required(),
  rollover_required_atomic: Joi.string().default("0"),
  starts_at: Joi.date().iso().allow(null).optional(),
  ends_at: Joi.date().iso().allow(null).optional(),
  max_uses: Joi.number().integer().allow(null).optional(),
});
const bonusUpdate = Joi.object({
  bonus_type: Joi.string().min(2).max(30).optional(),
  currency_network_id: Joi.number().integer().allow(null).optional(),
  bonus_amount_atomic: Joi.string().optional(),
  rollover_required_atomic: Joi.string().optional(),
  starts_at: Joi.date().iso().allow(null).optional(),
  ends_at: Joi.date().iso().allow(null).optional(),
  max_uses: Joi.number().integer().allow(null).optional(),
});

const vipCreate = Joi.object({
  name: Joi.string().min(2).max(30).required(),
  min_volume_atomic: Joi.string().default("0"),
  rakeback_bps: Joi.number().integer().min(0).max(5000).default(0),
});
const vipUpdate = Joi.object({
  name: Joi.string().min(2).max(30).optional(),
  min_volume_atomic: Joi.string().optional(),
  rakeback_bps: Joi.number().integer().min(0).max(5000).optional(),
});

const settingUpsert = Joi.object({
  key: Joi.string().min(2).max(100).required(),
  value: Joi.string().allow("").required(),
});

const currencyCreate = Joi.object({
  code: Joi.string().min(2).max(10).required(),
  decimals: Joi.number().integer().min(0).max(30).required(),
  is_active: Joi.boolean().default(true),
});
const currencyUpdate = Joi.object({
  decimals: Joi.number().integer().min(0).max(30).optional(),
  is_active: Joi.boolean().optional(),
});

const networkCreate = Joi.object({
  currency_id: Joi.number().integer().required(),
  network: Joi.string().min(2).max(20).required(),
  display_name: Joi.string().min(2).max(50).required(),
  token_contract: Joi.string().allow(null, "").optional(),
  min_confirmations: Joi.number().integer().min(0).max(1000).default(1),
  is_active: Joi.boolean().default(true),
});
const networkUpdate = Joi.object({
  display_name: Joi.string().min(2).max(50).optional(),
  token_contract: Joi.string().allow(null, "").optional(),
  min_confirmations: Joi.number().integer().min(0).max(1000).optional(),
  is_active: Joi.boolean().optional(),
});

const userUpdate = Joi.object({
  status: Joi.string().valid("ACTIVE", "SUSPENDED").optional(),
  role: Joi.string().valid("USER", "ADMIN").optional(),
});

// ---------- bets schema ----------
const betListSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  game_code: Joi.string().allow("", null).optional(),
  from: Joi.date().iso().allow("", null).optional(),
  to: Joi.date().iso().allow("", null).optional(),
  user_id: Joi.number().integer().allow(null).optional(),
});

// ---------- Games ----------
const adminListGames = async (req, res) => {
  const rows = await Game.findAll({ order: [["id", "ASC"]] });
  return res.status(200).json({ message: "Games", data: rows });
};
const adminCreateGame = async (req, res) => {
  const { error, value } = gameCreate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const row = await Game.create({
    code: value.code.toUpperCase(),
    name: value.name,
    house_edge_bps: value.house_edge_bps,
    is_active: value.is_active,
    updated_at: now(),
  });
  return res.status(200).json({ message: "Game created", data: row });
};
const adminUpdateGame = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = gameUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await Game.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await Game.findOne({ where: { id } });
  return res.status(200).json({ message: "Game updated", data: row });
};

// ---------- Bonuses ----------
const adminListBonuses = async (req, res) => {
  const rows = await Bonus.findAll({ order: [["id", "DESC"]] });
  return res.status(200).json({ message: "Bonuses", data: rows });
};
const adminCreateBonus = async (req, res) => {
  const { error, value } = bonusCreate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const row = await Bonus.create({ ...value, updated_at: now() });
  return res.status(200).json({ message: "Bonus created", data: row });
};
const adminUpdateBonus = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = bonusUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await Bonus.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await Bonus.findOne({ where: { id } });
  return res.status(200).json({ message: "Bonus updated", data: row });
};

// ---------- VIP ----------
const adminListVipTiers = async (req, res) => {
  const rows = await VipTier.findAll({ order: [["min_volume_atomic", "ASC"]] });
  return res.status(200).json({ message: "VIP tiers", data: rows });
};
const adminCreateVipTier = async (req, res) => {
  const { error, value } = vipCreate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const row = await VipTier.create({ ...value, updated_at: now() });
  return res.status(200).json({ message: "VIP tier created", data: row });
};
const adminUpdateVipTier = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = vipUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await VipTier.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await VipTier.findOne({ where: { id } });
  return res.status(200).json({ message: "VIP tier updated", data: row });
};

// ---------- Settings ----------
const adminListSettings = async (req, res) => {
  const rows = await AppSetting.findAll({ order: [["key", "ASC"]] });
  return res.status(200).json({ message: "Settings", data: rows });
};
const adminUpsertSetting = async (req, res) => {
  const { error, value } = settingUpsert.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const existing = await AppSetting.findOne({ where: { key: value.key } });
  if (!existing) {
    const row = await AppSetting.create({ key: value.key, value: value.value, updated_at: now() });
    return res.status(200).json({ message: "Setting created", data: row });
  }

  await AppSetting.update({ value: value.value, updated_at: now() }, { where: { key: value.key } });
  const row = await AppSetting.findOne({ where: { key: value.key } });
  return res.status(200).json({ message: "Setting updated", data: row });
};

// ---------- Currencies ----------
const adminListCurrencies = async (req, res) => {
  const rows = await Currency.findAll({ order: [["id", "ASC"]] });
  return res.status(200).json({ message: "Currencies", data: rows });
};
const adminCreateCurrency = async (req, res) => {
  const { error, value } = currencyCreate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const row = await Currency.create({
    code: value.code.toUpperCase(),
    decimals: value.decimals,
    is_active: value.is_active,
    updated_at: now(),
  });
  return res.status(200).json({ message: "Currency created", data: row });
};
const adminUpdateCurrency = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = currencyUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await Currency.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await Currency.findOne({ where: { id } });
  return res.status(200).json({ message: "Currency updated", data: row });
};

const adminListNetworks = async (req, res) => {
  const rows = await CurrencyNetwork.findAll({ order: [["id", "ASC"]] });
  return res.status(200).json({ message: "Networks", data: rows });
};
const adminCreateNetwork = async (req, res) => {
  const { error, value } = networkCreate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const row = await CurrencyNetwork.create({ ...value, updated_at: now() });
  return res.status(200).json({ message: "Network created", data: row });
};
const adminUpdateNetwork = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = networkUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await CurrencyNetwork.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await CurrencyNetwork.findOne({ where: { id } });
  return res.status(200).json({ message: "Network updated", data: row });
};

// ---------- Bets ----------
const adminListBets = async (req, res) => {
  try {
    const { error, value } = betListSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }

    if (value.game_code) {
      const game = await Game.findOne({
        where: { code: value.game_code.toUpperCase() }
      });
      if (game) where.game_id = game.id;
    }

    if (value.user_id) {
      where.user_id = value.user_id;
    }

    const rows = await Bet.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    const data = rows.map((row) => {
      const item = row.toJSON();

      let parsedMeta = item.meta_json;
      try {
        if (typeof item.meta_json === "string") {
          parsedMeta = JSON.parse(item.meta_json);
        }
      } catch (e) {
        parsedMeta = item.meta_json;
      }

      return {
        id: item.id,
        user_id: item.user_id,
        comments:
          parsedMeta && typeof parsedMeta === "object"
            ? JSON.stringify(parsedMeta)
            : item.meta_json || "-",
        txn_type: item.status || "-",
        amount: item.wager_atomic ?? 0,
        payout: item.payout_atomic ?? 0,
        status: item.status || "-",
        created_at: item.created_at,
      };
    });

    return res.status(200).json({ message: "Bets", data });
  } catch (e) {
    console.error("adminListBets:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ---------- Users ----------
const adminListUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const where = {};
    if (q) {
      where[Op.or] = [
        { email: { [Op.like]: `%${q}%` } },
        { username: { [Op.like]: `%${q}%` } },
        { referral_code: { [Op.like]: `%${q}%` } },
      ];
    }

    const rows = await User.findAll({
      where,
      attributes: ["id", "email", "username", "status", "role", "email_verified", "referral_code", "created_at"],
      order: [["id", "DESC"]],
      limit: 200,
    });

    return res.status(200).json({ message: "Users", data: rows });
  } catch (e) {
    console.error("adminListUsers:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const adminUpdateUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = userUpdate.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  await User.update({ ...value, updated_at: now() }, { where: { id } });
  const row = await User.findOne({
    where: { id },
    attributes: ["id", "email", "username", "status", "role", "email_verified", "referral_code", "created_at"],
  });

  return res.status(200).json({ message: "User updated", data: row });
};

module.exports = {
  adminListGames,
  adminCreateGame,
  adminUpdateGame,

  adminListBonuses,
  adminCreateBonus,
  adminUpdateBonus,

  adminListVipTiers,
  adminCreateVipTier,
  adminUpdateVipTier,

  adminListSettings,
  adminUpsertSetting,

  adminListCurrencies,
  adminCreateCurrency,
  adminUpdateCurrency,
  adminListNetworks,
  adminCreateNetwork,
  adminUpdateNetwork,

  adminListBets,

  adminListUsers,
  adminUpdateUser,
};
// ✅ ADMIN ANALYTICS: Platform Profit Controller

// File: Controller/AdminController/PlatformProfitController.js

const db = require("../../Model/index.js");
const Joi = require("joi");
const { Op } = require("sequelize");

const PlatformProfit = db.platformProfit;
const User = db.user;
const Game = db.game;
const CurrencyNetwork = db.currencyNetwork;
const Bet = db.bet;

// ============================================
// Helper Functions
// ============================================

function getAuthUserId(req) {
  const id = req.user?.user_id || req.user?.id || req.userId || req.user_id;
  return id != null ? String(id) : null;
}

function toSafeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function atomicToDisplay(amountAtomic, decimals) {
  const raw = String(amountAtomic ?? "0");
  const safeDecimals = Math.max(0, Number(decimals) || 0);

  if (safeDecimals <= 0) {
    return Number(raw || 0);
  }

  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  const normalized = digits.padStart(safeDecimals + 1, "0");
  const whole = normalized.slice(0, -safeDecimals) || "0";
  const fraction = normalized.slice(-safeDecimals).replace(/0+$/, "");
  const display = fraction ? `${whole}.${fraction}` : whole;

  return Number(negative ? `-${display}` : display);
}

// ============================================
// 1️⃣ GET TOTAL PLATFORM PROFITS
// ============================================

const getTotalProfitsSchema = Joi.object({
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  commission_type: Joi.string().optional(),
  currency_network_id: Joi.number().optional(),
});

const getTotalProfits = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // TODO: Add admin role check
    // if (!isAdmin(userId)) return res.status(403).json({ error: "Forbidden" });

    const { error, value } = getTotalProfitsSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }
    if (value.commission_type) where.commission_type = value.commission_type;
    if (value.currency_network_id) where.currency_network_id = value.currency_network_id;

    const [totalRecords, totalCommissionAtomic, avgCommissionAtomic] =
      await Promise.all([
        PlatformProfit.count({ where }),
        PlatformProfit.sum("commission_atomic", { where }),
        PlatformProfit.avg("commission_atomic", { where }),
      ]);

    const totalCommission = toSafeNumber(totalCommissionAtomic);
    const avgCommission = toSafeNumber(avgCommissionAtomic);

    return res.status(200).json({
      message: "Platform profits fetched",
      data: {
        totalRecords,
        totalCommissionAtomic: String(totalCommissionAtomic || "0"),
        totalCommission,
        avgCommission,
        period: {
          from: value.from,
          to: value.to,
        },
      },
    });
  } catch (e) {
    console.error("getTotalProfits:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 2️⃣ GET PROFITS BY GAME
// ============================================

const getProfitsByGameSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
});

const getProfitsByGame = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = getProfitsByGameSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }

    const groups = await PlatformProfit.findAll({
      attributes: [
        "game_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "recordCount"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "totalCommissionAtomic"],
      ],
      where,
      include: [
        {
          model: Game,
          as: "game",
          attributes: ["id", "code", "name"],
        },
      ],
      group: ["game_id"],
      order: [
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "DESC"],
      ],
      limit: value.limit,
      offset: value.offset,
      subQuery: false,
      raw: false,
    });

    const data = groups.map((group) => ({
      gameId: group.game_id,
      gameCode: group.game?.code,
      gameName: group.game?.name,
      recordCount: toSafeNumber(group.get("recordCount")),
      totalCommissionAtomic: String(group.get("totalCommissionAtomic") || "0"),
      totalCommission: toSafeNumber(group.get("totalCommissionAtomic")),
    }));

    return res.status(200).json({
      message: "Profits by game fetched",
      data,
    });
  } catch (e) {
    console.error("getProfitsByGame:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 3️⃣ GET PROFITS BY CURRENCY
// ============================================

const getProfitsByCurrencySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
});

const getProfitsByCurrency = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = getProfitsByCurrencySchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }

    const groups = await PlatformProfit.findAll({
      attributes: [
        "currency_network_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "recordCount"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "totalCommissionAtomic"],
      ],
      where,
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          attributes: ["id", "currency", "network_name"],
        },
      ],
      group: ["currency_network_id"],
      order: [
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "DESC"],
      ],
      limit: value.limit,
      offset: value.offset,
      subQuery: false,
      raw: false,
    });

    const data = groups.map((group) => ({
      currencyNetworkId: group.currency_network_id,
      currency: group.currencyNetwork?.currency,
      network: group.currencyNetwork?.network_name,
      recordCount: toSafeNumber(group.get("recordCount")),
      totalCommissionAtomic: String(group.get("totalCommissionAtomic") || "0"),
      totalCommission: toSafeNumber(group.get("totalCommissionAtomic")),
    }));

    return res.status(200).json({
      message: "Profits by currency fetched",
      data,
    });
  } catch (e) {
    console.error("getProfitsByCurrency:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 4️⃣ GET DAILY PROFIT TRENDS
// ============================================

const getDailyTrendsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
  currency_network_id: Joi.number().optional(),
});

const getDailyTrends = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = getDailyTrendsSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - value.days);

    const where = {
      created_at: {
        [Op.gte]: daysAgo,
      },
    };
    if (value.currency_network_id) where.currency_network_id = value.currency_network_id;

    const daily = await PlatformProfit.findAll({
      attributes: [
        [db.sequelize.fn("DATE", db.sequelize.col("created_at")), "day"],
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "transactionCount"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "totalCommissionAtomic"],
        [db.sequelize.fn("AVG", db.sequelize.col("commission_atomic")), "avgCommissionAtomic"],
      ],
      where,
      group: [[db.sequelize.fn("DATE", db.sequelize.col("created_at"))]],
      order: [[db.sequelize.fn("DATE", db.sequelize.col("created_at")), "ASC"]],
      raw: true,
    });

    const data = daily.map((d) => ({
      day: d.day,
      transactions: toSafeNumber(d.transactionCount),
      totalCommissionAtomic: String(d.totalCommissionAtomic || "0"),
      totalCommission: toSafeNumber(d.totalCommissionAtomic),
      avgCommission: toSafeNumber(d.avgCommissionAtomic),
    }));

    return res.status(200).json({
      message: "Daily profit trends fetched",
      data,
    });
  } catch (e) {
    console.error("getDailyTrends:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 5️⃣ GET TOP LOSS MAKERS (By Commission)
// ============================================

const getTopLosersSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
});

const getTopLosers = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = getTopLosersSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {
      commission_type: "bet_loss",
    };
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }

    const topLosers = await PlatformProfit.findAll({
      attributes: [
        "user_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "lossCount"],
        [db.sequelize.fn("SUM", db.sequelize.col("bet_amount_atomic")), "totalLostAtomic"],
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "totalCommissionAtomic"],
      ],
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email"],
        },
      ],
      group: ["user_id"],
      order: [
        [db.sequelize.fn("SUM", db.sequelize.col("commission_atomic")), "DESC"],
      ],
      limit: value.limit,
      subQuery: false,
      raw: false,
    });

    const data = topLosers.map((loser) => ({
      userId: loser.user_id,
      username: loser.user?.username,
      email: loser.user?.email,
      losses: toSafeNumber(loser.get("lossCount")),
      totalLostAtomic: String(loser.get("totalLostAtomic") || "0"),
      totalLost: toSafeNumber(loser.get("totalLostAtomic")),
      totalCommissionAtomic: String(loser.get("totalCommissionAtomic") || "0"),
      totalCommission: toSafeNumber(loser.get("totalCommissionAtomic")),
    }));

    return res.status(200).json({
      message: "Top losers fetched",
      data,
    });
  } catch (e) {
    console.error("getTopLosers:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 6️⃣ GET DETAILED PROFIT RECORDS
// ============================================

const listProfitsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  user_id: Joi.number().optional(),
  game_id: Joi.number().optional(),
  commission_type: Joi.string().optional(),
});

const listProfits = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listProfitsSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }
    if (value.user_id) where.user_id = value.user_id;
    if (value.game_id) where.game_id = value.game_id;
    if (value.commission_type) where.commission_type = value.commission_type;

    const records = await PlatformProfit.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username"],
        },
        {
          model: Game,
          as: "game",
          attributes: ["id", "code", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    const data = records.map((record) => ({
      id: record.id,
      betId: record.bet_id,
      user: {
        id: record.user?.id,
        username: record.user?.username,
      },
      game: {
        id: record.game?.id,
        code: record.game?.code,
        name: record.game?.name,
      },
      commissionType: record.commission_type,
      betAmountAtomic: String(record.bet_amount_atomic),
      payoutAtomic: String(record.payout_atomic),
      commissionAtomic: String(record.commission_atomic),
      commissionRateBps: record.commission_rate_bps,
      status: record.status,
      metadata: record.metadata_json,
      createdAt: record.created_at,
    }));

    return res.status(200).json({
      message: "Profit records fetched",
      data,
    });
  } catch (e) {
    console.error("listProfits:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ============================================
// 7️⃣ EXPORT FUNCTIONS
// ============================================

module.exports = {
  getTotalProfits,
  getProfitsByGame,
  getProfitsByCurrency,
  getDailyTrends,
  getTopLosers,
  listProfits,
};

// ============================================
// 8️⃣ ROUTE SETUP EXAMPLE
// ============================================

/*
// File: Routes/AdminRoute/AdminRoute.js

const PlatformProfitController = require("../../Controller/AdminController/PlatformProfitController.js");
const VerifyJWT = require("../../Middleware/verify_jwt_token.js");
const IsAdmin = require("../../Middleware/is_admin.js");

router.get(
  "/profits/total",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.getTotalProfits
);

router.get(
  "/profits/by-game",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.getProfitsByGame
);

router.get(
  "/profits/by-currency",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.getProfitsByCurrency
);

router.get(
  "/profits/daily-trends",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.getDailyTrends
);

router.get(
  "/profits/top-losers",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.getTopLosers
);

router.get(
  "/profits/list",
  VerifyJWT,
  IsAdmin,
  PlatformProfitController.listProfits
);
*/

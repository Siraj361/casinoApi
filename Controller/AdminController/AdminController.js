// File: Controller/AdminController/AdminController.js
const Joi = require("joi");
const db = require("../../Model/index.js");
const crypto = require("crypto");
const { Op } = require("sequelize");
const DepositRequest = db.depositRequest;
const WithdrawalRequest = db.withdrawalRequest;
const Wallet = db.wallet;

const AdminAudit = db.adminAuditLog;
const User = db.user;
const Bet = db.bet;
const Game = db.game;
const CurrencyNetwork = db.currencyNetwork;

const Deposit = db.deposit;



const hasField = (model, field) => {
  return !!model?.rawAttributes?.[field];
};

const pickField = (model, fields = []) => {
  return fields.find((field) => hasField(model, field));
};

const toSafeNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

async function generateUniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = "U-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const exists = await User.findOne({ where: { referral_code: code } });
    if (!exists) return code;
  }
  return "U-" + Date.now();
}

const getDashboardOverview = async (req, res) => {
  try {
    const depositAmountField = pickField(DepositRequest, [
      "claimed_amount_atomic",
      "amount_atomic",
    ]);

    const revenueField = pickField(Bet, [
      "house_profit_atomic",
      "profit_atomic",
      "net_profit_atomic",
      "admin_profit_atomic",
      "amount_atomic",
      "bet_amount_atomic",
      "wager_amount_atomic",
      "stake_atomic",
    ]);

    const totalUsersPromise = User.count();

    const activeUsersPromise = hasField(User, "is_active")
      ? User.count({ where: { is_active: true } })
      : hasField(User, "status")
      ? User.count({
          where: {
            status: {
              [Op.in]: ["ACTIVE", "active"],
            },
          },
        })
      : User.count();

    const totalBetsPromise = Bet.count();

    const pendingWithdrawalsPromise = WithdrawalRequest.count({
      where: hasField(WithdrawalRequest, "status")
        ? { status: "SUBMITTED" }
        : {},
    });

    const totalDepositsPromise = depositAmountField
      ? DepositRequest.sum(depositAmountField, {
          where: hasField(DepositRequest, "status")
            ? { status: "APPROVED" }
            : {},
        })
      : Promise.resolve(0);

    const totalRevenuePromise = revenueField
      ? Bet.sum(revenueField)
      : Promise.resolve(0);

    const [
      totalUsers,
      activeUsers,
      totalBets,
      pendingWithdrawals,
      totalDepositsRaw,
      totalRevenueRaw,
    ] = await Promise.all([
      totalUsersPromise,
      activeUsersPromise,
      totalBetsPromise,
      pendingWithdrawalsPromise,
      totalDepositsPromise,
      totalRevenuePromise,
    ]);

    return res.status(200).json({
      message: "Dashboard overview fetched successfully",
      data: {
        totalUsers: toSafeNumber(totalUsers),
        activeUsers: toSafeNumber(activeUsers),
        totalRevenue: toSafeNumber(totalRevenueRaw),
        totalBets: toSafeNumber(totalBets),
        pendingWithdrawals: toSafeNumber(pendingWithdrawals),
        totalDeposits: toSafeNumber(totalDepositsRaw),
      },
    });
  } catch (e) {
    console.error("getDashboardOverview:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function ensureDemo(res) {
  if ((process.env.APP_MODE || "DEMO").toUpperCase() !== "DEMO") {
    res.status(501).json({ error: "Admin cashier actions disabled in PROD here." });
    return false;
  }
  return true;
}

const listScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().allow("", null).optional(),
});

const reviewScheme = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED").required(),
  review_notes: Joi.string().allow("", null).max(200).optional(),
});

const listDepositRequests = async (req, res) => {
  try {
    const { error, value } = listScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.status) where.status = value.status;

    const rows = await DepositRequest.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Deposit requests fetched", data: rows });
  } catch (e) {
    console.error("listDepositRequests:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};





const listAuditLogs = async (req, res) => {
  try {
    const { error, value } = listScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const rows = await AdminAudit.findAll({
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Audit logs fetched", data: rows });
  } catch (e) {
    console.error("listAuditLogs:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const listUsersScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().allow("", null).optional(),
  status: Joi.string().allow("", null).optional(),
  role: Joi.string().allow("", null).optional(),
});

// const listUsers = async (req, res) => {
//   try {
//     const { error, value } = listUsersScheme.validate(req.query);
//     if (error) return res.status(400).json({ error: error.message });
//     const where = {};
//     if (value.status) {
//       where.status = value.status;
//     }

//     if (value.role) {
//       where.role = value.role;
//     }

//     if (value.search) {
//       where[Op.or] = [
//         { username: { [Op.like]: `%${value.search}%` } },
//         { email: { [Op.like]: `%${value.search}%` } },
//       ];
//     }

//     const result = await User.findAndCountAll({
//       where,
//       attributes: ["id", "username", "email", "status", "role", "created_at"],
//       order: [["created_at", "DESC"]],
//       limit: value.limit,
//       offset: value.offset,
//     });

//     const rows = result.rows.map((user) => ({
//       id: user.id,
//       username: user.username,
//       email: user.email,
//       status: user.status,
//       role: user.role,
//       joined: user.created_at
//         ? new Date(user.created_at).toISOString().split("T")[0]
//         : null,
//       created_at: user.created_at,
//     }));

//     return res.status(200).json({
//       message: "Users fetched successfully",
//       data: rows,
//       pagination: {
//         total: result.count,
//         limit: value.limit,
//         offset: value.offset,
//       },
//     });
//   } catch (e) {
//     console.error("listUsers:", e);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };


const listUsers = async (req, res) => {
  try {
    const { error, value } = listUsersScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });
    
    const where = {};
    if (value.status) where.status = value.status;
    if (value.role) where.role = value.role;

    if (value.search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${value.search}%` } },
        { email: { [Op.like]: `%${value.search}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      attributes: ["id", "username", "email", "status", "role", "created_at"],
      // ✅ Wallet table ko include kiya balance fetch karne ke liye
      include: [
        {
          model: Wallet,
          as: "wallets",
          attributes: ["balance_atomic", "currency_network_id"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
      distinct: true, // Pagination fix jab include use ho raha ho
    });

    const rows = result.rows.map((user) => {
      // ✅ Har user ke wallets ka loop chala kar total ya specific data nikalna
      const userWallets = user.wallets || [];
      
      // Agar aapko total atomic balance dikhana hai:
      const totalBalanceAtomic = userWallets.reduce((acc, w) => {
        return acc + BigInt(w.balance_atomic || "0");
      }, 0n);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        role: user.role,
        joined: user.created_at
          ? new Date(user.created_at).toISOString().split("T")[0]
          : null,
        created_at: user.created_at,
        // ✅ Naya balance field
        wallets: userWallets.map(w => ({
          network_id: w.currency_network_id,
          balance: w.balance_atomic
        })),
        total_balance_atomic: totalBalanceAtomic.toString()
      };
    });

    return res.status(200).json({
      message: "Users fetched successfully with balances",
      data: rows,
      pagination: {
        total: result.count,
        limit: value.limit,
        offset: value.offset,
      },
    });
  } catch (e) {
    console.error("listUsers Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createUserScheme = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "BANNED").default("ACTIVE"),
  role: Joi.string().valid("USER", "ADMIN", "MODERATOR").default("USER"),
});

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: value.username },
          { email: value.email },
        ],
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Hash password (assuming bcrypt is available)
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Generate a unique referral code
    const referralCode = await generateUniqueReferralCode();

    const newUser = await User.create({
      username: value.username,
      email: value.email,
      password_hash: hashedPassword,
      status: value.status,
      role: value.role,
      referral_code: referralCode,
    });

    return res.status(201).json({
      message: "User created successfully",
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        status: newUser.status,
        role: newUser.role,
        referral_code: newUser.referral_code,
        created_at: newUser.created_at,
      },
    });
  } catch (e) {
    console.error("createUser Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserScheme = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "BANNED").optional(),
  role: Joi.string().valid("USER", "ADMIN", "MODERATOR").optional(),
});

const idParamScheme = Joi.object({
  id: Joi.number().integer().required(),
});

const updateUser = async (req, res) => {
  try {
    const { error: paramsError } = idParamScheme.validate(req.params);
    if (paramsError) return res.status(400).json({ error: paramsError.message });

    const { id } = req.params;
    const { error, value } = updateUserScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (value.username) updateData.username = value.username;
    if (value.email) updateData.email = value.email;
    if (value.password) {
      const bcrypt = require('bcrypt');
      updateData.password_hash = await bcrypt.hash(value.password, 10);
    }
    if (value.status) updateData.status = value.status;
    if (value.role) updateData.role = value.role;

    await user.update(updateData);

    return res.status(200).json({
      message: "User updated successfully",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        role: user.role,
        updated_at: user.updated_at,
      },
    });
  } catch (e) {
    console.error("updateUser Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { error: paramsError } = idParamScheme.validate(req.params);
    if (paramsError) return res.status(400).json({ error: paramsError.message });

    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Fix: 'value.id' ko 'id' se replace kiya
    await Wallet.destroy({ where: { user_id: id } });

    await user.destroy();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (e) {
    console.error("deleteUser Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const bettingAnalyticsScheme = Joi.object({
  top: Joi.number().integer().min(1).max(20).default(4),
});

const pickGameNameField = () => {
  const possibleFields = ["name", "title", "game_name", "code", "slug"];
  return possibleFields.find((field) => Game?.rawAttributes?.[field]) || null;
};



const roundTo2 = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const getBettingAnalytics = async (req, res) => {
  try {
    const { error, value } = bettingAnalyticsScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const topLimit = value.top;
    const gameNameField = pickGameNameField();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Top games by total wager
    const topGamesRaw = await Bet.findAll({
      attributes: [
        "game_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "bets_count"],
        [db.sequelize.fn("SUM", db.sequelize.col("wager_atomic")), "total_wager_atomic"],
        [db.sequelize.fn("SUM", db.sequelize.col("payout_atomic")), "total_payout_atomic"],
      ],
      group: ["game_id"],
      order: [[db.sequelize.literal("total_wager_atomic"), "DESC"]],
      limit: topLimit,
      raw: true,
    });

    const gameIds = topGamesRaw.map((row) => row.game_id).filter(Boolean);

    const games = gameIds.length
      ? await Game.findAll({
          where: { id: gameIds },
          raw: true,
        })
      : [];

    const gameMap = new Map(games.map((game) => [Number(game.id), game]));

    const topGames = topGamesRaw.map((row, index) => {
      const game = gameMap.get(Number(row.game_id)) || {};
      const gameName = gameNameField
        ? game[gameNameField] || `Game #${row.game_id}`
        : `Game #${row.game_id}`;

      return {
        rank: index + 1,
        game_id: toSafeNumber(row.game_id),
        game_name: gameName,
        bets_count: toSafeNumber(row.bets_count),
        total_wager_atomic: toSafeNumber(row.total_wager_atomic),
        total_payout_atomic: toSafeNumber(row.total_payout_atomic),
      };
    });

    // Stats
    const [totalBetsToday, totalResolvedBets, totalWonBets, totalWagerRaw, totalPayoutRaw] =
      await Promise.all([
        Bet.count({
          where: {
            created_at: {
              [Op.gte]: startOfToday,
            },
          },
        }),

        Bet.count({
          where: {
            status: {
              [Op.in]: ["won", "lost", "WON", "LOST"],
            },
          },
        }),

        Bet.count({
          where: {
            status: {
              [Op.in]: ["won", "WON"],
            },
          },
        }),

        Bet.sum("wager_atomic"),
        Bet.sum("payout_atomic"),
      ]);

    const totalWager = toSafeNumber(totalWagerRaw);
    const totalPayout = toSafeNumber(totalPayoutRaw);

    const winRate =
      totalResolvedBets > 0
        ? roundTo2((toSafeNumber(totalWonBets) / toSafeNumber(totalResolvedBets)) * 100)
        : 0;

    const houseEdge =
      totalWager > 0
        ? roundTo2(((totalWager - totalPayout) / totalWager) * 100)
        : 0;

    return res.status(200).json({
      message: "Betting analytics fetched successfully",
      data: {
        topGames,
        stats: {
          totalBetsToday: toSafeNumber(totalBetsToday),
          winRate,
          houseEdge,
          totalWagerAtomic: totalWager,
          totalPayoutAtomic: totalPayout,
        },
      },
    });
  } catch (e) {
    console.error("getBettingAnalytics:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const listPaymentsScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().allow("", null).optional(),
  user_id: Joi.number().integer().optional(),
});

const formatStatus = (status) => {
  const s = String(status || "").toLowerCase();

  if (["confirmed", "completed", "approved", "credited", "success"].includes(s)) {
    return "Completed";
  }

  if (["pending", "submitted", "processing"].includes(s)) {
    return "Pending";
  }

  if (["failed", "rejected", "cancelled"].includes(s)) {
    return "Failed";
  }

  return status || "Unknown";
};

const buildTransactionId = (row) => {
  if (row.txid) return row.txid;
  return `DEP-${String(row.id).padStart(4, "0")}`;
};

const getPaymentMethod = (row) => {
  const network =
    row.currencyNetwork?.name ||
    row.currencyNetwork?.network ||
    row.currencyNetwork?.network_name ||
    null;

  const currencyCode =
    row.currencyNetwork?.currency?.code ||
    row.currencyNetwork?.currency?.symbol ||
    row.currencyNetwork?.currency?.name ||
    null;

  if (currencyCode && network) return `${currencyCode} (${network})`;
  if (currencyCode) return currencyCode;
  if (network) return network;

  return "Crypto";
};

const listPayments = async (req, res) => {
  try {
    const { error, value } = listPaymentsScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};

    if (value.status) where.status = value.status;
    if (value.user_id) where.user_id = value.user_id;

    const result = await Deposit.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "email"],
          required: false,
        },
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          required: false,
          // ✅ Currency model ka nested include yahan se remove kar diya gaya hai
        },
      ],
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
      distinct: true,
    });

    const rows = result.rows.map((row) => ({
      id: row.id,
      transactionId: buildTransactionId(row),
      user: row.user?.username || `User #${row.user_id}`,
      email: row.user?.email || null,
      user_id: row.user_id,
      amountAtomic: row.amount_atomic?.toString?.() || String(row.amount_atomic || 0),
      amount: row.amount_atomic?.toString?.() || String(row.amount_atomic || 0),
      method: getPaymentMethod(row),
      status: formatStatus(row.status),
      rawStatus: row.status,
      confirmations: row.confirmations ?? 0,
      txid: row.txid || null,
      toAddress: row.to_address || null,
      fromAddress: row.from_address || null,
      createdAt: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.status(200).json({
      message: "Payments fetched successfully",
      data: rows,
      pagination: {
        total: result.count,
        limit: value.limit,
        offset: value.offset,
      },
    });
  } catch (e) {
    console.error("listPayments Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const listWithdrawalsScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().allow("", null).optional(),
  user_id: Joi.number().integer().optional(),
});

const buildWithdrawalRequestId = (id) => {
  return `WTH${String(id).padStart(3, "0")}`;
};

const formatWithdrawalStatus = (status) => {
  const s = String(status || "").toUpperCase();

  if (s === "SUBMITTED") return "Pending";
  if (s === "APPROVED") return "Approved";
  if (s === "SENT") return "Approved";
  if (s === "PROCESSING") return "Processing";
  if (s === "REJECTED") return "Rejected";

  return status || "Unknown";
};

const listWithdrawals = async (req, res) => {
  try {
    const { error, value } = listWithdrawalsScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {};
    if (value.status) where.status = value.status;
    if (value.user_id) where.user_id = value.user_id;

    const result = await WithdrawalRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "email"],
          required: false,
        },
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          required: false,
          include: [
            {
              model: Currency,
              as: "currency",
              required: false,
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
      distinct: true,
    });

    const rows = result.rows.map((row) => {
      const currencyCode =
        row.currencyNetwork?.currency?.code ||
        row.currencyNetwork?.currency?.symbol ||
        row.currencyNetwork?.currency?.name ||
        null;

      const networkName =
        row.currencyNetwork?.name ||
        row.currencyNetwork?.network ||
        row.currencyNetwork?.network_name ||
        null;

      return {
        id: row.id,
        requestId: buildWithdrawalRequestId(row.id),
        user: row.user?.username || `User #${row.user_id}`,
        email: row.user?.email || null,
        user_id: row.user_id,
        amountAtomic: row.amount_atomic?.toString?.() || String(row.amount_atomic || 0),
        feeAtomic: row.fee_atomic?.toString?.() || String(row.fee_atomic || 0),
        amount: row.amount_atomic?.toString?.() || String(row.amount_atomic || 0),
        currency: currencyCode,
        network: networkName,
        status: formatWithdrawalStatus(row.status),
        rawStatus: row.status,
        toAddress: row.to_address || null,
        txid: row.txid || null,
        reviewedBy: row.reviewed_by || null,
        reviewNotes: row.review_notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return res.status(200).json({
      message: "Withdrawal requests fetched successfully",
      data: rows,
      pagination: {
        total: result.count,
        limit: value.limit,
        offset: value.offset,
      },
    });
  } catch (e) {
    console.error("listWithdrawals:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};




















const analyticsScheme = Joi.object({
  days: Joi.number().integer().min(1).max(30).default(7),
});




const normalizeMethodName = (method) => {
  const value = String(method || "").toLowerCase();

  if (value.includes("card") || value.includes("credit") || value.includes("debit")) {
    return "Credit Card";
  }

  if (value.includes("bank") || value.includes("transfer") || value.includes("wire")) {
    return "Bank Transfer";
  }

  if (
    value.includes("crypto") ||
    value.includes("btc") ||
    value.includes("eth") ||
    value.includes("usdt") ||
    value.includes("usdc")
  ) {
    return "Crypto";
  }

  return method || "Other";
};

const getAnalyticsReports = async (req, res) => {
  try {
    const { error, value } = analyticsScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const days = value.days;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    // -----------------------------
    // Revenue Trend from bets table
    // revenue = wager_atomic - payout_atomic
    // -----------------------------
    const bets = await Bet.findAll({
      attributes: ["id", "wager_atomic", "payout_atomic", "created_at"],
      where: {
        created_at: {
          [Op.gte]: startDate,
        },
      },
      order: [["created_at", "ASC"]],
      raw: true,
    });

    const revenueMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split("T")[0];
      revenueMap[key] = {
        date: key,
        wager: 0,
        payout: 0,
        revenue: 0,
      };
    }

    bets.forEach((bet) => {
      const key = new Date(bet.created_at).toISOString().split("T")[0];
      if (!revenueMap[key]) return;

      const wager = toSafeNumber(bet.wager_atomic);
      const payout = toSafeNumber(bet.payout_atomic);
      const revenue = wager - payout;

      revenueMap[key].wager += wager;
      revenueMap[key].payout += payout;
      revenueMap[key].revenue += revenue;
    });

    const revenueTrend = Object.values(revenueMap);

    // -----------------------------
    // Payment Methods
    // Prefer deposit_requests if method field exists
    // else fallback to deposits table
    // else everything as Crypto
    // -----------------------------
    const depositRequestMethodField = pickField(DepositRequest, [
      "payment_method",
      "method",
      "provider",
      "payment_type",
    ]);

    const depositMethodField = pickField(Deposit, [
      "payment_method",
      "method",
      "provider",
      "payment_type",
    ]);

    let methodSourceRows = [];

    if (depositRequestMethodField) {
      methodSourceRows = await DepositRequest.findAll({
        attributes: [depositRequestMethodField],
        raw: true,
      });
    } else if (depositMethodField) {
      methodSourceRows = await Deposit.findAll({
        attributes: [depositMethodField],
        raw: true,
      });
    } else {
      // current schema fallback: on-chain deposits = Crypto
      const totalDeposits = await Deposit.count();
      methodSourceRows = Array.from({ length: totalDeposits }).map(() => ({
        method_fallback: "Crypto",
      }));
    }

    const methodCountMap = {
      "Credit Card": 0,
      "Crypto": 0,
      "Bank Transfer": 0,
      "Other": 0,
    };

    methodSourceRows.forEach((row) => {
      const rawMethod =
        row[depositRequestMethodField] ||
        row[depositMethodField] ||
        row.method_fallback ||
        "Other";

      const normalized = normalizeMethodName(rawMethod);

      if (methodCountMap[normalized] !== undefined) {
        methodCountMap[normalized] += 1;
      } else {
        methodCountMap["Other"] += 1;
      }
    });

    const totalMethods = Object.values(methodCountMap).reduce((a, b) => a + b, 0);

    const paymentMethods = Object.entries(methodCountMap).map(([method, count]) => ({
      method,
      count,
      percentage: totalMethods > 0 ? Number(((count / totalMethods) * 100).toFixed(2)) : 0,
    }));

    return res.status(200).json({
      message: "Analytics reports fetched successfully",
      data: {
        revenueTrend,
        paymentMethods,
        summary: {
          totalRevenue: revenueTrend.reduce((sum, day) => sum + toSafeNumber(day.revenue), 0),
          totalWager: revenueTrend.reduce((sum, day) => sum + toSafeNumber(day.wager), 0),
          totalPayout: revenueTrend.reduce((sum, day) => sum + toSafeNumber(day.payout), 0),
          periodDays: days,
        },
      },
    });
  } catch (e) {
    console.error("getAnalyticsReports:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
















































const recentActivityScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});



const toSafeString = (value) => {
  if (value === null || value === undefined) return "0";
  return value.toString();
};

const getCurrencyCode = (row) => {
  return (
    row?.currencyNetwork?.currency?.code ||
    row?.currencyNetwork?.currency?.symbol ||
    row?.currencyNetwork?.currency?.name ||
    null
  );
};

const formatTimeAgo = (dateValue) => {
  if (!dateValue) return "";

  const now = new Date();
  const then = new Date(dateValue);
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const buildDisplayAmount = ({ amountAtomic, currencyCode, defaultDollar = false }) => {
  const amount = toSafeString(amountAtomic);

  if (currencyCode) {
    return `${amount} ${currencyCode}`;
  }

  if (defaultDollar) {
    return `$${amount}`;
  }

  return amount;
};

const getRecentActivity = async (req, res) => {
  try {
    const { error, value } = recentActivityScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const limit = value.limit;
    const fetchSize = Math.max(limit, 5);

    const depositRequestAmountField = pickField(DepositRequest, [
      "claimed_amount_atomic",
      "amount_atomic",
    ]);

    const [
      depositRequests,
      withdrawals,
      bets,
      deposits,
    ] = await Promise.all([
      // 1. Deposit Requests
      DepositRequest.findAll({
        attributes: [
          "id", "user_id", "created_at", "updated_at",
          ...(depositRequestAmountField ? [depositRequestAmountField] : []),
        ],
        include: [
          { model: User, attributes: ["id", "username", "email"], required: false },
          { 
            model: CurrencyNetwork, 
            as: "currencyNetwork", 
            required: false 
            // ✅ Currency include yahan se remove kar diya
          },
        ],
        order: [["created_at", "DESC"]],
        limit: fetchSize,
      }),

      // 2. Withdrawal Requests
      WithdrawalRequest.findAll({
        attributes: ["id", "user_id", "amount_atomic", "created_at", "updated_at", "status"],
        include: [
          { model: User, attributes: ["id", "username", "email"], required: false },
          { 
            model: CurrencyNetwork, 
            as: "currencyNetwork", 
            required: false 
            // ✅ Currency include yahan se remove kar diya
          },
        ],
        order: [["created_at", "DESC"]],
        limit: fetchSize,
      }),

      // 3. Bets (No change needed here as it only includes User)
      Bet.findAll({
        attributes: ["id", "user_id", "wager_atomic", "created_at", "updated_at", "status"],
        include: [
          { model: User, as: "user", attributes: ["id", "username", "email"], required: false },
        ],
        order: [["created_at", "DESC"]],
        limit: fetchSize,
      }),

      // 4. Deposits
      Deposit.findAll({
        attributes: ["id", "user_id", "amount_atomic", "created_at", "updated_at", "status"],
        include: [
          { model: User, attributes: ["id", "username", "email"], required: false },
          { 
            model: CurrencyNetwork, 
            as: "currencyNetwork", 
            required: false 
            // ✅ Currency include yahan se remove kar diya
          },
        ],
        order: [["created_at", "DESC"]],
        limit: fetchSize,
      }),
    ]);

    // Data Mapping Logic (Remains mostly the same, but getCurrencyCode 
    // should now look at currencyNetwork.code instead of currencyNetwork.currency.code)
    
    const depositRequestActivities = depositRequests.map((row) => {
      const username = row.user?.username || `User #${row.user_id}`;
      const currencyCode = getCurrencyCode(row); // Ensure this helper uses direct network code
      const amountAtomic = depositRequestAmountField ? row[depositRequestAmountField] : 0;

      return {
        id: row.id,
        sourceTable: "deposit_requests",
        sourceId: row.id,
        type: "deposit",
        user: username,
        email: row.user?.email || null,
        avatar: username?.charAt(0)?.toUpperCase() || "U",
        action: "Deposit",
        amountAtomic: toSafeString(amountAtomic),
        currency: currencyCode,
        displayAmount: buildDisplayAmount({
          amountAtomic,
          currencyCode,
          defaultDollar: !currencyCode,
        }),
        createdAt: row.created_at,
        updated_at: row.updated_at,
        timeAgo: formatTimeAgo(row.created_at),
      };
    });

    // ... mapping for withdrawals, bets, and deposits continues similarly ...
    // (Ensure withdrawalActivities and depositActivities use the updated currencyCode logic)

    const withdrawalActivities = withdrawals.map((row) => {
      const username = row.user?.username || `User #${row.user_id}`;
      const currencyCode = getCurrencyCode(row);

      return {
        id: row.id,
        sourceTable: "withdrawal_requests",
        sourceId: row.id,
        type: "withdrawal_request",
        user: username,
        email: row.user?.email || null,
        avatar: username?.charAt(0)?.toUpperCase() || "U",
        action: "Withdrawal Request",
        amountAtomic: toSafeString(row.amount_atomic),
        currency: currencyCode,
        displayAmount: buildDisplayAmount({
          amountAtomic: row.amount_atomic,
          currencyCode,
          defaultDollar: !currencyCode,
        }),
        rawStatus: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        timeAgo: formatTimeAgo(row.created_at),
      };
    });

    const betActivities = bets.map((row) => {
      const username = row.user?.username || `User #${row.user_id}`;
      return {
        id: row.id,
        sourceTable: "bets",
        sourceId: row.id,
        type: "bet",
        user: username,
        email: row.user?.email || null,
        avatar: username?.charAt(0)?.toUpperCase() || "U",
        action: "Bet Placed",
        amountAtomic: toSafeString(row.wager_atomic),
        currency: null,
        displayAmount: `$${toSafeString(row.wager_atomic)}`,
        rawStatus: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        timeAgo: formatTimeAgo(row.created_at),
      };
    });

    const depositActivities = deposits.map((row) => {
      const username = row.user?.username || `User #${row.user_id}`;
      const currencyCode = getCurrencyCode(row);

      return {
        id: row.id,
        sourceTable: "deposits",
        sourceId: row.id,
        type: "crypto_deposit",
        user: username,
        email: row.user?.email || null,
        avatar: username?.charAt(0)?.toUpperCase() || "U",
        action: "Crypto Deposit",
        amountAtomic: toSafeString(row.amount_atomic),
        currency: currencyCode,
        displayAmount: buildDisplayAmount({
          amountAtomic: row.amount_atomic,
          currencyCode: currencyCode || "CRYPTO",
          defaultDollar: false,
        }),
        rawStatus: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        timeAgo: formatTimeAgo(row.created_at),
      };
    });

    const merged = [
      ...depositRequestActivities,
      ...withdrawalActivities,
      ...betActivities,
      ...depositActivities,
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return res.status(200).json({
      message: "Recent activity fetched successfully",
      data: merged,
    });
  } catch (e) {
    console.error("getRecentActivity Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const getMainAccountOverview = async (req, res) => {
  try {
    // 1. Calculate Total Balance from all wallets
    const totalWallets = await Wallet.findAll({
      attributes: ['balance_atomic']
    });

    let totalBalance = 0;

    totalWallets.forEach(w => {
      // ✅ Sirf balance_atomic ko add kiya ja raha hai
      totalBalance += Number(w.balance_atomic || 0) / 1e8; 
    });

    // 2. Fetch Recent Mixed Transactions (Deposits + Withdrawals)
    const [deposits, withdrawals] = await Promise.all([
      DepositRequest.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{ model: User, attributes: ['username'] }]
      }),
      WithdrawalRequest.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{ model: User, attributes: ['username'] }]
      })
    ]);

    // 3. Merge and Format for UI
    // AdminAccountController.js ke andar map logic update karein
const recentTransactions = [
  ...deposits.map(d => ({
    id: d.id, // ✅ Yeh line add karein takay frontend ko ID mile
    date: d.created_at,
    type: "Deposit",
    description: `User deposit - ${d.user?.username || 'Unknown'}`,
    amount: Number(d.claimed_amount_atomic || 0) / 1e8,
    status: d.status.charAt(0).toUpperCase() + d.status.slice(1)
  })),
  ...withdrawals.map(w => ({
    id: w.id, // ✅ Withdrawal ke liye bhi ID add karein
    date: w.created_at,
    type: "Withdrawal",
    description: `User withdrawal - ${w.user?.username || 'Unknown'}`,
    amount: -(Number(w.amount_atomic || 0) / 1e8),
    status: w.status.charAt(0).toUpperCase() + w.status.slice(1)
  }))
].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    // ✅ Response se lockedBalance aur availableBalance (subtraction) remove kar diya
    return res.status(200).json({
      message: "Admin overview fetched successfully",
      data: {
        totalBalance: totalBalance.toFixed(2),
        availableBalance: totalBalance.toFixed(2), // Ab available hi total hai
        recentTransactions
      }
    });
  } catch (err) {
    console.error("getMainAccountOverview Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = {
  listDepositRequests,

  listWithdrawals,
 
  listAuditLogs,
  getDashboardOverview,
  listUsers,
  createUser,
  updateUser,
  deleteUser, 
  getBettingAnalytics,
  listPayments,
  getAnalyticsReports,
  getRecentActivity,
  getMainAccountOverview
};
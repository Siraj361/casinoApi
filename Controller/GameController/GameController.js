// File: Controller/GameController/GameController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const Game = db.game;
const GameRound = db.gameRound;
const Wallet = db.wallet;
const Ledger = db.ledgerEntry;
const Bet = db.bet;
const CurrencyNetwork = db.currencyNetwork;
const Currency = db.currency;

function getAuthUserId(req) {
  const id = req.user?.user_id || req.user?.id || req.userId || req.user_id;
  return id != null ? String(id) : null;
}

function safeJsonParse(value, fallback = {}) {
  try {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDisplayAmount(value, decimals = 8) {
  const safeDecimals = Math.max(0, Math.min(Number(decimals) || 8, 8));
  return Number(Number(value || 0).toFixed(safeDecimals));
}

function amountToAtomic(amount, decimals) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Invalid amount");
  }

  const safeDecimals = Math.max(0, Number(decimals) || 0);
  const fixed = numeric.toFixed(safeDecimals);
  const [wholePart, fractionPart = ""] = fixed.split(".");
  const atomic = `${wholePart}${fractionPart}`.replace(/^0+(?=\d)/, "") || "0";

  return atomic;
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

function getWalletAtomicBalance(wallet) {
  const raw =
    wallet.balance_atomic ??
    wallet.available_balance_atomic ??
    wallet.amount_atomic ??
    wallet.balance ??
    wallet.available_balance ??
    wallet.availableBalance ??
    wallet.main_balance ??
    wallet.mainBalance ??
    0;

  return BigInt(String(raw ?? 0));
}

function setWalletBalance(wallet, newAtomicBalance, decimals = 8) {
  const atomicString = String(newAtomicBalance);
  const displayValue = atomicToDisplay(atomicString, decimals);

  if ("balance_atomic" in wallet) wallet.balance_atomic = atomicString;
  else if ("available_balance_atomic" in wallet) wallet.available_balance_atomic = atomicString;
  else if ("amount_atomic" in wallet) wallet.amount_atomic = atomicString;

  if ("balance" in wallet) wallet.balance = displayValue;
  else if ("available_balance" in wallet) wallet.available_balance = displayValue;
  else if ("availableBalance" in wallet) wallet.availableBalance = displayValue;
  else if ("main_balance" in wallet) wallet.main_balance = displayValue;
  else if ("mainBalance" in wallet) wallet.mainBalance = displayValue;
}

function createMinesBoard(minesCount) {
  const total = 25;
  const indexes = Array.from({ length: total }, (_, i) => i);

  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }

  return indexes.slice(0, minesCount);
}

function getMinesMultiplier(reveals, minesCount) {
  const GRID_SIZE = 25;
  const HOUSE_EDGE = 0.01;

  if (reveals <= 0) return 1;

  let multiplier = 1;
  let remainingTiles = GRID_SIZE;
  let remainingSafe = GRID_SIZE - minesCount;

  for (let i = 0; i < reveals; i += 1) {
    multiplier *= remainingTiles / remainingSafe;
    remainingTiles -= 1;
    remainingSafe -= 1;
  }

  return Number((multiplier * (1 - HOUSE_EDGE)).toFixed(4));
}

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.03) return 1.0;
  if (r < 0.35) return Number((1 + Math.random() * 1.5).toFixed(2));
  if (r < 0.8) return Number((2.5 + Math.random() * 4.5).toFixed(2));
  return Number((7 + Math.random() * 20).toFixed(2));
}

function getLiveCrashMultiplier(startedAt) {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const ticks = Math.max(0, Math.floor(elapsedMs / 120));

  let current = 1.0;
  for (let i = 0; i < ticks; i += 1) {
    current = Number((current * 1.035).toFixed(2));
  }
  return current;
}

async function findGameByCode(code, transaction) {
  return Game.findOne({
    where: { code: String(code).toUpperCase() },
    transaction,
  });
}

async function findWallet(userId, currencyNetworkId, transaction, lock = false) {
  // 1. Debugging: Terminal mein check karein ke values kya aa rahi hain
  console.log(`🔍 Finding Wallet for User: ${userId} | Network: ${currencyNetworkId}`);

  const wallet = await Wallet.findOne({
    where: {
      // Numbers mein convert karna zaroori hai agar frontend se string aa rahi ho
      user_id: Number(userId), 
      currency_network_id: Number(currencyNetworkId),
    },
    include: [
      {
        model: db.currencyNetwork,
        as: "currencyNetwork",
      },
    ],
    transaction,
    lock: lock ? (transaction && transaction.LOCK ? transaction.LOCK.UPDATE : true) : undefined,
  });

  if (!wallet) {
    console.log("❌ Wallet NOT found in Database for this User/Network combination.");
  } else {
    console.log("✅ Wallet found. Current Balance:", wallet.balance_atomic);
  }

  return wallet;
}

function getWalletDecimals(wallet) {
  return Number(wallet?.currencyNetwork?.currency?.decimals ?? 8);
}

async function createBetRecord({
  transaction,
  userId,
  gameId,
  gameRoundId,
  currencyNetworkId,
  amount,
  amountAtomic,
  payoutAmount,
  payoutAtomic,
  status,
  metadata,
}) {
  if (!Bet) return null;

  return Bet.create(
    {
      user_id: userId,
      game_id: gameId,
      round_id: gameRoundId,
      currency_network_id: currencyNetworkId,
      amount,
      payout_amount: payoutAmount,
      wager_atomic: String(amountAtomic ?? 0),
      payout_atomic: String(payoutAtomic ?? 0),
      status,
      meta_json: JSON.stringify(metadata || {}),
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );
}

async function createLedgerEntry({
  transaction,
  userId,
  currencyNetworkId,
  txnType,
  amount,
  amountAtomic,
  direction,
  referenceId,
  note,
}) {
  if (!Ledger) return null;

  return Ledger.create(
    {
      user_id: userId,
      currency_network_id: currencyNetworkId,
      txn_type: txnType,
      amount,
      amount_atomic: String(amountAtomic ?? 0),
      direction,
      reference_type: "game_round",
      reference_id: String(referenceId),
      note,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );
}

async function recordPlatformProfit({
  transaction,
  userId,
  gameId,
  betId,
  currencyNetworkId,
  commissionType = "bet_loss",
  betAmountAtomic,
  payoutAtomic = 0n,
  commissionAtomic,
  commissionRateBps = 100,
  betAmountDisplay,
  payoutDisplay,
  commissionDisplay,
  metadata = {},
}) {
  if (!db.platformProfit) return null;

  return db.platformProfit.create(
    {
      bet_id: betId,
      user_id: userId,
      game_id: gameId,
      currency_network_id: currencyNetworkId,
      commission_type: commissionType,
      bet_amount_atomic: String(betAmountAtomic ?? 0),
      payout_atomic: String(payoutAtomic ?? 0),
      commission_atomic: String(commissionAtomic ?? 0),
      bet_amount: betAmountDisplay,
      payout: payoutDisplay,
      commission: commissionDisplay,
      commission_rate_bps: commissionRateBps,
      status: "recorded",
      metadata_json: JSON.stringify(metadata),
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );
}

const listGames = async (req, res) => {
  try {
    const onlyActive = (req.query.active || "true").toLowerCase() === "true";
    const where = onlyActive ? { is_active: true } : {};
    const rows = await Game.findAll({ where, order: [["id", "ASC"]] });

    return res.status(200).json({ message: "Games fetched", data: rows });
  } catch (e) {
    console.error("listGames:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getGameByCode = async (req, res) => {
  try {
    const code = (req.params.code || "").toUpperCase();
    const row = await Game.findOne({ where: { code } });

    if (!row) return res.status(404).json({ error: "Game not found" });

    return res.status(200).json({ message: "Game fetched", data: row });
  } catch (e) {
    console.error("getGameByCode:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const roundsQueryScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const listRoundsByGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId, 10);
    if (!gameId) return res.status(400).json({ error: "Invalid gameId" });

    const { error, value } = roundsQueryScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const rows = await GameRound.findAll({
      where: { game_id: gameId },
      order: [["started_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Rounds fetched", data: rows });
  } catch (e) {
    console.error("listRoundsByGame:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ---------------- DICE ---------------- */

const dicePlayScheme = Joi.object({
  betAmount: Joi.number().positive().required(),
  chance: Joi.number().min(2).max(98).required(),
  mode: Joi.string().valid("under", "over").required(),
  currency_network_id: Joi.number().integer().positive().required(),
});

const playDice = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = dicePlayScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { betAmount, chance, mode, currency_network_id } = value;

    const game = await findGameByCode("DICE", t);
    if (!game) {
      await t.rollback();
      return res.status(404).json({ error: "DICE game not found in database" });
    }

    const wallet = await findWallet(userId, currency_network_id, t, true);
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }

    const decimals = getWalletDecimals(wallet);
    const betAmountAtomic = BigInt(amountToAtomic(betAmount, decimals));
    const currentBalanceAtomic = getWalletAtomicBalance(wallet);

    if (currentBalanceAtomic < betAmountAtomic) {
      await t.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const houseEdge = 0.01;
    const payoutMultiplier = Number((((100 / chance) * (1 - houseEdge))).toFixed(2));
    const roll = Number((Math.random() * 100).toFixed(2));
    const won = mode === "under" ? roll < chance : roll > 100 - chance;

    const payoutDisplay = won
      ? normalizeDisplayAmount(betAmount * payoutMultiplier, decimals)
      : 0;
    const payoutAtomic = won ? BigInt(amountToAtomic(payoutDisplay, decimals)) : 0n;

    // ✅ Calculate 1% commission on loss
    const commissionRateBps = 100; // 1%
    const commissionAtomic = won ? 0n : (betAmountAtomic * BigInt(commissionRateBps)) / 100n;
    const commissionDisplay = atomicToDisplay(commissionAtomic.toString(), decimals);

    // Deduct commission from platform (already included in balance calculation)
    const newBalanceAtomic = won
      ? currentBalanceAtomic - betAmountAtomic + payoutAtomic
      : currentBalanceAtomic - betAmountAtomic - commissionAtomic;

    setWalletBalance(wallet, newBalanceAtomic, decimals);
    wallet.updated_at = new Date();
    await wallet.save({ transaction: t });

    const round = await GameRound.create(
      {
        game_id: game.id,
        started_at: new Date(),
        ended_at: new Date(),
        status: "completed",
        result_json: JSON.stringify({
          gameCode: "DICE",
          userId,
          currency_network_id,
          betAmount: normalizeDisplayAmount(betAmount, decimals),
          betAmountAtomic: betAmountAtomic.toString(),
          roll,
          chance,
          mode,
          won,
          payoutMultiplier,
          payout: payoutDisplay,
          payoutAtomic: payoutAtomic.toString(),
        }),
      },
      { transaction: t }
    );

    await createBetRecord({
      transaction: t,
      userId,
      gameId: game.id,
      gameRoundId: round.id,
      currencyNetworkId: currency_network_id,
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      payoutAmount: payoutDisplay,
      payoutAtomic,
      status: won ? "won" : "lost",
      metadata: { roll, chance, mode, payoutMultiplier },
    });

    const betRecord = await Bet.findOne(
      { where: { round_id: round.id } },
      { transaction: t }
    );

    // ✅ Record platform profit/commission
    if (!won && commissionAtomic > 0n) {
      await recordPlatformProfit({
        transaction: t,
        userId,
        gameId: game.id,
        betId: betRecord?.id,
        currencyNetworkId: currency_network_id,
        commissionType: "bet_loss",
        betAmountAtomic,
        payoutAtomic: 0n,
        commissionAtomic,
        commissionRateBps,
        betAmountDisplay: normalizeDisplayAmount(betAmount, decimals),
        payoutDisplay: 0,
        commissionDisplay,
        metadata: { gameType: "DICE", mode, chance, roll, reason: "loss_commission" },
      });
    }

    await createLedgerEntry({
      transaction: t,
      userId,
      currencyNetworkId: currency_network_id,
      txnType: "bet_debit",
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      direction: "debit",
      referenceId: round.id,
      note: `Dice bet placed (${mode}, chance ${chance})`,
    });

    if (won) {
      await createLedgerEntry({
        transaction: t,
        userId,
        currencyNetworkId: currency_network_id,
        txnType: "bet_win_credit",
        amount: payoutDisplay,
        amountAtomic: payoutAtomic,
        direction: "credit",
        referenceId: round.id,
        note: "Dice win payout",
      });
    }

    await t.commit();

    // ✅ Emit Socket.io events
    if (req.io) {
      req.io.to(`game:DICE`).emit("dice_result", {
        userId,
        roundId: round.id,
        betAmount: normalizeDisplayAmount(betAmount, decimals),
        roll,
        chance,
        mode,
        won,
        payout: payoutDisplay,
        balanceBefore: atomicToDisplay(currentBalanceAtomic.toString(), decimals),
        balanceAfter: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        commission: commissionDisplay,
        timestamp: new Date(),
      });

      // Personal update
      req.io.to(`user:${userId}`).emit("balance_updated", {
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        change: won ? Number(payoutDisplay) - Number(betAmount) : -Number(betAmount) - Number(commissionDisplay),
      });
    }

    return res.status(200).json({
      message: "Dice played successfully",
      data: {
        roundId: round.id,
        roll,
        chance,
        mode,
        won,
        payoutMultiplier,
        payout: payoutDisplay,
        betAmount: normalizeDisplayAmount(betAmount, decimals),
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("playDice:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

/* ---------------- MINES ---------------- */

const minesStartScheme = Joi.object({
  betAmount: Joi.number().positive().required(),
  minesCount: Joi.number().integer().min(1).max(24).required(),
  currency_network_id: Joi.number().integer().positive().required(),
});

const minesRevealScheme = Joi.object({
  roundId: Joi.number().integer().positive().required(),
  tileIndex: Joi.number().integer().min(0).max(24).required(),
});

const minesCashoutScheme = Joi.object({
  roundId: Joi.number().integer().positive().required(),
});

const startMines = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = minesStartScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { betAmount, minesCount, currency_network_id } = value;

    const game = await findGameByCode("MINES", t);
    if (!game) {
      await t.rollback();
      return res.status(404).json({ error: "MINES game not found in database" });
    }

    const wallet = await findWallet(userId, currency_network_id, t, true);
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }

    const decimals = getWalletDecimals(wallet);
    const betAmountAtomic = BigInt(amountToAtomic(betAmount, decimals));
    const currentBalanceAtomic = getWalletAtomicBalance(wallet);

    console.log("decimals =", decimals);
    console.log("betAmount =", betAmount);
    console.log("betAmountAtomic =", betAmountAtomic.toString());
    console.log("currentBalanceAtomic =", currentBalanceAtomic.toString());
    console.log(
      "currentBalanceDisplay =",
      atomicToDisplay(currentBalanceAtomic.toString(), decimals)
    );

    if (currentBalanceAtomic < betAmountAtomic) {
      await t.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalanceAtomic = currentBalanceAtomic - betAmountAtomic;
    setWalletBalance(wallet, newBalanceAtomic, decimals);
    wallet.updated_at = new Date();
    await wallet.save({ transaction: t });

    const mineIndexes = createMinesBoard(minesCount);

    const round = await GameRound.create(
      {
        game_id: game.id,
        started_at: new Date(),
        status: "active",
        result_json: JSON.stringify({
          gameCode: "MINES",
          userId,
          currency_network_id,
          betAmount: normalizeDisplayAmount(betAmount, decimals),
          betAmountAtomic: betAmountAtomic.toString(),
          minesCount,
          mineIndexes,
          revealed: [],
          exploded: false,
          cashedOut: false,
          payout: 0,
          payoutAtomic: "0",
          createdAt: nowIso(),
        }),
      },
      { transaction: t }
    );

    await createBetRecord({
      transaction: t,
      userId,
      gameId: game.id,
      gameRoundId: round.id,
      currencyNetworkId: currency_network_id,
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      payoutAmount: 0,
      payoutAtomic: 0n,
      status: "active",
      metadata: { minesCount },
    });

    await createLedgerEntry({
      transaction: t,
      userId,
      currencyNetworkId: currency_network_id,
      txnType: "bet_debit",
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      direction: "debit",
      referenceId: round.id,
      note: `Mines bet placed (${minesCount} mines)`,
    });

    await t.commit();

    return res.status(200).json({
      message: "Mines game started",
      data: {
        roundId: round.id,
        betAmount: normalizeDisplayAmount(betAmount, decimals),
        minesCount,
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        revealed: [],
        currentMultiplier: 1,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("startMines:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

const revealMinesTile = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = minesRevealScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { roundId, tileIndex } = value;

    const round = await GameRound.findByPk(roundId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!round) {
      await t.rollback();
      return res.status(404).json({ error: "Round not found" });
    }

    const state = safeJsonParse(round.result_json, {});
    state.revealed = Array.isArray(state.revealed) ? state.revealed : [];
    state.mineIndexes = Array.isArray(state.mineIndexes) ? state.mineIndexes : [];

    if (String(state.userId) !== String(userId)) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    if (round.status !== "active") {
      await t.rollback();
      return res.status(400).json({ error: "Round is not active" });
    }

    if (state.revealed.includes(tileIndex)) {
      await t.rollback();
      return res.status(400).json({ error: "Tile already revealed" });
    }

    const isMine = state.mineIndexes.includes(tileIndex);

    if (isMine) {
      state.exploded = true;
      state.hitTile = tileIndex;

      // ✅ Calculate 1% commission on loss (mine hit)
      const betAmountAtomic = BigInt(amountToAtomic(state.betAmount, decimals));
      const commissionRateBps = 100; // 1%
      const commissionAtomic = (betAmountAtomic * BigInt(commissionRateBps)) / 100n;
      const commissionDisplay = atomicToDisplay(commissionAtomic.toString(), decimals);

      round.status = "completed";
      round.ended_at = new Date();
      round.result_json = JSON.stringify(state);
      await round.save({ transaction: t });

      if (Bet) {
        const betRecord = await Bet.findOne(
          { where: { round_id: round.id } },
          { transaction: t }
        );

        await Bet.update(
          {
            status: "lost",
            payout_amount: 0,
            payout_atomic: "0",
            meta_json: JSON.stringify(state),
            updated_at: new Date(),
          },
          { where: { round_id: round.id }, transaction: t }
        );

        // ✅ Record platform profit for loss
        if (commissionAtomic > 0n) {
          await recordPlatformProfit({
            transaction: t,
            userId,
            gameId: round.game_id,
            betId: betRecord?.id,
            currencyNetworkId: state.currency_network_id,
            commissionType: "bet_loss",
            betAmountAtomic,
            payoutAtomic: 0n,
            commissionAtomic,
            commissionRateBps,
            betAmountDisplay: state.betAmount,
            payoutDisplay: 0,
            commissionDisplay,
            metadata: { gameType: "MINES", minesCount: state.minesCount, hitTile: tileIndex, reason: "mine_hit_commission" },
          });
        }
      }

      await t.commit();

      // ✅ Emit Socket.io events
      if (req.io) {
        req.io.to(`game:MINES`).emit("mines_result", {
          userId,
          roundId: round.id,
          betAmount: state.betAmount,
          hitTile: tileIndex,
          mineIndexes: state.mineIndexes,
          revealed: state.revealed,
          won: false,
          commission: commissionDisplay,
          timestamp: new Date(),
        });

        req.io.to(`user:${userId}`).emit("balance_updated", {
          change: -Number(state.betAmount) - Number(commissionDisplay),
        });
      }

      return res.status(200).json({
        message: "Mine hit",
        data: {
          roundId: round.id,
          safe: false,
          exploded: true,
          hitTile: tileIndex,
          revealed: state.revealed,
          mineIndexes: state.mineIndexes,
          currentMultiplier: getMinesMultiplier(state.revealed.length, state.minesCount),
          commission: commissionDisplay,
        },
      });
    }

    state.revealed.push(tileIndex);
    const currentMultiplier = getMinesMultiplier(state.revealed.length, state.minesCount);
    state.currentMultiplier = currentMultiplier;

    round.result_json = JSON.stringify(state);
    await round.save({ transaction: t });

    if (Bet) {
      await Bet.update(
        {
          meta_json: JSON.stringify(state),
          updated_at: new Date(),
        },
        { where: { round_id: round.id }, transaction: t }
      );
    }

    await t.commit();

    return res.status(200).json({
      message: "Safe tile revealed",
      data: {
        roundId: round.id,
        safe: true,
        revealed: state.revealed,
        currentMultiplier,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("revealMinesTile:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

const cashoutMines = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = minesCashoutScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { roundId } = value;

    const round = await GameRound.findByPk(roundId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!round) {
      await t.rollback();
      return res.status(404).json({ error: "Round not found" });
    }

    const state = safeJsonParse(round.result_json, {});
    state.revealed = Array.isArray(state.revealed) ? state.revealed : [];

    if (String(state.userId) !== String(userId)) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    if (round.status !== "active") {
      await t.rollback();
      return res.status(400).json({ error: "Round is not active" });
    }

    if (!state.revealed.length) {
      await t.rollback();
      return res.status(400).json({ error: "Reveal at least one safe tile before cashout" });
    }

    const wallet = await findWallet(userId, state.currency_network_id, t, true);
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }

    const decimals = getWalletDecimals(wallet);
    const currentBalanceAtomic = getWalletAtomicBalance(wallet);
    const currentMultiplier = getMinesMultiplier(state.revealed.length, state.minesCount);

    const baseBetDisplay = Number(state.betAmount ?? 0);
    const payoutDisplay = normalizeDisplayAmount(baseBetDisplay * currentMultiplier, decimals);
    const payoutAtomic = BigInt(amountToAtomic(payoutDisplay, decimals));

    const newBalanceAtomic = currentBalanceAtomic + payoutAtomic;

    setWalletBalance(wallet, newBalanceAtomic, decimals);
    wallet.updated_at = new Date();
    await wallet.save({ transaction: t });

    state.cashedOut = true;
    state.currentMultiplier = currentMultiplier;
    state.payout = payoutDisplay;
    state.payoutAtomic = payoutAtomic.toString();

    round.status = "completed";
    round.ended_at = new Date();
    round.result_json = JSON.stringify(state);
    await round.save({ transaction: t });

    if (Bet) {
      await Bet.update(
        {
          status: "won",
          payout_amount: payoutDisplay,
          payout_atomic: payoutAtomic.toString(),
          meta_json: JSON.stringify(state),
          updated_at: new Date(),
        },
        { where: { round_id: round.id }, transaction: t }
      );
    }

    await createLedgerEntry({
      transaction: t,
      userId,
      currencyNetworkId: state.currency_network_id,
      txnType: "bet_win_credit",
      amount: payoutDisplay,
      amountAtomic: payoutAtomic,
      direction: "credit",
      referenceId: round.id,
      note: "Mines cashout payout",
    });

    await t.commit();

    // ✅ Emit Socket.io events
    if (req.io) {
      req.io.to(`game:MINES`).emit("mines_result", {
        userId,
        roundId: round.id,
        betAmount: state.betAmount,
        revealed: state.revealed,
        mineIndexes: state.mineIndexes,
        won: true,
        payout: payoutDisplay,
        multiplier: currentMultiplier,
        timestamp: new Date(),
      });

      req.io.to(`user:${userId}`).emit("balance_updated", {
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        change: Number(payoutDisplay) - Number(state.betAmount),
      });
    }

    return res.status(200).json({
      message: "Mines cashed out",
      data: {
        roundId: round.id,
        revealed: state.revealed,
        currentMultiplier,
        payout: payoutDisplay,
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("cashoutMines:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

/* ---------------- CRASH ---------------- */

const crashStartScheme = Joi.object({
  betAmount: Joi.number().positive().required(),
  currency_network_id: Joi.number().integer().positive().required(),
});

const crashCashoutScheme = Joi.object({
  roundId: Joi.number().integer().positive().required(),
});

const startCrash = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = crashStartScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { betAmount, currency_network_id } = value;

    const game = await findGameByCode("CRASH", t);
    if (!game) {
      await t.rollback();
      return res.status(404).json({ error: "CRASH game not found in database" });
    }

    const wallet = await findWallet(userId, currency_network_id, t, true);
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }
    console.log("startCrash - wallet found:", {
      userId,
      currency_network_id,
      walletId: wallet.id,
    });

    const decimals = getWalletDecimals(wallet);
    const betAmountAtomic = BigInt(amountToAtomic(betAmount, decimals));
    const currentBalanceAtomic = getWalletAtomicBalance(wallet);

    if (currentBalanceAtomic < betAmountAtomic) {
      await t.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalanceAtomic = currentBalanceAtomic - betAmountAtomic;

    setWalletBalance(wallet, newBalanceAtomic, decimals);
    wallet.updated_at = new Date();
    await wallet.save({ transaction: t });

    const crashPoint = generateCrashPoint();
    const startedAt = new Date();

    const round = await GameRound.create(
      {
        game_id: game.id,
        started_at: startedAt,
        status: "active",
        result_json: JSON.stringify({
          gameCode: "CRASH",
          userId,
          currency_network_id,
          betAmount: normalizeDisplayAmount(betAmount, decimals),
          betAmountAtomic: betAmountAtomic.toString(),
          crashPoint,
          cashedOut: false,
          payout: 0,
          payoutAtomic: "0",
          createdAt: nowIso(),
        }),
      },
      { transaction: t }
    );

    await createBetRecord({
      transaction: t,
      userId,
      gameId: game.id,
      gameRoundId: round.id,
      currencyNetworkId: currency_network_id,
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      payoutAmount: 0,
      payoutAtomic: 0n,
      status: "active",
      metadata: { crashPoint },
    });

    await createLedgerEntry({
      transaction: t,
      userId,
      currencyNetworkId: currency_network_id,
      txnType: "bet_debit",
      amount: normalizeDisplayAmount(betAmount, decimals),
      amountAtomic: betAmountAtomic,
      direction: "debit",
      referenceId: round.id,
      note: "Crash bet placed",
    });

    await t.commit();

    return res.status(200).json({
      message: "Crash round started",
      data: {
        roundId: round.id,
        betAmount: normalizeDisplayAmount(betAmount, decimals),
        crashPoint,
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        startedAt,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("startCrash:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

const getCrashRound = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const roundId = parseInt(req.params.roundId, 10);
    if (!roundId) return res.status(400).json({ error: "Invalid roundId" });

    const round = await GameRound.findByPk(roundId);
    if (!round) return res.status(404).json({ error: "Round not found" });

    const state = safeJsonParse(round.result_json, {});

    console.log("getCrashRound roundId =", roundId);
    console.log("auth userId =", userId);
    console.log("state.userId =", state.userId);
    console.log("round.result_json =", round.result_json);

    if (!state.userId) {
      return res.status(400).json({
        error: "Round owner missing in result_json",
      });
    }

    if (String(state.userId) !== String(userId)) {
      return res.status(403).json({
        error: "Forbidden",
        details: `Round belongs to userId=${state.userId}, auth userId=${userId}`,
      });
    }

    const liveMultiplier = getLiveCrashMultiplier(round.started_at);
    const busted = liveMultiplier >= Number(state.crashPoint);

    return res.status(200).json({
      message: "Crash round fetched",
      data: {
        roundId: round.id,
        status: round.status,
        startedAt: round.started_at,
        liveMultiplier: busted ? Number(state.crashPoint) : liveMultiplier,
        crashPoint: state.crashPoint,
        busted,
        cashedOut: !!state.cashedOut,
        payout: state.payout || 0,
      },
    });
  } catch (e) {
    console.error("getCrashRound:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

const cashoutCrash = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = crashCashoutScheme.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const { roundId } = value;

    const round = await GameRound.findByPk(roundId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!round) {
      await t.rollback();
      return res.status(404).json({ error: "Round not found" });
    }

    const state = safeJsonParse(round.result_json, {});
    if (String(state.userId) !== String(userId)) {
      await t.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    if (round.status !== "active") {
      await t.rollback();
      return res.status(400).json({ error: "Round is not active" });
    }

    const liveMultiplier = getLiveCrashMultiplier(round.started_at);
    const crashPoint = Number(state.crashPoint);

    if (liveMultiplier >= crashPoint) {
      // ✅ Calculate 1% commission on loss (crash busted)
      const betAmountAtomic = BigInt(amountToAtomic(state.betAmount, decimals));
      const commissionRateBps = 100; // 1%
      const commissionAtomic = (betAmountAtomic * BigInt(commissionRateBps)) / 100n;
      const commissionDisplay = atomicToDisplay(commissionAtomic.toString(), decimals);

      round.status = "completed";
      round.ended_at = new Date();
      round.result_json = JSON.stringify({
        ...state,
        busted: true,
        finalMultiplier: crashPoint,
        payout: 0,
        payoutAtomic: "0",
      });
      await round.save({ transaction: t });

      if (Bet) {
        const betRecord = await Bet.findOne(
          { where: { round_id: round.id } },
          { transaction: t }
        );

        await Bet.update(
          {
            status: "lost",
            payout_amount: 0,
            payout_atomic: "0",
            meta_json: JSON.stringify({
              ...state,
              busted: true,
              finalMultiplier: crashPoint,
            }),
            updated_at: new Date(),
          },
          { where: { round_id: round.id }, transaction: t }
        );

        // ✅ Record platform profit for loss
        if (commissionAtomic > 0n) {
          await recordPlatformProfit({
            transaction: t,
            userId,
            gameId: round.game_id,
            betId: betRecord?.id,
            currencyNetworkId: state.currency_network_id,
            commissionType: "bet_loss",
            betAmountAtomic,
            payoutAtomic: 0n,
            commissionAtomic,
            commissionRateBps,
            betAmountDisplay: state.betAmount,
            payoutDisplay: 0,
            commissionDisplay,
            metadata: { gameType: "CRASH", crashPoint, finalMultiplier: crashPoint, reason: "crash_bust_commission" },
          });
        }
      }

      await t.commit();

      // ✅ Emit Socket.io events
      if (req.io) {
        req.io.to(`game:CRASH`).emit("crash_result", {
          userId,
          roundId: round.id,
          betAmount: state.betAmount,
          crashPoint,
          finalMultiplier: crashPoint,
          won: false,
          commission: commissionDisplay,
          timestamp: new Date(),
        });

        req.io.to(`user:${userId}`).emit("balance_updated", {
          change: -Number(state.betAmount) - Number(commissionDisplay),
        });
      }

      return res.status(400).json({
        error: "Round already crashed",
        data: {
          roundId: round.id,
          crashPoint,
          commission: commissionDisplay,
        },
      });
    }

    const wallet = await findWallet(userId, state.currency_network_id, t, true);
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }

    const decimals = getWalletDecimals(wallet);
    const currentBalanceAtomic = getWalletAtomicBalance(wallet);

    const payoutDisplay = normalizeDisplayAmount(Number(state.betAmount || 0) * liveMultiplier, decimals);
    const payoutAtomic = BigInt(amountToAtomic(payoutDisplay, decimals));

    const newBalanceAtomic = currentBalanceAtomic + payoutAtomic;

    setWalletBalance(wallet, newBalanceAtomic, decimals);
    wallet.updated_at = new Date();
    await wallet.save({ transaction: t });

    round.status = "completed";
    round.ended_at = new Date();
    round.result_json = JSON.stringify({
      ...state,
      cashedOut: true,
      payout: payoutDisplay,
      payoutAtomic: payoutAtomic.toString(),
      cashoutAt: liveMultiplier,
    });
    await round.save({ transaction: t });

    if (Bet) {
      await Bet.update(
        {
          status: "won",
          payout_amount: payoutDisplay,
          payout_atomic: payoutAtomic.toString(),
          meta_json: JSON.stringify({
            ...state,
            cashedOut: true,
            payout: payoutDisplay,
            payoutAtomic: payoutAtomic.toString(),
            cashoutAt: liveMultiplier,
          }),
          updated_at: new Date(),
        },
        { where: { round_id: round.id }, transaction: t }
      );
    }

    await createLedgerEntry({
      transaction: t,
      userId,
      currencyNetworkId: state.currency_network_id,
      txnType: "bet_win_credit",
      amount: payoutDisplay,
      amountAtomic: payoutAtomic,
      direction: "credit",
      referenceId: round.id,
      note: "Crash cashout payout",
    });

    await t.commit();

    // ✅ Emit Socket.io events
    if (req.io) {
      req.io.to(`game:CRASH`).emit("crash_result", {
        userId,
        roundId: round.id,
        betAmount: state.betAmount,
        cashoutAt: liveMultiplier,
        payout: payoutDisplay,
        won: true,
        timestamp: new Date(),
      });

      req.io.to(`user:${userId}`).emit("balance_updated", {
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
        change: Number(payoutDisplay) - Number(state.betAmount),
      });
    }

    return res.status(200).json({
      message: "Crash cashed out",
      data: {
        roundId: round.id,
        cashoutAt: liveMultiplier,
        payout: payoutDisplay,
        newBalance: atomicToDisplay(newBalanceAtomic.toString(), decimals),
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("cashoutCrash:", e);
    return res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
};

module.exports = {
  listGames,
  getGameByCode,
  listRoundsByGame,
  playDice,
  startMines,
  revealMinesTile,
  cashoutMines,
  startCrash,
  cashoutCrash,
  getCrashRound,
};
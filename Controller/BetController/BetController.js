// File: Controller/BetController/BetController.js
const Joi = require("joi");
const { Op } = require("sequelize");
const db = require("../../Model/index.js");

const Bet = db.bet;
const Game = db.game;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

const listScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  game_code: Joi.string().allow("", null).optional(),
  from: Joi.date().iso().allow("", null).optional(),
  to: Joi.date().iso().allow("", null).optional(),
});

const listMyBets = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = { user_id: userId };

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
        comments:
          parsedMeta && typeof parsedMeta === "object"
            ? JSON.stringify(parsedMeta)
            : item.meta_json || "-",
        txn_type: item.status || "-", // ya yahan game type daal sakte ho
        amount: item.wager_atomic ?? 0,
        payout: item.payout_atomic ?? 0,
        status: item.status || "-",
        created_at: item.created_at,
      };
    });

    return res.status(200).json({
      message: "Bets fetched",
      data,
    });
  } catch (e) {
    console.error("listMyBets:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const getMyBetById = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid bet id" });

    const row = await Bet.findOne({ where: { id, user_id: userId } });
    if (!row) return res.status(404).json({ error: "Bet not found" });

    return res.status(200).json({ message: "Bet fetched", data: row });
  } catch (e) {
    console.error("getMyBetById:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { listMyBets, getMyBetById };
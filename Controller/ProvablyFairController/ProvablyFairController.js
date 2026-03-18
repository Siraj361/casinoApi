// File: Controller/ProvablyFairController/ProvablyFairController.js
const Joi = require("joi");
const crypto = require("crypto");
const db = require("../../Model/index.js");

const Game = db.game;
const Seed = db.provablyFairSeed;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

// create/rotate seed
const rotateScheme = Joi.object({
  game_code: Joi.string().required(),
  client_seed: Joi.string().min(3).max(64).required(),
});

const rotateSeed = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = rotateScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const gameCode = value.game_code.toUpperCase();
    const game = await Game.findOne({ where: { code: gameCode }, transaction: t });
    if (!game) {
      await t.rollback();
      return res.status(404).json({ error: "Game not found" });
    }

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

    // IMPORTANT: store server_seed_enc encrypted in real system.
    // For now store it as null (or store encrypted if you have util).
    const row = await Seed.create(
      {
        user_id: userId,
        game_id: game.id,
        server_seed_hash: serverSeedHash,
        server_seed_enc: null,
        client_seed: value.client_seed,
        nonce: 0,
        revealed_at: null,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Seed rotated",
      data: {
        id: row.id,
        game_id: row.game_id,
        client_seed: row.client_seed,
        nonce: row.nonce,
        server_seed_hash: row.server_seed_hash,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("rotateSeed:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCurrentSeed = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const gameCode = (req.query.game_code || "").toUpperCase();
    if (!gameCode) return res.status(400).json({ error: "game_code is required" });

    const game = await Game.findOne({ where: { code: gameCode } });
    if (!game) return res.status(404).json({ error: "Game not found" });

    const row = await Seed.findOne({
      where: { user_id: userId, game_id: game.id },
      order: [["id", "DESC"]],
    });

    if (!row) return res.status(404).json({ error: "Seed not found. Rotate first." });

    return res.status(200).json({
      message: "Current seed fetched",
      data: {
        id: row.id,
        game_id: row.game_id,
        client_seed: row.client_seed,
        nonce: row.nonce,
        server_seed_hash: row.server_seed_hash,
        revealed_at: row.revealed_at,
      },
    });
  } catch (e) {
    console.error("getCurrentSeed:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { rotateSeed, getCurrentSeed };
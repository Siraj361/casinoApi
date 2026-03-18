const express = require("express");
const router = express.Router();
const {
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
} = require("../../Controller/GameController/GameController.js");

// apna auth middleware yahan laga do agar hai
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");

router.get("/", listGames);
router.get("/code/:code", getGameByCode);
router.get("/:gameId/rounds", listRoundsByGame);

// Dice
router.post("/dice/play", VerifyJWTtoken,playDice);

// Mines
router.post("/mines/start", VerifyJWTtoken,startMines);
router.post("/mines/reveal",VerifyJWTtoken, revealMinesTile);
router.post("/mines/cashout",VerifyJWTtoken, cashoutMines);

// Crash
router.post("/crash/start",VerifyJWTtoken,startCrash);
router.post("/crash/cashout", VerifyJWTtoken,cashoutCrash);
router.get("/crash/:roundId", VerifyJWTtoken,getCrashRound);

module.exports = router;
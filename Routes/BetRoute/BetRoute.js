// File: Route/BetRoute/BetRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const BetController = require("../../Controller/BetController/BetController.js");

router.get("/", VerifyJWTtoken, BetController.listMyBets);
router.get("/:id", VerifyJWTtoken, BetController.getMyBetById);

module.exports = router;
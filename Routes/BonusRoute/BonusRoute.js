// File: Route/BonusRoute/BonusRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const BonusController = require("../../Controller/BonusController/BonusController.js");

router.get("/listBonuses", BonusController.listBonuses);
router.post("/claim", VerifyJWTtoken, BonusController.claimBonus);

module.exports = router;
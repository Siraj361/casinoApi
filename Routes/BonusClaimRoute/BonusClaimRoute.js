// File: Route/BonusClaimRoute/BonusClaimRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const C = require("../../Controller/BonusClaimController/BonusClaimController.js");

router.get("/", VerifyJWTtoken, C.listMyBonusClaims);

module.exports = router;
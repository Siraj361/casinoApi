// File: Route/VipRoute/VipRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const VipController = require("../../Controller/VipController/VipController.js");

router.get("/tiers", VipController.listTiers);
router.get("/me", VerifyJWTtoken, VipController.getMyVip);

module.exports = router;
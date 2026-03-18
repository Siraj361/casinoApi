// File: Route/ReferralRoute/ReferralRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const ReferralController = require("../../Controller/ReferralController/ReferralController.js");

router.get("/me", VerifyJWTtoken, ReferralController.getMyReferral);
router.post("/apply", VerifyJWTtoken, ReferralController.applyReferralCode);
router.get("/stats", VerifyJWTtoken, ReferralController.getReferralStats);

module.exports = router;
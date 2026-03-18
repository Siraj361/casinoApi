// File: Route/SecurityRoute/SecurityRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const C = require("../../Controller/SecurityController/SecurityController.js");

router.get("/2fa/status", VerifyJWTtoken, C.status);
router.post("/2fa/setup", VerifyJWTtoken, C.setup);
router.post("/2fa/enable", VerifyJWTtoken, C.enable);
router.post("/2fa/disable", VerifyJWTtoken, C.disable);

module.exports = router;
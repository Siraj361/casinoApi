// File: Route/PasswordResetRoute/PasswordResetRoute.js
const router = require("express").Router();
const C = require("../../Controller/PasswordResetController/PasswordResetController.js");

router.post("/request", C.requestReset);
router.get("/verify", C.verifyResetToken);
router.post("/confirm", C.confirmReset);

module.exports = router;
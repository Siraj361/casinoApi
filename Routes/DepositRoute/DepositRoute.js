// File: Route/DepositRoute/DepositRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const DepositController = require("../../Controller/DepositController/DepositController.js");

router.get("/my", VerifyJWTtoken, DepositController.listMyDeposits);
router.post("/crypto", VerifyJWTtoken, DepositController.createCryptoDeposit);

module.exports = router;
// File: Route/CashierRoute/CashierRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const CashierController = require("../../Controller/CashierController/CashierController.js");

// DEMO credit/debit (safe sandbox)

router.post("/demo/withdraw", VerifyJWTtoken, CashierController.demoWithdraw);
router.post("/withdrawals/:id/cancel", VerifyJWTtoken, CashierController.cancelWithdrawal);

// Deposit request screen (txid + proof) - demo submit
router.post("/deposit-requests", VerifyJWTtoken, CashierController.createDepositRequest);

// Lists
router.get("/withdrawals", VerifyJWTtoken, CashierController.listWithdrawals);
router.get("/deposit-requests", VerifyJWTtoken, CashierController.listDepositRequests);

module.exports = router;
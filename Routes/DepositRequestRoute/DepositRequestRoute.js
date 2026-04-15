// File: Route/DepositRequestRoute/DepositRequestRoute.js
const router = require("express").Router();
const DepositRequestController = require("../../Controller/DepositRequestController/DepositRequestController");
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const IsAdmin = require("../../Middleware/is_admin.js");
const { uploadWalletImage } = require("../../Includes/multer.js");

// ✅ Multer (uploadWalletImage) ko VerifyJWT ke baad aur Controller se pehle hona chahiye
router.post("/create", VerifyJWTtoken, uploadWalletImage, DepositRequestController.createDepositRequest);
router.put("/approve/:requestId", VerifyJWTtoken, IsAdmin, DepositRequestController.approveDepositRequest);
router.get("/getAllPayments", VerifyJWTtoken, DepositRequestController.getAllPayments);

module.exports = router;
const router = require("express").Router();

const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const WalletController = require("../../Controller/WalletController/WalletController.js");

// multer middleware
const { uploadWalletImage } = require("../../Includes/multer.js"); 

// wallet info
router.get("/", VerifyJWTtoken, WalletController.getWallets);
router.get("/summary", VerifyJWTtoken, WalletController.getWalletSummary);
router.get("/statement/:currencyNetworkId", VerifyJWTtoken, WalletController.getStatement);

// wallet transfer balance
router.get("/wallet-transfer", VerifyJWTtoken, WalletController.listTransferBalances);
// router.get("/wallet-transfer/:slug", VerifyJWTtoken, WalletController.listTransferBalances);
router.get("/wallet-transfer/:slug", VerifyJWTtoken, WalletController.getSpecificWallet);

// 🔥 wallet transfer request with image upload
router.post(
  "/transfer-request",
  VerifyJWTtoken,
  uploadWalletImage,
  WalletController.createWalletTransfer
);

module.exports = router;
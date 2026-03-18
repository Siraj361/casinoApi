// File: Route/CurrencyRoute/CurrencyRoute.js
const router = require("express").Router();
const CurrencyController = require("../../Controller/CurrencyController/CurrencyController.js");
const { uploadWalletImage } = require("../../Includes/multer.js");

// router.get("/", CurrencyController.listCurrencies);
router.get("/networks", CurrencyController.listNetworks);
router.get("/networks/:id", CurrencyController.getNetworkById);
router.post("/networks", uploadWalletImage, CurrencyController.createNetwork);
router.put("/networks/:id", uploadWalletImage, CurrencyController.updateNetwork);
router.delete("/networks/:id", CurrencyController.deleteNetwork);

module.exports = router;
const express = require("express");
const router = express.Router();
const languageController = require("../../Controller/LanguageController/LanguageController");
const { uploadWalletImage } = require("../../Includes/multer");

router.post("/create", uploadWalletImage, languageController.createLanguage);

router.put("/:id", uploadWalletImage, languageController.updateLanguage);

router.get("/getLanguages", languageController.getLanguages);

router.delete("/:id", languageController.deleteLanguage);

module.exports = router;
// File: Route/SettingsRoute/SettingsRoute.js
const router = require("express").Router();
const SettingsController = require("../../Controller/SettingsController/SettingsController.js");

router.get("/public", SettingsController.getPublicSettings);

module.exports = router;
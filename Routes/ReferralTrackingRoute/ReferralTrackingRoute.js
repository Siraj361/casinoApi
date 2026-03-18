// File: Route/ReferralTrackingRoute/ReferralTrackingRoute.js
const router = require("express").Router();
const C = require("../../Controller/ReferralTrackingController/ReferralTrackingController.js");

router.post("/track-click", C.trackClick);

module.exports = router;
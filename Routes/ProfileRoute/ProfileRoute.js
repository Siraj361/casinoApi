// File: Route/ProfileRoute/ProfileRoute.js
const router = require("express").Router();
const ProfileController = require("../../Controller/ProfileController/ProfileController.js");
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");

router.get("/getMyProfile", VerifyJWTtoken, ProfileController.getMyProfile);
router.put("/updateMyProfile", VerifyJWTtoken, ProfileController.updateMyProfile);
router.put("/password", VerifyJWTtoken, ProfileController.changePassword);

module.exports = router;
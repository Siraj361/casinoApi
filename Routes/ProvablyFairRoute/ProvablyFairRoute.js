// File: Route/ProvablyFairRoute/ProvablyFairRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const ProvablyFairController = require("../../Controller/ProvablyFairController/ProvablyFairController.js");

router.get("/current", VerifyJWTtoken, ProvablyFairController.getCurrentSeed);
router.post("/rotate", VerifyJWTtoken, ProvablyFairController.rotateSeed);

module.exports = router;
// File: Route/DepositAddressRoute/DepositAddressRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const C = require("../../Controller/DepositAddressController/DepositAddressController.js");

router.get("/", VerifyJWTtoken, C.listMyAddresses);
router.post("/", VerifyJWTtoken, C.createMyAddress);

module.exports = router;
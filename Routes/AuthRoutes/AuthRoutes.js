const AuthController = require("../../Controller/AuthController/AuthController.js")
const VerifyJWTtoken = require('../../Middleware/verify_jwt_token.js');

const router = require("express").Router();


router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgetPassword", AuthController.forgotPassword);
router.post("/resetPassword",VerifyJWTtoken, AuthController.resetPassword);




module.exports = router;

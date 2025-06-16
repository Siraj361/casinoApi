const ApplicationController = require("../../Controller/ApplicationController/ApplicationController.js");
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const upload = require("../../Includes/multer.js");
const router = require("express").Router();

router.post("/apply",VerifyJWTtoken,upload, ApplicationController.applyJobs);
router.get("/getUserAppliedJobs", VerifyJWTtoken, ApplicationController.getUserAppliedJobs);


module.exports = router;
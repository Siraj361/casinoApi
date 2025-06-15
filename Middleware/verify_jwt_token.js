const express = require("express");
const router = express.Router();
const db = require("../Model/index.js");
const jwt = require("jsonwebtoken");
// const { User } = require("../Models");
require("dotenv");

const User = db.User;
router.use(async (req, res, next) => {
  try {
    const token = req.headers.token;
    if (!token) {
      return res.status(400).json({
        status: 400,
        message: "JWT token not provided.",
      });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(403).json({ status: 403, message: "Invalid JWT token" });
    }

    // Check token expiration
    if (decodedToken.exp <= Date.now() / 1000) {
      return res.status(403).json({ status: 403, message: "JWT token has expired" });
    }
    // Find the user by ID and email
    const user = await User.findOne({
      where: {
        id: decodedToken.user_id,
        email: decodedToken.email
      }
    });
    if (!user) {
      return res.status(403).json({ status: 403, message: "User does not exist" });
    }
    req.decodedToken = decodedToken;
    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(403).json({ status: 403, message: "Invalid JWT token. Or session expired" });
  }
});
module.exports = router;











// const express = require("express");
// const router = express.Router();
// const db = require("../Models");
// const jwt = require("jsonwebtoken");
// require("dotenv").config(); // ✅ Make sure to load env vars

// const User = db.users;

// // ✅ JWT middleware to protect routes
// router.use(async (req, res, next) => {
//   try {
//     const token = req.headers.token;

//     if (!token) {
//       return res.status(400).json({
//         status: 400,
//         message: "JWT token not provided.",
//       });
//     }

//     const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

//     // Check expiration
//     if (decodedToken.exp <= Date.now() / 1000) {
//       return res.status(403).json({
//         status: 403,
//         message: "JWT token has expired",
//       });
//     }

//     // Find the user from token
//     const user = await User.findOne({
//       where: {
//         id: decodedToken.user_id,
//         email: decodedToken.email
//       }
//     });

//     if (!user) {
//       return res.status(403).json({
//         status: 403,
//         message: "User does not exist",
//       });
//     }

//     req.decodedToken = decodedToken; // Attach to request
//     next(); // Continue
//   } catch (error) {
//     console.error("Error in authentication middleware:", error);
//     return res.status(403).json({
//       status: 403,
//       message: "Invalid JWT token or session expired.",
//     });
//   }
// });

// module.exports = router;

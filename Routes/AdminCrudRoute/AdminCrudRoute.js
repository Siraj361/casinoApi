// File: Route/AdminCrudRoute/AdminCrudRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const isAdmin = require("../../Middleware/is_admin.js");
const C = require("../../Controller/AdminCrudController/AdminCrudController.js");

// Games
router.get("/games", VerifyJWTtoken, isAdmin, C.adminListGames);
router.post("/games", VerifyJWTtoken, isAdmin, C.adminCreateGame);
router.put("/games/:id", VerifyJWTtoken, isAdmin, C.adminUpdateGame);

// Bonuses
router.get("/bonuses", VerifyJWTtoken, isAdmin, C.adminListBonuses);
router.post("/bonuses", VerifyJWTtoken, isAdmin, C.adminCreateBonus);
router.put("/bonuses/:id", VerifyJWTtoken, isAdmin, C.adminUpdateBonus);

// VIP
router.get("/vip-tiers", VerifyJWTtoken, isAdmin, C.adminListVipTiers);
router.post("/vip-tiers", VerifyJWTtoken, isAdmin, C.adminCreateVipTier);
router.put("/vip-tiers/:id", VerifyJWTtoken, isAdmin, C.adminUpdateVipTier);

// Settings
router.get("/settings", VerifyJWTtoken, isAdmin, C.adminListSettings);
router.post("/settings", VerifyJWTtoken, isAdmin, C.adminUpsertSetting);

// Currencies & Networks
router.get("/currencies", VerifyJWTtoken, isAdmin, C.adminListCurrencies);
router.post("/currencies", VerifyJWTtoken, isAdmin, C.adminCreateCurrency);
router.put("/currencies/:id", VerifyJWTtoken, isAdmin, C.adminUpdateCurrency);

router.get("/networks", VerifyJWTtoken, isAdmin, C.adminListNetworks);
router.post("/networks", VerifyJWTtoken, isAdmin, C.adminCreateNetwork);
router.put("/networks/:id", VerifyJWTtoken, isAdmin, C.adminUpdateNetwork);

// Users
router.get("/users", VerifyJWTtoken, isAdmin, C.adminListUsers);
router.put("/users/:id", VerifyJWTtoken, isAdmin, C.adminUpdateUser);

// Bets
router.get("/bets", VerifyJWTtoken, isAdmin, C.adminListBets);

module.exports = router;
// File: Route/AdminRoute/AdminRoute.js
const router = require("express").Router();
const VerifyJWTtoken = require("../../Middleware/verify_jwt_token.js");
const isAdmin = require("../../Middleware/is_admin.js");
const AdminController = require("../../Controller/AdminController/AdminController.js");

router.get("/deposit-requests", VerifyJWTtoken, isAdmin, AdminController.listDepositRequests);

router.get("/withdrawals", VerifyJWTtoken, isAdmin, AdminController.listWithdrawals);

router.get("/audit-logs", VerifyJWTtoken, isAdmin, AdminController.listAuditLogs);
router.get("/dashboard-overview", VerifyJWTtoken,isAdmin, AdminController.getDashboardOverview);
router.get("/users", VerifyJWTtoken, isAdmin, AdminController.listUsers);
router.post("/users", VerifyJWTtoken, isAdmin, AdminController.createUser);
router.put("/users/:id", VerifyJWTtoken, isAdmin, AdminController.updateUser);
router.delete("/users/:id", VerifyJWTtoken, isAdmin, AdminController.deleteUser);
router.get("/betting-analytics", VerifyJWTtoken, isAdmin, AdminController.getBettingAnalytics);
router.get("/payments", VerifyJWTtoken, isAdmin, AdminController.listPayments);
router.get("/analytics-reports", VerifyJWTtoken, isAdmin, AdminController.getAnalyticsReports);
router.get("/recent-activity", VerifyJWTtoken, isAdmin, AdminController.getRecentActivity);
router.get("/main-account-overview" , VerifyJWTtoken, isAdmin, AdminController.getMainAccountOverview);


module.exports = router;
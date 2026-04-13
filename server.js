const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const db = require("./Model/index.js");

const app = express();
const server = http.createServer(app);

// ✅ Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// ✅ CORS (ONLY ONCE)
app.use(
  cors({
   origin: ["https://gumble.live", "http://gumble.live"], // exact frontend origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Routes
const authRouter = require("./Routes/AuthRoutes/AuthRoutes.js");
const profileRouter = require("./Routes/ProfileRoute/ProfileRoute.js");
const walletRoute = require("./Routes/WalletRoute/WalletRoute.js");
const cashierRoute = require("./Routes/CashierRoute/CashierRoute.js");
const bonusRoute = require("./Routes/BonusRoute/BonusRoute.js");
const referralRoute = require("./Routes/ReferralRoute/ReferralRoute.js");

const currencyRoute = require("./Routes/CurrencyRoute/CurrencyRoute.js");
const gameRoute = require("./Routes/GameRoute/GameRoute.js");
const provablyFairRoute = require("./Routes/ProvablyFairRoute/ProvablyFairRoute.js");
const betRoute = require("./Routes/BetRoute/BetRoute.js");
const vipRoute = require("./Routes/VipRoute/VipRoute.js");
const settingsRoute = require("./Routes/SettingsRoute/SettingsRoute.js");
const adminRoute = require("./Routes/AdminRoute/AdminRoute.js");

const depositAddressRoute = require("./Routes/DepositAddressRoute/DepositAddressRoute.js");
const depositRoute = require("./Routes/DepositRoute/DepositRoute.js");
const bonusClaimRoute = require("./Routes/BonusClaimRoute/BonusClaimRoute.js");
const referralTrackingRoute = require("./Routes/ReferralTrackingRoute/ReferralTrackingRoute.js");
const securityRoute = require("./Routes/SecurityRoute/SecurityRoute.js");
const adminCrudRoute = require("./Routes/AdminCrudRoute/AdminCrudRoute.js");
const passwordResetRoute = require("./Routes/PasswordResetRoute/PasswordResetRoute.js");
const languageRoute = require("./Routes/LanguageRoute/LanguageRoute.js");
const depositRequestRoute = require("./Routes/DepositRequestRoute/DepositRequestRoute.js");

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/wallets", walletRoute);
app.use("/api/cashier", cashierRoute);
app.use("/api/bonuses", bonusRoute);

// ⚠️ Note: tum /api/referral 2 baar use kar rahe ho (neeche bhi). ek ko change kar do.
app.use("/api/referral", referralRoute);

app.use("/api/currencies", currencyRoute);
app.use("/api/games", gameRoute);
app.use("/api/provably-fair", provablyFairRoute);
app.use("/api/bets", betRoute);
app.use("/api/vip", vipRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/admin", adminRoute);

app.use("/api/deposit-addresses", depositAddressRoute);
app.use("/api/deposits", depositRoute);
app.use("/api/bonus-claims", bonusClaimRoute);

// ⚠️ duplicate base path: /api/referral again
// better:
app.use("/api/referral-tracking", referralTrackingRoute);

app.use("/api/security", securityRoute);
app.use("/api/admin-crud", adminCrudRoute);
app.use("/api/password-reset", passwordResetRoute);
app.use("/api/languages", languageRoute);
app.use("/api/deposit-requests" ,depositRequestRoute)

app.get("/api", (req, res) => {
  res.status(200).json({ status: 200, message: "API's are working" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { server };
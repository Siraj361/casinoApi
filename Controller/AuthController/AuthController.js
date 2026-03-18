// File: Controller/AuthController/AuthController.js
const Joi = require("joi");
const db = require("../../Model/index.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = db.user;
const UserProfile = db.userProfile;
const UserSecurity = db.userSecurity;
const PasswordResetToken = db.passwordResetToken;
const CurrencyNetwork = db.currencyNetwork;
const Wallet = db.wallet;

const { registerScheme, resetPasswordScheme , loginScheme , updateProfileScheme } = require("../../validation/validAuth.js");
const { Op } = require("sequelize");

const message =
  "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character, and be at least 8 characters long.";

const forgetPasswordScheme = Joi.object({
  email: Joi.string().email().required(),
});



// ---- helpers ----
function signToken(user, rememberMe = false) {
  const payload = { user_id: user.id, email: user.email, role: user.role };
  const expiresIn = rememberMe ? "30d" : "1d";
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

async function generateUniqueReferralCode() {
  // U-XXXXXX style
  for (let i = 0; i < 5; i++) {
    const code = "U-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const exists = await User.findOne({ where: { referral_code: code } });
    if (!exists) return code;
  }
  // fallback
  return "U-" + Date.now();
}

// ================== CONTROLLERS ==================

const register = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { error, value } = registerScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { username, email, password } = value;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, username ? { username } : null].filter(Boolean),
      },
      transaction: t,
    });

    if (existingUser) {
      // if same email exists
      if (existingUser.email === email) {
        return res.status(400).json({
          error: existingUser.email_verified
            ? "User with this email already exists and email is verified"
            : "User with this email already exists and email is not verified",
        });
      }
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = await generateUniqueReferralCode();

    const newUser = await User.create(
      {
        username: username || null,
        email,
        password_hash: hashedPassword,
        email_verified: false,
        status: "ACTIVE",
        role: "USER",
        referral_code: referralCode,
      },
      { transaction: t }
    );

    // Create profile + security rows
    await UserProfile.create(
      { user_id: newUser.id, full_name: null, phone: null, avatar_url: null },
      { transaction: t }
    );

    await UserSecurity.create(
      { user_id: newUser.id, twofa_enabled: false, totp_secret_enc: null },
      { transaction: t }
    );

    // Create wallets for all active currency networks
    const networks = await CurrencyNetwork.findAll({
      where: { is_active: true },
      attributes: ["id"],
      transaction: t,
    });

    if (networks?.length) {
      const walletRows = networks.map((n) => ({
        user_id: newUser.id,
        currency_network_id: n.id,
        balance_atomic: "0",
        locked_atomic: "0",
      }));

      await Wallet.bulkCreate(walletRows, { transaction: t });
    }

    const token = signToken(newUser, false);

    await t.commit();

    // never return password_hash
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      email_verified: newUser.email_verified,
      referral_code: newUser.referral_code,
      status: newUser.status,
      role: newUser.role,
      created_at: newUser.created_at,
    };

    return res.status(200).json({
      message: "Registration successful",
      user: safeUser,
      token,
    });
  } catch (err) {
    await t.rollback();
    console.error("Register Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginScheme.validate(req.body, { abortEarly: true });
    if (error) return res.status(400).json({ error: error.message });

    const user = await User.findOne({ where: { username: value.username } });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Account is not active" });
    }

    const ok = await bcrypt.compare(value.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    const token = signToken(user, !!value.rememberMe);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,          // ✅ added
        status: user.status
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { error, value } = forgetPasswordScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await User.findOne({ where: { email: value.email }, transaction: t });
    if (!user) return res.status(404).json({ error: "Email not registered" });

    // Create a JWT reset token valid 1 hour
    const resetToken = jwt.sign(
      { user_id: user.id, email: user.email, purpose: "RESET_PASSWORD" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Store token hash in DB
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.create(
      { user_id: user.id, token_hash: tokenHash, expires_at: expiry },
      { transaction: t }
    );

    // Your existing helper (adjust if needed)
    // const { sendMail, generateReferralLink, generateResetCode } = require(...)
    const { generateReferralLink, generateResetCode, sendMail } = require("../../Includes/function.js");
    const resetLink = generateReferralLink(resetToken); // your function should create url with token
    const code = generateResetCode();

    await sendMail(user.email, resetToken, resetLink, code, user.username, expiry);

    await t.commit();
    return res.status(200).json({ message: "Reset link sent to email" });
  } catch (err) {
    await t.rollback();
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      "string.pattern.base": message,
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
});

const resetPassword = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { error, value } = changePassword.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    // Get user ID from JWT token in header
  const userId = req.user?.user_id;
if (!userId) {
  return res.status(401).json({ error: "Unauthorized - User ID not found" });
}

    // Find user
    const user = await User.findOne({
      where: { id: userId },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(value.currentPassword, user.password_hash);
    if (!passwordMatch) {
      await t.rollback();
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(value.newPassword, 10);

    // Update password
    await User.update(
      { password_hash: hashedPassword },
      { where: { id: userId }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    await t.rollback();
    console.error("Reset Password Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
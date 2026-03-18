
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../../Model/index.js");

const User = db.user;
const PasswordResetToken = db.passwordResetToken;

// your mail helpers (same as AuthController)
const { generateReferralLink, generateResetCode, sendMail } = require("../../Includes/function.js");

const requestScheme = Joi.object({
  email: Joi.string().email().required(),
});

const resetScheme = Joi.object({
  newPassword: Joi.string()
    .regex(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
    .message(
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character, and be at least 8 characters long."
    )
    .required(),
});

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

async function getValidTokenRecord({ token, userId }) {
  const tokenHash = sha256(token);

  const record = await PasswordResetToken.findOne({
    where: { token_hash: tokenHash, user_id: userId },
  });

  if (!record) return { ok: false, reason: "NOT_FOUND" };
  if (record.used_at) return { ok: false, reason: "USED" };
  if (new Date(record.expires_at).getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };

  return { ok: true, record };
}

/**
 * POST /api/password-reset/request
 * body: { email }
 */
const requestReset = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { error, value } = requestScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await User.findOne({ where: { email: value.email }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: "Email not registered" });
    }

    // JWT reset token valid 1 hour
    const token = jwt.sign(
      { user_id: user.id, email: user.email, purpose: "RESET_PASSWORD" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const tokenHash = sha256(token);
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.create(
      { user_id: user.id, token_hash: tokenHash, expires_at: expiry },
      { transaction: t }
    );

    const resetLink = generateReferralLink(token); // creates url containing token
    const code = generateResetCode();

    await sendMail(user.email, token, resetLink, code, user.username, expiry);

    await t.commit();
    return res.status(200).json({ message: "Reset link sent to email" });
  } catch (err) {
    await t.rollback();
    console.error("requestReset Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/password-reset/verify?token=...
 * checks if token exists in DB and is not expired/used
 */
const verifyResetToken = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "RESET_PASSWORD") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    const result = await getValidTokenRecord({ token, userId: decoded.user_id });
    if (!result.ok) return res.status(400).json({ error: "Invalid or expired token" });

    return res.status(200).json({ message: "Token is valid" });
  } catch (err) {
    console.error("verifyResetToken Error:", err);
    return res.status(400).json({ error: "Invalid or expired token" });
  }
};

/**
 * POST /api/password-reset/confirm?token=...
 * body: { newPassword }
 */
const confirmReset = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const { error, value } = resetScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "RESET_PASSWORD") {
      await t.rollback();
      return res.status(400).json({ error: "Invalid reset token" });
    }

    const result = await getValidTokenRecord({ token, userId: decoded.user_id });
    if (!result.ok) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(value.newPassword, 10);

    await User.update(
      { password_hash: hashedPassword, updated_at: new Date() },
      { where: { id: decoded.user_id }, transaction: t }
    );

    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { id: result.record.id }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    await t.rollback();
    console.error("confirmReset Error:", err);
    return res.status(400).json({ error: "Invalid or expired token" });
  }
};

module.exports = {
  requestReset,
  verifyResetToken,
  confirmReset,
};
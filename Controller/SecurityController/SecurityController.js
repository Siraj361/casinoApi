// File: Controller/SecurityController/TwoFAController.js
const Joi = require("joi");
const crypto = require("crypto");
const db = require("../../Model/index.js");

const UserSecurity = db.userSecurity;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

// ---- Base32 decode (RFC 4648) ----
const B32_ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32ToBuffer(base32) {
  const clean = base32.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = B32_ALPH.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateBase32Secret(len = 20) {
  // 20 bytes => 32 chars base32-ish
  const buf = crypto.randomBytes(len);
  let out = "";
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) break;
    out += B32_ALPH[parseInt(chunk, 2)];
  }
  return out;
}

// ---- TOTP verify (HMAC-SHA1) ----
function hotp(secretBase32, counter) {
  const key = base32ToBuffer(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

function totpNow(secretBase32, step = 30) {
  const counter = Math.floor(Date.now() / 1000 / step);
  return hotp(secretBase32, counter);
}

function totpVerify(secretBase32, token, window = 1, step = 30) {
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let w = -window; w <= window; w++) {
    if (hotp(secretBase32, counter + w) === String(token).trim()) return true;
  }
  return false;
}

// ---- simple encryption (AES-256-GCM) ----
function getEncKey() {
  const base = process.env.TOTP_ENC_KEY || process.env.JWT_SECRET || "fallback_key";
  return crypto.createHash("sha256").update(base).digest(); // 32 bytes
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const key = getEncKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
function decrypt(b64) {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const key = getEncKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

// ---- Schemas ----
const enableScheme = Joi.object({ code: Joi.string().length(6).required() });
const disableScheme = Joi.object({ code: Joi.string().length(6).required() });

const status = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const row = await UserSecurity.findOne({ where: { user_id: userId } });
    return res.status(200).json({
      message: "2FA status",
      data: { enabled: !!row?.twofa_enabled },
    });
  } catch (e) {
    console.error("2fa status:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Setup: generate secret & store encrypted (disabled until enable verified)
const setup = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const secret = generateBase32Secret(20);
    const secretEnc = encrypt(secret);

    let row = await UserSecurity.findOne({ where: { user_id: userId }, transaction: t });
    if (!row) {
      row = await UserSecurity.create(
        { user_id: userId, twofa_enabled: false, totp_secret_enc: secretEnc, updated_at: new Date() },
        { transaction: t }
      );
    } else {
      await UserSecurity.update(
        { twofa_enabled: false, totp_secret_enc: secretEnc, updated_at: new Date() },
        { where: { user_id: userId }, transaction: t }
      );
    }

    const issuer = encodeURIComponent(process.env.TOTP_ISSUER || "MyApp");
    const label = encodeURIComponent(`user:${userId}`);
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    await t.commit();
    return res.status(200).json({
      message: "2FA setup created",
      data: { secret, otpauth }, // frontend can show QR using otpauth
    });
  } catch (e) {
    await t.rollback();
    console.error("2fa setup:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const enable = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = enableScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const row = await UserSecurity.findOne({ where: { user_id: userId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!row || !row.totp_secret_enc) {
      await t.rollback();
      return res.status(400).json({ error: "Setup 2FA first" });
    }

    const secret = decrypt(row.totp_secret_enc);
    const ok = totpVerify(secret, value.code, 1, 30);
    if (!ok) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid code" });
    }

    await UserSecurity.update(
      { twofa_enabled: true, updated_at: new Date() },
      { where: { user_id: userId }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "2FA enabled" });
  } catch (e) {
    await t.rollback();
    console.error("2fa enable:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const disable = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = disableScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const row = await UserSecurity.findOne({ where: { user_id: userId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!row || !row.totp_secret_enc || !row.twofa_enabled) {
      await t.rollback();
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    const secret = decrypt(row.totp_secret_enc);
    const ok = totpVerify(secret, value.code, 1, 30);
    if (!ok) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid code" });
    }

    await UserSecurity.update(
      { twofa_enabled: false, totp_secret_enc: null, updated_at: new Date() },
      { where: { user_id: userId }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "2FA disabled" });
  } catch (e) {
    await t.rollback();
    console.error("2fa disable:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { status, setup, enable, disable };
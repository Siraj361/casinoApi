// File: Controller/SettingsController/SettingsController.js
const db = require("../../Model/index.js");
const AppSetting = db.appSetting;

const getPublicSettings = async (req, res) => {
  try {
    const keys = [
      "PLATFORM_FEE_BPS",
      "KYC_ENABLED",
      "APP_MODE",
    ];

    const rows = await AppSetting.findAll({ where: {} });
    const map = {};
    for (const r of rows) map[r.key] = r.value;

    // expose only whitelisted keys
    const out = {};
    for (const k of keys) out[k] = map[k] ?? null;

    // also show runtime mode
    out.APP_MODE = (process.env.APP_MODE || "DEMO").toUpperCase();

    return res.status(200).json({ message: "Settings fetched", data: out });
  } catch (e) {
    console.error("getPublicSettings:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getPublicSettings };
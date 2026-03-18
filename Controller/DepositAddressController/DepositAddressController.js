// File: Controller/DepositAddressController/DepositAddressController.js
const crypto = require("crypto");
const db = require("../../Model/index.js");

const DepositAddress = db.depositAddress;
const CurrencyNetwork = db.currencyNetwork;


function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function ensureDemo(res) {
  if ((process.env.APP_MODE || "DEMO").toUpperCase() !== "DEMO") {
    res.status(501).json({
      error: "Address generation disabled in PROD. Integrate compliant wallet provider.",
    });
    return false;
  }
  return true;
}

const listMyAddresses = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rows = await DepositAddress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          // Currency include yahan se remove kar diya gaya hai kyunki ab saari details CurrencyNetwork mein hain
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.status(200).json({ message: "Deposit addresses fetched", data: rows });
  } catch (e) {
    console.error("listMyAddresses:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createMyAddress = async (req, res) => {
  if (!ensureDemo(res)) return;

  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const currencyNetworkId = parseInt(req.body.currency_network_id, 10);
    if (!currencyNetworkId) {
      return res.status(400).json({ error: "currency_network_id is required" });
    }

    const t = await db.sequelize.transaction();

    try {
      const network = await CurrencyNetwork.findOne({
        where: { id: currencyNetworkId, is_active: true },
        transaction: t,
      });

      if (!network) {
        await t.rollback();
        return res.status(404).json({ error: "Currency network not found" });
      }

      const exists = await DepositAddress.findOne({
        where: {
          user_id: userId,
          currency_network_id: currencyNetworkId,
          is_active: true,
        },
        transaction: t,
      });

      if (exists) {
        await t.commit();
        return res.status(200).json({ message: "Address already exists", data: exists });
      }

      const demoAddress = `${network.network}_DEMO_${crypto
        .randomBytes(10)
        .toString("hex")}`;

      const row = await DepositAddress.create(
        {
          user_id: userId,
          currency_network_id: currencyNetworkId,
          address: demoAddress,
          tag_memo: null,
          is_active: true,
          updated_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(200).json({
        message: "Deposit address created (demo)",
        data: row,
      });
    } catch (innerError) {
      await t.rollback();
      throw innerError;
    }
  } catch (e) {
    console.error("createMyAddress:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { listMyAddresses, createMyAddress };
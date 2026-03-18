// File: Controller/DepositController/DepositController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const Deposit = db.deposit;
const CurrencyNetwork = db.currencyNetwork;
const Currency = db.currency;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function amountToAtomic(amount, decimals) {
  const amountStr = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(amountStr)) {
    throw new Error("Invalid amount format");
  }

  const [wholePart, fractionalPart = ""] = amountStr.split(".");
  const paddedFraction = (fractionalPart + "0".repeat(decimals)).slice(0, decimals);

  const atomicStr = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "") || "0";
  return atomicStr;
}

const listScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().allow("", null).optional(),
  currency_network_id: Joi.number().integer().allow(null).optional(),
});

const createScheme = Joi.object({
  amount: Joi.number().positive().required(),
  currency_network_id: Joi.number().integer().required(),

  // agar frontend address bhej raha ho to
  to_address: Joi.string().allow("", null).optional(),
});

const listMyDeposits = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = { user_id: userId };
    if (value.status) where.status = value.status;
    if (value.currency_network_id) where.currency_network_id = value.currency_network_id;

    const rows = await Deposit.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({
      message: "Deposits fetched",
      data: rows,
      meta: {
        limit: value.limit,
        offset: value.offset,
        count: rows.length,
      },
    });
  } catch (e) {
    console.error("listMyDeposits:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createCryptoDeposit = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = createScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const networkRow = await CurrencyNetwork.findOne({
      where: {
        id: value.currency_network_id,
        is_active: true,
      },
      include: [
        {
          model: Currency,
          as: "currency",
        },
      ],
    });

    if (!networkRow) {
      return res.status(404).json({ error: "Active currency network not found" });
    }

    const decimals = Number(networkRow?.currency?.decimals ?? 0);
    const amount_atomic = amountToAtomic(value.amount, decimals);

    // TEMP:
    // agar abhi real deposit address generation nahi hai,
    // to request se lo ya placeholder use karo
    const to_address =
      value.to_address?.trim() ||
      "PENDING_DEPOSIT_ADDRESS";

    const depositRow = await Deposit.create({
      user_id: userId,
      currency_network_id: value.currency_network_id,
      amount: value.amount,
      amount_atomic,
      to_address,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({
      message: "Deposit created successfully",
      data: {
        ...depositRow.toJSON(),
        currency: networkRow.currency,
        network: {
          id: networkRow.id,
          network: networkRow.network,
          display_name: networkRow.display_name,
          token_contract: networkRow.token_contract,
          min_confirmations: networkRow.min_confirmations,
        },
      },
    });
  } catch (e) {
    console.error("createCryptoDeposit:", e);
    return res.status(500).json({
      error: e.message || "Internal Server Error",
    });
  }
};

module.exports = {
  listMyDeposits,
  createCryptoDeposit,
};
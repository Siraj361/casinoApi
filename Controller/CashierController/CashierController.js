// File: Controller/CashierController/CashierController.js
const Joi = require("joi");
const db = require("../../Model/index.js");

const Wallet = db.wallet;

const CurrencyNetwork = db.currencyNetwork;
const DepositRequest = db.depositRequest;
const WithdrawalRequest = db.withdrawalRequest;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function isDigitsOnly(v) {
  return typeof v === "string" && /^[0-9]+$/.test(v);
}

function toBig(v) {
  return BigInt(v);
}

function ensureDemo(res) {
  if ((process.env.APP_MODE || "DEMO").toUpperCase() !== "DEMO") {
    res.status(501).json({
      error:
        "Cashier is disabled in production here. Integrate a licensed/compliant custodial wallet provider.",
    });
    return false;
  }
  return true;
}

const demoDepositScheme = Joi.object({
  currency_network_id: Joi.number().integer().required(),
  amount_atomic: Joi.string().required(), // "100000000" atomic integer
  comments: Joi.string().max(120).allow("", null).optional(),
});

const demoWithdrawScheme = Joi.object({
  currency_network_id: Joi.number().integer().required(),
  amount_atomic: Joi.string().required(),
  to_address: Joi.string().min(10).max(200).required(),
});

const depositRequestScheme = Joi.object({
  currency_network_id: Joi.number().integer().required(),
  claimed_amount_atomic: Joi.string().required(),
  txid: Joi.string().min(10).max(200).required(),
  proof_file_url: Joi.string().allow("", null).optional(),
});

const listQueryScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
});



const demoWithdraw = async (req, res) => {
  if (!ensureDemo(res)) return;

  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = demoWithdrawScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    if (!isDigitsOnly(value.amount_atomic)) {
      return res.status(400).json({ error: "amount_atomic must be digits-only string" });
    }
    if (toBig(value.amount_atomic) <= 0n) {
      return res.status(400).json({ error: "amount_atomic must be > 0" });
    }

    let wallet = await Wallet.findOne({
      where: { user_id: userId, currency_network_id: value.currency_network_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) {
      await t.rollback();
      return res.status(400).json({ error: "Wallet not found" });
    }

    const bal = toBig(wallet.balance_atomic.toString());
    const amt = toBig(value.amount_atomic);
    if (bal < amt) {
      await t.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBal = (bal - amt).toString();
    const newLocked = (toBig(wallet.locked_atomic.toString()) + amt).toString();

    await Wallet.update(
      { balance_atomic: newBal, locked_atomic: newLocked },
      { where: { id: wallet.id }, transaction: t }
    );

    const w = await WithdrawalRequest.create(
      {
        user_id: userId,
        currency_network_id: value.currency_network_id,
        to_address: value.to_address,
        amount_atomic: value.amount_atomic,
        fee_atomic: "0",
        status: "SUBMITTED",
      },
      { transaction: t }
    );

    await Ledger.create(
      {
        user_id: userId,
        currency_network_id: value.currency_network_id,
        txn_type: "WITHDRAW_REQUEST",
        amount_atomic: (-amt).toString(),
        comments: "Demo withdrawal request (funds locked)",
        ref_table: "withdrawal_requests",
        ref_id: w.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Withdrawal request submitted (demo)", request: w });
  } catch (err) {
    await t.rollback();
    console.error("Demo Withdraw Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const cancelWithdrawal = async (req, res) => {
  if (!ensureDemo(res)) return;

  const t = await db.sequelize.transaction();
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const w = await WithdrawalRequest.findOne({
      where: { id, user_id: userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!w) {
      await t.rollback();
      return res.status(404).json({ error: "Withdrawal request not found" });
    }
    if (w.status !== "SUBMITTED") {
      await t.rollback();
      return res.status(400).json({ error: "Only SUBMITTED withdrawals can be cancelled" });
    }

    // unlock funds back to wallet
    const wallet = await Wallet.findOne({
      where: { user_id: userId, currency_network_id: w.currency_network_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const amt = toBig(w.amount_atomic.toString());
    const newBal = (toBig(wallet.balance_atomic.toString()) + amt).toString();
    const newLocked = (toBig(wallet.locked_atomic.toString()) - amt).toString();

    await Wallet.update(
      { balance_atomic: newBal, locked_atomic: newLocked },
      { where: { id: wallet.id }, transaction: t }
    );

    await WithdrawalRequest.update(
      { status: "REJECTED", review_notes: "Cancelled by user" },
      { where: { id: w.id }, transaction: t }
    );

    await Ledger.create(
      {
        user_id: userId,
        currency_network_id: w.currency_network_id,
        txn_type: "WITHDRAW_CANCELLED",
        amount_atomic: amt.toString(),
        comments: "Demo withdrawal cancelled (funds unlocked)",
        ref_table: "withdrawal_requests",
        ref_id: w.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Withdrawal cancelled", id: w.id });
  } catch (err) {
    await t.rollback();
    console.error("Cancel Withdrawal Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createDepositRequest = async (req, res) => {
  if (!ensureDemo(res)) return;

  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = depositRequestScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    if (!isDigitsOnly(value.claimed_amount_atomic)) {
      return res.status(400).json({ error: "claimed_amount_atomic must be digits-only string" });
    }

    const row = await DepositRequest.create({
      user_id: userId,
      currency_network_id: value.currency_network_id,
      claimed_amount_atomic: value.claimed_amount_atomic,
      txid: value.txid,
      proof_file_url: value.proof_file_url || null,
      status: "SUBMITTED",
    });

    return res.status(200).json({ message: "Deposit request submitted (demo)", data: row });
  } catch (err) {
    console.error("Create Deposit Request Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const listWithdrawals = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listQueryScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const rows = await WithdrawalRequest.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Withdrawals fetched", data: rows });
  } catch (err) {
    console.error("List Withdrawals Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const listDepositRequests = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error, value } = listQueryScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const rows = await DepositRequest.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({ message: "Deposit requests fetched", data: rows });
  } catch (err) {
    console.error("List Deposit Requests Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {

  demoWithdraw,
  cancelWithdrawal,
  createDepositRequest,
  listWithdrawals,
  listDepositRequests,
};
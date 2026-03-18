const db = require("../../Model/index.js");
const DepositRequest = db.depositRequest;
const CurrencyNetwork = db.currencyNetwork;
const Wallet =db.wallet;
const User = db.user;

const sequelize = db.sequelize;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

function amountToAtomic(amount, decimals) {
  const raw = String(amount || "0").trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Invalid amount format");
  const [wholePart, fractionPart = ""] = raw.split(".");
  const paddedFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  return `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "") || "0";
}

const createDepositRequest = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // ✅ Safety Check: Agar Multer ne req.body populate nahi kiya
    if (!req.body) {
      return res.status(400).json({ error: "Form data is missing" });
    }

    const { currency_network_id, amount, txid } = req.body;

    if (!currency_network_id || !amount) {
      return res.status(400).json({ error: "currency_network_id and amount are required" });
    }

    const network = await CurrencyNetwork.findOne({ 
      where: { id: currency_network_id, is_active: true } 
    });
    
    if (!network) return res.status(404).json({ error: "Currency network not found" });

    const decimals = Number(network.decimals || 8); // Flat structure decimals
    
    let proofUrl = null;
    if (req.file) {
      proofUrl = `uploads/images/${req.file.filename}`; // Relative path
    }

    const newRequest = await DepositRequest.create({
      user_id: userId,
      currency_network_id: currency_network_id,
      claimed_amount_atomic: amountToAtomic(amount, decimals),
      txid: txid || null,
      proof_file_url: proofUrl,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({ 
      message: "Deposit request submitted successfully", 
      data: newRequest 
    });
  } catch (e) {
    console.error("createDepositRequest Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const approveDepositRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const adminId = getAuthUserId(req); 

    const request = await DepositRequest.findByPk(requestId, { transaction: t });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ error: "Deposit request not found" });
    }

    if (request.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ error: `Request already processed: ${request.status}` });
    }

    // 1. User ka wallet balance update karein
    const [wallet] = await Wallet.findOrCreate({
      where: { user_id: request.user_id, currency_network_id: request.currency_network_id },
      defaults: { balance_atomic: "0" },
      transaction: t,
      lock: t.LOCK.UPDATE 
    });

    const newBalance = BigInt(wallet.balance_atomic || "0") + BigInt(request.claimed_amount_atomic || "0");

    await wallet.update({ balance_atomic: newBalance.toString() }, { transaction: t });

    // 2. Request status update karein
    await request.update({
      status: "completed",
      reviewed_by: adminId,
      updated_at: new Date()
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: "Request approved and balance updated" });

  } catch (error) {
    if (t) await t.rollback();
    console.error("Approve Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// AdminPaymentController.js
const getAllPayments = async (req, res) => {
  try {
    const payments = await DepositRequest.findAll({
      include: [
        {
          model: db.user,
          as: "user", // Check karein Model/index.js mein yahi alias hai
          attributes: ["username"],
          required: false 
        },
        {
          model: db.currencyNetwork,
          // ❌ Purana: as: "network"
          // ✅ Naya:
          as: "currencyNetwork", 
          attributes: ["display_name", "network", "type"],
          required: false
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Formatting mein bhi alias ka naam change hoga
    const formatted = payments.map((p) => ({
      id: p.id,
      transaction_id: p.txid || `N/A`,
      username: p.user ? p.user.username : "System",
      amount: Number(p.claimed_amount_atomic || 0) / 1e8,
      // ⬇️ Yahan p.currencyNetwork use karein
      method: p.currencyNetwork ? (p.currencyNetwork.display_name || p.currencyNetwork.network) : "Unknown",
      status: p.status,
      date: p.created_at
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { createDepositRequest, approveDepositRequest ,getAllPayments };
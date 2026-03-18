const Joi = require("joi");
const { Op } = require("sequelize");
const db = require("../../Model/index.js");

const Wallet = db.wallet;

const CurrencyNetwork = db.currencyNetwork;
const Currency = db.currency;
const Deposit = db.deposit;
const sequelize = db.sequelize;

function getAuthUserId(req) {
  return req.user?.user_id || req.user?.id || req.userId || req.user_id;
}

const statementQueryScheme = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  txn_type: Joi.string().allow("", null).optional(),
  from: Joi.date().iso().allow("", null).optional(),
  to: Joi.date().iso().allow("", null).optional(),
});

const transferScheme = Joi.object({
  // currency_network_id: Joi.number().integer().required(),
  amount: Joi.number().positive().required(),
});
function pickWalletBalance(wallet) {
  return (
    wallet.balance_atomic ??
    wallet.available_balance_atomic ??
    wallet.amount_atomic ??
    wallet.balance ??
    wallet.available_balance ??
    wallet.availableBalance ??
    wallet.main_balance ??
    wallet.mainBalance ??
    wallet.amount ??
    0
  );
}

function getWalletBalanceField(wallet) {
  if (wallet.balance_atomic !== undefined) return "balance_atomic";
  if (wallet.available_balance_atomic !== undefined) return "available_balance_atomic";
  if (wallet.amount_atomic !== undefined) return "amount_atomic";
  if (wallet.balance !== undefined) return "balance";
  if (wallet.available_balance !== undefined) return "available_balance";
  if (wallet.availableBalance !== undefined) return "availableBalance";
  if (wallet.main_balance !== undefined) return "main_balance";
  if (wallet.mainBalance !== undefined) return "mainBalance";
  if (wallet.amount !== undefined) return "amount";
  return "balance_atomic";
}
function makeWalletKey(wallet) {
  const currencyCode =
    wallet?.currencyNetwork?.currency?.code?.toLowerCase() ||
    wallet?.currencyNetwork?.currency?.symbol?.toLowerCase() ||
    "unknown";

  const networkCode =
    wallet?.currencyNetwork?.network?.toLowerCase()?.replace(/-/g, "_") ||
    "unknown";

  return `${currencyCode}_${networkCode}`;
}

function amountToAtomic(amount, decimals) {
  const raw = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error("Invalid amount format");
  }

  const [wholePart, fractionPart = ""] = raw.split(".");
  const paddedFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const atomic = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "") || "0";

  return atomic;
}

function atomicToDisplay(amountAtomic, decimals) {
  const raw = String(amountAtomic ?? "0");

  if (decimals <= 0) {
    return Number(raw || 0);
  }

  const normalized = raw.padStart(decimals + 1, "0");
  const whole = normalized.slice(0, -decimals) || "0";
  const fraction = normalized.slice(-decimals);

  return Number(`${whole}.${fraction}`);
}

function normalizeSlug(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildTransferWalletFilter(rawSlug) {
  const slug = normalizeSlug(rawSlug);

  const currencyWhere = {};
  const currencyNetworkWhere = { is_active: true };

  if (!slug) {
    return { slug: "", currencyWhere, currencyNetworkWhere };
  }

  switch (slug) {
    case "btc":
      currencyWhere.code = "BTC";
      currencyNetworkWhere.network = "BTC";
      break;

    case "eth":
      currencyWhere.code = "ETH";
      currencyNetworkWhere.network = "ETH";
      break;

    case "erc20":
      currencyWhere.code = "USDT";
      currencyNetworkWhere.display_name = "USDT ERC-20";
      break;

    case "trc20":
      currencyWhere.code = "USDT";
      currencyNetworkWhere.display_name = "USDT TRC-20";
      break;

    default:
      throw new Error("Invalid wallet transfer slug");
  }

  return { slug, currencyWhere, currencyNetworkWhere };
}

const getWallets = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const wallets = await Wallet.findAll({
      where: { user_id: userId },
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          // ✅ Currency include yahan se remove kar diya gaya hai
        },
      ],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      message: "Wallets fetched",
      data: wallets,
    });
  } catch (err) {
    console.error("Get Wallets Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const getWalletSummary = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const wallets = await Wallet.findAll({
      where: { user_id: userId },
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          // Currency include yahan se remove kar diya gaya hai
        },
      ],
      order: [["id", "ASC"]],
    });

    const pendingDeposits = await Deposit.findAll({
      where: { user_id: userId, status: "pending" },
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    const balances = {};

    for (const wallet of wallets) {
      // makeWalletKey function ko check karein ke woh direct wallet.currencyNetwork.network use kare
      const key = makeWalletKey(wallet);
      balances[key] = Number(pickWalletBalance(wallet)).toFixed(8);
    }

    return res.status(200).json({
      message: "Wallet summary fetched",
      data: {
        balances,
        pendingDeposits,
        totalPendingDeposits: pendingDeposits.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Get Wallet Summary Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const getStatement = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const currencyNetworkId = parseInt(req.params.currencyNetworkId, 10);
    if (!currencyNetworkId) {
      return res.status(400).json({ error: "Invalid currencyNetworkId" });
    }

    const { error, value } = statementQueryScheme.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where = {
      user_id: userId,
      currency_network_id: currencyNetworkId,
    };

    if (value.txn_type) where.txn_type = value.txn_type;

    if (value.from || value.to) {
      where.created_at = {};
      if (value.from) where.created_at[Op.gte] = new Date(value.from);
      if (value.to) where.created_at[Op.lte] = new Date(value.to);
    }

    const rows = await Ledger.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({
      message: "Statement fetched",
      data: rows,
    });
  } catch (err) {
    console.error("Get Statement Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const listTransferBalances = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rawSlug =
      req.params.slug ||
      req.params.network ||
      req.query.slug ||
      req.query.network ||
      "";

    // Filter logic: Ab hum direct CurrencyNetwork ke slug ya network field se filter karenge
    const networkWhere = { is_active: true };
    if (rawSlug) {
      networkWhere.slug = normalizeSlug(rawSlug);
    }

    const wallets = await Wallet.findAll({
      where: { user_id: userId },
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          required: true,
          where: networkWhere,
          // ✅ Currency include yahan se remove kar diya gaya hai
        },
      ],
      order: [["id", "ASC"]],
    });

    const data = wallets.map((wallet) => {
      const net = wallet.currencyNetwork;
      
      // ✅ Ab decimals direct CurrencyNetwork table mein hona chahiye (as per your flat structure)
      // Agar table mein decimals nahi hai, toh default 8 use karein
      const decimals = Number(net?.decimals ?? 8);

      let amountAtomic =
        wallet.balance_atomic ??
        wallet.available_balance_atomic ??
        wallet.amount_atomic ??
        null;

      if (amountAtomic === null || amountAtomic === undefined) {
        const displayBalance = Number(pickWalletBalance(wallet) || 0);
        amountAtomic = amountToAtomic(displayBalance, decimals);
      }

      return {
        wallet_id: wallet.id,
        currency_network_id: net?.id,
        slug: net?.slug, // Direct database wala slug use karein
        network: net?.network,
        display_name: net?.display_name,
        // ✅ Currency object remove kar diya gaya hai
        wallet_balance: String(amountAtomic),
        display_balance: atomicToDisplay(amountAtomic, decimals),
      };
    });

    return res.status(200).json({
      message: "Wallet transfer balances fetched",
      selected_slug: rawSlug || null,
      data,
    });
  } catch (err) {
    console.error("listTransferBalances Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createWalletTransfer = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ Fix: Validation ko re-enable kiya taake 'value' define ho jaye
    const { error, value } = transferScheme.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ error: error.message });
    }

    // ✅ Currency model ka include hata diya gaya hai
    const networkRow = await CurrencyNetwork.findOne({
      where: { id: value.currency_network_id, is_active: true },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!networkRow) {
      await transaction.rollback();
      return res.status(404).json({ error: "Currency network not found" });
    }

    const wallet = await Wallet.findOne({
      where: {
        user_id: userId,
        currency_network_id: value.currency_network_id,
      },
      include: [
        {
          model: CurrencyNetwork,
          as: "currencyNetwork",
          // ✅ Yahan se bhi Currency include remove kar diya gaya hai
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({ error: "Wallet not found" });
    }

    // ✅ Decimals ab direct networkRow se milenge (Flat structure)
    const decimals = Number(networkRow?.decimals ?? 8);
    const transferAtomic = BigInt(amountToAtomic(value.amount, decimals));

    if (transferAtomic <= 0n) {
      await transaction.rollback();
      return res.status(400).json({ error: "Invalid transfer amount" });
    }

    let currentAtomic =
      wallet.balance_atomic ??
      wallet.available_balance_atomic ??
      wallet.amount_atomic ??
      null;

    if (currentAtomic === null || currentAtomic === undefined) {
      currentAtomic = amountToAtomic(Number(pickWalletBalance(wallet) || 0), decimals);
    }

    currentAtomic = BigInt(String(currentAtomic));

    if (currentAtomic < transferAtomic) {
      await transaction.rollback();
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const nextAtomic = currentAtomic - transferAtomic;

    const updateData = {
      updated_at: new Date(),
    };

    if (wallet.balance_atomic !== undefined) {
      updateData.balance_atomic = nextAtomic.toString();
    }
    if (wallet.available_balance_atomic !== undefined) {
      updateData.available_balance_atomic = nextAtomic.toString();
    }
    if (wallet.amount_atomic !== undefined) {
      updateData.amount_atomic = nextAtomic.toString();
    }

    const displayField = getWalletBalanceField(wallet);
    updateData[displayField] = atomicToDisplay(nextAtomic.toString(), decimals);

    await wallet.update(updateData, { transaction });

    try {
      await Ledger.create(
        {
          user_id: userId,
          currency_network_id: value.currency_network_id,
          txn_type: "wallet_transfer",
          direction: "debit",
          amount: value.amount,
          amount_atomic: transferAtomic.toString(),
          reference_type: "wallet_transfer",
          reference_id: wallet.id,
          // ✅ Code ab direct networkRow se aayega
          description: `Transferred ${value.amount} ${networkRow?.code || ""} from deposit wallet`,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
    } catch (ledgerErr) {
      console.warn("Ledger entry skipped:", ledgerErr?.message || ledgerErr);
    }

    await transaction.commit();

    return res.status(200).json({
      message: "Wallet transfer completed successfully",
      data: {
        wallet_id: wallet.id,
        currency_network_id: value.currency_network_id,
        amount: value.amount,
        amount_atomic: transferAtomic.toString(),
        remaining_balance_atomic: nextAtomic.toString(),
        remaining_display_balance: atomicToDisplay(nextAtomic.toString(), decimals),
      },
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("createWalletTransfer Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

const getSpecificWallet = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // URL params se slug lekar normalize karein
    const slug = normalizeSlug(req.params.slug);

    if (!slug) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    // ✅ Flat concept: Currency model ka include hata diya gaya hai
    const network = await CurrencyNetwork.findOne({
      where: {
        slug: slug,
        is_active: true
      }
      // Ab yahan kisi nested include ki zaroorat nahi hai
    });

    if (!network) {
      return res.status(404).json({ error: "Currency network not found" });
    }

    // Sequelize object ko plain JSON me convert karein
    const networkData = network.toJSON();

    return res.status(200).json({
      message: "Wallet network fetched successfully",
      data: networkData
    });

  } catch (err) {
    console.error("getSpecificWallet Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = {
  getWallets,
  getWalletSummary,
  getStatement,
  listTransferBalances,
  createWalletTransfer,
  getSpecificWallet
};
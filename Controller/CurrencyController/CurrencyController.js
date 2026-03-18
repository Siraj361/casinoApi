// File: Controller/CurrencyController/CurrencyController.js
const db = require("../../Model/index.js");
const Currency = db.currency;
const CurrencyNetwork = db.currencyNetwork;
const { uploadWalletImage } = require("../../Includes/multer.js");



const listNetworks = async (req, res) => {
  try {
    // Check if only active networks are requested
    const onlyActive = (req.query.active || "true").toLowerCase() === "true";

    const where = onlyActive ? { is_active: true } : {};

    // ✅ Currency model ka include hata diya gaya hai
    const rows = await CurrencyNetwork.findAll({
      where,
      // Ab yahan kisi join (include) ki zaroorat nahi kyunki saara data ek hi table mein hai
      order: [["id", "ASC"]],
    });

    return res.status(200).json({ 
      message: "Networks fetched successfully", 
      data: rows 
    });
  } catch (e) {
    console.error("listNetworks Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createNetwork = async (req, res) => {
  try {
    const { 
      network, 
      display_name, 
      token_contract, 
      min_confirmations, 
      transaction_id, 
      image,
      type // ✅ Naya field: 'online_deposit' ya 'wallet_transfer'
    } = req.body;

    // Validation for type
    if (!type || !['online_deposit', 'wallet_transfer'].includes(type)) {
      return res.status(400).json({ error: "Type must be 'online_deposit' or 'wallet_transfer'" });
    }

    let imageUrl = image || null; 

    if (req.file) {
      imageUrl = `uploads/images/${req.file.filename}`;
    }

    const newNetwork = await CurrencyNetwork.create({
      network,
      display_name,
      type, // ✅ Database mein type save ho raha hai
      token_contract,
      min_confirmations: min_confirmations || 1,
      image: imageUrl, 
      transaction_id: transaction_id || null, // Online deposit ke liye ye null ho sakta hai
      is_active: true,
    });

    return res.status(201).json({ 
      message: `${type === 'online_deposit' ? 'Online' : 'Wallet'} network created successfully`, 
      data: newNetwork 
    });
  } catch (e) {
    console.error("createNetwork Error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const getNetworkById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Network ID is required" });
    }

    const networkRecord = await CurrencyNetwork.findByPk(id, {
      include: [{ model: Currency, as: "currency" }],
    });

    if (!networkRecord) {
      return res.status(404).json({ error: "Network not found" });
    }

    return res.status(200).json({ message: "Network fetched successfully", data: networkRecord });
  } catch (e) {
    console.error("getNetworkById:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateNetwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { network, display_name, token_contract, min_confirmations, transaction_id, is_active, image } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Network ID is required" });
    }

    const networkRecord = await CurrencyNetwork.findByPk(id);
    if (!networkRecord) {
      return res.status(404).json({ error: "Network not found" });
    }

    // Handle image - from file upload or from request body
    let imageUrl = networkRecord.image; // keep existing image by default
    if (image) {
      imageUrl = image; // If sent in body, use it
    }
    if (req.file) {
      // If file uploaded via FormData, construct full URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    await networkRecord.update({
      network: network || networkRecord.network,
      display_name: display_name || networkRecord.display_name,
      token_contract: token_contract !== undefined ? token_contract : networkRecord.token_contract,
      min_confirmations: min_confirmations !== undefined ? min_confirmations : networkRecord.min_confirmations,
      image: imageUrl,
      transaction_id: transaction_id !== undefined ? transaction_id : networkRecord.transaction_id,
      is_active: is_active !== undefined ? is_active : networkRecord.is_active,
    });

    return res.status(200).json({ message: "Network updated successfully", data: networkRecord });
  } catch (e) {
    console.error("updateNetwork:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteNetwork = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Network ID is required" });
    }

    const networkRecord = await CurrencyNetwork.findByPk(id);
    if (!networkRecord) {
      return res.status(404).json({ error: "Network not found" });
    }

    await networkRecord.destroy();

    return res.status(200).json({ message: "Network deleted successfully" });
  } catch (e) {
    console.error("deleteNetwork:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {  listNetworks, getNetworkById, createNetwork, updateNetwork, deleteNetwork };
// File: Model/CurrencyModel/CurrencyNetworkModel.js
const crypto = require("crypto");

module.exports = (sequelize, DataTypes) => {
  const CurrencyNetwork = sequelize.define("currency_networks", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    network: { type: DataTypes.STRING, allowNull: true }, 
    display_name: { type: DataTypes.STRING, allowNull: true },
    
    // ✅ Naya Column: Online Deposit ya Wallet Transfer ko pehchanne ke liye
  

    token_contract: { type: DataTypes.STRING, allowNull: true },
    min_confirmations: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    image: { type: DataTypes.STRING, allowNull: true }, 
    transaction_id: { type: DataTypes.STRING, allowNull: true },
    
    slug: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
      type: { 
      type: DataTypes.ENUM('online_deposit', 'wallet_transfer'), 
      allowNull: false, 
      defaultValue: 'wallet_transfer' 
    },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    hooks: {
      beforeValidate: (network) => {
        if (!network.slug) {
          network.slug = crypto.randomBytes(4).toString('hex').slice(0, 7);
        }
      }
    }
  });

  return CurrencyNetwork;
};
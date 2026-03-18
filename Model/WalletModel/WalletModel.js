// File: Model/WalletModel/WalletModel.js
module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define("wallets", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    // atomic units (NUMERIC/DECIMAL), sequelize returns string => safe
    balance_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },
  

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ unique: true, fields: ["user_id", "currency_network_id"] }]
  });

  return Wallet;
};
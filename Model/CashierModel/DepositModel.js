// File: Model/CashierModel/DepositModel.js
module.exports = (sequelize, DataTypes) => {
  const Deposit = sequelize.define("deposits", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    txid: { type: DataTypes.STRING, allowNull: true },
    vout: { type: DataTypes.INTEGER, allowNull: true }, // BTC UTXO
    from_address: { type: DataTypes.STRING, allowNull: true },
    to_address: { type: DataTypes.STRING, allowNull: false },

    amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },
    confirmations: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "PENDING" }, // PENDING|CONFIRMED|REJECTED

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [
      { unique: true, fields: ["currency_network_id", "txid", "vout"] },
      { fields: ["user_id", "created_at"] },
    ]
  });

  return Deposit;
};
// File: Model/CashierModel/WithdrawalRequestModel.js
module.exports = (sequelize, DataTypes) => {
  const WithdrawalRequest = sequelize.define("withdrawal_requests", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    to_address: { type: DataTypes.STRING, allowNull: false },
    amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },
    fee_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "SUBMITTED" }, // SUBMITTED|APPROVED|REJECTED|SENT
    txid: { type: DataTypes.STRING, allowNull: true },

    reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
    review_notes: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id", "created_at"] }, { fields: ["status"] }]
  });

  return WithdrawalRequest;
};
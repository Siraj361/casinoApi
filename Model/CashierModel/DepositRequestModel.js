// File: Model/CashierModel/DepositRequestModel.js
module.exports = (sequelize, DataTypes) => {
  const DepositRequest = sequelize.define("deposit_requests", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    currency_network_id: { type: DataTypes.INTEGER, allowNull: true },

    claimed_amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },
    txid: { type: DataTypes.STRING, allowNull: true },
    proof_file_url: { type: DataTypes.STRING, allowNull: true },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "SUBMITTED" }, // SUBMITTED|APPROVED|REJECTED
    reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
    review_notes: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id", "created_at"] }, { fields: ["txid"] }]
  });

  return DepositRequest;
};
// File: Model/CashierModel/DepositAddressModel.js
module.exports = (sequelize, DataTypes) => {
  const DepositAddress = sequelize.define("deposit_addresses", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    address: { type: DataTypes.STRING, allowNull: false },
    tag_memo: { type: DataTypes.STRING, allowNull: true }, // for chains that need memo/tag
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [
      { unique: true, fields: ["currency_network_id", "address"] },
      { fields: ["user_id"] },
    ]
  });

  return DepositAddress;
};
// File: Model/ReferralModel/ReferralCommissionModel.js
module.exports = (sequelize, DataTypes) => {
  const ReferralCommission = sequelize.define("referral_commissions", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    referrer_user_id: { type: DataTypes.INTEGER, allowNull: false },
    referred_user_id: { type: DataTypes.INTEGER, allowNull: false },

    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },
    amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },

    source: { type: DataTypes.STRING, allowNull: false, defaultValue: "BET_RAKE" },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return ReferralCommission;
};
// File: Model/ReferralModel/ReferralModel.js
module.exports = (sequelize, DataTypes) => {
  const Referral = sequelize.define("referrals", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    referrer_user_id: { type: DataTypes.INTEGER, allowNull: false },
    referred_user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return Referral;
};
// File: Model/ReferralModel/ReferralCodeModel.js
module.exports = (sequelize, DataTypes) => {
  const ReferralCode = sequelize.define("referral_codes", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return ReferralCode;
};
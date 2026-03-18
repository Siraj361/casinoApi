// File: Model/ReferralModel/ReferralClickModel.js
module.exports = (sequelize, DataTypes) => {
  const ReferralClick = sequelize.define("referral_clicks", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    referrer_user_id: { type: DataTypes.INTEGER, allowNull: false },
    domain: { type: DataTypes.STRING, allowNull: true },

    ip_hash: { type: DataTypes.STRING, allowNull: true },
    ua_hash: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["referrer_user_id", "created_at"] }]
  });

  return ReferralClick;
};
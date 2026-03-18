// File: Model/VipModel/VipTierModel.js
module.exports = (sequelize, DataTypes) => {
  const VipTier = sequelize.define("vip_tiers", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false }, // Bronze/Silver/Gold
    min_volume_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },
    rakeback_bps: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // 50 = 0.50%

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return VipTier;
};
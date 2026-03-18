// File: Model/VipModel/UserVipModel.js
module.exports = (sequelize, DataTypes) => {
  const UserVip = sequelize.define("user_vip", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    tier_id: { type: DataTypes.INTEGER, allowNull: false },

    lifetime_volume_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return UserVip;
};
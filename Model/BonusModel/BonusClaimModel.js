// File: Model/BonusModel/BonusClaimModel.js
module.exports = (sequelize, DataTypes) => {
  const BonusClaim = sequelize.define("bonus_claims", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bonus_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "CLAIMED" }, // CLAIMED|IN_PROGRESS|COMPLETED|CANCELLED
    wagered_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id", "created_at"] }]
  });

  return BonusClaim;
};
// File: Model/BonusModel/BonusModel.js
module.exports = (sequelize, DataTypes) => {
  const Bonus = sequelize.define("bonuses", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    bonus_type: { type: DataTypes.STRING, allowNull: false }, // WELCOME|VIP|MANUAL etc

    currency_network_id: { type: DataTypes.INTEGER, allowNull: true }, // optional
    bonus_amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },
    rollover_required_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },

    starts_at: { type: DataTypes.DATE, allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    max_uses: { type: DataTypes.INTEGER, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return Bonus;
};
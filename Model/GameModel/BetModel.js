// File: Model/GameModel/BetModel.js
module.exports = (sequelize, DataTypes) => {
  const Bet = sequelize.define("bets", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    user_id: { type: DataTypes.INTEGER, allowNull: false },
    game_id: { type: DataTypes.INTEGER, allowNull: false },
    round_id: { type: DataTypes.INTEGER, allowNull: true },
    seed_id: { type: DataTypes.INTEGER, allowNull: true },

    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    wager_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false },
    payout_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "PLACED" }, // PLACED|SETTLED|CANCELLED
    meta_json: { type: DataTypes.JSON, allowNull: true }, // mines cells, dice target, crash cashout etc

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id", "created_at"] }, { fields: ["game_id", "created_at"] }]
  });

  return Bet;
};
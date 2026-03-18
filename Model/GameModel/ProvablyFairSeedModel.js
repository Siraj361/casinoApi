// File: Model/GameModel/ProvablyFairSeedModel.js
module.exports = (sequelize, DataTypes) => {
  const ProvablyFairSeed = sequelize.define("provably_fair_seeds", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    game_id: { type: DataTypes.INTEGER, allowNull: false },

    server_seed_hash: { type: DataTypes.STRING, allowNull: false },
    server_seed_enc: { type: DataTypes.TEXT, allowNull: true }, // reveal later (encrypted stored)
    client_seed: { type: DataTypes.STRING, allowNull: false },
    nonce: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    revealed_at: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id", "game_id"] }]
  });

  return ProvablyFairSeed;
};
// File: Model/GameModel/GameModel.js
module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define("games", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true }, // CRASH MINES DICE etc
    name: { type: DataTypes.STRING, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    // platform / house edge (bps): 100 = 1%
    house_edge_bps: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return Game;
};
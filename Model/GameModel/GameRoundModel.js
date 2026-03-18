// File: Model/GameModel/GameRoundModel.js
module.exports = (sequelize, DataTypes) => {
  const GameRound = sequelize.define(
    "game_rounds",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      round_key: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
      },

      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      result_json: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: false,
      tableName: "game_rounds",
      indexes: [{ fields: ["game_id", "started_at"] }],
    }
  );

  return GameRound;
};
// Model/Language.js

module.exports = (sequelize, DataTypes) => {
  const Language = sequelize.define(
    "Language",
    {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(10), // en, zh, es
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(50), // English, Chinese, Spanish
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING(255), // flag image path or URL
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "languages",
      timestamps: true,
    }
  );

  return Language;
};
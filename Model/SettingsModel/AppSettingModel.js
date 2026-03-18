// File: Model/SettingsModel/AppSettingModel.js
module.exports = (sequelize, DataTypes) => {
  const AppSetting = sequelize.define("app_settings", {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING, allowNull: false },

    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return AppSetting;
};
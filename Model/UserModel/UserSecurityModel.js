// File: Model/UserModel/UserSecurityModel.js
module.exports = (sequelize, DataTypes) => {
  const UserSecurity = sequelize.define("user_security", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    twofa_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    totp_secret_enc: { type: DataTypes.TEXT, allowNull: true }, // encrypted secret

    last_login_at: { type: DataTypes.DATE, allowNull: true },
    last_login_ip: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return UserSecurity;
};
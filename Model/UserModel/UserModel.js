// File: Model/UserModel/UserModel.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("users", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    username: { type: DataTypes.STRING, allowNull: true, unique: true },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: true },

    email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ACTIVE" }, // ACTIVE|SUSPENDED
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "USER" },     // USER|ADMIN

    referral_code: { type: DataTypes.STRING, allowNull: true, unique: true },

    self_excluded_until: { type: DataTypes.DATE, allowNull: true }, // responsible gaming (optional)

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [
      { unique: true, fields: ["email"] },
      { unique: true, fields: ["username"] },
      { unique: true, fields: ["referral_code"] },
    ]
  });

  return User;
};
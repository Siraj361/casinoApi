// File: Model/UserModel/PasswordResetTokenModel.js
module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define("password_reset_tokens", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },

    token_hash: { type: DataTypes.STRING, allowNull: false }, // store hash, not raw token
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [{ fields: ["user_id"] }, { fields: ["token_hash"] }]
  });

  return PasswordResetToken;
};
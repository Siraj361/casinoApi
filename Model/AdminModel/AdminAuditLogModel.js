// File: Model/AdminModel/AdminAuditLogModel.js
module.exports = (sequelize, DataTypes) => {
  const AdminAuditLog = sequelize.define("admin_audit_logs", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    admin_user_id: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // APPROVE_WITHDRAW, REJECT_DEPOSIT, etc
    target_table: { type: DataTypes.STRING, allowNull: true },
    target_id: { type: DataTypes.INTEGER, allowNull: true },
    meta_json: { type: DataTypes.JSON, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { timestamps: false });

  return AdminAuditLog;
};
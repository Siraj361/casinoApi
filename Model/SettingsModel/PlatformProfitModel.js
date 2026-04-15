// File: Model/SettingsModel/PlatformProfitModel.js
module.exports = (sequelize, DataTypes) => {
  const PlatformProfit = sequelize.define("platform_profits", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Track each bet's rake/commission
    bet_id: { type: DataTypes.INTEGER, allowNull: true }, // Link to the bet that generated this profit
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    game_id: { type: DataTypes.INTEGER, allowNull: true },
    
    currency_network_id: { type: DataTypes.INTEGER, allowNull: false },

    // Commission details
    commission_type: { type: DataTypes.STRING, allowNull: false, defaultValue: "bet_loss" }, // bet_loss, bet_win_rake, referral
    
    // Atomic amounts
    bet_amount_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" }, // Original bet
    payout_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" }, // What they received
    commission_atomic: { type: DataTypes.DECIMAL(65, 0), allowNull: false, defaultValue: "0" }, // Platform rake
    
    // Display amounts (for reference)
    bet_amount: { type: DataTypes.DECIMAL(20, 8), allowNull: true },
    payout: { type: DataTypes.DECIMAL(20, 8), allowNull: true },
    commission: { type: DataTypes.DECIMAL(20, 8), allowNull: true },
    
    commission_rate_bps: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 }, // 100 bps = 1%
    
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "recorded" }, // recorded, claimed, etc
    
    metadata_json: { type: DataTypes.JSON, allowNull: true }, // Store game type, outcome, etc
    
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["game_id", "created_at"] },
      { fields: ["bet_id"] },
      { fields: ["currency_network_id", "created_at"] }
    ]
  });

  return PlatformProfit;
};

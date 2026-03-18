const dbConfig = require('../Config/database.js');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD || '', {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect,
    //  logging:false,
    // operatorsAliases: false,
    timezone: '+05:00', //Set timeZone for PKT
});
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;



// ===== Models =====
db.user = require('./UserModel/UserModel.js')(sequelize, DataTypes);
db.userProfile = require('./UserModel/UserProfileModel.js')(sequelize, DataTypes);
db.userSecurity = require('./UserModel/UserSecurityModel.js')(sequelize, DataTypes);
db.passwordResetToken = require('./UserModel/PasswordResetTokenModel.js')(sequelize, DataTypes);


db.currencyNetwork = require('./CurrencyModel/CurrencyNetworkModel.js')(sequelize, DataTypes);

db.wallet = require('./WalletModel/WalletModel.js')(sequelize, DataTypes);


db.depositAddress = require('./CashierModel/DepositAddressModel.js')(sequelize, DataTypes);
db.deposit = require('./CashierModel/DepositModel.js')(sequelize, DataTypes);
db.depositRequest = require('./CashierModel/DepositRequestModel.js')(sequelize, DataTypes);
db.withdrawalRequest = require('./CashierModel/WithdrawalRequestModel.js')(sequelize, DataTypes);

db.game = require('./GameModel/GameModel.js')(sequelize, DataTypes);
db.gameRound = require('./GameModel/GameRoundModel.js')(sequelize, DataTypes);
db.provablyFairSeed = require('./GameModel/ProvablyFairSeedModel.js')(sequelize, DataTypes);
db.bet = require('./GameModel/BetModel.js')(sequelize, DataTypes);

db.bonus = require('./BonusModel/BonusModel.js')(sequelize, DataTypes);
db.bonusClaim = require('./BonusModel/BonusClaimModel.js')(sequelize, DataTypes);

db.referralCode = require('./ReferralModel/ReferralCodeModel.js')(sequelize, DataTypes);
db.referral = require('./ReferralModel/ReferralModel.js')(sequelize, DataTypes);
db.referralClick = require('./ReferralModel/ReferralClickModel.js')(sequelize, DataTypes);
db.referralCommission = require('./ReferralModel/ReferralCommissionModel.js')(sequelize, DataTypes);

db.vipTier = require('./VipModel/VipTierModel.js')(sequelize, DataTypes);
db.userVip = require('./VipModel/UserVipModel.js')(sequelize, DataTypes);

db.appSetting = require('./SettingsModel/AppSettingModel.js')(sequelize, DataTypes);
db.adminAuditLog = require('./AdminModel/AdminAuditLogModel.js')(sequelize, DataTypes);
db.language = require('./LanguageModel/LanguageModel.js')(sequelize, DataTypes);

db.user.hasOne(db.userProfile, { foreignKey: 'user_id', as: 'profile' });
db.userProfile.belongsTo(db.user, { foreignKey: 'user_id' });

db.user.hasOne(db.userSecurity, { foreignKey: 'user_id', as: 'security' });
db.userSecurity.belongsTo(db.user, { foreignKey: 'user_id' });

db.user.hasMany(db.passwordResetToken, { foreignKey: 'user_id' });
db.passwordResetToken.belongsTo(db.user, { foreignKey: 'user_id' });

// Currency / networks




db.user.hasMany(db.wallet, { foreignKey: 'user_id', as: 'wallets' });
db.wallet.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

db.currencyNetwork.hasMany(db.wallet, { foreignKey: 'currency_network_id' });
db.wallet.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });





// Cashier
db.user.hasMany(db.depositAddress, { foreignKey: 'user_id' });
db.depositAddress.belongsTo(db.user, { foreignKey: 'user_id' });
db.currencyNetwork.hasMany(db.depositAddress, { foreignKey: 'currency_network_id' });
db.depositAddress.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });

db.user.hasMany(db.deposit, { foreignKey: 'user_id' });
db.deposit.belongsTo(db.user, { foreignKey: 'user_id' });
db.currencyNetwork.hasMany(db.deposit, { foreignKey: 'currency_network_id' });
db.deposit.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });

db.user.hasMany(db.depositRequest, { foreignKey: 'user_id' });
db.depositRequest.belongsTo(db.user, { foreignKey: 'user_id' });
db.currencyNetwork.hasMany(db.depositRequest, { foreignKey: 'currency_network_id' });
db.depositRequest.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });

db.user.hasMany(db.withdrawalRequest, { foreignKey: 'user_id' });
db.withdrawalRequest.belongsTo(db.user, { foreignKey: 'user_id' });
db.currencyNetwork.hasMany(db.withdrawalRequest, { foreignKey: 'currency_network_id' });
db.withdrawalRequest.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });

// Games
db.game.hasMany(db.gameRound, { foreignKey: 'game_id' });
db.gameRound.belongsTo(db.game, { foreignKey: 'game_id', as: 'game' });

db.user.hasMany(db.provablyFairSeed, { foreignKey: 'user_id' });
db.provablyFairSeed.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });
db.game.hasMany(db.provablyFairSeed, { foreignKey: 'game_id' });
db.provablyFairSeed.belongsTo(db.game, { foreignKey: 'game_id', as: 'game' });

db.user.hasMany(db.bet, { foreignKey: 'user_id' });
db.bet.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });
db.game.hasMany(db.bet, { foreignKey: 'game_id' });
db.bet.belongsTo(db.game, { foreignKey: 'game_id', as: 'game' });
db.gameRound.hasMany(db.bet, { foreignKey: 'round_id' });
db.bet.belongsTo(db.gameRound, { foreignKey: 'round_id', as: 'round' });
db.provablyFairSeed.hasMany(db.bet, { foreignKey: 'seed_id' });
db.bet.belongsTo(db.provablyFairSeed, { foreignKey: 'seed_id', as: 'seed' });

// Bonus
db.bonus.hasMany(db.bonusClaim, { foreignKey: 'bonus_id' });
db.bonusClaim.belongsTo(db.bonus, { foreignKey: 'bonus_id', as: 'bonus' });
db.user.hasMany(db.bonusClaim, { foreignKey: 'user_id' });
db.bonusClaim.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

// Referral
db.user.hasOne(db.referralCode, { foreignKey: 'user_id', as: 'refCode' });
db.referralCode.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

db.user.hasMany(db.referral, { foreignKey: 'referrer_user_id', as: 'referralsSent' });
db.referral.belongsTo(db.user, { foreignKey: 'referrer_user_id', as: 'referrer' });
db.referral.belongsTo(db.user, { foreignKey: 'referred_user_id', as: 'referred' });

db.user.hasMany(db.referralClick, { foreignKey: 'referrer_user_id' });
db.referralClick.belongsTo(db.user, { foreignKey: 'referrer_user_id', as: 'referrer' });

db.user.hasMany(db.referralCommission, { foreignKey: 'referrer_user_id' });
db.referralCommission.belongsTo(db.user, { foreignKey: 'referrer_user_id', as: 'referrer' });
db.referralCommission.belongsTo(db.user, { foreignKey: 'referred_user_id', as: 'referred' });
db.currencyNetwork.hasMany(db.referralCommission, { foreignKey: 'currency_network_id' });
db.referralCommission.belongsTo(db.currencyNetwork, { foreignKey: 'currency_network_id', as: 'currencyNetwork' });

// VIP
db.vipTier.hasMany(db.userVip, { foreignKey: 'tier_id' });
db.userVip.belongsTo(db.vipTier, { foreignKey: 'tier_id', as: 'tier' });
db.user.hasOne(db.userVip, { foreignKey: 'user_id', as: 'vip' });
db.userVip.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

// Admin audit
db.user.hasMany(db.adminAuditLog, { foreignKey: 'admin_user_id' });
db.adminAuditLog.belongsTo(db.user, { foreignKey: 'admin_user_id', as: 'admin' });


db.sequelize.sync({ force: false })
    .then(() => {
        console.log("Sequelize synchronized with database.");
    })
    .catch(err => {
        console.error("Error syncing Sequelize with database:", err);
    });

// db.sequelize.sync({ alter: true })
// .then(() => {
//     console.log("Sequelize synchronized with AWS database.");
// })
// .catch(err => {
//     console.error("Error syncing Sequelize with AWS database:", err);
// });

module.exports = db;
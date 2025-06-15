module.exports = (sequelize, DataTypes) => {
  const JobEmailSubscription = sequelize.define("JobEmailSubscription", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true, // Validates email format
      },
    },
    subscription_type: {
      type: DataTypes.ENUM('Daily', 'Weekly', 'Monthly'),
      allowNull: false,
    },
  });

  return JobEmailSubscription;
};
